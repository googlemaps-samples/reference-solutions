import { NextRequest, NextResponse } from 'next/server';
import {
  PLACES_FIELD_MASK,
  getServerMapsApiKey,
  isValidLatLng,
  normalizeRawPlace,
} from '@/lib/server-maps';
import type { ServiceProvider } from '@/lib/types';

interface SearchTextBody {
  textQuery?: string;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  includedType?: string;
}

export async function POST(request: NextRequest) {
  const apiKey = getServerMapsApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key is not configured on the server.' },
      { status: 500 }
    );
  }

  let body: SearchTextBody;
  try {
    body = (await request.json()) as SearchTextBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const textQuery = body.textQuery?.trim();
  if (!textQuery) {
    return NextResponse.json(
      { error: 'textQuery is required.' },
      { status: 400 }
    );
  }

  const lat = isValidLatLng(body.lat, body.lng) ? (body.lat as number) : 47.6062;
  const lng = isValidLatLng(body.lat, body.lng) ? (body.lng as number) : -122.3321;
  const radiusMeters = Math.min(
    Math.max(Number(body.radiusMeters) || 10000, 1000),
    50000
  );

  const payload: Record<string, unknown> = {
    textQuery,
    maxResultCount: 12,
    locationBias: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: radiusMeters,
      },
    },
  };

  if (body.includedType) {
    payload.includedType = body.includedType;
  }

  try {
    const upstreamRes = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': PLACES_FIELD_MASK,
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      }
    );

    const data = (await upstreamRes.json()) as {
      places?: Array<Record<string, unknown>>;
      error?: { message?: string };
    };

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: data.error?.message || `Places Text Search failed (${upstreamRes.status})` },
        { status: upstreamRes.status }
      );
    }

    const origin = { lat, lng };
    const places = (data.places ?? [])
      .map((raw) => normalizeRawPlace(raw, origin))
      .filter((item): item is ServiceProvider => item !== null);

    return NextResponse.json({ places });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Unexpected error calling Places Text Search.',
      },
      { status: 502 }
    );
  }
}
