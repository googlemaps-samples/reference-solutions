import path from 'node:path';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';

dotenv.config();

const ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';
const MAP_ID = 'DEMO_MAP_ID';

const PLACES_LIST_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.regularOpeningHours,places.photos,places.primaryTypeDisplayName,places.priceLevel,places.googleMapsUri';

const PLACE_DETAILS_FIELD_MASK =
  'id,displayName,formattedAddress,location,viewport,rating,userRatingCount,regularOpeningHours,photos,primaryTypeDisplayName,googleMapsUri,utcOffsetMinutes';

const ROUTES_FIELD_MASK =
  'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.optimizedIntermediateWaypointIndex,routes.legs.distanceMeters,routes.legs.duration,routes.legs.startLocation,routes.legs.endLocation,routes.viewport';

interface CliArgs {
  host: string;
  port: number;
}

interface LatLngInput {
  lat: number;
  lng: number;
}

interface RouteStopInput {
  lat: number;
  lng: number;
  placeId?: string;
  name?: string;
}

interface ComputeRouteBody {
  stops: RouteStopInput[];
  travelMode?: string;
  optimizeWaypointOrder?: boolean;
}

interface UpstreamRouteLeg {
  distanceMeters?: number;
  duration?: string;
  startLocation?: { latLng?: { latitude: number; longitude: number } };
  endLocation?: { latLng?: { latitude: number; longitude: number } };
}

interface UpstreamRoute {
  distanceMeters?: number;
  duration?: string;
  polyline?: { encodedPolyline?: string };
  optimizedIntermediateWaypointIndex?: number[];
  legs?: UpstreamRouteLeg[];
  viewport?: {
    low?: { latitude: number; longitude: number };
    high?: { latitude: number; longitude: number };
  };
}

function parseCliArgs(argv: string[]): CliArgs {
  let requestedHost = process.env.HOST || '127.0.0.1';
  let requestedPort = Number.parseInt(process.env.PORT || '3000', 10);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--host' && i + 1 < argv.length) {
      requestedHost = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--host=')) {
      requestedHost = arg.slice('--host='.length);
    } else if (arg === '--port' && i + 1 < argv.length) {
      const parsed = Number.parseInt(argv[i + 1], 10);
      if (!Number.isNaN(parsed)) {
        requestedPort = parsed;
      }
      i += 1;
    } else if (arg.startsWith('--port=')) {
      const parsed = Number.parseInt(arg.slice('--port='.length), 10);
      if (!Number.isNaN(parsed)) {
        requestedPort = parsed;
      }
    }
  }

  // Strictly bind to loopback address; never bind to 0.0.0.0
  const safeHost = requestedHost === 'localhost' ? 'localhost' : '127.0.0.1';
  const safePort =
    Number.isInteger(requestedPort) && requestedPort > 0 && requestedPort <= 65535
      ? requestedPort
      : 3000;

  return { host: safeHost, port: safePort };
}

