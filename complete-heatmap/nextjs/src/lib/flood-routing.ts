import type {
  EvacuationRouteResult,
  FloodHazardZone,
  LatLngPoint,
  RouteStepSummary,
  ShelterPlace,
} from '@/types/hazard';

interface RawRouteResponse {
  duration?: string;
  distanceMeters?: number;
  polyline?: { encodedPolyline?: string };
  legs?: Array<{
    duration?: string;
    distanceMeters?: number;
    steps?: Array<{
      distanceMeters?: number;
      navigationInstruction?: {
        instructions?: string;
        maneuver?: string;
      };
    }>;
  }>;
}

/**
 * Pure TypeScript fallback decoder for Google Encoded Polyline Algorithm Format.
 * Used if google.maps.geometry.encoding is not yet loaded.
 */
function decodePolylineFallback(encoded: string): LatLngPoint[] {
  const points: LatLngPoint[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

export function decodeRoutePolyline(encoded: string): LatLngPoint[] {
  if (!encoded) return [];
  if (
    typeof google !== 'undefined' &&
    google.maps?.geometry?.encoding?.decodePath
  ) {
    return google.maps.geometry.encoding
      .decodePath(encoded)
      .map((pt) => ({ lat: pt.lat(), lng: pt.lng() }));
  }
  return decodePolylineFallback(encoded);
}

function pointInRingRayCast(point: LatLngPoint, ring: LatLngPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].lng;
    const yi = ring[i].lat;
    const xj = ring[j].lng;
    const yj = ring[j].lat;
    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function segmentsIntersect(
  a: LatLngPoint,
  b: LatLngPoint,
  c: LatLngPoint,
  d: LatLngPoint
): boolean {
  const ccw = (p1: LatLngPoint, p2: LatLngPoint, p3: LatLngPoint) =>
    (p3.lat - p1.lat) * (p2.lng - p1.lng) >
    (p2.lat - p1.lat) * (p3.lng - p1.lng);
  return (
    ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d)
  );
}

export function isPointInFloodZone(
  point: LatLngPoint,
  zone: FloodHazardZone,
  gmPolygon?: google.maps.Polygon
): boolean {
  if (
    gmPolygon &&
    typeof google !== 'undefined' &&
    google.maps?.geometry?.poly?.containsLocation
  ) {
    return google.maps.geometry.poly.containsLocation(point, gmPolygon);
  }
  return pointInRingRayCast(point, zone.ring);
}

export function findContainingFloodZone(
  point: LatLngPoint,
  zones: FloodHazardZone[],
  gmPolygons?: Record<string, google.maps.Polygon>
): FloodHazardZone | null {
  for (const zone of zones) {
    if (isPointInFloodZone(point, zone, gmPolygons?.[zone.id])) {
      return zone;
    }
  }
  return null;
}

/**
 * Evaluates which flood zones a decoded polyline intersects using both
 * google.maps.geometry.poly.containsLocation and edge segment intersection.
 */
export function detectPolylineFloodIntersections(
  path: LatLngPoint[],
  zones: FloodHazardZone[],
  gmPolygons?: Record<string, google.maps.Polygon>
): { intersectedZones: FloodHazardZone[]; hitVertexCount: number } {
  const hitZoneIds = new Set<string>();
  let hitVertexCount = 0;

  if (path.length === 0) {
    return { intersectedZones: [], hitVertexCount: 0 };
  }

  for (let idx = 0; idx < path.length; idx++) {
    const pt = path[idx];
    for (const zone of zones) {
      if (isPointInFloodZone(pt, zone, gmPolygons?.[zone.id])) {
        hitZoneIds.add(zone.id);
        hitVertexCount += 1;
      }
    }

    if (idx < path.length - 1) {
      const nextPt = path[idx + 1];
      for (const zone of zones) {
        if (hitZoneIds.has(zone.id)) continue;
        for (let e = 0; e < zone.ring.length; e++) {
          const r1 = zone.ring[e];
          const r2 = zone.ring[(e + 1) % zone.ring.length];
          if (segmentsIntersect(pt, nextPt, r1, r2)) {
            hitZoneIds.add(zone.id);
            hitVertexCount += 1;
            break;
          }
        }
      }
    }
  }

  return {
    intersectedZones: zones.filter((z) => hitZoneIds.has(z.id)),
    hitVertexCount,
  };
}

export function formatDurationSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '1 min';
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs} hr ${rem} min` : `${hrs} hr`;
}

export function formatDistanceMeters(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return '0.0 km';
  const km = meters / 1000;
  const mi = meters / 1609.344;
  return `${km.toFixed(1)} km (${mi.toFixed(1)} mi)`;
}

function parseDurationString(raw?: string): number {
  if (!raw) return 0;
  const match = raw.match(/^(\d+(?:\.\d+)?)s$/);
  return match ? Math.round(Number(match[1])) : 0;
}

async function fetchSingleRoute(
  origin: LatLngPoint,
  destination: LatLngPoint,
  viaWaypoint?: LatLngPoint
): Promise<RawRouteResponse | null> {
  const payload: {
    origin: LatLngPoint;
    destination: LatLngPoint;
    travelMode: 'DRIVE';
    intermediates?: Array<{
      location: { latLng: { latitude: number; longitude: number } };
      via: boolean;
    }>;
  } = {
    origin,
    destination,
    travelMode: 'DRIVE',
  };

  if (viaWaypoint) {
    payload.intermediates = [
      {
        location: {
          latLng: {
            latitude: viaWaypoint.lat,
            longitude: viaWaypoint.lng,
          },
        },
        via: true,
      },
    ];
  }

  const response = await fetch('/api/routes/compute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(
      (errBody as { error?: string }).error ||
        `Route computation failed (${response.status})`
    );
  }

  const data = (await response.json()) as { routes?: RawRouteResponse[] };
  return data.routes?.[0] ?? null;
}

function extractSteps(route: RawRouteResponse): RouteStepSummary[] {
  const steps: RouteStepSummary[] = [];
  for (const leg of route.legs ?? []) {
    for (const step of leg.steps ?? []) {
      const instruction = step.navigationInstruction?.instructions?.trim();
      if (instruction) {
        steps.push({
          instruction,
          distanceMeters: step.distanceMeters ?? 0,
          maneuver: step.navigationInstruction?.maneuver,
        });
      }
    }
  }
  return steps;
}

function buildDynamicBypassCandidates(
  origin: LatLngPoint,
  destination: LatLngPoint,
  intersectedZones: FloodHazardZone[],
  allZones: FloodHazardZone[],
  gmPolygons?: Record<string, google.maps.Polygon>
): LatLngPoint[] {
  const candidates: LatLngPoint[] = [];

  for (const zone of intersectedZones) {
    for (const wp of zone.bypassWaypoints) {
      if (!findContainingFloodZone(wp, allZones, gmPolygons)) {
        candidates.push(wp);
      }
    }
  }

  // Also add an inland westward offset midpoint outside all flood zones
  const midLat = (origin.lat + destination.lat) / 2;
  const midLng = (origin.lng + destination.lng) / 2;
  const offsets: LatLngPoint[] = [
    { lat: midLat, lng: midLng - 0.014 },
    { lat: midLat + 0.01, lng: midLng - 0.01 },
    { lat: midLat - 0.01, lng: midLng - 0.01 },
  ];

  for (const cand of offsets) {
    if (!findContainingFloodZone(cand, allZones, gmPolygons)) {
      candidates.push(cand);
    }
  }

  // Deduplicate nearby waypoints
  const unique: LatLngPoint[] = [];
  for (const c of candidates) {
    const tooClose = unique.some(
      (u) => Math.hypot(u.lat - c.lat, u.lng - c.lng) < 0.0025
    );
    if (!tooClose) unique.push(c);
  }

  return unique.slice(0, 4);
}

/**
 * Computes an evacuation route from origin to shelter via /api/routes/compute.
 * When avoidFloodZones is enabled, inspects the decoded route with geometry.poly
 * and automatically injects a safe perimeter via-waypoint if the direct path
 * crosses an active flood-hazard polygon.
 */
export async function computeSafeEvacuationRoute(params: {
  origin: LatLngPoint;
  shelter: ShelterPlace;
  floodZones: FloodHazardZone[];
  avoidFloodZones: boolean;
  gmPolygons?: Record<string, google.maps.Polygon>;
}): Promise<EvacuationRouteResult> {
  const { origin, shelter, floodZones, avoidFloodZones, gmPolygons } = params;

  const directRoute = await fetchSingleRoute(origin, shelter.location);
  if (!directRoute || !directRoute.polyline?.encodedPolyline) {
    throw new Error('No evacuation route returned by Routes API.');
  }

  const directEncoded = directRoute.polyline.encodedPolyline;
  const directDecoded = decodeRoutePolyline(directEncoded);
  const directCheck = detectPolylineFloodIntersections(
    directDecoded,
    floodZones,
    gmPolygons
  );

  let chosenRoute = directRoute;
  let chosenEncoded = directEncoded;
  let chosenDecoded = directDecoded;
  let chosenIntersections = directCheck;
  let usedViaWaypoint: LatLngPoint | null = null;
  let bypassedFloodZones: string[] = [];

  if (avoidFloodZones && directCheck.intersectedZones.length > 0) {
    const candidates = buildDynamicBypassCandidates(
      origin,
      shelter.location,
      directCheck.intersectedZones,
      floodZones,
      gmPolygons
    );

    const candidateResults = await Promise.allSettled(
      candidates.map(async (wp) => {
        const route = await fetchSingleRoute(origin, shelter.location, wp);
        if (!route?.polyline?.encodedPolyline) return null;
        const decoded = decodeRoutePolyline(route.polyline.encodedPolyline);
        const check = detectPolylineFloodIntersections(
          decoded,
          floodZones,
          gmPolygons
        );
        return {
          wp,
          route,
          encoded: route.polyline.encodedPolyline,
          decoded,
          check,
          distanceMeters: route.distanceMeters ?? Number.MAX_SAFE_INTEGER,
        };
      })
    );

    const validCandidates = candidateResults
      .filter(
        (
          res
        ): res is PromiseFulfilledResult<{
          wp: LatLngPoint;
          route: RawRouteResponse;
          encoded: string;
          decoded: LatLngPoint[];
          check: { intersectedZones: FloodHazardZone[]; hitVertexCount: number };
          distanceMeters: number;
        }> => res.status === 'fulfilled' && res.value !== null
      )
      .map((res) => res.value);

    // Prefer completely clean routes sorted by shortest distance
    const cleanRoutes = validCandidates
      .filter((c) => c.check.intersectedZones.length === 0)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    if (cleanRoutes.length > 0) {
      const best = cleanRoutes[0];
      chosenRoute = best.route;
      chosenEncoded = best.encoded;
      chosenDecoded = best.decoded;
      chosenIntersections = best.check;
      usedViaWaypoint = best.wp;
      bypassedFloodZones = directCheck.intersectedZones.map((z) => z.name);
    } else {
      // Otherwise choose the candidate with fewest flood-zone hits
      const reducedRoutes = validCandidates
        .filter((c) => c.check.hitVertexCount < directCheck.hitVertexCount)
        .sort(
          (a, b) =>
            a.check.hitVertexCount - b.check.hitVertexCount ||
            a.distanceMeters - b.distanceMeters
        );

      if (reducedRoutes.length > 0) {
        const best = reducedRoutes[0];
        chosenRoute = best.route;
        chosenEncoded = best.encoded;
        chosenDecoded = best.decoded;
        chosenIntersections = best.check;
        usedViaWaypoint = best.wp;
        bypassedFloodZones = directCheck.intersectedZones
          .filter(
            (dz) =>
              !best.check.intersectedZones.some((bz) => bz.id === dz.id)
          )
          .map((z) => z.name);
      }
    }
  }

  const durationSeconds = parseDurationString(chosenRoute.duration);
  const distanceMeters = chosenRoute.distanceMeters ?? 0;

  let verificationStatus: EvacuationRouteResult['verificationStatus'];
  if (!avoidFloodZones) {
    verificationStatus = 'DIRECT_UNFILTERED';
  } else if (usedViaWaypoint && chosenIntersections.intersectedZones.length === 0) {
    verificationStatus = 'VERIFIED_FLOOD_BYPASS';
  } else if (chosenIntersections.intersectedZones.length === 0) {
    verificationStatus = 'CLEAR_DIRECT_ROUTE';
  } else {
    verificationStatus = 'PARTIAL_ZONE_PROXIMITY';
  }

  return {
    shelter,
    origin,
    encodedPolyline: chosenEncoded,
    decodedPath: chosenDecoded,
    durationSeconds,
    durationText: formatDurationSeconds(durationSeconds),
    distanceMeters,
    distanceText: formatDistanceMeters(distanceMeters),
    avoidFloodEnabled: avoidFloodZones,
    bypassedFloodZones,
    usedViaWaypoint,
    intersectsFloodZone: chosenIntersections.intersectedZones.length > 0,
    verificationStatus,
    steps: extractSteps(chosenRoute),
  };
}
