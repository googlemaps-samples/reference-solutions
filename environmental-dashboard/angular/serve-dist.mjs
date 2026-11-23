import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvFile(envPath) {
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
    if (eqIdx === -1) {
      continue;
    }
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
}

loadEnvFile(path.join(__dirname, '.env'));

function parseArgs(argv) {
  let host = '127.0.0.1';
  let port = Number(process.env.PORT || 4200);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--host' && i + 1 < argv.length) {
      const requested = argv[i + 1];
      host = requested === 'localhost' ? 'localhost' : '127.0.0.1';
      i += 1;
    } else if (arg.startsWith('--host=')) {
      const requested = arg.slice('--host='.length);
      host = requested === 'localhost' ? 'localhost' : '127.0.0.1';
    } else if (arg === '--port' && i + 1 < argv.length) {
      const parsed = Number(argv[i + 1]);
      if (!Number.isNaN(parsed) && parsed > 0) {
        port = parsed;
      }
      i += 1;
    } else if (arg.startsWith('--port=')) {
      const parsed = Number(arg.slice('--port='.length));
      if (!Number.isNaN(parsed) && parsed > 0) {
        port = parsed;
      }
    }
  }

  return { host, port };
}

function resolveDistDir() {
  const browserDist = path.join(__dirname, 'dist', 'environmental-dashboard', 'browser');
  if (fs.existsSync(browserDist)) {
    return browserDist;
  }
  const flatDist = path.join(__dirname, 'dist', 'environmental-dashboard');
  if (fs.existsSync(flatDist)) {
    return flatDist;
  }
  return browserDist;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

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

function getApiKey() {
  const key = (process.env.GOOGLE_MAPS_API_KEY || '').trim();
  if (!key || key === 'your_google_maps_api_key_here') {
    return '';
  }
  return key;
}

async function readJsonBody(req) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > 1024 * 1024) {
      throw new Error('Request payload too large');
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) {
    return {};
  }
  return JSON.parse(raw);
}

