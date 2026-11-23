import { NextRequest, NextResponse } from 'next/server';
import {
  PLACES_FIELD_MASK,
  getServerMapsApiKey,
  isValidLatLng,
  normalizeRawPlace,
} from '@/lib/server-maps';
import type { ProviderCategory, ServiceProvider } from '@/lib/types';

interface NearbyRequestBody {
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  includedTypes?: string[];
}

export async function POST(request: NextRequest) {
  const apiKey = getServerMapsApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key is not configured on the server.' },
      { status: 500 }
    );
  }

  let body: NearbyRequestBody;
  try {
    body = (await request.json()) as NearbyRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const { lat, lng, radiusMeters = 10000, includedTypes } = body;
  if (!isValidLatLng(lat, lng)) {
    return NextResponse.json(
      { error: 'Valid lat and lng coordinates are required.' },
      { status: 400 }
    );
  }

  const clampedRadius = Math.min(
    Math.max(Number(radiusMeters) || 10000, 1000),
    50000
  );
  const requestedTypes =
    Array.isArray(includedTypes) && includedTypes.length > 0
      ? includedTypes
      : ['electric_vehicle_charging_station', 'car_repair'];

  const origin = { lat: lat as number, lng: lng as number };

  try {
    const responses = await Promise.all(
      requestedTypes.map(async (placeType) => {
        const upstreamRes = await fetch(
          'https://places.googleapis.com/v1/places:searchNearby',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': PLACES_FIELD_MASK,
            },
            body: JSON.stringify({
              includedTypes: [placeType],
              maxResultCount: 10,
              rankPreference: 'DISTANCE',
              locationRestriction: {
                circle: {
                  center: { latitude: origin.lat, longitude: origin.lng },
                  radius: clampedRadius,
                },
              },
            }),
            cache: 'no-store',
          }
        );

        const data = (await upstreamRes.json()) as {
          places?: Array<Record<string, unknown>>;
          error?: { message?: string; status?: string };
        };

        if (!upstreamRes.ok) {
          return {
            ok: false as const,
            status: upstreamRes.status,
            message: data.error?.message || `Places Nearby failed (${upstreamRes.status})`,
          };
        }

        const fallbackCategory: ProviderCategory =
          placeType === 'electric_vehicle_charging_station' ? 'ev' : 'repair';

        const normalized = (data.places ?? [])
          .map((raw) => normalizeRawPlace(raw, origin, fallbackCategory))
          .filter((item): item is ServiceProvider => item !== null);

        return { ok: true as const, places: normalized };
      })
    );

    const failed = responses.find((r) => !r.ok);
    const succeeded = responses.filter((r) => r.ok);

    if (succeeded.length === 0 && failed) {
      return NextResponse.json(
        { error: failed.message },
        { status: failed.status }
      );
    }

    const dedupedById: Record<string, ServiceProvider> = {};
    for (const res of succeeded) {
      for (const place of res.places) {
        if (!dedupedById[place.id]) {
          dedupedById[place.id] = place;
        }
      }
    }

    const places = Object.values(dedupedById).sort(
      (a, b) => a.straightLineMeters - b.straightLineMeters
    );

    return NextResponse.json({ places });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Unexpected error calling Places Nearby Search.',
      },
      { status: 502 }
    );
  }
}
