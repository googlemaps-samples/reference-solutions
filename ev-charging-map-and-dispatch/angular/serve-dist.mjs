import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCliArgs(argv) {
  let host = '127.0.0.1';
  let port = Number.parseInt(process.env['PORT'] || '4200', 10);

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

  // Enforce loopback binding per security guidelines
  if (host !== '127.0.0.1' && host !== 'localhost') {
    host = '127.0.0.1';
  }
  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    port = 4200;
  }

  return { host, port };
}

function loadEnvFile(envPath) {
  const parsed = {};
  if (!fs.existsSync(envPath)) {
    return parsed;
  }
  const raw = fs.readFileSync(envPath, 'utf8');
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
    parsed[key] = value;
  }
  return parsed;
}

function resolveDistDir() {
  const candidates = [
    path.join(__dirname, 'dist', 'ev-charging-dispatch', 'browser'),
    path.join(__dirname, 'dist', 'ev-charging-dispatch'),
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
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
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

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');
    return;
  }

  const requestUrl = new URL(req.url || '/', `http://${host}:${port}`);
  const pathname = decodeURIComponent(requestUrl.pathname);

  if (pathname === '/env-config.js') {
    const fileEnv = loadEnvFile(path.join(__dirname, '.env'));
    const apiKey = process.env['GOOGLE_MAPS_API_KEY'] || fileEnv['GOOGLE_MAPS_API_KEY'] || '';
    const payload = `window.__ENV__ = ${JSON.stringify({ GOOGLE_MAPS_API_KEY: apiKey })};\n`;
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    res.end(payload);
    return;
  }

  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (!fs.existsSync(distDir)) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Production build not found. Run "npm run build" first.');
    return;
  }

  const relPath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  let targetPath = path.resolve(distDir, relPath);

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

  fs.readFile(targetPath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    res.end(data);
  });
});

server.listen(port, host, () => {
  console.log(`Serving Angular production build from ${distDir} at http://${host}:${port}`);
});
