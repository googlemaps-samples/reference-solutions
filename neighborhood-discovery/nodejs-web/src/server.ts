import path from 'node:path';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';

// Load .env from workspace root or current working directory
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const DEFAULT_CENTER = { lat: 51.5118, lng: -0.128 } as const;
const DEFAULT_ZOOM = 13;
const DEFAULT_RADIUS_METERS = 5000;
const ALLOWED_CATEGORIES = new Set(['restaurant', 'cafe', 'museum', 'park']);

const SEARCH_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.types',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.regularOpeningHours',
  'places.photos',
  'places.googleMapsUri',
].join(',');

const DETAILS_FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'primaryType',
  'primaryTypeDisplayName',
  'types',
  'rating',
  'userRatingCount',
  'priceLevel',
  'regularOpeningHours',
  'reviews',
  'photos',
  'websiteUri',
  'internationalPhoneNumber',
  'googleMapsUri',
].join(',');

interface CliOptions {
  host: string;
  port: number;
}

function parseCliArgs(argv: string[]): CliOptions {
  let rawHost = process.env.HOST ?? '127.0.0.1';
  let rawPort = process.env.PORT ?? '3000';

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--host' && i + 1 < argv.length) {
      rawHost = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--host=')) {
      rawHost = arg.slice('--host='.length);
    } else if (arg === '--port' && i + 1 < argv.length) {
      rawPort = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--port=')) {
      rawPort = arg.slice('--port='.length);
    }
  }

  // Strictly enforce loopback binding (never bind to 0.0.0.0)
  const host = rawHost === 'localhost' || rawHost === '127.0.0.1' ? rawHost : '127.0.0.1';
  const parsedPort = Number.parseInt(rawPort, 10);
  const port = Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535 ? parsedPort : 3000;

  return { host, port };
}

function getApiKey(): string {
  return (process.env.GOOGLE_MAPS_API_KEY ?? '').trim();
}

function isValidLatLng(lat: unknown, lng: unknown): lat is number {
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

function sanitizeUpstreamError(status: number, bodyText: string): string {
  try {
    const parsed = JSON.parse(bodyText) as { error?: { message?: string }; error_message?: string };
    const message = parsed.error?.message ?? parsed.error_message;
    if (message && typeof message === 'string') {
      return message;
    }
  } catch {
    // Ignore non-JSON error body
  }
  return `Upstream Google Maps Platform request failed with status ${status}.`;
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

// Mandatory security headers on all responses
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    apiKeyConfigured: Boolean(getApiKey()),
  });
});

app.get('/api/config', (_req: Request, res: Response) => {
  res.json({
    apiKey: getApiKey(),
    defaultCenter: DEFAULT_CENTER,
    defaultZoom: DEFAULT_ZOOM,
    radiusMeters: DEFAULT_RADIUS_METERS,
  });
});

app.post('/api/places/nearby', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({
      error: 'GOOGLE_MAPS_API_KEY is not configured. Set it in .env to enable live Places discovery.',
    });
    return;
  }

  const body = (req.body ?? {}) as {
    lat?: unknown;
    lng?: unknown;
    radius?: unknown;
    includedTypes?: unknown;
    maxResultCount?: unknown;
  };

  const lat = body.lat ?? DEFAULT_CENTER.lat;
  const lng = body.lng ?? DEFAULT_CENTER.lng;
  if (!isValidLatLng(lat, lng) || typeof lat !== 'number' || typeof lng !== 'number') {
    res.status(400).json({ error: 'Invalid lat/lng coordinates.' });
    return;
  }

  const rawRadius = typeof body.radius === 'number' && Number.isFinite(body.radius) ? body.radius : DEFAULT_RADIUS_METERS;
  const radius = Math.min(Math.max(rawRadius, 100), 50000);

  let includedTypes = Array.from(ALLOWED_CATEGORIES);
  if (Array.isArray(body.includedTypes) && body.includedTypes.length > 0) {
    const filtered = body.includedTypes.filter(
      (item): item is string => typeof item === 'string' && ALLOWED_CATEGORIES.has(item.trim().toLowerCase())
    );
    if (filtered.length === 0) {
      res.status(400).json({ error: 'includedTypes must contain valid categories: restaurant, cafe, museum, park.' });
      return;
    }
    includedTypes = filtered.map((t) => t.trim().toLowerCase());
  }

  const rawMax = typeof body.maxResultCount === 'number' && Number.isInteger(body.maxResultCount) ? body.maxResultCount : 20;
  const maxResultCount = Math.min(Math.max(rawMax, 1), 20);

  try {
    const upstreamResponse = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': SEARCH_FIELD_MASK,
      },
      body: JSON.stringify({
        includedTypes,
        maxResultCount,
        rankPreference: 'POPULARITY',
        languageCode: 'en',
        regionCode: 'GB',
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius,
          },
        },
      }),
    });

    const responseText = await upstreamResponse.text();
    if (!upstreamResponse.ok) {
      res.status(upstreamResponse.status).json({
        error: sanitizeUpstreamError(upstreamResponse.status, responseText),
      });
      return;
    }

    const data = JSON.parse(responseText) as { places?: unknown[] };
    res.json({ places: Array.isArray(data.places) ? data.places : [] });
  } catch (error) {
    console.error('Nearby search proxy error:', error);
    res.status(502).json({ error: 'Failed to reach Places API (New) Nearby Search.' });
  }
});

