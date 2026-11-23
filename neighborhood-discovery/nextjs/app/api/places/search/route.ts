import { NextRequest } from 'next/server';
import {
  PLACES_LIST_FIELD_MASK,
  RawGooglePlace,
  getServerGoogleMapsApiKey,
  jsonResponse,
  normalizeGooglePlaceSummary
} from '@/lib/gmp-server';
import {
  CATEGORY_META,
  DEFAULT_RADIUS_METERS,
  FilterCategory,
  PlaceSummary
} from '@/lib/types';

interface TextSearchRequestBody {
  textQuery?: string;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  category?: FilterCategory;
  maxResultCount?: number;
}

export async function POST(request: NextRequest) {
  const apiKey = getServerGoogleMapsApiKey();
  if (!apiKey) {
    return jsonResponse(
      {
        error: 'MISSING_API_KEY',
        message:
          'Configure GOOGLE_MAPS_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local.'
      },
      503
    );
  }

  let body: TextSearchRequestBody;
  try {
    body = (await request.json()) as TextSearchRequestBody;
  } catch {
    return jsonResponse({ error: 'INVALID_JSON' }, 400);
  }

  const textQuery = body.textQuery?.trim() ?? '';
  if (!textQuery) {
    return jsonResponse(
      { error: 'MISSING_QUERY', message: 'textQuery is required.' },
      400
    );
  }

  const lat = typeof body.lat === 'number' ? body.lat : 51.5118;
  const lng = typeof body.lng === 'number' ? body.lng : -0.128;
  const radiusMeters = Math.min(
    Math.max(
      typeof body.radiusMeters === 'number'
        ? body.radiusMeters
        : DEFAULT_RADIUS_METERS,
      200
    ),
    50000
  );
  const maxResultCount =
    typeof body.maxResultCount === 'number'
      ? Math.min(Math.max(body.maxResultCount, 1), 20)
      : 16;

  const payload: Record<string, unknown> = {
    textQuery,
    maxResultCount,
    languageCode: 'en',
    regionCode: 'GB',
    locationBias: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: radiusMeters
      }
    }
  };

  const forcedCategory =
    body.category && body.category !== 'all' && body.category in CATEGORY_META
      ? body.category
      : undefined;

  if (forcedCategory) {
    payload.includedType = CATEGORY_META[forcedCategory].includedTypes[0];
  }

  try {
    const response = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': PLACES_LIST_FIELD_MASK
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Upstream error');
      return jsonResponse(
        {
          error: 'UPSTREAM_PLACES_ERROR',
          message: `Places Text Search (${response.status}): ${errorText}`
        },
        502
      );
    }

    const data = (await response.json()) as { places?: RawGooglePlace[] };
    const places = (data.places ?? [])
      .map((raw) => normalizeGooglePlaceSummary(raw, forcedCategory))
      .filter((item): item is PlaceSummary => item !== null);

    return jsonResponse({
      center: { lat, lng },
      radiusMeters,
      places
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to execute Text Search';
    return jsonResponse({ error: 'UPSTREAM_PLACES_ERROR', message }, 502);
  }
}
