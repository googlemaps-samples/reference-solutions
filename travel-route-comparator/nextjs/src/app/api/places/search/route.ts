import { NextRequest, NextResponse } from 'next/server';
import {
  FRONT_RANGE_BIAS_RECTANGLE,
  getServerMapsApiKey,
} from '@/lib/gmp-server';
import type { PlaceEndpoint } from '@/types/travel';

const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location';

interface PlacesSearchBody {
  textQuery?: string;
}

interface GooglePlaceItem {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
}

export async function POST(req: NextRequest) {
  const apiKey = getServerMapsApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'Google Maps API key is not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local.',
      },
      { status: 503 }
    );
  }

  let body: PlacesSearchBody;
  try {
    body = (await req.json()) as PlacesSearchBody;
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

  try {
    const upstreamRes = await fetch(PLACES_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery,
        languageCode: 'en',
        regionCode: 'US',
        pageSize: 5,
        locationBias: {
          rectangle: FRONT_RANGE_BIAS_RECTANGLE,
        },
      }),
      cache: 'no-store',
    });

    const data = (await upstreamRes.json()) as {
      places?: GooglePlaceItem[];
      error?: { message?: string; status?: string };
    };

    if (!upstreamRes.ok) {
      return NextResponse.json(
        {
          error: data.error?.message || 'Places Text Search request failed.',
          status: data.error?.status || upstreamRes.status,
        },
        { status: upstreamRes.status }
      );
    }

    const places: PlaceEndpoint[] = (data.places || [])
      .filter(
        (p) =>
          typeof p.location?.latitude === 'number' &&
          typeof p.location?.longitude === 'number'
      )
      .map((p) => ({
        id: p.id || textQuery,
        displayName: p.displayName?.text || textQuery,
        formattedAddress: p.formattedAddress || p.displayName?.text || textQuery,
        location: {
          lat: p.location!.latitude!,
          lng: p.location!.longitude!,
        },
      }));

    return NextResponse.json({ places });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unexpected server error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
