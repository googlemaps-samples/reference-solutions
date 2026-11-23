import { importLibrary } from '@googlemaps/js-api-loader';
import type { LatLngPoint, SnapToRoadsResult } from '../types/logistics';

interface RoadsProxyResponse {
  ok: boolean;
  snappedPoints?: Array<{
    location: { latitude: number; longitude: number };
    originalIndex?: number;
    placeId: string;
  }>;
  warningMessage?: string | null;
  message?: string;
}

function pointToLatLng(
  pt: LatLngPoint,
  LatLngCtor: typeof google.maps.LatLng,
): google.maps.LatLng {
  return new LatLngCtor(pt.lat, pt.lng);
}

function computeMeanOffsetMeters(
  rawPoints: LatLngPoint[],
  snappedPoints: LatLngPoint[],
  LatLngCtor: typeof google.maps.LatLng,
  spherical: typeof google.maps.geometry.spherical,
): number {
  if (!rawPoints.length || !snappedPoints.length) {
    return 0;
  }

  let totalMeters = 0;
  const snappedLatLngs = snappedPoints.map((p) => pointToLatLng(p, LatLngCtor));

  for (const raw of rawPoints) {
    const rawLatLng = pointToLatLng(raw, LatLngCtor);
    let minDistance = Number.POSITIVE_INFINITY;
    for (const snapped of snappedLatLngs) {
      const dist = spherical.computeDistanceBetween(rawLatLng, snapped);
      if (dist < minDistance) {
        minDistance = dist;
      }
    }
    if (Number.isFinite(minDistance)) {
      totalMeters += minDistance;
    }
  }

  return Math.round((totalMeters / rawPoints.length) * 10) / 10;
}

async function fallbackSnapViaRoutes(
  vehicleId: string,
  rawPoints: LatLngPoint[],
  warningMessage: string,
): Promise<SnapToRoadsResult> {
  const [{ Route }, { LatLng }, { spherical }] = await Promise.all([
    importLibrary('routes'),
    importLibrary('core'),
    importLibrary('geometry'),
  ]);

  const origin = rawPoints[0];
  const destination = rawPoints[rawPoints.length - 1];
  const intermediates = rawPoints.slice(1, -1).map((pt) => ({
    location: { lat: pt.lat, lng: pt.lng },
    via: true,
  }));

  try {
    const { routes } = await Route.computeRoutes({
      origin,
      destination,
      intermediates: intermediates.slice(0, 23),
      travelMode: 'DRIVING',
      routingPreference: 'TRAFFIC_UNAWARE',
      polylineQuality: 'HIGH_QUALITY',
      fields: ['path'],
      internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
    });

    const routePath = routes?.[0]?.path ?? [];
    const snappedPoints: LatLngPoint[] =
      routePath.length >= 2
        ? routePath.map((p) => ({ lat: p.lat, lng: p.lng }))
        : rawPoints;

    return {
      vehicleId,
      rawPoints,
      snappedPoints,
      roadSegmentPlaceIds: [],
      meanOffsetMeters: computeMeanOffsetMeters(
        rawPoints,
        snappedPoints,
        LatLng,
        spherical,
      ),
      source: 'routes-fallback',
      warningMessage,
    };
  } catch {
    return {
      vehicleId,
      rawPoints,
      snappedPoints: rawPoints,
      roadSegmentPlaceIds: [],
      meanOffsetMeters: 0,
      source: 'routes-fallback',
      warningMessage,
    };
  }
}

export async function snapVehicleTraceToRoads(
  vehicleId: string,
  rawPoints: LatLngPoint[],
): Promise<SnapToRoadsResult> {
  if (rawPoints.length < 2) {
    return {
      vehicleId,
      rawPoints,
      snappedPoints: rawPoints,
      roadSegmentPlaceIds: [],
      meanOffsetMeters: 0,
      source: 'roads-api',
      warningMessage: 'At least 2 GPS points are needed to snap to roads.',
    };
  }

  const [{ LatLng }, { spherical }] = await Promise.all([
    importLibrary('core'),
    importLibrary('geometry'),
  ]);

  try {
    const response = await fetch('/api/roads/snap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: rawPoints, interpolate: true }),
    });

    const contentType = response.headers.get('content-type') ?? '';
    if (response.ok && contentType.includes('application/json')) {
      const data = (await response.json()) as RoadsProxyResponse;
      if (data.ok && Array.isArray(data.snappedPoints) && data.snappedPoints.length > 0) {
        const snappedPoints: LatLngPoint[] = data.snappedPoints.map((pt) => ({
          lat: pt.location.latitude,
          lng: pt.location.longitude,
        }));
        const uniquePlaceIds = Array.from(
          new Set(data.snappedPoints.map((pt) => pt.placeId).filter(Boolean)),
        );

        return {
          vehicleId,
          rawPoints,
          snappedPoints,
          roadSegmentPlaceIds: uniquePlaceIds,
          meanOffsetMeters: computeMeanOffsetMeters(
            rawPoints,
            snappedPoints,
            LatLng,
            spherical,
          ),
          source: 'roads-api',
          warningMessage: data.warningMessage ?? null,
        };
      }

      const fallbackMsg = data.message
        ? `Roads API unavailable (${data.message}); using Route.computeRoutes corridor geometry.`
        : 'Using Route.computeRoutes corridor geometry.';
      return fallbackSnapViaRoutes(vehicleId, rawPoints, fallbackMsg);
    }
  } catch {
    // Static build without Vite proxy middleware falls through cleanly
  }

  return fallbackSnapViaRoutes(
    vehicleId,
    rawPoints,
    'Using Route.computeRoutes corridor geometry.',
  );
}
