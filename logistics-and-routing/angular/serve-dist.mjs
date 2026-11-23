import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOLUTION_ID_HEADER = 'gmp_git_agentsamples_v1.0.0';

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

parseEnvFile(path.join(__dirname, '.env.local'));
parseEnvFile(path.join(__dirname, '.env'));

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

  // Always bind strictly to loopback
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
    path.join(__dirname, 'dist', 'dallas-fleet-telematics', 'browser'),
    path.join(__dirname, 'dist', 'dallas-fleet-telematics'),
    path.join(__dirname, 'dist'),
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

function getApiKey() {
  const key = (process.env.GOOGLE_MAPS_API_KEY || '').trim();
  if (!key || key === 'your_google_maps_api_key_here') {
    return '';
  }
  return key;
}

async function handleRoadsSnap(req, res) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return sendJson(res, 503, {
      error: 'GOOGLE_MAPS_API_KEY is not configured in .env or environment.',
    });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON request body.' });
  }

  const points = Array.isArray(body?.path) ? body.path : [];
  if (points.length < 2 || points.length > 100) {
    return sendJson(res, 400, {
      error: 'Provide between 2 and 100 coordinate points in `path`.',
    });
  }

  const formattedPath = points
    .map((pt) => `${Number(pt.lat)},${Number(pt.lng)}`)
    .join('|');
  const interpolate = body?.interpolate !== false ? 'true' : 'false';

  const upstreamUrl = new URL('https://roads.googleapis.com/v1/snapToRoads');
  upstreamUrl.searchParams.set('path', formattedPath);
  upstreamUrl.searchParams.set('interpolate', interpolate);
  upstreamUrl.searchParams.set('key', apiKey);

  try {
    const upstreamRes = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: {
        'X-Goog-Maps-Solution-ID': SOLUTION_ID_HEADER,
      },
    });
    const data = await upstreamRes.json();
    if (!upstreamRes.ok) {
      return sendJson(res, upstreamRes.status, {
        error: data?.error?.message || `Roads API returned ${upstreamRes.status}`,
        details: data,
      });
    }
    return sendJson(res, 200, data);
  } catch (err) {
    return sendJson(res, 502, {
      error: err instanceof Error ? err.message : 'Failed to reach Roads API.',
    });
  }
}

async function handleRoutesCompute(req, res) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return sendJson(res, 503, {
      error: 'GOOGLE_MAPS_API_KEY is not configured in .env or environment.',
    });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON request body.' });
  }

  const fieldMask =
    'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.duration,routes.legs.distanceMeters,routes.legs.startLocation,routes.legs.endLocation,routes.optimizedIntermediateWaypointIndex';

  try {
    const upstreamRes = await fetch(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': fieldMask,
          'X-Goog-Maps-Solution-ID': SOLUTION_ID_HEADER,
        },
        body: JSON.stringify(body),
      }
    );
    const data = await upstreamRes.json();
    if (!upstreamRes.ok) {
      return sendJson(res, upstreamRes.status, {
        error: data?.error?.message || `Routes API returned ${upstreamRes.status}`,
        details: data,
      });
    }
    return sendJson(res, 200, data);
  } catch (err) {
    return sendJson(res, 502, {
      error: err instanceof Error ? err.message : 'Failed to reach Routes API.',
    });
  }
}

async function handleRoutesMatrix(req, res) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return sendJson(res, 503, {
      error: 'GOOGLE_MAPS_API_KEY is not configured in .env or environment.',
    });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON request body.' });
  }

  const fieldMask = 'originIndex,destinationIndex,duration,distanceMeters,status,condition';

  try {
    const upstreamRes = await fetch(
      'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': fieldMask,
          'X-Goog-Maps-Solution-ID': SOLUTION_ID_HEADER,
        },
        body: JSON.stringify(body),
      }
    );
    const data = await upstreamRes.json();
    if (!upstreamRes.ok) {
      return sendJson(res, upstreamRes.status, {
        error: data?.error?.message || `Route Matrix API returned ${upstreamRes.status}`,
        details: data,
      });
    }
    return sendJson(res, 200, data);
  } catch (err) {
    return sendJson(res, 502, {
      error: err instanceof Error ? err.message : 'Failed to reach Route Matrix API.',
    });
  }
}

async function handlePlacesSearch(req, res) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return sendJson(res, 503, {
      error: 'GOOGLE_MAPS_API_KEY is not configured in .env or environment.',
    });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON request body.' });
  }

  const fieldMask =
    'places.id,places.displayName,places.formattedAddress,places.location';

  try {
    const upstreamRes = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': fieldMask,
          'X-Goog-Maps-Solution-ID': SOLUTION_ID_HEADER,
        },
        body: JSON.stringify(body),
      }
    );
    const data = await upstreamRes.json();
    if (!upstreamRes.ok) {
      return sendJson(res, upstreamRes.status, {
        error: data?.error?.message || `Places API returned ${upstreamRes.status}`,
        details: data,
      });
    }
    return sendJson(res, 200, data);
  } catch (err) {
    return sendJson(res, 502, {
      error: err instanceof Error ? err.message : 'Failed to reach Places API.',
    });
  }
}

function serveStaticFile(reqPath, distDir, res) {
  const safePath = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
  let targetPath = path.join(distDir, safePath === '/' ? 'index.html' : safePath);

  if (!targetPath.startsWith(distDir)) {
    setSecurityHeaders(res);
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(targetPath) || fs.statSync(targetPath).isDirectory()) {
    targetPath = path.join(distDir, 'index.html');
  }

  if (!fs.existsSync(targetPath)) {
    setSecurityHeaders(res);
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Build output not found. Run `npm run build` first.');
    return;
  }

  const ext = path.extname(targetPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  setSecurityHeaders(res);
  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
  });
  fs.createReadStream(targetPath).pipe(res);
}

const { host, port } = parseArgs(process.argv.slice(2));
const distDir = resolveDistDir();

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url || '/', `http://${host}:${port}`);
  const pathname = requestUrl.pathname;

  if (pathname === '/env-config.js' && req.method === 'GET') {
    const apiKey = getApiKey();
    setSecurityHeaders(res);
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(
      `window.__ENV__ = Object.freeze({ GOOGLE_MAPS_API_KEY: ${JSON.stringify(apiKey)} });\n`
    );
    return;
  }

  if (pathname === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, { ok: true, hasApiKey: Boolean(getApiKey()) });
  }

  if (pathname === '/api/roads/snap' && req.method === 'POST') {
    return handleRoadsSnap(req, res);
  }

  if (pathname === '/api/routes/compute' && req.method === 'POST') {
    return handleRoutesCompute(req, res);
  }

  if (pathname === '/api/routes/matrix' && req.method === 'POST') {
    return handleRoutesMatrix(req, res);
  }

  if (pathname === '/api/places/search' && req.method === 'POST') {
    return handlePlacesSearch(req, res);
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    setSecurityHeaders(res);
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');
    return;
  }

  serveStaticFile(pathname, distDir, res);
});

server.listen(port, host, () => {
  console.log(`Dallas Fleet Telematics server listening on http://${host}:${port}`);
  console.log(`Serving Angular build from: ${distDir}`);
});
