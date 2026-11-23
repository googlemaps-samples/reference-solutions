import { NextRequest, NextResponse } from 'next/server';

const PLACES_TEXT_SEARCH_URL =
  'https://places.googleapis.com/v1/places:searchText';

const FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location';

export async function POST(req: NextRequest) {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key is not configured on the server.' },
      { status: 500 }
    );
  }

  try {
    const body = (await req.json()) as {
      textQuery?: string;
      maxResultCount?: number;
    };

    const textQuery = body.textQuery?.trim();
    if (!textQuery) {
      return NextResponse.json(
        { error: 'textQuery is required.' },
        { status: 400 }
      );
    }

    const upstreamRes = await fetch(PLACES_TEXT_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery,
        languageCode: 'en',
        regionCode: 'US',
        maxResultCount: body.maxResultCount ?? 5,
        locationBias: {
          circle: {
            center: {
              latitude: 34.0522,
              longitude: -118.2437,
            },
            radius: 50000.0,
          },
        },
      }),
      cache: 'no-store',
    });

    const data = await upstreamRes.json();

    if (!upstreamRes.ok) {
      return NextResponse.json(
        {
          error:
            data?.error?.message ||
            'Places API (New) Text Search request failed.',
          details: data,
        },
        { status: upstreamRes.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error('Error in /api/places/search:', err);
    return NextResponse.json(
      { error: 'Failed to query Places API (New).' },
      { status: 500 }
    );
  }
}
