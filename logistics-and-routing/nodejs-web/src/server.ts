import path from 'node:path';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import {
  ComputeMatrixRequestBody,
  ComputeRoutesRequestBody,
  LatLngLiteral,
  PlacesSearchRequestBody,
  SnapRoadsRequestBody,
} from './types';

dotenv.config();

const SOLUTION_ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';
const MAP_ID = 'DEMO_MAP_ID';
const DEFAULT_CENTER: LatLngLiteral = { lat: 32.7767, lng: -96.797 };
const DEFAULT_ZOOM = 12;

const ROUTES_COMPUTE_FIELD_MASK =
  'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.duration,routes.legs.distanceMeters,routes.legs.startLocation,routes.legs.endLocation,routes.optimizedIntermediateWaypointIndex';
const ROUTES_MATRIX_FIELD_MASK =
  'originIndex,destinationIndex,duration,distanceMeters,status,condition';
const PLACES_SEARCH_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location';

function getApiKey(): string {
  const raw = (process.env.GOOGLE_MAPS_API_KEY ?? '').trim();
  if (!raw || raw === 'your_google_maps_api_key_here') {
    return '';
  }
  return raw;
}

function isValidLatLng(value: unknown): value is LatLngLiteral {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  const lat = candidate.lat;
  const lng = candidate.lng;
  return (
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    typeof lng === 'number' &&
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180
  );
}

function toRouteWaypoint(coord: LatLngLiteral) {
  return {
    location: {
      latLng: {
        latitude: coord.lat,
        longitude: coord.lng,
      },
    },
  };
}

function parseServerArgs(argv: string[]): { host: string; port: number } {
  let requestedHost = '127.0.0.1';
  let port = Number.parseInt(process.env.PORT ?? '3000', 10);
  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    port = 3000;
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--host' && i + 1 < argv.length) {
      requestedHost = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--host=')) {
      requestedHost = arg.slice('--host='.length);
    } else if (arg === '--port' && i + 1 < argv.length) {
      const parsed = Number.parseInt(argv[i + 1], 10);
      if (Number.isFinite(parsed) && parsed > 0 && parsed <= 65535) {
        port = parsed;
      }
      i += 1;
    } else if (arg.startsWith('--port=')) {
      const parsed = Number.parseInt(arg.slice('--port='.length), 10);
      if (Number.isFinite(parsed) && parsed > 0 && parsed <= 65535) {
        port = parsed;
      }
    }
  }

  // Strictly bind to loopback 127.0.0.1 (never 0.0.0.0)
  const host = requestedHost === 'localhost' ? '127.0.0.1' : '127.0.0.1';
  return { host, port };
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (record.error && typeof record.error === 'object') {
      const errObj = record.error as Record<string, unknown>;
      if (typeof errObj.message === 'string' && errObj.message.trim()) {
        return errObj.message.trim();
      }
    }
    if (typeof record.error_message === 'string' && record.error_message.trim()) {
      return record.error_message.trim();
    }
  }
  return fallback;
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

// Mandatory security headers on all responses
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.get('/favicon.ico', (_req: Request, res: Response) => {
  res.status(204).end();
});

app.get('/api/health', (_req: Request, res: Response) => {
  const apiKey = getApiKey();
  res.json({
    status: 'ok',
    hasApiKey: Boolean(apiKey),
  });
});

app.get('/api/config', (_req: Request, res: Response) => {
  const apiKey = getApiKey();
  res.json({
    hasApiKey: Boolean(apiKey),
    mapsApiKey: apiKey,
    mapId: MAP_ID,
    attributionId: SOLUTION_ATTRIBUTION_ID,
    defaultCenter: DEFAULT_CENTER,
    defaultZoom: DEFAULT_ZOOM,
  });
});

