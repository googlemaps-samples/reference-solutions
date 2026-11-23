import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname);

/**
 * Load environment variables from a local .env file if present,
 * without overriding already-set process.env variables.
 */
function loadDotEnv(envPath) {
  if (!fs.existsSync(envPath)) {
    return;
  }
  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const eqIdx = line.indexOf('=');
    if (eqIdx <= 0) {
      continue;
    }
    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadDotEnv(path.join(ROOT_DIR, '.env'));

function parseCliArgs(argv) {
  let host = '127.0.0.1';
  let port = Number(process.env.PORT || 3000);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--host' && i + 1 < argv.length) {
      const requestedHost = argv[i + 1];
      i += 1;
      // Enforce loopback-only binding for local security
      if (requestedHost !== '127.0.0.1' && requestedHost !== 'localhost') {
        throw new Error(
          `Refusing non-loopback host "${requestedHost}". Server must bind to 127.0.0.1.`
        );
      }
      host = '127.0.0.1';
    } else if (arg.startsWith('--host=')) {
      const requestedHost = arg.slice('--host='.length);
      if (requestedHost !== '127.0.0.1' && requestedHost !== 'localhost') {
        throw new Error(
          `Refusing non-loopback host "${requestedHost}". Server must bind to 127.0.0.1.`
        );
      }
      host = '127.0.0.1';
    } else if (arg === '--port' && i + 1 < argv.length) {
      port = Number(argv[i + 1]);
      i += 1;
    } else if (arg.startsWith('--port=')) {
      port = Number(arg.slice('--port='.length));
    }
  }

  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid port value: ${port}`);
  }

  return { host, port };
}

function getApiKey() {
  const key = (process.env.GOOGLE_MAPS_API_KEY || '').trim();
  if (!key || key === 'your_google_maps_api_key_here') {
    return '';
  }
  return key;
}

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

function sendJson(res, statusCode, payload) {
  setSecurityHeaders(res);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, text, contentType = 'text/plain; charset=utf-8') {
  setSecurityHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': contentType });
  res.end(text);
}

function parseLatLng(url) {
  const lat = Number(url.searchParams.get('lat'));
  const lng = Number(url.searchParams.get('lng'));
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }
  return { lat, lng };
}

async function readJsonBody(req, maxBytes = 64 * 1024) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      throw new Error('Request body too large');
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) {
    return {};
  }
  return JSON.parse(raw);
}

async function proxyJsonRequest(res, upstreamUrl, options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return sendJson(res, 503, {
      error: 'GOOGLE_MAPS_API_KEY is not configured on the server.',
      code: 'MISSING_API_KEY',
    });
  }

  const headers = {
    'X-Goog-Api-Key': apiKey,
    ...(options.fieldMask ? { 'X-Goog-FieldMask': options.fieldMask } : {}),
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
  };

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const text = await upstreamRes.text();
    let parsed;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { raw: text };
    }

    return sendJson(res, upstreamRes.status, parsed);
  } catch (err) {
    return sendJson(res, 502, {
      error: err instanceof Error ? err.message : 'Upstream request failed',
      code: 'UPSTREAM_ERROR',
    });
  }
}

// 1x1 transparent PNG fallback when an AQI heatmap tile has no data
const TRANSPARENT_1X1_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

const ALLOWED_AQI_MAP_TYPES = new Set([
  'US_AQI',
  'UAQI_RED_GREEN',
  'UAQI_INDIGO_PERSIAN',
  'PM25_INDIGO_PERSIAN',
]);

async function handleAqiTiles(res, url) {
  const apiKey = getApiKey();
  if (!apiKey) {
    setSecurityHeaders(res);
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
    });
    return res.end(TRANSPARENT_1X1_PNG);
  }

  let mapType = url.searchParams.get('mapType') || 'US_AQI';
  let zoom = url.searchParams.get('zoom');
  let x = url.searchParams.get('x');
  let y = url.searchParams.get('y');

  // Also support /api/air-quality/tiles/:mapType/:zoom/:x/:y
  if (zoom === null || x === null || y === null) {
    const prefix = '/api/air-quality/tiles/';
    if (url.pathname.startsWith(prefix)) {
      const parts = url.pathname.slice(prefix.length).split('/').filter(Boolean);
      if (parts.length === 4) {
        [mapType, zoom, x, y] = parts;
      }
    }
  }

  const zNum = Number(zoom);
  const xNum = Number(x);
  const yNum = Number(y);
  if (
    !ALLOWED_AQI_MAP_TYPES.has(mapType) ||
    !Number.isInteger(zNum) ||
    zNum < 0 ||
    zNum > 16 ||
    !Number.isInteger(xNum) ||
    xNum < 0 ||
    !Number.isInteger(yNum) ||
    yNum < 0
  ) {
    return sendJson(res, 400, { error: 'Invalid AQI tile coordinates or mapType' });
  }

  const upstreamUrl = `https://airquality.googleapis.com/v1/mapTypes/${encodeURIComponent(
    mapType
  )}/heatmapTiles/${zNum}/${xNum}/${yNum}`;

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      headers: {
        'X-Goog-Api-Key': apiKey,
      },
    });

    if (!upstreamRes.ok) {
      setSecurityHeaders(res);
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=300',
      });
      return res.end(TRANSPARENT_1X1_PNG);
    }

    const buf = Buffer.from(await upstreamRes.arrayBuffer());
    setSecurityHeaders(res);
    res.writeHead(200, {
      'Content-Type': upstreamRes.headers.get('content-type') || 'image/png',
      'Cache-Control': 'public, max-age=900',
    });
    return res.end(buf);
  } catch {
    setSecurityHeaders(res);
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
    });
    return res.end(TRANSPARENT_1X1_PNG);
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const STATIC_ALLOWLIST = new Set([
  '/index.html',
  '/app.js',
  '/styles.css',
]);

function serveStatic(res, pathname) {
  let targetRel = pathname === '/' ? '/index.html' : pathname;

  const isAllowedRootFile = STATIC_ALLOWLIST.has(targetRel);
  const isAllowedLoaderFile = targetRel.startsWith('/node_modules/@googlemaps/js-api-loader/dist/');

  if (!isAllowedRootFile && !isAllowedLoaderFile) {
    return sendText(res, 404, 'Not Found');
  }

  const resolved = path.resolve(ROOT_DIR, '.' + targetRel);
  if (!resolved.startsWith(ROOT_DIR + path.sep)) {
    return sendText(res, 403, 'Forbidden');
  }

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    return sendText(res, 404, 'Not Found');
  }

  const ext = path.extname(resolved).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const data = fs.readFileSync(resolved);

  setSecurityHeaders(res);
  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': targetRel.startsWith('/node_modules/')
      ? 'public, max-age=86400'
      : 'no-cache',
  });
  return res.end(data);
}

const server = http.createServer(async (req, res) => {
  const method = req.method || 'GET';
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  const pathname = url.pathname;

  // 1. Runtime configuration script for zero-bundler browser ES modules
  if (method === 'GET' && pathname === '/env-config.js') {
    const payload = {
      apiKey: getApiKey(),
    };
    const body =
      `window.process = window.process || { env: { NODE_ENV: "production" } };\n` +
      `window.__GMP_CONFIG__ = ${JSON.stringify(payload)};\n`;
    setSecurityHeaders(res);
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    return res.end(body);
  }

  // 2. Health endpoint
  if (method === 'GET' && pathname === '/api/health') {
    return sendJson(res, 200, {
      ok: true,
      hasApiKey: Boolean(getApiKey()),
    });
  }

  // 3. Weather API: current conditions
  if (method === 'GET' && pathname === '/api/weather/current') {
    const coords = parseLatLng(url);
    if (!coords) {
      return sendJson(res, 400, { error: 'Valid lat and lng query parameters are required.' });
    }
    const unitsSystem =
      url.searchParams.get('unitsSystem') === 'METRIC' ? 'METRIC' : 'IMPERIAL';
    const upstreamUrl =
      `https://weather.googleapis.com/v1/currentConditions:lookup` +
      `?location.latitude=${coords.lat}&location.longitude=${coords.lng}` +
      `&unitsSystem=${unitsSystem}&languageCode=en`;

    return proxyJsonRequest(res, upstreamUrl, {
      method: 'GET',
      fieldMask:
        'currentTime,timeZone,weatherCondition,temperature,feelsLikeTemperature,relativeHumidity,uvIndex,wind,precipitation,cloudCover,isDaytime',
    });
  }

  // 4. Weather API: 5-day daily forecast
  if (method === 'GET' && pathname === '/api/weather/forecast') {
    const coords = parseLatLng(url);
    if (!coords) {
      return sendJson(res, 400, { error: 'Valid lat and lng query parameters are required.' });
    }
    const unitsSystem =
      url.searchParams.get('unitsSystem') === 'METRIC' ? 'METRIC' : 'IMPERIAL';
    const rawDays = Number(url.searchParams.get('days') || 5);
    const days = Number.isInteger(rawDays) && rawDays >= 1 && rawDays <= 10 ? rawDays : 5;
    const upstreamUrl =
      `https://weather.googleapis.com/v1/forecast/days:lookup` +
      `?location.latitude=${coords.lat}&location.longitude=${coords.lng}` +
      `&unitsSystem=${unitsSystem}&days=${days}&pageSize=${days}&languageCode=en`;

    return proxyJsonRequest(res, upstreamUrl, {
      method: 'GET',
      fieldMask: 'forecastDays,timeZone',
    });
  }

  // 5. Air Quality API: current conditions
  if (method === 'POST' && pathname === '/api/air-quality/current') {
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return sendJson(res, 400, { error: 'Invalid JSON request body' });
    }
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return sendJson(res, 400, { error: 'Valid numeric lat and lng are required.' });
    }

    return proxyJsonRequest(res, 'https://airquality.googleapis.com/v1/currentConditions:lookup', {
      method: 'POST',
      fieldMask: 'dateTime,regionCode,indexes,pollutants,healthRecommendations',
      body: {
        universalAqi: true,
        location: { latitude: lat, longitude: lng },
        extraComputations: [
          'HEALTH_RECOMMENDATIONS',
          'DOMINANT_POLLUTANT_CONCENTRATION',
          'POLLUTANT_CONCENTRATION',
          'LOCAL_AQI',
          'POLLUTANT_ADDITIONAL_INFO',
        ],
        languageCode: 'en',
      },
    });
  }

  // 6. Air Quality API: heatmap raster tiles
  if (
    method === 'GET' &&
    (pathname === '/api/air-quality/tiles' || pathname.startsWith('/api/air-quality/tiles/'))
  ) {
    return handleAqiTiles(res, url);
  }

  // 7. Pollen API: 3-to-5-day forecast
  if (method === 'GET' && pathname === '/api/pollen/forecast') {
    const coords = parseLatLng(url);
    if (!coords) {
      return sendJson(res, 400, { error: 'Valid lat and lng query parameters are required.' });
    }
    const rawDays = Number(url.searchParams.get('days') || 3);
    const days = Number.isInteger(rawDays) && rawDays >= 1 && rawDays <= 5 ? rawDays : 3;
    const upstreamUrl =
      `https://pollen.googleapis.com/v1/forecast:lookup` +
      `?location.latitude=${coords.lat}&location.longitude=${coords.lng}` +
      `&days=${days}&plantsDescription=true&languageCode=en`;

    return proxyJsonRequest(res, upstreamUrl, {
      method: 'GET',
      fieldMask: 'regionCode,dailyInfo',
    });
  }

  // 8. Solar API: buildingInsights:findClosest
  if (method === 'GET' && pathname === '/api/solar/building-insights') {
    const coords = parseLatLng(url);
    if (!coords) {
      return sendJson(res, 400, { error: 'Valid lat and lng query parameters are required.' });
    }
    const apiKey = getApiKey();
    if (!apiKey) {
      return sendJson(res, 503, {
        error: 'GOOGLE_MAPS_API_KEY is not configured on the server.',
        code: 'MISSING_API_KEY',
      });
    }

    const upstreamUrl =
      `https://solar.googleapis.com/v1/buildingInsights:findClosest` +
      `?location.latitude=${coords.lat}&location.longitude=${coords.lng}` +
      `&requiredQuality=BASE`;

    try {
      const upstreamRes = await fetch(upstreamUrl, {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'name,center,boundingBox,imageryDate,imageryQuality,postalCode,administrativeArea,regionCode,solarPotential',
        },
      });
      const text = await upstreamRes.text();
      let parsed;
      try {
        parsed = text ? JSON.parse(text) : {};
      } catch {
        parsed = { raw: text };
      }

      if (upstreamRes.status === 404) {
        return sendJson(res, 200, {
          coverageAvailable: false,
          status: 'NOT_FOUND',
          upstreamStatus: 404,
          message:
            parsed?.error?.message ||
            'No solar building insights found within 50m of these coordinates.',
        });
      }

      return sendJson(res, upstreamRes.status, parsed);
    } catch (err) {
      return sendJson(res, 502, {
        error: err instanceof Error ? err.message : 'Upstream Solar API request failed',
        code: 'UPSTREAM_ERROR',
      });
    }
  }

  // 9. Places API (New): Text Search proxy
  if (method === 'POST' && pathname === '/api/places/search-text') {
    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      return sendJson(res, 400, { error: 'Invalid JSON request body' });
    }
    const textQuery = typeof body.textQuery === 'string' ? body.textQuery.trim() : '';
    if (!textQuery) {
      return sendJson(res, 400, { error: 'textQuery is required.' });
    }

    const requestPayload = { textQuery };
    if (body.locationBias && typeof body.locationBias === 'object') {
      requestPayload.locationBias = body.locationBias;
    }

    return proxyJsonRequest(res, 'https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      fieldMask: 'places.id,places.displayName,places.formattedAddress,places.location',
      body: requestPayload,
    });
  }

  // 10. Favicon handler to avoid browser 404 console errors
  if ((method === 'GET' || method === 'HEAD') && pathname === '/favicon.ico') {
    setSecurityHeaders(res);
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    });
    return res.end(method === 'HEAD' ? undefined : TRANSPARENT_1X1_PNG);
  }

  // 11. Static assets
  if (method === 'GET' || method === 'HEAD') {
    return serveStatic(res, pathname);
  }

  return sendJson(res, 405, { error: 'Method Not Allowed' });
});

const { host, port } = parseCliArgs(process.argv.slice(2));
server.listen(port, host, () => {
  const addr = server.address();
  const actualPort = typeof addr === 'object' && addr ? addr.port : port;
  console.log(`Environmental Dashboard server listening at http://${host}:${actualPort}`);
});
