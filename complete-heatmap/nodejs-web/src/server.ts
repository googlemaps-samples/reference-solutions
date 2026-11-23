import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');

const DEFAULT_CENTER = { lat: 25.7743, lng: -80.1937 };
const DEFAULT_ZOOM = 13;
const MAP_ID = 'DEMO_MAP_ID';
const ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';

const PLACES_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.businessStatus';

const ROUTES_FIELD_MASK =
  'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.routeLabels,routes.legs.duration,routes.legs.distanceMeters,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters';

interface LatLngInput {
  lat: number;
  lng: number;
}

interface IntermediateWaypointInput extends LatLngInput {
  via?: boolean;
}

interface PlacesSearchBody {
  textQuery?: unknown;
  lat?: unknown;
  lng?: unknown;
  radiusMeters?: unknown;
  maxResultCount?: unknown;
}

interface ComputeRouteBody {
  origin?: unknown;
  destination?: unknown;
  intermediates?: unknown;
  travelMode?: unknown;
}

function getApiKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim() ?? '';
  if (!key || key === 'your_google_maps_api_key_here') {
    return '';
  }
  return key;
}

function parseCoordinate(value: unknown, min: number, max: number): number | null {
  const num = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(num) || num < min || num > max) {
    return null;
  }
  return num;
}

function parseLatLng(obj: unknown): LatLngInput | null {
  if (!obj || typeof obj !== 'object') {
    return null;
  }
  const record = obj as Record<string, unknown>;
  const lat = parseCoordinate(record.lat, -90, 90);
  const lng = parseCoordinate(record.lng, -180, 180);
  if (lat === null || lng === null) {
    return null;
  }
  return { lat, lng };
}

function parseCliArgs(argv: string[]): { host: string; port: number } {
  let host = '127.0.0.1';
  let port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    port = 3000;
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--host' && argv[i + 1]) {
      const candidate = argv[i + 1].trim();
      if (candidate === '127.0.0.1' || candidate === 'localhost') {
        host = '127.0.0.1';
      }
      i += 1;
    } else if (arg.startsWith('--host=')) {
      const candidate = arg.slice('--host='.length).trim();
      if (candidate === '127.0.0.1' || candidate === 'localhost') {
        host = '127.0.0.1';
      }
    } else if (arg === '--port' && argv[i + 1]) {
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

  return { host, port };
}

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.static(PUBLIC_DIR));

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    status: 'healthy',
    service: 'complete-heatmap-nodejs-web',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/config', (_req: Request, res: Response) => {
  const apiKey = getApiKey();
  res.json({
    hasApiKey: Boolean(apiKey),
    mapsApiKey: apiKey,
    mapId: MAP_ID,
    attributionId: ATTRIBUTION_ID,
    defaultCenter: DEFAULT_CENTER,
    defaultZoom: DEFAULT_ZOOM,
  });
});

app.post('/api/places/search', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.json({
      ok: false,
      error: 'GOOGLE_MAPS_API_KEY is not configured in .env.',
      places: [],
    });
    return;
  }

  const body = (req.body ?? {}) as PlacesSearchBody;
  const textQuery = typeof body.textQuery === 'string' ? body.textQuery.trim() : '';
  if (!textQuery || textQuery.length > 200) {
    res.status(400).json({
      ok: false,
      error: 'textQuery must be a non-empty string up to 200 characters.',
      places: [],
    });
    return;
  }

  const lat = parseCoordinate(body.lat ?? DEFAULT_CENTER.lat, -90, 90);
  const lng = parseCoordinate(body.lng ?? DEFAULT_CENTER.lng, -180, 180);
  if (lat === null || lng === null) {
    res.status(400).json({
      ok: false,
      error: 'Invalid lat/lng locationBias coordinates.',
      places: [],
    });
    return;
  }

  const radiusCandidate = Number(body.radiusMeters ?? 12000);
  const radius =
    Number.isFinite(radiusCandidate) && radiusCandidate >= 500 && radiusCandidate <= 50000
      ? radiusCandidate
      : 12000;

  const maxCountCandidate = Number(body.maxResultCount ?? 12);
  const maxResultCount =
    Number.isInteger(maxCountCandidate) && maxCountCandidate >= 1 && maxCountCandidate <= 20
      ? maxCountCandidate
      : 12;

  try {
    const upstream = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': PLACES_FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery,
        maxResultCount,
        languageCode: 'en',
        regionCode: 'US',
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius,
          },
        },
      }),
      signal: AbortSignal.timeout(12000),
    });

    const data = (await upstream.json()) as {
      places?: unknown[];
      error?: { message?: string; status?: string };
    };

    if (!upstream.ok) {
      res.json({
        ok: false,
        upstreamStatus: upstream.status,
        error: data.error?.message ?? 'Places API (New) request failed.',
        places: [],
      });
      return;
    }

    res.json({
      ok: true,
      places: Array.isArray(data.places) ? data.places : [],
    });
  } catch (err) {
    res.json({
      ok: false,
      error: err instanceof Error ? err.message : 'Unable to reach Places API (New).',
      places: [],
    });
  }
});

