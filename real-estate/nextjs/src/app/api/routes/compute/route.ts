import { NextRequest, NextResponse } from 'next/server';
import { getServerGoogleMapsApiKey, isValidLatLng } from '@/lib/gmp-server';

const FIELD_MASK =
  'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.localizedValues';

export async function POST(request: NextRequest) {
  const apiKey = getServerGoogleMapsApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'Google Maps API key is not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_API_KEY in .env.local.',
      },
      { status: 503 }
    );
  }

  let body: {
    origin?: { lat: number; lng: number };
    destination?: { lat: number; lng: number };
    travelMode?: 'DRIVE' | 'TRANSIT';
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  if (!isValidLatLng(body.origin) || !isValidLatLng(body.destination)) {
    return NextResponse.json(
      { error: 'Valid origin and destination { lat, lng } coordinates are required.' },
      { status: 400 }
    );
  }

  const travelMode = body.travelMode === 'TRANSIT' ? 'TRANSIT' : 'DRIVE';

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
    travelMode,
    languageCode: 'en-US',
    units: 'IMPERIAL',
  };

  if (travelMode === 'DRIVE') {
    upstreamBody.routingPreference = 'TRAFFIC_AWARE';
    upstreamBody.computeAlternativeRoutes = false;
  }

  try {
    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
        'X-Goog-Maps-Solution-ID': 'gmp_git_agentsamples_v1.0.0',
      },
      body: JSON.stringify(upstreamBody),
      cache: 'no-store',
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || 'Compute Routes request failed.', details: data },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reach Routes API.' },
      { status: 502 }
    );
  }
}
