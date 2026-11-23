import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = __dirname;

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
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(ROOT_DIR, '.env'));
loadEnvFile(path.join(ROOT_DIR, '.env.local'));

function parseArgs(argv) {
  let host = '127.0.0.1';
  let port = Number(process.env.PORT || 3000);

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
  if (host !== '127.0.0.1' && host !== 'localhost') {
    console.warn(`[server] Overriding non-loopback host "${host}" to "127.0.0.1".`);
    host = '127.0.0.1';
  }
  if (host === 'localhost') {
    host = '127.0.0.1';
  }
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    port = 3000;
  }

  return { host, port };
}

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

const ALLOWED_ROOT_FILES = new Set(['index.html', 'app.js', 'styles.css']);
const LOADER_DIST_DIR = path.resolve(
  ROOT_DIR,
  'node_modules',
  '@googlemaps',
  'js-api-loader',
  'dist'
);

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

function sendError(res, statusCode, message) {
  setSecurityHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(message);
}

function resolveSafeStaticPath(requestPathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(requestPathname);
  } catch {
    return null;
  }

  if (decodedPath.includes('\0')) return null;

  const normalized = path.posix.normalize(decodedPath);
  const relPath = normalized === '/' ? 'index.html' : normalized.replace(/^\/+/, '');

  if (ALLOWED_ROOT_FILES.has(relPath)) {
    return path.resolve(ROOT_DIR, relPath);
  }

  if (relPath.startsWith('node_modules/@googlemaps/js-api-loader/dist/')) {
    const candidate = path.resolve(ROOT_DIR, relPath);
    const relativeToLoader = path.relative(LOADER_DIST_DIR, candidate);
    if (
      relativeToLoader &&
      !relativeToLoader.startsWith('..') &&
      !path.isAbsolute(relativeToLoader)
    ) {
      const ext = path.extname(candidate).toLowerCase();
      if (ext === '.js' || ext === '.mjs' || ext === '.map') {
        return candidate;
      }
    }
  }

  return null;
}

const { host, port } = parseArgs(process.argv.slice(2));

const server = http.createServer(async (req, res) => {
  setSecurityHeaders(res);

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendError(res, 405, 'Method Not Allowed');
    return;
  }

  const reqUrl = new URL(req.url || '/', `http://${host}:${port}`);
  const pathname = reqUrl.pathname;

  if (pathname === '/healthz') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (pathname === '/favicon.ico') {
    res.writeHead(204, { 'Cache-Control': 'public, max-age=86400' });
    res.end();
    return;
  }

  if (pathname === '/env-config.js') {
    const apiKey = (process.env.GOOGLE_MAPS_API_KEY || '').trim();
    const payload =
      `window.process = window.process || { env: { NODE_ENV: "production" } };\n` +
      `window.__GMP_CONFIG__ = ${JSON.stringify({ apiKey })};\n`;
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    if (req.method === 'HEAD') {
      res.end();
    } else {
      res.end(payload);
    }
    return;
  }

  const filePath = resolveSafeStaticPath(pathname);
  if (!filePath) {
    sendError(res, 404, 'Not Found');
    return;
  }

  try {
    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) {
      sendError(res, 404, 'Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache',
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const content = await fsp.readFile(filePath);
    res.end(content);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      sendError(res, 404, 'Not Found');
    } else {
      sendError(res, 500, 'Internal Server Error');
    }
  }
});

server.listen(port, host, () => {
  const address = server.address();
  const boundPort = typeof address === 'object' && address ? address.port : port;
  console.log(`Static Vanilla JS server listening at http://${host}:${boundPort}`);
});
