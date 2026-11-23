import { NextRequest, NextResponse } from 'next/server';
import {
  COMPUTE_ROUTES_FIELD_MASK,
  getServerMapsApiKey,
  isValidLatLng,
  parseDurationSeconds,
} from '@/lib/server-maps';

interface ComputeRouteBody {
  origin?: { lat?: number; lng?: number };
  destination?: { lat?: number; lng?: number };
}

interface UpstreamRoute {
  duration?: string;
  distanceMeters?: number;
  polyline?: { encodedPolyline?: string };
  viewport?: {
    low?: { latitude?: number; longitude?: number };
    high?: { latitude?: number; longitude?: number };
  };
  legs?: Array<{
    duration?: string;
    distanceMeters?: number;
    steps?: Array<{
      navigationInstruction?: {
        instructions?: string;
        maneuver?: string;
      };
      distanceMeters?: number;
      staticDuration?: string;
    }>;
  }>;
}

export async function POST(request: NextRequest) {
  const apiKey = getServerMapsApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key is not configured on the server.' },
      { status: 500 }
    );
  }

  let body: ComputeRouteBody;
  try {
    body = (await request.json()) as ComputeRouteBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const { origin, destination } = body;
  if (
    !origin ||
    !destination ||
    !isValidLatLng(origin.lat, origin.lng) ||
    !isValidLatLng(destination.lat, destination.lng)
  ) {
    return NextResponse.json(
      { error: 'Valid origin and destination lat/lng coordinates are required.' },
      { status: 400 }
    );
  }

  try {
    const upstreamRes = await fetch(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': COMPUTE_ROUTES_FIELD_MASK,
        },
        body: JSON.stringify({
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
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
          polylineEncoding: 'ENCODED_POLYLINE',
          polylineQuality: 'HIGH_QUALITY',
          computeAlternativeRoutes: false,
          languageCode: 'en-US',
          units: 'METRIC',
        }),
        cache: 'no-store',
      }
    );

    const data = (await upstreamRes.json()) as {
      routes?: UpstreamRoute[];
      error?: { message?: string };
    };

    if (!upstreamRes.ok) {
      return NextResponse.json(
        {
          error:
            data.error?.message ||
            `Compute Routes failed (${upstreamRes.status})`,
        },
        { status: upstreamRes.status }
      );
    }

    const route = data.routes?.[0];
    if (!route || !route.polyline?.encodedPolyline) {
      return NextResponse.json(
        { error: 'No drivable route found between these coordinates.' },
        { status: 404 }
      );
    }

    const leg = route.legs?.[0];
    const steps = (leg?.steps ?? [])
      .map((step) => ({
        instruction:
          step.navigationInstruction?.instructions?.trim() ||
          'Continue on route',
        maneuver: step.navigationInstruction?.maneuver,
        distanceMeters: step.distanceMeters ?? 0,
        durationSeconds: parseDurationSeconds(step.staticDuration) ?? 0,
      }))
      .filter((step) => Boolean(step.instruction));

    const viewport =
      route.viewport?.low &&
      route.viewport?.high &&
      typeof route.viewport.low.latitude === 'number' &&
      typeof route.viewport.low.longitude === 'number' &&
      typeof route.viewport.high.latitude === 'number' &&
      typeof route.viewport.high.longitude === 'number'
        ? {
            low: {
              lat: route.viewport.low.latitude,
              lng: route.viewport.low.longitude,
            },
            high: {
              lat: route.viewport.high.latitude,
              lng: route.viewport.high.longitude,
            },
          }
        : undefined;

    return NextResponse.json({
      encodedPolyline: route.polyline.encodedPolyline,
      distanceMeters: route.distanceMeters ?? leg?.distanceMeters ?? 0,
      durationSeconds:
        parseDurationSeconds(route.duration) ??
        parseDurationSeconds(leg?.duration) ??
        0,
      viewport,
      steps,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Unexpected error calling Compute Routes.',
      },
      { status: 502 }
    );
  }
}
