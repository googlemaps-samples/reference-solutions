import path from 'node:path';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';

dotenv.config();

interface LatLngPoint {
  latitude: number;
  longitude: number;
}

interface RouteComputeRequestBody {
  origin?: {
    latitude?: unknown;
    longitude?: unknown;
    placeId?: unknown;
  };
  destination?: {
    latitude?: unknown;
    longitude?: unknown;
    placeId?: unknown;
  };
  emissionType?: unknown;
  includeEcoRoute?: unknown;
  routingPreference?: unknown;
}

interface RouteMatrixRequestBody {
  origins?: unknown;
  destinations?: unknown;
}

interface PlacesSearchRequestBody {
  textQuery?: unknown;
  locationBias?: {
    latitude?: unknown;
    longitude?: unknown;
    radiusMeters?: unknown;
  };
}

const VALID_EMISSION_TYPES = new Set(['GASOLINE', 'HYBRID', 'ELECTRIC', 'DIESEL']);
const VALID_ROUTING_PREFS = new Set([
  'TRAFFIC_UNAWARE',
  'TRAFFIC_AWARE',
  'TRAFFIC_AWARE_OPTIMAL',
]);

const ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';
const DEFAULT_MAP_ID = 'DEMO_MAP_ID';
const LA_CENTER = { lat: 34.0328, lng: -118.3669 };
const DEFAULT_ZOOM = 12;

const ROUTES_COMPUTE_FIELD_MASK =
  'routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline.encodedPolyline,routes.routeLabels,routes.travelAdvisory.fuelConsumptionMicroliters,routes.localizedValues';
const ROUTES_MATRIX_FIELD_MASK =
  'originIndex,destinationIndex,duration,distanceMeters,status,condition';
const PLACES_SEARCH_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location';

function parseCliArgs(argv: string[]): { host: string; port: number } {
  let host = '127.0.0.1';
  let port = Number(process.env.PORT) || 3000;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--host' && argv[i + 1]) {
      const candidate = argv[i + 1].trim();
      i += 1;
      if (candidate === '127.0.0.1' || candidate === 'localhost' || candidate === '::1') {
        host = candidate;
      }
    } else if (arg.startsWith('--host=')) {
      const candidate = arg.slice('--host='.length).trim();
      if (candidate === '127.0.0.1' || candidate === 'localhost' || candidate === '::1') {
        host = candidate;
      }
    } else if (arg === '--port' && argv[i + 1]) {
      const parsed = Number(argv[i + 1]);
      i += 1;
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

  return { host, port };
}

function isFiniteCoordinate(lat: unknown, lng: unknown): boolean {
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

function parseLatLngPoint(value: unknown): LatLngPoint | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const obj = value as Record<string, unknown>;
  if (!isFiniteCoordinate(obj.latitude, obj.longitude)) {
    return null;
  }
  return {
    latitude: obj.latitude as number,
    longitude: obj.longitude as number,
  };
}

function buildRouteWaypoint(
  point: RouteComputeRequestBody['origin']
): { location: { latLng: LatLngPoint } } | { placeId: string } | null {
  if (!point || typeof point !== 'object') {
    return null;
  }
  if (typeof point.placeId === 'string' && point.placeId.trim().length > 0) {
    return { placeId: point.placeId.trim() };
  }
  if (isFiniteCoordinate(point.latitude, point.longitude)) {
    return {
      location: {
        latLng: {
          latitude: point.latitude as number,
          longitude: point.longitude as number,
        },
      },
    };
  }
  return null;
}

function getApiKey(): string {
  const key = (process.env.GOOGLE_MAPS_API_KEY || '').trim();
  if (!key || key === 'your_google_maps_api_key_here') {
    return '';
  }
  return key;
}

async function forwardJsonRequest(
  url: string,
  apiKey: string,
  fieldMask: string,
  payload: unknown
): Promise<{ status: number; data: unknown }> {
  const upstreamRes = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify(payload),
  });

  const text = await upstreamRes.text();
  let parsed: unknown = {};
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text };
    }
  }
  return { status: upstreamRes.status, data: parsed };
}

const app = express();
app.disable('x-powered-by');

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json({ limit: '64kb' }));

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: 'ridesharing-and-tracker-nodejs-web',
    mapsApiKeyConfigured: Boolean(getApiKey()),
  });
});

app.get('/api/config', (_req: Request, res: Response) => {
  const apiKey = getApiKey();
  res.json({
    configured: Boolean(apiKey),
    apiKey,
    attributionId: ATTRIBUTION_ID,
    mapId: DEFAULT_MAP_ID,
    defaultCenter: LA_CENTER,
    defaultZoom: DEFAULT_ZOOM,
    seedPickupQuery: 'Union Station, Los Angeles, CA',
    seedDropoffQuery: 'Santa Monica Pier, Santa Monica, CA',
  });
});

