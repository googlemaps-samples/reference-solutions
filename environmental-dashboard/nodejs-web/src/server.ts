import path from 'node:path';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import type {
  AirQualityCurrentResponse,
  PlacesSearchTextResponse,
  PollenForecastResponse,
  SolarBuildingInsightsResponse,
  UnitsSystem,
  WeatherCurrentResponse,
  WeatherForecastResponse,
} from './types';

dotenv.config();

const LOOPBACK_HOST = '127.0.0.1';
const DEFAULT_PORT = Number.parseInt(process.env.PORT ?? '3000', 10) || 3000;

const ALLOWED_AQI_MAP_TYPES = new Set([
  'US_AQI',
  'UAQI_RED_GREEN',
  'UAQI_INDIGO_PERSIAN',
  'PM25_INDIGO_PERSIAN',
  'GBR_DEFRA',
  'DEU_UBA',
  'CAN_EC',
  'FRA_ATMO',
]);

const FIELD_MASKS = {
  weatherCurrent:
    'currentTime,timeZone,weatherCondition,temperature,feelsLikeTemperature,relativeHumidity,uvIndex,wind,precipitation,cloudCover,isDaytime',
  weatherForecast: 'forecastDays,timeZone',
  airQualityCurrent: 'dateTime,regionCode,indexes,pollutants,healthRecommendations',
  pollenForecast: 'regionCode,dailyInfo',
  solarBuildingInsights:
    'name,center,boundingBox,imageryDate,imageryQuality,postalCode,administrativeArea,regionCode,solarPotential',
  placesSearchText: 'places.id,places.displayName,places.formattedAddress,places.location',
} as const;

interface CliOptions {
  host: string;
  port: number;
}

function parseCliArgs(argv: string[]): CliOptions {
  let host = LOOPBACK_HOST;
  let port = DEFAULT_PORT;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--host' && i + 1 < argv.length) {
      const candidate = argv[i + 1].trim();
      if (candidate === '127.0.0.1' || candidate === 'localhost') {
        host = candidate;
      } else {
        host = LOOPBACK_HOST;
      }
      i += 1;
    } else if (arg.startsWith('--host=')) {
      const candidate = arg.slice('--host='.length).trim();
      host = candidate === '127.0.0.1' || candidate === 'localhost' ? candidate : LOOPBACK_HOST;
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

function getApiKey(): string {
  const key = (process.env.GOOGLE_MAPS_API_KEY ?? '').trim();
  if (!key || key === 'your_google_maps_api_key_here') {
    return '';
  }
  return key;
}

function parseCoordinatePair(
  latRaw: unknown,
  lngRaw: unknown
): { lat: number; lng: number } | null {
  const lat = typeof latRaw === 'number' ? latRaw : Number.parseFloat(String(latRaw ?? ''));
  const lng = typeof lngRaw === 'number' ? lngRaw : Number.parseFloat(String(lngRaw ?? ''));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  return { lat, lng };
}

function parseUnitsSystem(raw: unknown): UnitsSystem {
  const normalized = String(raw ?? 'IMPERIAL').toUpperCase();
  return normalized === 'METRIC' ? 'METRIC' : 'IMPERIAL';
}

function parseBoundedInt(raw: unknown, min: number, max: number, fallback: number): number | null {
  if (raw === undefined || raw === null || raw === '') {
    return fallback;
  }
  const parsed = Number.parseInt(String(raw), 10);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return null;
  }
  return parsed;
}

async function fetchJsonUpstream<T>(
  url: string,
  init: RequestInit
): Promise<{ ok: boolean; status: number; data: T | Record<string, unknown> }> {
  const response = await fetch(url, init);
  const text = await response.text();
  let parsed: T | Record<string, unknown> = {};
  try {
    parsed = text ? (JSON.parse(text) as T) : {};
  } catch {
    parsed = { error: { message: text || `Upstream HTTP ${response.status}` } };
  }
  return {
    ok: response.ok,
    status: response.status,
    data: parsed,
  };
}

function extractUpstreamErrorMessage(payload: unknown, fallbackStatus: number): string {
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (obj.error && typeof obj.error === 'object') {
      const errObj = obj.error as Record<string, unknown>;
      if (typeof errObj.message === 'string' && errObj.message.length > 0) {
        return errObj.message;
      }
    }
    if (typeof obj.message === 'string' && obj.message.length > 0) {
      return obj.message;
    }
  }
  return `Google Maps Platform API responded with status ${fallbackStatus}.`;
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));

// Mandatory security headers on all HTTP responses
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const publicDir = path.resolve(__dirname, '..', 'public');
app.use(express.static(publicDir));

app.get('/favicon.ico', (_req: Request, res: Response) => {
  res.status(204).end();
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(getApiKey()),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/config', (_req: Request, res: Response) => {
  const apiKey = getApiKey();
  res.json({
    hasApiKey: Boolean(apiKey),
    mapsApiKey: apiKey,
    seedSearchQuery: 'Phoenix City Hall, Phoenix, AZ',
    initialCenter: { lat: 33.4484, lng: -112.074 },
    initialZoom: 16,
  });
});

