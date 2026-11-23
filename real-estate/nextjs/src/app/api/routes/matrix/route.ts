import { NextRequest, NextResponse } from 'next/server';
import { getServerGoogleMapsApiKey, isValidLatLng } from '@/lib/gmp-server';
import { formatDistance, formatDurationSeconds, parseDurationString } from '@/lib/formatters';
import type { CommuteModeResult } from '@/types/real-estate';

const FIELD_MASK =
  'originIndex,destinationIndex,status,condition,distanceMeters,duration,localizedValues';

interface RouteMatrixElement {
  originIndex?: number;
  destinationIndex?: number;
  status?: { code?: number; message?: string };
  condition?: string;
  distanceMeters?: number;
  duration?: string;
  localizedValues?: {
    distance?: { text?: string };
    duration?: { text?: string };
    staticDuration?: { text?: string };
  };
}

async function computeSingleModeMatrix(
  apiKey: string,
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  travelMode: 'DRIVE' | 'TRANSIT'
): Promise<CommuteModeResult> {
  const payload: Record<string, unknown> = {
    origins: [
      {
        waypoint: {
          location: {
            latLng: { latitude: origin.lat, longitude: origin.lng },
          },
        },
      },
    ],
    destinations: [
      {
        waypoint: {
          location: {
            latLng: { latitude: destination.lat, longitude: destination.lng },
          },
        },
      },
    ],
    travelMode,
    languageCode: 'en-US',
    units: 'IMPERIAL',
  };

  if (travelMode === 'DRIVE') {
    payload.routingPreference = 'TRAFFIC_AWARE';
  }

  const response = await fetch(
    'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
        'X-Goog-Maps-Solution-ID': 'gmp_git_agentsamples_v1.0.0',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `Route Matrix (${travelMode}) failed.`);
  }

  const elements: RouteMatrixElement[] = Array.isArray(data) ? data : [];
  const first = elements[0];
  if (!first || first.condition !== 'ROUTE_EXISTS') {
    return {
      durationText: 'Unavailable',
      durationSeconds: 0,
      distanceText: '—',
      distanceMeters: 0,
      available: false,
    };
  }

  const durationSeconds = parseDurationString(first.duration);
  const distanceMeters = typeof first.distanceMeters === 'number' ? first.distanceMeters : 0;

  return {
    durationText:
      first.localizedValues?.duration?.text || formatDurationSeconds(durationSeconds),
    durationSeconds,
    distanceText: first.localizedValues?.distance?.text || formatDistance(distanceMeters),
    distanceMeters,
    available: true,
  };
}

export async function POST(request: NextRequest) {
  const apiKey = getServerGoogleMapsApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'Google Maps API key is not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY or GOOGLE_MAPS_API_KEY in .env.local.',
      },
      { status: 503 }
    );
  }

  let body: {
    origin?: { lat: number; lng: number };
    destination?: { lat: number; lng: number };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  if (!isValidLatLng(body.origin) || !isValidLatLng(body.destination)) {
    return NextResponse.json(
      { error: 'Valid origin and destination { lat, lng } coordinates are required.' },
      { status: 400 }
    );
  }

  try {
    const [driveResult, transitResult] = await Promise.allSettled([
      computeSingleModeMatrix(apiKey, body.origin, body.destination, 'DRIVE'),
      computeSingleModeMatrix(apiKey, body.origin, body.destination, 'TRANSIT'),
    ]);

    const drive: CommuteModeResult =
      driveResult.status === 'fulfilled'
        ? driveResult.value
        : {
            durationText: 'Unavailable',
            durationSeconds: 0,
            distanceText: '—',
            distanceMeters: 0,
            available: false,
          };

    const transit: CommuteModeResult =
      transitResult.status === 'fulfilled'
        ? transitResult.value
        : {
            durationText: 'Unavailable',
            durationSeconds: 0,
            distanceText: '—',
            distanceMeters: 0,
            available: false,
          };

    if (!drive.available && !transit.available) {
      const errorMessage =
        driveResult.status === 'rejected'
          ? driveResult.reason instanceof Error
            ? driveResult.reason.message
            : 'Failed to compute route matrix.'
          : 'No driving or transit routes found.';
      return NextResponse.json({ error: errorMessage, drive, transit }, { status: 502 });
    }

    return NextResponse.json({ drive, transit });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compute route matrix.' },
      { status: 502 }
    );
  }
}
