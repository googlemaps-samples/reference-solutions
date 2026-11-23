import { NextRequest, NextResponse } from 'next/server';
import { getServerGoogleMapsApiKey, isValidLatLng } from '@/lib/gmp-server';

const FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.viewport';

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
    textQuery?: string;
    biasCenter?: { lat: number; lng: number };
    biasRadiusMeters?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const textQuery = typeof body.textQuery === 'string' ? body.textQuery.trim() : '';
  if (!textQuery) {
    return NextResponse.json({ error: 'textQuery is required.' }, { status: 400 });
  }

  const upstreamBody: Record<string, unknown> = {
    textQuery,
    languageCode: 'en',
    regionCode: 'US',
    pageSize: 5,
  };

  if (isValidLatLng(body.biasCenter)) {
    const radius =
      typeof body.biasRadiusMeters === 'number' && body.biasRadiusMeters > 0
        ? Math.min(body.biasRadiusMeters, 50000)
        : 20000;
    upstreamBody.locationBias = {
      circle: {
        center: {
          latitude: body.biasCenter.lat,
          longitude: body.biasCenter.lng,
        },
        radius,
      },
    };
  } else {
    // Bias by default to San Francisco metro area
    upstreamBody.locationBias = {
      circle: {
        center: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
        radius: 25000,
      },
    };
  }

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
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
        { error: data?.error?.message || 'Places Text Search request failed.', details: data },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reach Places API.' },
      { status: 502 }
    );
  }
}
