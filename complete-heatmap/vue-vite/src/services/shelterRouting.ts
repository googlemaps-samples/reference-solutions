import { importLibrary } from '@googlemaps/js-api-loader';
import type {
  EvacuationRouteSummary,
  FloodZone,
  LatLngPoint,
  ShelterPlace,
} from '../types/hazard';

const USAGE_ATTRIBUTION_IDS = ['gmp_git_agentsamples_v1.0.0'];

function haversineDistanceKm(a: LatLngPoint, b: LatLngPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(h)));
}

export async function searchEmergencyShelters(
  query: string,
  origin: LatLngPoint,
): Promise<ShelterPlace[]> {
  const { Place } = await importLibrary('places');

  const trimmedQuery = query.trim() || 'hospital and community center in Miami, FL';
  const { places } = await Place.searchByText({
    textQuery: trimmedQuery,
    fields: [
      'id',
      'displayName',
      'formattedAddress',
      'location',
      'types',
      'rating',
      'userRatingCount',
      'businessStatus',
    ],
    locationBias: {
      center: origin,
      radius: 8500,
    },
    maxResultCount: 10,
    language: 'en-US',
    region: 'us',
    internalUsageAttributionIds: USAGE_ATTRIBUTION_IDS,
  });

  const mapped: ShelterPlace[] = [];
  for (const place of places) {
    if (!place.location) continue;
    const loc = {
      lat: place.location.lat(),
      lng: place.location.lng(),
    };
    mapped.push({
      id: place.id,
      displayName: place.displayName ?? 'Miami Emergency Facility',
      formattedAddress: place.formattedAddress ?? 'Miami, FL',
      location: loc,
      types: place.types ?? [],
      rating: typeof place.rating === 'number' ? place.rating : null,
      userRatingCount:
        typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
      businessStatus: place.businessStatus ?? null,
      distanceKm: haversineDistanceKm(origin, loc),
    });
  }

  return mapped.sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99));
}

function samplePathWithMidpoints(path: google.maps.LatLngAltitude[]): LatLngPoint[] {
  const points: LatLngPoint[] = [];
  for (let i = 0; i < path.length; i++) {
    const curr = { lat: path[i].lat, lng: path[i].lng };
    points.push(curr);
    if (i < path.length - 1) {
      const next = path[i + 1];
      points.push({
        lat: (curr.lat + next.lat) / 2,
        lng: (curr.lng + next.lng) / 2,
      });
    }
  }
  return points;
}

function findIntersectedFloodZones(
  path: google.maps.LatLngAltitude[] | undefined,
  floodZones: FloodZone[],
  mapPolygons: google.maps.Polygon[],
  poly: google.maps.GeometryLibrary['poly'],
): { names: string[]; indices: number[] } {
  if (!path || path.length === 0 || mapPolygons.length === 0) {
    return { names: [], indices: [] };
  }

  const sampled = samplePathWithMidpoints(path);
  const intersectedNames: string[] = [];
  const intersectedIndices: number[] = [];

  for (let idx = 0; idx < mapPolygons.length; idx++) {
    const polygon = mapPolygons[idx];
    const zone = floodZones[idx];
    if (!zone) continue;

    const hits = sampled.some(
      (pt) => poly.containsLocation(pt, polygon) || poly.isLocationOnEdge(pt, polygon, 1e-4),
    );
    if (hits) {
      intersectedNames.push(zone.name);
      intersectedIndices.push(idx);
    }
  }

  return { names: intersectedNames, indices: intersectedIndices };
}

function buildBypassCandidates(
  origin: LatLngPoint,
  destination: LatLngPoint,
  intersectedZones: FloodZone[],
  allPolygons: google.maps.Polygon[],
  poly: google.maps.GeometryLibrary['poly'],
): LatLngPoint[] {
  if (intersectedZones.length === 0) return [];

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const zone of intersectedZones) {
    for (const pt of zone.paths) {
      minLat = Math.min(minLat, pt.lat);
      maxLat = Math.max(maxLat, pt.lat);
      minLng = Math.min(minLng, pt.lng);
      maxLng = Math.max(maxLng, pt.lng);
    }
  }

  const pad = 0.0032; // ~350m safe perimeter buffer outside the flood zone
  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;

  const rawCandidates: LatLngPoint[] = [
    { lat: maxLat + pad, lng: midLng },
    { lat: minLat - pad, lng: midLng },
    { lat: midLat, lng: minLng - pad },
    { lat: midLat, lng: maxLng + pad },
    { lat: maxLat + pad, lng: minLng - pad },
    { lat: maxLat + pad, lng: maxLng + pad },
    { lat: minLat - pad, lng: minLng - pad },
    { lat: minLat - pad, lng: maxLng + pad },
  ];

  // Keep only candidates outside all active flood polygons
  const safeCandidates = rawCandidates.filter(
    (candidate) => !allPolygons.some((polygon) => poly.containsLocation(candidate, polygon)),
  );

  const routeMidpoint: LatLngPoint = {
    lat: (origin.lat + destination.lat) / 2,
    lng: (origin.lng + destination.lng) / 2,
  };

  return safeCandidates.sort(
    (a, b) => haversineDistanceKm(a, routeMidpoint) - haversineDistanceKm(b, routeMidpoint),
  );
}

