import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
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
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(__dirname, '.env'));
loadEnvFile(path.join(__dirname, '.env.local'));

function parseArgs(argv) {
  let host = '127.0.0.1';
  let port = Number(process.env.PORT || 4173);

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

  // Strictly bind to 127.0.0.1 (never 0.0.0.0)
  const safeHost = host === 'localhost' || host === '127.0.0.1' ? host : '127.0.0.1';
  const safePort = Number.isFinite(port) && port > 0 && port < 65536 ? port : 4173;
  return { host: safeHost, port: safePort };
}

function resolveDistDir() {
  const candidates = [
    path.join(__dirname, 'dist', 'itinerary-planner', 'browser'),
    path.join(__dirname, 'dist', 'itinerary-planner'),
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
  '.txt': 'text/plain; charset=utf-8',
};

function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

function getApiKey() {
  const raw = (process.env.GOOGLE_MAPS_API_KEY || '').trim();
  if (!raw || raw === 'your_google_maps_api_key_here') return '';
  return raw;
}

async function handleTimeZoneProxy(reqUrl, res) {
  const location = (reqUrl.searchParams.get('location') || '').trim();
  const timestamp = (reqUrl.searchParams.get('timestamp') || String(Math.floor(Date.now() / 1000))).trim();
  const language = (reqUrl.searchParams.get('language') || 'en').trim();

  if (!/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(location)) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'INVALID_REQUEST', errorMessage: 'Invalid location format.' }));
    return;
  }

  if (!/^\d+$/.test(timestamp)) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'INVALID_REQUEST', errorMessage: 'Invalid timestamp format.' }));
    return;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ status: 'NO_API_KEY', errorMessage: 'GOOGLE_MAPS_API_KEY is not configured.' }));
    return;
  }

  try {
    const upstreamUrl = new URL('https://maps.googleapis.com/maps/api/timezone/json');
    upstreamUrl.searchParams.set('location', location);
    upstreamUrl.searchParams.set('timestamp', timestamp);
    upstreamUrl.searchParams.set('language', language);
    upstreamUrl.searchParams.set('key', apiKey);

    const upstreamRes = await fetch(upstreamUrl.toString());
    const payload = await upstreamRes.json();
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify(payload));
  } catch (err) {
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        status: 'UPSTREAM_ERROR',
        errorMessage: err instanceof Error ? err.message : 'Failed to reach Time Zone API.',
      })
    );
  }
}

const { host, port } = parseArgs(process.argv.slice(2));
const distDir = resolveDistDir();

const server = http.createServer(async (req, res) => {
  applySecurityHeaders(res);

  const reqUrl = new URL(req.url || '/', `http://${host}:${port}`);
  const pathname = decodeURIComponent(reqUrl.pathname);

  if (pathname === '/env-config.js' && req.method === 'GET') {
    const apiKey = getApiKey();
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(`window.__GMP_CONFIG__ = ${JSON.stringify({ googleMapsApiKey: apiKey })};\n`);
    return;
  }

  if (pathname === '/api/timezone' && req.method === 'GET') {
    await handleTimeZoneProxy(reqUrl, res);
    return;
  }

  if (!fs.existsSync(distDir)) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Build output not found. Run "npm run build" first.');
    return;
  }

  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  let targetPath = path.resolve(distDir, relativePath);

  if (!targetPath.startsWith(distDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(targetPath) || fs.statSync(targetPath).isDirectory()) {
    targetPath = path.join(distDir, 'index.html');
  }

  const ext = path.extname(targetPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=3600',
  });
  fs.createReadStream(targetPath).pipe(res);
});

server.listen(port, host, () => {
  console.log(`Angular Itinerary Planner serving ${distDir} at http://${host}:${port}`);
});
