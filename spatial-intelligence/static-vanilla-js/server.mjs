import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/geo+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
};

function loadDotEnv() {
  const envFiles = ['.env', '.env.local'];
  for (const filename of envFiles) {
    const filePath = path.join(ROOT_DIR, filename);
    if (!fs.existsSync(filePath)) continue;
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    for (const rawLine of lines) {
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
}

function parseCliArgs(argv) {
  let host = '127.0.0.1';
  let port = Number(process.env.PORT || 4173);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--host' && argv[i + 1]) {
      const requestedHost = argv[++i].trim();
      host = requestedHost === 'localhost' ? '127.0.0.1' : requestedHost;
    } else if (arg.startsWith('--host=')) {
      const requestedHost = arg.slice('--host='.length).trim();
      host = requestedHost === 'localhost' ? '127.0.0.1' : requestedHost;
    } else if (arg === '--port' && argv[i + 1]) {
      port = Number(argv[++i]);
    } else if (arg.startsWith('--port=')) {
      port = Number(arg.slice('--port='.length));
    }
  }

  // Strictly enforce loopback binding (never bind 0.0.0.0)
  if (host !== '127.0.0.1') {
    host = '127.0.0.1';
  }
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    port = 4173;
  }

  return { host, port };
}

function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

function sendJson(res, statusCode, payload) {
  applySecurityHeaders(res);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req, maxBytes = 65536) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('Request body too large'));
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
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function getApiKey() {
  const raw = (process.env.GOOGLE_MAPS_API_KEY || '').trim();
  if (!raw || raw === 'your_google_maps_api_key_here') return '';
  return raw;
}

async function handlePlacesSearchProxy(req, res) {
  const apiKey = getApiKey();
  if (!apiKey) {
    sendJson(res, 503, { error: 'GOOGLE_MAPS_API_KEY is not configured.' });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    sendJson(res, 400, { error: err.message });
    return;
  }

  const textQuery =
    typeof body.textQuery === 'string' ? body.textQuery.trim() : '';
  if (!textQuery) {
    sendJson(res, 400, { error: 'textQuery is required.' });
    return;
  }

  const maxResultCount = Math.min(
    10,
    Math.max(1, Number(body.maxResultCount) || 6)
  );

  const requestPayload = {
    textQuery,
    maxResultCount,
    languageCode: 'en',
    regionCode: 'US',
    locationBias: body.locationBias || {
      circle: {
        center: { latitude: 40.73061, longitude: -73.98661 },
        radius: 12000.0,
      },
    },
  };

  try {
    const upstream = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.location,places.types',
        },
        body: JSON.stringify(requestPayload),
      }
    );

    const data = await upstream.json();
    if (!upstream.ok) {
      sendJson(res, upstream.status, {
        error: data?.error?.message || 'Places API request failed.',
      });
      return;
    }

    const places = Array.isArray(data.places)
      ? data.places.map((p) => ({
          id: p.id || '',
          displayName: p.displayName?.text || p.displayName || 'Unnamed Hub',
          formattedAddress: p.formattedAddress || '',
          location: p.location || null,
          types: Array.isArray(p.types) ? p.types : [],
        }))
      : [];

    sendJson(res, 200, { places });
  } catch (err) {
    sendJson(res, 502, {
      error: `Upstream Places API error: ${err.message}`,
    });
  }
}

async function handleElevationProxy(req, res) {
  const apiKey = getApiKey();
  if (!apiKey) {
    sendJson(res, 503, { error: 'GOOGLE_MAPS_API_KEY is not configured.' });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    sendJson(res, 400, { error: err.message });
    return;
  }

  const locations = Array.isArray(body.locations) ? body.locations : [];
  if (locations.length === 0 || locations.length > 64) {
    sendJson(res, 400, {
      error: 'locations must be a non-empty array of up to 64 coordinates.',
    });
    return;
  }

  const coords = [];
  for (const loc of locations) {
    const lat = Number(loc.lat ?? loc.latitude);
    const lng = Number(loc.lng ?? loc.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      sendJson(res, 400, { error: 'Invalid coordinate in locations array.' });
      return;
    }
    coords.push(`${lat.toFixed(6)},${lng.toFixed(6)}`);
  }

  const url = new URL('https://maps.googleapis.com/maps/api/elevation/json');
  url.searchParams.set('locations', coords.join('|'));
  url.searchParams.set('key', apiKey);

  try {
    const upstream = await fetch(url.toString());
    const data = await upstream.json();
    if (!upstream.ok || data.status !== 'OK') {
      sendJson(res, upstream.ok ? 400 : upstream.status, {
        status: data.status || 'ERROR',
        error: data.error_message || 'Elevation API request failed.',
      });
      return;
    }

    const results = Array.isArray(data.results)
      ? data.results.map((item) => ({
          elevation: item.elevation,
          location: item.location,
          resolution: item.resolution,
        }))
      : [];

    sendJson(res, 200, {
      status: data.status,
      results,
    });
  } catch (err) {
    sendJson(res, 502, {
      error: `Upstream Elevation API error: ${err.message}`,
    });
  }
}

function serveStaticFile(reqPath, res) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(reqPath);
  } catch {
    applySecurityHeaders(res);
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad Request');
    return;
  }

  const normalizedRel = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '');
  if (normalizedRel.includes('\0')) {
    applySecurityHeaders(res);
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad Request');
    return;
  }

  const resolvedPath = path.resolve(ROOT_DIR, normalizedRel);
  if (
    resolvedPath !== ROOT_DIR &&
    !resolvedPath.startsWith(ROOT_DIR + path.sep)
  ) {
    applySecurityHeaders(res);
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  // Prevent reading hidden dotfiles like .env
  const baseName = path.basename(resolvedPath);
  if (baseName.startsWith('.')) {
    applySecurityHeaders(res);
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.stat(resolvedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      applySecurityHeaders(res);
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    applySecurityHeaders(res);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': resolvedPath.includes(`${path.sep}node_modules${path.sep}`)
        ? 'public, max-age=3600'
        : 'no-cache',
    });
    fs.createReadStream(resolvedPath).pipe(res);
  });
}

loadDotEnv();
const { host, port } = parseCliArgs(process.argv.slice(2));

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url || '/', `http://${host}:${port}`);
  const pathname = urlObj.pathname;

  if (req.method === 'GET' && pathname === '/env-config.js') {
    const apiKey = getApiKey();
    const payload =
      `globalThis.process = globalThis.process || { env: { NODE_ENV: 'production' } };\n` +
      `window.__GMP_CONFIG__ = ${JSON.stringify({ apiKey })};\n`;
    applySecurityHeaders(res);
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(payload);
    return;
  }

  if (req.method === 'GET' && pathname === '/favicon.ico') {
    applySecurityHeaders(res);
    res.writeHead(204, { 'Cache-Control': 'public, max-age=86400' });
    res.end();
    return;
  }

  if (req.method === 'GET' && pathname === '/healthz') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/places/search') {
    await handlePlacesSearchProxy(req, res);
    return;
  }

  if (req.method === 'POST' && pathname === '/api/elevation') {
    await handleElevationProxy(req, res);
    return;
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    serveStaticFile(pathname, res);
    return;
  }

  applySecurityHeaders(res);
  res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Method Not Allowed');
});

server.listen(port, host, () => {
  console.log(
    `Enterprise GIS Workbench server listening at http://${host}:${port}`
  );
});
