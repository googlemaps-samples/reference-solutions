import { NextResponse } from 'next/server';

interface GeocodingV4Result {
  formattedAddress?: string;
  placeId?: string;
  location?: { latitude?: number; longitude?: number };
}

const GEOCODE_FIELD_MASK = 'results.formattedAddress,results.placeId,results.location';

export async function GET(request: Request) {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    return NextResponse.json(
      {
        error:
          'Google Maps Platform API key is not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local.',
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get('lat'));
  const lng = Number(searchParams.get('lng'));

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return NextResponse.json(
      { error: 'Valid lat and lng query parameters are required.' },
      { status: 400 }
    );
  }

  const endpoint = `https://geocode.googleapis.com/v4/geocode/location/${encodeURIComponent(
    `${lat},${lng}`
  )}?languageCode=en`;

  try {
    const upstreamRes = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': GEOCODE_FIELD_MASK,
      },
      cache: 'no-store',
    });

    const payload = (await upstreamRes.json()) as {
      results?: GeocodingV4Result[];
      error?: { message?: string };
    };

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: payload.error?.message || 'Geocoding API v4 reverse geocode failed.' },
        { status: upstreamRes.status }
      );
    }

    const first = payload.results?.[0];
    return NextResponse.json({
      formattedAddress:
        first?.formattedAddress || `${lat.toFixed(5)}, ${lng.toFixed(5)} (Austin, TX)`,
      placeId: first?.placeId ?? null,
      location: first?.location ?? { latitude: lat, longitude: lng },
      results: payload.results ?? [],
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unexpected error calling Geocoding API v4.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
