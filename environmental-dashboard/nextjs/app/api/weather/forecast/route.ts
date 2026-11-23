import { NextRequest, NextResponse } from 'next/server';
import { getServerGmpApiKey, missingKeyResponse, parseCoordinates, proxyGmpJson } from '@/lib/gmp-server';

const WEATHER_FORECAST_FIELD_MASK = 'forecastDays,timeZone';

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
  const daysRaw = Number(searchParams.get('days') ?? '5');
  const days = Number.isFinite(daysRaw) ? Math.min(10, Math.max(1, Math.round(daysRaw))) : 5;

  const upstreamUrl = new URL('https://weather.googleapis.com/v1/forecast/days:lookup');
  upstreamUrl.searchParams.set('location.latitude', String(coords.lat));
  upstreamUrl.searchParams.set('location.longitude', String(coords.lng));
  upstreamUrl.searchParams.set('days', String(days));
  upstreamUrl.searchParams.set('pageSize', String(days));
  upstreamUrl.searchParams.set('unitsSystem', unitsSystem);
  upstreamUrl.searchParams.set('languageCode', 'en');

  try {
    const upstreamRes = await proxyGmpJson({
      url: upstreamUrl.toString(),
      method: 'GET',
      apiKey,
      fieldMask: WEATHER_FORECAST_FIELD_MASK,
    });

    const data = await upstreamRes.json();
    if (upstreamRes.status === 404) {
      return NextResponse.json({ forecastDays: [] }, { status: 200 });
    }
    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: data?.error?.message ?? 'Weather daily forecast lookup failed.' },
        { status: upstreamRes.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Weather forecast proxy error:', err);
    return NextResponse.json({ error: 'Unable to reach Weather API.' }, { status: 502 });
  }
}