function parseCoordinates(searchParams) {
  const latRaw = searchParams.get('lat') ?? searchParams.get('location.latitude');
  const lngRaw = searchParams.get('lng') ?? searchParams.get('location.longitude');
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (
    latRaw === null ||
    lngRaw === null ||
    Number.isNaN(lat) ||
    Number.isNaN(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }
  return { lat, lng };
}

async function handleApiRequest(req, res, urlObj) {
  const pathname = urlObj.pathname;
  const apiKey = getApiKey();

  if (pathname === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, {
      status: 'ok',
      hasApiKey: Boolean(apiKey),
    });
  }

  if (!apiKey) {
    return sendJson(res, 503, {
      error: 'GOOGLE_MAPS_API_KEY is not configured in .env or environment variables.',
      code: 'MISSING_API_KEY',
    });
  }

  try {
    if (pathname === '/api/weather/current' && req.method === 'GET') {
      const coords = parseCoordinates(urlObj.searchParams);
      if (!coords) {
        return sendJson(res, 400, { error: 'Valid lat and lng query parameters are required.' });
      }
      const unitsSystem =
        urlObj.searchParams.get('unitsSystem') === 'METRIC' ? 'METRIC' : 'IMPERIAL';
      const languageCode = urlObj.searchParams.get('languageCode') || 'en';
      const upstream = new URL('https://weather.googleapis.com/v1/currentConditions:lookup');
      upstream.searchParams.set('location.latitude', String(coords.lat));
      upstream.searchParams.set('location.longitude', String(coords.lng));
      upstream.searchParams.set('unitsSystem', unitsSystem);
      upstream.searchParams.set('languageCode', languageCode);

      const response = await fetch(upstream, {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'currentTime,timeZone,weatherCondition,temperature,feelsLikeTemperature,relativeHumidity,uvIndex,wind,precipitation,cloudCover,isDaytime',
        },
      });
      const text = await response.text();
      setSecurityHeaders(res);
      res.writeHead(response.status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      return res.end(text);
    }

    if (pathname === '/api/weather/forecast' && req.method === 'GET') {
      const coords = parseCoordinates(urlObj.searchParams);
      if (!coords) {
        return sendJson(res, 400, { error: 'Valid lat and lng query parameters are required.' });
      }
      const unitsSystem =
        urlObj.searchParams.get('unitsSystem') === 'METRIC' ? 'METRIC' : 'IMPERIAL';
      const days = Math.min(10, Math.max(1, Number(urlObj.searchParams.get('days') || 5)));
      const languageCode = urlObj.searchParams.get('languageCode') || 'en';
      const upstream = new URL('https://weather.googleapis.com/v1/forecast/days:lookup');
      upstream.searchParams.set('location.latitude', String(coords.lat));
      upstream.searchParams.set('location.longitude', String(coords.lng));
      upstream.searchParams.set('days', String(days));
      upstream.searchParams.set('pageSize', String(days));
      upstream.searchParams.set('unitsSystem', unitsSystem);
      upstream.searchParams.set('languageCode', languageCode);

      const response = await fetch(upstream, {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'forecastDays,timeZone',
        },
      });
      const text = await response.text();
      setSecurityHeaders(res);
      res.writeHead(response.status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      return res.end(text);
    }

    if (pathname === '/api/air-quality/current' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const lat = Number(body.lat ?? body.location?.latitude);
      const lng = Number(body.lng ?? body.location?.longitude);
      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        return sendJson(res, 400, { error: 'Valid latitude and longitude are required.' });
      }

      const payload = {
        universalAqi: true,
        location: { latitude: lat, longitude: lng },
        extraComputations: [
          'HEALTH_RECOMMENDATIONS',
          'DOMINANT_POLLUTANT_CONCENTRATION',
          'POLLUTANT_CONCENTRATION',
          'LOCAL_AQI',
          'POLLUTANT_ADDITIONAL_INFO',
        ],
        languageCode: typeof body.languageCode === 'string' ? body.languageCode : 'en',
      };

      const response = await fetch('https://airquality.googleapis.com/v1/currentConditions:lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'dateTime,regionCode,indexes,pollutants,healthRecommendations',
        },
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      setSecurityHeaders(res);
      res.writeHead(response.status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      return res.end(text);
    }

    if (
      (pathname === '/api/air-quality/tiles' || pathname.startsWith('/api/air-quality/tiles/')) &&
      req.method === 'GET'
    ) {
      let mapType = urlObj.searchParams.get('mapType') || 'US_AQI';
      let zoom = urlObj.searchParams.get('z') ?? urlObj.searchParams.get('zoom');
      let x = urlObj.searchParams.get('x');
      let y = urlObj.searchParams.get('y');

      if (pathname.startsWith('/api/air-quality/tiles/')) {
        const parts = pathname.slice('/api/air-quality/tiles/'.length).split('/');
        if (parts.length >= 4) {
          [mapType, zoom, x, y] = parts;
        }
      }

      const allowedMapTypes = new Set([
        'US_AQI',
        'UAQI_RED_GREEN',
        'UAQI_INDIGO_PERSIAN',
        'PM25_INDIGO_PERSIAN',
      ]);
      if (!allowedMapTypes.has(mapType)) {
        mapType = 'US_AQI';
      }

      const zNum = Number(zoom);
      const xNum = Number(x);
      const yNum = Number(y);
      if (
        !Number.isInteger(zNum) ||
        !Number.isInteger(xNum) ||
        !Number.isInteger(yNum) ||
        zNum < 0 ||
        zNum > 16 ||
        xNum < 0 ||
        yNum < 0
      ) {
        return sendJson(res, 400, {
          error: 'Valid integer z (0-16), x, and y tile parameters are required.',
        });
      }

      const upstream = `https://airquality.googleapis.com/v1/mapTypes/${encodeURIComponent(
        mapType,
      )}/heatmapTiles/${zNum}/${xNum}/${yNum}`;

      const response = await fetch(upstream, {
        headers: {
          'X-Goog-Api-Key': apiKey,
        },
      });

      if (!response.ok) {
        setSecurityHeaders(res);
        res.writeHead(response.status === 404 ? 204 : response.status, {
          'Cache-Control': 'public, max-age=300',
        });
        return res.end();
      }

      const buf = Buffer.from(await response.arrayBuffer());
      setSecurityHeaders(res);
      res.writeHead(200, {
        'Content-Type': response.headers.get('content-type') || 'image/png',
        'Cache-Control': 'public, max-age=300',
      });
      return res.end(buf);
    }

    if (pathname === '/api/pollen/forecast' && req.method === 'GET') {
      const coords = parseCoordinates(urlObj.searchParams);
      if (!coords) {
        return sendJson(res, 400, { error: 'Valid lat and lng query parameters are required.' });
      }
      const days = Math.min(5, Math.max(1, Number(urlObj.searchParams.get('days') || 5)));
      const languageCode = urlObj.searchParams.get('languageCode') || 'en';
      const upstream = new URL('https://pollen.googleapis.com/v1/forecast:lookup');
      upstream.searchParams.set('location.latitude', String(coords.lat));
      upstream.searchParams.set('location.longitude', String(coords.lng));
      upstream.searchParams.set('days', String(days));
      upstream.searchParams.set('plantsDescription', 'true');
      upstream.searchParams.set('languageCode', languageCode);

      const response = await fetch(upstream, {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'regionCode,dailyInfo',
        },
      });
      const text = await response.text();
      setSecurityHeaders(res);
      res.writeHead(response.status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      return res.end(text);
    }

    if (pathname === '/api/solar/building-insights' && req.method === 'GET') {
      const coords = parseCoordinates(urlObj.searchParams);
      if (!coords) {
        return sendJson(res, 400, { error: 'Valid lat and lng query parameters are required.' });
      }
      const requiredQuality = urlObj.searchParams.get('requiredQuality') || 'BASE';
      const upstream = new URL('https://solar.googleapis.com/v1/buildingInsights:findClosest');
      upstream.searchParams.set('location.latitude', coords.lat.toFixed(6));
      upstream.searchParams.set('location.longitude', coords.lng.toFixed(6));
      upstream.searchParams.set('requiredQuality', requiredQuality);

      const response = await fetch(upstream, {
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'name,center,boundingBox,imageryDate,imageryQuality,postalCode,administrativeArea,regionCode,solarPotential',
        },
      });

      if (response.status === 404) {
        return sendJson(res, 200, {
          nonCoverage: true,
          status: 404,
          code: 'NOT_FOUND',
          message:
            'No building solar insights found within 50m of these coordinates, or imagery coverage is unavailable here.',
        });
      }

      const text = await response.text();
      setSecurityHeaders(res);
      res.writeHead(response.status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      return res.end(text);
    }

    if (pathname === '/api/places/search-text' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const textQuery = typeof body.textQuery === 'string' ? body.textQuery.trim() : '';
      if (!textQuery) {
        return sendJson(res, 400, { error: 'textQuery is required.' });
      }

      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.location',
        },
        body: JSON.stringify({
          textQuery,
          pageSize: 1,
          languageCode: typeof body.languageCode === 'string' ? body.languageCode : 'en',
        }),
      });

      const text = await response.text();
      setSecurityHeaders(res);
      res.writeHead(response.status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      return res.end(text);
    }

    return sendJson(res, 404, { error: `Unknown API route: ${pathname}` });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upstream API proxy error';
    return sendJson(res, 502, { error: message });
  }
}