app.post('/api/places/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as Partial<PlacesSearchRequestBody>;
    if (!body || typeof body.textQuery !== 'string' || body.textQuery.trim().length === 0) {
      res.status(400).json({ error: 'textQuery must be a non-empty string.' });
      return;
    }
    const textQuery = body.textQuery.trim().slice(0, 200);
    const maxResultCount =
      typeof body.maxResultCount === 'number' &&
      Number.isInteger(body.maxResultCount) &&
      body.maxResultCount >= 1 &&
      body.maxResultCount <= 10
        ? body.maxResultCount
        : 6;

    let biasCenter = DEFAULT_CENTER;
    let biasRadius = 25000;
    if (body.locationBias !== undefined) {
      if (
        !body.locationBias ||
        !isValidLatLng(body.locationBias.center) ||
        typeof body.locationBias.radiusMeters !== 'number' ||
        body.locationBias.radiusMeters <= 0 ||
        body.locationBias.radiusMeters > 50000
      ) {
        res.status(400).json({ error: 'locationBias must contain valid center and radiusMeters (1-50000).' });
        return;
      }
      biasCenter = body.locationBias.center;
      biasRadius = body.locationBias.radiusMeters;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      res.status(503).json({
        ok: false,
        error: 'GOOGLE_MAPS_API_KEY is not configured in the server environment.',
      });
      return;
    }

    const upstreamResp = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': PLACES_SEARCH_FIELD_MASK,
        'X-Goog-Maps-Solution-ID': SOLUTION_ATTRIBUTION_ID,
      },
      body: JSON.stringify({
        textQuery,
        maxResultCount,
        locationBias: {
          circle: {
            center: {
              latitude: biasCenter.lat,
              longitude: biasCenter.lng,
            },
            radius: biasRadius,
          },
        },
      }),
    });

    const data: unknown = await upstreamResp.json().catch(() => ({}));
    if (!upstreamResp.ok) {
      res.json({
        ok: false,
        upstreamStatus: upstreamResp.status,
        error: extractErrorMessage(data, `Places API returned status ${upstreamResp.status}`),
        places: [],
      });
      return;
    }

    const parsed = data as { places?: unknown[] };
    res.json({
      ok: true,
      places: Array.isArray(parsed.places) ? parsed.places : [],
    });
  } catch (err) {
    next(err);
  }
});

app.post('/api/roads/snap', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as Partial<SnapRoadsRequestBody>;
    if (!body || !Array.isArray(body.path) || body.path.length < 2 || body.path.length > 100) {
      res.status(400).json({ error: 'path must be an array of 2 to 100 { lat, lng } points.' });
      return;
    }
    if (!body.path.every(isValidLatLng)) {
      res.status(400).json({ error: 'Every point in path must contain valid lat and lng numbers.' });
      return;
    }

    const interpolate = body.interpolate !== undefined ? Boolean(body.interpolate) : true;
    const apiKey = getApiKey();
    if (!apiKey) {
      res.status(503).json({
        ok: false,
        error: 'GOOGLE_MAPS_API_KEY is not configured in the server environment.',
      });
      return;
    }

    const pathParam = body.path.map((pt) => `${pt.lat},${pt.lng}`).join('|');
    const url = new URL('https://roads.googleapis.com/v1/snapToRoads');
    url.searchParams.set('path', pathParam);
    url.searchParams.set('interpolate', String(interpolate));
    url.searchParams.set('key', apiKey);

    const upstreamResp = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-Goog-Maps-Solution-ID': SOLUTION_ATTRIBUTION_ID,
      },
    });

    const data: unknown = await upstreamResp.json().catch(() => ({}));
    if (!upstreamResp.ok) {
      res.json({
        ok: false,
        upstreamStatus: upstreamResp.status,
        error: extractErrorMessage(data, `Roads API returned status ${upstreamResp.status}`),
        snappedPoints: [],
      });
      return;
    }

    const rawObj = data as {
      snappedPoints?: Array<{
        location?: { latitude?: number; longitude?: number };
        originalIndex?: number;
        placeId?: string;
      }>;
      warningMessage?: string;
    };

    const snappedPoints = Array.isArray(rawObj.snappedPoints)
      ? rawObj.snappedPoints.map((pt) => ({
          location: pt.location,
          originalIndex: pt.originalIndex,
          placeId: pt.placeId,
        }))
      : [];

    res.json({
      ok: true,
      snappedPoints,
      warningMessage: rawObj.warningMessage ?? null,
    });
  } catch (err) {
    next(err);
  }
});

