import path from 'node:path';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import { SF_LISTINGS } from './listings';

dotenv.config();

interface CliOptions {
  host: string;
  port: number;
}

function parseCliArgs(argv: string[]): CliOptions {
  let host = '127.0.0.1';
  let port = Number.parseInt(process.env.PORT ?? '3000', 10);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--host' && i + 1 < argv.length) {
      const candidate = argv[i + 1].trim();
      // Security mandate: never bind to 0.0.0.0; restrict to local loopback
      host = candidate === 'localhost' || candidate === '127.0.0.1' ? candidate : '127.0.0.1';
      i += 1;
    } else if (arg.startsWith('--host=')) {
      const candidate = arg.slice('--host='.length).trim();
      host = candidate === 'localhost' || candidate === '127.0.0.1' ? candidate : '127.0.0.1';
    } else if (arg === '--port' && i + 1 < argv.length) {
      const parsed = Number.parseInt(argv[i + 1], 10);
      if (Number.isFinite(parsed) && parsed > 0 && parsed < 65536) {
        port = parsed;
      }
      i += 1;
    } else if (arg.startsWith('--port=')) {
      const parsed = Number.parseInt(arg.slice('--port='.length), 10);
      if (Number.isFinite(parsed) && parsed > 0 && parsed < 65536) {
        port = parsed;
      }
    }
  }

  if (!Number.isFinite(port) || port <= 0 || port >= 65536) {
    port = 3000;
  }

  return { host, port };
}

function getApiKey(): string {
  const key = (process.env.GOOGLE_MAPS_API_KEY ?? '').trim();
  if (!key || key === 'your_google_maps_api_key_here') {
    return '';
  }
  return key;
}

function isValidLatLng(value: unknown): value is { lat: number; lng: number } {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
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

type RouteWaypointInput =
  | { lat: number; lng: number }
  | { placeId: string }
  | { address: string };

function toRouteWaypoint(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== 'object') return null;
  const candidate = input as Record<string, unknown>;
  if (isValidLatLng(candidate)) {
    return {
      location: {
        latLng: {
          latitude: candidate.lat,
          longitude: candidate.lng,
        },
      },
    };
  }
  if (typeof candidate.placeId === 'string' && candidate.placeId.trim().length > 0) {
    return { placeId: candidate.placeId.trim().slice(0, 256) };
  }
  if (typeof candidate.address === 'string' && candidate.address.trim().length > 0) {
    return { address: candidate.address.trim().slice(0, 300) };
  }
  return null;
}

const PLACES_TEXT_SEARCH_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.viewport';

const PLACES_NEARBY_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.rating,places.userRatingCount';

const ROUTES_MATRIX_FIELD_MASK =
  'originIndex,destinationIndex,status,condition,distanceMeters,duration,localizedValues';

const ROUTES_COMPUTE_FIELD_MASK =
  'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.localizedValues';

const ALLOWED_NEARBY_TYPES = new Set([
  'school',
  'primary_school',
  'secondary_school',
  'supermarket',
  'grocery_store',
  'transit_station',
  'subway_station',
  'bus_station',
  'light_rail_station',
  'train_station',
]);

async function callUpstreamJson(
  url: string,
  headers: Record<string, string>,
  body: unknown
): Promise<{ status: number; data: unknown }> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
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

