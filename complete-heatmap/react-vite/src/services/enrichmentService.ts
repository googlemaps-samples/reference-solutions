import type { FloodZone, LatLngPoint, WeatherSnapshot } from '../types/hazard';
import { fetchCurrentWeather } from './weatherService';

export interface EnrichedLocationResult {
  address: string;
  elevationMeters: number | null;
  weather: WeatherSnapshot;
  insideFloodZoneName: string | null;
}

export function findContainingFloodZone(
  point: LatLngPoint,
  floodZones: FloodZone[],
  geometryLib: google.maps.GeometryLibrary | null
): FloodZone | null {
  if (!geometryLib?.poly) {
    return pointInPolygonsRayCast(point, floodZones);
  }
  const latLng = new google.maps.LatLng(point.lat, point.lng);
  for (const zone of floodZones) {
    const poly = new google.maps.Polygon({ paths: zone.paths });
    if (geometryLib.poly.containsLocation(latLng, poly)) {
      return zone;
    }
  }
  return null;
}

function pointInPolygonsRayCast(point: LatLngPoint, floodZones: FloodZone[]): FloodZone | null {
  for (const zone of floodZones) {
    let inside = false;
    const pts = zone.paths;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].lat;
      const yi = pts[i].lng;
      const xj = pts[j].lat;
      const yj = pts[j].lng;
      const intersect =
        yi > point.lng !== yj > point.lng &&
        point.lat < ((xj - xi) * (point.lng - yi)) / (yj - yi + Number.EPSILON) + xi;
      if (intersect) inside = !inside;
    }
    if (inside) return zone;
  }
  return null;
}

export async function enrichIncidentLocation(params: {
  location: LatLngPoint;
  apiKey: string;
  floodZones: FloodZone[];
  geocodingLib: google.maps.GeocodingLibrary | null;
  elevationLib: google.maps.ElevationLibrary | null;
  geometryLib: google.maps.GeometryLibrary | null;
  signal?: AbortSignal;
}): Promise<EnrichedLocationResult> {
  const { location, apiKey, floodZones, geocodingLib, elevationLib, geometryLib, signal } = params;

  const fallbackAddress = `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)} (Miami, FL)`;

  const geocodePromise = (async (): Promise<string> => {
    if (!geocodingLib?.Geocoder) return fallbackAddress;
    try {
      const geocoder = new geocodingLib.Geocoder();
      const response = await geocoder.geocode({ location });
      return response.results?.[0]?.formatted_address ?? fallbackAddress;
    } catch {
      return fallbackAddress;
    }
  })();

  const elevationPromise = (async (): Promise<number | null> => {
    if (!elevationLib?.ElevationService) return null;
    try {
      const elevator = new elevationLib.ElevationService();
      const response = await elevator.getElevationForLocations({
        locations: [location],
      });
      const val = response.results?.[0]?.elevation;
      return typeof val === 'number' ? Number(val.toFixed(2)) : null;
    } catch {
      return null;
    }
  })();

  const weatherPromise = fetchCurrentWeather(location, apiKey, signal);

  const [address, elevationMeters, weather] = await Promise.all([
    geocodePromise,
    elevationPromise,
    weatherPromise,
  ]);

  const containingZone = findContainingFloodZone(location, floodZones, geometryLib);

  return {
    address,
    elevationMeters,
    weather,
    insideFloodZoneName: containingZone ? containingZone.name : null,
  };
}
