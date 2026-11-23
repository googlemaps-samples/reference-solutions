import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  extractErrorMessage,
  getServerApiKey,
  missingKeyResponse,
  parseCoordinates
} from '$lib/server/gmp';

const FIELD_MASK =
  'name,center,boundingBox,imageryDate,imageryQuality,postalCode,administrativeArea,regionCode,solarPotential';

export const GET: RequestHandler = async ({ url, fetch }) => {
  const apiKey = getServerApiKey();
  if (!apiKey) {
    return missingKeyResponse();
  }

  const coords = parseCoordinates(url.searchParams.get('lat'), url.searchParams.get('lng'));
  if (!coords) {
    return json({ error: 'Valid lat and lng query parameters are required.' }, { status: 400 });
  }

  const upstreamUrl = new URL('https://solar.googleapis.com/v1/buildingInsights:findClosest');
  upstreamUrl.searchParams.set('location.latitude', String(coords.lat));
  upstreamUrl.searchParams.set('location.longitude', String(coords.lng));
  upstreamUrl.searchParams.set('requiredQuality', 'LOW');

  try {
    const upstreamRes = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK
      }
    });

    if (upstreamRes.status === 404) {
      return json(
        {
          nonCoverage: true,
          status: 404,
          message:
            'No building rooftop solar insights found within 50m of this coordinate. Try clicking directly on a building footprint or searching a street address.'
        },
        { status: 200 }
      );
    }

    const data = await upstreamRes.json().catch(() => null);
    if (!upstreamRes.ok) {
      return json(
        { error: extractErrorMessage(data, `Solar API returned ${upstreamRes.status}`) },
        { status: upstreamRes.status }
      );
    }

    return json(data);
  } catch {
    return json({ error: 'Unable to reach Google Maps Solar API.' }, { status: 502 });
  }
};
