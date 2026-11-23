import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv, type Plugin, type Connect } from 'vite';
import vue from '@vitejs/plugin-vue';

interface SnapPointInput {
  lat: number;
  lng: number;
}

function readJsonBody(req: IncomingMessage): Promise<{ path?: SnapPointInput[]; interpolate?: boolean }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf-8');
        resolve(raw ? (JSON.parse(raw) as { path?: SnapPointInput[]; interpolate?: boolean }) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function attachSecurityAndRoadsMiddleware(
  middlewares: Connect.Server,
  configuredApiKey: string,
) {
  middlewares.use((_req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
  });

  middlewares.use('/favicon.ico', (_req: IncomingMessage, res: ServerResponse) => {
    res.statusCode = 204;
    res.end();
  });

  middlewares.use('/api/roads/snap', async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.end(JSON.stringify({ ok: false, message: 'Method not allowed. Use POST.' }));
      return;
    }

    const apiKey =
      configuredApiKey ||
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      '';

    if (!apiKey) {
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          ok: false,
          upstreamStatus: 401,
          message: 'VITE_GOOGLE_MAPS_API_KEY is not configured.',
        }),
      );
      return;
    }

    try {
      const body = await readJsonBody(req);
      const points = Array.isArray(body.path) ? body.path.slice(0, 100) : [];
      if (points.length < 2) {
        res.statusCode = 400;
        res.end(JSON.stringify({ ok: false, message: 'At least 2 path coordinates are required.' }));
        return;
      }

      const pathParam = points
        .map((p) => `${Number(p.lat).toFixed(6)},${Number(p.lng).toFixed(6)}`)
        .join('|');
      const interpolate = body.interpolate !== false ? 'true' : 'false';

      const upstreamUrl = new URL('https://roads.googleapis.com/v1/snapToRoads');
      upstreamUrl.searchParams.set('path', pathParam);
      upstreamUrl.searchParams.set('interpolate', interpolate);
      upstreamUrl.searchParams.set('key', apiKey);

      const upstreamRes = await fetch(upstreamUrl.toString(), {
        method: 'GET',
        headers: {
          'X-Goog-Maps-Solution-ID': 'gmp_git_agentsamples_v1.0.0',
        },
      });

      const payload = (await upstreamRes.json()) as {
        snappedPoints?: Array<{
          location: { latitude: number; longitude: number };
          originalIndex?: number;
          placeId: string;
        }>;
        warningMessage?: string;
        error?: { message?: string; status?: string; code?: number };
      };

      if (!upstreamRes.ok || !Array.isArray(payload.snappedPoints)) {
        res.statusCode = 200;
        res.end(
          JSON.stringify({
            ok: false,
            upstreamStatus: upstreamRes.status,
            message:
              payload.error?.message ||
              `Roads API returned status ${upstreamRes.status}`,
          }),
        );
        return;
      }

      res.statusCode = 200;
      res.end(
        JSON.stringify({
          ok: true,
          snappedPoints: payload.snappedPoints,
          warningMessage: payload.warningMessage ?? null,
        }),
      );
    } catch (err) {
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          ok: false,
          upstreamStatus: 500,
          message: err instanceof Error ? err.message : 'Roads API proxy error',
        }),
      );
    }
  });
}

function roadsSnapProxyPlugin(apiKey: string): Plugin {
  return {
    name: 'gmp-roads-snap-proxy',
    configureServer(server) {
      attachSecurityAndRoadsMiddleware(server.middlewares, apiKey);
    },
    configurePreviewServer(server) {
      attachSecurityAndRoadsMiddleware(server.middlewares, apiKey);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey =
    env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    '';

  return {
    plugins: [
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag.startsWith('gmp-'),
          },
        },
      }),
      roadsSnapProxyPlugin(apiKey),
    ],
    server: {
      host: '127.0.0.1',
      port: 5173,
    },
    preview: {
      host: '127.0.0.1',
      port: 4173,
    },
  };
});