app.post('/api/routes/compute', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.json({
      ok: false,
      error: 'GOOGLE_MAPS_API_KEY is not configured in .env.',
      routes: [],
    });
    return;
  }

  const body = (req.body ?? {}) as ComputeRouteBody;
  const origin = parseLatLng(body.origin);
  const destination = parseLatLng(body.destination);
  if (!origin || !destination) {
    res.status(400).json({
      ok: false,
      error: 'Valid origin {lat, lng} and destination {lat, lng} are required.',
      routes: [],
    });
    return;
  }

  const allowedModes = new Set(['DRIVE', 'WALK', 'BICYCLE', 'TWO_WHEELER']);
  const travelMode =
    typeof body.travelMode === 'string' && allowedModes.has(body.travelMode)
      ? body.travelMode
      : 'DRIVE';

  const intermediates: IntermediateWaypointInput[] = [];
  if (Array.isArray(body.intermediates)) {
    if (body.intermediates.length > 5) {
      res.status(400).json({
        ok: false,
        error: 'At most 5 intermediate waypoints are supported.',
        routes: [],
      });
      return;
    }
    for (const item of body.intermediates) {
      const parsed = parseLatLng(item);
      if (!parsed) {
        res.status(400).json({
          ok: false,
          error: 'Each intermediate waypoint must contain valid lat/lng coordinates.',
          routes: [],
        });
        return;
      }
      const via =
        typeof (item as Record<string, unknown>).via === 'boolean'
          ? ((item as Record<string, unknown>).via as boolean)
          : true;
      intermediates.push({ ...parsed, via });
    }
  }

  const requestPayload: Record<string, unknown> = {
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
    polylineQuality: 'HIGH_QUALITY',
    languageCode: 'en-US',
    units: 'IMPERIAL',
  };

  if (travelMode === 'DRIVE' || travelMode === 'TWO_WHEELER') {
    requestPayload.routingPreference = 'TRAFFIC_AWARE';
  }

  if (intermediates.length > 0) {
    requestPayload.intermediates = intermediates.map((pt) => ({
      location: {
        latLng: { latitude: pt.lat, longitude: pt.lng },
      },
      via: pt.via !== false,
    }));
  }

  try {
    const upstream = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': ROUTES_FIELD_MASK,
      },
      body: JSON.stringify(requestPayload),
      signal: AbortSignal.timeout(12000),
    });

    const data = (await upstream.json()) as {
      routes?: unknown[];
      error?: { message?: string; status?: string };
    };

    if (!upstream.ok) {
      res.json({
        ok: false,
        upstreamStatus: upstream.status,
        error: data.error?.message ?? 'Routes API request failed.',
        routes: [],
      });
      return;
    }

    res.json({
      ok: true,
      routes: Array.isArray(data.routes) ? data.routes : [],
    });
  } catch (err) {
    res.json({
      ok: false,
      error: err instanceof Error ? err.message : 'Unable to reach Routes API.',
      routes: [],
    });
  }
});

app.get('/api/geocode/reverse', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.json({
      ok: false,
      error: 'GOOGLE_MAPS_API_KEY is not configured in .env.',
    });
    return;
  }

  const lat = parseCoordinate(req.query.lat, -90, 90);
  const lng = parseCoordinate(req.query.lng, -180, 180);
  if (lat === null || lng === null) {
    res.status(400).json({
      ok: false,
      error: 'Valid lat and lng query parameters are required.',
    });
    return;
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${lat},${lng}`);
    url.searchParams.set('key', apiKey);

    const upstream = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = (await upstream.json()) as {
      status?: string;
      error_message?: string;
      results?: Array<{
        formatted_address?: string;
        place_id?: string;
        types?: string[];
      }>;
    };

    if (!upstream.ok || (data.status !== 'OK' && data.status !== 'ZERO_RESULTS')) {
      res.json({
        ok: false,
        status: data.status ?? String(upstream.status),
        error: data.error_message ?? 'Geocoding API reverse lookup failed.',
      });
      return;
    }

    const primary = data.results?.[0];
    res.json({
      ok: true,
      status: data.status,
      formattedAddress:
        primary?.formatted_address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)} (Miami Coastal Zone)`,
      placeId: primary?.place_id ?? null,
    });
  } catch (err) {
    res.json({
      ok: false,
      error: err instanceof Error ? err.message : 'Unable to reach Geocoding API.',
    });
  }
});

