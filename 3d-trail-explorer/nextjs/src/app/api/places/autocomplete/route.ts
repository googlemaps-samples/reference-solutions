import { NextRequest, NextResponse } from 'next/server';

const PLACES_AUTOCOMPLETE_URL =
  'https://places.googleapis.com/v1/places:autocomplete';
const FIELD_MASK =
  'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat';

interface AutocompleteRequestBody {
  input?: string;
  sessionToken?: string;
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
        suggestions: [],
      },
      { status: 503 }
    );
  }

  let body: AutocompleteRequestBody;
  try {
    body = (await request.json()) as AutocompleteRequestBody;
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON request body.' },
      { status: 400 }
    );
  }

  const input = body.input?.trim();
  if (!input) {
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }

  try {
    const payload: Record<string, unknown> = {
      input,
      locationBias: {
        circle: {
          center: {
            latitude: 38.9542,
            longitude: -120.1103,
          },
          radius: 45000,
        },
      },
    };

    if (body.sessionToken) {
      payload.sessionToken = body.sessionToken;
    }

    const upstreamResponse = await fetch(PLACES_AUTOCOMPLETE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const data = await upstreamResponse.json();
    if (!upstreamResponse.ok) {
      return NextResponse.json(
        {
          error: data?.error?.message || 'Places Autocomplete failed.',
          suggestions: [],
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
            : 'Unexpected error calling Places Autocomplete.',
        suggestions: [],
      },
      { status: 502 }
    );
  }
}
