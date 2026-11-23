import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadDotEnv(envPath) {
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadDotEnv(path.join(__dirname, '.env'));

function parseArgs(argv) {
  let host = '127.0.0.1';
  let port = Number(process.env.PORT || 4200);

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

  // Strictly bind to loopback 127.0.0.1 (never 0.0.0.0)
  const safeHost = host === 'localhost' || host === '127.0.0.1' ? '127.0.0.1' : '127.0.0.1';
  const safePort = Number.isFinite(port) && port > 0 && port < 65536 ? port : 4200;
  return { host: safeHost, port: safePort };
}

function resolveDistDir() {
  const candidates = [
    path.join(__dirname, 'dist', 'nyc-gis-workbench', 'browser'),
    path.join(__dirname, 'dist', 'nyc-gis-workbench'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'index.html'))) {
      return dir;
    }
  }
  return candidates[0];
}

function getApiKey() {
  const raw = (process.env.GOOGLE_MAPS_API_KEY || '').trim();
  if (!raw || raw === 'your_google_maps_api_key_here') {
    return '';
  }
  return raw;
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
  '.map': 'application/json; charset=utf-8',
};

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

async function readJsonBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > 1024 * 1024) {
      throw new Error('Request payload too large');
    }
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

const { host, port } = parseArgs(process.argv.slice(2));
const distDir = resolveDistDir();

const server = http.createServer(async (req, res) => {
  setSecurityHeaders(res);

  const method = req.method || 'GET';
  const reqUrl = new URL(req.url || '/', `http://${host}:${port}`);
  const pathname = reqUrl.pathname;

  if (pathname === '/env-config.js' && method === 'GET') {
    const apiKey = getApiKey();
    const payload = `window.__ENV__ = Object.freeze({ GOOGLE_MAPS_API_KEY: ${JSON.stringify(apiKey)} });\n`;
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(payload);
    return;
  }

  if (pathname === '/api/health' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'ok', hasApiKey: Boolean(getApiKey()) }));
    return;
  }

  if (pathname === '/api/places/search' && method === 'POST') {
    const apiKey = getApiKey();
    if (!apiKey) {
      res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'GOOGLE_MAPS_API_KEY is not configured.' }));
      return;
    }
    try {
      const body = await readJsonBody(req);
      const textQuery = typeof body.textQuery === 'string' ? body.textQuery.trim() : '';
      if (!textQuery) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'textQuery is required' }));
        return;
      }
      const upstreamRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.location,places.types',
        },
        body: JSON.stringify({
          textQuery,
          maxResultCount: Math.min(Math.max(Number(body.maxResultCount) || 6, 1), 10),
          languageCode: 'en',
          regionCode: 'US',
          locationBias: {
            circle: {
              center: { latitude: 40.73061, longitude: -73.98661 },
              radius: 18000,
            },
          },
        }),
      });
      const data = await upstreamRes.json();
      res.writeHead(upstreamRes.status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ places: Array.isArray(data.places) ? data.places : [] }));
    } catch (error) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Failed to query Places API (New).' }));
    }
    return;
  }

  if (pathname === '/api/elevation' && method === 'POST') {
    const apiKey = getApiKey();
    if (!apiKey) {
      res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'GOOGLE_MAPS_API_KEY is not configured.' }));
      return;
    }
    try {
      const body = await readJsonBody(req);
      const locations = Array.isArray(body.locations) ? body.locations.slice(0, 64) : [];
      if (locations.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'locations array is required' }));
        return;
      }
      const formatted = locations
        .map((pt) => `${Number(pt.lat)},${Number(pt.lng)}`)
        .join('|');
      const url = new URL('https://maps.googleapis.com/maps/api/elevation/json');
      url.searchParams.set('locations', formatted);
      url.searchParams.set('key', apiKey);
      const upstreamRes = await fetch(url.toString());
      const data = await upstreamRes.json();
      const results = Array.isArray(data.results)
        ? data.results.map((r) => ({
            elevation: r.elevation,
            location: r.location,
            resolution: r.resolution,
          }))
        : [];
      res.writeHead(upstreamRes.status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: data.status, results }));
    } catch {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Failed to query Elevation API.' }));
    }
    return;
  }

  if (pathname === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (method !== 'GET' && method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');
    return;
  }

  const decodedPath = decodeURIComponent(pathname);
  const safeRelative = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '');
  let targetPath = path.resolve(distDir, safeRelative);

  if (!targetPath.startsWith(path.resolve(distDir))) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(targetPath) || fs.statSync(targetPath).isDirectory()) {
    targetPath = path.join(distDir, 'index.html');
  }

  if (!fs.existsSync(targetPath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Production build not found. Run npm run build first.');
    return;
  }

  const ext = path.extname(targetPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const cacheControl =
    ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': cacheControl,
  });

  if (method === 'HEAD') {
    res.end();
    return;
  }

  fs.createReadStream(targetPath).pipe(res);
});

server.listen(port, host, () => {
  console.log(`NYC Spatial Intelligence Workbench listening at http://${host}:${port}`);
});
