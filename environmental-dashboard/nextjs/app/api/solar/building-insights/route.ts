import { NextRequest, NextResponse } from 'next/server';
import { getServerGmpApiKey, missingKeyResponse, parseCoordinates, proxyGmpJson } from '@/lib/gmp-server';

const SOLAR_FIELD_MASK =
  'name,center,boundingBox,imageryDate,imageryQuality,postalCode,administrativeArea,regionCode,solarPotential';

export async function GET(request: NextRequest) {
  const apiKey = getServerGmpApiKey();
  if (!apiKey) {
    return missingKeyResponse();
  }

  const { searchParams } = new URL(request.url);
  const coords = parseCoordinates(searchParams.get('lat'), searchParams.get('lng'));
  if (!coords) {
    return NextResponse.json(
      { error: 'Valid lat and lng query parameters are required.' },
      { status: 400 }
    );
  }

  const upstreamUrl = new URL('https://solar.googleapis.com/v1/buildingInsights:findClosest');
  upstreamUrl.searchParams.set('location.latitude', String(coords.lat));
  upstreamUrl.searchParams.set('location.longitude', String(coords.lng));
  upstreamUrl.searchParams.set('requiredQuality', 'MEDIUM');

  try {
    const upstreamRes = await proxyGmpJson({
      url: upstreamUrl.toString(),
      method: 'GET',
      apiKey,
      fieldMask: SOLAR_FIELD_MASK,
    });

    const data = await upstreamRes.json();

    if (upstreamRes.status === 404) {
      return NextResponse.json(
        {
          covered: false,
          message:
            'No 3D rooftop solar coverage found within 50m of this coordinate. Try clicking directly on a nearby building roof.',
        },
        { status: 200 }
      );
    }

    if (!upstreamRes.ok) {
      return NextResponse.json(
        {
          covered: false,
          error: data?.error?.message ?? 'Solar API building insights lookup failed.',
        },
        { status: upstreamRes.status }
      );
    }

    return NextResponse.json({
      covered: true,
      ...data,
    });
  } catch (err) {
    console.error('Solar buildingInsights proxy error:', err);
    return NextResponse.json({ error: 'Unable to reach Solar API.' }, { status: 502 });
  }
}
