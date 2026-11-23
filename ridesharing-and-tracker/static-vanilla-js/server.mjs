import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load environment variables from a local .env file without overriding
 * variables already provided in process.env.
 */
function loadDotEnv(envPath) {
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx <= 0) continue;
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

loadDotEnv(path.join(__dirname, '.env'));

function parseArgs(argv) {
  let host = '127.0.0.1';
  let port = Number(process.env.PORT || 3000);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--host' && argv[i + 1]) {
      host = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--host=')) {
      host = arg.slice('--host='.length);
    } else if (arg === '--port' && argv[i + 1]) {
      port = Number(argv[i + 1]);
      i += 1;
    } else if (arg.startsWith('--port=')) {
      port = Number(arg.slice('--port='.length));
    }
  }

  // Enforce binding strictly to 127.0.0.1 (never 0.0.0.0).
  if (host !== '127.0.0.1') {
    host = '127.0.0.1';
  }
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    port = 3000;
  }
  return { host, port };
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
  '.map': 'application/json; charset=utf-8',
};

const ALLOWED_STATIC_PATHS = new Set([
  '/index.html',
  '/app.js',
  '/styles.css',
  '/node_modules/@googlemaps/js-api-loader/dist/index.js',
  '/node_modules/@googlemaps/js-api-loader/dist/index.js.map',
]);

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

function readJsonBody(req, maxBytes = 65536) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(Object.assign(new Error('Request body too large'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(Object.assign(new Error('Invalid JSON payload'), { statusCode: 400 }));
      }
    });
    req.on('error', (err) => reject(err));
  });
}

function getApiKey() {
  const key = (process.env.GOOGLE_MAPS_API_KEY || '').trim();
  if (!key || key === 'your_google_maps_api_key_here') return '';
  return key;
}

async function handlePlacesSearch(req, res) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return sendJson(res, 503, {
      error: 'GOOGLE_MAPS_API_KEY is not configured in .env.',
    });
  }

  const body = await readJsonBody(req);
  if (typeof body.textQuery !== 'string' || !body.textQuery.trim()) {
    return sendJson(res, 400, { error: 'textQuery must be a non-empty string.' });
  }

  const payload = {
    textQuery: body.textQuery.trim(),
    maxResultCount: Math.min(Math.max(Number(body.maxResultCount) || 1, 1), 5),
    languageCode: typeof body.languageCode === 'string' ? body.languageCode : 'en',
    regionCode: typeof body.regionCode === 'string' ? body.regionCode : 'US',
  };

  if (body.locationBias && typeof body.locationBias === 'object') {
    payload.locationBias = body.locationBias;
  }

  const upstream = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.location',
    },
    body: JSON.stringify(payload),
  });

  const data = await upstream.json();
  return sendJson(res, upstream.status, data);
}

async function handleRoutesCompute(req, res) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return sendJson(res, 503, {
      error: 'GOOGLE_MAPS_API_KEY is not configured in .env.',
    });
  }

  const body = await readJsonBody(req);
  if (!body.origin || !body.destination) {
    return sendJson(res, 400, { error: 'origin and destination are required.' });
  }

  const payload = {
    origin: body.origin,
    destination: body.destination,
    travelMode: body.travelMode || 'DRIVE',
    routingPreference: body.routingPreference || 'TRAFFIC_AWARE_OPTIMAL',
    languageCode: body.languageCode || 'en-US',
    units: body.units || 'IMPERIAL',
  };

  if (Array.isArray(body.requestedReferenceRoutes)) {
    payload.requestedReferenceRoutes = body.requestedReferenceRoutes;
  }
  if (Array.isArray(body.extraComputations)) {
    payload.extraComputations = body.extraComputations;
  }
  if (body.routeModifiers && typeof body.routeModifiers === 'object') {
    payload.routeModifiers = body.routeModifiers;
  }
  if (typeof body.computeAlternativeRoutes === 'boolean') {
    payload.computeAlternativeRoutes = body.computeAlternativeRoutes;
  }

  const upstream = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline.encodedPolyline,routes.routeLabels,routes.travelAdvisory.fuelConsumptionMicroliters,routes.localizedValues',
    },
    body: JSON.stringify(payload),
  });

  const data = await upstream.json();
  return sendJson(res, upstream.status, data);
}

async function handleRoutesMatrix(req, res) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return sendJson(res, 503, {
      error: 'GOOGLE_MAPS_API_KEY is not configured in .env.',
    });
  }

  const body = await readJsonBody(req);
  if (!Array.isArray(body.origins) || !body.origins.length || !Array.isArray(body.destinations) || !body.destinations.length) {
    return sendJson(res, 400, { error: 'origins and destinations arrays are required.' });
  }

  const payload = {
    origins: body.origins,
    destinations: body.destinations,
    travelMode: body.travelMode || 'DRIVE',
    routingPreference: body.routingPreference || 'TRAFFIC_AWARE_OPTIMAL',
  };

  const upstream = await fetch(
    'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'originIndex,destinationIndex,duration,distanceMeters,status,condition',
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await upstream.json();
  return sendJson(res, upstream.status, data);
}

function serveStaticFile(reqPath, res) {
  const normalized = reqPath === '/' ? '/index.html' : reqPath;
  if (!ALLOWED_STATIC_PATHS.has(normalized)) {
    setSecurityHeaders(res);
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
    return;
  }

  const safeRel = normalized.replace(/^\/+/, '');
  const resolved = path.resolve(__dirname, safeRel);
  if (!resolved.startsWith(__dirname + path.sep)) {
    setSecurityHeaders(res);
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(resolved, (err, data) => {
    if (err) {
      setSecurityHeaders(res);
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(resolved).toLowerCase();
    setSecurityHeaders(res);
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': normalized === '/index.html' ? 'no-cache' : 'public, max-age=300',
    });
    res.end(data);
  });
}

const { host, port } = parseArgs(process.argv.slice(2));

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url || '/', `http://${host}:${port}`);
    let pathname;
    try {
      pathname = decodeURIComponent(reqUrl.pathname);
    } catch {
      setSecurityHeaders(res);
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Bad Request');
      return;
    }

    if (pathname.includes('\0') || pathname.includes('..')) {
      setSecurityHeaders(res);
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    if (req.method === 'GET' && pathname === '/env-config.js') {
      const apiKey = getApiKey();
      setSecurityHeaders(res);
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(
        `window.process = window.process || { env: { NODE_ENV: 'production' } };\n` +
          `window.__GMP_CONFIG__ = ${JSON.stringify({ apiKey })};\n`
      );
      return;
    }

    if (req.method === 'GET' && pathname === '/healthz') {
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === 'POST' && pathname === '/api/places/search') {
      return await handlePlacesSearch(req, res);
    }

    if (req.method === 'POST' && pathname === '/api/routes/compute') {
      return await handleRoutesCompute(req, res);
    }

    if (req.method === 'POST' && pathname === '/api/routes/matrix') {
      return await handleRoutesMatrix(req, res);
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      return serveStaticFile(pathname, res);
    }

    setSecurityHeaders(res);
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');
  } catch (err) {
    const statusCode = err?.statusCode || 500;
    return sendJson(res, statusCode, {
      error: err?.message || 'Internal Server Error',
    });
  }
});

server.listen(port, host, () => {
  const addr = server.address();
  const actualPort = typeof addr === 'object' && addr ? addr.port : port;
  console.log(`LA Rideshare & Tracker server listening at http://${host}:${actualPort}`);
});
