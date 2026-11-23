import http from 'node:http';
import fs from 'node:fs/promises';
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
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
};

const BLOCKED_FILES = new Set([
  '.env',
  '.env.local',
  '.env.example',
  'server.mjs',
  'package.json',
  'package-lock.json',
  'AGENTS.md',
]);

function parseCliArgs(argv) {
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

  // Strictly bind to loopback only (never 0.0.0.0).
  if (host !== '127.0.0.1' && host !== 'localhost') {
    host = '127.0.0.1';
  }
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    port = 3000;
  }

  return { host, port };
}

async function loadEnvApiKey() {
  if (process.env.GOOGLE_MAPS_API_KEY) {
    return process.env.GOOGLE_MAPS_API_KEY.trim();
  }

  for (const envFile of ['.env.local', '.env']) {
    try {
      const raw = await fs.readFile(path.join(ROOT_DIR, envFile), 'utf8');
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) {
          continue;
        }
        const key = trimmed.slice(0, eqIdx).trim();
        if (key !== 'GOOGLE_MAPS_API_KEY') {
          continue;
        }
        let val = trimmed.slice(eqIdx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (val) {
          return val;
        }
      }
    } catch {
      // Ignore missing .env files.
    }
  }

  return '';
}

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

function isSafeStaticPath(requestPathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(requestPathname);
  } catch {
    return null;
  }

  const normalized = decoded === '/' ? '/index.html' : decoded;
  if (normalized.includes('\0')) {
    return null;
  }

  const relativePath = normalized.replace(/^\/+/, '');
  const segments = relativePath.split('/').filter(Boolean);
  if (segments.length === 0) {
    return path.join(ROOT_DIR, 'index.html');
  }

  // Block hidden dotfiles (.env, .git, etc.) and sensitive server files.
  if (segments.some((seg) => seg.startsWith('.'))) {
    return null;
  }
  if (segments.length === 1 && BLOCKED_FILES.has(segments[0])) {
    return null;
  }

  const resolved = path.resolve(ROOT_DIR, relativePath);
  if (resolved !== ROOT_DIR && !resolved.startsWith(`${ROOT_DIR}${path.sep}`)) {
    return null;
  }

  return resolved;
}

const { host, port } = parseCliArgs(process.argv.slice(2));

const server = http.createServer(async (req, res) => {
  setSecurityHeaders(res);

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');
    return;
  }

  const reqUrl = new URL(req.url || '/', `http://${host}:${port}`);

  if (reqUrl.pathname === '/favicon.ico') {
    res.writeHead(204, { 'Cache-Control': 'public, max-age=86400' });
    res.end();
    return;
  }

  if (reqUrl.pathname === '/env-config.js') {
    const apiKey = await loadEnvApiKey();
    const payload = `window.__GMP_CONFIG__ = ${JSON.stringify({ apiKey })};\n`;
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

  const filePath = isSafeStaticPath(reqUrl.pathname);
  if (!filePath) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    res.end(content);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  }
});

server.listen(port, host, () => {
  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;
  console.log(`Store Locator static server listening on http://${host}:${actualPort}`);
});