app.get('/api/weather/current', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({
      error: 'GOOGLE_MAPS_API_KEY is not configured on the server.',
    });
    return;
  }

  const coords = parseCoordinatePair(req.query.lat, req.query.lng);
  if (!coords) {
    res.status(400).json({ error: 'Valid lat [-90..90] and lng [-180..180] query params are required.' });
    return;
  }

  const unitsSystem = parseUnitsSystem(req.query.unitsSystem);
  const upstreamUrl = new URL('https://weather.googleapis.com/v1/currentConditions:lookup');
  upstreamUrl.searchParams.set('location.latitude', String(coords.lat));
  upstreamUrl.searchParams.set('location.longitude', String(coords.lng));
  upstreamUrl.searchParams.set('unitsSystem', unitsSystem);
  upstreamUrl.searchParams.set('languageCode', 'en');

  try {
    const result = await fetchJsonUpstream<WeatherCurrentResponse>(upstreamUrl.toString(), {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASKS.weatherCurrent,
      },
    });

    if (!result.ok) {
      res.status(result.status).json({
        error: extractUpstreamErrorMessage(result.data, result.status),
      });
      return;
    }

    res.json(result.data);
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Failed to reach Weather API.',
    });
  }
});

app.get('/api/weather/forecast', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({
      error: 'GOOGLE_MAPS_API_KEY is not configured on the server.',
    });
    return;
  }

  const coords = parseCoordinatePair(req.query.lat, req.query.lng);
  if (!coords) {
    res.status(400).json({ error: 'Valid lat [-90..90] and lng [-180..180] query params are required.' });
    return;
  }

  const days = parseBoundedInt(req.query.days, 1, 10, 5);
  if (days === null) {
    res.status(400).json({ error: 'days must be an integer between 1 and 10.' });
    return;
  }

  const unitsSystem = parseUnitsSystem(req.query.unitsSystem);
  const upstreamUrl = new URL('https://weather.googleapis.com/v1/forecast/days:lookup');
  upstreamUrl.searchParams.set('location.latitude', String(coords.lat));
  upstreamUrl.searchParams.set('location.longitude', String(coords.lng));
  upstreamUrl.searchParams.set('unitsSystem', unitsSystem);
  upstreamUrl.searchParams.set('days', String(days));
  upstreamUrl.searchParams.set('pageSize', String(days));
  upstreamUrl.searchParams.set('languageCode', 'en');

  try {
    const result = await fetchJsonUpstream<WeatherForecastResponse>(upstreamUrl.toString(), {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASKS.weatherForecast,
      },
    });

    if (!result.ok) {
      res.status(result.status).json({
        error: extractUpstreamErrorMessage(result.data, result.status),
      });
      return;
    }

    res.json(result.data);
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Failed to reach Weather Forecast API.',
    });
  }
});

app.post('/api/air-quality/current', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({
      error: 'GOOGLE_MAPS_API_KEY is not configured on the server.',
    });
    return;
  }

  const body = req.body as Record<string, unknown> | undefined;
  const locationObj =
    body?.location && typeof body.location === 'object'
      ? (body.location as Record<string, unknown>)
      : null;

  const coords = parseCoordinatePair(
    locationObj?.latitude ?? body?.lat,
    locationObj?.longitude ?? body?.lng
  );
  if (!coords) {
    res.status(400).json({
      error: 'Request body must include valid location.latitude and location.longitude (or lat and lng).',
    });
    return;
  }

  const upstreamPayload = {
    universalAqi: true,
    location: {
      latitude: coords.lat,
      longitude: coords.lng,
    },
    extraComputations: [
      'HEALTH_RECOMMENDATIONS',
      'DOMINANT_POLLUTANT_CONCENTRATION',
      'POLLUTANT_CONCENTRATION',
      'LOCAL_AQI',
      'POLLUTANT_ADDITIONAL_INFO',
    ],
    languageCode: 'en',
  };

  try {
    const result = await fetchJsonUpstream<AirQualityCurrentResponse>(
      'https://airquality.googleapis.com/v1/currentConditions:lookup',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': FIELD_MASKS.airQualityCurrent,
        },
        body: JSON.stringify(upstreamPayload),
      }
    );

    if (!result.ok) {
      res.status(result.status).json({
        error: extractUpstreamErrorMessage(result.data, result.status),
      });
      return;
    }

    res.json(result.data);
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Failed to reach Air Quality API.',
    });
  }
});

