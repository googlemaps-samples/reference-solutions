import { NextRequest, NextResponse } from 'next/server';
import { NYC_CENTER, normalizePlaceToBranch } from '@/lib/classify';
import { getServerApiKey, isValidLatLng } from '@/lib/gmp-server';
import type { Branch, BranchType, RawGooglePlace } from '@/types/locator';

const SEARCH_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.primaryType,places.rating,places.userRatingCount,places.regularOpeningHours.weekdayDescriptions,places.businessStatus';

interface SearchQuerySpec {
  textQuery: string;
  categoryHint?: BranchType;
  maxResultCount?: number;
}

const DEFAULT_NYC_QUERIES: SearchQuerySpec[] = [
  {
    textQuery: 'flagship retail store in Manhattan, New York',
    categoryHint: 'flagship',
    maxResultCount: 10,
  },
  {
    textQuery: 'espresso coffee kiosk cafe in Manhattan, New York',
    categoryHint: 'kiosk',
    maxResultCount: 10,
  },
  {
    textQuery: '24 hour ATM bank in Manhattan, New York',
    categoryHint: 'atm',
    maxResultCount: 10,
  },
];

export async function POST(request: NextRequest) {
  const apiKey = getServerApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key is not configured on the server.' },
      { status: 503 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const center = isValidLatLng(body.center) ? body.center : NYC_CENTER;
  const radiusMeters =
    typeof body.radiusMeters === 'number' &&
    body.radiusMeters >= 500 &&
    body.radiusMeters <= 50000
      ? body.radiusMeters
      : 6500;

  let queries: SearchQuerySpec[] = DEFAULT_NYC_QUERIES;
  if (Array.isArray(body.queries) && body.queries.length > 0) {
    queries = body.queries
      .filter(
        (q): q is SearchQuerySpec =>
          Boolean(q && typeof q === 'object' && typeof (q as SearchQuerySpec).textQuery === 'string')
      )
      .slice(0, 4);
  } else if (typeof body.textQuery === 'string' && body.textQuery.trim().length > 0) {
    queries = [
      {
        textQuery: body.textQuery.trim().slice(0, 140),
        maxResultCount: 15,
      },
    ];
  }

  try {
    const results = await Promise.all(
      queries.map(async (spec) => {
        const upstream = await fetch('https://places.googleapis.com/v1/places:searchText', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': SEARCH_FIELD_MASK,
          },
          body: JSON.stringify({
            textQuery: spec.textQuery,
            maxResultCount: Math.min(20, Math.max(1, spec.maxResultCount ?? 10)),
            languageCode: 'en',
            regionCode: 'US',
            locationBias: {
              circle: {
                center: {
                  latitude: center.lat,
                  longitude: center.lng,
                },
                radius: radiusMeters,
              },
            },
          }),
          cache: 'no-store',
        });

        if (!upstream.ok) {
          const errPayload = await upstream.text();
          throw new Error(`Places searchText failed (${upstream.status}): ${errPayload}`);
        }

        const data = (await upstream.json()) as { places?: RawGooglePlace[] };
        return {
          categoryHint: spec.categoryHint,
          places: data.places ?? [],
        };
      })
    );

    const seenIds: Record<string, boolean> = {};
    const branches: Branch[] = [];

    for (const group of results) {
      for (const rawPlace of group.places) {
        const normalized = normalizePlaceToBranch(rawPlace, group.categoryHint);
        if (normalized && !seenIds[normalized.id]) {
          seenIds[normalized.id] = true;
          branches.push(normalized);
        }
      }
    }

    return NextResponse.json({ branches });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to query Places Text Search.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
