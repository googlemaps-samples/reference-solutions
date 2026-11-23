import path from 'node:path';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';

dotenv.config();

interface LatLngPoint {
  lat: number;
  lng: number;
}

interface NearbySearchBody {
  lat?: unknown;
  lng?: unknown;
  radiusMeters?: unknown;
  includedTypes?: unknown;
  maxResultCount?: unknown;
  rankPreference?: unknown;
}

interface SearchTextBody {
  textQuery?: unknown;
  lat?: unknown;
  lng?: unknown;
  radiusMeters?: unknown;
  includedType?: unknown;
  pageSize?: unknown;
}

interface RouteMatrixBody {
  origin?: unknown;
  destinations?: unknown;
}

interface ComputeRouteBody {
  origin?: unknown;
  destination?: unknown;
}

const PLACES_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.primaryType,places.types,places.regularOpeningHours,places.evChargeOptions,places.nationalPhoneNumber,places.googleMapsUri';

const ROUTE_MATRIX_FIELD_MASK =
  'originIndex,destinationIndex,status,condition,distanceMeters,duration';

const COMPUTE_ROUTES_FIELD_MASK =
  'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.viewport,routes.legs.duration,routes.legs.distanceMeters,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration';

const INITIAL_CENTER: LatLngPoint = {
  lat: 47.6062,
  lng: -122.3321,
};

function getApiKey(): string {
  const raw = process.env.GOOGLE_MAPS_API_KEY ?? '';
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'your_google_maps_api_key_here') {
    return '';
  }
  return trimmed;
}

function isValidLat(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLng(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -180 && value <= 180;
}

function parseLatLngPoint(value: unknown): LatLngPoint | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  if (!isValidLat(candidate.lat) || !isValidLng(candidate.lng)) {
    return null;
  }
  return { lat: candidate.lat, lng: candidate.lng };
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

function parseCliArgs(argv: string[]): { host: string; port: number } {
  let host = '127.0.0.1';
  let port = Number(process.env.PORT ?? '3000');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    port = 3000;
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--host' && i + 1 < argv.length) {
      host = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--host=')) {
      host = arg.slice('--host='.length);
    } else if (arg === '--port' && i + 1 < argv.length) {
      const parsed = Number(argv[i + 1]);
      if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535) {
        port = parsed;
      }
      i += 1;
    } else if (arg.startsWith('--port=')) {
      const parsed = Number(arg.slice('--port='.length));
      if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 65535) {
        port = parsed;
      }
    }
  }

  // Strictly bind to loopback only (never 0.0.0.0)
  const safeHost = host === 'localhost' ? 'localhost' : '127.0.0.1';
  return { host: safeHost, port };
}

async function fetchJsonWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 15000
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    let parsed: unknown = {};
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { raw: text };
      }
    }
    return { ok: response.ok, status: response.status, data: parsed };
  } finally {
    clearTimeout(timer);
  }
}

