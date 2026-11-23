import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadDotEnv(envPath) {
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
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

loadDotEnv(path.join(process.cwd(), '.env'));
loadDotEnv(path.join(__dirname, '.env'));

function parseArgs(argv) {
  let host = '127.0.0.1';
  let port = Number(process.env.PORT || 4200);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--host' && argv[i + 1]) {
      host = argv[++i];
    } else if (arg.startsWith('--host=')) {
      host = arg.slice('--host='.length);
    } else if (arg === '--port' && argv[i + 1]) {
      port = Number(argv[++i]);
    } else if (arg.startsWith('--port=')) {
      port = Number(argv.slice('--port='.length));
    }
  }

  if (host !== '127.0.0.1' && host !== 'localhost') {
    host = '127.0.0.1';
  }
  if (!Number.isFinite(port) || port <= 0) {
    port = 4200;
  }
  return { host, port };
}

function resolveDistDir() {
  const candidates = [
    path.join(__dirname, 'dist', 'ridesharing-tracker-angular', 'browser'),
    path.join(__dirname, 'dist', 'ridesharing-tracker-angular'),
    path.join(process.cwd(), 'dist', 'ridesharing-tracker-angular', 'browser'),
    path.join(process.cwd(), 'dist', 'ridesharing-tracker-angular'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'index.html'))) {
      return candidate;
    }
  }
  return candidates[0];
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
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

async function handleApiProxy(req, res, pathname) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    sendJson(res, 503, { error: 'GOOGLE_MAPS_API_KEY is not configured on the server.' });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    sendJson(res, 400, { error: err instanceof Error ? err.message : 'Invalid JSON body' });
    return;
  }

  let upstreamUrl = '';
  let fieldMask = '';

  if (pathname === '/api/routes/compute') {
    upstreamUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    fieldMask =
      'routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline.encodedPolyline,routes.routeLabels,routes.travelAdvisory.fuelConsumptionMicroliters,routes.localizedValues';
  } else if (pathname === '/api/routes/matrix') {
    upstreamUrl = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix';
    fieldMask = 'originIndex,destinationIndex,duration,distanceMeters,status,condition';
  } else if (pathname === '/api/places/search') {
    upstreamUrl = 'https://places.googleapis.com/v1/places:searchText';
    fieldMask = 'places.id,places.displayName,places.formattedAddress,places.location';
  } else {
    sendJson(res, 404, { error: 'API route not found' });
    return;
  }

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify(body),
    });

    const text = await upstreamRes.text();
    applySecurityHeaders(res);
    res.writeHead(upstreamRes.status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(text);
  } catch (err) {
    sendJson(res, 502, {
      error: err instanceof Error ? err.message : 'Upstream Google Maps API request failed',
    });
  }
}

const { host, port } = parseArgs(process.argv.slice(2));
const distDir = resolveDistDir();

const server = http.createServer(async (req, res) => {
  const method = req.method || 'GET';
  const reqUrl = new URL(req.url || '/', `http://${host}:${port}`);
  const pathname = decodeURIComponent(reqUrl.pathname);

  if (pathname === '/env-config.js' && method === 'GET') {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    const effectiveKey = apiKey === 'your_google_maps_api_key_here' ? '' : apiKey;
    applySecurityHeaders(res);
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(`window.__ENV__ = ${JSON.stringify({ GOOGLE_MAPS_API_KEY: effectiveKey })};\n`);
    return;
  }

  if (pathname.startsWith('/api/') && method === 'POST') {
    await handleApiProxy(req, res, pathname);
    return;
  }

  if (method !== 'GET' && method !== 'HEAD') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const resolvedPath = path.resolve(distDir, relativePath);

  if (!resolvedPath.startsWith(path.resolve(distDir))) {
    applySecurityHeaders(res);
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  let filePath = resolvedPath;
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    applySecurityHeaders(res);
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Build output not found. Run `npm run build` first.');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  applySecurityHeaders(res);
  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  });

  if (method === 'HEAD') {
    res.end();
    return;
  }

  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, host, () => {
  console.log(`Serving Angular app from ${distDir} at http://${host}:${port}`);
});
