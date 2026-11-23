import { NextRequest, NextResponse } from 'next/server';
import type { EmissionType, LatLngLiteral } from '@/types/rideshare';

const COMPUTE_ROUTES_URL =
  'https://routes.googleapis.com/directions/v2:computeRoutes';

const FIELD_MASK =
  'routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline.encodedPolyline,routes.routeLabels,routes.travelAdvisory.fuelConsumptionMicroliters,routes.localizedValues';

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
      origin?: LatLngLiteral;
      destination?: LatLngLiteral;
      emissionType?: EmissionType;
      includeEco?: boolean;
    };

    if (!body.origin || !body.destination) {
      return NextResponse.json(
        { error: 'origin and destination coordinates are required.' },
        { status: 400 }
      );
    }

    const includeEco = body.includeEco ?? true;
    const emissionType: EmissionType = body.emissionType ?? 'GASOLINE';

    const routePayload: Record<string, unknown> = {
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
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
      polylineQuality: 'HIGH_QUALITY',
      polylineEncoding: 'ENCODED_POLYLINE',
      computeAlternativeRoutes: false,
      languageCode: 'en-US',
      units: 'IMPERIAL',
    };

    if (includeEco) {
      routePayload.requestedReferenceRoutes = ['FUEL_EFFICIENT'];
      routePayload.extraComputations = ['FUEL_CONSUMPTION'];
      routePayload.routeModifiers = {
        vehicleInfo: {
          emissionType,
        },
      };
    }

    const upstreamRes = await fetch(COMPUTE_ROUTES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(routePayload),
      cache: 'no-store',
    });

    const data = await upstreamRes.json();

    if (!upstreamRes.ok) {
      return NextResponse.json(
        {
          error:
            data?.error?.message ||
            'Routes API computeRoutes request failed.',
          details: data,
        },
        { status: upstreamRes.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error('Error in /api/routes/compute:', err);
    return NextResponse.json(
      { error: 'Failed to compute routes via Routes API v2.' },
      { status: 500 }
    );
  }
}
