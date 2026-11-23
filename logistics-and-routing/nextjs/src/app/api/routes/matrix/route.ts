import { NextRequest } from 'next/server';
import {
  getServerGoogleMapsApiKey,
  jsonWithSecurityHeaders,
} from '@/lib/server-gmp';
import {
  formatDistanceMiles,
  formatDuration,
  parseDurationSeconds,
} from '@/lib/fleet-data';
import type { LatLngPoint } from '@/lib/types';

interface MatrixPoint {
  id?: string;
  name?: string;
  location: LatLngPoint;
}

interface ComputeMatrixRequestBody {
  origins?: MatrixPoint[];
  destinations?: MatrixPoint[];
}

interface UpstreamMatrixElement {
  originIndex?: number;
  destinationIndex?: number;
  duration?: string;
  distanceMeters?: number;
  condition?: string;
  status?: { code?: number; message?: string };
}

export async function POST(request: NextRequest) {
  const apiKey = getServerGoogleMapsApiKey();
  if (!apiKey) {
    return jsonWithSecurityHeaders(
      {
        error:
          'Google Maps API key is not configured on the server. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local.',
        elements: [],
      },
      { status: 503 }
    );
  }

  let body: ComputeMatrixRequestBody;
  try {
    body = (await request.json()) as ComputeMatrixRequestBody;
  } catch {
    return jsonWithSecurityHeaders(
      { error: 'Invalid JSON request body', elements: [] },
      { status: 400 }
    );
  }

  const origins = Array.isArray(body.origins) ? body.origins : [];
  const destinations = Array.isArray(body.destinations) ? body.destinations : [];

  if (origins.length === 0 || destinations.length === 0) {
    return jsonWithSecurityHeaders(
      {
        error: 'At least one origin and one destination are required.',
        elements: [],
      },
      { status: 400 }
    );
  }

  const upstreamBody = {
    origins: origins.map((o) => ({
      waypoint: {
        location: {
          latLng: {
            latitude: o.location.lat,
            longitude: o.location.lng,
          },
        },
      },
    })),
    destinations: destinations.map((d) => ({
      waypoint: {
        location: {
          latLng: {
            latitude: d.location.lat,
            longitude: d.location.lng,
          },
        },
      },
    })),
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
  };

  try {
    const upstream = await fetch(
      'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'originIndex,destinationIndex,duration,distanceMeters,status,condition',
          'X-Goog-Maps-Solution-ID': 'gmp_git_agentsamples_v1.0.0',
        },
        body: JSON.stringify(upstreamBody),
        cache: 'no-store',
      }
    );

    const payload = (await upstream.json()) as
      | UpstreamMatrixElement[]
      | { error?: { message?: string } };

    if (!upstream.ok || !Array.isArray(payload)) {
      const errMsg =
        !Array.isArray(payload) && payload.error?.message
          ? payload.error.message
          : `Routes API computeRouteMatrix returned HTTP ${upstream.status}`;
      return jsonWithSecurityHeaders(
        { error: errMsg, elements: [] },
        { status: upstream.status >= 400 ? upstream.status : 502 }
      );
    }

    const elements = payload
      .map((el) => {
        const originIndex = el.originIndex ?? 0;
        const destinationIndex = el.destinationIndex ?? 0;
        const dest = destinations[destinationIndex];
        const durationSeconds = parseDurationSeconds(el.duration);
        const distanceMeters = el.distanceMeters ?? 0;

        return {
          originIndex,
          destinationIndex,
          hubId: dest?.id || `dest-${destinationIndex}`,
          hubName: dest?.name || `Drop-off ${destinationIndex + 1}`,
          durationSeconds,
          durationText: formatDuration(durationSeconds),
          distanceMeters,
          distanceText: formatDistanceMiles(distanceMeters),
          condition: el.condition || 'ROUTE_EXISTS',
        };
      })
      .sort((a, b) => a.destinationIndex - b.destinationIndex);

    return jsonWithSecurityHeaders({ elements });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to compute route matrix';
    return jsonWithSecurityHeaders(
      { error: message, elements: [] },
      { status: 502 }
    );
  }
}
