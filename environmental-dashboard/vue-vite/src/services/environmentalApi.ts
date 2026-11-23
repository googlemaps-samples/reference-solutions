import type {
  AirQualityResponse,
  CurrentWeatherResponse,
  DailyForecastResponse,
  PollenForecastResponse,
  RgbColor,
  SolarBuildingInsights,
  SolarFetchResult,
  UnitsSystem,
} from '../types/environment'

export const PHOENIX_SEED = {
  lat: 33.4484,
  lng: -112.074,
  zoom: 16,
  query: 'Phoenix City Hall, Phoenix, AZ',
} as const

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } }
    if (body?.error?.message) {
      return body.error.message
    }
  } catch {
    // Ignore non-JSON error body
  }
  return `Request failed with HTTP ${response.status}`
}

export async function fetchCurrentWeather(
  apiKey: string,
  lat: number,
  lng: number,
  unitsSystem: UnitsSystem,
  signal?: AbortSignal,
): Promise<CurrentWeatherResponse> {
  const url = new URL('https://weather.googleapis.com/v1/currentConditions:lookup')
  url.searchParams.set('key', apiKey)
  url.searchParams.set('location.latitude', String(lat))
  url.searchParams.set('location.longitude', String(lng))
  url.searchParams.set('unitsSystem', unitsSystem)
  url.searchParams.set('languageCode', 'en')

  const response = await fetch(url.toString(), { signal })
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }
  return (await response.json()) as CurrentWeatherResponse
}

export async function fetchDailyForecast(
  apiKey: string,
  lat: number,
  lng: number,
  unitsSystem: UnitsSystem,
  signal?: AbortSignal,
): Promise<DailyForecastResponse> {
  const url = new URL('https://weather.googleapis.com/v1/forecast/days:lookup')
  url.searchParams.set('key', apiKey)
  url.searchParams.set('location.latitude', String(lat))
  url.searchParams.set('location.longitude', String(lng))
  url.searchParams.set('days', '5')
  url.searchParams.set('pageSize', '5')
  url.searchParams.set('unitsSystem', unitsSystem)
  url.searchParams.set('languageCode', 'en')

  const response = await fetch(url.toString(), { signal })
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }
  return (await response.json()) as DailyForecastResponse
}

export async function fetchAirQuality(
  apiKey: string,
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<AirQualityResponse> {
  const url = `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${encodeURIComponent(apiKey)}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      universalAqi: true,
      location: {
        latitude: lat,
        longitude: lng,
      },
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
  })

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }
  return (await response.json()) as AirQualityResponse
}

export async function fetchPollenForecast(
  apiKey: string,
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<PollenForecastResponse> {
  const url = new URL('https://pollen.googleapis.com/v1/forecast:lookup')
  url.searchParams.set('key', apiKey)
  url.searchParams.set('location.latitude', String(lat))
  url.searchParams.set('location.longitude', String(lng))
  url.searchParams.set('days', '3')
  url.searchParams.set('plantsDescription', 'true')
  url.searchParams.set('languageCode', 'en')

  const response = await fetch(url.toString(), { signal })
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response))
  }
  return (await response.json()) as PollenForecastResponse
}

export async function fetchSolarBuildingInsights(
  apiKey: string,
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<SolarFetchResult> {
  const url = new URL('https://solar.googleapis.com/v1/buildingInsights:findClosest')
  url.searchParams.set('key', apiKey)
  url.searchParams.set('location.latitude', String(lat))
  url.searchParams.set('location.longitude', String(lng))
  url.searchParams.set('requiredQuality', 'MEDIUM')

  const response = await fetch(url.toString(), { signal })
  if (response.status === 404) {
    return {
      status: 'non-coverage',
      data: null,
      message: 'No Solar API building footprint found within 50m of these coordinates.',
    }
  }
  if (!response.ok) {
    return {
      status: 'error',
      data: null,
      message: await parseErrorMessage(response),
    }
  }

  const data = (await response.json()) as SolarBuildingInsights
  return {
    status: 'ok',
    data,
  }
}

export function formatRgbColor(color?: RgbColor, fallback = '#16a34a'): string {
  if (!color) return fallback
  const rRaw = color.red ?? 0
  const gRaw = color.green ?? 0
  const bRaw = color.blue ?? 0
  const isNormalized = Math.max(rRaw, gRaw, bRaw) <= 1
  const r = Math.round(isNormalized ? rRaw * 255 : rRaw)
  const g = Math.round(isNormalized ? gRaw * 255 : gRaw)
  const b = Math.round(isNormalized ? bRaw * 255 : bRaw)
  return `rgb(${r}, ${g}, ${b})`
}
