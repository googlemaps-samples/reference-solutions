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

  // Strictly bind to loopback address
  if (host !== '127.0.0.1' && host !== 'localhost') {
    host = '127.0.0.1';
  }
  if (!Number.isFinite(port) || port <= 0) {
    port = 4200;
  }

  return { host, port };
}

function loadDotEnv(envFilePath) {
  const parsed = {};
  if (!fs.existsSync(envFilePath)) {
    return parsed;
  }

  const content = fs.readFileSync(envFilePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const eqIdx = line.indexOf('=');
    if (eqIdx <= 0) {
      continue;
    }
    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();
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
  const dotEnv = loadDotEnv(path.join(__dirname, '.env'));
  const raw = process.env.GOOGLE_MAPS_API_KEY || dotEnv.GOOGLE_MAPS_API_KEY || '';
  if (!raw || raw === 'your_google_maps_api_key_here') {
    return '';
  }
  return raw;
}

function resolveDistDir() {
  const candidates = [
    path.join(__dirname, 'dist', 'driving-and-geofencing-angular', 'browser'),
    path.join(__dirname, 'dist', 'driving-and-geofencing-angular'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'index.html'))) {
      return candidate;
    }
  }

  const distRoot = path.join(__dirname, 'dist');
  if (fs.existsSync(distRoot)) {
    for (const entry of fs.readdirSync(distRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const browserDir = path.join(distRoot, entry.name, 'browser');
      if (fs.existsSync(path.join(browserDir, 'index.html'))) {
        return browserDir;
      }
      const directDir = path.join(distRoot, entry.name);
      if (fs.existsSync(path.join(directDir, 'index.html'))) {
        return directDir;
      }
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
  '.map': 'application/json; charset=utf-8',
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
    const apiKey = getApiKey();
    const payload = `window.__ENV__ = ${JSON.stringify({ GOOGLE_MAPS_API_KEY: apiKey })};\n`;
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    });
    res.end(payload);
    return;
  }

  if (pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const resolvedPath = path.resolve(distDir, relativePath);

  if (!resolvedPath.startsWith(path.resolve(distDir))) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  let targetPath = resolvedPath;
  if (!fs.existsSync(targetPath) || fs.statSync(targetPath).isDirectory()) {
    const indexHtml = path.join(distDir, 'index.html');
    if (fs.existsSync(indexHtml)) {
      targetPath = indexHtml;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Production build not found. Run "npm run build" first.');
      return;
    }
  }

  const ext = path.extname(targetPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(targetPath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal server error');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(port, host, () => {
  console.log(`Serving Angular production build from ${distDir} at http://${host}:${port}`);
});
