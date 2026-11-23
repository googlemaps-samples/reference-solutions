import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  autocompletePlaces,
  computeRoutes,
  fetchElevationProfile,
  GmpUpstreamError,
  searchPlacesText,
  type RouteEndpointInput,
  type SupportedTravelMode,
} from './gmpClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ServerCliArgs {
  host: string;
  port: number;
}

function parseCliArgs(argv: string[]): ServerCliArgs {
  let host = '127.0.0.1';
  let port = Number(process.env.PORT || '3000');

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--host' && argv[i + 1]) {
      host = argv[i + 1];
      i++;
    } else if (arg.startsWith('--host=')) {
      host = arg.slice('--host='.length);
    } else if (arg === '--port' && argv[i + 1]) {
      port = Number(argv[i + 1]);
      i++;
    } else if (arg.startsWith('--port=')) {
      port = Number(arg.slice('--port='.length));
    }
  }

  // Strictly bind to loopback only (never expose on 0.0.0.0).
  const normalizedHost = host === 'localhost' || host === '127.0.0.1' ? '127.0.0.1' : '127.0.0.1';
  const validPort = Number.isInteger(port) && port > 0 && port <= 65535 ? port : 3000;

  return { host: normalizedHost, port: validPort };
}

function getApiKey(): string {
  return (process.env.GOOGLE_MAPS_API_KEY || '').trim();
}

function requireApiKey(res: Response): string | null {
  const key = getApiKey();
  if (!key || key === 'your_google_maps_api_key_here') {
    res.status(503).json({
      error:
        'GOOGLE_MAPS_API_KEY is not configured. Copy .env.example to .env and provide a valid Google Maps Platform API key or Maps Demo Key.',
    });
    return null;
  }
  return key;
}

function normalizeTravelMode(raw: unknown): SupportedTravelMode | null {
  if (typeof raw !== 'string') return null;
  const upper = raw.toUpperCase();
  if (upper === 'DRIVE' || upper === 'DRIVING') return 'DRIVE';
  if (upper === 'BICYCLE' || upper === 'BICYCLING') return 'BICYCLE';
  if (upper === 'WALK' || upper === 'WALKING') return 'WALK';
  if (upper === 'TRANSIT') return 'TRANSIT';
  return null;
}

function validateEndpoint(raw: unknown): RouteEndpointInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.placeId === 'string' && obj.placeId.trim().length > 0) {
    return { placeId: obj.placeId.trim() };
  }
  if (
    typeof obj.lat === 'number' &&
    Number.isFinite(obj.lat) &&
    obj.lat >= -90 &&
    obj.lat <= 90 &&
    typeof obj.lng === 'number' &&
    Number.isFinite(obj.lng) &&
    obj.lng >= -180 &&
    obj.lng <= 180
  ) {
    return { lat: obj.lat, lng: obj.lng };
  }
  if (typeof obj.address === 'string' && obj.address.trim().length > 0) {
    return { address: obj.address.trim() };
  }
  return null;
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

// Mandatory security headers
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.get('/api/health', (_req: Request, res: Response) => {
  const apiKey = getApiKey();
  res.json({
    ok: true,
    hasApiKey: Boolean(apiKey && apiKey !== 'your_google_maps_api_key_here'),
  });
});

app.get('/api/config', (_req: Request, res: Response) => {
  const rawKey = getApiKey();
  const mapsApiKey = rawKey === 'your_google_maps_api_key_here' ? '' : rawKey;
  res.json({
    mapsApiKey,
    initialCenter: { lat: 39.884, lng: -105.135 },
    initialZoom: 11,
    seededOriginQuery: 'Denver Union Station, Denver, CO',
    seededDestinationQuery: 'Chautauqua Park, Boulder, CO',
  });
});

app.post('/api/places/search', async (req: Request, res: Response) => {
  const apiKey = requireApiKey(res);
  if (!apiKey) return;

  const body = req.body as Record<string, unknown> | undefined;
  const textQuery = typeof body?.textQuery === 'string' ? body.textQuery.trim() : '';
  if (!textQuery || textQuery.length > 200) {
    res.status(400).json({ error: 'textQuery must be a non-empty string up to 200 characters.' });
    return;
  }

  const locationBias =
    body?.locationBias && typeof body.locationBias === 'object'
      ? (body.locationBias as Record<string, unknown>)
      : undefined;

  try {
    const data = await searchPlacesText(apiKey, textQuery, locationBias);
    res.json(data);
  } catch (err) {
    handleProxyError(res, err);
  }
});

