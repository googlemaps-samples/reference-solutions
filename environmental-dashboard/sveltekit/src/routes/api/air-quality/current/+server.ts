import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  extractErrorMessage,
  getServerApiKey,
  missingKeyResponse,
  parseCoordinates
} from '$lib/server/gmp';

const FIELD_MASK = 'dateTime,regionCode,indexes,pollutants,healthRecommendations';

export const POST: RequestHandler = async ({ request, fetch }) => {
  const apiKey = getServerApiKey();
  if (!apiKey) {
    return missingKeyResponse();
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const latVal = body?.latitude ?? body?.lat;
  const lngVal = body?.longitude ?? body?.lng;
  const coords = parseCoordinates(
    typeof latVal === 'number' || typeof latVal === 'string' ? latVal : null,
    typeof lngVal === 'number' || typeof lngVal === 'string' ? lngVal : null
  );

  if (!coords) {
    return json({ error: 'Valid latitude and longitude are required.' }, { status: 400 });
  }

  try {
    const upstreamRes = await fetch('https://airquality.googleapis.com/v1/currentConditions:lookup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK
      },
      body: JSON.stringify({
        universalAqi: true,
        location: {
          latitude: coords.lat,
          longitude: coords.lng
        },
        extraComputations: [
          'HEALTH_RECOMMENDATIONS',
          'DOMINANT_POLLUTANT_CONCENTRATION',
          'POLLUTANT_CONCENTRATION',
          'LOCAL_AQI',
          'POLLUTANT_ADDITIONAL_INFO'
        ],
        languageCode: 'en'
      })
    });

    const data = await upstreamRes.json().catch(() => null);
    if (!upstreamRes.ok) {
      return json(
        { error: extractErrorMessage(data, `Air Quality API returned ${upstreamRes.status}`) },
        { status: upstreamRes.status }
      );
    }

    return json(data);
  } catch {
    return json({ error: 'Unable to reach Google Maps Air Quality API.' }, { status: 502 });
  }
};
