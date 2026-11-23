import type { WeatherSummary } from '../types/hazard';

interface WeatherApiResponse {
  weatherCondition?: {
    description?: { text?: string };
    type?: string;
  };
  temperature?: { degrees?: number };
  wind?: {
    direction?: { cardinal?: string };
    speed?: { value?: number };
    gust?: { value?: number };
  };
  precipitation?: {
    probability?: { percent?: number };
    qpf?: { quantity?: number };
  };
  thunderstormProbability?: number;
  relativeHumidity?: number;
}

export async function fetchCurrentWeather(
  lat: number,
  lng: number,
  apiKey: string,
): Promise<WeatherSummary> {
  if (!apiKey) {
    return {
      conditionText: 'API key missing',
      conditionType: 'UNKNOWN',
      temperatureC: null,
      windSpeedKmh: null,
      windGustKmh: null,
      windCardinal: null,
      precipProbabilityPct: null,
      precipQpfMm: null,
      thunderstormPct: null,
      relativeHumidity: null,
      status: 'unavailable',
      note: 'Configure VITE_GOOGLE_MAPS_API_KEY to fetch live weather.',
    };
  }

  const url = new URL('https://weather.googleapis.com/v1/currentConditions:lookup');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('location.latitude', lat.toFixed(6));
  url.searchParams.set('location.longitude', lng.toFixed(6));
  url.searchParams.set('unitsSystem', 'METRIC');
  url.searchParams.set('languageCode', 'en');

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return {
        conditionText: 'Weather unavailable',
        conditionType: 'UNAVAILABLE',
        temperatureC: null,
        windSpeedKmh: null,
        windGustKmh: null,
        windCardinal: null,
        precipProbabilityPct: null,
        precipQpfMm: null,
        thunderstormPct: null,
        relativeHumidity: null,
        status: 'unavailable',
        note: `Weather API returned HTTP ${response.status}`,
      };
    }

    const data = (await response.json()) as WeatherApiResponse;
    return {
      conditionText: data.weatherCondition?.description?.text ?? 'Current Conditions',
      conditionType: data.weatherCondition?.type ?? 'UNKNOWN',
      temperatureC: data.temperature?.degrees ?? null,
      windSpeedKmh: data.wind?.speed?.value ?? null,
      windGustKmh: data.wind?.gust?.value ?? null,
      windCardinal: data.wind?.direction?.cardinal ?? null,
      precipProbabilityPct: data.precipitation?.probability?.percent ?? null,
      precipQpfMm: data.precipitation?.qpf?.quantity ?? null,
      thunderstormPct: data.thunderstormProbability ?? null,
      relativeHumidity: data.relativeHumidity ?? null,
      status: 'live',
    };
  } catch {
    return {
      conditionText: 'Weather unavailable',
      conditionType: 'UNAVAILABLE',
      temperatureC: null,
      windSpeedKmh: null,
      windGustKmh: null,
      windCardinal: null,
      precipProbabilityPct: null,
      precipQpfMm: null,
      thunderstormPct: null,
      relativeHumidity: null,
      status: 'unavailable',
      note: 'Network or Weather API access unavailable',
    };
  }
}

export function formatCardinalDirection(cardinal: string | null): string {
  if (!cardinal) return '';
  return cardinal
    .replace(/_/g, ' ')
    .replace(/\bNORTH\b/g, 'N')
    .replace(/\bSOUTH\b/g, 'S')
    .replace(/\bEAST\b/g, 'E')
    .replace(/\bWEST\b/g, 'W')
    .replace(/\s+/g, '');
}
