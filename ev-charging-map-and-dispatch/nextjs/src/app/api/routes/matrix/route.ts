import { NextRequest, NextResponse } from 'next/server';
import {
  ROUTE_MATRIX_FIELD_MASK,
  getServerMapsApiKey,
  isValidLatLng,
  parseDurationSeconds,
} from '@/lib/server-maps';

interface MatrixDestination {
  id: string;
  lat: number;
  lng: number;
}

interface MatrixRequestBody {
  origin?: { lat?: number; lng?: number };
  destinations?: MatrixDestination[];
}

interface UpstreamMatrixElement {
  originIndex?: number;
  destinationIndex?: number;
  status?: { code?: number; message?: string };
  condition?: string;
  distanceMeters?: number;
  duration?: string;
}

export async function POST(request: NextRequest) {
  const apiKey = getServerMapsApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key is not configured on the server.' },
      { status: 500 }
    );
  }

  let body: MatrixRequestBody;
  try {
    body = (await request.json()) as MatrixRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const origin = body.origin;
  const destinations = Array.isArray(body.destinations)
    ? body.destinations.slice(0, 25)
    : [];

  if (!origin || !isValidLatLng(origin.lat, origin.lng)) {
    return NextResponse.json(
      { error: 'Valid origin lat/lng coordinates are required.' },
      { status: 400 }
    );
  }

  if (destinations.length === 0) {
    return NextResponse.json({ elements: [] });
  }

  const validDestinations = destinations.filter((d) =>
    isValidLatLng(d.lat, d.lng)
  );
  if (validDestinations.length === 0) {
    return NextResponse.json({ elements: [] });
  }

  try {
    const upstreamRes = await fetch(
      'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': ROUTE_MATRIX_FIELD_MASK,
        },
        body: JSON.stringify({
          origins: [
            {
              waypoint: {
                location: {
                  latLng: {
                    latitude: origin.lat,
                    longitude: origin.lng,
                  },
                },
              },
            },
          ],
          destinations: validDestinations.map((dest) => ({
            waypoint: {
              location: {
                latLng: {
                  latitude: dest.lat,
                  longitude: dest.lng,
                },
              },
            },
          })),
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
        }),
        cache: 'no-store',
      }
    );

    const data = await upstreamRes.json();
    if (!upstreamRes.ok) {
      const msg =
        (data as { error?: { message?: string } })?.error?.message ||
        `Compute Route Matrix failed (${upstreamRes.status})`;
      return NextResponse.json({ error: msg }, { status: upstreamRes.status });
    }

    const rows = Array.isArray(data) ? (data as UpstreamMatrixElement[]) : [];
    const elements = rows
      .filter((el) => typeof el.destinationIndex === 'number')
      .map((el) => {
        const dest = validDestinations[el.destinationIndex as number];
        return {
          destinationId: dest?.id ?? '',
          destinationIndex: el.destinationIndex,
          condition: el.condition,
          distanceMeters:
            typeof el.distanceMeters === 'number' ? el.distanceMeters : undefined,
          durationSeconds: parseDurationSeconds(el.duration),
        };
      })
      .filter((el) => Boolean(el.destinationId));

    return NextResponse.json({ elements });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Unexpected error calling Compute Route Matrix.',
      },
      { status: 502 }
    );
  }
}
