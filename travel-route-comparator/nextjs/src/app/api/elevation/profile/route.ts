import { NextRequest, NextResponse } from 'next/server';
import { getServerMapsApiKey } from '@/lib/gmp-server';
import {
  buildElevationSummary,
  decodePolyline,
  downsamplePath,
  encodePolyline,
  type RawElevationResult,
} from '@/lib/polyline';

const ELEVATION_API_URL = 'https://maps.googleapis.com/maps/api/elevation/json';

interface ElevationProfileBody {
  encodedPolyline?: string;
  samples?: number;
}

interface UpstreamElevationResponse {
  status: string;
  error_message?: string;
  results?: Array<{
    elevation: number;
    location: { lat: number; lng: number };
    resolution?: number;
  }>;
}

export async function POST(req: NextRequest) {
  const apiKey = getServerMapsApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'Google Maps API key is not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local.',
      },
      { status: 503 }
    );
  }

  let body: ElevationProfileBody;
  try {
    body = (await req.json()) as ElevationProfileBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const encodedPolyline = body.encodedPolyline?.trim();
  const samples = Math.min(Math.max(Number(body.samples || 64), 8), 128);

  if (!encodedPolyline) {
    return NextResponse.json(
      { error: 'encodedPolyline is required.' },
      { status: 400 }
    );
  }

  try {
    // Decode and downsample to <= 180 points so we never exceed Elevation API's 512-point limit
    const decoded = decodePolyline(encodedPolyline);
    if (decoded.length < 2) {
      return NextResponse.json(
        { error: 'Polyline must contain at least 2 points.' },
        { status: 400 }
      );
    }

    const safePath = downsamplePath(decoded, 180);
    const safeEncoded = encodePolyline(safePath);

    const url = new URL(ELEVATION_API_URL);
    url.searchParams.set('path', `enc:${safeEncoded}`);
    url.searchParams.set('samples', String(samples));
    url.searchParams.set('key', apiKey);

    const upstreamRes = await fetch(url.toString(), {
      method: 'GET',
      cache: 'no-store',
    });

    const data = (await upstreamRes.json()) as UpstreamElevationResponse;

    if (!upstreamRes.ok || data.status !== 'OK' || !data.results?.length) {
      return NextResponse.json(
        {
          error:
            data.error_message ||
            `Elevation API returned status: ${data.status || upstreamRes.status}`,
          status: data.status || 'ERROR',
        },
        { status: upstreamRes.ok ? 502 : upstreamRes.status }
      );
    }

    const rawResults: RawElevationResult[] = data.results.map((r) => ({
      elevation: r.elevation,
      location: r.location,
      resolution: r.resolution,
    }));

    const summary = buildElevationSummary(rawResults, 'bff');
    return NextResponse.json(summary);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
