import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

interface LatLngPoint {
  lat: number;
  lng: number;
}

type TravelMode = 'DRIVE' | 'WALK' | 'TRANSIT';

const VALID_TRAVEL_MODES = new Set<TravelMode>(['DRIVE', 'WALK', 'TRANSIT']);
const NYC_CENTER = { lat: 40.7549, lng: -73.984 };
const DEFAULT_ORIGIN = {
  name: 'Midtown / Penn Station',
  address: '234 W 31st St, New York, NY 10001',
  lat: 40.7506,
  lng: -73.9935,
};

const FIELD_MASKS = {
  placesSearch:
    'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.primaryType,places.rating,places.userRatingCount,places.regularOpeningHours.weekdayDescriptions,places.businessStatus',
  placesAutocomplete:
    'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat',
  placeDetails:
    'id,displayName,formattedAddress,location,regularOpeningHours.weekdayDescriptions,rating,userRatingCount,nationalPhoneNumber',
  routesMatrix:
    'originIndex,destinationIndex,status,condition,distanceMeters,duration,localizedValues',
  routesCompute:
    'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.duration,routes.legs.distanceMeters,routes.localizedValues',
} as const;

function getApiKey(): string {
  return (process.env.GOOGLE_MAPS_API_KEY || '').trim();
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidLatLng(point: unknown): point is LatLngPoint {
  if (!point || typeof point !== 'object') return false;
  const candidate = point as Record<string, unknown>;
  if (!isFiniteNumber(candidate.lat) || !isFiniteNumber(candidate.lng)) {
    return false;
  }
  return (
    candidate.lat >= -90 &&
    candidate.lat <= 90 &&
    candidate.lng >= -180 &&
    candidate.lng <= 180
  );
}

function normalizeTravelMode(value: unknown): TravelMode {
  if (typeof value === 'string' && VALID_TRAVEL_MODES.has(value as TravelMode)) {
    return value as TravelMode;
  }
  return 'DRIVE';
}

function sanitizeSessionToken(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 64) return undefined;
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return undefined;
  return trimmed;
}

function parseCliArgs(argv: string[]): { host: string; port: number } {
  let host = '127.0.0.1';
  let port = Number.parseInt(process.env.PORT || '3000', 10);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--host' && argv[i + 1]) {
      host = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--host=')) {
      host = arg.slice('--host='.length);
    } else if (arg === '--port' && argv[i + 1]) {
      port = Number.parseInt(argv[i + 1], 10);
      i += 1;
    } else if (arg.startsWith('--port=')) {
      port = Number.parseInt(arg.slice('--port='.length), 10);
    }
  }

  // Always restrict binding to loopback address (never 0.0.0.0).
  if (host !== '127.0.0.1' && host !== 'localhost') {
    host = '127.0.0.1';
  }
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    port = 3000;
  }

  return { host, port };
}

function requireApiKey(res: Response): string | null {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    res.status(503).json({
      error:
        'GOOGLE_MAPS_API_KEY is not configured. Copy .env.example to .env and set a valid Google Maps Platform API key.',
    });
    return null;
  }
  return apiKey;
}

async function forwardJsonRequest(
  url: string,
  options: {
    method: 'GET' | 'POST';
    apiKey: string;
    fieldMask: string;
    body?: Record<string, unknown>;
  }
): Promise<{ status: number; data: unknown }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': options.apiKey,
    'X-Goog-FieldMask': options.fieldMask,
  };

  const response = await fetch(url, {
    method: options.method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text };
    }
  }
  return { status: response.status, data: parsed };
}

