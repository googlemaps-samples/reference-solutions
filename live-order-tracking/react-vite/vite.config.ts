import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

interface MinimalReq {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  on(event: string, listener: (chunk?: unknown) => void): void;
}

interface MinimalRes {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
}

function sendJson(res: MinimalRes, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.end(JSON.stringify(payload));
}

function readJsonBody(req: MinimalReq): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = [];
    let totalBytes = 0;
    req.on('data', (chunk) => {
      const str = String(chunk ?? '');
      totalBytes += str.length;
      if (totalBytes > 16384) {
        reject(new Error('Request payload too large'));
        return;
      }
      chunks.push(str);
    });
    req.on('end', () => {
      try {
        const raw = chunks.join('').trim();
        resolve(raw ? (JSON.parse(raw) as Record<string, unknown>) : {});
      } catch {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', () => reject(new Error('Request stream error')));
  });
}

function attachAddressValidationMiddleware(
  middlewares: Connect.Server,
  apiKey: string
): void {
  middlewares.use('/api/address/validate', async (req, res, next) => {
    const mReq = req as unknown as MinimalReq;
    const mRes = res as unknown as MinimalRes;

    if (mReq.method !== 'POST') {
      if (mReq.method === 'OPTIONS') {
        mRes.statusCode = 204;
        mRes.setHeader('X-Content-Type-Options', 'nosniff');
        mRes.setHeader('X-Frame-Options', 'SAMEORIGIN');
        mRes.end();
        return;
      }
      next();
      return;
    }

    if (!apiKey) {
      sendJson(mRes, 200, {
        ok: false,
        reason: 'Missing VITE_GOOGLE_MAPS_API_KEY on server.',
      });
      return;
    }

    try {
      const body = await readJsonBody(mReq);
      const rawLines = Array.isArray(body.addressLines)
        ? body.addressLines
            .filter((line): line is string => typeof line === 'string')
            .map((line) => line.trim())
            .filter(Boolean)
        : [];

      if (rawLines.length === 0) {
        sendJson(mRes, 200, {
          ok: false,
          reason: 'addressLines must be a non-empty string array.',
        });
        return;
      }

      const refererHeader =
        typeof mReq.headers.referer === 'string'
          ? mReq.headers.referer
          : typeof mReq.headers.origin === 'string'
            ? mReq.headers.origin
            : '';
      const safeReferer =
        refererHeader.startsWith('http://127.0.0.1:') ||
        refererHeader.startsWith('http://localhost:')
          ? refererHeader
          : '';

      const upstream = await fetch(
        'https://addressvalidation.googleapis.com/v1:validateAddress',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            ...(safeReferer ? { Referer: safeReferer } : {}),
          },
          body: JSON.stringify({
            address: {
              regionCode:
                typeof body.regionCode === 'string' && body.regionCode.trim()
                  ? body.regionCode.trim()
                  : 'US',
              addressLines: rawLines,
            },
            enableUspsCass: body.enableUspsCass !== false,
          }),
        }
      );

      if (!upstream.ok) {
        sendJson(mRes, 200, {
          ok: false,
          status: upstream.status,
          reason: `Address Validation API returned HTTP ${upstream.status}.`,
        });
        return;
      }

      const payload = (await upstream.json()) as {
        result?: Record<string, unknown>;
      };

      sendJson(mRes, 200, {
        ok: true,
        result: payload.result ?? null,
      });
    } catch (err) {
      sendJson(mRes, 200, {
        ok: false,
        reason:
          err instanceof Error
            ? err.message
            : 'Address Validation proxy request failed.',
      });
    }
  });
}

function addressValidationProxyPlugin(apiKey: string): Plugin {
  return {
    name: 'gmp-address-validation-proxy',
    configureServer(server) {
      attachAddressValidationMiddleware(server.middlewares, apiKey);
    },
    configurePreviewServer(server) {
      attachAddressValidationMiddleware(server.middlewares, apiKey);
    },
  };
}

export default defineConfig(({ mode }) => {
  const proc = (
    globalThis as {
      process?: { cwd?: () => string; env?: Record<string, string | undefined> };
    }
  ).process;
  const rootDir = proc?.cwd?.() ?? '.';
  const env = loadEnv(mode, rootDir, '');
  const apiKey = (
    env.VITE_GOOGLE_MAPS_API_KEY ||
    proc?.env?.VITE_GOOGLE_MAPS_API_KEY ||
    ''
  ).trim();

  return {
    plugins: [react(), addressValidationProxyPlugin(apiKey)],
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
    },
    preview: {
      host: '127.0.0.1',
      port: 4173,
      strictPort: true,
    },
  };
});