function serveStaticFile(res, distDir, reqPath) {
  const safePath = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(distDir, safePath === '/' ? 'index.html' : safePath);

  if (!filePath.startsWith(distDir)) {
    setSecurityHeaders(res);
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Forbidden');
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    if (safePath === '/favicon.ico' || safePath === 'favicon.ico') {
      setSecurityHeaders(res);
      res.writeHead(204);
      return res.end();
    }
    const hasExtension = path.extname(safePath) !== '';
    if (hasExtension) {
      setSecurityHeaders(res);
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not Found');
    }
    filePath = path.join(distDir, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    setSecurityHeaders(res);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Angular build output not found. Run "npm run build" first.');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  setSecurityHeaders(res);
  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  return fs.createReadStream(filePath).pipe(res);
}

const { host, port } = parseArgs(process.argv.slice(2));
const distDir = resolveDistDir();

const server = http.createServer(async (req, res) => {
  const hostHeader = req.headers.host || `${host}:${port}`;
  const urlObj = new URL(req.url || '/', `http://${hostHeader}`);

  if (urlObj.pathname === '/env-config.js' && req.method === 'GET') {
    const apiKey = getApiKey();
    setSecurityHeaders(res);
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    return res.end(
      `window.__ENV__ = Object.freeze({ GOOGLE_MAPS_API_KEY: ${JSON.stringify(apiKey)} });\n`,
    );
  }

  if (urlObj.pathname.startsWith('/api/')) {
    return handleApiRequest(req, res, urlObj);
  }

  return serveStaticFile(res, distDir, urlObj.pathname);
});

server.listen(port, host, () => {
  console.log(`Environmental Dashboard Angular server listening at http://${host}:${port}`);
  console.log(`Serving static assets from: ${distDir}`);
});
