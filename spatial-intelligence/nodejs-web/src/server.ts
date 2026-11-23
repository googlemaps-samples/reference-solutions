import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NYC_SPATIAL_DATA } from './data/nycSpatialData.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const publicDir = resolve(rootDir, 'public');
const assetsDir = resolve(rootDir, 'dist', 'assets');

const PLACES_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.types';

interface LatLngInput {
  lat: number;
  lng: number;
}

interface PlacesSearchBody {
  textQuery?: unknown;
  pageSize?: unknown;
  locationBias?: {
    lat?: unknown;
    lng?: unknown;
    radius?: unknown;
  };
}

interface ElevationBody {
  locations?: unknown;
  path?: unknown;
  samples?: unknown;
}

interface UpstreamPlace {
  id?: string;
  displayName?: { text?: string; languageCode?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  types?: string[];
}

interface UpstreamElevationResult {
  elevation?: number;
  location?: { lat?: number; lng?: number };
  resolution?: number;
}

function getConfiguredApiKey(): string {
  const raw = (process.env.GOOGLE_MAPS_API_KEY ?? '').trim();
  if (!raw || raw === 'your_google_maps_api_key_here') {
    return '';
  }
  return raw;
}

function parseCliArgs(argv: string[]): { host: string; port: number } {
  let host = '127.0.0.1';
  let port = Number(process.env.PORT ?? 3000);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--host' && i + 1 < argv.length) {
      const requested = argv[++i].trim();
      host = requested === 'localhost' || requested === '127.0.0.1' ? '127.0.0.1' : '127.0.0.1';
    } else if (arg.startsWith('--host=')) {
      const requested = arg.slice('--host='.length).trim();
      host = requested === 'localhost' || requested === '127.0.0.1' ? '127.0.0.1' : '127.0.0.1';
    } else if (arg === '--port' && i + 1 < argv.length) {
      const parsed = Number(argv[++i]);
      if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) {
        port = parsed;
      }
    } else if (arg.startsWith('--port=')) {
      const parsed = Number(arg.slice('--port='.length));
      if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) {
        port = parsed;
      }
    }
  }

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    port = 3000;
  }

  return { host, port };
}

function isValidLatLng(value: unknown): value is LatLngInput {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.lat === 'number' &&
    typeof candidate.lng === 'number' &&
    Number.isFinite(candidate.lat) &&
    Number.isFinite(candidate.lng) &&
    candidate.lat >= -90 &&
    candidate.lat <= 90 &&
    candidate.lng >= -180 &&
    candidate.lng <= 180
  );
}

const app = express();
app.disable('x-powered-by');

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json({ limit: '256kb' }));

app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ status: 'INVALID_JSON', error: 'Malformed JSON request body.' });
    return;
  }
  next(err);
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: '3d-spatial-intelligence-nodejs-web',
    configured: Boolean(getConfiguredApiKey()),
  });
});

app.get('/api/config', (_req: Request, res: Response) => {
  const apiKey = getConfiguredApiKey();
  res.json({
    hasApiKey: Boolean(apiKey),
    apiKey,
    mapId: 'DEMO_MAP_ID',
    attributionId: 'gmp_git_agentsamples_v1.0.0',
    initialCenter: { lat: 40.73061, lng: -73.98661 },
    initialZoom: 12,
    seedQuery: 'New York City civic transit hub',
  });
});

app.get('/api/spatial-data', (_req: Request, res: Response) => {
  res.json(NYC_SPATIAL_DATA);
});

app.post('/api/places/search', async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as PlacesSearchBody;

  if (typeof body.textQuery !== 'string') {
    res.status(400).json({ status: 'INVALID_REQUEST', error: 'textQuery must be a string.' });
    return;
  }

  const textQuery = body.textQuery.trim();
  if (!textQuery || textQuery.length > 200) {
    res.status(400).json({
      status: 'INVALID_REQUEST',
      error: 'textQuery must be between 1 and 200 characters.',
    });
    return;
  }

  let pageSize = 8;
  if (body.pageSize !== undefined) {
    if (
      typeof body.pageSize !== 'number' ||
      !Number.isInteger(body.pageSize) ||
      body.pageSize < 1 ||
      body.pageSize > 20
    ) {
      res.status(400).json({
        status: 'INVALID_REQUEST',
        error: 'pageSize must be an integer between 1 and 20.',
      });
      return;
    }
    pageSize = body.pageSize;
  }

  let biasLat = 40.73061;
  let biasLng = -73.98661;
  let biasRadius = 15000;

  if (body.locationBias !== undefined) {
    const bias = body.locationBias;
    if (
      !bias ||
      typeof bias !== 'object' ||
      typeof bias.lat !== 'number' ||
      typeof bias.lng !== 'number' ||
      !Number.isFinite(bias.lat) ||
      !Number.isFinite(bias.lng) ||
      bias.lat < -90 ||
      bias.lat > 90 ||
      bias.lng < -180 ||
      bias.lng > 180
    ) {
      res.status(400).json({
        status: 'INVALID_REQUEST',
        error: 'locationBias must include valid numeric lat and lng coordinates.',
      });
      return;
    }
    biasLat = bias.lat;
    biasLng = bias.lng;
    if (
      typeof bias.radius === 'number' &&
      Number.isFinite(bias.radius) &&
      bias.radius >= 100 &&
      bias.radius <= 50000
    ) {
      biasRadius = bias.radius;
    }
  }

  const apiKey = getConfiguredApiKey();
  if (!apiKey) {
    res.json({
      status: 'NOT_CONFIGURED',
      configured: false,
      places: [],
      message: 'GOOGLE_MAPS_API_KEY is not configured. Add it to .env to enable live Places search.',
    });
    return;
  }

  try {
    const upstreamRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': PLACES_FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery,
        pageSize,
        locationBias: {
          circle: {
            center: { latitude: biasLat, longitude: biasLng },
            radius: biasRadius,
          },
        },
      }),
    });

    if (!upstreamRes.ok) {
      const errPayload = (await upstreamRes.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      res.status(502).json({
        status: 'UPSTREAM_ERROR',
        places: [],
        error: errPayload.error?.message ?? `Places API returned HTTP ${upstreamRes.status}`,
      });
      return;
    }

    const data = (await upstreamRes.json()) as { places?: UpstreamPlace[] };
    const projectedPlaces = (data.places ?? []).map((place) => ({
      id: place.id ?? '',
      displayName: place.displayName ?? { text: 'Unnamed Civic Hub', languageCode: 'en' },
      formattedAddress: place.formattedAddress ?? '',
      location: place.location ?? null,
      types: Array.isArray(place.types) ? place.types : [],
    }));

    res.json({
      status: 'OK',
      configured: true,
      places: projectedPlaces,
    });
  } catch (error) {
    res.status(502).json({
      status: 'UPSTREAM_UNAVAILABLE',
      places: [],
      error: error instanceof Error ? error.message : 'Failed to reach Places API.',
    });
  }
});

