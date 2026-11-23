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

  const upstreamUrl = new URL('https://maps.googleapis.com/maps/api/elevation/json');
  upstreamUrl.searchParams.set('locations', `${lat},${lng}`);
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

    if (!upstreamResponse.ok || (data.status && data.status !== 'OK')) {
      return NextResponse.json(
        {
          error:
            data.error_message ||
            `Elevation API returned status ${data.status ?? upstreamResponse.status}`,
        },
        { status: upstreamResponse.ok ? 403 : upstreamResponse.status }
      );
    }

    const first = Array.isArray(data.results) ? data.results[0] : null;
    return NextResponse.json({
      elevationMeters:
        typeof first?.elevation === 'number' ? Number(first.elevation.toFixed(2)) : null,
      resolutionMeters:
        typeof first?.resolution === 'number' ? Number(first.resolution.toFixed(2)) : null,
      status: data.status ?? 'OK',
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Failed to contact Elevation API.',
      },
      { status: 502 }
    );
  }
}
