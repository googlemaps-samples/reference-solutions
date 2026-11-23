import { NextRequest, NextResponse } from 'next/server';
import { getServerGoogleMapsApiKey } from '@/lib/gmp-server';

const PHOTO_NAME_PATTERN = /^places\/[A-Za-z0-9_.-]+\/photos\/[A-Za-z0-9_.+=-]+$/;

export async function GET(request: NextRequest) {
  const apiKey = getServerGoogleMapsApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key is not configured on the server.' },
      { status: 503 }
    );
  }

  const name = request.nextUrl.searchParams.get('name')?.trim() || '';
  if (!PHOTO_NAME_PATTERN.test(name)) {
    return NextResponse.json(
      { error: 'Valid Places photo resource name is required.' },
      { status: 400 }
    );
  }

  const rawWidth = Number(request.nextUrl.searchParams.get('maxWidthPx') || '640');
  const maxWidthPx = Math.min(Math.max(Number.isFinite(rawWidth) ? rawWidth : 640, 100), 1600);
  const mode = request.nextUrl.searchParams.get('mode');

  const upstreamUrl = new URL(`https://places.googleapis.com/v1/${name}/media`);
  upstreamUrl.searchParams.set('maxWidthPx', String(maxWidthPx));
  upstreamUrl.searchParams.set('key', apiKey);
  if (mode === 'json') {
    upstreamUrl.searchParams.set('skipHttpRedirect', 'true');
  }

  try {
    const upstream = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store',
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch place photo media.' },
        { status: upstream.status }
      );
    }

    if (mode === 'json') {
      const json = (await upstream.json()) as { name?: string; photoUri?: string };
      return NextResponse.json(json);
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const bytes = await upstream.arrayBuffer();

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected photo proxy error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