app.post('/api/elevation', async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as ElevationBody;
  const hasLocations = Array.isArray(body.locations);
  const hasPath = Array.isArray(body.path);

  if (!hasLocations && !hasPath) {
    res.status(400).json({
      status: 'INVALID_REQUEST',
      error: 'Request body must include either a locations array or a path array.',
    });
    return;
  }

  const params = new URLSearchParams();

  if (hasLocations) {
    const locations = body.locations as unknown[];
    if (locations.length < 1 || locations.length > 100 || !locations.every(isValidLatLng)) {
      res.status(400).json({
        status: 'INVALID_REQUEST',
        error: 'locations must contain 1 to 100 valid { lat, lng } coordinate objects.',
      });
      return;
    }
    params.set(
      'locations',
      locations.map((pt) => `${pt.lat.toFixed(6)},${pt.lng.toFixed(6)}`).join('|'),
    );
  } else if (hasPath) {
    const pathPoints = body.path as unknown[];
    if (pathPoints.length < 2 || pathPoints.length > 50 || !pathPoints.every(isValidLatLng)) {
      res.status(400).json({
        status: 'INVALID_REQUEST',
        error: 'path must contain 2 to 50 valid { lat, lng } coordinate objects.',
      });
      return;
    }
    const samples =
      typeof body.samples === 'number' &&
      Number.isInteger(body.samples) &&
      body.samples >= 2 &&
      body.samples <= 64
        ? body.samples
        : 12;
    params.set(
      'path',
      pathPoints.map((pt) => `${pt.lat.toFixed(6)},${pt.lng.toFixed(6)}`).join('|'),
    );
    params.set('samples', String(samples));
  }

  const apiKey = getConfiguredApiKey();
  if (!apiKey) {
    res.json({
      status: 'NOT_CONFIGURED',
      configured: false,
      results: [],
      message: 'GOOGLE_MAPS_API_KEY is not configured. Add it to .env to enable Elevation profiling.',
    });
    return;
  }

  params.set('key', apiKey);

  try {
    const upstreamUrl = `https://maps.googleapis.com/maps/api/elevation/json?${params.toString()}`;
    const upstreamRes = await fetch(upstreamUrl, { method: 'GET' });

    if (!upstreamRes.ok) {
      res.status(502).json({
        status: 'UPSTREAM_ERROR',
        results: [],
        error: `Elevation API returned HTTP ${upstreamRes.status}`,
      });
      return;
    }

    const payload = (await upstreamRes.json()) as {
      status?: string;
      results?: UpstreamElevationResult[];
      error_message?: string;
    };

    const results = (payload.results ?? []).map((item) => ({
      elevation: typeof item.elevation === 'number' ? item.elevation : 0,
      location: {
        lat: item.location?.lat ?? 0,
        lng: item.location?.lng ?? 0,
      },
      resolution: typeof item.resolution === 'number' ? item.resolution : 0,
    }));

    res.json({
      status: payload.status ?? 'UNKNOWN_ERROR',
      configured: true,
      results,
      ...(payload.error_message ? { error: payload.error_message } : {}),
    });
  } catch (error) {
    res.status(502).json({
      status: 'UPSTREAM_UNAVAILABLE',
      results: [],
      error: error instanceof Error ? error.message : 'Failed to reach Elevation API.',
    });
  }
});

app.use(
  '/assets',
  express.static(assetsDir, {
    fallthrough: false,
    maxAge: '1h',
  }),
);

app.use(express.static(publicDir, { extensions: ['html'] }));

app.get('*', (_req: Request, res: Response) => {
  res.sendFile(resolve(publicDir, 'index.html'));
});

const { host, port } = parseCliArgs(process.argv.slice(2));

app.listen(port, host, () => {
  console.log(`NYC GIS Workbench server listening at http://${host}:${port}`);
});