app.post('/api/places/search', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({
      error: 'GOOGLE_MAPS_API_KEY is not configured in the server environment.',
    });
    return;
  }

  const body = (req.body || {}) as PlacesSearchRequestBody;
  if (typeof body.textQuery !== 'string' || body.textQuery.trim().length === 0) {
    res.status(400).json({ error: 'textQuery must be a non-empty string.' });
    return;
  }

  const textQuery = body.textQuery.trim().slice(0, 200);
  let biasLat = 34.0522;
  let biasLng = -118.2437;
  let biasRadius = 50000.0;

  if (body.locationBias && typeof body.locationBias === 'object') {
    if (isFiniteCoordinate(body.locationBias.latitude, body.locationBias.longitude)) {
      biasLat = body.locationBias.latitude as number;
      biasLng = body.locationBias.longitude as number;
    }
    if (
      typeof body.locationBias.radiusMeters === 'number' &&
      Number.isFinite(body.locationBias.radiusMeters) &&
      body.locationBias.radiusMeters > 0 &&
      body.locationBias.radiusMeters <= 50000
    ) {
      biasRadius = body.locationBias.radiusMeters;
    }
  }

  const upstreamBody = {
    textQuery,
    languageCode: 'en',
    regionCode: 'US',
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
  };

  try {
    const result = await forwardJsonRequest(
      'https://places.googleapis.com/v1/places:searchText',
      apiKey,
      PLACES_SEARCH_FIELD_MASK,
      upstreamBody
    );
    res.status(result.status).json(result.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upstream Places API request failed.';
    res.status(502).json({ error: message });
  }
});

app.post('/api/routes/compute', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({
      error: 'GOOGLE_MAPS_API_KEY is not configured in the server environment.',
    });
    return;
  }

  const body = (req.body || {}) as RouteComputeRequestBody;
  const origin = buildRouteWaypoint(body.origin);
  const destination = buildRouteWaypoint(body.destination);

  if (!origin || !destination) {
    res.status(400).json({
      error: 'Both origin and destination must include valid latitude/longitude coordinates or placeId.',
    });
    return;
  }

  const emissionType =
    typeof body.emissionType === 'string' && VALID_EMISSION_TYPES.has(body.emissionType)
      ? body.emissionType
      : 'GASOLINE';

  const routingPreference =
    typeof body.routingPreference === 'string' && VALID_ROUTING_PREFS.has(body.routingPreference)
      ? body.routingPreference
      : 'TRAFFIC_AWARE_OPTIMAL';

  const includeEcoRoute = body.includeEcoRoute !== false;

  const upstreamBody: Record<string, unknown> = {
    origin,
    destination,
    travelMode: 'DRIVE',
    routingPreference,
    computeAlternativeRoutes: false,
    extraComputations: ['FUEL_CONSUMPTION'],
    routeModifiers: {
      vehicleInfo: {
        emissionType,
      },
    },
    units: 'IMPERIAL',
    languageCode: 'en-US',
  };

  if (includeEcoRoute) {
    upstreamBody.requestedReferenceRoutes = ['FUEL_EFFICIENT'];
  }

  try {
    const result = await forwardJsonRequest(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      apiKey,
      ROUTES_COMPUTE_FIELD_MASK,
      upstreamBody
    );
    res.status(result.status).json(result.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upstream Routes API request failed.';
    res.status(502).json({ error: message });
  }
});

app.post('/api/routes/matrix', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({
      error: 'GOOGLE_MAPS_API_KEY is not configured in the server environment.',
    });
    return;
  }

  const body = (req.body || {}) as RouteMatrixRequestBody;
  if (!Array.isArray(body.origins) || !Array.isArray(body.destinations)) {
    res.status(400).json({ error: 'origins and destinations must be non-empty arrays.' });
    return;
  }

  if (
    body.origins.length === 0 ||
    body.destinations.length === 0 ||
    body.origins.length > 25 ||
    body.destinations.length > 25
  ) {
    res.status(400).json({
      error: 'origins and destinations must contain between 1 and 25 waypoints.',
    });
    return;
  }

  const parsedOrigins = body.origins.map(parseLatLngPoint);
  const parsedDestinations = body.destinations.map(parseLatLngPoint);

  if (parsedOrigins.some((p) => p === null) || parsedDestinations.some((p) => p === null)) {
    res.status(400).json({
      error: 'Every origin and destination must contain finite latitude and longitude numbers.',
    });
    return;
  }

  const upstreamBody = {
    origins: (parsedOrigins as LatLngPoint[]).map((latLng) => ({
      waypoint: {
        location: {
          latLng,
        },
      },
    })),
    destinations: (parsedDestinations as LatLngPoint[]).map((latLng) => ({
      waypoint: {
        location: {
          latLng,
        },
      },
    })),
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
  };

  try {
    const result = await forwardJsonRequest(
      'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
      apiKey,
      ROUTES_MATRIX_FIELD_MASK,
      upstreamBody
    );

    if (result.status >= 400) {
      res.status(result.status).json(result.data);
      return;
    }

    const elements = Array.isArray(result.data) ? result.data : [];
    res.status(200).json({ elements });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Upstream Route Matrix API request failed.';
    res.status(502).json({ error: message });
  }
});

app.get('/favicon.ico', (_req: Request, res: Response) => {
  res.status(204).end();
});

const publicDir = path.resolve(__dirname, '../public');
app.use(express.static(publicDir));

app.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const { host, port } = parseCliArgs(process.argv.slice(2));
app.listen(port, host, () => {
  console.log(`MetroPulse Rideshare server listening at http://${host}:${port}`);
});
