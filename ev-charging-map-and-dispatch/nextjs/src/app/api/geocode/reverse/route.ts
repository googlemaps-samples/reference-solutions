import { NextRequest, NextResponse } from 'next/server';
import { getServerMapsApiKey, isValidLatLng } from '@/lib/server-maps';

interface GeocodeApiResponse {
  status?: string;
  error_message?: string;
  results?: Array<{
    formatted_address?: string;
    place_id?: string;
  }>;
}

function buildShortLabel(formattedAddress: string): string {
  const parts = formattedAddress.split(',').map((s) => s.trim());
  if (parts.length >= 2) {
    return `${parts[0]}, ${parts[1]}`;
  }
  return formattedAddress;
}

export async function GET(request: NextRequest) {
  const apiKey = getServerMapsApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key is not configured on the server.' },
      { status: 500 }
    );
  }

  const latParam = request.nextUrl.searchParams.get('lat');
  const lngParam = request.nextUrl.searchParams.get('lng');
  const lat = latParam !== null ? Number(latParam) : NaN;
  const lng = lngParam !== null ? Number(lngParam) : NaN;

  if (!isValidLatLng(lat, lng)) {
    return NextResponse.json(
      { error: 'Valid lat and lng query parameters are required.' },
      { status: 400 }
    );
  }

  const fetchGeocode = async (withResultType: boolean) => {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${lat},${lng}`);
    if (withResultType) {
      url.searchParams.set('result_type', 'street_address|premise|route');
    }
    url.searchParams.set('key', apiKey);

    const res = await fetch(url.toString(), { cache: 'no-store' });
    const data = (await res.json()) as GeocodeApiResponse;
    return { status: res.status, data };
  };

  try {
    let attempt = await fetchGeocode(true);
    if (
      attempt.status === 200 &&
      attempt.data.status === 'ZERO_RESULTS'
    ) {
      attempt = await fetchGeocode(false);
    }

    if (attempt.status !== 200 || attempt.data.status === 'REQUEST_DENIED') {
      return NextResponse.json(
        {
          error:
            attempt.data.error_message ||
            `Reverse geocoding failed (${attempt.data.status || attempt.status})`,
        },
        { status: attempt.status === 200 ? 403 : attempt.status }
      );
    }

    const first = attempt.data.results?.[0];
    if (!first?.formatted_address) {
      const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      return NextResponse.json({
        formattedAddress: fallback,
        shortLabel: fallback,
      });
    }

    return NextResponse.json({
      formattedAddress: first.formatted_address,
      shortLabel: buildShortLabel(first.formatted_address),
      placeId: first.place_id,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Unexpected error calling Geocoding API.',
      },
      { status: 502 }
    );
  }
}
