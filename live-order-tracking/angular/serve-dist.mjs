import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadDotEnv() {
  for (const filename of ['.env', '.env.local']) {
    const filePath = path.join(__dirname, filename);
    if (!fs.existsSync(filePath)) continue;
    const raw = fs.readFileSync(filePath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

loadDotEnv();

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

  // Enforce loopback binding only (never 0.0.0.0)
  const safeHost = host === 'localhost' || host === '::1' || host === '127.0.0.1' ? host : '127.0.0.1';
  const safePort = Number.isFinite(port) && port > 0 && port < 65536 ? port : 4200;
  return { host: safeHost, port: safePort };
}

function resolveDistDir() {
  const candidates = [
    path.join(__dirname, 'dist', 'live-order-tracking', 'browser'),
    path.join(__dirname, 'dist', 'live-order-tracking'),
    path.join(__dirname, 'dist'),
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
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
};

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

function sendJson(res, statusCode, payload) {
  setSecurityHeaders(res);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];
  let totalLength = 0;
  for await (const chunk of req) {
    totalLength += chunk.length;
    if (totalLength > 1024 * 1024) {
      throw new Error('Request payload too large');
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function getApiKey() {
  const key = (process.env.GOOGLE_MAPS_API_KEY || '').trim();
  if (!key || key === 'your_google_maps_api_key_here') {
    return '';
  }
  return key;
}

const { host, port } = parseCliArgs(process.argv.slice(2));
const distDir = resolveDistDir();

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url || '/', `http://${host}:${port}`);
    const pathname = decodeURIComponent(reqUrl.pathname);

    // 1. Runtime environment config for browser Maps JS SDK
    if (req.method === 'GET' && pathname === '/env-config.js') {
      setSecurityHeaders(res);
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      const configPayload = {
        GOOGLE_MAPS_API_KEY: getApiKey(),
      };
      res.end(`window.__ENV__ = ${JSON.stringify(configPayload)};\n`);
      return;
    }

    // 2. BFF Proxy: Address Validation API
    if (req.method === 'POST' && pathname === '/api/address/validate') {
      const apiKey = getApiKey();
      if (!apiKey) {
        sendJson(res, 503, { error: 'GOOGLE_MAPS_API_KEY is not configured in .env' });
        return;
      }
      const body = await readJsonBody(req);
      const upstream = await fetch('https://addressvalidation.googleapis.com/v1:validateAddress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'result.verdict,result.address,result.geocode,result.metadata,result.uspsData',
        },
        body: JSON.stringify({
          address: body.address,
          enableUspsCass: body.enableUspsCass !== false,
          previousResponseId: body.previousResponseId || undefined,
        }),
      });
      const text = await upstream.text();
      setSecurityHeaders(res);
      res.writeHead(upstream.status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(text);
      return;
    }

    // 3. BFF Proxy: Routes API (computeRoutes)
    if (req.method === 'POST' && pathname === '/api/routes/compute') {
      const apiKey = getApiKey();
      if (!apiKey) {
        sendJson(res, 503, { error: 'GOOGLE_MAPS_API_KEY is not configured in .env' });
        return;
      }
      const body = await readJsonBody(req);
      const upstream = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration',
        },
        body: JSON.stringify({
          origin: body.origin,
          destination: body.destination,
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
          polylineQuality: 'HIGH_QUALITY',
          languageCode: 'en-US',
          units: 'IMPERIAL',
        }),
      });
      const text = await upstream.text();
      setSecurityHeaders(res);
      res.writeHead(upstream.status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(text);
      return;
    }

    // 4. BFF Proxy: Maps Static API Receipt Map Image
    if (req.method === 'GET' && pathname === '/api/maps/static-receipt') {
      const apiKey = getApiKey();
      if (!apiKey) {
        sendJson(res, 503, { error: 'GOOGLE_MAPS_API_KEY is not configured in .env' });
        return;
      }

      const origin = reqUrl.searchParams.get('origin') || '41.8868,-87.6486';
      const destination = reqUrl.searchParams.get('destination') || '41.8899,-87.6244';
      const enc = reqUrl.searchParams.get('enc') || '';

      const params = new URLSearchParams();
      params.set('size', '560x220');
      params.set('scale', '2');
      params.set('maptype', 'roadmap');
      params.set('format', 'png');
      params.append('markers', `color:0x0f766e|label:K|${origin}`);
      params.append('markers', `color:0xe11d48|label:D|${destination}`);
      if (enc) {
        params.append('path', `weight:5|color:0x2563ebff|enc:${enc}`);
      } else {
        params.append('path', `weight:4|color:0x2563ebff|${origin}|${destination}`);
      }
      params.set('key', apiKey);

      const staticUrl = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
      const upstream = await fetch(staticUrl);
      if (!upstream.ok) {
        const errText = await upstream.text();
        sendJson(res, upstream.status, { error: 'Maps Static API request failed', details: errText.slice(0, 300) });
        return;
      }

      const arrayBuf = await upstream.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      setSecurityHeaders(res);
      res.writeHead(200, {
        'Content-Type': upstream.headers.get('content-type') || 'image/png',
        'Cache-Control': 'private, max-age=120',
      });
      res.end(buffer);
      return;
    }

    // 5. Static Angular build files + SPA fallback
    const safeRelPath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const resolvedTarget = path.resolve(distDir, safeRelPath);
    if (!resolvedTarget.startsWith(path.resolve(distDir))) {
      sendJson(res, 403, { error: 'Forbidden' });
      return;
    }

    let fileToServe = resolvedTarget;
    if (!fs.existsSync(fileToServe) || fs.statSync(fileToServe).isDirectory()) {
      fileToServe = path.join(distDir, 'index.html');
    }

    if (!fs.existsSync(fileToServe)) {
      sendJson(res, 404, { error: 'Build output not found. Run npm run build first.' });
      return;
    }

    const ext = path.extname(fileToServe).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const data = fs.readFileSync(fileToServe);

    setSecurityHeaders(res);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    res.end(data);
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

server.listen(port, host, () => {
  console.log(`Live Order Tracking (Angular) server listening at http://${host}:${port}`);
});
