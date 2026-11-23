import { importLibrary } from '@googlemaps/js-api-loader';
import type { WeatherSummary } from '../types/hazard';
import { fetchCurrentWeather } from './weatherService';

export interface EnrichedLocationResult {
  address: string;
  elevationMeters: number | null;
  elevationResolutionMeters: number | null;
  weather: WeatherSummary;
  error: string | null;
}

export async function enrichIncidentLocation(
  lat: number,
  lng: number,
  apiKey: string,
): Promise<EnrichedLocationResult> {
  const location = { lat, lng };

  const geocodePromise = (async (): Promise<string> => {
    const { Geocoder } = await importLibrary('geocoding');
    const geocoder = new Geocoder();
    const response = await geocoder.geocode({ location });
    return response.results?.[0]?.formatted_address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  })();

  const elevationPromise = (async (): Promise<{
    elevation: number | null;
    resolution: number | null;
  }> => {
    const { ElevationService } = await importLibrary('elevation');
    const elevator = new ElevationService();
    const response = await elevator.getElevationForLocations({ locations: [location] });
    const first = response.results?.[0];
    return {
      elevation: typeof first?.elevation === 'number' ? first.elevation : null,
      resolution: typeof first?.resolution === 'number' ? first.resolution : null,
    };
  })();

  const weatherPromise = fetchCurrentWeather(lat, lng, apiKey);

  const [geocodeRes, elevationRes, weatherRes] = await Promise.allSettled([
    geocodePromise,
    elevationPromise,
    weatherPromise,
  ]);

  const address =
    geocodeRes.status === 'fulfilled'
      ? geocodeRes.value
      : `${lat.toFixed(5)}, ${lng.toFixed(5)} (Miami, FL)`;

  const elevationMeters =
    elevationRes.status === 'fulfilled' ? elevationRes.value.elevation : null;
  const elevationResolutionMeters =
    elevationRes.status === 'fulfilled' ? elevationRes.value.resolution : null;

  const weather: WeatherSummary =
    weatherRes.status === 'fulfilled'
      ? weatherRes.value
      : {
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
        };

  const errors: string[] = [];
  if (geocodeRes.status === 'rejected') {
    errors.push('Reverse geocoding unavailable');
  }
  if (elevationRes.status === 'rejected') {
    errors.push('Elevation lookup unavailable');
  }

  return {
    address,
    elevationMeters,
    elevationResolutionMeters,
    weather,
    error: errors.length > 0 ? errors.join(' • ') : null,
  };
}
