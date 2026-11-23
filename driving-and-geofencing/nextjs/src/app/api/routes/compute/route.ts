import { NextResponse } from 'next/server';
import { parseDurationSeconds } from '@/lib/geofence';
import type { LatLngLiteral } from '@/types/geofencing';

interface ComputeRouteRequestBody {
  origin?: LatLngLiteral;
  destination?: LatLngLiteral;
  intermediates?: LatLngLiteral[];
}

interface GoogleRouteLeg {
  distanceMeters?: number;
  duration?: string;
  startLocation?: { latLng?: { latitude?: number; longitude?: number } };
  endLocation?: { latLng?: { latitude?: number; longitude?: number } };
}

interface GoogleRouteResponseItem {
  optimizedIntermediateWaypointIndex?: number[];
  distanceMeters?: number;
  duration?: string;
  polyline?: { encodedPolyline?: string };
  legs?: GoogleRouteLeg[];
}

const ROUTES_FIELD_MASK =
  'routes.optimizedIntermediateWaypointIndex,routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.distanceMeters,routes.legs.duration,routes.legs.startLocation,routes.legs.endLocation';

function isValidLatLng(pt: unknown): pt is LatLngLiteral {
  if (!pt || typeof pt !== 'object') return false;
  const candidate = pt as Record<string, unknown>;
  return (
    typeof candidate.lat === 'number' &&
    Number.isFinite(candidate.lat) &&
    candidate.lat >= -90 &&
    candidate.lat <= 90 &&
    typeof candidate.lng === 'number' &&
    Number.isFinite(candidate.lng) &&
    candidate.lng >= -180 &&
    candidate.lng <= 180
  );
}

export async function POST(request: Request) {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    return NextResponse.json(
      {
        error:
          'Google Maps Platform API key is not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local.',
      },
      { status: 503 }
    );
  }

  let body: ComputeRouteRequestBody;
  try {
    body = (await request.json()) as ComputeRouteRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  if (!isValidLatLng(body.origin) || !isValidLatLng(body.destination)) {
    return NextResponse.json(
      { error: 'Valid origin and destination coordinates are required.' },
      { status: 400 }
    );
  }

  const intermediates = Array.isArray(body.intermediates)
    ? body.intermediates.filter(isValidLatLng)
    : [];

  const canOptimize = intermediates.length > 1;
  const fieldMask = canOptimize
    ? ROUTES_FIELD_MASK
    : 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.distanceMeters,routes.legs.duration,routes.legs.startLocation,routes.legs.endLocation';

  const upstreamBody: Record<string, unknown> = {
    origin: {
      location: {
        latLng: { latitude: body.origin.lat, longitude: body.origin.lng },
      },
    },
    destination: {
      location: {
        latLng: { latitude: body.destination.lat, longitude: body.destination.lng },
      },
    },
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
    languageCode: 'en-US',
    units: 'IMPERIAL',
  };

  if (intermediates.length > 0) {
    upstreamBody.intermediates = intermediates.map((pt) => ({
      location: {
        latLng: { latitude: pt.lat, longitude: pt.lng },
      },
    }));
  }

  if (canOptimize) {
    upstreamBody.optimizeWaypointOrder = true;
  }

  try {
    const upstreamRes = await fetch(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': fieldMask,
          'X-Server-Timeout': '10',
        },
        body: JSON.stringify(upstreamBody),
        cache: 'no-store',
      }
    );

    const payload = (await upstreamRes.json()) as {
      routes?: GoogleRouteResponseItem[];
      error?: { message?: string };
    };

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: payload.error?.message || 'Routes API v2 computeRoutes failed.' },
        { status: upstreamRes.status }
      );
    }

    const route = payload.routes?.[0];
    if (!route) {
      return NextResponse.json(
        { error: 'No drivable route found between the selected Austin audit sites.' },
        { status: 404 }
      );
    }

    const optimizedIndices =
      route.optimizedIntermediateWaypointIndex &&
      route.optimizedIntermediateWaypointIndex.length === intermediates.length
        ? route.optimizedIntermediateWaypointIndex
        : intermediates.map((_, idx) => idx);

    return NextResponse.json({
      optimizedIntermediateWaypointIndex: optimizedIndices,
      distanceMeters: route.distanceMeters ?? 0,
      durationSeconds: parseDurationSeconds(route.duration),
      encodedPolyline: route.polyline?.encodedPolyline ?? '',
      legs: (route.legs ?? []).map((leg) => ({
        distanceMeters: leg.distanceMeters ?? 0,
        durationSeconds: parseDurationSeconds(leg.duration),
      })),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unexpected error calling Routes API v2.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
