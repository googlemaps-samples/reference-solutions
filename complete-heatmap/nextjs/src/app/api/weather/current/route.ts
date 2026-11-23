import { NextRequest, NextResponse } from 'next/server';
import {
  getServerMapsApiKey,
  GMP_SOLUTION_ID,
  parseCoordinateParam,
} from '@/lib/server/gmp';
import type { WeatherTelemetry } from '@/types/hazard';

export async function GET(request: NextRequest) {
  const apiKey = getServerMapsApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key is not configured on the server.' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const lat = parseCoordinateParam(searchParams.get('lat'), -90, 90);
  const lng = parseCoordinateParam(searchParams.get('lng'), -180, 180);

  if (lat === null || lng === null) {
    return NextResponse.json(
      { error: 'Valid lat and lng query parameters are required.' },
      { status: 400 }
    );
  }

  const upstreamUrl = new URL('https://weather.googleapis.com/v1/currentConditions:lookup');
  upstreamUrl.searchParams.set('key', apiKey);
  upstreamUrl.searchParams.set('location.latitude', String(lat));
  upstreamUrl.searchParams.set('location.longitude', String(lng));
  upstreamUrl.searchParams.set('unitsSystem', 'METRIC');

  try {
    const upstreamResponse = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: {
        'X-Goog-Maps-Solution-ID': GMP_SOLUTION_ID,
      },
      cache: 'no-store',
    });

    const data = await upstreamResponse.json();

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        {
          error:
            data?.error?.message ||
            `Weather API responded with status ${upstreamResponse.status}`,
        },
        { status: upstreamResponse.status }
      );
    }

    const weather: WeatherTelemetry = {
      conditionText: data.weatherCondition?.description?.text ?? 'Unknown',
      conditionType: data.weatherCondition?.type ?? 'UNKNOWN',
      iconBaseUri: data.weatherCondition?.iconBaseUri,
      temperatureC:
        typeof data.temperature?.degrees === 'number'
          ? Number(data.temperature.degrees.toFixed(1))
          : null,
      windSpeedKmh:
        typeof data.wind?.speed?.value === 'number'
          ? Math.round(data.wind.speed.value)
          : null,
      windGustKmh:
        typeof data.wind?.gust?.value === 'number'
          ? Math.round(data.wind.gust.value)
          : null,
      windCardinal: data.wind?.direction?.cardinal ?? null,
      precipitationPercent:
        typeof data.precipitation?.probability?.percent === 'number'
          ? data.precipitation.probability.percent
          : null,
      precipitationQpfMm:
        typeof data.precipitation?.qpf?.quantity === 'number'
          ? Number(data.precipitation.qpf.quantity.toFixed(1))
          : null,
      thunderstormProbability:
        typeof data.thunderstormProbability === 'number'
          ? data.thunderstormProbability
          : null,
      relativeHumidity:
        typeof data.relativeHumidity === 'number' ? data.relativeHumidity : null,
      observedAt: data.currentTime,
    };

    return NextResponse.json({ weather });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Failed to contact Weather API.',
      },
      { status: 502 }
    );
  }
}
