import type {
  FleetVehicle,
  LatLngPoint,
  RoadSnapResult,
  SnappedPointInfo,
} from '../types/logistics';

interface RoadsProxyResponse {
  ok: boolean;
  source?: 'roads-api';
  snappedPoints?: Array<{
    location: { latitude: number; longitude: number };
    originalIndex?: number;
    placeId: string;
  }>;
  warningMessage?: string | null;
  error?: string;
  status?: number;
}

function haversineMeters(a: LatLngPoint, b: LatLngPoint): number {
  const earthRadius = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * earthRadius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function computeDistanceMeters(
  a: LatLngPoint,
  b: LatLngPoint,
  geometryLib: google.maps.GeometryLibrary | null,
): number {
  if (geometryLib?.spherical) {
    return geometryLib.spherical.computeDistanceBetween(a, b);
  }
  return haversineMeters(a, b);
}

function nearestDistanceToPath(
  point: LatLngPoint,
  path: LatLngPoint[],
  geometryLib: google.maps.GeometryLibrary | null,
): number {
  let minMeters = Infinity;
  for (const candidate of path) {
    const dist = computeDistanceMeters(point, candidate, geometryLib);
    if (dist < minMeters) {
      minMeters = dist;
    }
  }
  return Number.isFinite(minMeters) ? minMeters : 0;
}

export async function snapVehicleBreadcrumbs(
  vehicle: FleetVehicle,
  geometryLib: google.maps.GeometryLibrary | null,
  routesLib: google.maps.RoutesLibrary | null,
): Promise<RoadSnapResult> {
  const rawPoints = vehicle.rawBreadcrumbs;

  try {
    const res = await fetch('/api/roads/snap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: rawPoints,
        interpolate: true,
      }),
    });

    const data = (await res.json()) as RoadsProxyResponse;

    if (data.ok && Array.isArray(data.snappedPoints) && data.snappedPoints.length > 0) {
      const snappedPoints: SnappedPointInfo[] = data.snappedPoints.map((pt) => ({
        location: {
          lat: pt.location.latitude,
          lng: pt.location.longitude,
        },
        originalIndex: pt.originalIndex,
        placeId: pt.placeId,
      }));

      const snappedPath = snappedPoints.map((pt) => pt.location);
      const uniquePlaceIds: Record<string, true> = {};
      let offsetSum = 0;
      let offsetCount = 0;

      for (const pt of snappedPoints) {
        if (pt.placeId) {
          uniquePlaceIds[pt.placeId] = true;
        }
        if (
          typeof pt.originalIndex === 'number' &&
          rawPoints[pt.originalIndex]
        ) {
          offsetSum += computeDistanceMeters(
            rawPoints[pt.originalIndex],
            pt.location,
            geometryLib,
          );
          offsetCount += 1;
        }
      }

      return {
        vehicleId: vehicle.id,
        source: 'roads-api',
        rawPoints,
        snappedPath,
        snappedPoints,
        uniqueRoadSegments: Object.keys(uniquePlaceIds).length,
        meanOffsetMeters: offsetCount > 0 ? Math.round(offsetSum / offsetCount) : 0,
        warningMessage: data.warningMessage ?? null,
      };
    }

    // Fallback when Roads API is not enabled on a demo/prototyping key:
    // Use Routes API Route.computeRoutes along the sampled breadcrumbs to keep
    // road-geometry comparison functional without throwing console errors.
    if (routesLib && rawPoints.length >= 2) {
      const step = Math.max(1, Math.floor((rawPoints.length - 2) / 4));
      const intermediates: google.maps.routes.Waypoint[] = [];
      for (let i = step; i < rawPoints.length - 1; i += step) {
        if (intermediates.length < 6) {
          intermediates.push({ location: rawPoints[i], via: true });
        }
      }

      const { routes } = await routesLib.Route.computeRoutes({
        origin: rawPoints[0],
        destination: rawPoints[rawPoints.length - 1],
        intermediates,
        travelMode: 'DRIVING',
        routingPreference: 'TRAFFIC_UNAWARE',
        fields: ['path'],
      });

      const primaryRoute = routes?.[0];
      const routePath = (primaryRoute?.path ?? []).map((pt) => ({
        lat: Number(pt.lat),
        lng: Number(pt.lng),
      }));

      if (routePath.length > 0) {
        const offsets = rawPoints.map((rawPt) =>
          nearestDistanceToPath(rawPt, routePath, geometryLib),
        );
        const meanOffsetMeters = Math.round(
          offsets.reduce((acc, v) => acc + v, 0) / Math.max(1, offsets.length),
        );

        return {
          vehicleId: vehicle.id,
          source: 'routes-fallback',
          rawPoints,
          snappedPath: routePath,
          snappedPoints: routePath.map((loc, idx) => ({
            location: loc,
            placeId: `corridor-seg-${Math.floor(idx / 6)}`,
          })),
          uniqueRoadSegments: Math.max(1, Math.ceil(routePath.length / 6)),
          meanOffsetMeters,
          warningMessage:
            data.error ??
            'Roads API v1/snapToRoads unavailable on this key; aligned via Routes API.',
        };
      }
    }

    return {
      vehicleId: vehicle.id,
      source: 'unavailable',
      rawPoints,
      snappedPath: [],
      snappedPoints: [],
      uniqueRoadSegments: 0,
      meanOffsetMeters: 0,
      warningMessage:
        data.error ?? 'Roads API snapToRoads is unavailable with the current API key.',
    };
  } catch (err) {
    return {
      vehicleId: vehicle.id,
      source: 'unavailable',
      rawPoints,
      snappedPath: [],
      snappedPoints: [],
      uniqueRoadSegments: 0,
      meanOffsetMeters: 0,
      warningMessage:
        err instanceof Error ? err.message : 'Unable to snap GPS breadcrumbs.',
    };
  }
}
