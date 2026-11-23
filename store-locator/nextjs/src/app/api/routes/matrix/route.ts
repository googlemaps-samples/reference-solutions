import { NextRequest, NextResponse } from 'next/server';
import {
  formatDistanceImperial,
  formatDuration,
  parseDurationSeconds,
} from '@/lib/classify';
import { getServerApiKey, isValidLatLng } from '@/lib/gmp-server';
import type { LatLngLiteral, RouteMatrixMetric, TravelMode } from '@/types/locator';

const MATRIX_FIELD_MASK =
  'originIndex,destinationIndex,status,condition,distanceMeters,duration,localizedValues';

const VALID_TRAVEL_MODES: Record<TravelMode, boolean> = {
  DRIVE: true,
  WALK: true,
  TRANSIT: true,
};

interface MatrixDestinationInput {
  branchId: string;
  location: LatLngLiteral;
}

interface UpstreamMatrixElement {
  originIndex?: number;
  destinationIndex?: number;
  status?: { code?: number; message?: string };
  condition?: string;
  distanceMeters?: number;
  duration?: string;
  localizedValues?: {
    distance?: { text?: string };
    duration?: { text?: string };
  };
}

async function computeMatrixChunk(
  apiKey: string,
  origin: LatLngLiteral,
  destinations: MatrixDestinationInput[],
  travelMode: TravelMode
): Promise<RouteMatrixMetric[]> {
  const body: Record<string, unknown> = {
    origins: [
      {
        waypoint: {
          location: {
            latLng: { latitude: origin.lat, longitude: origin.lng },
          },
        },
      },
    ],
    destinations: destinations.map((dest) => ({
      waypoint: {
        location: {
          latLng: { latitude: dest.location.lat, longitude: dest.location.lng },
        },
      },
    })),
    travelMode,
    units: 'IMPERIAL',
    languageCode: 'en-US',
  };

  if (travelMode === 'DRIVE') {
    body.routingPreference = 'TRAFFIC_AWARE';
  }

  const upstream = await fetch(
    'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': MATRIX_FIELD_MASK,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    }
  );

  if (!upstream.ok) {
    const errText = await upstream.text();
    throw new Error(`computeRouteMatrix failed (${upstream.status}): ${errText}`);
  }

  const elements = (await upstream.json()) as UpstreamMatrixElement[];
  const metrics: RouteMatrixMetric[] = [];

  for (const el of elements) {
    const destIdx = el.destinationIndex ?? -1;
    const target = destinations[destIdx];
    if (!target) continue;

    if (el.condition && el.condition !== 'ROUTE_EXISTS') {
      continue;
    }

    const durationSeconds = parseDurationSeconds(el.duration);
    const distanceMeters = typeof el.distanceMeters === 'number' ? el.distanceMeters : 0;

    if (durationSeconds === Number.MAX_SAFE_INTEGER) {
      continue;
    }

    metrics.push({
      branchId: target.branchId,
      durationSeconds,
      durationText: el.localizedValues?.duration?.text ?? formatDuration(durationSeconds),
      distanceMeters,
      distanceText:
        el.localizedValues?.distance?.text ?? formatDistanceImperial(distanceMeters),
      condition: el.condition,
    });
  }

  return metrics;
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

  if (!isValidLatLng(body.origin)) {
    return NextResponse.json({ error: 'Valid origin { lat, lng } is required.' }, { status: 400 });
  }

  const travelMode: TravelMode =
    typeof body.travelMode === 'string' &&
    VALID_TRAVEL_MODES[body.travelMode as TravelMode]
      ? (body.travelMode as TravelMode)
      : 'DRIVE';

  const rawDestinations = Array.isArray(body.destinations) ? body.destinations : [];
  const destinations: MatrixDestinationInput[] = rawDestinations
    .filter(
      (item): item is MatrixDestinationInput =>
        Boolean(
          item &&
            typeof item === 'object' &&
            typeof (item as MatrixDestinationInput).branchId === 'string' &&
            isValidLatLng((item as MatrixDestinationInput).location)
        )
    )
    .slice(0, 50);

  if (destinations.length === 0) {
    return NextResponse.json({ metrics: [] });
  }

  try {
    // Batch into chunks of 25 so TRANSIT mode stays within the 25-element Routes API limit
    const chunkSize = 25;
    const chunks: MatrixDestinationInput[][] = [];
    for (let i = 0; i < destinations.length; i += chunkSize) {
      chunks.push(destinations.slice(i, i + chunkSize));
    }

    const chunkResults = await Promise.all(
      chunks.map((chunk) =>
        computeMatrixChunk(apiKey, body.origin as LatLngLiteral, chunk, travelMode)
      )
    );

    const metrics = chunkResults.flat();
    return NextResponse.json({ metrics });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to compute Route Matrix.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
