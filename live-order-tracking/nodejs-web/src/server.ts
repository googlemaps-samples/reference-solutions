import path from 'node:path';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config();

interface LatLng {
  lat: number;
  lng: number;
}

interface AddressValidateBody {
  address?: string;
  addressLines?: string[];
  regionCode?: string;
  locality?: string;
  administrativeArea?: string;
  postalCode?: string;
  enableUspsCass?: boolean;
  previousResponseId?: string;
}

interface RoutesComputeBody {
  origin?: Partial<LatLng>;
  destination?: Partial<LatLng>;
  travelMode?: 'DRIVE' | 'BICYCLE' | 'WALK' | 'TWO_WHEELER';
}

interface CliArgs {
  host: string;
  port: number;
}

const KITCHEN_HUB = {
  name: 'Fulton Market Kitchen Hub',
  address: '845 W Fulton Market, Chicago, IL 60607',
  lat: 41.8868,
  lng: -87.6486,
};

const MAX_ROAD_DISTANCE_METERS = 8000;
const ALLOWED_TRAVEL_MODES = new Set(['DRIVE', 'BICYCLE', 'WALK', 'TWO_WHEELER']);

function parseCliArgs(argv: string[]): CliArgs {
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
      const parsed = Number(argv[i + 1]);
      if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) {
        port = parsed;
      }
      i += 1;
    } else if (arg.startsWith('--port=')) {
      const parsed = Number(arg.slice('--port='.length));
      if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) {
        port = parsed;
      }
    }
  }

  // Never bind to 0.0.0.0; enforce loopback binding.
  if (host !== '127.0.0.1' && host !== 'localhost') {
    host = '127.0.0.1';
  }

  return { host, port };
}

function getApiKey(): string {
  return (process.env.GOOGLE_MAPS_API_KEY || '').trim();
}

