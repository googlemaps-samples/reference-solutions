import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

let isConfigured = false;

export interface LoadedMaps3DModules {
  maps3d: google.maps.Maps3DLibrary;
  marker: google.maps.MarkerLibrary;
  places: google.maps.PlacesLibrary;
  elevation: google.maps.ElevationLibrary;
  core: google.maps.CoreLibrary;
}

export function isValidApiKey(apiKey: string | undefined | null): apiKey is string {
  if (!apiKey) return false;
  const trimmed = apiKey.trim();
  if (!trimmed) return false;
  if (trimmed === 'your_google_maps_api_key_here') return false;
  return true;
}

export async function loadMaps3DLibraries(apiKey: string): Promise<LoadedMaps3DModules> {
  if (typeof window === 'undefined') {
    throw new Error('Google Maps JS API can only be loaded in the browser.');
  }

  if (!isConfigured) {
    setOptions({
      key: apiKey,
      v: 'weekly'
    });
    isConfigured = true;
  }

  const [maps3d, marker, places, elevation, core] = await Promise.all([
    importLibrary('maps3d'),
    importLibrary('marker'),
    importLibrary('places'),
    importLibrary('elevation'),
    importLibrary('core')
  ]);

  return { maps3d, marker, places, elevation, core };
}
