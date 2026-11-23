import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

interface SnapPointInput {
  lat: number;
  lng: number;
}

interface SnapRequestBody {
  path?: SnapPointInput[];
  interpolate?: boolean;
}

function readJsonBody(req: IncomingMessage): Promise<SnapRequestBody> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8').trim();
        resolve(raw ? (JSON.parse(raw) as SnapRequestBody) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.end(JSON.stringify(payload));
}

function createRoadsSnapMiddleware(apiKey: string) {
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ): Promise<void> => {
    const urlPath = req.url?.split('?')[0];
    if (urlPath === '/favicon.ico') {
      res.statusCode = 204;
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.end();
      return;
    }

    if (urlPath !== '/api/roads/snap') {
      next();
      return;
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method not allowed', snappedPoints: [] });
      return;
    }

    try {
      const body = await readJsonBody(req);
      const pathPoints = Array.isArray(body.path) ? body.path : [];
      const interpolate = body.interpolate !== false;

      if (pathPoints.length < 2 || pathPoints.length > 100) {
        sendJson(res, 200, {
          ok: false,
          error: 'Roads API requires between 2 and 100 GPS coordinates.',
          snappedPoints: [],
        });
        return;
      }

      const validPoints = pathPoints.every(
        (pt) =>
          typeof pt?.lat === 'number' &&
          Number.isFinite(pt.lat) &&
          typeof pt?.lng === 'number' &&
          Number.isFinite(pt.lng),
      );

      if (!validPoints) {
        sendJson(res, 200, {
          ok: false,
          error: 'Invalid coordinate pair in path payload.',
          snappedPoints: [],
        });
        return;
      }

      if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
        sendJson(res, 200, {
          ok: false,
          error: 'VITE_GOOGLE_MAPS_API_KEY is not configured on the local server.',
          snappedPoints: [],
        });
        return;
      }

      const serializedPath = pathPoints
        .map((pt) => `${pt.lat.toFixed(6)},${pt.lng.toFixed(6)}`)
        .join('|');

      const upstreamUrl = new URL('https://roads.googleapis.com/v1/snapToRoads');
      upstreamUrl.searchParams.set('path', serializedPath);
      upstreamUrl.searchParams.set('interpolate', String(interpolate));
      upstreamUrl.searchParams.set('key', apiKey);

      const upstreamRes = await fetch(upstreamUrl.toString(), {
        method: 'GET',
        headers: {
          'X-Goog-Maps-Solution-ID': 'gmp_git_agentsamples_v1.0.0',
        },
      });

      const upstreamData = (await upstreamRes.json()) as {
        snappedPoints?: Array<{
          location: { latitude: number; longitude: number };
          originalIndex?: number;
          placeId: string;
        }>;
        warningMessage?: string;
        error?: { message?: string; status?: string; code?: number };
      };

      if (!upstreamRes.ok || upstreamData.error) {
        sendJson(res, 200, {
          ok: false,
          status: upstreamRes.status,
          error:
            upstreamData.error?.message ??
            `Roads API returned status ${upstreamRes.status}`,
          snappedPoints: [],
        });
        return;
      }

      sendJson(res, 200, {
        ok: true,
        source: 'roads-api',
        snappedPoints: upstreamData.snappedPoints ?? [],
        warningMessage: upstreamData.warningMessage ?? null,
      });
    } catch (error) {
      sendJson(res, 200, {
        ok: false,
        error: error instanceof Error ? error.message : 'Roads proxy error',
        snappedPoints: [],
      });
    }
  };
}

function roadsProxyPlugin(apiKey: string): Plugin {
  const middleware = createRoadsSnapMiddleware(apiKey);
  return {
    name: 'gmp-roads-bff-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void middleware(req, res, next);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        void middleware(req, res, next);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.VITE_GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '';

  return {
    plugins: [react(), roadsProxyPlugin(apiKey)],
    server: {
      host: '127.0.0.1',
    },
    preview: {
      host: '127.0.0.1',
    },
  };
});
