import { NextRequest, NextResponse } from 'next/server';

const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.types';

export interface PlaceSearchResultItem {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: {
    lat: number;
    lng: number;
  };
  types: string[];
}

export async function POST(request: NextRequest) {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    return NextResponse.json(
      {
        error: 'Google Maps API key is not configured on the server.',
        places: [],
      },
      { status: 503 }
    );
  }

  let body: { textQuery?: unknown; maxResultCount?: unknown } = {};
  try {
    body = (await request.json()) as {
      textQuery?: unknown;
      maxResultCount?: unknown;
    };
  } catch {
    body = {};
  }

  const rawQuery =
    typeof body.textQuery === 'string' && body.textQuery.trim().length > 0
      ? body.textQuery.trim().slice(0, 160)
      : 'New York City civic transit hub';

  const maxResultCount =
    typeof body.maxResultCount === 'number' &&
    Number.isFinite(body.maxResultCount)
      ? Math.min(12, Math.max(1, Math.round(body.maxResultCount)))
      : 8;

  try {
    const upstreamResponse = await fetch(PLACES_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: rawQuery,
        languageCode: 'en',
        regionCode: 'US',
        maxResultCount,
        locationBias: {
          circle: {
            center: {
              latitude: 40.73061,
              longitude: -73.98661,
            },
            radius: 14000,
          },
        },
      }),
      cache: 'no-store',
    });

    if (!upstreamResponse.ok) {
      const errPayload = await upstreamResponse.text();
      return NextResponse.json(
        {
          error: `Places API returned status ${upstreamResponse.status}`,
          details: errPayload.slice(0, 240),
          places: [],
        },
        { status: upstreamResponse.status }
      );
    }

    const data = (await upstreamResponse.json()) as {
      places?: Array<{
        id?: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        location?: { latitude?: number; longitude?: number };
        types?: string[];
      }>;
    };

    const places: PlaceSearchResultItem[] = (data.places ?? [])
      .filter(
        (p) =>
          typeof p.location?.latitude === 'number' &&
          typeof p.location?.longitude === 'number'
      )
      .map((p, index) => ({
        id: p.id || `place-${index}`,
        displayName: p.displayName?.text || 'Civic Infrastructure Hub',
        formattedAddress: p.formattedAddress || 'New York, NY',
        location: {
          lat: p.location!.latitude!,
          lng: p.location!.longitude!,
        },
        types: Array.isArray(p.types) ? p.types.slice(0, 4) : [],
      }));

    return NextResponse.json({ places });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to reach Places API',
        places: [],
      },
      { status: 502 }
    );
  }
}
