import crypto from 'node:crypto';
import path from 'node:path';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import type {
  BookingRequestBody,
  ComputeRouteRequestBody,
  PlacesSearchRequestBody,
  PlacesTextSearchUpstreamResponse,
  RouteWaypointInput,
  RoutesComputeUpstreamResponse,
  TravelMode,
} from './types';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const CLINIC_CENTER = { lat: 37.7896, lng: -122.4076 };
const DEFAULT_ORIGIN = {
  name: 'Ferry Building, San Francisco, CA',
  lat: 37.7955,
  lng: -122.3937,
};
const DEFAULT_CLINIC_QUERY = '450 Sutter Dental San Francisco';
const COVERAGE_RADIUS_METERS = 3500;
const PLACEHOLDER_KEY = 'your_google_maps_api_key_here';

const PLACES_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.regularOpeningHours',
  'places.currentOpeningHours',
  'places.reviews',
  'places.photos',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.businessStatus',
].join(',');

const ROUTES_FIELD_MASK = [
  'routes.duration',
  'routes.distanceMeters',
  'routes.polyline.encodedPolyline',
  'routes.localizedValues',
].join(',');

const ALLOWED_TRAVEL_MODES = new Set<TravelMode>(['DRIVE', 'TRANSIT', 'WALK']);
const PHOTO_NAME_REGEX = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;

function getApiKey(): string {
  const raw = (process.env.GOOGLE_MAPS_API_KEY ?? '').trim();
  if (!raw || raw === PLACEHOLDER_KEY) {
    return '';
  }
  return raw;
}

function parseCliArgs(argv: string[]): { host: string; port: number } {
  let host = '127.0.0.1';
  let port = Number.parseInt(process.env.PORT ?? '3000', 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    port = 3000;
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--host' && i + 1 < argv.length) {
      const candidate = argv[i + 1].trim();
      host = candidate === 'localhost' ? 'localhost' : '127.0.0.1';
      i += 1;
    } else if (arg.startsWith('--host=')) {
      const candidate = arg.slice('--host='.length).trim();
      host = candidate === 'localhost' ? 'localhost' : '127.0.0.1';
    } else if (arg === '--port' && i + 1 < argv.length) {
      const parsed = Number.parseInt(argv[i + 1], 10);
      if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) {
        port = parsed;
      }
      i += 1;
    } else if (arg.startsWith('--port=')) {
      const parsed = Number.parseInt(arg.slice('--port='.length), 10);
      if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) {
        port = parsed;
      }
    }
  }

  return { host, port };
}

function isValidLatitude(lat: unknown): lat is number {
  return typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

function isValidLongitude(lng: unknown): lng is number {
  return typeof lng === 'number' && Number.isFinite(lng) && lng >= -180 && lng <= 180;
}

function toRoutesWaypoint(
  waypoint: unknown
): { location: { latLng: { latitude: number; longitude: number } } } | { placeId: string } | null {
  if (!waypoint || typeof waypoint !== 'object') {
    return null;
  }
  const input = waypoint as RouteWaypointInput;
  if (typeof input.placeId === 'string' && input.placeId.trim().length > 0 && input.placeId.trim().length <= 256) {
    return { placeId: input.placeId.trim() };
  }
  if (isValidLatitude(input.lat) && isValidLongitude(input.lng)) {
    return {
      location: {
        latLng: {
          latitude: input.lat,
          longitude: input.lng,
        },
      },
    };
  }
  return null;
}

const app = express();

// Security headers applied to every response
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json({ limit: '100kb' }));

const publicDir = path.resolve(__dirname, '..', 'public');
app.use(express.static(publicDir));

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(getApiKey()),
  });
});

app.get('/api/config', (_req: Request, res: Response) => {
  const apiKey = getApiKey();
  res.json({
    apiKey,
    hasApiKey: Boolean(apiKey),
    mapId: 'DEMO_MAP_ID',
    attributionId: 'gmp_git_agentsamples_v1.0.0',
    defaultClinicQuery: DEFAULT_CLINIC_QUERY,
    clinicFallbackCenter: CLINIC_CENTER,
    defaultOrigin: DEFAULT_ORIGIN,
    coverageRadiusMeters: COVERAGE_RADIUS_METERS,
  });
});

app.post('/api/places/search', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({
      error: 'GOOGLE_MAPS_API_KEY is not configured on the server.',
    });
    return;
  }

  const body = req.body as Partial<PlacesSearchRequestBody> | undefined;
  const textQuery = typeof body?.textQuery === 'string' ? body.textQuery.trim() : '';
  if (!textQuery || textQuery.length > 200) {
    res.status(400).json({
      error: 'Invalid request: textQuery must be a non-empty string (max 200 characters).',
    });
    return;
  }

  try {
    const upstreamResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': PLACES_FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery,
        languageCode: 'en',
        regionCode: 'US',
        locationBias: {
          circle: {
            center: {
              latitude: CLINIC_CENTER.lat,
              longitude: CLINIC_CENTER.lng,
            },
            radius: 8000,
          },
        },
      }),
    });

    const data = (await upstreamResponse.json()) as PlacesTextSearchUpstreamResponse;
    if (!upstreamResponse.ok) {
      res.status(upstreamResponse.status).json({
        error: data.error?.message ?? 'Places API (New) Text Search request failed.',
        status: data.error?.status ?? 'UPSTREAM_ERROR',
      });
      return;
    }

    res.json({
      places: Array.isArray(data.places) ? data.places : [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    res.status(502).json({
      error: `Failed to reach Places API (New): ${message}`,
    });
  }
});

