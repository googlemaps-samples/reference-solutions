import { NextRequest, NextResponse } from 'next/server';
import { getServerGoogleMapsApiKey } from '@/lib/gmp-server';

export async function GET(request: NextRequest) {
  const apiKey = getServerGoogleMapsApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key is not configured on the server.' },
      { status: 503 }
    );
  }

  const latParam = request.nextUrl.searchParams.get('lat');
  const lngParam = request.nextUrl.searchParams.get('lng');
  const lat = Number(latParam);
  const lng = Number(lngParam);

  if (!latParam || !lngParam || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: 'Valid numeric lat and lng query parameters are required.' },
      { status: 400 }
    );
  }

  const timestampParam = request.nextUrl.searchParams.get('timestamp');
  const timestamp =
    timestampParam && Number.isFinite(Number(timestampParam))
      ? Math.floor(Number(timestampParam))
      : Math.floor(Date.now() / 1000);
  const language = request.nextUrl.searchParams.get('language') || 'en';

  const upstreamUrl = new URL('https://maps.googleapis.com/maps/api/timezone/json');
  upstreamUrl.searchParams.set('location', `${lat},${lng}`);
  upstreamUrl.searchParams.set('timestamp', String(timestamp));
  upstreamUrl.searchParams.set('language', language);
  upstreamUrl.searchParams.set('key', apiKey);

  try {
    const upstream = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      cache: 'no-store',
    });

    const data = (await upstream.json()) as {
      status?: string;
      timeZoneId?: string;
      timeZoneName?: string;
      rawOffset?: number;
      dstOffset?: number;
      errorMessage?: string;
    };

    if (!upstream.ok || data.status !== 'OK') {
      return NextResponse.json(
        {
          available: false,
          error:
            data.errorMessage ||
            `Time Zone API returned status: ${data.status || upstream.status}`,
          status: data.status,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      available: true,
      timeZoneId: data.timeZoneId || 'UTC',
      timeZoneName: data.timeZoneName || 'Coordinated Universal Time',
      rawOffset: typeof data.rawOffset === 'number' ? data.rawOffset : 0,
      dstOffset: typeof data.dstOffset === 'number' ? data.dstOffset : 0,
      source: 'timezone-api',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Time Zone error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
