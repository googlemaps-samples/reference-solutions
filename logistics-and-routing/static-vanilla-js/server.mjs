import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOLUTION_ID = 'gmp_git_agentsamples_v1.0.0';
const ALLOWED_HOST = '127.0.0.1';

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

function parseCliArgs(argv) {
  let host = ALLOWED_HOST;
  let port = Number.parseInt(process.env.PORT || '8080', 10);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--host' && argv[i + 1]) {
      const requestedHost = argv[i + 1].trim();
      host = requestedHost === 'localhost' || requestedHost === '127.0.0.1' ? ALLOWED_HOST : ALLOWED_HOST;
      i += 1;
    } else if (arg.startsWith('--host=')) {
      const requestedHost = arg.slice('--host='.length).trim();
      host = requestedHost === 'localhost' || requestedHost === '127.0.0.1' ? ALLOWED_HOST : ALLOWED_HOST;
    } else if (arg === '--port' && argv[i + 1]) {
      const parsed = Number.parseInt(argv[i + 1], 10);
      if (Number.isFinite(parsed) && parsed > 0 && parsed < 65536) {
        port = parsed;
      }
      i += 1;
    } else if (arg.startsWith('--port=')) {
      const parsed = Number.parseInt(arg.slice('--port='.length), 10);
      if (Number.isFinite(parsed) && parsed > 0 && parsed < 65536) {
        port = parsed;
      }
    }
  }

  return { host: ALLOWED_HOST, port };
}

async function loadEnvFiles() {
  for (const filename of ['.env', '.env.local']) {
    const envPath = path.join(__dirname, filename);
    try {
      const raw = await fs.readFile(envPath, 'utf8');
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx <= 0) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let value = trimmed.slice(eqIdx + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!(key in process.env) && value) {
          process.env[key] = value;
        }
      }
    } catch {
      // Ignore missing .env files
    }
  }
}

function getApiKey() {
  const key = (process.env.GOOGLE_MAPS_API_KEY || '').trim();
  if (!key || key === 'your_google_maps_api_key_here') {
    return '';
  }
  return key;
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

async function readJsonBody(req, maxBytes = 1024 * 1024) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      throw new Error('Request payload exceeds 1MB limit.');
    }
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  const text = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(text);
}

async function handleApiRoutesCompute(req, res) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return sendJson(res, 503, {
      error: 'GOOGLE_MAPS_API_KEY is not configured in .env or environment variables.',
    });
  }

  const body = await readJsonBody(req);
  const fieldMask =
    'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.duration,routes.legs.distanceMeters,routes.legs.startLocation,routes.legs.endLocation,routes.optimizedIntermediateWaypointIndex';

  const upstream = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': fieldMask,
      'X-Goog-Maps-Solution-ID': SOLUTION_ID,
    },
    body: JSON.stringify(body),
  });

  const data = await upstream.json();
  return sendJson(res, upstream.status, data);
}

async function handleApiRoutesMatrix(req, res) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return sendJson(res, 503, {
      error: 'GOOGLE_MAPS_API_KEY is not configured in .env or environment variables.',
    });
  }

  const body = await readJsonBody(req);
  const fieldMask = 'originIndex,destinationIndex,duration,distanceMeters,status,condition';

  const upstream = await fetch(
    'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask,
        'X-Goog-Maps-Solution-ID': SOLUTION_ID,
      },
      body: JSON.stringify(body),
    }
  );

  const data = await upstream.json();
  return sendJson(res, upstream.status, data);
}

async function handleApiRoadsSnap(req, res) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return sendJson(res, 503, {
      error: 'GOOGLE_MAPS_API_KEY is not configured in .env or environment variables.',
    });
  }

  const body = await readJsonBody(req);
  let pathParam = '';
  if (Array.isArray(body.path)) {
    pathParam = body.path
      .map((pt) => `${Number(pt.lat)},${Number(pt.lng)}`)
      .join('|');
  } else if (typeof body.path === 'string') {
    pathParam = body.path;
  }

  if (!pathParam) {
    return sendJson(res, 400, { error: 'Missing required "path" coordinate sequence.' });
  }

  const interpolate = body.interpolate !== false ? 'true' : 'false';
  const url = new URL('https://roads.googleapis.com/v1/snapToRoads');
  url.searchParams.set('path', pathParam);
  url.searchParams.set('interpolate', interpolate);
  url.searchParams.set('key', apiKey);

  const upstream = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Goog-Maps-Solution-ID': SOLUTION_ID,
    },
  });

  const data = await upstream.json();
  return sendJson(res, upstream.status, data);
}