async function handleAirQualityTile(req: Request, res: Response): Promise<void> {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({
      error: 'GOOGLE_MAPS_API_KEY is not configured on the server.',
    });
    return;
  }

  const mapType = String(req.params.mapType ?? req.query.mapType ?? 'US_AQI').trim();
  if (!ALLOWED_AQI_MAP_TYPES.has(mapType)) {
    res.status(400).json({ error: 'Unsupported Air Quality tile mapType.' });
    return;
  }

  const zoom = parseBoundedInt(req.params.zoom ?? req.query.zoom, 0, 16, -1);
  if (zoom === null || zoom < 0) {
    res.status(400).json({ error: 'zoom must be an integer between 0 and 16.' });
    return;
  }

  const maxCoord = (1 << zoom) - 1;
  const x = parseBoundedInt(req.params.x ?? req.query.x, 0, maxCoord, -1);
  const y = parseBoundedInt(req.params.y ?? req.query.y, 0, maxCoord, -1);
  if (x === null || x < 0 || y === null || y < 0) {
    res.status(400).json({ error: `Tile x and y must be integers between 0 and ${maxCoord}.` });
    return;
  }

  const upstreamUrl = `https://airquality.googleapis.com/v1/mapTypes/${encodeURIComponent(mapType)}/heatmapTiles/${zoom}/${x}/${y}`;

  try {
    const response = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(response.status).json({
        error: errText || `Air Quality tile upstream error (${response.status})`,
      });
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Failed to fetch Air Quality tile.',
    });
  }
}

app.get('/api/air-quality/tiles', handleAirQualityTile);
app.get('/api/air-quality/tiles/:mapType/:zoom/:x/:y', handleAirQualityTile);

app.get('/api/pollen/forecast', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({
      error: 'GOOGLE_MAPS_API_KEY is not configured on the server.',
    });
    return;
  }

  const coords = parseCoordinatePair(req.query.lat, req.query.lng);
  if (!coords) {
    res.status(400).json({ error: 'Valid lat [-90..90] and lng [-180..180] query params are required.' });
    return;
  }

  const days = parseBoundedInt(req.query.days, 1, 5, 5);
  if (days === null) {
    res.status(400).json({ error: 'days must be an integer between 1 and 5.' });
    return;
  }

  const upstreamUrl = new URL('https://pollen.googleapis.com/v1/forecast:lookup');
  upstreamUrl.searchParams.set('location.latitude', String(coords.lat));
  upstreamUrl.searchParams.set('location.longitude', String(coords.lng));
  upstreamUrl.searchParams.set('days', String(days));
  upstreamUrl.searchParams.set('plantsDescription', 'true');
  upstreamUrl.searchParams.set('languageCode', 'en');

  try {
    const result = await fetchJsonUpstream<PollenForecastResponse>(upstreamUrl.toString(), {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASKS.pollenForecast,
      },
    });

    if (!result.ok) {
      res.status(result.status).json({
        error: extractUpstreamErrorMessage(result.data, result.status),
      });
      return;
    }

    res.json(result.data);
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Failed to reach Pollen API.',
    });
  }
});

app.get('/api/solar/building-insights', async (req: Request, res: Response) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    res.status(503).json({
      error: 'GOOGLE_MAPS_API_KEY is not configured on the server.',
    });
    return;
  }

  const coords = parseCoordinatePair(req.query.lat, req.query.lng);
  if (!coords) {
    res.status(400).json({ error: 'Valid lat [-90..90] and lng [-180..180] query params are required.' });
    return;
  }

  const upstreamUrl = new URL('https://solar.googleapis.com/v1/buildingInsights:findClosest');
  upstreamUrl.searchParams.set('location.latitude', String(coords.lat));
  upstreamUrl.searchParams.set('location.longitude', String(coords.lng));
  upstreamUrl.searchParams.set('requiredQuality', 'MEDIUM');

  try {
    const result = await fetchJsonUpstream<SolarBuildingInsightsResponse>(upstreamUrl.toString(), {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASKS.solarBuildingInsights,
      },
    });

    if (result.status === 404) {
      res.status(404).json({
        coverageAvailable: false,
        code: 'NOT_FOUND',
        message:
          'No building solar insights found within 50m of these coordinates or location is outside Solar API coverage.',
      });
      return;
    }

    if (!result.ok) {
      res.status(result.status).json({
        error: extractUpstreamErrorMessage(result.data, result.status),
      });
      return;
    }

    res.json(result.data);
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Failed to reach Solar API.',
    });
  }
});

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
  if (!textQuery || textQuery.length > 256) {
    res.status(400).json({
      error: 'Request body must include a non-empty textQuery string (max 256 chars).',
    });
    return;
  }

  try {
    const result = await fetchJsonUpstream<PlacesSearchTextResponse>(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': FIELD_MASKS.placesSearchText,
        },
        body: JSON.stringify({
          textQuery,
          pageSize: 1,
          languageCode: 'en',
        }),
      }
    );

    if (!result.ok) {
      res.status(result.status).json({
        error: extractUpstreamErrorMessage(result.data, result.status),
      });
      return;
    }

    res.json(result.data);
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Failed to reach Places API (New).',
    });
  }
});

const { host, port } = parseCliArgs(process.argv.slice(2));
app.listen(port, host, () => {
  console.log(`Environmental Dashboard server listening on http://${host}:${port}`);
});
