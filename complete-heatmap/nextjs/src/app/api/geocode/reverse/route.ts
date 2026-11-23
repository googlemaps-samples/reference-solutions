import { NextRequest, NextResponse } from 'next/server';
import {
  getServerMapsApiKey,
  GMP_SOLUTION_ID,
  parseCoordinateParam,
} from '@/lib/server/gmp';

export async function GET(request: NextRequest) {
  const apiKey = getServerMapsApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key is not configured on the server.' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const lat = parseCoordinateParam(searchParams.get('lat'), -90, 90);
  const lng = parseCoordinateParam(searchParams.get('lng'), -180, 180);

  if (lat === null || lng === null) {
    return NextResponse.json(
      { error: 'Valid lat and lng query parameters are required.' },
      { status: 400 }
    );
  }

  const upstreamUrl = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  upstreamUrl.searchParams.set('latlng', `${lat},${lng}`);
  upstreamUrl.searchParams.set('language', 'en');
  upstreamUrl.searchParams.set('key', apiKey);
  upstreamUrl.searchParams.set('solution_id', GMP_SOLUTION_ID);

  try {
    const upstreamResponse = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: {
        'X-Goog-Maps-Solution-ID': GMP_SOLUTION_ID,
      },
      cache: 'no-store',
    });

    const data = await upstreamResponse.json();

    if (!upstreamResponse.ok || (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS')) {
      return NextResponse.json(
        {
          error:
            data.error_message ||
            `Geocoding API returned status ${data.status ?? upstreamResponse.status}`,
        },
        { status: upstreamResponse.ok ? 400 : upstreamResponse.status }
      );
    }

    const first = Array.isArray(data.results) ? data.results[0] : null;
    return NextResponse.json({
      formattedAddress:
        first?.formatted_address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)} (Miami, FL)`,
      placeId: first?.place_id ?? null,
      status: data.status ?? 'OK',
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Failed to contact Geocoding API.',
      },
      { status: 502 }
    );
  }
}