app.post('/api/routes/compute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as Partial<ComputeRoutesRequestBody>;
    if (!body || !isValidLatLng(body.origin) || !isValidLatLng(body.destination)) {
      res.status(400).json({ error: 'origin and destination must be valid { lat, lng } objects.' });
      return;
    }

    const intermediates = Array.isArray(body.intermediates) ? body.intermediates : [];
    if (intermediates.length > 25 || !intermediates.every(isValidLatLng)) {
      res.status(400).json({
        error: 'intermediates must be an array of at most 25 valid { lat, lng } objects.',
      });
      return;
    }

    const travelMode = body.travelMode === 'TWO_WHEELER' ? 'TWO_WHEELER' : 'DRIVE';
    const routingPreference =
      body.routingPreference === 'TRAFFIC_AWARE_OPTIMAL' ||
      body.routingPreference === 'TRAFFIC_UNAWARE'
        ? body.routingPreference
        : 'TRAFFIC_AWARE';
    const optimizeWaypointOrder = Boolean(body.optimizeWaypointOrder) && intermediates.length > 1;

    const apiKey = getApiKey();
    if (!apiKey) {
      res.status(503).json({
        ok: false,
        error: 'GOOGLE_MAPS_API_KEY is not configured in the server environment.',
      });
      return;
    }

    const payload = {
      origin: toRouteWaypoint(body.origin),
      destination: toRouteWaypoint(body.destination),
      intermediates: intermediates.map(toRouteWaypoint),
      travelMode,
      routingPreference,
      optimizeWaypointOrder,
      polylineQuality: 'HIGH_QUALITY',
      units: 'IMPERIAL',
    };

    const upstreamResp = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': ROUTES_COMPUTE_FIELD_MASK,
        'X-Goog-Maps-Solution-ID': SOLUTION_ATTRIBUTION_ID,
      },
      body: JSON.stringify(payload),
    });

    const data: unknown = await upstreamResp.json().catch(() => ({}));
    if (!upstreamResp.ok) {
      res.json({
        ok: false,
        upstreamStatus: upstreamResp.status,
        error: extractErrorMessage(data, `Routes API returned status ${upstreamResp.status}`),
        routes: [],
      });
      return;
    }

    const parsed = data as { routes?: unknown[] };
    res.json({
      ok: true,
      routes: Array.isArray(parsed.routes) ? parsed.routes : [],
    });
  } catch (err) {
    next(err);
  }
});

app.post('/api/routes/matrix', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as Partial<ComputeMatrixRequestBody>;
    if (
      !body ||
      !Array.isArray(body.origins) ||
      !Array.isArray(body.destinations) ||
      body.origins.length === 0 ||
      body.destinations.length === 0
    ) {
      res.status(400).json({ error: 'origins and destinations must be non-empty coordinate arrays.' });
      return;
    }

    if (!body.origins.every(isValidLatLng) || !body.destinations.every(isValidLatLng)) {
      res.status(400).json({ error: 'Every origin and destination must be a valid { lat, lng }.' });
      return;
    }

    const elementCount = body.origins.length * body.destinations.length;
    const travelMode = body.travelMode === 'TWO_WHEELER' ? 'TWO_WHEELER' : 'DRIVE';
    const routingPreference =
      body.routingPreference === 'TRAFFIC_AWARE_OPTIMAL' ||
      body.routingPreference === 'TRAFFIC_UNAWARE'
        ? body.routingPreference
        : 'TRAFFIC_AWARE';

    const maxElements = routingPreference === 'TRAFFIC_AWARE_OPTIMAL' ? 100 : 625;
    if (elementCount > maxElements) {
      res.status(400).json({
        error: `Matrix element count (${elementCount}) exceeds limit (${maxElements}).`,
      });
      return;
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      res.status(503).json({
        ok: false,
        error: 'GOOGLE_MAPS_API_KEY is not configured in the server environment.',
      });
      return;
    }

    const payload = {
      origins: body.origins.map((coord) => ({ waypoint: toRouteWaypoint(coord) })),
      destinations: body.destinations.map((coord) => ({ waypoint: toRouteWaypoint(coord) })),
      travelMode,
      routingPreference,
    };

    const upstreamResp = await fetch(
      'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': ROUTES_MATRIX_FIELD_MASK,
          'X-Goog-Maps-Solution-ID': SOLUTION_ATTRIBUTION_ID,
        },
        body: JSON.stringify(payload),
      }
    );

    const data: unknown = await upstreamResp.json().catch(() => []);
    if (!upstreamResp.ok) {
      res.json({
        ok: false,
        upstreamStatus: upstreamResp.status,
        error: extractErrorMessage(data, `Route Matrix API returned status ${upstreamResp.status}`),
        elements: [],
      });
      return;
    }

    res.json({
      ok: true,
      elements: Array.isArray(data) ? data : [],
    });
  } catch (err) {
    next(err);
  }
});

const publicDir = path.resolve(__dirname, '..', 'public');
app.use(express.static(publicDir));

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : 'Unexpected server error';
  if (req.path.startsWith('/api/')) {
    res.status(500).json({ ok: false, error: message });
    return;
  }
  res.status(500).send('Internal Server Error');
});

const { host, port } = parseServerArgs(process.argv.slice(2));
app.listen(port, host, () => {
  console.log(`Dallas Fleet Dispatch server listening on http://${host}:${port}`);
});
