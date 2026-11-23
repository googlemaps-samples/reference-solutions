import { NextRequest, NextResponse } from 'next/server';
import { getServerGmpApiKey, missingKeyResponse } from '@/lib/gmp-server';

const ALLOWED_MAP_TYPES = new Set([
  'US_AQI',
  'UAQI_RED_GREEN',
  'UAQI_INDIGO_PERSIAN',
  'PM25_INDIGO_PERSIAN',
]);

// 1x1 transparent PNG returned when an upstream tile has no data (e.g. ocean/edge)
// so Google Maps ImageMapType avoids console 404 noise.
const TRANSPARENT_1X1_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

export async function GET(request: NextRequest) {
  const apiKey = getServerGmpApiKey();
  if (!apiKey) {
    return missingKeyResponse();
  }

  const { searchParams } = new URL(request.url);
  const mapTypeRaw = searchParams.get('mapType') ?? 'US_AQI';
  const mapType = ALLOWED_MAP_TYPES.has(mapTypeRaw) ? mapTypeRaw : 'US_AQI';

  const zoom = Number(searchParams.get('zoom'));
  const x = Number(searchParams.get('x'));
  const y = Number(searchParams.get('y'));

  if (
    !Number.isInteger(zoom) ||
    zoom < 0 ||
    zoom > 16 ||
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    y < 0
  ) {
    return NextResponse.json({ error: 'Invalid tile coordinates.' }, { status: 400 });
  }

  const upstreamUrl = `https://airquality.googleapis.com/v1/mapTypes/${encodeURIComponent(
    mapType
  )}/heatmapTiles/${zoom}/${x}/${y}`;

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
      },
      cache: 'no-store',
    });

    if (upstreamRes.status === 404) {
      return new NextResponse(TRANSPARENT_1X1_PNG, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    if (!upstreamRes.ok) {
      return new NextResponse(TRANSPARENT_1X1_PNG, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-store',
        },
      });
    }

    const arrayBuffer = await upstreamRes.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': upstreamRes.headers.get('Content-Type') ?? 'image/png',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    console.error('Air Quality tile proxy error:', err);
    return new NextResponse(TRANSPARENT_1X1_PNG, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
      },
    });
  }
}
