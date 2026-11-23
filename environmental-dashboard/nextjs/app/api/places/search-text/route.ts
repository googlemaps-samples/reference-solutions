import { NextRequest, NextResponse } from 'next/server';
import { getServerGmpApiKey, missingKeyResponse } from '@/lib/gmp-server';

const PLACES_TEXT_SEARCH_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location';

export async function POST(request: NextRequest) {
  const apiKey = getServerGmpApiKey();
  if (!apiKey) {
    return missingKeyResponse();
  }

  let body: { textQuery?: string } | null = null;
  try {
    body = (await request.json()) as { textQuery?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const textQuery = body?.textQuery?.trim();
  if (!textQuery) {
    return NextResponse.json({ error: 'textQuery is required.' }, { status: 400 });
  }

  try {
    const upstreamRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': PLACES_TEXT_SEARCH_FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery,
        maxResultCount: 1,
        languageCode: 'en',
      }),
      cache: 'no-store',
    });

    const data = await upstreamRes.json();
    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: data?.error?.message ?? 'Places Text Search failed.' },
        { status: upstreamRes.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Places searchText proxy error:', err);
    return NextResponse.json({ error: 'Unable to reach Places API (New).' }, { status: 502 });
  }
}
