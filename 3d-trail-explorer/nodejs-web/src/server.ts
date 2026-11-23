import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import path from 'path';

// Load environment variables from .env in project root without overwriting existing env vars
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

interface LatLngPoint {
  lat: number;
  lng: number;
}

interface PlacesSearchBody {
  textQuery?: unknown;
  locationBias?: {
    lat?: unknown;
    lng?: unknown;
    radiusMeters?: unknown;
  };
}

interface PlacesAutocompleteBody {
  input?: unknown;
  sessionToken?: unknown;
}

interface ElevationProfileBody {
  path?: unknown;
  locations?: unknown;
  samples?: unknown;
}

interface ElevationApiResult {
  elevation: number;
  location: { lat: number; lng: number };
  resolution?: number;
}

interface ElevationApiResponse {
  results?: ElevationApiResult[];
  status?: string;
  error_message?: string;
}

const DEFAULT_CENTER: LatLngPoint = { lat: 38.9542, lng: -120.1103 };
const ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';
const PLACES_SEARCH_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.googleMapsUri';
const PLACES_AUTOCOMPLETE_FIELD_MASK =
  'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat';

function getGoogleMapsApiKey(): string {
  const raw = process.env.GOOGLE_MAPS_API_KEY;
  if (!raw) {
    return '';
  }
  const trimmed = raw.trim();
  if (trimmed === 'your_google_maps_api_key_here') {
    return '';
  }
  return trimmed;
}

function parseCliArgs(argv: string[]): { host: string; port: number } {
  let host = '127.0.0.1';
  let port = Number(process.env.PORT) || 3000;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--host' && i + 1 < argv.length) {
      host = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--host=')) {
      host = arg.slice('--host='.length);
    } else if (arg === '--port' && i + 1 < argv.length) {
      const parsed = Number(argv[i + 1]);
      if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) {
        port = parsed;
      }
      i += 1;
    } else if (arg.startsWith('--port=')) {
      const parsed = Number(arg.slice('--port='.length));
      if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) {
        port = parsed;
      }
    }
  }

  // Strictly bind to loopback address 127.0.0.1 (never 0.0.0.0)
  const safeHost = host === 'localhost' || host === '127.0.0.1' ? '127.0.0.1' : '127.0.0.1';
  return { host: safeHost, port };
}

function isValidLatLng(value: unknown): value is LatLngPoint {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  const lat = candidate.lat;
  const lng = candidate.lng;
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function haversineDistanceKm(a: LatLngPoint, b: LatLngPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(h)));
}

function computeTrailMetrics(results: ElevationApiResult[]) {
  if (results.length === 0) {
    return {
      minElevationMeters: 0,
      maxElevationMeters: 0,
      totalAscentMeters: 0,
      totalDescentMeters: 0,
      totalDistanceKm: 0,
      cumulativeDistancesKm: [] as number[],
    };
  }

  let minElevation = results[0].elevation;
  let maxElevation = results[0].elevation;
  let totalAscent = 0;
  let totalDescent = 0;
  let totalDistance = 0;
  const cumulativeDistancesKm: number[] = [0];

  for (let i = 0; i < results.length; i += 1) {
    const current = results[i];
    if (current.elevation < minElevation) minElevation = current.elevation;
    if (current.elevation > maxElevation) maxElevation = current.elevation;

    if (i > 0) {
      const prev = results[i - 1];
      const deltaElev = current.elevation - prev.elevation;
      if (deltaElev > 0) {
        totalAscent += deltaElev;
      } else {
        totalDescent += Math.abs(deltaElev);
      }
      totalDistance += haversineDistanceKm(prev.location, current.location);
      cumulativeDistancesKm.push(Number(totalDistance.toFixed(3)));
    }
  }

  return {
    minElevationMeters: Number(minElevation.toFixed(1)),
    maxElevationMeters: Number(maxElevation.toFixed(1)),
    totalAscentMeters: Math.round(totalAscent),
    totalDescentMeters: Math.round(totalDescent),
    totalDistanceKm: Number(totalDistance.toFixed(2)),
    cumulativeDistancesKm,
  };
}

