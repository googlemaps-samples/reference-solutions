import type {
  AirQualityResponse,
  EndpointResult,
  EnvironmentalSnapshot,
  LatLngPoint,
  PollenForecastResponse,
  SolarBuildingInsightsResponse,
  UnitsSystem,
  WeatherCurrentResponse,
  WeatherForecastResponse,
} from '../types/environmental';

interface ErrorPayload {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const json = (await response.json()) as ErrorPayload;
    if (json?.error?.message) {
      return json.error.message;
    }
  } catch {
    // Ignore non-JSON error payloads
  }
  return `HTTP ${response.status} (${response.statusText || 'Request failed'})`;
}

export async function fetchWeatherCurrent(
  coords: LatLngPoint,
  units: UnitsSystem,
  apiKey: string,
  signal?: AbortSignal
): Promise<EndpointResult<WeatherCurrentResponse>> {
  try {
    const params = new URLSearchParams({
      key: apiKey,
      'location.latitude': String(coords.lat),
      'location.longitude': String(coords.lng),
      unitsSystem: units,
      languageCode: 'en',
    });
    const res = await fetch(
      `https://weather.googleapis.com/v1/currentConditions:lookup?${params.toString()}`,
      { signal }
    );
    if (!res.ok) {
      if (res.status === 404) {
        return {
          status: 'non-coverage',
          message: 'Weather observations are not available for these coordinates.',
        };
      }
      return { status: 'error', message: await parseErrorMessage(res) };
    }
    const data = (await res.json()) as WeatherCurrentResponse;
    return { status: 'ok', data };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Unable to load current weather.',
    };
  }
}

export async function fetchWeatherForecast(
  coords: LatLngPoint,
  units: UnitsSystem,
  apiKey: string,
  signal?: AbortSignal
): Promise<EndpointResult<WeatherForecastResponse>> {
  try {
    const params = new URLSearchParams({
      key: apiKey,
      'location.latitude': String(coords.lat),
      'location.longitude': String(coords.lng),
      unitsSystem: units,
      days: '5',
      pageSize: '5',
      languageCode: 'en',
    });
    const res = await fetch(
      `https://weather.googleapis.com/v1/forecast/days:lookup?${params.toString()}`,
      { signal }
    );
    if (!res.ok) {
      if (res.status === 404) {
        return {
          status: 'non-coverage',
          message: 'Daily weather forecast is not available for these coordinates.',
        };
      }
      return { status: 'error', message: await parseErrorMessage(res) };
    }
    const data = (await res.json()) as WeatherForecastResponse;
    return { status: 'ok', data };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Unable to load weather forecast.',
    };
  }
}

export async function fetchAirQualityCurrent(
  coords: LatLngPoint,
  apiKey: string,
  signal?: AbortSignal
): Promise<EndpointResult<AirQualityResponse>> {
  try {
    const res = await fetch(
      `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
        }),
        signal,
      }
    );
    if (!res.ok) {
      if (res.status === 404 || res.status === 400) {
        return {
          status: 'non-coverage',
          message: 'Air quality monitoring data is outside coverage at these coordinates.',
        };
      }
      return { status: 'error', message: await parseErrorMessage(res) };
    }
    const data = (await res.json()) as AirQualityResponse;
    return { status: 'ok', data };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Unable to load air quality data.',
    };
  }
}

export async function fetchPollenForecast(
  coords: LatLngPoint,
  apiKey: string,
  signal?: AbortSignal
): Promise<EndpointResult<PollenForecastResponse>> {
  try {
    const params = new URLSearchParams({
      key: apiKey,
      'location.latitude': String(coords.lat),
      'location.longitude': String(coords.lng),
      days: '3',
      plantsDescription: 'true',
      languageCode: 'en',
    });
    const res = await fetch(
      `https://pollen.googleapis.com/v1/forecast:lookup?${params.toString()}`,
      { signal }
    );
    if (!res.ok) {
      if (res.status === 404 || res.status === 400) {
        return {
          status: 'non-coverage',
          message: 'Pollen forecast is unavailable for this location (e.g. ocean or uncovered zone).',
        };
      }
      return { status: 'error', message: await parseErrorMessage(res) };
    }
    const data = (await res.json()) as PollenForecastResponse;
    return { status: 'ok', data };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Unable to load pollen forecast.',
    };
  }
}

export async function fetchSolarBuildingInsights(
  coords: LatLngPoint,
  apiKey: string,
  signal?: AbortSignal
): Promise<EndpointResult<SolarBuildingInsightsResponse>> {
  try {
    const params = new URLSearchParams({
      key: apiKey,
      'location.latitude': String(coords.lat),
      'location.longitude': String(coords.lng),
      requiredQuality: 'MEDIUM',
    });
    const res = await fetch(
      `https://solar.googleapis.com/v1/buildingInsights:findClosest?${params.toString()}`,
      { signal }
    );
    if (!res.ok) {
      if (res.status === 404) {
        return {
          status: 'non-coverage',
          message:
            'No building solar insights found within 50m of these coordinates, or imagery is outside Solar API coverage.',
        };
      }
      return { status: 'error', message: await parseErrorMessage(res) };
    }
    const data = (await res.json()) as SolarBuildingInsightsResponse;
    return { status: 'ok', data };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Unable to load rooftop solar insights.',
    };
  }
}

export async function fetchAllEnvironmentalData(
  coords: LatLngPoint,
  units: UnitsSystem,
  apiKey: string,
  signal?: AbortSignal
): Promise<EnvironmentalSnapshot> {
  const [weatherCurrent, weatherForecast, airQuality, pollen, solar] =
    await Promise.all([
      fetchWeatherCurrent(coords, units, apiKey, signal),
      fetchWeatherForecast(coords, units, apiKey, signal),
      fetchAirQualityCurrent(coords, apiKey, signal),
      fetchPollenForecast(coords, apiKey, signal),
      fetchSolarBuildingInsights(coords, apiKey, signal),
    ]);

  return {
    weatherCurrent,
    weatherForecast,
    airQuality,
    pollen,
    solar,
  };
}