export function createApp(): express.Express {
  const app = express();
  const publicDir = path.resolve(__dirname, '../public');

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      configured: Boolean(getApiKey()),
      service: 'ev-charging-map-and-dispatch-nodejs-web',
    });
  });

  app.get('/api/config', (_req: Request, res: Response) => {
    const apiKey = getApiKey();
    res.json({
      configured: Boolean(apiKey),
      mapsApiKey: apiKey,
      initialCenter: INITIAL_CENTER,
      initialZoom: 12,
      attributionId: 'gmp_git_agentsamples_v1.0.0',
    });
  });

  app.post('/api/places/nearby', async (req: Request, res: Response) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      res.status(503).json({ error: 'GOOGLE_MAPS_API_KEY is not configured on the server.' });
      return;
    }

    const body = (req.body ?? {}) as NearbySearchBody;
    if (!isValidLat(body.lat) || !isValidLng(body.lng)) {
      res.status(400).json({ error: 'Valid numeric lat and lng are required.' });
      return;
    }

    const radiusMeters = clampNumber(body.radiusMeters, 10000, 500, 50000);
    const maxResultCount = Math.round(clampNumber(body.maxResultCount, 15, 1, 20));
    const rankPreference =
      body.rankPreference === 'POPULARITY' ? 'POPULARITY' : 'DISTANCE';

    const typePattern = /^[a-z0-9_]{2,64}$/;
    const rawTypes = Array.isArray(body.includedTypes) ? body.includedTypes : [];
    const includedTypes = rawTypes
      .filter((item): item is string => typeof item === 'string' && typePattern.test(item))
      .slice(0, 10);

    const effectiveTypes =
      includedTypes.length > 0
        ? includedTypes
        : ['electric_vehicle_charging_station', 'car_repair'];

    const payload = {
      includedTypes: effectiveTypes,
      maxResultCount,
      rankPreference,
      languageCode: 'en',
      regionCode: 'US',
      locationRestriction: {
        circle: {
          center: {
            latitude: body.lat,
            longitude: body.lng,
          },
          radius: radiusMeters,
        },
      },
    };

    try {
      const upstream = await fetchJsonWithTimeout(
        'https://places.googleapis.com/v1/places:searchNearby',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': PLACES_FIELD_MASK,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!upstream.ok) {
        res.status(upstream.status).json({
          error: 'Places Nearby Search request failed.',
          details: upstream.data,
        });
        return;
      }

      res.json(upstream.data);
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Upstream Places Nearby Search failed.',
      });
    }
  });

  app.post('/api/places/search-text', async (req: Request, res: Response) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      res.status(503).json({ error: 'GOOGLE_MAPS_API_KEY is not configured on the server.' });
      return;
    }

    const body = (req.body ?? {}) as SearchTextBody;
    if (typeof body.textQuery !== 'string' || body.textQuery.trim().length === 0) {
      res.status(400).json({ error: 'A non-empty textQuery string is required.' });
      return;
    }

    const textQuery = body.textQuery.trim().slice(0, 200);
    const pageSize = Math.round(clampNumber(body.pageSize, 15, 1, 20));
    const lat = isValidLat(body.lat) ? body.lat : INITIAL_CENTER.lat;
    const lng = isValidLng(body.lng) ? body.lng : INITIAL_CENTER.lng;
    const radiusMeters = clampNumber(body.radiusMeters, 10000, 500, 50000);

    const payload: Record<string, unknown> = {
      textQuery,
      pageSize,
      languageCode: 'en',
      regionCode: 'US',
      locationBias: {
        circle: {
          center: {
            latitude: lat,
            longitude: lng,
          },
          radius: radiusMeters,
        },
      },
    };

    if (typeof body.includedType === 'string' && /^[a-z0-9_]{2,64}$/.test(body.includedType)) {
      payload.includedType = body.includedType;
    }

    try {
      const upstream = await fetchJsonWithTimeout(
        'https://places.googleapis.com/v1/places:searchText',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': PLACES_FIELD_MASK,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!upstream.ok) {
        res.status(upstream.status).json({
          error: 'Places Text Search request failed.',
          details: upstream.data,
        });
        return;
      }

      res.json(upstream.data);
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Upstream Places Text Search failed.',
      });
    }
  });

  app.post('/api/routes/matrix', async (req: Request, res: Response) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      res.status(503).json({ error: 'GOOGLE_MAPS_API_KEY is not configured on the server.' });
      return;
    }

    const body = (req.body ?? {}) as RouteMatrixBody;
    const origin = parseLatLngPoint(body.origin);
    if (!origin) {
      res.status(400).json({ error: 'Valid origin { lat, lng } is required.' });
      return;
    }

    if (!Array.isArray(body.destinations) || body.destinations.length === 0) {
      res.status(400).json({ error: 'At least one destination { lat, lng } is required.' });
      return;
    }

    const destinations = body.destinations
      .slice(0, 25)
      .map(parseLatLngPoint)
      .filter((pt): pt is LatLngPoint => pt !== null);

    if (destinations.length === 0) {
      res.status(400).json({ error: 'No valid destinations were provided.' });
      return;
    }

    const payload = {
      origins: [
        {
          waypoint: {
            location: {
              latLng: {
                latitude: origin.lat,
                longitude: origin.lng,
              },
            },
          },
        },
      ],
      destinations: destinations.map((dest) => ({
        waypoint: {
          location: {
            latLng: {
              latitude: dest.lat,
              longitude: dest.lng,
            },
          },
        },
      })),
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      languageCode: 'en-US',
      units: 'METRIC',
    };

    try {
      const upstream = await fetchJsonWithTimeout(
        'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': ROUTE_MATRIX_FIELD_MASK,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!upstream.ok) {
        res.status(upstream.status).json({
          error: 'Routes Compute Route Matrix request failed.',
          details: upstream.data,
        });
        return;
      }

      const elements = Array.isArray(upstream.data) ? upstream.data : [];
      res.json({ elements });
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Upstream Route Matrix request failed.',
      });
    }
  });

  app.post('/api/routes/compute', async (req: Request, res: Response) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      res.status(503).json({ error: 'GOOGLE_MAPS_API_KEY is not configured on the server.' });
      return;
    }

    const body = (req.body ?? {}) as ComputeRouteBody;
    const origin = parseLatLngPoint(body.origin);
    const destination = parseLatLngPoint(body.destination);

    if (!origin || !destination) {
      res.status(400).json({ error: 'Valid origin and destination { lat, lng } are required.' });
      return;
    }

    const payload = {
      origin: {
        location: {
          latLng: {
            latitude: origin.lat,
            longitude: origin.lng,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.lat,
            longitude: destination.lng,
          },
        },
      },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      computeAlternativeRoutes: false,
      languageCode: 'en-US',
      units: 'METRIC',
    };

    try {
      const upstream = await fetchJsonWithTimeout(
        'https://routes.googleapis.com/directions/v2:computeRoutes',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': COMPUTE_ROUTES_FIELD_MASK,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!upstream.ok) {
        res.status(upstream.status).json({
          error: 'Routes Compute Routes request failed.',
          details: upstream.data,
        });
        return;
      }

      res.json(upstream.data);
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Upstream Compute Routes request failed.',
      });
    }
  });

  app.get('/api/geocode/reverse', async (req: Request, res: Response) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      res.status(503).json({ error: 'GOOGLE_MAPS_API_KEY is not configured on the server.' });
      return;
    }

    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!isValidLat(lat) || !isValidLng(lng)) {
      res.status(400).json({ error: 'Valid query parameters lat and lng are required.' });
      return;
    }

    try {
      const filteredParams = new URLSearchParams({
        latlng: `${lat},${lng}`,
        result_type: 'street_address|premise|route',
        language: 'en',
        key: apiKey,
      });

      let upstream = await fetchJsonWithTimeout(
        `https://maps.googleapis.com/maps/api/geocode/json?${filteredParams.toString()}`,
        { method: 'GET' }
      );

      let payload = upstream.data as {
        status?: string;
        results?: Array<{ formatted_address?: string; place_id?: string }>;
        error_message?: string;
      };

      if (upstream.ok && payload.status === 'ZERO_RESULTS') {
        const fallbackParams = new URLSearchParams({
          latlng: `${lat},${lng}`,
          language: 'en',
          key: apiKey,
        });
        upstream = await fetchJsonWithTimeout(
          `https://maps.googleapis.com/maps/api/geocode/json?${fallbackParams.toString()}`,
          { method: 'GET' }
        );
        payload = upstream.data as typeof payload;
      }

      if (!upstream.ok) {
        res.status(upstream.status).json({
          error: 'Geocoding reverse lookup failed.',
          details: payload,
        });
        return;
      }

      const first = Array.isArray(payload.results) && payload.results.length > 0
        ? payload.results[0]
        : null;

      res.json({
        status: payload.status ?? 'OK',
        formattedAddress: first?.formatted_address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        placeId: first?.place_id ?? null,
        results: payload.results ?? [],
      });
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Upstream Geocoding reverse request failed.',
      });
    }
  });

  app.use(express.static(publicDir, { index: 'index.html' }));

  app.use((req: Request, res: Response) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'API endpoint not found.' });
      return;
    }
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  return app;
}

if (require.main === module) {
  const { host, port } = parseCliArgs(process.argv.slice(2));
  const app = createApp();
  app.listen(port, host, () => {
    console.log(`EV Roadside Dispatch server listening at http://${host}:${port}`);
  });
}
