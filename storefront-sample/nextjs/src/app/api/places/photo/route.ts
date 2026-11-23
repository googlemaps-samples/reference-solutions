import { NextRequest, NextResponse } from 'next/server';

const PHOTO_NAME_PATTERN = /^places\/[A-Za-z0-9_.:-]+\/photos\/[A-Za-z0-9_.:-]+$/;

export async function GET(request: NextRequest) {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key is not configured on the server.' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name')?.trim() ?? '';
  const rawMaxWidth = Number(searchParams.get('maxWidthPx') ?? '640');
  const maxWidthPx = Number.isFinite(rawMaxWidth)
    ? Math.min(1600, Math.max(120, Math.round(rawMaxWidth)))
    : 640;

  if (!PHOTO_NAME_PATTERN.test(name) || name.includes('..')) {
    return NextResponse.json(
      { error: 'Invalid Places photo resource name.' },
      { status: 400 }
    );
  }

  try {
    const referer = request.headers.get('referer') || request.headers.get('origin');
    const upstreamHeaders: Record<string, string> = {
      'X-Goog-Api-Key': apiKey,
    };
    if (referer) {
      upstreamHeaders.Referer = referer;
    }

    const mediaUrl = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${maxWidthPx}`;
    const upstream = await fetch(mediaUrl, {
      method: 'GET',
      headers: upstreamHeaders,
      redirect: 'follow',
      cache: 'no-store',
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: 'Unable to retrieve clinic photo from Places API (New).' },
        { status: upstream.status || 502 }
      );
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to proxy clinic photo media.' },
      { status: 502 }
    );
  }
}
