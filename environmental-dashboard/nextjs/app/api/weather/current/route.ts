import { NextRequest, NextResponse } from 'next/server';
import { getServerGmpApiKey, missingKeyResponse, parseCoordinates, proxyGmpJson } from '@/lib/gmp-server';

const WEATHER_CURRENT_FIELD_MASK =
  'currentTime,timeZone,weatherCondition,temperature,feelsLikeTemperature,relativeHumidity,uvIndex,wind,precipitation,cloudCover,isDaytime';

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

  const unitsParam = searchParams.get('unitsSystem')?.toUpperCase();
  const unitsSystem = unitsParam === 'METRIC' ? 'METRIC' : 'IMPERIAL';

  const upstreamUrl = new URL('https://weather.googleapis.com/v1/currentConditions:lookup');
  upstreamUrl.searchParams.set('location.latitude', String(coords.lat));
  upstreamUrl.searchParams.set('location.longitude', String(coords.lng));
  upstreamUrl.searchParams.set('unitsSystem', unitsSystem);
  upstreamUrl.searchParams.set('languageCode', 'en');

  try {
    const upstreamRes = await proxyGmpJson({
      url: upstreamUrl.toString(),
      method: 'GET',
      apiKey,
      fieldMask: WEATHER_CURRENT_FIELD_MASK,
    });

    const data = await upstreamRes.json();
    if (upstreamRes.status === 404) {
      return NextResponse.json(
        { error: 'Current weather is unavailable for these coordinates.' },
        { status: 200 }
      );
    }
    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: data?.error?.message ?? 'Weather current conditions lookup failed.' },
        { status: upstreamRes.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Weather current proxy error:', err);
    return NextResponse.json({ error: 'Unable to reach Weather API.' }, { status: 502 });
  }
}
