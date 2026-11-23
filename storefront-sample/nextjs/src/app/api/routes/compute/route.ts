import { NextRequest, NextResponse } from 'next/server';
import {
  formatDistanceMeters,
  formatDurationSeconds,
  parseDurationString,
} from '@/lib/hours';
import type { LatLngLiteral, RouteSummary, TravelMode } from '@/lib/types';

const ROUTES_COMPUTE_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const ROUTES_FIELD_MASK = [
  'routes.duration',
  'routes.distanceMeters',
  'routes.polyline.encodedPolyline',
  'routes.localizedValues',
].join(',');

const VALID_MODES = new Set<TravelMode>(['DRIVE', 'TRANSIT', 'WALK']);

function isValidLatLng(value: unknown): value is LatLngLiteral {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.lat === 'number' &&
    typeof candidate.lng === 'number' &&
    Number.isFinite(candidate.lat) &&
    Number.isFinite(candidate.lng) &&
    candidate.lat >= -90 &&
    candidate.lat <= 90 &&
    candidate.lng >= -180 &&
    candidate.lng <= 180
  );
}

interface ComputeRoutesResponse {
  routes?: Array<{
    duration?: string;
    distanceMeters?: number;
    polyline?: { encodedPolyline?: string };
    localizedValues?: {
      distance?: { text?: string };
      duration?: { text?: string };
    };
  }>;
}

export async function POST(request: NextRequest) {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key is not configured on the server.' },
      { status: 500 }
    );
  }

  let body: {
    origin?: unknown;
    destination?: unknown;
    travelMode?: unknown;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  if (!isValidLatLng(body.origin) || !isValidLatLng(body.destination)) {
    return NextResponse.json(
      { error: 'Valid origin and destination coordinates are required.' },
      { status: 400 }
    );
  }

  const travelMode =
    typeof body.travelMode === 'string' && VALID_MODES.has(body.travelMode as TravelMode)
      ? (body.travelMode as TravelMode)
      : 'DRIVE';

  const requestPayload: Record<string, unknown> = {
    origin: {
      location: {
        latLng: {
          latitude: body.origin.lat,
          longitude: body.origin.lng,
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: body.destination.lat,
          longitude: body.destination.lng,
        },
      },
    },
    travelMode,
    computeAlternativeRoutes: false,
    units: 'IMPERIAL',
    languageCode: 'en-US',
  };

  if (travelMode === 'DRIVE') {
    requestPayload.routingPreference = 'TRAFFIC_AWARE';
  }

  try {
    const referer = request.headers.get('referer') || request.headers.get('origin');
    const upstreamHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': ROUTES_FIELD_MASK,
    };
    if (referer) {
      upstreamHeaders.Referer = referer;
    }

    const upstream = await fetch(ROUTES_COMPUTE_URL, {
      method: 'POST',
      headers: upstreamHeaders,
      body: JSON.stringify(requestPayload),
      cache: 'no-store',
    });

    if (!upstream.ok) {
      const errorText = await upstream.text().catch(() => '');
      return NextResponse.json(
        {
          error: 'Routes API v2 computeRoutes failed.',
          status: upstream.status,
          details: errorText.slice(0, 300),
        },
        { status: upstream.status }
      );
    }

    const data = (await upstream.json()) as ComputeRoutesResponse;
    const firstRoute = data.routes?.[0];

    if (!firstRoute) {
      return NextResponse.json(
        { error: 'No route found for the selected origin and travel mode.' },
        { status: 404 }
      );
    }

    const durationSeconds = parseDurationString(firstRoute.duration);
    const distanceMeters = firstRoute.distanceMeters ?? 0;

    const routeSummary: RouteSummary = {
      travelMode,
      durationSeconds,
      distanceMeters,
      durationText:
        firstRoute.localizedValues?.duration?.text ??
        formatDurationSeconds(durationSeconds),
      distanceText:
        firstRoute.localizedValues?.distance?.text ??
        formatDistanceMeters(distanceMeters),
      encodedPolyline: firstRoute.polyline?.encodedPolyline,
    };

    return NextResponse.json({ route: routeSummary });
  } catch {
    return NextResponse.json(
      { error: 'Unable to reach Google Routes API v2.' },
      { status: 502 }
    );
  }
}
