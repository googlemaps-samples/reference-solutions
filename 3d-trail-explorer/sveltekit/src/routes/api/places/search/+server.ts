import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolveServerApiKey } from '$lib/server/gmpKey';

const TEXT_SEARCH_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.googleMapsUri';

const PLACE_DETAILS_FIELD_MASK =
  'id,displayName,formattedAddress,location,rating,userRatingCount,googleMapsUri';

export const POST: RequestHandler = async ({ request, fetch }) => {
  const apiKey = resolveServerApiKey();
  if (!apiKey) {
    return json(
      { error: 'PUBLIC_GOOGLE_MAPS_API_KEY is not configured on the server.', places: [] },
      { status: 503 }
    );
  }

  let body: { textQuery?: string; placeId?: string };
  try {
    body = (await request.json()) as { textQuery?: string; placeId?: string };
  } catch {
    return json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  // Support Place Details lookup when selecting an autocomplete prediction by placeId
  if (body.placeId && typeof body.placeId === 'string') {
    const cleanId = encodeURIComponent(body.placeId.trim());
    const detailsRes = await fetch(`https://places.googleapis.com/v1/places/${cleanId}`, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': PLACE_DETAILS_FIELD_MASK
      }
    });

    if (!detailsRes.ok) {
      const errText = await detailsRes.text();
      return json(
        { error: 'Places API Place Details request failed.', detail: errText, places: [] },
        { status: detailsRes.status }
      );
    }

    const place = await detailsRes.json();
    return json({ places: [place] });
  }

  const textQuery = typeof body.textQuery === 'string' ? body.textQuery.trim() : '';
  if (!textQuery) {
    return json({ error: 'textQuery is required.', places: [] }, { status: 400 });
  }

  const upstreamRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': TEXT_SEARCH_FIELD_MASK
    },
    body: JSON.stringify({
      textQuery,
      maxResultCount: 5,
      languageCode: 'en',
      locationBias: {
        circle: {
          center: { latitude: 38.9542, longitude: -120.1103 },
          radius: 30000.0
        }
      }
    })
  });

  if (!upstreamRes.ok) {
    const errText = await upstreamRes.text();
    return json(
      { error: 'Places API Text Search request failed.', detail: errText, places: [] },
      { status: upstreamRes.status }
    );
  }

  const data = await upstreamRes.json();
  return json({ places: data.places ?? [] });
};