export function createApp() {
  const app = express();
  const projectRoot = path.resolve(__dirname, '..');
  const publicDir = path.join(projectRoot, 'public');
  const nodeModulesDir = path.join(projectRoot, 'node_modules');

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  // Mandatory security headers
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Serve bundled browser UMD dependencies locally (zero external CDN requirement)
  app.get('/vendor/markerclusterer.umd.js', (_req: Request, res: Response) => {
    res.sendFile(
      path.join(nodeModulesDir, '@googlemaps', 'markerclusterer', 'dist', 'index.umd.js')
    );
  });
  app.get('/vendor/index.umd.js.map', (_req: Request, res: Response) => {
    res.sendFile(
      path.join(nodeModulesDir, '@googlemaps', 'markerclusterer', 'dist', 'index.umd.js.map')
    );
  });
  app.get('/vendor/terra-draw.umd.js', (_req: Request, res: Response) => {
    res.sendFile(path.join(nodeModulesDir, 'terra-draw', 'dist', 'terra-draw.umd.js'));
  });
  app.get('/vendor/terra-draw.umd.js.map', (_req: Request, res: Response) => {
    res.sendFile(path.join(nodeModulesDir, 'terra-draw', 'dist', 'terra-draw.umd.js.map'));
  });
  app.get('/vendor/terra-draw-google-maps-adapter.umd.js', (_req: Request, res: Response) => {
    res.sendFile(
      path.join(
        nodeModulesDir,
        'terra-draw-google-maps-adapter',
        'dist',
        'terra-draw-google-maps-adapter.umd.js'
      )
    );
  });
  app.get('/vendor/terra-draw-google-maps-adapter.umd.js.map', (_req: Request, res: Response) => {
    res.sendFile(
      path.join(
        nodeModulesDir,
        'terra-draw-google-maps-adapter',
        'dist',
        'terra-draw-google-maps-adapter.umd.js.map'
      )
    );
  });

  app.get('/favicon.ico', (_req: Request, res: Response) => {
    res.status(204).end();
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    const apiKey = getApiKey();
    res.json({ ok: true, hasApiKey: Boolean(apiKey) });
  });

  app.get('/api/config', (_req: Request, res: Response) => {
    const apiKey = getApiKey();
    res.json({
      apiKey,
      hasApiKey: Boolean(apiKey),
      mapId: 'DEMO_MAP_ID',
      attributionId: 'gmp_git_agentsamples_v1.0.0',
      defaultCenter: { lat: 37.7749, lng: -122.4194 },
      defaultZoom: 13,
      seedSearchQuery: 'San Francisco, CA',
    });
  });

  app.get('/api/listings', (_req: Request, res: Response) => {
    res.json({ listings: SF_LISTINGS });
  });

  // Proxy: Places API (New) Text Search
  app.post('/api/places/search-text', async (req: Request, res: Response) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      res.status(503).json({
        error: 'GOOGLE_MAPS_API_KEY is not configured on the server.',
      });
      return;
    }

    const body = req.body as Record<string, unknown> | undefined;
    const textQuery = typeof body?.textQuery === 'string' ? body.textQuery.trim() : '';
    if (!textQuery || textQuery.length > 200) {
      res.status(400).json({
        error: 'textQuery must be a non-empty string up to 200 characters.',
      });
      return;
    }

    const upstreamPayload: Record<string, unknown> = {
      textQuery,
      languageCode: 'en',
      regionCode: 'US',
      maxResultCount: 5,
    };

    // Bias searches toward San Francisco Bay Area unless overridden
    if (body?.locationBias && typeof body.locationBias === 'object') {
      upstreamPayload.locationBias = body.locationBias;
    } else {
      upstreamPayload.locationBias = {
        circle: {
          center: { latitude: 37.7749, longitude: -122.4194 },
          radius: 40000,
        },
      };
    }

    try {
      const { status, data } = await callUpstreamJson(
        'https://places.googleapis.com/v1/places:searchText',
        {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': PLACES_TEXT_SEARCH_FIELD_MASK,
        },
        upstreamPayload
      );
      if (status < 200 || status >= 300) {
        res.status(status).json({ error: 'Places Text Search request failed.', details: data });
        return;
      }
      res.json(data);
    } catch (error) {
      res.status(502).json({
        error: 'Failed to reach Places API (New) Text Search.',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Proxy: Places API (New) Nearby Search (5km radius default)
  app.post('/api/places/nearby', async (req: Request, res: Response) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      res.status(503).json({
        error: 'GOOGLE_MAPS_API_KEY is not configured on the server.',
      });
      return;
    }

    const body = req.body as Record<string, unknown> | undefined;
    const latitude = body?.latitude;
    const longitude = body?.longitude;

    if (
      typeof latitude !== 'number' ||
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      typeof longitude !== 'number' ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      res.status(400).json({ error: 'Valid latitude and longitude numbers are required.' });
      return;
    }

    const rawRadius = typeof body?.radiusMeters === 'number' ? body.radiusMeters : 5000;
    const radiusMeters = Math.min(Math.max(rawRadius, 100), 50000);

    const rawMaxResults = typeof body?.maxResultCount === 'number' ? body.maxResultCount : 15;
    const maxResultCount = Math.min(Math.max(Math.round(rawMaxResults), 1), 20);

    let includedTypes = [
      'school',
      'supermarket',
      'grocery_store',
      'transit_station',
      'subway_station',
      'bus_station',
    ];

    if (Array.isArray(body?.includedTypes)) {
      const filtered = body.includedTypes
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => ALLOWED_NEARBY_TYPES.has(item));
      if (filtered.length > 0) {
        includedTypes = filtered;
      }
    }

    const upstreamPayload = {
      includedTypes,
      maxResultCount,
      rankPreference: 'DISTANCE',
      languageCode: 'en',
      regionCode: 'US',
      locationRestriction: {
        circle: {
          center: { latitude, longitude },
          radius: radiusMeters,
        },
      },
    };

    try {
      const { status, data } = await callUpstreamJson(
        'https://places.googleapis.com/v1/places:searchNearby',
        {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': PLACES_NEARBY_FIELD_MASK,
        },
        upstreamPayload
      );
      if (status < 200 || status >= 300) {
        res.status(status).json({ error: 'Places Nearby Search request failed.', details: data });
        return;
      }
      res.json(data);
    } catch (error) {
      res.status(502).json({
        error: 'Failed to reach Places API (New) Nearby Search.',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Proxy: Routes API Compute Route Matrix (Driving + Transit)
  app.post('/api/routes/matrix', async (req: Request, res: Response) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      res.status(503).json({
        error: 'GOOGLE_MAPS_API_KEY is not configured on the server.',
      });
      return;
    }

    const body = req.body as Record<string, unknown> | undefined;
    const originWaypoint = toRouteWaypoint(body?.origin as RouteWaypointInput);
    const destinationWaypoint = toRouteWaypoint(body?.destination as RouteWaypointInput);

    if (!originWaypoint || !destinationWaypoint) {
      res.status(400).json({
        error: 'Valid origin and destination ({ lat, lng }, { placeId }, or { address }) are required.',
      });
      return;
    }

    const requestedModes: Array<'DRIVE' | 'TRANSIT'> = Array.isArray(body?.travelModes)
      ? body.travelModes.filter((m): m is 'DRIVE' | 'TRANSIT' => m === 'DRIVE' || m === 'TRANSIT')
      : ['DRIVE', 'TRANSIT'];
    const modes: Array<'DRIVE' | 'TRANSIT'> =
      requestedModes.length > 0 ? requestedModes : ['DRIVE', 'TRANSIT'];

    try {
      const results = await Promise.all(
        modes.map(async (travelMode) => {
          const payload: Record<string, unknown> = {
            origins: [{ waypoint: originWaypoint }],
            destinations: [{ waypoint: destinationWaypoint }],
            travelMode,
            languageCode: 'en-US',
            units: 'IMPERIAL',
          };
          if (travelMode === 'DRIVE') {
            payload.routingPreference = 'TRAFFIC_AWARE';
          }

          const { status, data } = await callUpstreamJson(
            'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
            {
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': ROUTES_MATRIX_FIELD_MASK,
            },
            payload
          );

          if (status < 200 || status >= 300) {
            return { travelMode, ok: false, status, error: data, element: null };
          }
          const elements = Array.isArray(data) ? data : [];
          return {
            travelMode,
            ok: true,
            status,
            element: elements[0] ?? null,
          };
        })
      );

      const driveResult = results.find((r) => r.travelMode === 'DRIVE');
      const transitResult = results.find((r) => r.travelMode === 'TRANSIT');

      res.json({
        drive: driveResult?.element ?? null,
        transit: transitResult?.element ?? null,
        errors: results
          .filter((r) => !r.ok)
          .map((r) => ({ travelMode: r.travelMode, status: r.status, details: r.error })),
      });
    } catch (error) {
      res.status(502).json({
        error: 'Failed to reach Routes API Compute Route Matrix.',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Proxy: Routes API Compute Routes (encoded polyline preview)
  app.post('/api/routes/compute', async (req: Request, res: Response) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      res.status(503).json({
        error: 'GOOGLE_MAPS_API_KEY is not configured on the server.',
      });
      return;
    }

    const body = req.body as Record<string, unknown> | undefined;
    const originWaypoint = toRouteWaypoint(body?.origin as RouteWaypointInput);
    const destinationWaypoint = toRouteWaypoint(body?.destination as RouteWaypointInput);

    if (!originWaypoint || !destinationWaypoint) {
      res.status(400).json({
        error: 'Valid origin and destination are required.',
      });
      return;
    }

    const travelMode = body?.travelMode === 'TRANSIT' ? 'TRANSIT' : 'DRIVE';
    const upstreamPayload: Record<string, unknown> = {
      origin: originWaypoint,
      destination: destinationWaypoint,
      travelMode,
      languageCode: 'en-US',
      units: 'IMPERIAL',
    };
    if (travelMode === 'DRIVE') {
      upstreamPayload.routingPreference = 'TRAFFIC_AWARE';
    }

    try {
      const { status, data } = await callUpstreamJson(
        'https://routes.googleapis.com/directions/v2:computeRoutes',
        {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': ROUTES_COMPUTE_FIELD_MASK,
        },
        upstreamPayload
      );

      if (status < 200 || status >= 300) {
        res.status(status).json({ error: 'Routes Compute Routes request failed.', details: data });
        return;
      }

      const routesObj = data as { routes?: unknown[] } | null;
      res.json({
        route: Array.isArray(routesObj?.routes) ? (routesObj.routes[0] ?? null) : null,
      });
    } catch (error) {
      res.status(502).json({
        error: 'Failed to reach Routes API Compute Routes.',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  app.use(express.static(publicDir));

  // Fallback to index.html for root / SPA paths
  app.get('/', (_req: Request, res: Response) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  return app;
}

if (require.main === module) {
  const { host, port } = parseCliArgs(process.argv.slice(2));
  const app = createApp();
  app.listen(port, host, () => {
    console.log(`San Francisco Real Estate Explorer listening on http://${host}:${port}`);
  });
}
