import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname);
const LOOPBACK_HOST = '127.0.0.1';
const ALLOWED_LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

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
  '.map': 'application/json; charset=utf-8',
};

function loadDotEnvFiles() {
  const envMap = {};
  for (const filename of ['.env', '.env.local']) {
    const filePath = path.join(ROOT_DIR, filename);
    if (!fs.existsSync(filePath)) continue;
    const raw = fs.readFileSync(filePath, 'utf8');
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
      envMap[key] = value;
    }
  }
  return envMap;
}

function parseCliArgs(argv) {
  let host = LOOPBACK_HOST;
  let port = Number.parseInt(process.env.PORT || '3000', 10);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--host' && i + 1 < argv.length) {
      host = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--host=')) {
      host = arg.slice('--host='.length);
    } else if (arg === '--port' && i + 1 < argv.length) {
      port = Number.parseInt(argv[i + 1], 10);
      i += 1;
    } else if (arg.startsWith('--port=')) {
      port = Number.parseInt(arg.slice('--port='.length), 10);
    }
  }

  // Enforce loopback binding exclusively
  if (!ALLOWED_LOOPBACK_HOSTS.has(host)) {
    host = LOOPBACK_HOST;
  }
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    port = 3000;
  }

  return { host, port };
}

function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
}

function sendText(res, statusCode, message) {
  applySecurityHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(message);
}

function getApiKey() {
  const fileEnv = loadDotEnvFiles();
  const rawKey = (
    process.env.GOOGLE_MAPS_API_KEY ||
    fileEnv.GOOGLE_MAPS_API_KEY ||
    ''
  ).trim();
  if (!rawKey || rawKey === 'your_google_maps_api_key_here') {
    return '';
  }
  return rawKey;
}

const ALLOWED_STATIC_ROOTS = new Set([
  'index.html',
  'app.js',
  'styles.css',
]);

function isSafeRelativeAsset(relPath) {
  if (!relPath || relPath.includes('\0')) return false;
  const normalized = path.posix.normalize(relPath);
  if (normalized.startsWith('..') || path.isAbsolute(normalized)) return false;
  const segments = normalized.split('/');
  if (segments.some((seg) => seg.startsWith('.'))) return false;
  if (ALLOWED_STATIC_ROOTS.has(normalized)) return true;
  if (normalized.startsWith('node_modules/@googlemaps/js-api-loader/')) {
    return true;
  }
  return false;
}

const { host, port } = parseCliArgs(process.argv.slice(2));

const server = http.createServer((req, res) => {
  if (!req.url) {
    sendText(res, 400, 'Bad Request');
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendText(res, 405, 'Method Not Allowed');
    return;
  }

  let pathname;
  try {
    const reqUrl = new URL(req.url, `http://${host}:${port}`);
    pathname = decodeURIComponent(reqUrl.pathname);
  } catch {
    sendText(res, 400, 'Invalid URL');
    return;
  }

  if (pathname === '/env-config.js') {
    const apiKey = getApiKey();
    const payload = [
      'window.process = window.process || { env: { NODE_ENV: "production" } };',
      `window.__GMP_CONFIG__ = { apiKey: ${JSON.stringify(apiKey)} };`,
      '',
    ].join('\n');
    applySecurityHeaders(res);
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    res.end(payload);
    return;
  }

  if (pathname === '/favicon.ico') {
    applySecurityHeaders(res);
    res.writeHead(204, { 'Cache-Control': 'public, max-age=86400' });
    res.end();
    return;
  }

  const relativePath =
    pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');

  if (!isSafeRelativeAsset(relativePath)) {
    sendText(res, 404, 'Not Found');
    return;
  }

  const resolvedPath = path.resolve(ROOT_DIR, relativePath);
  if (!resolvedPath.startsWith(ROOT_DIR + path.sep)) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  fs.stat(resolvedPath, (statErr, stats) => {
    if (statErr || !stats.isFile()) {
      sendText(res, 404, 'Not Found');
      return;
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    applySecurityHeaders(res);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300',
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(resolvedPath);
    stream.on('error', () => {
      if (!res.headersSent) {
        sendText(res, 500, 'Internal Server Error');
      } else {
        res.destroy();
      }
    });
    stream.pipe(res);
  });
});

server.listen(port, host, () => {
  const addr = server.address();
  const actualPort = typeof addr === 'object' && addr ? addr.port : port;
  console.log(
    `LondonSpotter static-vanilla-js server listening at http://${host}:${actualPort}`
  );
});
