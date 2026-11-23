import { NextRequest, NextResponse } from 'next/server';
import { getServerMapsApiKey, GMP_SOLUTION_ID } from '@/lib/server/gmp';
import { MIAMI_CENTER, SEED_SHELTER_QUERY } from '@/lib/miami-hazards';
import type { ShelterPlace } from '@/types/hazard';

const PLACES_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.businessStatus';

interface RawPlaceResult {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  types?: string[];
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
}

function classifyShelterCategory(
  types: string[],
  name: string
): ShelterPlace['category'] {
  const lowered = name.toLowerCase();
  if (
    types.includes('hospital') ||
    types.includes('medical_center') ||
    lowered.includes('hospital') ||
    lowered.includes('medical') ||
    lowered.includes('health')
  ) {
    return 'Hospital';
  }
  if (
    types.includes('community_center') ||
    lowered.includes('community') ||
    lowered.includes('recreation') ||
    lowered.includes('civic')
  ) {
    return 'Community Center';
  }
  return 'Emergency Shelter';
}

export async function POST(request: NextRequest) {
  const apiKey = getServerMapsApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key is not configured on the server.' },
      { status: 500 }
    );
  }

  let body: {
    textQuery?: string;
    lat?: number;
    lng?: number;
    maxResultCount?: number;
  } = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const textQuery = (body.textQuery ?? SEED_SHELTER_QUERY).trim() || SEED_SHELTER_QUERY;
  const centerLat =
    typeof body.lat === 'number' && Number.isFinite(body.lat) ? body.lat : MIAMI_CENTER.lat;
  const centerLng =
    typeof body.lng === 'number' && Number.isFinite(body.lng) ? body.lng : MIAMI_CENTER.lng;
  const pageSize = Math.min(Math.max(Number(body.maxResultCount) || 12, 1), 20);

  try {
    const upstreamResponse = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': PLACES_FIELD_MASK,
          'X-Goog-Maps-Solution-ID': GMP_SOLUTION_ID,
        },
        body: JSON.stringify({
          textQuery,
          pageSize,
          locationBias: {
            circle: {
              center: {
                latitude: centerLat,
                longitude: centerLng,
              },
              radius: 12000.0,
            },
          },
          languageCode: 'en',
          regionCode: 'US',
        }),
        cache: 'no-store',
      }
    );

    const rawText = await upstreamResponse.text();
    let data: { places?: RawPlaceResult[]; error?: { message?: string } } = {};
    try {
      data = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON returned from Places API (New).' },
        { status: 502 }
      );
    }

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        {
          error:
            data.error?.message ||
            `Places API (New) responded with status ${upstreamResponse.status}`,
        },
        { status: upstreamResponse.status }
      );
    }

    const shelters: ShelterPlace[] = (data.places ?? [])
      .filter(
        (p) =>
          p.id &&
          typeof p.location?.latitude === 'number' &&
          typeof p.location?.longitude === 'number'
      )
      .map((p) => {
        const name = p.displayName?.text ?? 'Unnamed Facility';
        const types = p.types ?? [];
        return {
          id: p.id as string,
          name,
          address: p.formattedAddress ?? 'Miami, FL',
          location: {
            lat: p.location!.latitude as number,
            lng: p.location!.longitude as number,
          },
          types,
          category: classifyShelterCategory(types, name),
          rating: typeof p.rating === 'number' ? p.rating : undefined,
          userRatingCount:
            typeof p.userRatingCount === 'number' ? p.userRatingCount : undefined,
          businessStatus: p.businessStatus,
        };
      });

    return NextResponse.json({ shelters, count: shelters.length });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Failed to contact Places API (New).',
      },
      { status: 502 }
    );
  }
}
