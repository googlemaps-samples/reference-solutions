import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseDotEnv(envPath) {
  if (!fs.existsSync(envPath)) {
    return {};
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const parsed = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx <= 0) continue;
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

function parseCliArgs(argv) {
  let host = '127.0.0.1';
  let port = Number.parseInt(process.env.PORT ?? '4200', 10) || 4200;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--host' && argv[i + 1]) {
      host = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--host=')) {
      host = arg.slice('--host='.length);
    } else if (arg === '--port' && argv[i + 1]) {
      const parsedPort = Number.parseInt(argv[i + 1], 10);
      if (Number.isFinite(parsedPort) && parsedPort > 0) {
        port = parsedPort;
      }
      i += 1;
    } else if (arg.startsWith('--port=')) {
      const parsedPort = Number.parseInt(arg.slice('--port='.length), 10);
      if (Number.isFinite(parsedPort) && parsedPort > 0) {
        port = parsedPort;
      }
    }
  }

  // Strictly bind to loopback only (never 0.0.0.0)
  if (host !== '127.0.0.1' && host !== 'localhost') {
    host = '127.0.0.1';
  }
  return { host, port };
}

function resolveDistDir() {
  const candidates = [
    path.join(__dirname, 'dist', 'complete-heatmap-angular', 'browser'),
    path.join(__dirname, 'dist', 'complete-heatmap-angular'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'index.html'))) {
      return candidate;
    }
  }
  const distRoot = path.join(__dirname, 'dist');
  if (fs.existsSync(distRoot)) {
    for (const entry of fs.readdirSync(distRoot, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const browserSubdir = path.join(distRoot, entry.name, 'browser');
        if (fs.existsSync(path.join(browserSubdir, 'index.html'))) {
          return browserSubdir;
        }
        const directDir = path.join(distRoot, entry.name);
        if (fs.existsSync(path.join(directDir, 'index.html'))) {
          return directDir;
        }
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
};

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
}

function getRuntimeApiKey() {
  const envFromFile = parseDotEnv(path.join(__dirname, '.env'));
  const rawKey =
    process.env.GOOGLE_MAPS_API_KEY || envFromFile.GOOGLE_MAPS_API_KEY || '';
  if (rawKey === 'your_google_maps_api_key_here') {
    return '';
  }
  return rawKey;
}

const { host, port } = parseCliArgs(process.argv.slice(2));
const distDir = resolveDistDir();

const server = http.createServer((req, res) => {
  setSecurityHeaders(res);

  const reqUrl = new URL(req.url || '/', `http://${host}:${port}`);
  const pathname = decodeURIComponent(reqUrl.pathname);

  if (pathname === '/env-config.js') {
    const apiKey = getRuntimeApiKey();
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(
      `window.__ENV__ = Object.freeze({ GOOGLE_MAPS_API_KEY: ${JSON.stringify(apiKey)} });\n`
    );
    return;
  }

  if (pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (!fs.existsSync(distDir)) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Build output not found. Run "npm run build" first.');
    return;
  }

  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  let targetPath = path.resolve(distDir, relativePath);

  if (!targetPath.startsWith(path.resolve(distDir))) {
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
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal server error');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(port, host, () => {
  console.log(`Serving Angular dist (${distDir}) on http://${host}:${port}`);
});