app.get('/api/elevation', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.json({
      ok: false,
      error: 'GOOGLE_MAPS_API_KEY is not configured in .env.',
    });
    return;
  }

  const lat = parseCoordinate(req.query.lat, -90, 90);
  const lng = parseCoordinate(req.query.lng, -180, 180);
  if (lat === null || lng === null) {
    res.status(400).json({
      ok: false,
      error: 'Valid lat and lng query parameters are required.',
    });
    return;
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/elevation/json');
    url.searchParams.set('locations', `${lat},${lng}`);
    url.searchParams.set('key', apiKey);

    const upstream = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = (await upstream.json()) as {
      status?: string;
      error_message?: string;
      results?: Array<{
        elevation?: number;
        resolution?: number;
        location?: { lat: number; lng: number };
      }>;
    };

    if (!upstream.ok || data.status !== 'OK' || !data.results?.length) {
      res.json({
        ok: false,
        status: data.status ?? String(upstream.status),
        error: data.error_message ?? 'Elevation API lookup unavailable for this key.',
      });
      return;
    }

    const first = data.results[0];
    res.json({
      ok: true,
      elevationMeters: typeof first.elevation === 'number' ? first.elevation : null,
      resolutionMeters: typeof first.resolution === 'number' ? first.resolution : null,
      location: first.location ?? { lat, lng },
    });
  } catch (err) {
    res.json({
      ok: false,
      error: err instanceof Error ? err.message : 'Unable to reach Elevation API.',
    });
  }
});

app.get('/api/weather/current', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.json({
      ok: false,
      error: 'GOOGLE_MAPS_API_KEY is not configured in .env.',
    });
    return;
  }

  const lat = parseCoordinate(req.query.lat, -90, 90);
  const lng = parseCoordinate(req.query.lng, -180, 180);
  if (lat === null || lng === null) {
    res.status(400).json({
      ok: false,
      error: 'Valid lat and lng query parameters are required.',
    });
    return;
  }

  try {
    const url = new URL('https://weather.googleapis.com/v1/currentConditions:lookup');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('location.latitude', String(lat));
    url.searchParams.set('location.longitude', String(lng));
    url.searchParams.set('unitsSystem', 'METRIC');
    url.searchParams.set('languageCode', 'en');

    const upstream = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = (await upstream.json()) as {
      currentTime?: string;
      weatherCondition?: {
        description?: { text?: string };
        type?: string;
      };
      temperature?: { degrees?: number; unit?: string };
      precipitation?: {
        probability?: { percent?: number; type?: string };
        qpf?: { quantity?: number; unit?: string };
      };
      wind?: {
        direction?: { degrees?: number; cardinal?: string };
        speed?: { value?: number; unit?: string };
        gust?: { value?: number; unit?: string };
      };
      thunderstormProbability?: number;
      relativeHumidity?: number;
      error?: { message?: string; status?: string };
    };

    if (!upstream.ok) {
      res.json({
        ok: false,
        upstreamStatus: upstream.status,
        error: data.error?.message ?? 'Weather API request failed.',
      });
      return;
    }

    res.json({
      ok: true,
      currentTime: data.currentTime ?? null,
      conditionText: data.weatherCondition?.description?.text ?? 'Unknown',
      conditionType: data.weatherCondition?.type ?? 'UNKNOWN',
      temperatureC: data.temperature?.degrees ?? null,
      relativeHumidity: data.relativeHumidity ?? null,
      thunderstormProbability: data.thunderstormProbability ?? null,
      windSpeedKmh: data.wind?.speed?.value ?? null,
      windGustKmh: data.wind?.gust?.value ?? null,
      windDirectionCardinal: data.wind?.direction?.cardinal ?? null,
      windDirectionDegrees: data.wind?.direction?.degrees ?? null,
      precipPercent: data.precipitation?.probability?.percent ?? null,
      precipType: data.precipitation?.probability?.type ?? null,
      precipQpfMm: data.precipitation?.qpf?.quantity ?? null,
    });
  } catch (err) {
    res.json({
      ok: false,
      error: err instanceof Error ? err.message : 'Unable to reach Weather API.',
    });
  }
});

app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

const { host, port } = parseCliArgs(process.argv.slice(2));
app.listen(port, host, () => {
  console.log(`Civic Flood & Safe Shelter Router running at http://${host}:${port}`);
});
