import { NextRequest, NextResponse } from 'next/server';
import { getServerApiKey } from '@/lib/gmp-server';
import type { RawGooglePlace } from '@/types/locator';

const DETAILS_FIELD_MASK =
  'id,displayName,formattedAddress,location,regularOpeningHours.weekdayDescriptions,rating,userRatingCount,nationalPhoneNumber';

export async function GET(request: NextRequest) {
  const apiKey = getServerApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key is not configured on the server.' },
      { status: 503 }
    );
  }

  const placeId = request.nextUrl.searchParams.get('placeId')?.trim() ?? '';
  if (!placeId || !/^[A-Za-z0-9_-]{4,128}$/.test(placeId)) {
    return NextResponse.json({ error: 'Valid placeId query parameter is required.' }, { status: 400 });
  }

  const sessionToken = request.nextUrl.searchParams.get('sessionToken')?.trim() ?? '';
  const upstreamUrl = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
  upstreamUrl.searchParams.set('languageCode', 'en');
  if (sessionToken && /^[A-Za-z0-9_-]{1,36}$/.test(sessionToken)) {
    upstreamUrl.searchParams.set('sessionToken', sessionToken);
  }

  try {
    const upstream = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': DETAILS_FIELD_MASK,
      },
      cache: 'no-store',
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return NextResponse.json(
        { error: `Place Details failed (${upstream.status}): ${errText}` },
        { status: 502 }
      );
    }

    const place = (await upstream.json()) as RawGooglePlace;
    const lat = place.location?.latitude;
    const lng = place.location?.longitude;

    return NextResponse.json({
      place: {
        id: place.id ?? placeId,
        name: place.displayName?.text ?? place.formattedAddress ?? 'Selected Location',
        formattedAddress: place.formattedAddress ?? '',
        location:
          typeof lat === 'number' && typeof lng === 'number' ? { lat, lng } : null,
        rating: place.rating,
        userRatingCount: place.userRatingCount,
        weekdayDescriptions: place.regularOpeningHours?.weekdayDescriptions ?? [],
        nationalPhoneNumber: place.nationalPhoneNumber,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch Place Details.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
