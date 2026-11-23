import { NextRequest } from 'next/server';
import {
  extractGeocodeResult,
  getServerGoogleMapsApiKey,
  jsonResponse
} from '@/lib/gmp-server';
import { GeocodeAddressComponent } from '@/lib/types';

interface RawGeocodeApiResponse {
  status?: string;
  error_message?: string;
  results?: Array<{
    formatted_address?: string;
    place_id?: string;
    geometry?: { location?: { lat?: number; lng?: number } };
    address_components?: GeocodeAddressComponent[];
    plus_code?: { compound_code?: string; global_code?: string };
  }>;
}

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

  const address = request.nextUrl.searchParams.get('address')?.trim();
  const latParam = request.nextUrl.searchParams.get('lat');
  const lngParam = request.nextUrl.searchParams.get('lng');

  const upstreamParams = new URLSearchParams({
    key: apiKey,
    language: 'en'
  });

  if (address) {
    upstreamParams.set('address', address);
    upstreamParams.set('region', 'gb');
  } else if (latParam !== null && lngParam !== null) {
    const lat = Number(latParam);
    const lng = Number(lngParam);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return jsonResponse(
        { error: 'INVALID_COORDINATES', message: 'Valid lat and lng are required.' },
        400
      );
    }
    upstreamParams.set('latlng', `${lat},${lng}`);
  } else {
    return jsonResponse(
      {
        error: 'MISSING_PARAMETERS',
        message: 'Provide either ?address=... or ?lat=...&lng=...'
      },
      400
    );
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${upstreamParams.toString()}`
    );

    if (!response.ok) {
      return jsonResponse(
        {
          error: 'UPSTREAM_GEOCODE_ERROR',
          message: `Geocoding API HTTP ${response.status}`
        },
        502
      );
    }

    const data = (await response.json()) as RawGeocodeApiResponse;
    if (data.status === 'ZERO_RESULTS') {
      return jsonResponse({ result: null, results: [], status: 'ZERO_RESULTS' });
    }
    if (data.status !== 'OK') {
      return jsonResponse(
        {
          error: 'GEOCODE_FAILED',
          status: data.status,
          message: data.error_message ?? 'Geocoding failed'
        },
        502
      );
    }

    const normalized = (data.results ?? [])
      .map(extractGeocodeResult)
      .filter((r): r is NonNullable<typeof r> => r !== null);

    return jsonResponse({
      status: 'OK',
      result: normalized[0] ?? null,
      results: normalized
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to call Geocoding API';
    return jsonResponse({ error: 'UPSTREAM_GEOCODE_ERROR', message }, 502);
  }
}