app.get('/api/places/photo', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({
      error: 'GOOGLE_MAPS_API_KEY is not configured on the server.',
    });
    return;
  }

  const rawName = typeof req.query.name === 'string' ? req.query.name.trim() : '';
  if (!PHOTO_NAME_REGEX.test(rawName)) {
    res.status(400).json({
      error: 'Invalid photo resource name.',
    });
    return;
  }

  const rawWidth = typeof req.query.maxWidthPx === 'string' ? Number.parseInt(req.query.maxWidthPx, 10) : 640;
  const maxWidthPx = Number.isInteger(rawWidth) && rawWidth >= 1 && rawWidth <= 1600 ? rawWidth : 640;

  try {
    const mediaUrl = `https://places.googleapis.com/v1/${rawName}/media?maxWidthPx=${maxWidthPx}`;
    const upstreamResponse = await fetch(mediaUrl, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
      },
      redirect: 'follow',
    });

    if (!upstreamResponse.ok) {
      res.status(upstreamResponse.status).json({
        error: 'Failed to fetch Place photo media.',
      });
      return;
    }

    const contentType = upstreamResponse.headers.get('content-type') ?? 'image/jpeg';
    const imageBuffer = Buffer.from(await upstreamResponse.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(imageBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    res.status(502).json({
      error: `Failed to fetch Place photo media: ${message}`,
    });
  }
});

app.post('/api/routes/compute', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({
      error: 'GOOGLE_MAPS_API_KEY is not configured on the server.',
    });
    return;
  }

  const body = req.body as Partial<ComputeRouteRequestBody> | undefined;
  const originWaypoint = toRoutesWaypoint(body?.origin);
  const destinationWaypoint = toRoutesWaypoint(body?.destination);
  const rawMode = typeof body?.travelMode === 'string' ? body.travelMode.trim().toUpperCase() : '';

  if (!originWaypoint || !destinationWaypoint) {
    res.status(400).json({
      error: 'Invalid request: origin and destination must contain valid lat/lng coordinates or placeId.',
    });
    return;
  }

  if (!ALLOWED_TRAVEL_MODES.has(rawMode as TravelMode)) {
    res.status(400).json({
      error: 'Invalid request: travelMode must be DRIVE, TRANSIT, or WALK.',
    });
    return;
  }

  const travelMode = rawMode as TravelMode;
  const payload: Record<string, unknown> = {
    origin: originWaypoint,
    destination: destinationWaypoint,
    travelMode,
    languageCode: 'en-US',
    units: 'IMPERIAL',
  };

  if (travelMode === 'DRIVE') {
    payload.routingPreference = 'TRAFFIC_AWARE';
  }

  try {
    const upstreamResponse = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': ROUTES_FIELD_MASK,
      },
      body: JSON.stringify(payload),
    });

    const data = (await upstreamResponse.json()) as RoutesComputeUpstreamResponse;
    if (!upstreamResponse.ok) {
      res.status(upstreamResponse.status).json({
        error: data.error?.message ?? 'Routes API computeRoutes request failed.',
        status: data.error?.status ?? 'UPSTREAM_ERROR',
      });
      return;
    }

    res.json({
      travelMode,
      routes: Array.isArray(data.routes) ? data.routes : [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    res.status(502).json({
      error: `Failed to reach Routes API: ${message}`,
    });
  }
});

app.post('/api/bookings', (req: Request, res: Response) => {
  const body = req.body as Partial<BookingRequestBody> | undefined;

  const patientName = typeof body?.patientName === 'string' ? body.patientName.trim() : '';
  const contactEmail = typeof body?.contactEmail === 'string' ? body.contactEmail.trim() : '';
  const contactPhone = typeof body?.contactPhone === 'string' ? body.contactPhone.trim() : '';
  const specialty = typeof body?.specialty === 'string' ? body.specialty.trim() : '';
  const visitType = body?.visitType === 'home-visit' ? 'home-visit' : body?.visitType === 'in-clinic' ? 'in-clinic' : null;
  const preferredDate = typeof body?.preferredDate === 'string' ? body.preferredDate.trim() : '';
  const preferredTime = typeof body?.preferredTime === 'string' ? body.preferredTime.trim() : '';

  if (!patientName || patientName.length > 120) {
    res.status(400).json({ error: 'Please enter a valid full name (1-120 characters).' });
    return;
  }
  if (!contactEmail || !contactEmail.includes('@') || contactEmail.length > 160) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }
  if (!contactPhone || contactPhone.length < 7 || contactPhone.length > 30) {
    res.status(400).json({ error: 'Please enter a valid phone number.' });
    return;
  }
  if (!specialty || !visitType || !preferredDate || !preferredTime) {
    res.status(400).json({ error: 'Please select specialty, visit type, preferred date, and time slot.' });
    return;
  }

  // Only non-PHI scheduling metadata is handled here; never forwarded to GMP APIs.
  const confirmationId = `SF-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  res.status(201).json({
    confirmationId,
    status: 'confirmed',
    clinicName: '450 Sutter Dental Studio',
    patientName,
    specialty,
    visitType,
    preferredDate,
    preferredTime,
    createdAt: new Date().toISOString(),
  });
});

app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const { host, port } = parseCliArgs(process.argv.slice(2));
app.listen(port, host, () => {
  console.log(`Storefront server listening on http://${host}:${port}`);
});
