import { NextRequest, NextResponse } from 'next/server';
import { getServerGmpApiKey, missingKeyResponse, parseCoordinates, proxyGmpJson } from '@/lib/gmp-server';

const AIR_QUALITY_FIELD_MASK = 'dateTime,regionCode,indexes,pollutants,healthRecommendations';

export async function POST(request: NextRequest) {
  const apiKey = getServerGmpApiKey();
  if (!apiKey) {
    return missingKeyResponse();
  }

  let body: { lat?: number; lng?: number } | null = null;
  try {
    body = (await request.json()) as { lat?: number; lng?: number };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const coords = parseCoordinates(body?.lat, body?.lng);
  if (!coords) {
    return NextResponse.json({ error: 'Valid lat and lng coordinates are required.' }, { status: 400 });
  }

  try {
    const upstreamRes = await proxyGmpJson({
      url: 'https://airquality.googleapis.com/v1/currentConditions:lookup',
      method: 'POST',
      apiKey,
      fieldMask: AIR_QUALITY_FIELD_MASK,
      body: {
        location: {
          latitude: coords.lat,
          longitude: coords.lng,
        },
        universalAqi: true,
        extraComputations: [
          'HEALTH_RECOMMENDATIONS',
          'DOMINANT_POLLUTANT_CONCENTRATION',
          'POLLUTANT_CONCENTRATION',
          'LOCAL_AQI',
          'POLLUTANT_ADDITIONAL_INFO',
        ],
        languageCode: 'en',
      },
    });

    const data = await upstreamRes.json();
    if (upstreamRes.status === 404) {
      return NextResponse.json({ indexes: [], pollutants: [] }, { status: 200 });
    }
    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: data?.error?.message ?? 'Air Quality lookup failed.' },
        { status: upstreamRes.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Air Quality proxy error:', err);
    return NextResponse.json({ error: 'Unable to reach Air Quality API.' }, { status: 502 });
  }
}
