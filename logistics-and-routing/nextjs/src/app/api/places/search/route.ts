import { NextRequest } from 'next/server';
import {
  getServerGoogleMapsApiKey,
  jsonWithSecurityHeaders,
} from '@/lib/server-gmp';
import { DALLAS_CENTER, SEED_PLACES_QUERY } from '@/lib/fleet-data';

interface PlacesSearchRequestBody {
  textQuery?: string;
  maxResultCount?: number;
}

interface GooglePlaceItem {
  id?: string;
  displayName?: { text?: string; languageCode?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
}

export async function POST(request: NextRequest) {
  const apiKey = getServerGoogleMapsApiKey();
  if (!apiKey) {
    return jsonWithSecurityHeaders(
      {
        error:
          'Google Maps API key is not configured on the server. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local.',
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

  const textQuery =
    typeof body.textQuery === 'string' && body.textQuery.trim().length > 0
      ? body.textQuery.trim().slice(0, 160)
      : SEED_PLACES_QUERY;

  const maxResultCount = Math.min(
    Math.max(Number(body.maxResultCount) || 6, 1),
    10
  );

  try {
    const upstream = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'places.id,places.displayName,places.formattedAddress,places.location',
          'X-Goog-Maps-Solution-ID': 'gmp_git_agentsamples_v1.0.0',
        },
        body: JSON.stringify({
          textQuery,
          maxResultCount,
          locationBias: {
            circle: {
              center: {
                latitude: DALLAS_CENTER.lat,
                longitude: DALLAS_CENTER.lng,
              },
              radius: 28000,
            },
          },
          languageCode: 'en',
          regionCode: 'US',
        }),
        cache: 'no-store',
      }
    );

    const payload = (await upstream.json()) as {
      places?: GooglePlaceItem[];
      error?: { message?: string; status?: string };
    };

    if (!upstream.ok) {
      return jsonWithSecurityHeaders(
        {
          error:
            payload.error?.message ||
            `Places API searchText returned HTTP ${upstream.status}`,
          places: [],
        },
        { status: upstream.status }
      );
    }

    const places = (payload.places ?? [])
      .filter(
        (p) =>
          p.id &&
          typeof p.location?.latitude === 'number' &&
          typeof p.location?.longitude === 'number'
      )
      .map((p) => ({
        id: p.id as string,
        name: p.displayName?.text || 'Dallas Logistics Facility',
        formattedAddress: p.formattedAddress || 'Dallas, TX',
        location: {
          lat: p.location!.latitude as number,
          lng: p.location!.longitude as number,
        },
      }));

    return jsonWithSecurityHeaders({ places });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to query Places API (New)';
    return jsonWithSecurityHeaders(
      { error: message, places: [] },
      { status: 502 }
    );
  }
}
