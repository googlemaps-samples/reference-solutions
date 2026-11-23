import { NextRequest, NextResponse } from 'next/server';

interface ComputeRouteBody {
  origin?: { lat?: number; lng?: number };
  destination?: { lat?: number; lng?: number };
}

const ROUTES_FIELD_MASK =
  'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration';

export async function POST(request: NextRequest) {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    return NextResponse.json(
      {
        error:
          'Google Maps Platform API key is not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (or GOOGLE_MAPS_API_KEY) in .env.local.',
      },
      { status: 500 }
    );
  }

  let body: ComputeRouteBody;
  try {
    body = (await request.json()) as ComputeRouteBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const originLat = body.origin?.lat;
  const originLng = body.origin?.lng;
  const destLat = body.destination?.lat;
  const destLng = body.destination?.lng;

  if (
    typeof originLat !== 'number' ||
    typeof originLng !== 'number' ||
    typeof destLat !== 'number' ||
    typeof destLng !== 'number' ||
    !Number.isFinite(originLat) ||
    !Number.isFinite(originLng) ||
    !Number.isFinite(destLat) ||
    !Number.isFinite(destLng)
  ) {
    return NextResponse.json(
      { error: 'Valid numeric origin and destination { lat, lng } coordinates are required.' },
      { status: 400 }
    );
  }

  const upstreamPayload = {
    origin: {
      location: {
        latLng: {
          latitude: originLat,
          longitude: originLng,
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: destLat,
          longitude: destLng,
        },
      },
    },
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
    computeAlternativeRoutes: false,
    routeModifiers: {
      avoidTolls: false,
      avoidHighways: false,
      avoidFerries: false,
    },
    languageCode: 'en-US',
    regionCode: 'US',
    units: 'METRIC',
  };

  try {
    const upstreamRes = await fetch(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': ROUTES_FIELD_MASK,
        },
        body: JSON.stringify(upstreamPayload),
        cache: 'no-store',
      }
    );

    const data = await upstreamRes.json();

    if (!upstreamRes.ok) {
      return NextResponse.json(
        {
          error:
            data?.error?.message || `Routes API returned status ${upstreamRes.status}`,
          details: data?.error ?? data,
        },
        { status: upstreamRes.status }
      );
    }

    const primaryRoute = data?.routes?.[0];
    if (!primaryRoute) {
      return NextResponse.json(
        { error: 'No driving route found between kitchen hub and destination.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      route: primaryRoute,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to reach Routes API v2.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