function formatDuration(durationMillis: number | null | undefined, localized?: string | null): string {
  if (localized) return localized;
  if (!durationMillis || !Number.isFinite(durationMillis)) return 'N/A';
  const totalMinutes = Math.max(1, Math.round(durationMillis / 60000));
  return `${totalMinutes} min`;
}

function formatDistance(meters: number | undefined, localized?: string | null): string {
  if (localized) return localized;
  if (typeof meters !== 'number') return 'N/A';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export interface ComputedEvacuationResult {
  route: google.maps.routes.Route;
  summary: EvacuationRouteSummary;
}

export async function computeEvacuationRoute(
  origin: LatLngPoint,
  shelter: ShelterPlace,
  floodZones: FloodZone[],
  mapPolygons: google.maps.Polygon[],
  avoidFloodZones: boolean,
): Promise<ComputedEvacuationResult> {
  const [{ Route }, { poly }] = await Promise.all([
    importLibrary('routes'),
    importLibrary('geometry'),
  ]);

  const baseRequest: google.maps.routes.ComputeRoutesRequest = {
    origin,
    destination: shelter.location,
    travelMode: 'DRIVING',
    routingPreference: 'TRAFFIC_AWARE',
    fields: ['path', 'distanceMeters', 'durationMillis', 'localizedValues', 'legs'],
    internalUsageAttributionIds: USAGE_ATTRIBUTION_IDS,
  };

  const primaryResponse = await Route.computeRoutes(baseRequest);
  const primaryRoute = primaryResponse.routes?.[0];
  if (!primaryRoute) {
    throw new Error('Routes API returned no viable path to this shelter.');
  }

  let selectedRoute = primaryRoute;
  let detourApplied = false;
  const primaryHits = findIntersectedFloodZones(
    primaryRoute.path,
    floodZones,
    mapPolygons,
    poly,
  );
  let finalIntersectedNames = primaryHits.names;

  if (avoidFloodZones && primaryHits.indices.length > 0) {
    const hitZones = primaryHits.indices.map((i) => floodZones[i]).filter(Boolean);
    const candidates = buildBypassCandidates(
      origin,
      shelter.location,
      hitZones,
      mapPolygons,
      poly,
    ).slice(0, 4);

    let bestBypassRoute: google.maps.routes.Route | null = null;
    let bestBypassHits: string[] = primaryHits.names;

    for (const waypoint of candidates) {
      try {
        const bypassResponse = await Route.computeRoutes({
          ...baseRequest,
          intermediates: [{ location: waypoint, via: true }],
        });
        const candidateRoute = bypassResponse.routes?.[0];
        if (!candidateRoute) continue;

        const candidateHits = findIntersectedFloodZones(
          candidateRoute.path,
          floodZones,
          mapPolygons,
          poly,
        );

        const isBetter =
          !bestBypassRoute ||
          candidateHits.names.length < bestBypassHits.length ||
          (candidateHits.names.length === bestBypassHits.length &&
            (candidateRoute.distanceMeters ?? Infinity) <
              (bestBypassRoute.distanceMeters ?? Infinity));

        if (isBetter) {
          bestBypassRoute = candidateRoute;
          bestBypassHits = candidateHits.names;
          if (candidateHits.names.length === 0) break;
        }
      } catch {
        // Continue testing remaining perimeter candidates
      }
    }

    if (
      bestBypassRoute &&
      bestBypassHits.length < primaryHits.names.length
    ) {
      selectedRoute = bestBypassRoute;
      finalIntersectedNames = bestBypassHits;
      detourApplied = true;
    }
  }

  const distanceMeters = selectedRoute.distanceMeters ?? 0;
  const durationSeconds = Math.round((selectedRoute.durationMillis ?? 0) / 1000);
  const stepCount =
    selectedRoute.legs?.reduce((sum, leg) => sum + (leg.steps?.length ?? 0), 0) ?? 0;

  let statusMessage = 'Clear Path — No Flood-Zone Intersection';
  if (!avoidFloodZones) {
    statusMessage =
      finalIntersectedNames.length > 0
        ? `Flood Avoidance Off — Crosses ${finalIntersectedNames.join(', ')}`
        : 'Flood Avoidance Off — Direct Route Clear';
  } else if (detourApplied && finalIntersectedNames.length === 0) {
    statusMessage = `Flood Zones Bypassed (${primaryHits.names.length} zone${primaryHits.names.length > 1 ? 's' : ''} avoided via perimeter detour)`;
  } else if (detourApplied) {
    statusMessage = `Partial Detour Applied (${finalIntersectedNames.length} zone overlap remaining)`;
  } else if (finalIntersectedNames.length > 0) {
    statusMessage = `Advisory: Origin/shelter near ${finalIntersectedNames.join(', ')}`;
  }

  return {
    route: selectedRoute,
    summary: {
      shelterName: shelter.displayName,
      shelterAddress: shelter.formattedAddress,
      distanceText: formatDistance(
        selectedRoute.distanceMeters,
        selectedRoute.localizedValues?.distance,
      ),
      durationText: formatDuration(
        selectedRoute.durationMillis,
        selectedRoute.localizedValues?.duration,
      ),
      distanceMeters,
      durationSeconds,
      avoidedFloodZones: avoidFloodZones && finalIntersectedNames.length === 0,
      detourApplied,
      intersectedZones: finalIntersectedNames,
      stepCount,
      statusMessage,
    },
  };
}
