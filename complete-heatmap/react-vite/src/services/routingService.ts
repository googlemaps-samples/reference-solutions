import type {
  EvacuationRouteState,
  FloodZone,
  LatLngPoint,
  RouteStepSummary,
  ShelterPlace,
} from '../types/hazard';
import { findContainingFloodZone } from './enrichmentService';

function toLatLngPoint(pt: google.maps.LatLngAltitude | google.maps.LatLng): LatLngPoint {
  return {
    lat: typeof pt.lat === 'function' ? pt.lat() : pt.lat,
    lng: typeof pt.lng === 'function' ? pt.lng() : pt.lng,
  };
}

function samplePathWithMidpoints(
  path: Array<google.maps.LatLngAltitude | google.maps.LatLng>
): LatLngPoint[] {
  const sampled: LatLngPoint[] = [];
  for (let i = 0; i < path.length; i++) {
    const curr = toLatLngPoint(path[i]);
    sampled.push(curr);
    if (i < path.length - 1) {
      const next = toLatLngPoint(path[i + 1]);
      const mid1 = {
        lat: curr.lat + (next.lat - curr.lat) * 0.33,
        lng: curr.lng + (next.lng - curr.lng) * 0.33,
      };
      const mid2 = {
        lat: curr.lat + (next.lat - curr.lat) * 0.66,
        lng: curr.lng + (next.lng - curr.lng) * 0.66,
      };
      sampled.push(mid1, mid2);
    }
  }
  return sampled;
}

function findIntersectedZones(
  path: Array<google.maps.LatLngAltitude | google.maps.LatLng>,
  floodZones: FloodZone[],
  geometryLib: google.maps.GeometryLibrary | null
): FloodZone[] {
  const sampled = samplePathWithMidpoints(path);
  const hitIds: Record<string, FloodZone> = {};
  for (const pt of sampled) {
    const zone = findContainingFloodZone(pt, floodZones, geometryLib);
    if (zone && !hitIds[zone.id]) {
      hitIds[zone.id] = zone;
    }
  }
  return Object.values(hitIds);
}

function buildPerimeterBypassCandidates(
  zone: FloodZone,
  origin: LatLngPoint,
  destination: LatLngPoint,
  allZones: FloodZone[],
  geometryLib: google.maps.GeometryLibrary | null
): LatLngPoint[] {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const pt of zone.paths) {
    if (pt.lat < minLat) minLat = pt.lat;
    if (pt.lat > maxLat) maxLat = pt.lat;
    if (pt.lng < minLng) minLng = pt.lng;
    if (pt.lng > maxLng) maxLng = pt.lng;
  }

  const pad = 0.0045; // ~500m safe setback outside flood zone boundary
  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;

  const rawCandidates: LatLngPoint[] = [
    { lat: midLat, lng: minLng - pad }, // West bypass
    { lat: maxLat + pad, lng: minLng - pad }, // NW bypass
    { lat: minLat - pad, lng: minLng - pad }, // SW bypass
    { lat: maxLat + pad, lng: midLng }, // North bypass
    { lat: minLat - pad, lng: midLng }, // South bypass
    { lat: maxLat + pad, lng: maxLng + pad }, // NE bypass
    { lat: minLat - pad, lng: maxLng + pad }, // SE bypass
    { lat: midLat, lng: maxLng + pad }, // East bypass
  ];

  const safeCandidates = rawCandidates.filter(
    (pt) => !findContainingFloodZone(pt, allZones, geometryLib)
  );

  // Score by minimal total detour distance from origin -> candidate -> destination
  const dist = (a: LatLngPoint, b: LatLngPoint) =>
    Math.hypot(a.lat - b.lat, a.lng - b.lng);

  safeCandidates.sort(
    (a, b) =>
      dist(origin, a) + dist(a, destination) - (dist(origin, b) + dist(b, destination))
  );

  return safeCandidates;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  const mi = meters * 0.000621371;
  return `${km.toFixed(1)} km (${mi.toFixed(1)} mi)`;
}

