import { NextRequest, NextResponse } from 'next/server';
import {
  getServerGoogleMapsApiKey,
  normalizeRawPlace,
  RawPlacesApiPlace,
} from '@/lib/gmp-server';

const FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.regularOpeningHours,places.photos,places.primaryTypeDisplayName,places.priceLevel,places.googleMapsUri';

interface NearbyRequestBody {
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  includedTypes?: string[];
  maxResultCount?: number;
  rankPreference?: 'POPULARITY' | 'DISTANCE';
  languageCode?: string;
}

export async function POST(request: NextRequest) {
  const apiKey = getServerGoogleMapsApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key is not configured on the server.' },
      { status: 503 }
    );
  }

  let body: NearbyRequestBody;
  try {
    body = (await request.json()) as NearbyRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  if (typeof body.lat !== 'number' || typeof body.lng !== 'number') {
    return NextResponse.json(
      { error: 'Numeric lat and lng coordinates are required.' },
      { status: 400 }
    );
  }

  const payload: Record<string, unknown> = {
    maxResultCount: Math.min(Math.max(Number(body.maxResultCount) || 10, 1), 20),
    languageCode: body.languageCode || 'en',
    rankPreference: body.rankPreference || 'POPULARITY',
    locationRestriction: {
      circle: {
        center: {
          latitude: body.lat,
          longitude: body.lng,
        },
        radius: Math.min(Math.max(body.radiusMeters || 6000, 200), 50000),
      },
    },
  };

  if (Array.isArray(body.includedTypes) && body.includedTypes.length > 0) {
    payload.includedTypes = body.includedTypes;
  }

  try {
    const upstream = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const data = (await upstream.json()) as {
      places?: RawPlacesApiPlace[];
      error?: { message?: string; status?: string };
    };

    if (!upstream.ok) {
      return NextResponse.json(
        {
          error: data.error?.message || 'Places Nearby Search request failed.',
          status: data.error?.status,
        },
        { status: upstream.status }
      );
    }

    const places = (data.places || [])
      .map(normalizeRawPlace)
      .filter((place): place is NonNullable<typeof place> => place !== null);

    return NextResponse.json({ places });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