app.post('/api/places/autocomplete', async (req: Request, res: Response) => {
  const apiKey = requireApiKey(res);
  if (!apiKey) return;

  const body = req.body as Record<string, unknown> | undefined;
  const input = typeof body?.input === 'string' ? body.input.trim() : '';
  if (!input || input.length > 200) {
    res.status(400).json({ error: 'input must be a non-empty string up to 200 characters.' });
    return;
  }

  const sessionToken =
    typeof body?.sessionToken === 'string' && body.sessionToken.trim().length > 0
      ? body.sessionToken.trim()
      : undefined;

  const locationBias =
    body?.locationBias && typeof body.locationBias === 'object'
      ? (body.locationBias as Record<string, unknown>)
      : undefined;

  try {
    const data = await autocompletePlaces(apiKey, input, sessionToken, locationBias);
    res.json(data);
  } catch (err) {
    handleProxyError(res, err);
  }
});

app.post('/api/routes/compute', async (req: Request, res: Response) => {
  const apiKey = requireApiKey(res);
  if (!apiKey) return;

  const body = req.body as Record<string, unknown> | undefined;
  const origin = validateEndpoint(body?.origin);
  const destination = validateEndpoint(body?.destination);
  const travelMode = normalizeTravelMode(body?.travelMode ?? 'BICYCLE');

  if (!origin || !destination) {
    res.status(400).json({
      error: 'Both origin and destination must provide placeId, valid lat/lng, or address.',
    });
    return;
  }
  if (!travelMode) {
    res.status(400).json({
      error: 'travelMode must be one of DRIVE, BICYCLE, WALK, or TRANSIT.',
    });
    return;
  }

  const avoidTolls = Boolean(body?.avoidTolls);
  const avoidHighways = Boolean(body?.avoidHighways);
  const ecoFriendly = Boolean(body?.ecoFriendly);
  const computeAlternativeRoutes = body?.computeAlternativeRoutes !== false;
  const rawEmission = typeof body?.emissionType === 'string' ? body.emissionType.toUpperCase() : 'GASOLINE';
  const emissionType = (
    ['GASOLINE', 'HYBRID', 'ELECTRIC', 'DIESEL'].includes(rawEmission) ? rawEmission : 'GASOLINE'
  ) as 'GASOLINE' | 'HYBRID' | 'ELECTRIC' | 'DIESEL';

  try {
    const data = await computeRoutes(apiKey, {
      origin,
      destination,
      travelMode,
      avoidTolls,
      avoidHighways,
      ecoFriendly,
      computeAlternativeRoutes,
      emissionType,
    });
    res.json(data);
  } catch (err) {
    handleProxyError(res, err);
  }
});

app.post('/api/elevation/profile', async (req: Request, res: Response) => {
  const apiKey = requireApiKey(res);
  if (!apiKey) return;

  const body = req.body as Record<string, unknown> | undefined;
  const encodedPolyline =
    typeof body?.encodedPolyline === 'string' ? body.encodedPolyline.trim() : '';
  if (!encodedPolyline || encodedPolyline.length > 50000) {
    res.status(400).json({ error: 'encodedPolyline must be a non-empty string.' });
    return;
  }

  const requestedSamples = Number(body?.samples ?? 64);
  const samples =
    Number.isInteger(requestedSamples) && requestedSamples >= 8 && requestedSamples <= 128
      ? requestedSamples
      : 64;

  try {
    const data = await fetchElevationProfile(apiKey, encodedPolyline, samples);
    res.json(data);
  } catch (err) {
    handleProxyError(res, err);
  }
});

function handleProxyError(res: Response, err: unknown): void {
  if (err instanceof GmpUpstreamError) {
    res.status(err.statusCode).json({
      error: err.message,
      details: err.details,
    });
    return;
  }
  const message = err instanceof Error ? err.message : 'Unexpected server error';
  res.status(500).json({ error: message });
}

const publicDir = path.resolve(__dirname, '../public');
app.use(express.static(publicDir));

app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400) {
    res.status(400).json({ error: 'Invalid JSON request body.' });
    return;
  }
  res.status(500).json({ error: 'Unexpected server error.' });
});

const { host, port } = parseCliArgs(process.argv.slice(2));
app.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
});
