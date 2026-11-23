import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(PROJECT_ROOT, '.env') });

interface LatLngPoint {
  lat: number;
  lng: number;
}

interface PlacesSearchBody {
  textQuery?: unknown;
  maxResultCount?: unknown;
  locationBias?: unknown;
}

interface RoutesComputeBody {
  origin?: unknown;
  destination?: unknown;
  intermediates?: unknown;
  optimizeWaypointOrder?: unknown;
  travelMode?: unknown;
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

  // Enforce loopback-only binding for local server security
  if (host !== '127.0.0.1' && host !== 'localhost') {
    host = '127.0.0.1';
  }

  return { host, port };
}

function isValidLatLng(value: unknown): value is LatLngPoint {
  if (typeof value !== 'object' || value === null) {
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

function getApiKey(): string {
  const raw = process.env.GOOGLE_MAPS_API_KEY?.trim() ?? '';
  if (!raw || raw === 'your_google_maps_api_key_here') {
    return '';
  }
  return raw;
}

const app = express();
app.disable('x-powered-by');

// Mandatory security headers on all responses
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json({ limit: '64kb' }));

// Serve local browser ESM dependencies from node_modules without external CDNs
const vendorMap: Record<string, string> = {
  '/vendor/terra-draw.js': path.join(
    PROJECT_ROOT,
    'node_modules/terra-draw/dist/terra-draw.modern.js',
  ),
  '/vendor/terra-draw-google-maps-adapter.js': path.join(
    PROJECT_ROOT,
    'node_modules/terra-draw-google-maps-adapter/dist/terra-draw-google-maps-adapter.modern.js',
  ),
};

for (const [routePath, filePath] of Object.entries(vendorMap)) {
  app.get(routePath, (_req: Request, res: Response) => {
    res.type('application/javascript; charset=utf-8');
    res.sendFile(filePath);
  });
}

const jsApiLoaderSource = fs
  .readFileSync(path.join(PROJECT_ROOT, 'node_modules/@googlemaps/js-api-loader/dist/index.js'), 'utf8')
  .replace(/process\.env\.NODE_ENV/g, '"production"');

app.get('/vendor/js-api-loader.js', (_req: Request, res: Response) => {
  res.type('application/javascript; charset=utf-8');
  res.send(jsApiLoaderSource);
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', configured: Boolean(getApiKey()) });
});

app.get('/api/config', (_req: Request, res: Response) => {
  const apiKey = getApiKey();
  res.json({
    configured: Boolean(apiKey),
    apiKey,
    defaultCenter: { lat: 30.2672, lng: -97.7431 },
    defaultZoom: 12,
    mapId: 'DEMO_MAP_ID',
    attributionId: 'gmp_git_agentsamples_v1.0.0',
  });
});

// Server-side Places API (New) Text Search proxy
app.post('/api/places/search', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({
      error: 'GOOGLE_MAPS_API_KEY is not configured. Add it to .env to enable Places Text Search.',
    });
    return;
  }

  const body = (req.body ?? {}) as PlacesSearchBody;
  if (typeof body.textQuery !== 'string' || body.textQuery.trim().length === 0) {
    res.status(400).json({ error: 'textQuery must be a non-empty string.' });
    return;
  }

  const textQuery = body.textQuery.trim().slice(0, 200);
  let maxResultCount = 6;
  if (typeof body.maxResultCount === 'number' && Number.isInteger(body.maxResultCount)) {
    maxResultCount = Math.min(Math.max(body.maxResultCount, 1), 20);
  }

  const payload: Record<string, unknown> = {
    textQuery,
    maxResultCount,
    languageCode: 'en',
    regionCode: 'US',
    locationBias: {
      circle: {
        center: { latitude: 30.2672, longitude: -97.7431 },
        radius: 18000.0,
      },
    },
  };

  if (typeof body.locationBias === 'object' && body.locationBias !== null) {
    payload.locationBias = body.locationBias;
  }

  try {
    const upstream = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.primaryTypeDisplayName',
      },
      body: JSON.stringify(payload),
    });

    const data = (await upstream.json().catch(() => ({}))) as Record<string, unknown>;
    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: 'Places API (New) Text Search failed.',
        details: (data.error as { message?: string } | undefined)?.message ?? upstream.statusText,
      });
      return;
    }

    res.json({ places: Array.isArray(data.places) ? data.places : [] });
  } catch (error) {
    res.status(502).json({
      error: 'Failed to reach Places API (New).',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Server-side Routes API v2 computeRoutes proxy with waypoint optimization
app.post('/api/routes/compute', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({
      error: 'GOOGLE_MAPS_API_KEY is not configured. Add it to .env to compute optimized routes.',
    });
    return;
  }

  const body = (req.body ?? {}) as RoutesComputeBody;
  if (!isValidLatLng(body.origin) || !isValidLatLng(body.destination)) {
    res.status(400).json({ error: 'origin and destination must be valid { lat, lng } coordinates.' });
    return;
  }

  const rawIntermediates = Array.isArray(body.intermediates) ? body.intermediates : [];
  if (rawIntermediates.length > 25 || !rawIntermediates.every(isValidLatLng)) {
    res.status(400).json({
      error: 'intermediates must be an array of up to 25 valid { lat, lng } coordinates.',
    });
    return;
  }

  const allowedModes = new Set(['DRIVE', 'TWO_WHEELER', 'WALK', 'BICYCLE']);
  const travelMode =
    typeof body.travelMode === 'string' && allowedModes.has(body.travelMode)
      ? body.travelMode
      : 'DRIVE';

  const optimizeWaypointOrder =
    rawIntermediates.length > 0 && body.optimizeWaypointOrder !== false;

  const routePayload: Record<string, unknown> = {
    origin: {
      location: { latLng: { latitude: body.origin.lat, longitude: body.origin.lng } },
    },
    destination: {
      location: { latLng: { latitude: body.destination.lat, longitude: body.destination.lng } },
    },
    intermediates: rawIntermediates.map((pt) => ({
      location: { latLng: { latitude: pt.lat, longitude: pt.lng } },
    })),
    travelMode,
    optimizeWaypointOrder,
    polylineQuality: 'HIGH_QUALITY',
    polylineEncoding: 'ENCODED_POLYLINE',
    units: 'IMPERIAL',
  };

  if (travelMode === 'DRIVE' || travelMode === 'TWO_WHEELER') {
    routePayload.routingPreference = 'TRAFFIC_AWARE';
  }

  try {
    const upstream = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'routes.optimizedIntermediateWaypointIndex,routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.distanceMeters,routes.legs.duration,routes.legs.startLocation,routes.legs.endLocation',
      },
      body: JSON.stringify(routePayload),
    });

    const data = (await upstream.json().catch(() => ({}))) as Record<string, unknown>;
    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: 'Routes API v2 computeRoutes failed.',
        details: (data.error as { message?: string } | undefined)?.message ?? upstream.statusText,
      });
      return;
    }

    res.json({ routes: Array.isArray(data.routes) ? data.routes : [] });
  } catch (error) {
    res.status(502).json({
      error: 'Failed to reach Routes API v2.',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Server-side Geocoding API v4 reverse geocoding proxy
app.get('/api/geocode/reverse', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({
      error: 'GOOGLE_MAPS_API_KEY is not configured. Add it to .env for reverse geocoding.',
    });
    return;
  }

  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    res.status(400).json({ error: 'Query parameters lat and lng must be valid coordinates.' });
    return;
  }

  try {
    const url = `https://geocode.googleapis.com/v4/geocode/location/${encodeURIComponent(
      String(lat),
    )},${encodeURIComponent(String(lng))}?languageCode=en&regionCode=US`;

    const upstream = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'results.formattedAddress,results.placeId,results.location',
      },
    });

    const data = (await upstream.json().catch(() => ({}))) as {
      results?: Array<{
        formattedAddress?: string;
        placeId?: string;
        location?: { latitude?: number; longitude?: number };
      }>;
      error?: { message?: string };
    };

    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: 'Geocoding API v4 reverse geocode failed.',
        details: data.error?.message ?? upstream.statusText,
      });
      return;
    }

    const results = Array.isArray(data.results) ? data.results : [];
    const primary = results[0] ?? null;
    res.json({
      formattedAddress: primary?.formattedAddress ?? null,
      placeId: primary?.placeId ?? null,
      location: primary?.location ?? null,
      results,
    });
  } catch (error) {
    res.status(502).json({
      error: 'Failed to reach Geocoding API v4.',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Serve static web UI
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
app.use(express.static(PUBLIC_DIR));

app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

const { host, port } = parseCliArgs(process.argv.slice(2));
app.listen(port, host, () => {
  console.log(
    `Field Workforce Geofenced Attendance & Site Audit Router listening on http://${host}:${port}`,
  );
});
