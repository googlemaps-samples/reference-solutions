import { NextRequest } from 'next/server';
import {
  PLACES_LIST_FIELD_MASK,
  RawGooglePlace,
  getServerGoogleMapsApiKey,
  jsonResponse,
  normalizeGooglePlaceSummary
} from '@/lib/gmp-server';
import {
  ALL_CATEGORIES,
  CATEGORY_META,
  DEFAULT_RADIUS_METERS,
  PlaceCategory,
  PlaceSummary
} from '@/lib/types';

interface NearbyRequestBody {
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  categories?: PlaceCategory[];
  maxResultCount?: number;
}

async function fetchCategoryNearby(
  apiKey: string,
  lat: number,
  lng: number,
  radiusMeters: number,
  category: PlaceCategory,
  maxResultCount: number
): Promise<PlaceSummary[]> {
  const response = await fetch(
    'https://places.googleapis.com/v1/places:searchNearby',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': PLACES_LIST_FIELD_MASK
      },
      body: JSON.stringify({
        includedTypes: CATEGORY_META[category].includedTypes,
        maxResultCount,
        rankPreference: 'POPULARITY',
        languageCode: 'en',
        regionCode: 'GB',
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radiusMeters
          }
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Upstream error');
    throw new Error(`Places Nearby (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { places?: RawGooglePlace[] };
  return (data.places ?? [])
    .map((raw) => normalizeGooglePlaceSummary(raw, category))
    .filter((item): item is PlaceSummary => item !== null);
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

  let body: NearbyRequestBody;
  try {
    body = (await request.json()) as NearbyRequestBody;
  } catch {
    return jsonResponse({ error: 'INVALID_JSON' }, 400);
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

  const requestedCategories =
    Array.isArray(body.categories) && body.categories.length > 0
      ? body.categories.filter((c): c is PlaceCategory => c in CATEGORY_META)
      : ALL_CATEGORIES;

  const perCategoryLimit =
    typeof body.maxResultCount === 'number'
      ? Math.min(Math.max(body.maxResultCount, 1), 20)
      : requestedCategories.length === 1
        ? 16
        : 7;

  try {
    const batches = await Promise.all(
      requestedCategories.map((cat) =>
        fetchCategoryNearby(
          apiKey,
          lat,
          lng,
          radiusMeters,
          cat,
          perCategoryLimit
        )
      )
    );

    const seenIds = new Set<string>();
    const places: PlaceSummary[] = [];
    for (const batch of batches) {
      for (const place of batch) {
        if (!seenIds.has(place.id)) {
          seenIds.add(place.id);
          places.push(place);
        }
      }
    }

    return jsonResponse({
      center: { lat, lng },
      radiusMeters,
      places
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to query Places API (New)';
    return jsonResponse({ error: 'UPSTREAM_PLACES_ERROR', message }, 502);
  }
}