function formatDuration(millis: number): string {
  const mins = Math.max(1, Math.round(millis / 60000));
  return `${mins} min`;
}

function extractSteps(route: google.maps.routes.Route): RouteStepSummary[] {
  const steps: RouteStepSummary[] = [];
  for (const leg of route.legs ?? []) {
    for (const step of leg.steps ?? []) {
      const instruction = step.instructions?.trim();
      if (!instruction) continue;
      steps.push({
        instruction,
        distance: step.localizedValues?.distance ?? '',
        duration: step.localizedValues?.staticDuration ?? '',
      });
    }
  }
  return steps;
}

export async function computeEvacuationRoute(params: {
  origin: LatLngPoint;
  destination: ShelterPlace;
  avoidFloodEnabled: boolean;
  floodZones: FloodZone[];
  routesLib: google.maps.RoutesLibrary;
  geometryLib: google.maps.GeometryLibrary | null;
}): Promise<EvacuationRouteState> {
  const { origin, destination, avoidFloodEnabled, floodZones, routesLib, geometryLib } = params;
  const { Route } = routesLib;

  const baseRequest: google.maps.routes.ComputeRoutesRequest = {
    origin,
    destination: destination.location,
    travelMode: 'DRIVING',
    routingPreference: 'TRAFFIC_AWARE',
    fields: ['path', 'distanceMeters', 'durationMillis', 'localizedValues', 'legs', 'routeLabels'],
    internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
  };

  const initialResponse = await Route.computeRoutes(baseRequest);
  const initialRoute = initialResponse.routes?.[0];
  if (!initialRoute || !initialRoute.path || initialRoute.path.length === 0) {
    throw new Error('Routes API returned no viable evacuation path.');
  }

  let chosenRoute = initialRoute;
  let bypassWaypoints: LatLngPoint[] = [];
  let bypassedFloodZone = false;

  const initialHits = findIntersectedZones(initialRoute.path, floodZones, geometryLib);
  let intersectsFloodZone = initialHits.length > 0;

  if (avoidFloodEnabled && initialHits.length > 0) {
    const primaryHit = initialHits[0];
    const candidates = buildPerimeterBypassCandidates(
      primaryHit,
      origin,
      destination.location,
      floodZones,
      geometryLib
    );

    // Try top 3 perimeter bypass waypoints to find a route with zero polygon intersections
    for (const candidate of candidates.slice(0, 3)) {
      try {
        const detourResponse = await Route.computeRoutes({
          ...baseRequest,
          intermediates: [{ location: candidate, via: true }],
        });
        const detourRoute = detourResponse.routes?.[0];
        if (!detourRoute?.path || detourRoute.path.length === 0) continue;

        const detourHits = findIntersectedZones(detourRoute.path, floodZones, geometryLib);
        if (detourHits.length === 0) {
          chosenRoute = detourRoute;
          bypassWaypoints = [candidate];
          bypassedFloodZone = true;
          intersectsFloodZone = false;
          break;
        }
        // Keep best improvement if no zero-hit found yet
        if (detourHits.length < initialHits.length) {
          chosenRoute = detourRoute;
          bypassWaypoints = [candidate];
          bypassedFloodZone = true;
        }
      } catch {
        // Ignore single candidate failure and try next perimeter waypoint
      }
    }
  }

  const finalPath: LatLngPoint[] = (chosenRoute.path ?? []).map((pt) =>
    toLatLngPoint(pt)
  );

  const distanceMeters = chosenRoute.distanceMeters ?? 0;
  const durationMillis = chosenRoute.durationMillis ?? 0;

  return {
    origin,
    destination,
    path: finalPath,
    distanceMeters,
    durationMillis,
    distanceText: chosenRoute.localizedValues?.distance ?? formatDistance(distanceMeters),
    durationText: chosenRoute.localizedValues?.duration ?? formatDuration(durationMillis),
    avoidFloodEnabled,
    bypassedFloodZone,
    intersectsFloodZone,
    bypassWaypoints,
    steps: extractSteps(chosenRoute),
  };
}
