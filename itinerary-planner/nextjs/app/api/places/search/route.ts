import { NextRequest, NextResponse } from 'next/server';
import {
  getServerGoogleMapsApiKey,
  normalizeRawPlace,
  RawPlacesApiPlace,
} from '@/lib/gmp-server';

const FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.regularOpeningHours,places.photos,places.primaryTypeDisplayName,places.priceLevel,places.googleMapsUri';

interface SearchRequestBody {
  textQuery?: string;
  includedType?: string;
  maxResultCount?: number;
  languageCode?: string;
  locationBias?: {
    lat: number;
    lng: number;
    radiusMeters?: number;
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

  let body: SearchRequestBody;
  try {
    body = (await request.json()) as SearchRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const textQuery = body.textQuery?.trim();
  if (!textQuery) {
    return NextResponse.json({ error: 'textQuery is required.' }, { status: 400 });
  }

  const payload: Record<string, unknown> = {
    textQuery,
    pageSize: Math.min(Math.max(Number(body.maxResultCount) || 10, 1), 20),
    languageCode: body.languageCode || 'en',
  };

  if (body.includedType) {
    payload.includedType = body.includedType;
  }

  if (
    body.locationBias &&
    typeof body.locationBias.lat === 'number' &&
    typeof body.locationBias.lng === 'number'
  ) {
    payload.locationBias = {
      circle: {
        center: {
          latitude: body.locationBias.lat,
          longitude: body.locationBias.lng,
        },
        radius: Math.min(Math.max(body.locationBias.radiusMeters || 15000, 500), 50000),
      },
    };
  }

  try {
    const upstream = await fetch('https://places.googleapis.com/v1/places:searchText', {
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
          error: data.error?.message || 'Places Text Search request failed.',
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
