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

interface ComputeRouteWaypoint {
  id?: string;
  name?: string;
  location: LatLngPoint;
}

interface ComputeRoutesRequestBody {
  origin?: ComputeRouteWaypoint;
  destination?: ComputeRouteWaypoint;
  intermediates?: ComputeRouteWaypoint[];
  optimizeWaypointOrder?: boolean;
}

interface UpstreamRouteLeg {
  duration?: string;
  distanceMeters?: number;
}

interface UpstreamRoute {
  duration?: string;
  distanceMeters?: number;
  polyline?: { encodedPolyline?: string };
  legs?: UpstreamRouteLeg[];
  optimizedIntermediateWaypointIndex?: number[];
}

export async function POST(request: NextRequest) {
  const apiKey = getServerGoogleMapsApiKey();
  if (!apiKey) {
    return jsonWithSecurityHeaders(
      {
        error:
          'Google Maps API key is not configured on the server. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local.',
      },
      { status: 503 }
    );
  }

  let body: ComputeRoutesRequestBody;
  try {
    body = (await request.json()) as ComputeRoutesRequestBody;
  } catch {
    return jsonWithSecurityHeaders(
      { error: 'Invalid JSON request body' },
      { status: 400 }
    );
  }

  if (!body.origin?.location || !body.destination?.location) {
    return jsonWithSecurityHeaders(
      { error: 'Both origin and destination locations are required.' },
      { status: 400 }
    );
  }

  const intermediates = Array.isArray(body.intermediates)
    ? body.intermediates
    : [];
  const optimizeWaypointOrder =
    Boolean(body.optimizeWaypointOrder) && intermediates.length > 0;

  const upstreamBody: Record<string, unknown> = {
    origin: {
      location: {
        latLng: {
          latitude: body.origin.location.lat,
          longitude: body.origin.location.lng,
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: body.destination.location.lat,
          longitude: body.destination.location.lng,
        },
      },
    },
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
    polylineQuality: 'OVERVIEW',
    units: 'IMPERIAL',
    languageCode: 'en-US',
  };

  if (intermediates.length > 0) {
    upstreamBody.intermediates = intermediates.map((wp) => ({
      location: {
        latLng: {
          latitude: wp.location.lat,
          longitude: wp.location.lng,
        },
      },
    }));
    upstreamBody.optimizeWaypointOrder = optimizeWaypointOrder;
  }

  const fieldMask =
    'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.duration,routes.legs.distanceMeters,routes.legs.startLocation,routes.legs.endLocation,routes.optimizedIntermediateWaypointIndex';

  try {
    const upstream = await fetch(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': fieldMask,
          'X-Goog-Maps-Solution-ID': 'gmp_git_agentsamples_v1.0.0',
        },
        body: JSON.stringify(upstreamBody),
        cache: 'no-store',
      }
    );

    const payload = (await upstream.json()) as {
      routes?: UpstreamRoute[];
      error?: { message?: string; status?: string };
    };

    if (!upstream.ok || !payload.routes?.length) {
      return jsonWithSecurityHeaders(
        {
          error:
            payload.error?.message ||
            `Routes API computeRoutes returned HTTP ${upstream.status}`,
        },
        { status: upstream.status >= 400 ? upstream.status : 502 }
      );
    }

    const route = payload.routes[0];
    const optimizedIndices =
      route.optimizedIntermediateWaypointIndex &&
      route.optimizedIntermediateWaypointIndex.length === intermediates.length
        ? route.optimizedIntermediateWaypointIndex
        : intermediates.map((_, idx) => idx);

    const orderedIntermediates = optimizedIndices.map(
      (idx) => intermediates[idx]
    );
    const fullSequence = [
      body.origin,
      ...orderedIntermediates,
      body.destination,
    ];

    const legs = (route.legs ?? []).map((leg, idx) => {
      const durSec = parseDurationSeconds(leg.duration);
      const distMeters = leg.distanceMeters ?? 0;
      return {
        legIndex: idx,
        fromName: fullSequence[idx]?.name || `Stop ${idx}`,
        toName: fullSequence[idx + 1]?.name || `Stop ${idx + 1}`,
        durationSeconds: durSec,
        durationText: formatDuration(durSec),
        distanceMeters: distMeters,
        distanceText: formatDistanceMiles(distMeters),
      };
    });

    const totalDurSec = parseDurationSeconds(route.duration);
    const totalDistMeters = route.distanceMeters ?? 0;

    return jsonWithSecurityHeaders({
      encodedPolyline: route.polyline?.encodedPolyline ?? '',
      totalDurationSeconds: totalDurSec,
      totalDurationText: formatDuration(totalDurSec),
      totalDistanceMeters: totalDistMeters,
      totalDistanceText: formatDistanceMiles(totalDistMeters),
      optimizedIntermediateWaypointIndex: optimizedIndices,
      orderedStopIds: [
        ...orderedIntermediates.map((wp, i) => wp.id || `stop-${i}`),
        body.destination.id || 'destination',
      ],
      legs,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to compute dispatch route';
    return jsonWithSecurityHeaders({ error: message }, { status: 502 });
  }
}
