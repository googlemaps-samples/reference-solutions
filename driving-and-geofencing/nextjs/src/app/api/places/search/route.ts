import { NextResponse } from 'next/server';
import type { AuditSite } from '@/types/geofencing';

interface PlacesSearchRequestBody {
  textQuery?: string;
  maxResultCount?: number;
}

interface GooglePlaceItem {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  primaryTypeDisplayName?: { text?: string };
}

const PLACES_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.primaryTypeDisplayName';

export async function POST(request: Request) {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    return NextResponse.json(
      {
        error:
          'Google Maps Platform API key is not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local.',
        places: [],
      },
      { status: 503 }
    );
  }

  let body: PlacesSearchRequestBody = {};
  try {
    body = (await request.json()) as PlacesSearchRequestBody;
  } catch {
    body = {};
  }

  const rawQuery = typeof body.textQuery === 'string' ? body.textQuery.trim() : '';
  const textQuery = rawQuery.length > 0 ? rawQuery : 'retail stores in Austin, TX';
  const maxResultCount =
    typeof body.maxResultCount === 'number' &&
    body.maxResultCount >= 1 &&
    body.maxResultCount <= 10
      ? Math.floor(body.maxResultCount)
      : 6;

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
        body: JSON.stringify({
          textQuery,
          maxResultCount,
          languageCode: 'en',
          regionCode: 'US',
          locationBias: {
            circle: {
              center: { latitude: 30.2672, longitude: -97.7431 },
              radius: 18000.0,
            },
          },
        }),
        cache: 'no-store',
      }
    );

    const payload = (await upstreamRes.json()) as {
      places?: GooglePlaceItem[];
      error?: { message?: string };
    };

    if (!upstreamRes.ok) {
      return NextResponse.json(
        {
          error: payload.error?.message || 'Places API (New) Text Search failed.',
          places: [],
        },
        { status: upstreamRes.status }
      );
    }

    const places: AuditSite[] = (payload.places ?? [])
      .filter(
        (p) =>
          p.id &&
          typeof p.location?.latitude === 'number' &&
          typeof p.location?.longitude === 'number'
      )
      .map((p) => ({
        id: p.id as string,
        displayName: p.displayName?.text || 'Unnamed Austin Site',
        formattedAddress: p.formattedAddress || 'Austin, TX',
        location: {
          lat: p.location!.latitude as number,
          lng: p.location!.longitude as number,
        },
        primaryType: p.primaryTypeDisplayName?.text || 'Retail Site',
        source: 'places-search',
      }));

    return NextResponse.json({ places, query: textQuery });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unexpected error calling Places API (New).';
    return NextResponse.json({ error: message, places: [] }, { status: 500 });
  }
}
