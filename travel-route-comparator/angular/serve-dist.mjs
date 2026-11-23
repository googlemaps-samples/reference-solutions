import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCliArgs(argv) {
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

  // Always bind strictly to 127.0.0.1 (never 0.0.0.0)
  const safeHost = host === 'localhost' || host === '127.0.0.1' ? '127.0.0.1' : '127.0.0.1';
  const safePort = Number.isFinite(port) && port > 0 ? port : 4200;
  return { host: safeHost, port: safePort };
}

function loadEnvKey() {
  const envPaths = [
    path.join(__dirname, '.env.local'),
    path.join(__dirname, '.env'),
  ];

  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) continue;
    const content = fs.readFileSync(envPath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIndex = line.indexOf('=');
      if (eqIndex === -1) continue;
      const key = line.slice(0, eqIndex).trim();
      let value = line.slice(eqIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (key === 'GOOGLE_MAPS_API_KEY' && value) {
        return value;
      }
    }
  }

  return process.env.GOOGLE_MAPS_API_KEY || '';
}

function resolveDistDir() {
  const candidates = [
    path.join(__dirname, 'dist', 'travel-route-comparator', 'browser'),
    path.join(__dirname, 'dist', 'travel-route-comparator'),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'index.html'))) {
      return dir;
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

function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

const { host, port } = parseCliArgs(process.argv.slice(2));
const distDir = resolveDistDir();

const server = http.createServer((req, res) => {
  applySecurityHeaders(res);

  const reqUrl = new URL(req.url || '/', `http://${host}:${port}`);
  const pathname = decodeURIComponent(reqUrl.pathname);

  if (pathname === '/env-config.js') {
    const apiKey = loadEnvKey();
    const payload = `window.__ENV__ = ${JSON.stringify({ GOOGLE_MAPS_API_KEY: apiKey })};\n`;
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(payload);
    return;
  }

  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'ok', distDirExists: fs.existsSync(distDir) }));
    return;
  }

  const normalizedPath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(distDir, normalizedPath === '/' ? 'index.html' : normalizedPath);

  if (!filePath.startsWith(distDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    const indexFallback = path.join(distDir, 'index.html');
    if (fs.existsSync(indexFallback)) {
      filePath = indexFallback;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Build output not found. Run "npm run build" first.');
      return;
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, host, () => {
  console.log(`Angular dist server listening on http://${host}:${port}`);
});
