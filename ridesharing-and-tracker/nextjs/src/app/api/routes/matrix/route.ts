import { NextRequest, NextResponse } from 'next/server';
import type { LatLngLiteral } from '@/types/rideshare';

const COMPUTE_ROUTE_MATRIX_URL =
  'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix';

const FIELD_MASK =
  'originIndex,destinationIndex,duration,distanceMeters,status,condition';

export async function POST(req: NextRequest) {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key is not configured on the server.' },
      { status: 500 }
    );
  }

  try {
    const body = (await req.json()) as {
      origins?: LatLngLiteral[];
      destination?: LatLngLiteral;
    };

    if (!body.origins?.length || !body.destination) {
      return NextResponse.json(
        { error: 'origins array and destination coordinate are required.' },
        { status: 400 }
      );
    }

    const matrixPayload = {
      origins: body.origins.map((origin) => ({
        waypoint: {
          location: {
            latLng: {
              latitude: origin.lat,
              longitude: origin.lng,
            },
          },
        },
      })),
      destinations: [
        {
          waypoint: {
            location: {
              latLng: {
                latitude: body.destination!.lat,
                longitude: body.destination!.lng,
              },
            },
          },
        },
      ],
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
    };

    const upstreamRes = await fetch(COMPUTE_ROUTE_MATRIX_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(matrixPayload),
      cache: 'no-store',
    });

    const data = await upstreamRes.json();

    if (!upstreamRes.ok) {
      return NextResponse.json(
        {
          error:
            data?.error?.message ||
            'Routes API computeRouteMatrix request failed.',
          details: data,
        },
        { status: upstreamRes.status }
      );
    }

    return NextResponse.json({ elements: data }, { status: 200 });
  } catch (err) {
    console.error('Error in /api/routes/matrix:', err);
    return NextResponse.json(
      { error: 'Failed to compute route matrix via Routes API v2.' },
      { status: 500 }
    );
  }
}
