import { NextRequest } from 'next/server';
import {
  PLACE_DETAIL_FIELD_MASK,
  RawGooglePlace,
  getServerGoogleMapsApiKey,
  jsonResponse,
  normalizeGooglePlaceDetail
} from '@/lib/gmp-server';

const SAFE_PLACE_ID_REGEX = /^[A-Za-z0-9_-]{8,128}$/;

export async function GET(request: NextRequest) {
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

  const placeId = request.nextUrl.searchParams.get('placeId')?.trim() ?? '';
  if (!SAFE_PLACE_ID_REGEX.test(placeId)) {
    return jsonResponse(
      { error: 'INVALID_PLACE_ID', message: 'Valid placeId query param is required.' },
      400
    );
  }

  try {
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=en&regionCode=GB`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': PLACE_DETAIL_FIELD_MASK
      }
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Upstream error');
      return jsonResponse(
        {
          error: 'UPSTREAM_PLACES_ERROR',
          message: `Place Details (${response.status}): ${errorText}`
        },
        502
      );
    }

    const raw = (await response.json()) as RawGooglePlace;
    const place = normalizeGooglePlaceDetail(raw);
    if (!place) {
      return jsonResponse(
        { error: 'NOT_FOUND', message: 'Place details could not be normalized.' },
        404
      );
    }

    return jsonResponse({ place });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to fetch Place Details';
    return jsonResponse({ error: 'UPSTREAM_PLACES_ERROR', message }, 502);
  }
}
