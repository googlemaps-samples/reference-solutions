import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  extractErrorMessage,
  getServerApiKey,
  missingKeyResponse,
  parseCoordinates
} from '$lib/server/gmp';

const FIELD_MASK = 'regionCode,dailyInfo';

export const GET: RequestHandler = async ({ url, fetch }) => {
  const apiKey = getServerApiKey();
  if (!apiKey) {
    return missingKeyResponse();
  }

  const coords = parseCoordinates(url.searchParams.get('lat'), url.searchParams.get('lng'));
  if (!coords) {
    return json({ error: 'Valid lat and lng query parameters are required.' }, { status: 400 });
  }

  const daysRaw = Number(url.searchParams.get('days') || '5');
  const days = Number.isInteger(daysRaw) && daysRaw >= 1 && daysRaw <= 5 ? daysRaw : 5;

  const upstreamUrl = new URL('https://pollen.googleapis.com/v1/forecast:lookup');
  upstreamUrl.searchParams.set('location.latitude', String(coords.lat));
  upstreamUrl.searchParams.set('location.longitude', String(coords.lng));
  upstreamUrl.searchParams.set('days', String(days));
  upstreamUrl.searchParams.set('plantsDescription', 'true');
  upstreamUrl.searchParams.set('languageCode', 'en');

  try {
    const upstreamRes = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK
      }
    });

    const data = await upstreamRes.json().catch(() => null);
    if (!upstreamRes.ok) {
      return json(
        { error: extractErrorMessage(data, `Pollen API returned ${upstreamRes.status}`) },
        { status: upstreamRes.status }
      );
    }

    return json(data);
  } catch {
    return json({ error: 'Unable to reach Google Maps Pollen API.' }, { status: 502 });
  }
};
