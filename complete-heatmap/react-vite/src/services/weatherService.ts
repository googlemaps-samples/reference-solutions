import type { LatLngPoint, WeatherSnapshot } from '../types/hazard';

interface WeatherApiResponse {
  weatherCondition?: {
    iconBaseUri?: string;
    description?: { text?: string };
    type?: string;
  };
  temperature?: { degrees?: number; unit?: string };
  precipitation?: {
    probability?: { percent?: number; type?: string };
    qpf?: { quantity?: number; unit?: string };
  };
  wind?: {
    direction?: { degrees?: number; cardinal?: string };
    speed?: { value?: number; unit?: string };
    gust?: { value?: number; unit?: string };
  };
  thunderstormProbability?: number;
}

function formatCardinalDirection(cardinal?: string): string {
  if (!cardinal) return 'VRB';
  return cardinal
    .replaceAll('NORTH', 'N')
    .replaceAll('SOUTH', 'S')
    .replaceAll('EAST', 'E')
    .replaceAll('WEST', 'W')
    .replaceAll('_', '');
}

export async function fetchCurrentWeather(
  location: LatLngPoint,
  apiKey: string,
  signal?: AbortSignal
): Promise<WeatherSnapshot> {
  if (!apiKey) {
    return {
      conditionText: 'Weather unavailable',
      conditionType: 'UNAVAILABLE',
      temperatureC: null,
      windSpeedKmh: null,
      windGustKmh: null,
      windCardinal: '--',
      precipPercent: null,
      precipQpfMm: null,
      thunderstormProbability: null,
      unavailableReason: 'API key not configured',
    };
  }

  const params = new URLSearchParams({
    key: apiKey,
    'location.latitude': location.lat.toFixed(6),
    'location.longitude': location.lng.toFixed(6),
    unitsSystem: 'METRIC',
    languageCode: 'en',
  });

  const url = `https://weather.googleapis.com/v1/currentConditions:lookup?${params.toString()}`;

  try {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      return {
        conditionText: 'Live weather unavailable',
        conditionType: 'UNAVAILABLE',
        temperatureC: null,
        windSpeedKmh: null,
        windGustKmh: null,
        windCardinal: '--',
        precipPercent: null,
        precipQpfMm: null,
        thunderstormProbability: null,
        unavailableReason: `Weather API returned HTTP ${response.status}`,
      };
    }

    const data = (await response.json()) as WeatherApiResponse;
    return {
      conditionText: data.weatherCondition?.description?.text ?? 'Current conditions',
      conditionType: data.weatherCondition?.type ?? 'UNKNOWN',
      temperatureC: data.temperature?.degrees ?? null,
      windSpeedKmh: data.wind?.speed?.value ?? null,
      windGustKmh: data.wind?.gust?.value ?? null,
      windCardinal: formatCardinalDirection(data.wind?.direction?.cardinal),
      precipPercent: data.precipitation?.probability?.percent ?? null,
      precipQpfMm: data.precipitation?.qpf?.quantity ?? null,
      thunderstormProbability: data.thunderstormProbability ?? null,
      iconBaseUri: data.weatherCondition?.iconBaseUri,
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    return {
      conditionText: 'Live weather unavailable',
      conditionType: 'UNAVAILABLE',
      temperatureC: null,
      windSpeedKmh: null,
      windGustKmh: null,
      windCardinal: '--',
      precipPercent: null,
      precipQpfMm: null,
      thunderstormProbability: null,
      unavailableReason: 'Network or Weather API access unavailable',
    };
  }
}