app.post('/api/places/search', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({
      error: 'GOOGLE_MAPS_API_KEY is not configured. Set it in .env to enable live Places text search.',
    });
    return;
  }

  const body = (req.body ?? {}) as {
    textQuery?: unknown;
    lat?: unknown;
    lng?: unknown;
    radius?: unknown;
    includedType?: unknown;
    pageSize?: unknown;
  };

  if (typeof body.textQuery !== 'string' || body.textQuery.trim().length === 0 || body.textQuery.trim().length > 200) {
    res.status(400).json({ error: 'textQuery must be a non-empty string up to 200 characters.' });
    return;
  }

  const lat = body.lat ?? DEFAULT_CENTER.lat;
  const lng = body.lng ?? DEFAULT_CENTER.lng;
  if (!isValidLatLng(lat, lng) || typeof lat !== 'number' || typeof lng !== 'number') {
    res.status(400).json({ error: 'Invalid lat/lng coordinates.' });
    return;
  }

  const rawRadius = typeof body.radius === 'number' && Number.isFinite(body.radius) ? body.radius : DEFAULT_RADIUS_METERS;
  const radius = Math.min(Math.max(rawRadius, 100), 50000);
  const rawPageSize = typeof body.pageSize === 'number' && Number.isInteger(body.pageSize) ? body.pageSize : 20;
  const pageSize = Math.min(Math.max(rawPageSize, 1), 20);

  const payload: Record<string, unknown> = {
    textQuery: body.textQuery.trim(),
    pageSize,
    languageCode: 'en',
    regionCode: 'GB',
    locationBias: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius,
      },
    },
  };

  if (typeof body.includedType === 'string' && ALLOWED_CATEGORIES.has(body.includedType.trim().toLowerCase())) {
    payload.includedType = body.includedType.trim().toLowerCase();
    payload.strictTypeFiltering = true;
  }

  try {
    const upstreamResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': SEARCH_FIELD_MASK,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await upstreamResponse.text();
    if (!upstreamResponse.ok) {
      res.status(upstreamResponse.status).json({
        error: sanitizeUpstreamError(upstreamResponse.status, responseText),
      });
      return;
    }

    const data = JSON.parse(responseText) as { places?: unknown[] };
    res.json({ places: Array.isArray(data.places) ? data.places : [] });
  } catch (error) {
    console.error('Text search proxy error:', error);
    res.status(502).json({ error: 'Failed to reach Places API (New) Text Search.' });
  }
});

