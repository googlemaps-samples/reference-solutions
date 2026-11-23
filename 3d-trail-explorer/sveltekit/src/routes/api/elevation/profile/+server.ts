import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolveServerApiKey } from '$lib/server/gmpKey';

interface LatLng {
  lat: number;
  lng: number;
}

function serializeCoords(points: LatLng[]): string {
  return points.map((pt) => `${pt.lat.toFixed(6)},${pt.lng.toFixed(6)}`).join('|');
}

function isValidCoord(pt: unknown): pt is LatLng {
  if (!pt || typeof pt !== 'object') return false;
  const candidate = pt as Record<string, unknown>;
  return (
    typeof candidate.lat === 'number' &&
    Number.isFinite(candidate.lat) &&
    candidate.lat >= -90 &&
    candidate.lat <= 90 &&
    typeof candidate.lng === 'number' &&
    Number.isFinite(candidate.lng) &&
    candidate.lng >= -180 &&
    candidate.lng <= 180
  );
}

export const POST: RequestHandler = async ({ request, fetch }) => {
  const apiKey = resolveServerApiKey();
  if (!apiKey) {
    return json(
      { error: 'PUBLIC_GOOGLE_MAPS_API_KEY is not configured on the server.', results: [] },
      { status: 503 }
    );
  }

  let body: { path?: LatLng[]; samples?: number; locations?: LatLng[] };
  try {
    body = (await request.json()) as {
      path?: LatLng[];
      samples?: number;
      locations?: LatLng[];
    };
  } catch {
    return json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const params = new URLSearchParams();

  if (Array.isArray(body.path) && body.path.length >= 2) {
    const validPath = body.path.filter(isValidCoord);
    if (validPath.length < 2) {
      return json({ error: 'Valid path with at least 2 coordinates is required.' }, { status: 400 });
    }
    const sampleCount = Math.min(512, Math.max(2, Math.round(Number(body.samples ?? 48))));
    params.set('path', serializeCoords(validPath));
    params.set('samples', String(sampleCount));
  } else if (Array.isArray(body.locations) && body.locations.length >= 1) {
    const validLocations = body.locations.filter(isValidCoord).slice(0, 512);
    if (validLocations.length === 0) {
      return json({ error: 'Valid locations array is required.' }, { status: 400 });
    }
    params.set('locations', serializeCoords(validLocations));
  } else {
    return json({ error: 'Provide either path (2+ points) or locations (1+ points).' }, { status: 400 });
  }

  params.set('key', apiKey);

  const upstreamRes = await fetch(
    `https://maps.googleapis.com/maps/api/elevation/json?${params.toString()}`
  );

  if (!upstreamRes.ok) {
    const errText = await upstreamRes.text();
    return json(
      { error: 'Elevation API request failed.', detail: errText, results: [] },
      { status: upstreamRes.status }
    );
  }

  const data = (await upstreamRes.json()) as {
    status: string;
    error_message?: string;
    results?: Array<{
      elevation: number;
      location: { lat: number; lng: number };
      resolution: number;
    }>;
  };

  if (data.status !== 'OK') {
    return json(
      {
        error: data.error_message || `Elevation API returned status ${data.status}`,
        status: data.status,
        results: []
      },
      { status: 502 }
    );
  }

  return json({
    status: data.status,
    results: data.results ?? []
  });
};
