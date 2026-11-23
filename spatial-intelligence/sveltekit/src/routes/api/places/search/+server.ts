import { json } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import type { RequestHandler } from './$types';
import type { CivicPlaceAnchor, PlacesSearchApiResponse } from '$lib/types/gis';

const PLACES_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.types';

function resolveApiKey(): string {
  const key = (
    privateEnv.GOOGLE_MAPS_API_KEY ||
    publicEnv.PUBLIC_GOOGLE_MAPS_API_KEY ||
    ''
  ).trim();
  if (!key || key === 'your_google_maps_api_key_here') {
    return '';
  }
  return key;
}

interface RawPlaceItem {
  id?: string;
  displayName?: { text?: string; languageCode?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  types?: string[];
}

export const POST: RequestHandler = async ({ request }) => {
  let body: {
    textQuery?: unknown;
    maxResultCount?: unknown;
    locationBias?: {
      circle?: {
        center?: { latitude?: number; longitude?: number };
        radius?: number;
      };
    };
  };

  try {
    body = await request.json();
  } catch {
    return json(
      {
        ok: false,
        status: 'INVALID_REQUEST',
        places: [],
        error: 'Request body must be valid JSON.'
      } satisfies PlacesSearchApiResponse,
      { status: 400 }
    );
  }

  const textQuery =
    typeof body.textQuery === 'string' && body.textQuery.trim().length > 0
      ? body.textQuery.trim()
      : 'New York City civic transit hub';

  const maxResultCount =
    typeof body.maxResultCount === 'number' &&
    body.maxResultCount >= 1 &&
    body.maxResultCount <= 20
      ? Math.floor(body.maxResultCount)
      : 8;

  const apiKey = resolveApiKey();
  if (!apiKey) {
    return json({
      ok: false,
      status: 'API_KEY_NOT_CONFIGURED',
      places: [],
      error:
        'PUBLIC_GOOGLE_MAPS_API_KEY is not configured. Add a Maps Demo Key or Cloud API key to .env to load live NYC civic reference hubs.'
    } satisfies PlacesSearchApiResponse);
  }

  const upstreamBody = {
    textQuery,
    languageCode: 'en',
    regionCode: 'US',
    maxResultCount,
    locationBias: body.locationBias ?? {
      circle: {
        center: { latitude: 40.73061, longitude: -73.98661 },
        radius: 16000
      }
    }
  };

  try {
    const upstreamResponse = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': PLACES_FIELD_MASK
        },
        body: JSON.stringify(upstreamBody)
      }
    );

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      return json({
        ok: false,
        status: `UPSTREAM_${upstreamResponse.status}`,
        places: [],
        error: `Places API (New) returned HTTP ${upstreamResponse.status}: ${errorText.slice(0, 180)}`
      } satisfies PlacesSearchApiResponse);
    }

    const data = (await upstreamResponse.json()) as { places?: RawPlaceItem[] };
    const places: CivicPlaceAnchor[] = (data.places ?? [])
      .filter(
        (item) =>
          item.id &&
          typeof item.location?.latitude === 'number' &&
          typeof item.location?.longitude === 'number'
      )
      .map((item) => ({
        id: item.id as string,
        displayName: item.displayName?.text ?? 'Unnamed Civic Hub',
        formattedAddress: item.formattedAddress ?? 'New York, NY',
        location: {
          latitude: item.location!.latitude as number,
          longitude: item.location!.longitude as number
        },
        types: Array.isArray(item.types) ? item.types.slice(0, 4) : []
      }));

    return json({
      ok: true,
      status: 'OK',
      places
    } satisfies PlacesSearchApiResponse);
  } catch (err) {
    return json({
      ok: false,
      status: 'FETCH_ERROR',
      places: [],
      error:
        err instanceof Error
          ? err.message
          : 'Failed to reach Places API (New).'
    } satisfies PlacesSearchApiResponse);
  }
};
