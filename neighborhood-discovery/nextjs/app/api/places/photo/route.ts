import { NextRequest, NextResponse } from 'next/server';
import {
  SECURITY_HEADERS,
  getServerGoogleMapsApiKey,
  jsonResponse
} from '@/lib/gmp-server';

const SAFE_PHOTO_NAME_REGEX =
  /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;

export async function GET(request: NextRequest) {
  const apiKey = getServerGoogleMapsApiKey();
  if (!apiKey) {
    return jsonResponse({ error: 'MISSING_API_KEY' }, 503);
  }

  const name = request.nextUrl.searchParams.get('name')?.trim() ?? '';
  if (!SAFE_PHOTO_NAME_REGEX.test(name)) {
    return jsonResponse({ error: 'INVALID_PHOTO_NAME' }, 400);
  }

  const rawWidth = Number(request.nextUrl.searchParams.get('maxWidthPx') ?? '640');
  const maxWidthPx = Number.isFinite(rawWidth)
    ? Math.min(Math.max(Math.round(rawWidth), 120), 1200)
    : 640;

  try {
    const metaUrl = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${maxWidthPx}&skipHttpRedirect=true`;
    const metaRes = await fetch(metaUrl, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey
      }
    });

    if (!metaRes.ok) {
      return jsonResponse({ error: 'PHOTO_UNAVAILABLE' }, 502);
    }

    const metaData = (await metaRes.json()) as { photoUri?: string };
    if (!metaData.photoUri || !metaData.photoUri.startsWith('https://')) {
      return jsonResponse({ error: 'PHOTO_URI_INVALID' }, 502);
    }

    const imgRes = await fetch(metaData.photoUri);
    if (!imgRes.ok) {
      return jsonResponse({ error: 'PHOTO_FETCH_FAILED' }, 502);
    }

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const buffer = await imgRes.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        ...SECURITY_HEADERS,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch {
    return jsonResponse({ error: 'PHOTO_PROXY_ERROR' }, 502);
  }
}