app.get('/api/places/details', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({
      error: 'GOOGLE_MAPS_API_KEY is not configured. Set it in .env to fetch live Place Details.',
    });
    return;
  }

  const rawPlaceId = typeof req.query.placeId === 'string' ? req.query.placeId.trim() : '';
  const cleanPlaceId = rawPlaceId.startsWith('places/') ? rawPlaceId.slice('places/'.length) : rawPlaceId;
  if (!/^[A-Za-z0-9_-]{3,256}$/.test(cleanPlaceId)) {
    res.status(400).json({ error: 'Invalid or missing placeId query parameter.' });
    return;
  }

  try {
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(cleanPlaceId)}?languageCode=en&regionCode=GB`;
    const upstreamResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': DETAILS_FIELD_MASK,
      },
    });

    const responseText = await upstreamResponse.text();
    if (!upstreamResponse.ok) {
      res.status(upstreamResponse.status).json({
        error: sanitizeUpstreamError(upstreamResponse.status, responseText),
      });
      return;
    }

    const place = JSON.parse(responseText) as Record<string, unknown>;
    res.json({ place });
  } catch (error) {
    console.error('Place details proxy error:', error);
    res.status(502).json({ error: 'Failed to reach Places API (New) Place Details.' });
  }
});

app.get('/api/places/photo', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({ error: 'GOOGLE_MAPS_API_KEY is not configured.' });
    return;
  }

  const photoName = typeof req.query.name === 'string' ? req.query.name.trim() : '';
  if (!/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(photoName)) {
    res.status(400).json({ error: 'Invalid photo resource name.' });
    return;
  }

  const rawWidth = typeof req.query.maxWidthPx === 'string' ? Number.parseInt(req.query.maxWidthPx, 10) : 720;
  const maxWidthPx = Number.isInteger(rawWidth) ? Math.min(Math.max(rawWidth, 120), 1600) : 720;

  try {
    const mediaUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&skipHttpRedirect=true`;
    const upstreamResponse = await fetch(mediaUrl, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
      },
    });

    if (!upstreamResponse.ok) {
      res.status(upstreamResponse.status).json({ error: 'Failed to resolve Place photo.' });
      return;
    }

    const data = (await upstreamResponse.json()) as { photoUri?: string };
    if (typeof data.photoUri === 'string' && data.photoUri.startsWith('https://')) {
      res.redirect(302, data.photoUri);
      return;
    }

    res.status(404).json({ error: 'Photo URI not available.' });
  } catch (error) {
    console.error('Place photo proxy error:', error);
    res.status(502).json({ error: 'Failed to reach Place Photos (New) endpoint.' });
  }
});

app.get('/api/geocode', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({
      error: 'GOOGLE_MAPS_API_KEY is not configured. Set it in .env to enable Geocoding.',
    });
    return;
  }

  const address = typeof req.query.address === 'string' ? req.query.address.trim() : '';
  const latParam = typeof req.query.lat === 'string' ? Number.parseFloat(req.query.lat) : Number.NaN;
  const lngParam = typeof req.query.lng === 'string' ? Number.parseFloat(req.query.lng) : Number.NaN;

  const params = new URLSearchParams({ key: apiKey, language: 'en' });

  if (address.length > 0) {
    if (address.length > 250) {
      res.status(400).json({ error: 'address query parameter is too long.' });
      return;
    }
    params.set('address', address);
    params.set('region', 'gb');
  } else if (isValidLatLng(latParam, lngParam)) {
    params.set('latlng', `${latParam},${lngParam}`);
  } else {
    res.status(400).json({ error: 'Provide either a non-empty address or valid lat and lng query parameters.' });
    return;
  }

  try {
    const upstreamResponse = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`);
    if (!upstreamResponse.ok) {
      res.status(upstreamResponse.status).json({ error: 'Geocoding API HTTP error.' });
      return;
    }

    const payload = (await upstreamResponse.json()) as {
      status: string;
      error_message?: string;
      results?: Array<{
        formatted_address?: string;
        place_id?: string;
        geometry?: {
          location?: { lat: number; lng: number };
          location_type?: string;
        };
        address_components?: unknown[];
        plus_code?: unknown;
        types?: string[];
      }>;
    };

    if (payload.status !== 'OK' && payload.status !== 'ZERO_RESULTS') {
      res.status(400).json({
        status: payload.status,
        error: payload.error_message ?? `Geocoding failed with status ${payload.status}.`,
      });
      return;
    }

    const projectedResults = (payload.results ?? []).map((item) => ({
      formatted_address: item.formatted_address ?? '',
      place_id: item.place_id ?? '',
      geometry: {
        location: item.geometry?.location ?? null,
        location_type: item.geometry?.location_type ?? null,
      },
      address_components: item.address_components ?? [],
      plus_code: item.plus_code ?? null,
      types: item.types ?? [],
    }));

    res.json({
      status: payload.status,
      results: projectedResults,
    });
  } catch (error) {
    console.error('Geocode proxy error:', error);
    res.status(502).json({ error: 'Failed to reach Geocoding API.' });
  }
});

const publicDir = path.resolve(__dirname, '..', 'public');
app.use(express.static(publicDir));

app.get('*', (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api/')) {
    next();
    return;
  }
  res.sendFile(path.join(publicDir, 'index.html'));
});

const { host, port } = parseCliArgs(process.argv.slice(2));
app.listen(port, host, () => {
  console.log(`Hyperlocal Neighborhood Directory & Spot Mapper listening on http://${host}:${port}`);
});
