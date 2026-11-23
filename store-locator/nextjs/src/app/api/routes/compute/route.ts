import { NextRequest, NextResponse } from 'next/server';
import {
  formatDistanceImperial,
  formatDuration,
  parseDurationSeconds,
} from '@/lib/classify';
import { getServerApiKey, isValidLatLng } from '@/lib/gmp-server';
import type { TravelMode } from '@/types/locator';

const COMPUTE_FIELD_MASK =
  'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.duration,routes.legs.distanceMeters,routes.localizedValues';

const VALID_TRAVEL_MODES: Record<TravelMode, boolean> = {
  DRIVE: true,
  WALK: true,
  TRANSIT: true,
};

interface UpstreamComputeRoutesResponse {
  routes?: Array<{
    duration?: string;
    distanceMeters?: number;
    polyline?: { encodedPolyline?: string };
    legs?: Array<{
      duration?: string;
      distanceMeters?: number;
    }>;
    localizedValues?: {
      distance?: { text?: string };
      duration?: { text?: string };
    };
  }>;
}

export async function POST(request: NextRequest) {
  const apiKey = getServerApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key is not configured on the server.' },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  if (!isValidLatLng(body.origin) || !isValidLatLng(body.destination)) {
    return NextResponse.json(
      { error: 'Valid origin and destination { lat, lng } coordinates are required.' },
      { status: 400 }
    );
  }

  const branchId = typeof body.branchId === 'string' ? body.branchId : '';
  const travelMode: TravelMode =
    typeof body.travelMode === 'string' &&
    VALID_TRAVEL_MODES[body.travelMode as TravelMode]
      ? (body.travelMode as TravelMode)
      : 'DRIVE';

  const requestPayload: Record<string, unknown> = {
    origin: {
      location: {
        latLng: { latitude: body.origin.lat, longitude: body.origin.lng },
      },
    },
    destination: {
      location: {
        latLng: { latitude: body.destination.lat, longitude: body.destination.lng },
      },
    },
    travelMode,
    polylineQuality: 'HIGH_QUALITY',
    polylineEncoding: 'ENCODED_POLYLINE',
    units: 'IMPERIAL',
    languageCode: 'en-US',
  };

  if (travelMode === 'DRIVE') {
    requestPayload.routingPreference = 'TRAFFIC_AWARE';
  }

  try {
    const upstream = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': COMPUTE_FIELD_MASK,
      },
      body: JSON.stringify(requestPayload),
      cache: 'no-store',
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return NextResponse.json(
        { error: `computeRoutes failed (${upstream.status}): ${errText}` },
        { status: 502 }
      );
    }

    const data = (await upstream.json()) as UpstreamComputeRoutesResponse;
    const firstRoute = data.routes?.[0];
    const encodedPolyline = firstRoute?.polyline?.encodedPolyline ?? '';

    if (!firstRoute || !encodedPolyline) {
      return NextResponse.json(
        {
          route: null,
          error: 'No drivable/walkable/transit route found between origin and destination.',
        },
        { status: 200 }
      );
    }

    const durationSeconds = parseDurationSeconds(
      firstRoute.duration ?? firstRoute.legs?.[0]?.duration
    );
    const distanceMeters =
      firstRoute.distanceMeters ?? firstRoute.legs?.[0]?.distanceMeters ?? 0;

    return NextResponse.json({
      route: {
        branchId,
        travelMode,
        encodedPolyline,
        durationSeconds,
        durationText:
          firstRoute.localizedValues?.duration?.text ?? formatDuration(durationSeconds),
        distanceMeters,
        distanceText:
          firstRoute.localizedValues?.distance?.text ??
          formatDistanceImperial(distanceMeters),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to compute route.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
