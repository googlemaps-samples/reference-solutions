import type { RequestHandler } from './$types';
import { getServerApiKey, missingKeyResponse } from '$lib/server/gmp';

const ALLOWED_MAP_TYPES = new Set([
  'US_AQI',
  'UAQI_RED_GREEN',
  'UAQI_INDIGO_PERSIAN',
  'PM25_INDIGO_PERSIAN',
  'GBR_DEFRA',
  'DEU_UBA',
  'CAN_EC',
  'FRA_ATMO'
]);

export const GET: RequestHandler = async ({ url, fetch }) => {
  const apiKey = getServerApiKey();
  if (!apiKey) {
    return missingKeyResponse();
  }

  const mapTypeRaw = url.searchParams.get('mapType') || 'US_AQI';
  const mapType = ALLOWED_MAP_TYPES.has(mapTypeRaw) ? mapTypeRaw : 'US_AQI';
  const zoom = Number(url.searchParams.get('zoom'));
  const x = Number(url.searchParams.get('x'));
  const y = Number(url.searchParams.get('y'));

  if (
    !Number.isInteger(zoom) ||
    zoom < 0 ||
    zoom > 16 ||
    !Number.isInteger(x) ||
    !Number.isInteger(y)
  ) {
    return new Response('Invalid tile coordinates or zoom level (0-16).', { status: 400 });
  }

  const maxCoord = 1 << zoom;
  if (x < 0 || x >= maxCoord || y < 0 || y >= maxCoord) {
    return new Response('Tile coordinates out of bounds for zoom level.', { status: 400 });
  }

  const upstreamUrl = `https://airquality.googleapis.com/v1/mapTypes/${mapType}/heatmapTiles/${zoom}/${x}/${y}`;

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey
      }
    });

    if (!upstreamRes.ok) {
      return new Response('Tile unavailable.', { status: upstreamRes.status });
    }

    const buffer = await upstreamRes.arrayBuffer();
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': upstreamRes.headers.get('Content-Type') || 'image/png',
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch {
    return new Response('Unable to fetch Air Quality tile.', { status: 502 });
  }
};
