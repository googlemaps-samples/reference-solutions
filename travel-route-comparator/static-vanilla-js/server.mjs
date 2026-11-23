import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname);

function loadDotEnv(envPath) {
  if (!fs.existsSync(envPath)) {
    return;
  }
  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) {
      continue;
    }
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
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

function parseCliArgs(argv) {
  let host = '127.0.0.1';
  let port = Number.parseInt(process.env.PORT || '3000', 10);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--host' && i + 1 < argv.length) {
      const requested = argv[i + 1].trim();
      host = requested === 'localhost' || requested === '127.0.0.1' ? '127.0.0.1' : '127.0.0.1';
      i += 1;
    } else if (arg.startsWith('--host=')) {
      const requested = arg.slice('--host='.length).trim();
      host = requested === 'localhost' || requested === '127.0.0.1' ? '127.0.0.1' : '127.0.0.1';
    } else if (arg === '--port' && i + 1 < argv.length) {
      const parsed = Number.parseInt(argv[i + 1], 10);
      if (!Number.isNaN(parsed) && parsed > 0 && parsed < 65536) {
        port = parsed;
      }
      i += 1;
    } else if (arg.startsWith('--port=')) {
      const parsed = Number.parseInt(arg.slice('--port='.length), 10);
      if (!Number.isNaN(parsed) && parsed > 0 && parsed < 65536) {
        port = parsed;
      }
    }
  }

  return { host, port };
}

loadDotEnv(path.join(ROOT_DIR, '.env'));

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const ALLOWED_STATIC_PATHS = new Set([
  '/index.html',
  '/app.js',
  '/styles.css',
  '/node_modules/@googlemaps/js-api-loader/dist/index.js',
]);

function applySecurityHeaders(res, extraHeaders = {}) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  for (const [key, value] of Object.entries(extraHeaders)) {
    res.setHeader(key, value);
  }
}

function sendError(res, statusCode, message) {
  applySecurityHeaders(res, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.statusCode = statusCode;
  res.end(message);
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    sendError(res, 400, 'Bad Request');
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendError(res, 405, 'Method Not Allowed');
    return;
  }

  let pathname;
  try {
    const parsedUrl = new URL(req.url, 'http://127.0.0.1');
    pathname = decodeURIComponent(parsedUrl.pathname);
  } catch {
    sendError(res, 400, 'Invalid URL');
    return;
  }

  if (pathname.includes('\0')) {
    sendError(res, 400, 'Bad Request');
    return;
  }

  if (pathname === '/favicon.ico') {
    applySecurityHeaders(res, { 'Cache-Control': 'public, max-age=86400' });
    res.statusCode = 204;
    res.end();
    return;
  }

  if (pathname === '/env-config.js') {
    const rawKey = (process.env.GOOGLE_MAPS_API_KEY || '').trim();
    const isPlaceholder =
      !rawKey ||
      rawKey === 'your_google_maps_api_key_here' ||
      rawKey === 'YOUR_API_KEY';
    const safeConfig = {
      apiKey: isPlaceholder ? '' : rawKey,
      configured: !isPlaceholder,
    };
    const payload = `window.__GMP_CONFIG__ = Object.freeze(${JSON.stringify(safeConfig)});\n`;
    applySecurityHeaders(res, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.statusCode = 200;
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    res.end(payload);
    return;
  }

  const normalizedPath = pathname === '/' ? '/index.html' : path.posix.normalize(pathname);
  if (!ALLOWED_STATIC_PATHS.has(normalizedPath)) {
    sendError(res, 404, 'Not Found');
    return;
  }

  const relativePath = normalizedPath.slice(1);
  const resolvedPath = path.resolve(ROOT_DIR, relativePath);
  if (!resolvedPath.startsWith(ROOT_DIR + path.sep)) {
    sendError(res, 403, 'Forbidden');
    return;
  }

  fs.readFile(resolvedPath, (err, data) => {
    if (err) {
      sendError(res, 404, 'Not Found');
      return;
    }
    const ext = path.extname(resolvedPath).toLowerCase();
    applySecurityHeaders(res, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': normalizedPath.startsWith('/node_modules/')
        ? 'public, max-age=86400'
        : 'no-cache',
    });
    res.statusCode = 200;
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    res.end(data);
  });
});

const { host, port } = parseCliArgs(process.argv.slice(2));
server.listen(port, host, () => {
  console.log(`Static Vanilla JS server listening on http://${host}:${port}`);
});
