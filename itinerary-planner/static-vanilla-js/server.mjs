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
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
};

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let val = trimmed.slice(eqIndex + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    parsed[key] = val;
  }
  return parsed;
}

const fileEnv = {
  ...loadEnvFile(path.join(ROOT_DIR, '.env')),
  ...loadEnvFile(path.join(ROOT_DIR, '.env.local')),
};

function getEnvValue(name, fallback = '') {
  const fromProcess = process.env[name];
  if (fromProcess !== undefined && fromProcess !== '') return fromProcess;
  const fromFile = fileEnv[name];
  if (fromFile !== undefined && fromFile !== '') return fromFile;
  return fallback;
}

function parseCliArgs(argv) {
  let host = '127.0.0.1';
  let port = Number.parseInt(getEnvValue('PORT', '3000'), 10);
  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    port = 3000;
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--host' && i + 1 < argv.length) {
      host = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--host=')) {
      host = arg.slice('--host='.length);
    } else if (arg === '--port' && i + 1 < argv.length) {
      const parsedPort = Number.parseInt(argv[i + 1], 10);
      if (Number.isFinite(parsedPort) && parsedPort > 0 && parsedPort <= 65535) {
        port = parsedPort;
      }
      i += 1;
    } else if (arg.startsWith('--port=')) {
      const parsedPort = Number.parseInt(arg.slice('--port='.length), 10);
      if (Number.isFinite(parsedPort) && parsedPort > 0 && parsedPort <= 65535) {
        port = parsedPort;
      }
    }
  }

  // Strictly bind to loopback; never expose on 0.0.0.0
  if (host !== '127.0.0.1' && host !== 'localhost' && host !== '::1') {
    console.warn(`Security policy: overriding host "${host}" with 127.0.0.1.`);
    host = '127.0.0.1';
  }

  return { host, port };
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

function getApiKey() {
  const key = getEnvValue('GOOGLE_MAPS_API_KEY', '').trim();
  if (!key || key === 'your_google_maps_api_key_here') return '';
  return key;
}

async function handleTimeZoneRequest(reqUrl, res) {
  const latStr = reqUrl.searchParams.get('lat');
  const lngStr = reqUrl.searchParams.get('lng');
  const timestampStr = reqUrl.searchParams.get('timestamp');

  const lat = Number(latStr);
  const lng = Number(lngStr);
  const timestamp = timestampStr
    ? Number.parseInt(timestampStr, 10)
    : Math.floor(Date.now() / 1000);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    sendJson(res, 400, {
      ok: false,
      status: 'INVALID_REQUEST',
      errorMessage: 'Valid lat and lng query parameters are required.',
    });
    return;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    sendJson(res, 200, {
      ok: false,
      status: 'MISSING_KEY',
      errorMessage: 'GOOGLE_MAPS_API_KEY is not configured on the server.',
    });
    return;
  }

  const upstreamUrl = new URL('https://maps.googleapis.com/maps/api/timezone/json');
  upstreamUrl.searchParams.set('location', `${lat},${lng}`);
  upstreamUrl.searchParams.set('timestamp', String(Number.isFinite(timestamp) ? timestamp : Math.floor(Date.now() / 1000)));
  upstreamUrl.searchParams.set('language', 'en');
  upstreamUrl.searchParams.set('key', apiKey);

  try {
    const upstreamRes = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const data = await upstreamRes.json();
    sendJson(res, 200, {
      ok: data.status === 'OK',
      status: data.status || 'UNKNOWN_ERROR',
      timeZoneId: data.timeZoneId || null,
      timeZoneName: data.timeZoneName || null,
      rawOffset: typeof data.rawOffset === 'number' ? data.rawOffset : null,
      dstOffset: typeof data.dstOffset === 'number' ? data.dstOffset : null,
      errorMessage: data.errorMessage || null,
    });
  } catch (error) {
    sendJson(res, 200, {
      ok: false,
      status: 'UPSTREAM_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Failed to reach Time Zone API.',
    });
  }
}

function resolveSafeStaticPath(pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const normalized = decodedPath === '/' ? '/index.html' : decodedPath;
  if (normalized.includes('\0')) return null;

  const segments = normalized.split('/').filter(Boolean);
  for (const segment of segments) {
    if (segment === '..' || segment.startsWith('.')) {
      return null;
    }
  }

  const candidate = path.resolve(ROOT_DIR, `.${normalized}`);
  if (candidate !== ROOT_DIR && !candidate.startsWith(ROOT_DIR + path.sep)) {
    return null;
  }

  return candidate;
}

const server = http.createServer(async (req, res) => {
  const reqMethod = req.method || 'GET';
  const reqUrl = new URL(req.url || '/', 'http://127.0.0.1');

  if (reqUrl.pathname === '/env-config.js') {
    if (reqMethod !== 'GET' && reqMethod !== 'HEAD') {
      setSecurityHeaders(res);
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method Not Allowed');
      return;
    }

    const configPayload = {
      apiKey: getApiKey(),
    };
    const body = [
      'window.process = window.process || { env: { NODE_ENV: "production" } };',
      `window.__GMP_CONFIG__ = ${JSON.stringify(configPayload)};`,
    ].join('\n');

    setSecurityHeaders(res);
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    if (reqMethod === 'HEAD') {
      res.end();
      return;
    }
    res.end(body);
    return;
  }

  if (reqUrl.pathname === '/favicon.ico') {
    setSecurityHeaders(res);
    res.writeHead(204, { 'Cache-Control': 'public, max-age=86400' });
    res.end();
    return;
  }

  if (reqUrl.pathname === '/api/timezone') {
    if (reqMethod !== 'GET') {
      sendJson(res, 405, { ok: false, errorMessage: 'Method Not Allowed' });
      return;
    }
    await handleTimeZoneRequest(reqUrl, res);
    return;
  }

  if (reqMethod !== 'GET' && reqMethod !== 'HEAD') {
    setSecurityHeaders(res);
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');
    return;
  }

  const filePath = resolveSafeStaticPath(reqUrl.pathname);
  if (!filePath) {
    setSecurityHeaders(res);
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (statErr, stats) => {
    if (statErr || !stats.isFile()) {
      setSecurityHeaders(res);
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    setSecurityHeaders(res);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' || ext === '.js' ? 'no-cache' : 'public, max-age=3600',
    });

    if (reqMethod === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      }
      res.end('Internal Server Error');
    });
    stream.pipe(res);
  });
});

const { host, port } = parseCliArgs(process.argv.slice(2));
server.listen(port, host, () => {
  console.log(`Itinerary Planner server listening at http://${host}:${port}`);
});
