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
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

const BLOCKED_FILENAMES = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  '.gitignore',
  'package.json',
  'package-lock.json',
  'server.mjs',
]);

function loadDotEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const filename of envFiles) {
    const filePath = path.join(ROOT_DIR, filename);
    if (!fs.existsSync(filePath)) {
      continue;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex <= 0) {
        continue;
      }
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
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
}

function parseCliArgs(argv) {
  let host = '127.0.0.1';
  let port = Number(process.env.PORT) || 3000;

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

  // Enforce loopback binding: never bind 0.0.0.0
  if (host !== '127.0.0.1' && host !== 'localhost') {
    host = '127.0.0.1';
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    port = 3000;
  }
  return { host: '127.0.0.1', port };
}

function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

function sendResponse(res, statusCode, contentType, body, extraHeaders = {}) {
  applySecurityHeaders(res);
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    ...extraHeaders,
  });
  res.end(body);
}

function resolveSafeStaticPath(requestPathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(requestPathname);
  } catch {
    return null;
  }

  if (decodedPath.includes('\0')) {
    return null;
  }

  const normalizedRel = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '');
  const candidatePath = path.resolve(ROOT_DIR, normalizedRel);

  if (candidatePath !== ROOT_DIR && !candidatePath.startsWith(ROOT_DIR + path.sep)) {
    return null;
  }

  const relFromRoot = path.relative(ROOT_DIR, candidatePath);
  const segments = relFromRoot.split(path.sep);

  if (segments.some((seg) => seg.startsWith('.'))) {
    return null;
  }
  if (BLOCKED_FILENAMES.has(path.basename(candidatePath))) {
    return null;
  }

  return candidatePath;
}

loadDotEnv();
const { host, port } = parseCliArgs(process.argv.slice(2));

const server = http.createServer((req, res) => {
  if (!req.url) {
    sendResponse(res, 400, 'text/plain; charset=utf-8', 'Bad Request');
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendResponse(res, 405, 'text/plain; charset=utf-8', 'Method Not Allowed');
    return;
  }

  const parsedUrl = new URL(req.url, `http://${host}:${port}`);
  const pathname = parsedUrl.pathname;

  if (pathname === '/healthz') {
    const payload = JSON.stringify({ ok: true });
    sendResponse(res, 200, 'application/json; charset=utf-8', req.method === 'HEAD' ? '' : payload, {
      'Cache-Control': 'no-store',
    });
    return;
  }

  if (pathname === '/favicon.ico') {
    applySecurityHeaders(res);
    res.writeHead(204, { 'Cache-Control': 'public, max-age=86400' });
    res.end();
    return;
  }

  if (pathname === '/env-config.js') {
    const apiKey = (process.env.GOOGLE_MAPS_API_KEY || '').trim();
    const configScript = [
      'window.process = window.process || { env: { NODE_ENV: "production" } };',
      `window.__GMP_CONFIG__ = ${JSON.stringify({ apiKey })};`,
    ].join('\n');

    sendResponse(
      res,
      200,
      'application/javascript; charset=utf-8',
      req.method === 'HEAD' ? '' : configScript,
      { 'Cache-Control': 'no-store' }
    );
    return;
  }

  const filePath = resolveSafeStaticPath(pathname);
  if (!filePath) {
    sendResponse(res, 403, 'text/plain; charset=utf-8', 'Forbidden');
    return;
  }

  fs.stat(filePath, (statErr, stats) => {
    if (statErr || !stats.isFile()) {
      sendResponse(res, 404, 'text/plain; charset=utf-8', 'Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    applySecurityHeaders(res);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300',
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) {
        sendResponse(res, 500, 'text/plain; charset=utf-8', 'Internal Server Error');
      } else {
        res.destroy();
      }
    });
    stream.pipe(res);
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Server listening at http://127.0.0.1:${port}`);
});
