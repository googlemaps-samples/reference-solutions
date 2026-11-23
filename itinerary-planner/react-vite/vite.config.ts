import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function createTimeZoneProxyMiddleware(apiKey: string) {
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) => {
    if (req.url === '/favicon.ico') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (!req.url || !req.url.startsWith('/api/timezone')) {
      next();
      return;
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    try {
      const requestUrl = new URL(req.url, 'http://127.0.0.1');
      const lat = requestUrl.searchParams.get('lat');
      const lng = requestUrl.searchParams.get('lng');
      const timestamp =
        requestUrl.searchParams.get('timestamp') ??
        String(Math.floor(Date.now() / 1000));

      if (!lat || !lng) {
        res.statusCode = 400;
        res.end(
          JSON.stringify({
            status: 'INVALID_REQUEST',
            errorMessage: 'lat and lng query parameters are required.',
          }),
        );
        return;
      }

      if (!apiKey) {
        res.statusCode = 200;
        res.end(
          JSON.stringify({
            status: 'KEY_MISSING',
            errorMessage: 'VITE_GOOGLE_MAPS_API_KEY is not configured.',
          }),
        );
        return;
      }

      const upstreamUrl = new URL(
        'https://maps.googleapis.com/maps/api/timezone/json',
      );
      upstreamUrl.searchParams.set('location', `${lat},${lng}`);
      upstreamUrl.searchParams.set('timestamp', timestamp);
      upstreamUrl.searchParams.set('key', apiKey);

      const upstreamRes = await fetch(upstreamUrl.toString());
      const payload = await upstreamRes.json();
      res.statusCode = 200;
      res.end(JSON.stringify(payload));
    } catch (error) {
      res.statusCode = 200;
      res.end(
        JSON.stringify({
          status: 'UPSTREAM_ERROR',
          errorMessage:
            error instanceof Error ? error.message : 'Time Zone request failed',
        }),
      );
    }
  };
}

function gmpTimeZoneProxyPlugin(apiKey: string): Plugin {
  const middleware = createTimeZoneProxyMiddleware(apiKey);
  return {
    name: 'gmp-timezone-proxy',
    configureServer(server) {
      server.middlewares.use(middleware);
      server.middlewares.use((_req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
      server.middlewares.use((_req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiKey = env.VITE_GOOGLE_MAPS_API_KEY ?? '';

  return {
    plugins: [react(), gmpTimeZoneProxyPlugin(apiKey)],
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
