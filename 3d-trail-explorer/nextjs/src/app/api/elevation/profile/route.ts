import { NextRequest, NextResponse } from 'next/server';

const ELEVATION_API_URL =
  'https://maps.googleapis.com/maps/api/elevation/json';

interface LatLngPoint {
  lat: number;
  lng: number;
}

interface ElevationRequestBody {
  path?: LatLngPoint[];
  samples?: number;
  locations?: LatLngPoint[];
}

export async function POST(request: NextRequest) {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    return NextResponse.json(
      {
        error:
          'Google Maps API key is not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local.',
        results: [],
      },
      { status: 503 }
    );
  }

  let body: ElevationRequestBody;
  try {
    body = (await request.json()) as ElevationRequestBody;
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON request body.' },
      { status: 400 }
    );
  }

  const params = new URLSearchParams({ key: apiKey });

  if (Array.isArray(body.path) && body.path.length >= 2) {
    const pathString = body.path
      .map((pt) => `${Number(pt.lat)},${Number(pt.lng)}`)
      .join('|');
    const samples = Math.min(Math.max(Number(body.samples ?? 48), 2), 512);
    params.set('path', pathString);
    params.set('samples', String(samples));
  } else if (Array.isArray(body.locations) && body.locations.length >= 1) {
    const locString = body.locations
      .map((pt) => `${Number(pt.lat)},${Number(pt.lng)}`)
      .join('|');
    params.set('locations', locString);
  } else {
    return NextResponse.json(
      {
        error:
          'Provide either a path array (>= 2 points) or locations array (>= 1 point).',
      },
      { status: 400 }
    );
  }

  try {
    const upstreamResponse = await fetch(
      `${ELEVATION_API_URL}?${params.toString()}`,
      {
        method: 'GET',
        cache: 'no-store',
      }
    );

    const data = await upstreamResponse.json();
    if (!upstreamResponse.ok || (data.status && data.status !== 'OK')) {
      return NextResponse.json(
        {
          error:
            data?.error_message ||
            `Elevation API returned status: ${data?.status ?? upstreamResponse.status}`,
          results: [],
        },
        { status: upstreamResponse.ok ? 400 : upstreamResponse.status }
      );
    }

    return NextResponse.json(
      {
        status: data.status,
        results: data.results ?? [],
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unexpected error calling Elevation API.',
        results: [],
      },
      { status: 502 }
    );
  }
}
