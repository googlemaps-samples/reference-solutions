import { NextRequest, NextResponse } from 'next/server';
import { getServerGoogleMapsApiKey, isValidLatLng } from '@/lib/gmp-server';

const FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.rating,places.userRatingCount';

const DEFAULT_TYPES = [
  'school',
  'primary_school',
  'secondary_school',
  'supermarket',
  'grocery_store',
  'transit_station',
  'subway_station',
  'light_rail_station',
  'bus_station',
];

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
    lat?: number;
    lng?: number;
    radiusMeters?: number;
    includedTypes?: string[];
    maxResultCount?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  if (!isValidLatLng({ lat: body.lat, lng: body.lng })) {
    return NextResponse.json({ error: 'Valid lat and lng are required.' }, { status: 400 });
  }

  const radius =
    typeof body.radiusMeters === 'number' && body.radiusMeters > 0
      ? Math.min(body.radiusMeters, 50000)
      : 5000;

  const includedTypes =
    Array.isArray(body.includedTypes) && body.includedTypes.length > 0
      ? body.includedTypes.filter((t) => typeof t === 'string' && t.trim().length > 0)
      : DEFAULT_TYPES;

  const maxResultCount =
    typeof body.maxResultCount === 'number' && body.maxResultCount >= 1 && body.maxResultCount <= 20
      ? Math.round(body.maxResultCount)
      : 12;

  const upstreamBody = {
    includedTypes,
    maxResultCount,
    rankPreference: 'DISTANCE',
    languageCode: 'en',
    regionCode: 'US',
    locationRestriction: {
      circle: {
        center: {
          latitude: body.lat,
          longitude: body.lng,
        },
        radius,
      },
    },
  };

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
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
        { error: data?.error?.message || 'Places Nearby Search request failed.', details: data },
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
