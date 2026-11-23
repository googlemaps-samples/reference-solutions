import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolveServerApiKey } from '$lib/server/gmpKey';

const AUTOCOMPLETE_FIELD_MASK =
  'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat';

export const POST: RequestHandler = async ({ request, fetch }) => {
  const apiKey = resolveServerApiKey();
  if (!apiKey) {
    return json(
      { error: 'PUBLIC_GOOGLE_MAPS_API_KEY is not configured on the server.', suggestions: [] },
      { status: 503 }
    );
  }

  let body: { input?: string; sessionToken?: string };
  try {
    body = (await request.json()) as { input?: string; sessionToken?: string };
  } catch {
    return json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const input = typeof body.input === 'string' ? body.input.trim() : '';
  if (input.length < 2) {
    return json({ suggestions: [] });
  }

  const payload: Record<string, unknown> = {
    input,
    languageCode: 'en',
    locationBias: {
      circle: {
        center: { latitude: 38.9542, longitude: -120.1103 },
        radius: 35000.0
      }
    }
  };

  if (body.sessionToken) {
    payload.sessionToken = body.sessionToken;
  }

  const upstreamRes = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': AUTOCOMPLETE_FIELD_MASK
    },
    body: JSON.stringify(payload)
  });

  if (!upstreamRes.ok) {
    const errText = await upstreamRes.text();
    return json(
      { error: 'Places API Autocomplete request failed.', detail: errText, suggestions: [] },
      { status: upstreamRes.status }
    );
  }

  const data = await upstreamRes.json();
  return json({ suggestions: data.suggestions ?? [] });
};