export function createApp(): express.Application {
  const app = express();
  const publicDir = path.resolve(__dirname, '..', 'public');

  // Security headers on all responses
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '512kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    const apiKey = getGoogleMapsApiKey();
    res.json({
      status: 'ok',
      hasApiKey: Boolean(apiKey),
      attributionId: ATTRIBUTION_ID,
    });
  });

  app.get('/api/config', (_req: Request, res: Response) => {
    const apiKey = getGoogleMapsApiKey();
    res.json({
      apiKey,
      hasApiKey: Boolean(apiKey),
      defaultCenter: DEFAULT_CENTER,
      attributionId: ATTRIBUTION_ID,
      seedSearchQuery: 'Emerald Bay State Park, Lake Tahoe',
    });
  });

  // BFF Proxy: Places API (New) Text Search
  app.post('/api/places/search', async (req: Request, res: Response) => {
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) {
      res.status(503).json({
        error: 'GOOGLE_MAPS_API_KEY is not configured on the server.',
        code: 'API_KEY_MISSING',
      });
      return;
    }

    const body = req.body as PlacesSearchBody;
    if (!body || typeof body.textQuery !== 'string' || body.textQuery.trim().length === 0) {
      res.status(400).json({
        error: 'Request body must include a non-empty string "textQuery".',
        code: 'INVALID_REQUEST',
      });
      return;
    }

    const textQuery = body.textQuery.trim().slice(0, 200);
    const biasLat =
      body.locationBias && typeof body.locationBias.lat === 'number' && Number.isFinite(body.locationBias.lat)
        ? body.locationBias.lat
        : DEFAULT_CENTER.lat;
    const biasLng =
      body.locationBias && typeof body.locationBias.lng === 'number' && Number.isFinite(body.locationBias.lng)
        ? body.locationBias.lng
        : DEFAULT_CENTER.lng;
    const biasRadius =
      body.locationBias &&
      typeof body.locationBias.radiusMeters === 'number' &&
      Number.isFinite(body.locationBias.radiusMeters)
        ? Math.min(50000, Math.max(500, body.locationBias.radiusMeters))
        : 35000;

    try {
      const upstreamResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': PLACES_SEARCH_FIELD_MASK,
        },
        body: JSON.stringify({
          textQuery,
          pageSize: 5,
          locationBias: {
            circle: {
              center: {
                latitude: biasLat,
                longitude: biasLng,
              },
              radius: biasRadius,
            },
          },
        }),
        signal: AbortSignal.timeout(10000),
      });

      const payload = (await upstreamResponse.json()) as Record<string, unknown>;
      if (!upstreamResponse.ok) {
        res.status(upstreamResponse.status).json({
          error: 'Upstream Places Text Search request failed.',
          details: payload,
        });
        return;
      }

      res.json(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(502).json({
        error: `Failed to reach Places API (New): ${message}`,
        code: 'UPSTREAM_ERROR',
      });
    }
  });

  // BFF Proxy: Places API (New) Autocomplete
  app.post('/api/places/autocomplete', async (req: Request, res: Response) => {
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) {
      res.status(503).json({
        error: 'GOOGLE_MAPS_API_KEY is not configured on the server.',
        code: 'API_KEY_MISSING',
      });
      return;
    }

    const body = req.body as PlacesAutocompleteBody;
    if (!body || typeof body.input !== 'string' || body.input.trim().length === 0) {
      res.status(400).json({
        error: 'Request body must include a non-empty string "input".',
        code: 'INVALID_REQUEST',
      });
      return;
    }

    const input = body.input.trim().slice(0, 160);
    const requestPayload: Record<string, unknown> = {
      input,
      locationBias: {
        circle: {
          center: {
            latitude: DEFAULT_CENTER.lat,
            longitude: DEFAULT_CENTER.lng,
          },
          radius: 45000,
        },
      },
    };

    if (typeof body.sessionToken === 'string' && body.sessionToken.trim().length > 0) {
      requestPayload.sessionToken = body.sessionToken.trim().slice(0, 128);
    }

    try {
      const upstreamResponse = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': PLACES_AUTOCOMPLETE_FIELD_MASK,
        },
        body: JSON.stringify(requestPayload),
        signal: AbortSignal.timeout(10000),
      });

      const payload = (await upstreamResponse.json()) as Record<string, unknown>;
      if (!upstreamResponse.ok) {
        res.status(upstreamResponse.status).json({
          error: 'Upstream Places Autocomplete request failed.',
          details: payload,
        });
        return;
      }

      res.json(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(502).json({
        error: `Failed to reach Places Autocomplete API: ${message}`,
        code: 'UPSTREAM_ERROR',
      });
    }
  });

  // BFF Proxy: Elevation API (path sampling or discrete locations)
  app.post('/api/elevation/profile', async (req: Request, res: Response) => {
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) {
      res.status(503).json({
        error: 'GOOGLE_MAPS_API_KEY is not configured on the server.',
        code: 'API_KEY_MISSING',
      });
      return;
    }

    const body = req.body as ElevationProfileBody;
    if (!body || typeof body !== 'object') {
      res.status(400).json({ error: 'Invalid JSON body.', code: 'INVALID_REQUEST' });
      return;
    }

    const params = new URLSearchParams({ key: apiKey });

    if (Array.isArray(body.path)) {
      if (body.path.length < 2 || body.path.length > 512 || !body.path.every(isValidLatLng)) {
        res.status(400).json({
          error: '"path" must contain between 2 and 512 valid { lat, lng } points.',
          code: 'INVALID_PATH',
        });
        return;
      }
      const rawSamples = typeof body.samples === 'number' && Number.isFinite(body.samples) ? Math.round(body.samples) : 48;
      const samples = Math.min(512, Math.max(2, rawSamples));
      const encodedPath = body.path.map((pt) => `${pt.lat.toFixed(6)},${pt.lng.toFixed(6)}`).join('|');
      params.set('path', encodedPath);
      params.set('samples', String(samples));
    } else if (Array.isArray(body.locations)) {
      if (
        body.locations.length < 1 ||
        body.locations.length > 512 ||
        !body.locations.every(isValidLatLng)
      ) {
        res.status(400).json({
          error: '"locations" must contain between 1 and 512 valid { lat, lng } points.',
          code: 'INVALID_LOCATIONS',
        });
        return;
      }
      const encodedLocations = body.locations
        .map((pt) => `${pt.lat.toFixed(6)},${pt.lng.toFixed(6)}`)
        .join('|');
      params.set('locations', encodedLocations);
    } else {
      res.status(400).json({
        error: 'Request body must provide either a "path" array or a "locations" array.',
        code: 'INVALID_REQUEST',
      });
      return;
    }

    try {
      const upstreamUrl = `https://maps.googleapis.com/maps/api/elevation/json?${params.toString()}`;
      const upstreamResponse = await fetch(upstreamUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      });

      const payload = (await upstreamResponse.json()) as ElevationApiResponse;
      if (!upstreamResponse.ok || payload.status !== 'OK' || !Array.isArray(payload.results)) {
        res.status(upstreamResponse.ok ? 502 : upstreamResponse.status).json({
          error: payload.error_message || `Elevation API returned status: ${payload.status ?? 'UNKNOWN'}`,
          status: payload.status ?? 'ERROR',
        });
        return;
      }

      const metrics = computeTrailMetrics(payload.results);
      res.json({
        status: payload.status,
        results: payload.results,
        metrics,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(502).json({
        error: `Failed to reach Elevation API: ${message}`,
        code: 'UPSTREAM_ERROR',
      });
    }
  });

  app.use(express.static(publicDir));

  // Fallback to SPA shell for non-API GET routes
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/')) {
      res.sendFile(path.join(publicDir, 'index.html'));
      return;
    }
    next();
  });

  return app;
}

if (require.main === module) {
  const { host, port } = parseCliArgs(process.argv.slice(2));
  const app = createApp();
  app.listen(port, host, () => {
    console.log(`Lake Tahoe 3D Trail Explorer listening at http://${host}:${port}`);
  });
}