function getApiKey(): string {
  return (process.env.GOOGLE_MAPS_API_KEY || '').trim();
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidLatLng(lat: unknown, lng: unknown): boolean {
  return (
    isFiniteNumber(lat) &&
    isFiniteNumber(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function parseDurationSeconds(durationStr: string | undefined): number {
  if (!durationStr) return 0;
  const match = /^(-?\d+(?:\.\d+)?)s$/.exec(durationStr.trim());
  return match ? Math.round(Number.parseFloat(match[1])) : 0;
}

function toWaypoint(stop: RouteStopInput): Record<string, unknown> {
  if (stop.placeId && /^[A-Za-z0-9_-]{8,256}$/.test(stop.placeId)) {
    return { placeId: stop.placeId };
  }
  return {
    location: {
      latLng: {
        latitude: stop.lat,
        longitude: stop.lng,
      },
    },
  };
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

// Mandatory security headers on all responses
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const publicDir = path.resolve(__dirname, '..', 'public');
app.use(express.static(publicDir));

app.get('/api/health', (_req: Request, res: Response) => {
  const apiKey = getApiKey();
  res.json({
    ok: true,
    hasApiKey: apiKey.length > 0,
    attributionId: ATTRIBUTION_ID,
  });
});

app.get('/api/config', (_req: Request, res: Response) => {
  const apiKey = getApiKey();
  res.json({
    hasApiKey: apiKey.length > 0,
    mapsApiKey: apiKey,
    mapId: MAP_ID,
    attributionId: ATTRIBUTION_ID,
  });
});

/**
 * POST /api/places/search
 * Proxies Places API (New) Text Search: https://places.googleapis.com/v1/places:searchText
 */
app.post('/api/places/search', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({
      error: 'GOOGLE_MAPS_API_KEY is not configured in .env',
      places: [],
    });
    return;
  }

  const body = req.body as Record<string, unknown> | null;
  if (!body || typeof body.textQuery !== 'string' || body.textQuery.trim().length === 0) {
    res.status(400).json({ error: 'textQuery must be a non-empty string' });
    return;
  }

  const textQuery = body.textQuery.trim().slice(0, 200);
  const maxResultCount =
    typeof body.maxResultCount === 'number' &&
    Number.isInteger(body.maxResultCount) &&
    body.maxResultCount >= 1 &&
    body.maxResultCount <= 20
      ? body.maxResultCount
      : 8;

  const payload: Record<string, unknown> = {
    textQuery,
    maxResultCount,
    languageCode: typeof body.languageCode === 'string' ? body.languageCode.slice(0, 10) : 'en',
  };

  if (typeof body.includedType === 'string' && /^[a-z_]+$/.test(body.includedType)) {
    payload.includedType = body.includedType;
  }

  const bias = body.locationBias as { lat?: unknown; lng?: unknown; radius?: unknown } | undefined;
  if (bias && isValidLatLng(bias.lat, bias.lng)) {
    const radius =
      isFiniteNumber(bias.radius) && bias.radius > 0 && bias.radius <= 50000
        ? bias.radius
        : 8000;
    payload.locationBias = {
      circle: {
        center: { latitude: bias.lat, longitude: bias.lng },
        radius,
      },
    };
  }

  try {
    const upstream = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': PLACES_LIST_FIELD_MASK,
      },
      body: JSON.stringify(payload),
    });

    const data = (await upstream.json()) as Record<string, unknown>;
    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: 'Places Text Search failed',
        details: data,
      });
      return;
    }

    res.json(data);
  } catch (err) {
    res.status(502).json({
      error: 'Failed to reach Places Text Search upstream',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/places/nearby
 * Proxies Places API (New) Nearby Search: https://places.googleapis.com/v1/places:searchNearby
 */
app.post('/api/places/nearby', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({
      error: 'GOOGLE_MAPS_API_KEY is not configured in .env',
      places: [],
    });
    return;
  }

  const body = req.body as Record<string, unknown> | null;
  if (!body || !isValidLatLng(body.lat, body.lng)) {
    res.status(400).json({ error: 'Valid numeric lat and lng are required' });
    return;
  }

  const lat = body.lat as number;
  const lng = body.lng as number;
  const radius =
    isFiniteNumber(body.radius) && body.radius >= 100 && body.radius <= 50000
      ? body.radius
      : 4500;

  const maxResultCount =
    typeof body.maxResultCount === 'number' &&
    Number.isInteger(body.maxResultCount) &&
    body.maxResultCount >= 1 &&
    body.maxResultCount <= 20
      ? body.maxResultCount
      : 8;

  const includedTypes = Array.isArray(body.includedTypes)
    ? body.includedTypes.filter(
        (item): item is string => typeof item === 'string' && /^[a-z_]+$/.test(item)
      )
    : [];

  const includedPrimaryTypes = Array.isArray(body.includedPrimaryTypes)
    ? body.includedPrimaryTypes.filter(
        (item): item is string => typeof item === 'string' && /^[a-z_]+$/.test(item)
      )
    : [];

  if (includedTypes.length === 0 && includedPrimaryTypes.length === 0) {
    includedTypes.push('tourist_attraction');
  }

  const rankPreference =
    body.rankPreference === 'DISTANCE' ? 'DISTANCE' : 'POPULARITY';

  const payload: Record<string, unknown> = {
    maxResultCount,
    rankPreference,
    languageCode: typeof body.languageCode === 'string' ? body.languageCode.slice(0, 10) : 'en',
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius,
      },
    },
  };

  if (includedTypes.length > 0) {
    payload.includedTypes = includedTypes.slice(0, 10);
  }
  if (includedPrimaryTypes.length > 0) {
    payload.includedPrimaryTypes = includedPrimaryTypes.slice(0, 10);
  }

  try {
    const upstream = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': PLACES_LIST_FIELD_MASK,
      },
      body: JSON.stringify(payload),
    });

    const data = (await upstream.json()) as Record<string, unknown>;
    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: 'Places Nearby Search failed',
        details: data,
      });
      return;
    }

    res.json(data);
  } catch (err) {
    res.status(502).json({
      error: 'Failed to reach Places Nearby Search upstream',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/places/details
 * Proxies Places API (New) Place Details: https://places.googleapis.com/v1/places/{placeId}
 */
app.get('/api/places/details', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({ error: 'GOOGLE_MAPS_API_KEY is not configured in .env' });
    return;
  }

  const placeId = typeof req.query.placeId === 'string' ? req.query.placeId.trim() : '';
  if (!/^[A-Za-z0-9_-]{8,256}$/.test(placeId)) {
    res.status(400).json({ error: 'Invalid placeId query parameter' });
    return;
  }

  try {
    const upstream = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=en`,
      {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': PLACE_DETAILS_FIELD_MASK,
        },
      }
    );

    const data = (await upstream.json()) as Record<string, unknown>;
    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: 'Place Details lookup failed',
        details: data,
      });
      return;
    }

    res.json(data);
  } catch (err) {
    res.status(502).json({
      error: 'Failed to reach Place Details upstream',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/places/photo
 * Resolves Places API (New) Photo Media without exposing the API key in <img src>
 */
app.get('/api/places/photo', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({ error: 'GOOGLE_MAPS_API_KEY is not configured in .env' });
    return;
  }

  const photoName = typeof req.query.name === 'string' ? req.query.name.trim() : '';
  if (!/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(photoName)) {
    res.status(400).json({ error: 'Invalid photo resource name' });
    return;
  }

  const rawWidth = Number.parseInt(String(req.query.maxWidthPx || '600'), 10);
  const maxWidthPx =
    Number.isInteger(rawWidth) && rawWidth >= 100 && rawWidth <= 1600 ? rawWidth : 600;

  const url = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&skipHttpRedirect=true`;

  try {
    const upstream = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
      },
    });

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: 'Failed to resolve photo media' });
      return;
    }

    const media = (await upstream.json()) as { photoUri?: string };
    if (!media.photoUri) {
      res.status(404).json({ error: 'Photo URI not found' });
      return;
    }

    if (req.query.format === 'json') {
      res.json({ photoUri: media.photoUri });
      return;
    }

    res.redirect(302, media.photoUri);
  } catch (err) {
    res.status(502).json({
      error: 'Failed to reach Place Photo upstream',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/routes/compute
 * Proxies Routes API v2: https://routes.googleapis.com/directions/v2:computeRoutes
 */
app.post('/api/routes/compute', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({ error: 'GOOGLE_MAPS_API_KEY is not configured in .env' });
    return;
  }

  const body = req.body as ComputeRouteBody | null;
  if (!body || !Array.isArray(body.stops) || body.stops.length < 2) {
    res.status(400).json({ error: 'At least 2 valid stops are required to compute a route' });
    return;
  }

  if (body.stops.length > 25) {
    res.status(400).json({ error: 'A maximum of 25 stops per route is supported' });
    return;
  }

  for (const stop of body.stops) {
    if (!stop || !isValidLatLng(stop.lat, stop.lng)) {
      res.status(400).json({ error: 'Each stop must include valid numeric lat and lng' });
      return;
    }
  }

  const allowedModes = new Set(['DRIVE', 'WALK', 'TRANSIT', 'BICYCLE']);
  const travelMode =
    typeof body.travelMode === 'string' && allowedModes.has(body.travelMode)
      ? body.travelMode
      : 'DRIVE';

  const optimizeRequested = Boolean(body.optimizeWaypointOrder);
  const canOptimize = optimizeRequested && travelMode !== 'TRANSIT' && body.stops.length >= 3;

  try {
    // Routes API v2 TRANSIT does not support intermediate waypoints in a single call.
    // When >2 stops use TRANSIT, compute sequential pairwise legs and merge cleanly.
    if (travelMode === 'TRANSIT' && body.stops.length > 2) {
      const legCalls = body.stops.slice(0, -1).map(async (originStop, idx) => {
        const destStop = body.stops[idx + 1];
        const legReq = {
          origin: toWaypoint(originStop),
          destination: toWaypoint(destStop),
          travelMode: 'TRANSIT',
          languageCode: 'en',
        };
        const upstream = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': ROUTES_FIELD_MASK,
          },
          body: JSON.stringify(legReq),
        });
        const data = (await upstream.json()) as { routes?: UpstreamRoute[] };
        if (upstream.ok && data.routes && data.routes.length > 0) {
          return { route: data.routes[0], fallbackWalk: false };
        }
        // Graceful fallback to WALK for legs without transit coverage
        const walkReq = { ...legReq, travelMode: 'WALK' };
        const walkUpstream = await fetch(
          'https://routes.googleapis.com/directions/v2:computeRoutes',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': ROUTES_FIELD_MASK,
            },
            body: JSON.stringify(walkReq),
          }
        );
        const walkData = (await walkUpstream.json()) as { routes?: UpstreamRoute[] };
        return {
          route: walkData.routes?.[0] ?? null,
          fallbackWalk: true,
        };
      });

      const results = await Promise.all(legCalls);
      let totalDistanceMeters = 0;
      let totalDurationSeconds = 0;
      const encodedPolylines: string[] = [];
      const legs: UpstreamRouteLeg[] = [];
      let usedWalkFallback = false;

      for (const item of results) {
        if (!item.route) continue;
        if (item.fallbackWalk) usedWalkFallback = true;
        totalDistanceMeters += item.route.distanceMeters || 0;
        totalDurationSeconds += parseDurationSeconds(item.route.duration);
        if (item.route.polyline?.encodedPolyline) {
          encodedPolylines.push(item.route.polyline.encodedPolyline);
        }
        if (item.route.legs && item.route.legs.length > 0) {
          legs.push(item.route.legs[0]);
        }
      }

      res.json({
        travelMode,
        optimizeApplied: false,
        note: optimizeRequested
          ? 'Waypoint order optimization is supported for Drive, Walk, and Bicycle modes.'
          : usedWalkFallback
            ? 'Some transit segments used walking fallback.'
            : undefined,
        distanceMeters: totalDistanceMeters,
        durationSeconds: totalDurationSeconds,
        duration: `${totalDurationSeconds}s`,
        encodedPolyline: encodedPolylines[0] || '',
        encodedPolylines,
        optimizedIntermediateWaypointIndex: [],
        legs,
      });
      return;
    }

    const origin = toWaypoint(body.stops[0]);
    const destination = toWaypoint(body.stops[body.stops.length - 1]);
    const intermediates = body.stops.slice(1, -1).map(toWaypoint);

    const routePayload: Record<string, unknown> = {
      origin,
      destination,
      travelMode,
      languageCode: 'en',
      units: 'METRIC',
    };

    if (intermediates.length > 0) {
      routePayload.intermediates = intermediates;
    }

    if (travelMode === 'DRIVE') {
      routePayload.routingPreference = 'TRAFFIC_AWARE';
    }

    if (canOptimize) {
      routePayload.optimizeWaypointOrder = true;
    }

    const upstream = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': ROUTES_FIELD_MASK,
      },
      body: JSON.stringify(routePayload),
    });

    const data = (await upstream.json()) as { routes?: UpstreamRoute[]; error?: unknown };
    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: 'Routes computeRoutes failed',
        details: data,
      });
      return;
    }

    const primaryRoute = data.routes?.[0];
    if (!primaryRoute) {
      res.json({
        travelMode,
        optimizeApplied: false,
        distanceMeters: 0,
        durationSeconds: 0,
        duration: '0s',
        encodedPolyline: '',
        encodedPolylines: [],
        optimizedIntermediateWaypointIndex: [],
        legs: [],
        note: 'No route found between the selected stops.',
      });
      return;
    }

    const durationSeconds = parseDurationSeconds(primaryRoute.duration);
    const encodedPolyline = primaryRoute.polyline?.encodedPolyline || '';

    res.json({
      travelMode,
      optimizeApplied: canOptimize,
      distanceMeters: primaryRoute.distanceMeters || 0,
      durationSeconds,
      duration: primaryRoute.duration || '0s',
      encodedPolyline,
      encodedPolylines: encodedPolyline ? [encodedPolyline] : [],
      optimizedIntermediateWaypointIndex:
        primaryRoute.optimizedIntermediateWaypointIndex || [],
      legs: primaryRoute.legs || [],
      viewport: primaryRoute.viewport || null,
    });
  } catch (err) {
    res.status(502).json({
      error: 'Failed to reach Routes API upstream',
      message: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/timezone
 * Proxies Time Zone API: https://maps.googleapis.com/maps/api/timezone/json
 * Gracefully signals fallback if key lacks Time Zone API authorization (e.g. Maps Demo Key).
 */
app.get('/api/timezone', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({
      status: 'MISSING_KEY',
      errorMessage: 'GOOGLE_MAPS_API_KEY is not configured in .env',
    });
    return;
  }

  const lat = Number.parseFloat(String(req.query.lat ?? ''));
  const lng = Number.parseFloat(String(req.query.lng ?? ''));
  if (!isValidLatLng(lat, lng)) {
    res.status(400).json({ error: 'Valid numeric lat and lng query parameters are required' });
    return;
  }

  const rawTs = Number.parseInt(
    String(req.query.timestamp || Math.floor(Date.now() / 1000)),
    10
  );
  const timestamp = Number.isFinite(rawTs) ? rawTs : Math.floor(Date.now() / 1000);
  const language = typeof req.query.language === 'string' ? req.query.language.slice(0, 10) : 'en';

  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    timestamp: String(timestamp),
    language,
    key: apiKey,
  });

  try {
    const upstream = await fetch(
      `https://maps.googleapis.com/maps/api/timezone/json?${params.toString()}`
    );
    const data = (await upstream.json()) as {
      status?: string;
      timeZoneId?: string;
      timeZoneName?: string;
      rawOffset?: number;
      dstOffset?: number;
      errorMessage?: string;
    };

    if (data.status === 'OK') {
      res.json({
        status: 'OK',
        timeZoneId: data.timeZoneId,
        timeZoneName: data.timeZoneName,
        rawOffset: data.rawOffset ?? 0,
        dstOffset: data.dstOffset ?? 0,
      });
      return;
    }

    // Return HTTP 200 with FALLBACK_REQUIRED so clients using a Maps Demo Key
    // (which does not include Time Zone API) fall back cleanly to Place.utcOffsetMinutes
    // without triggering browser network error logs.
    res.json({
      status: 'FALLBACK_REQUIRED',
      upstreamStatus: data.status || 'UNKNOWN_ERROR',
      errorMessage:
        data.errorMessage || 'Time Zone API unavailable for current key; use Place utcOffsetMinutes fallback.',
    });
  } catch (err) {
    res.json({
      status: 'FALLBACK_REQUIRED',
      upstreamStatus: 'NETWORK_ERROR',
      errorMessage: err instanceof Error ? err.message : 'Time Zone request failed',
    });
  }
});

app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const { host, port } = parseCliArgs(process.argv.slice(2));
app.listen(port, host, () => {
  console.log(
    `Itinerary Planner server running at http://${host}:${port} (attribution: ${ATTRIBUTION_ID})`
  );
});