async function handleApiPlacesSearch(req, res) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return sendJson(res, 503, {
      error: 'GOOGLE_MAPS_API_KEY is not configured in .env or environment variables.',
    });
  }

  const body = await readJsonBody(req);
  const fieldMask = 'places.id,places.displayName,places.formattedAddress,places.location';

  const upstream = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': fieldMask,
      'X-Goog-Maps-Solution-ID': SOLUTION_ID,
    },
    body: JSON.stringify(body),
  });

  const data = await upstream.json();
  return sendJson(res, upstream.status, data);
}

async function serveStaticFile(requestPathname, res) {
  let cleanPath = requestPathname === '/' ? '/index.html' : requestPathname;
  try {
    cleanPath = decodeURIComponent(cleanPath);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad Request');
    return;
  }

  // Block hidden files, dotfiles (.env, .git), and server/manifest files
  const segments = cleanPath.split('/').filter(Boolean);
  if (
    segments.some((seg) => seg.startsWith('.') || seg === '..') ||
    cleanPath === '/server.mjs' ||
    cleanPath === '/package.json' ||
    cleanPath === '/package-lock.json'
  ) {
    applySecurityHeaders(res);
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  const rootResolved = path.resolve(__dirname);
  const targetResolved = path.resolve(rootResolved, `.${cleanPath}`);
  if (
    targetResolved !== rootResolved &&
    !targetResolved.startsWith(`${rootResolved}${path.sep}`)
  ) {
    applySecurityHeaders(res);
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  try {
    const stat = await fs.stat(targetResolved);
    if (!stat.isFile()) {
      applySecurityHeaders(res);
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(targetResolved).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = await fs.readFile(targetResolved);

    applySecurityHeaders(res);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300',
    });
    res.end(content);
  } catch {
    applySecurityHeaders(res);
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  }
}

await loadEnvFiles();
const { host, port } = parseCliArgs(process.argv.slice(2));

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url || '/', `http://${host}:${port}`);
  const pathname = reqUrl.pathname;

  try {
    if ((req.method === 'GET' || req.method === 'HEAD') && pathname === '/env-config.js') {
      const apiKey = getApiKey();
      applySecurityHeaders(res);
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      res.end(
        [
          'window.process = window.process || { env: { NODE_ENV: "production" } };',
          `window.__GMP_CONFIG__ = Object.freeze({ apiKey: ${JSON.stringify(apiKey)} });`,
        ].join('\n')
      );
      return;
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && pathname === '/favicon.ico') {
      applySecurityHeaders(res);
      res.writeHead(204, { 'Cache-Control': 'public, max-age=86400' });
      res.end();
      return;
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && pathname === '/api/health') {
      return sendJson(res, 200, { ok: true, hasApiKey: Boolean(getApiKey()) });
    }

    if (req.method === 'POST' && pathname === '/api/routes/compute') {
      return await handleApiRoutesCompute(req, res);
    }

    if (req.method === 'POST' && pathname === '/api/routes/matrix') {
      return await handleApiRoutesMatrix(req, res);
    }

    if (req.method === 'POST' && pathname === '/api/roads/snap') {
      return await handleApiRoadsSnap(req, res);
    }

    if (req.method === 'POST' && pathname === '/api/places/search') {
      return await handleApiPlacesSearch(req, res);
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      return await serveStaticFile(pathname, res);
    }

    return sendJson(res, 405, { error: 'Method Not Allowed' });
  } catch (err) {
    return sendJson(res, 500, {
      error: err instanceof Error ? err.message : 'Internal server error',
    });
  }
});

server.listen(port, host, () => {
  console.log(`Dallas Fleet Telematics & Dispatch server listening at http://${host}:${port}`);
});