function isValidCoordinate(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function isValidLatLng(point: unknown): point is LatLng {
  if (!point || typeof point !== 'object') {
    return false;
  }
  const candidate = point as Partial<LatLng>;
  return (
    isValidCoordinate(candidate.lat, -90, 90) &&
    isValidCoordinate(candidate.lng, -180, 180)
  );
}

function parseDurationSeconds(duration: string | undefined): number {
  if (!duration || typeof duration !== 'string') {
    return 0;
  }
  const match = /^(\d+(?:\.\d+)?)s$/.exec(duration.trim());
  return match ? Math.round(Number(match[1])) : 0;
}

function calculateTieredDeliveryFee(distanceMeters: number): {
  withinDistanceLimit: boolean;
  tierLabel: string;
  feeDollars: number | null;
} {
  const distanceKm = distanceMeters / 1000;
  if (distanceKm <= 3.0) {
    return {
      withinDistanceLimit: true,
      tierLabel: 'Neighborhood Express (≤ 3.0 km)',
      feeDollars: 2.99,
    };
  }
  if (distanceKm <= 5.5) {
    return {
      withinDistanceLimit: true,
      tierLabel: 'Standard Metro (3.1 – 5.5 km)',
      feeDollars: 4.99,
    };
  }
  if (distanceMeters <= MAX_ROAD_DISTANCE_METERS) {
    return {
      withinDistanceLimit: true,
      tierLabel: 'Extended Zone (5.6 – 8.0 km)',
      feeDollars: 6.99,
    };
  }
  return {
    withinDistanceLimit: false,
    tierLabel: 'Exceeds 8.0 km Road Limit',
    feeDollars: null,
  };
}

export function createApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '64kb' }));

  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'Invalid JSON request body.' });
      return;
    }
    next(err);
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'live-order-tracking-nodejs-web' });
  });

  app.get('/api/config', (_req: Request, res: Response) => {
    const apiKey = getApiKey();
    res.json({
      apiKey,
      hasApiKey: apiKey.length > 0,
      mapId: 'DEMO_MAP_ID',
      attributionId: 'gmp_git_agentsamples_v1.0.0',
      kitchenHub: KITCHEN_HUB,
      seedAddress: '401 N Michigan Ave, Chicago, IL 60611',
      presets: {
        inZone: '401 N Michigan Ave, Chicago, IL 60611',
        outOfZone: '5801 S Ellis Ave, Chicago, IL 60637',
      },
      maxRoadDistanceMeters: MAX_ROAD_DISTANCE_METERS,
    });
  });

  app.post('/api/address/validate', async (req: Request, res: Response) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      res.status(503).json({
        error: 'GOOGLE_MAPS_API_KEY is not configured in .env on the server.',
      });
      return;
    }

    const body = (req.body || {}) as AddressValidateBody;
    let addressLines: string[] = [];

    if (typeof body.address === 'string' && body.address.trim().length > 0) {
      addressLines = [body.address.trim()];
    } else if (Array.isArray(body.addressLines)) {
      addressLines = body.addressLines
        .filter((line): line is string => typeof line === 'string')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    }

    if (addressLines.length === 0) {
      res.status(400).json({
        error: 'Provide either a non-empty "address" string or "addressLines" array.',
      });
      return;
    }

    const totalLength = addressLines.join(' ').length;
    if (totalLength > 280) {
      res.status(400).json({
        error: 'Address input must not exceed 280 characters.',
      });
      return;
    }

    const postalAddress: Record<string, unknown> = {
      regionCode:
        typeof body.regionCode === 'string' && body.regionCode.trim().length === 2
          ? body.regionCode.trim().toUpperCase()
          : 'US',
      addressLines,
    };

    if (typeof body.locality === 'string' && body.locality.trim()) {
      postalAddress.locality = body.locality.trim();
    }
    if (typeof body.administrativeArea === 'string' && body.administrativeArea.trim()) {
      postalAddress.administrativeArea = body.administrativeArea.trim();
    }
    if (typeof body.postalCode === 'string' && body.postalCode.trim()) {
      postalAddress.postalCode = body.postalCode.trim();
    }

    const upstreamPayload: Record<string, unknown> = {
      address: postalAddress,
      enableUspsCass: body.enableUspsCass !== false,
    };

    if (typeof body.previousResponseId === 'string' && body.previousResponseId.trim()) {
      upstreamPayload.previousResponseId = body.previousResponseId.trim();
    }

    const fieldMask =
      'result.verdict,result.address,result.geocode,result.metadata,result.uspsData';

    try {
      let upstreamResponse = await fetch(
        'https://addressvalidation.googleapis.com/v1:validateAddress',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': fieldMask,
          },
          body: JSON.stringify(upstreamPayload),
        }
      );

      // Some projects/endpoints disallow field masks on v1:validateAddress; retry cleanly if rejected.
      if (upstreamResponse.status === 400) {
        const cloneText = await upstreamResponse.clone().text();
        if (cloneText.toLowerCase().includes('fieldmask') || cloneText.toLowerCase().includes('field mask')) {
          upstreamResponse = await fetch(
            'https://addressvalidation.googleapis.com/v1:validateAddress',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
              },
              body: JSON.stringify(upstreamPayload),
            }
          );
        }
      }

      const data = (await upstreamResponse.json()) as Record<string, unknown>;
      if (!upstreamResponse.ok) {
        res.status(upstreamResponse.status).json({
          error: 'Address Validation API request failed.',
          details: data,
        });
        return;
      }

      res.json(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown upstream error';
      res.status(502).json({ error: `Failed to reach Address Validation API: ${message}` });
    }
  });

  app.post('/api/routes/compute', async (req: Request, res: Response) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      res.status(503).json({
        error: 'GOOGLE_MAPS_API_KEY is not configured in .env on the server.',
      });
      return;
    }

    const body = (req.body || {}) as RoutesComputeBody;
    const origin = body.origin ?? { lat: KITCHEN_HUB.lat, lng: KITCHEN_HUB.lng };
    const destination = body.destination;

    if (!isValidLatLng(origin) || !isValidLatLng(destination)) {
      res.status(400).json({
        error: 'Both origin and destination must contain valid numeric lat and lng coordinates.',
      });
      return;
    }

    const travelMode =
      typeof body.travelMode === 'string' && ALLOWED_TRAVEL_MODES.has(body.travelMode)
        ? body.travelMode
        : 'DRIVE';

    const upstreamPayload = {
      origin: {
        location: {
          latLng: {
            latitude: origin.lat,
            longitude: origin.lng,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.lat,
            longitude: destination.lng,
          },
        },
      },
      travelMode,
      routingPreference: travelMode === 'DRIVE' || travelMode === 'TWO_WHEELER' ? 'TRAFFIC_AWARE' : undefined,
      computeAlternativeRoutes: false,
      routeModifiers: {
        avoidTolls: false,
        avoidHighways: false,
        avoidFerries: false,
      },
      languageCode: 'en-US',
      units: 'METRIC',
    };

    try {
      const upstreamResponse = await fetch(
        'https://routes.googleapis.com/directions/v2:computeRoutes',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask':
              'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration',
          },
          body: JSON.stringify(upstreamPayload),
        }
      );

      const data = (await upstreamResponse.json()) as {
        routes?: Array<{
          distanceMeters?: number;
          duration?: string;
          polyline?: { encodedPolyline?: string };
          legs?: Array<{
            steps?: Array<{
              distanceMeters?: number;
              staticDuration?: string;
              navigationInstruction?: { maneuver?: string; instructions?: string };
            }>;
          }>;
        }>;
      };

      if (!upstreamResponse.ok) {
        res.status(upstreamResponse.status).json({
          error: 'Routes API request failed.',
          details: data,
        });
        return;
      }

      const primaryRoute = data.routes?.[0];
      if (!primaryRoute) {
        res.status(404).json({ error: 'No route returned between kitchen hub and destination.' });
        return;
      }

      const distanceMeters = primaryRoute.distanceMeters ?? 0;
      const durationSeconds = parseDurationSeconds(primaryRoute.duration);
      const etaMinutes = Math.max(1, Math.ceil(durationSeconds / 60));
      const feeTier = calculateTieredDeliveryFee(distanceMeters);

      res.json({
        route: primaryRoute,
        summary: {
          distanceMeters,
          distanceKm: Number((distanceMeters / 1000).toFixed(2)),
          durationSeconds,
          etaMinutes,
          maxRoadDistanceMeters: MAX_ROAD_DISTANCE_METERS,
          ...feeTier,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown upstream error';
      res.status(502).json({ error: `Failed to reach Routes API: ${message}` });
    }
  });

  app.get('/api/maps/static-receipt', async (req: Request, res: Response) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      res.status(503).json({
        error: 'GOOGLE_MAPS_API_KEY is not configured in .env on the server.',
      });
      return;
    }

    const originLat = Number(req.query.originLat ?? KITCHEN_HUB.lat);
    const originLng = Number(req.query.originLng ?? KITCHEN_HUB.lng);
    const destLat = Number(req.query.destLat);
    const destLng = Number(req.query.destLng);
    const polyline = typeof req.query.polyline === 'string' ? req.query.polyline.trim() : '';
    const rawSize = typeof req.query.size === 'string' ? req.query.size.trim() : '600x300';
    const size = /^\d{2,3}x\d{2,3}$/.test(rawSize) ? rawSize : '600x300';

    if (
      !isValidCoordinate(originLat, -90, 90) ||
      !isValidCoordinate(originLng, -180, 180) ||
      !isValidCoordinate(destLat, -90, 90) ||
      !isValidCoordinate(destLng, -180, 180)
    ) {
      res.status(400).json({
        error: 'Valid originLat, originLng, destLat, and destLng query parameters are required.',
      });
      return;
    }

    if (polyline.length > 4000) {
      res.status(400).json({ error: 'Polyline parameter exceeds maximum length.' });
      return;
    }

    const params = new URLSearchParams();
    params.set('size', size);
    params.set('scale', '2');
    params.set('maptype', 'roadmap');
    params.append('markers', `color:0x0F766E|label:K|${originLat},${originLng}`);
    params.append('markers', `color:0xEA580C|label:D|${destLat},${destLng}`);

    if (polyline.length > 0) {
      params.append('path', `weight:5|color:0x2563EBFF|enc:${polyline}`);
    } else {
      params.append('path', `weight:4|color:0x2563EBFF|${originLat},${originLng}|${destLat},${destLng}`);
    }
    params.set('key', apiKey);

    const staticUrl = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;

    try {
      const upstreamResponse = await fetch(staticUrl);
      if (!upstreamResponse.ok) {
        const text = await upstreamResponse.text();
        res.status(upstreamResponse.status).json({
          error: 'Maps Static API request failed.',
          details: text,
        });
        return;
      }

      const contentType = upstreamResponse.headers.get('content-type') || 'image/png';
      const buffer = Buffer.from(await upstreamResponse.arrayBuffer());
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.send(buffer);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown upstream error';
      res.status(502).json({ error: `Failed to fetch Maps Static API image: ${message}` });
    }
  });

  const publicDir = path.resolve(__dirname, '..', 'public');
  app.use(express.static(publicDir));

  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  return app;
}

if (require.main === module) {
  const { host, port } = parseCliArgs(process.argv.slice(2));
  const app = createApp();
  app.listen(port, host, () => {
    console.log(`Live Order Tracking server listening on http://${host}:${port}`);
  });
}
