import { NextRequest, NextResponse } from 'next/server';
import { NYC_CENTER } from '@/lib/classify';
import { getServerApiKey } from '@/lib/gmp-server';
import type { AutocompleteSuggestionItem } from '@/types/locator';

const AUTOCOMPLETE_FIELD_MASK =
  'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat';

interface UpstreamAutocompleteResponse {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
    };
  }>;
}

export async function POST(request: NextRequest) {
  const apiKey = getServerApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key is not configured on the server.' },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const input = typeof body.input === 'string' ? body.input.trim() : '';
  if (input.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const sessionToken =
    typeof body.sessionToken === 'string' && /^[A-Za-z0-9_-]{1,36}$/.test(body.sessionToken)
      ? body.sessionToken
      : undefined;

  try {
    const payload: Record<string, unknown> = {
      input: input.slice(0, 160),
      includedRegionCodes: ['us'],
      languageCode: 'en',
      regionCode: 'us',
      locationBias: {
        circle: {
          center: {
            latitude: NYC_CENTER.lat,
            longitude: NYC_CENTER.lng,
          },
          radius: 25000,
        },
      },
    };

    if (sessionToken) {
      payload.sessionToken = sessionToken;
    }

    const upstream = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': AUTOCOMPLETE_FIELD_MASK,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return NextResponse.json(
        { error: `Places Autocomplete failed (${upstream.status}): ${errText}` },
        { status: 502 }
      );
    }

    const data = (await upstream.json()) as UpstreamAutocompleteResponse;
    const suggestions: AutocompleteSuggestionItem[] = (data.suggestions ?? [])
      .map((item) => item.placePrediction)
      .filter((pred): pred is NonNullable<typeof pred> => Boolean(pred?.placeId))
      .map((pred) => {
        const fullText = pred.text?.text ?? '';
        const primaryText = pred.structuredFormat?.mainText?.text ?? fullText;
        const secondaryText = pred.structuredFormat?.secondaryText?.text ?? '';
        return {
          placeId: pred.placeId!,
          primaryText,
          secondaryText,
          fullText,
        };
      });

    return NextResponse.json({ suggestions });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to fetch Places Autocomplete suggestions.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
