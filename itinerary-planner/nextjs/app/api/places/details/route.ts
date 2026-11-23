import { NextRequest, NextResponse } from 'next/server';
import {
  getServerGoogleMapsApiKey,
  normalizeRawPlace,
  RawPlacesApiPlace,
} from '@/lib/gmp-server';

const FIELD_MASK =
  'id,displayName,formattedAddress,location,viewport,rating,userRatingCount,regularOpeningHours,photos,primaryTypeDisplayName,googleMapsUri,utcOffsetMinutes';

export async function GET(request: NextRequest) {
  const apiKey = getServerGoogleMapsApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key is not configured on the server.' },
      { status: 503 }
    );
  }

  const placeId = request.nextUrl.searchParams.get('placeId')?.trim();
  if (!placeId || !/^[A-Za-z0-9_-]+$/.test(placeId)) {
    return NextResponse.json({ error: 'Valid placeId query parameter is required.' }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=en`,
      {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        cache: 'no-store',
      }
    );

    const data = (await upstream.json()) as RawPlacesApiPlace & {
      viewport?: {
        low?: { latitude?: number; longitude?: number };
        high?: { latitude?: number; longitude?: number };
      };
      error?: { message?: string; status?: string };
    };

    if (!upstream.ok) {
      return NextResponse.json(
        {
          error: data.error?.message || 'Place Details request failed.',
          status: data.error?.status,
        },
        { status: upstream.status }
      );
    }

    const place = normalizeRawPlace(data);
    return NextResponse.json({
      place,
      viewport: data.viewport ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
