import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const STATIC_ALLOWLIST = new Set(['/index.html', '/app.js', '/styles.css']);

function parseCliArgs(argv) {
  let host = '127.0.0.1';
  let port = Number(process.env.PORT || 3000);

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--host' && i + 1 < argv.length) {
      host = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--host=')) {
      host = arg.slice('--host='.length);
    } else if (arg === '--port' && i + 1 < argv.length) {
      port = Number(argv[i + 1]);
      i += 1;
    } else if (arg.startsWith('--port=')) {
      port = Number(arg.slice('--port='.length));
    }
  }

  // Strictly bind to loopback 127.0.0.1 (never 0.0.0.0)
  const safeHost = host === 'localhost' || host === '127.0.0.1' ? '127.0.0.1' : '127.0.0.1';
  const safePort = Number.isInteger(port) && port >= 0 && port <= 65535 ? port : 3000;
  return { host: safeHost, port: safePort };
}

function loadEnvFile(envPath) {
  const parsed = {};
  if (!fs.existsSync(envPath)) {
    return parsed;
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
    parsed[key] = value;
  }
  return parsed;
}

function getApiKey() {
  const fileEnv = loadEnvFile(path.join(__dirname, '.env'));
  const raw = process.env.GOOGLE_MAPS_API_KEY || fileEnv.GOOGLE_MAPS_API_KEY || '';
  if (!raw || raw === 'your_google_maps_api_key_here') {
    return '';
  }
  return raw;
}

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

function sendText(res, statusCode, contentType, body) {
  setSecurityHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': contentType });
  res.end(body);
}

function serveFileSafe(res, absolutePath, contentType, transformFn) {
  const resolvedRoot = path.resolve(__dirname);
  const resolvedTarget = path.resolve(absolutePath);
  if (!resolvedTarget.startsWith(resolvedRoot + path.sep)) {
    sendText(res, 403, 'text/plain; charset=utf-8', 'Forbidden');
    return;
  }
  fs.readFile(resolvedTarget, (err, data) => {
    if (err) {
      sendText(res, 404, 'text/plain; charset=utf-8', 'Not Found');
      return;
    }
    const payload = transformFn ? transformFn(data) : data;
    setSecurityHeaders(res);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(payload);
  });
}

const { host, port } = parseCliArgs(process.argv.slice(2));

const server = http.createServer((req, res) => {
  if (!req.url || (req.method !== 'GET' && req.method !== 'HEAD')) {
    sendText(res, 405, 'text/plain; charset=utf-8', 'Method Not Allowed');
    return;
  }

  let pathname = '/';
  try {
    const parsedUrl = new URL(req.url, `http://${host}:${port}`);
    pathname = decodeURIComponent(parsedUrl.pathname);
  } catch {
    sendText(res, 400, 'text/plain; charset=utf-8', 'Bad Request');
    return;
  }

  if (pathname === '/favicon.ico') {
    setSecurityHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (pathname === '/env-config.js') {
    const apiKey = getApiKey();
    setSecurityHeaders(res);
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(`window.__GMP_CONFIG__ = ${JSON.stringify({ apiKey })};\n`);
    return;
  }

  if (pathname === '/vendor/js-api-loader.js') {
    const loaderPath = path.join(
      __dirname,
      'node_modules',
      '@googlemaps',
      'js-api-loader',
      'dist',
      'index.js'
    );
    serveFileSafe(
      res,
      loaderPath,
      'application/javascript; charset=utf-8',
      (buf) => buf.toString('utf8').replaceAll('process.env.NODE_ENV', '"production"')
    );
    return;
  }

  if (pathname === '/vendor/deck.gl.min.js') {
    const deckPath = path.join(__dirname, 'node_modules', 'deck.gl', 'dist.min.js');
    serveFileSafe(res, deckPath, 'application/javascript; charset=utf-8');
    return;
  }

  const normalizedPath = pathname === '/' ? '/index.html' : pathname;
  if (!STATIC_ALLOWLIST.has(normalizedPath)) {
    sendText(res, 404, 'text/plain; charset=utf-8', 'Not Found');
    return;
  }

  const targetFile = path.join(__dirname, normalizedPath.slice(1));
  const ext = path.extname(targetFile).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  serveFileSafe(res, targetFile, contentType);
});

server.listen(port, host, () => {
  console.log(`Miami Flood Hazard & Safe Shelter Router running at http://${host}:${port}`);
});
