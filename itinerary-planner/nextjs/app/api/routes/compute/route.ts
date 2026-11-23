import { NextRequest, NextResponse } from 'next/server';
import { formatDuration, parseDurationSeconds } from '@/lib/formatters';
import { getServerGoogleMapsApiKey } from '@/lib/gmp-server';
import { ComputedRouteData, LatLngLiteral, TravelMode } from '@/types/itinerary';

const FIELD_MASK =
  'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.optimizedIntermediateWaypointIndex,routes.legs.distanceMeters,routes.legs.duration,routes.legs.startLocation,routes.legs.endLocation,routes.viewport';

interface ComputeRouteBody {
  waypoints?: LatLngLiteral[];
  travelMode?: TravelMode;
  optimizeWaypointOrder?: boolean;
}

function toWaypoint(point: LatLngLiteral) {
  return {
    location: {
      latLng: {
        latitude: point.lat,
        longitude: point.lng,
      },
    },
  };
}

export async function POST(request: NextRequest) {
  const apiKey = getServerGoogleMapsApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key is not configured on the server.' },
      { status: 503 }
    );
  }

  let body: ComputeRouteBody;
  try {
    body = (await request.json()) as ComputeRouteBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const waypoints = Array.isArray(body.waypoints)
    ? body.waypoints.filter(
        (wp): wp is LatLngLiteral =>
          typeof wp?.lat === 'number' && typeof wp?.lng === 'number'
      )
    : [];

  if (waypoints.length < 2) {
    return NextResponse.json(
      { error: 'At least two valid waypoints are required to compute a route.' },
      { status: 400 }
    );
  }

  const travelMode: TravelMode =
    body.travelMode === 'WALK' || body.travelMode === 'TRANSIT'
      ? body.travelMode
      : 'DRIVE';

  const origin = toWaypoint(waypoints[0]);
  const destination = toWaypoint(waypoints[waypoints.length - 1]);
  const intermediates =
    waypoints.length > 2 ? waypoints.slice(1, -1).map(toWaypoint) : [];

  const canOptimize =
    Boolean(body.optimizeWaypointOrder) &&
    intermediates.length > 0 &&
    travelMode !== 'TRANSIT';

  const payload: Record<string, unknown> = {
    origin,
    destination,
    travelMode,
    computeAlternativeRoutes: false,
    languageCode: 'en-US',
    units: 'METRIC',
  };

  if (intermediates.length > 0) {
    payload.intermediates = intermediates;
  }

  if (travelMode === 'DRIVE') {
    payload.routingPreference = 'TRAFFIC_AWARE';
  }

  if (canOptimize) {
    payload.optimizeWaypointOrder = true;
  }

  try {
    const upstream = await fetch(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      }
    );

    const data = (await upstream.json()) as {
      routes?: Array<{
        distanceMeters?: number;
        duration?: string;
        polyline?: { encodedPolyline?: string };
        optimizedIntermediateWaypointIndex?: number[];
        legs?: Array<{
          distanceMeters?: number;
          duration?: string;
        }>;
        viewport?: {
          low?: { latitude?: number; longitude?: number };
          high?: { latitude?: number; longitude?: number };
        };
      }>;
      error?: { message?: string; status?: string };
    };

    if (!upstream.ok) {
      return NextResponse.json(
        {
          error: data.error?.message || 'Routes API computeRoutes request failed.',
          status: data.error?.status,
        },
        { status: upstream.status }
      );
    }

    const firstRoute = data.routes?.[0];
    if (!firstRoute) {
      return NextResponse.json(
        {
          route: null,
          error: 'No route could be found for the selected stops and travel mode.',
        },
        { status: 200 }
      );
    }

    const totalSeconds = parseDurationSeconds(firstRoute.duration);
    const normalized: ComputedRouteData = {
      distanceMeters: firstRoute.distanceMeters || 0,
      durationSeconds: totalSeconds,
      durationText: formatDuration(totalSeconds),
      encodedPolyline: firstRoute.polyline?.encodedPolyline || '',
      optimizedIntermediateWaypointIndex: firstRoute.optimizedIntermediateWaypointIndex,
      legs: (firstRoute.legs || []).map((leg) => {
        const legSeconds = parseDurationSeconds(leg.duration);
        return {
          distanceMeters: leg.distanceMeters || 0,
          durationSeconds: legSeconds,
          durationText: formatDuration(legSeconds),
        };
      }),
      viewport:
        firstRoute.viewport?.low?.latitude !== undefined &&
        firstRoute.viewport?.low?.longitude !== undefined &&
        firstRoute.viewport?.high?.latitude !== undefined &&
        firstRoute.viewport?.high?.longitude !== undefined
          ? {
              low: {
                latitude: firstRoute.viewport.low.latitude,
                longitude: firstRoute.viewport.low.longitude,
              },
              high: {
                latitude: firstRoute.viewport.high.latitude,
                longitude: firstRoute.viewport.high.longitude,
              },
            }
          : undefined,
    };

    return NextResponse.json({ route: normalized });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected routing error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
