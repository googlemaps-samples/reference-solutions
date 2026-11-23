import { NextRequest, NextResponse } from 'next/server';

const ELEVATION_API_URL = 'https://maps.googleapis.com/maps/api/elevation/json';

export interface ElevationSampleResult {
  elevation: number;
  location: {
    lat: number;
    lng: number;
  };
  resolution: number;
}

export async function POST(request: NextRequest) {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    return NextResponse.json(
      {
        error: 'Google Maps API key is not configured on the server.',
        status: 'CONFIG_ERROR',
        results: [],
      },
      { status: 503 }
    );
  }

  let body: { locations?: unknown } = {};
  try {
    body = (await request.json()) as { locations?: unknown };
  } catch {
    return NextResponse.json(
      {
        error: 'Invalid JSON request body.',
        status: 'INVALID_REQUEST',
        results: [],
      },
      { status: 400 }
    );
  }

  if (!Array.isArray(body.locations) || body.locations.length === 0) {
    return NextResponse.json(
      {
        error: 'locations must be a non-empty array of { lat, lng } objects.',
        status: 'INVALID_REQUEST',
        results: [],
      },
      { status: 400 }
    );
  }

  const sanitizedLocations = body.locations
    .slice(0, 64)
    .filter(
      (item): item is { lat: number; lng: number } =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as { lat?: unknown }).lat === 'number' &&
        typeof (item as { lng?: unknown }).lng === 'number' &&
        Number.isFinite((item as { lat: number }).lat) &&
        Number.isFinite((item as { lng: number }).lng) &&
        (item as { lat: number }).lat >= -90 &&
        (item as { lat: number }).lat <= 90 &&
        (item as { lng: number }).lng >= -180 &&
        (item as { lng: number }).lng <= 180
    );

  if (sanitizedLocations.length === 0) {
    return NextResponse.json(
      {
        error: 'No valid coordinate pairs provided.',
        status: 'INVALID_REQUEST',
        results: [],
      },
      { status: 400 }
    );
  }

  const locationsParam = sanitizedLocations
    .map((pt) => `${pt.lat.toFixed(6)},${pt.lng.toFixed(6)}`)
    .join('|');

  const url = new URL(ELEVATION_API_URL);
  url.searchParams.set('locations', locationsParam);
  url.searchParams.set('key', apiKey);

  try {
    const upstreamResponse = await fetch(url.toString(), {
      method: 'GET',
      cache: 'no-store',
    });

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        {
          error: `Elevation API returned HTTP ${upstreamResponse.status}`,
          status: 'UPSTREAM_ERROR',
          results: [],
        },
        { status: upstreamResponse.status }
      );
    }

    const payload = (await upstreamResponse.json()) as {
      status?: string;
      error_message?: string;
      results?: Array<{
        elevation?: number;
        location?: { lat?: number; lng?: number };
        resolution?: number;
      }>;
    };

    const results: ElevationSampleResult[] = (payload.results ?? [])
      .filter(
        (r) =>
          typeof r.elevation === 'number' &&
          typeof r.location?.lat === 'number' &&
          typeof r.location?.lng === 'number'
      )
      .map((r) => ({
        elevation: r.elevation!,
        location: {
          lat: r.location!.lat!,
          lng: r.location!.lng!,
        },
        resolution: typeof r.resolution === 'number' ? r.resolution : 0,
      }));

    return NextResponse.json({
      status: payload.status ?? 'UNKNOWN_ERROR',
      errorMessage: payload.error_message,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to reach Elevation API',
        status: 'NETWORK_ERROR',
        results: [],
      },
      { status: 502 }
    );
  }
}
