import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { extractErrorMessage, getServerApiKey, missingKeyResponse } from '$lib/server/gmp';

const FIELD_MASK = 'places.id,places.displayName,places.formattedAddress,places.location';

export const POST: RequestHandler = async ({ request, fetch }) => {
  const apiKey = getServerApiKey();
  if (!apiKey) {
    return missingKeyResponse();
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const textQuery = typeof body?.textQuery === 'string' ? body.textQuery.trim() : '';

  if (!textQuery) {
    return json({ error: 'textQuery is required.' }, { status: 400 });
  }

  try {
    const upstreamRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK
      },
      body: JSON.stringify({
        textQuery,
        languageCode: 'en',
        maxResultCount: 1
      })
    });

    const data = await upstreamRes.json().catch(() => null);
    if (!upstreamRes.ok) {
      return json(
        { error: extractErrorMessage(data, `Places API returned ${upstreamRes.status}`) },
        { status: upstreamRes.status }
      );
    }

    return json(data);
  } catch {
    return json({ error: 'Unable to reach Google Maps Places API.' }, { status: 502 });
  }
};
