import { NextRequest, NextResponse } from 'next/server';
import { getServerMapsApiKey, GMP_SOLUTION_ID } from '@/lib/server/gmp';

const ROUTES_FIELD_MASK =
  'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.routeLabels,routes.legs.duration,routes.legs.distanceMeters,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters';

interface ComputeRoutesPayload {
  origin?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  intermediates?: Array<{
    location: { latLng: { latitude: number; longitude: number } };
    via?: boolean;
  }>;
  travelMode?: 'DRIVE' | 'WALK' | 'BICYCLE' | 'TRANSIT';
}

export async function POST(request: NextRequest) {
  const apiKey = getServerMapsApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key is not configured on the server.' },
      { status: 500 }
    );
  }

  let body: ComputeRoutesPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  if (
    !body.origin ||
    !body.destination ||
    typeof body.origin.lat !== 'number' ||
    typeof body.origin.lng !== 'number' ||
    typeof body.destination.lat !== 'number' ||
    typeof body.destination.lng !== 'number'
  ) {
    return NextResponse.json(
      { error: 'Valid origin and destination lat/lng coordinates are required.' },
      { status: 400 }
    );
  }

  const upstreamBody: Record<string, unknown> = {
    origin: {
      location: {
        latLng: {
          latitude: body.origin.lat,
          longitude: body.origin.lng,
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: body.destination.lat,
          longitude: body.destination.lng,
        },
      },
    },
    travelMode: body.travelMode ?? 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
    computeAlternativeRoutes: false,
    polylineQuality: 'HIGH_QUALITY',
    languageCode: 'en-US',
    units: 'METRIC',
  };

  if (Array.isArray(body.intermediates) && body.intermediates.length > 0) {
    upstreamBody.intermediates = body.intermediates.map((wp) => ({
      location: {
        latLng: {
          latitude: wp.location.latLng.latitude,
          longitude: wp.location.latLng.longitude,
        },
      },
      via: wp.via ?? true,
    }));
  }

  try {
    const upstreamResponse = await fetch(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': ROUTES_FIELD_MASK,
          'X-Goog-Maps-Solution-ID': GMP_SOLUTION_ID,
        },
        body: JSON.stringify(upstreamBody),
        cache: 'no-store',
      }
    );

    const rawText = await upstreamResponse.text();
    let data: { routes?: unknown[]; error?: { message?: string } } = {};
    try {
      data = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON returned from Routes API.' },
        { status: 502 }
      );
    }

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        {
          error:
            data.error?.message ||
            `Routes API responded with status ${upstreamResponse.status}`,
        },
        { status: upstreamResponse.status }
      );
    }

    return NextResponse.json({ routes: data.routes ?? [] });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Failed to contact Routes API.',
      },
      { status: 502 }
    );
  }
}
