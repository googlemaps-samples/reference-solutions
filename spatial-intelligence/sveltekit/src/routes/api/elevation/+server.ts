import { json } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import type { RequestHandler } from './$types';
import type {
  ElevationApiResponse,
  ElevationSamplePoint,
  ElevationSummary
} from '$lib/types/gis';

function resolveApiKey(): string {
  const key = (
    privateEnv.GOOGLE_MAPS_API_KEY ||
    publicEnv.PUBLIC_GOOGLE_MAPS_API_KEY ||
    ''
  ).trim();
  if (!key || key === 'your_google_maps_api_key_here') {
    return '';
  }
  return key;
}

interface RawElevationResult {
  elevation?: number;
  location?: { lat?: number; lng?: number };
  resolution?: number;
}

export const POST: RequestHandler = async ({ request }) => {
  let body: {
    locations?: Array<{ lat?: unknown; lng?: unknown }>;
  };

  try {
    body = await request.json();
  } catch {
    return json(
      {
        ok: false,
        status: 'INVALID_REQUEST',
        results: [],
        summary: null,
        error: 'Request body must be valid JSON.'
      } satisfies ElevationApiResponse,
      { status: 400 }
    );
  }

  const rawLocations = Array.isArray(body.locations) ? body.locations : [];
  const validLocations = rawLocations
    .filter(
      (loc): loc is { lat: number; lng: number } =>
        typeof loc?.lat === 'number' &&
        Number.isFinite(loc.lat) &&
        loc.lat >= -90 &&
        loc.lat <= 90 &&
        typeof loc?.lng === 'number' &&
        Number.isFinite(loc.lng) &&
        loc.lng >= -180 &&
        loc.lng <= 180
    )
    .slice(0, 64);

  if (validLocations.length === 0) {
    return json(
      {
        ok: false,
        status: 'INVALID_REQUEST',
        results: [],
        summary: null,
        error: 'Provide at least one valid { lat, lng } coordinate in locations.'
      } satisfies ElevationApiResponse,
      { status: 400 }
    );
  }

  const apiKey = resolveApiKey();
  if (!apiKey) {
    return json({
      ok: false,
      status: 'API_KEY_NOT_CONFIGURED',
      results: [],
      summary: null,
      error:
        'PUBLIC_GOOGLE_MAPS_API_KEY is not configured. Add an API key to .env to query live Elevation API terrain metrics.'
    } satisfies ElevationApiResponse);
  }

  const locationsParam = validLocations
    .map((loc) => `${loc.lat.toFixed(6)},${loc.lng.toFixed(6)}`)
    .join('|');

  const url = new URL('https://maps.googleapis.com/maps/api/elevation/json');
  url.searchParams.set('locations', locationsParam);
  url.searchParams.set('key', apiKey);

  try {
    const upstreamResponse = await fetch(url.toString(), { method: 'GET' });
    if (!upstreamResponse.ok) {
      return json({
        ok: false,
        status: `UPSTREAM_${upstreamResponse.status}`,
        results: [],
        summary: null,
        error: `Elevation API returned HTTP ${upstreamResponse.status}.`
      } satisfies ElevationApiResponse);
    }

    const payload = (await upstreamResponse.json()) as {
      status?: string;
      results?: RawElevationResult[];
      error_message?: string;
    };

    const status = payload.status ?? 'UNKNOWN_ERROR';
    if (status !== 'OK' || !Array.isArray(payload.results)) {
      return json({
        ok: false,
        status,
        results: [],
        summary: null,
        error: payload.error_message || `Elevation API status: ${status}`
      } satisfies ElevationApiResponse);
    }

    const results: ElevationSamplePoint[] = payload.results
      .filter(
        (r) =>
          typeof r.elevation === 'number' &&
          typeof r.location?.lat === 'number' &&
          typeof r.location?.lng === 'number'
      )
      .map((r) => ({
        elevation: r.elevation as number,
        location: {
          lat: r.location!.lat as number,
          lng: r.location!.lng as number
        },
        resolution: typeof r.resolution === 'number' ? r.resolution : 0
      }));

    if (results.length === 0) {
      return json({
        ok: false,
        status: 'ZERO_RESULTS',
        results: [],
        summary: null,
        error: 'No elevation samples returned for the selected coordinates.'
      } satisfies ElevationApiResponse);
    }

    const elevations = results.map((r) => r.elevation);
    const resolutions = results.map((r) => r.resolution).filter((v) => v > 0);

    const summary: ElevationSummary = {
      minElevation: Number(Math.min(...elevations).toFixed(2)),
      maxElevation: Number(Math.max(...elevations).toFixed(2)),
      meanElevation: Number(
        (elevations.reduce((acc, v) => acc + v, 0) / elevations.length).toFixed(2)
      ),
      meanResolution:
        resolutions.length > 0
          ? Number(
              (
                resolutions.reduce((acc, v) => acc + v, 0) / resolutions.length
              ).toFixed(2)
            )
          : 0,
      sampleCount: results.length
    };

    return json({
      ok: true,
      status: 'OK',
      results,
      summary
    } satisfies ElevationApiResponse);
  } catch (err) {
    return json({
      ok: false,
      status: 'FETCH_ERROR',
      results: [],
      summary: null,
      error:
        err instanceof Error ? err.message : 'Failed to query Elevation API.'
    } satisfies ElevationApiResponse);
  }
};
