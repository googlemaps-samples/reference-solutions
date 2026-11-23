import { NextRequest, NextResponse } from 'next/server';

const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.googleMapsUri';

interface SearchRequestBody {
  textQuery?: string;
  locationBias?: {
    lat: number;
    lng: number;
    radiusMeters?: number;
  };
}

export async function POST(request: NextRequest) {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    return NextResponse.json(
      {
        error:
          'Google Maps API key is not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local.',
        places: [],
      },
      { status: 503 }
    );
  }

  let body: SearchRequestBody;
  try {
    body = (await request.json()) as SearchRequestBody;
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON request body.' },
      { status: 400 }
    );
  }

  const textQuery = body.textQuery?.trim();
  if (!textQuery) {
    return NextResponse.json(
      { error: 'textQuery is required.' },
      { status: 400 }
    );
  }

  const bias = body.locationBias ?? {
    lat: 38.9542,
    lng: -120.1103,
    radiusMeters: 35000,
  };

  try {
    const upstreamResponse = await fetch(PLACES_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery,
        maxResultCount: 5,
        locationBias: {
          circle: {
            center: {
              latitude: bias.lat,
              longitude: bias.lng,
            },
            radius: bias.radiusMeters ?? 35000,
          },
        },
      }),
      cache: 'no-store',
    });

    const data = await upstreamResponse.json();
    if (!upstreamResponse.ok) {
      return NextResponse.json(
        {
          error: data?.error?.message || 'Places Text Search failed.',
          places: [],
        },
        { status: upstreamResponse.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unexpected error calling Places Text Search.',
        places: [],
      },
      { status: 502 }
    );
  }
}