export function createApp(): express.Express {
  const app = express();
  const projectRoot = path.resolve(__dirname, '..');
  const publicDir = path.join(projectRoot, 'public');
  const markerClustererPath = path.join(
    projectRoot,
    'node_modules',
    '@googlemaps',
    'markerclusterer',
    'dist',
    'index.min.js'
  );

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.get('/vendor/markerclusterer.min.js', (_req: Request, res: Response) => {
    res.sendFile(markerClustererPath);
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    const apiKey = getApiKey();
    res.json({
      status: 'ok',
      hasApiKey: Boolean(apiKey && apiKey !== 'your_google_maps_api_key_here'),
    });
  });

  app.get('/api/config', (_req: Request, res: Response) => {
    const apiKey = getApiKey();
    const configured = Boolean(apiKey && apiKey !== 'your_google_maps_api_key_here');
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      apiKey: configured ? apiKey : '',
      hasApiKey: configured,
      mapId: 'DEMO_MAP_ID',
      internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
      defaultCenter: NYC_CENTER,
      defaultZoom: 12,
      defaultOrigin: DEFAULT_ORIGIN,
    });
  });

  app.post('/api/places/search', async (req: Request, res: Response) => {
    const apiKey = requireApiKey(res);
    if (!apiKey) return;

    const body = req.body as Record<string, unknown> | undefined;
    const textQuery = typeof body?.textQuery === 'string' ? body.textQuery.trim() : '';
    if (!textQuery || textQuery.length > 200) {
      res.status(400).json({ error: 'Invalid textQuery: must be a non-empty string up to 200 characters.' });
      return;
    }

    const rawCount = body?.maxResultCount;
    const maxResultCount =
      typeof rawCount === 'number' && Number.isInteger(rawCount)
        ? Math.min(Math.max(rawCount, 1), 20)
        : 10;

    let locationBias: Record<string, unknown> = {
      circle: {
        center: { latitude: NYC_CENTER.lat, longitude: NYC_CENTER.lng },
        radius: 12000.0,
      },
    };
    if (body?.locationBias && typeof body.locationBias === 'object') {
      const bias = body.locationBias as Record<string, unknown>;
      if (bias.circle && typeof bias.circle === 'object') {
        const circle = bias.circle as Record<string, unknown>;
        const center = circle.center as Record<string, unknown> | undefined;
        const radius = circle.radius;
        if (
          center &&
          isFiniteNumber(center.latitude) &&
          isFiniteNumber(center.longitude) &&
          isFiniteNumber(radius) &&
          radius > 0 &&
          radius <= 50000
        ) {
          locationBias = {
            circle: {
              center: { latitude: center.latitude, longitude: center.longitude },
              radius,
            },
          };
        }
      }
    }

    const upstreamPayload: Record<string, unknown> = {
      textQuery,
      maxResultCount,
      locationBias,
      languageCode: 'en',
      regionCode: 'US',
    };

    if (typeof body?.includedType === 'string' && /^[a-z0-9_]{2,64}$/.test(body.includedType)) {
      upstreamPayload.includedType = body.includedType;
    }

    try {
      const result = await forwardJsonRequest(
        'https://places.googleapis.com/v1/places:searchText',
        {
          method: 'POST',
          apiKey,
          fieldMask: FIELD_MASKS.placesSearch,
          body: upstreamPayload,
        }
      );
      res.status(result.status).json(result.data);
    } catch (error) {
      console.error('Places search proxy error:', error instanceof Error ? error.message : 'Unknown error');
      res.status(502).json({ error: 'Failed to reach Places API Text Search.' });
    }
  });

  app.post('/api/places/autocomplete', async (req: Request, res: Response) => {
    const apiKey = requireApiKey(res);
    if (!apiKey) return;

    const body = req.body as Record<string, unknown> | undefined;
    const input = typeof body?.input === 'string' ? body.input.trim() : '';
    if (!input || input.length > 200) {
      res.status(400).json({ error: 'Invalid input: must be a non-empty string up to 200 characters.' });
      return;
    }

    const sessionToken = sanitizeSessionToken(body?.sessionToken);

    const upstreamPayload: Record<string, unknown> = {
      input,
      locationBias: {
        circle: {
          center: { latitude: NYC_CENTER.lat, longitude: NYC_CENTER.lng },
          radius: 25000.0,
        },
      },
      includedRegionCodes: ['us'],
      languageCode: 'en',
      regionCode: 'us',
      ...(sessionToken ? { sessionToken } : {}),
    };

    try {
      const result = await forwardJsonRequest(
        'https://places.googleapis.com/v1/places:autocomplete',
        {
          method: 'POST',
          apiKey,
          fieldMask: FIELD_MASKS.placesAutocomplete,
          body: upstreamPayload,
        }
      );
      res.status(result.status).json(result.data);
    } catch (error) {
      console.error('Places autocomplete proxy error:', error instanceof Error ? error.message : 'Unknown error');
      res.status(502).json({ error: 'Failed to reach Places API Autocomplete.' });
    }
  });

  app.get('/api/places/details', async (req: Request, res: Response) => {
    const apiKey = requireApiKey(res);
    if (!apiKey) return;

    const placeId = typeof req.query.placeId === 'string' ? req.query.placeId.trim() : '';
    if (!/^[A-Za-z0-9_-]{4,200}$/.test(placeId)) {
      res.status(400).json({ error: 'Invalid placeId query parameter.' });
      return;
    }

    const sessionToken = sanitizeSessionToken(req.query.sessionToken);
    const params = new URLSearchParams({ languageCode: 'en' });
    if (sessionToken) {
      params.set('sessionToken', sessionToken);
    }

    const upstreamUrl = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?${params.toString()}`;

    try {
      const result = await forwardJsonRequest(upstreamUrl, {
        method: 'GET',
        apiKey,
        fieldMask: FIELD_MASKS.placeDetails,
      });
      res.status(result.status).json(result.data);
    } catch (error) {
      console.error('Place details proxy error:', error instanceof Error ? error.message : 'Unknown error');
      res.status(502).json({ error: 'Failed to reach Places API Place Details.' });
    }
  });

  app.post('/api/routes/matrix', async (req: Request, res: Response) => {
    const apiKey = requireApiKey(res);
    if (!apiKey) return;

    const body = req.body as Record<string, unknown> | undefined;
    const origin = body?.origin;
    const destinations = body?.destinations;
    const travelMode = normalizeTravelMode(body?.travelMode);

    if (!isValidLatLng(origin)) {
      res.status(400).json({ error: 'Invalid origin coordinates. Expected { lat, lng }.' });
      return;
    }

    if (!Array.isArray(destinations) || destinations.length === 0 || destinations.length > 50) {
      res.status(400).json({ error: 'destinations must be a non-empty array with at most 50 items.' });
      return;
    }

    const validatedDestinations: LatLngPoint[] = [];
    for (const dest of destinations) {
      if (!isValidLatLng(dest)) {
        res.status(400).json({ error: 'All destinations must contain valid { lat, lng } coordinates.' });
        return;
      }
      validatedDestinations.push({ lat: dest.lat, lng: dest.lng });
    }

    const upstreamPayload: Record<string, unknown> = {
      origins: [
        {
          waypoint: {
            location: {
              latLng: { latitude: origin.lat, longitude: origin.lng },
            },
          },
        },
      ],
      destinations: validatedDestinations.map((d) => ({
        waypoint: {
          location: {
            latLng: { latitude: d.lat, longitude: d.lng },
          },
        },
      })),
      travelMode,
      ...(travelMode === 'DRIVE' ? { routingPreference: 'TRAFFIC_AWARE' } : {}),
      languageCode: 'en-US',
      units: 'IMPERIAL',
    };

    try {
      const result = await forwardJsonRequest(
        'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
        {
          method: 'POST',
          apiKey,
          fieldMask: FIELD_MASKS.routesMatrix,
          body: upstreamPayload,
        }
      );

      if (result.status >= 400) {
        res.status(result.status).json(result.data);
        return;
      }

      const elements = Array.isArray(result.data) ? result.data : [];
      res.json({ elements });
    } catch (error) {
      console.error('Routes matrix proxy error:', error instanceof Error ? error.message : 'Unknown error');
      res.status(502).json({ error: 'Failed to reach Routes API computeRouteMatrix.' });
    }
  });

  app.post('/api/routes/compute', async (req: Request, res: Response) => {
    const apiKey = requireApiKey(res);
    if (!apiKey) return;

    const body = req.body as Record<string, unknown> | undefined;
    const origin = body?.origin;
    const destination = body?.destination;
    const travelMode = normalizeTravelMode(body?.travelMode);

    if (!isValidLatLng(origin) || !isValidLatLng(destination)) {
      res.status(400).json({ error: 'Invalid origin or destination coordinates. Expected { lat, lng }.' });
      return;
    }

    const upstreamPayload: Record<string, unknown> = {
      origin: {
        location: {
          latLng: { latitude: origin.lat, longitude: origin.lng },
        },
      },
      destination: {
        location: {
          latLng: { latitude: destination.lat, longitude: destination.lng },
        },
      },
      travelMode,
      ...(travelMode === 'DRIVE' ? { routingPreference: 'TRAFFIC_AWARE' } : {}),
      computeAlternativeRoutes: false,
      polylineQuality: 'HIGH_QUALITY',
      polylineEncoding: 'ENCODED_POLYLINE',
      languageCode: 'en-US',
      units: 'IMPERIAL',
    };

    try {
      const result = await forwardJsonRequest(
        'https://routes.googleapis.com/directions/v2:computeRoutes',
        {
          method: 'POST',
          apiKey,
          fieldMask: FIELD_MASKS.routesCompute,
          body: upstreamPayload,
        }
      );

      if (result.status >= 400) {
        res.status(result.status).json(result.data);
        return;
      }

      const payload = (result.data && typeof result.data === 'object' ? result.data : {}) as {
        routes?: unknown[];
      };
      const routes = Array.isArray(payload.routes) ? payload.routes : [];
      res.json({
        route: routes[0] ?? null,
        routes,
      });
    } catch (error) {
      console.error('Routes compute proxy error:', error instanceof Error ? error.message : 'Unknown error');
      res.status(502).json({ error: 'Failed to reach Routes API computeRoutes.' });
    }
  });

  app.use(express.static(publicDir));

  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  return app;
}

if (require.main === module) {
  const { host, port } = parseCliArgs(process.argv.slice(2));
  const app = createApp();
  app.listen(port, host, () => {
    console.log(`NYC Store Locator server listening on http://${host}:${port}`);
  });
}
