import { NextRequest, NextResponse } from 'next/server';
import {
  FRONT_RANGE_BIAS_RECTANGLE,
  getServerMapsApiKey,
} from '@/lib/gmp-server';

const PLACES_AUTOCOMPLETE_URL =
  'https://places.googleapis.com/v1/places:autocomplete';
const FIELD_MASK =
  'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat';

interface AutocompleteBody {
  input?: string;
  sessionToken?: string;
}

export async function POST(req: NextRequest) {
  const apiKey = getServerMapsApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'Google Maps API key is not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local.',
      },
      { status: 503 }
    );
  }

  let body: AutocompleteBody;
  try {
    body = (await req.json()) as AutocompleteBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const input = body.input?.trim();
  if (!input) {
    return NextResponse.json({ suggestions: [] });
  }

  const payload: Record<string, unknown> = {
    input,
    languageCode: 'en',
    regionCode: 'US',
    includedRegionCodes: ['us'],
    locationBias: {
      rectangle: FRONT_RANGE_BIAS_RECTANGLE,
    },
  };

  if (body.sessionToken) {
    payload.sessionToken = body.sessionToken;
  }

  try {
    const upstreamRes = await fetch(PLACES_AUTOCOMPLETE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const data = (await upstreamRes.json()) as {
      suggestions?: unknown[];
      error?: { message?: string };
    };

    if (!upstreamRes.ok) {
      return NextResponse.json(
        {
          error: data.error?.message || 'Places Autocomplete request failed.',
        },
        { status: upstreamRes.status }
      );
    }

    return NextResponse.json({ suggestions: data.suggestions || [] });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
