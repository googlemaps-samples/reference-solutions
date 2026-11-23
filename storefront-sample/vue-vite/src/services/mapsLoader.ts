import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

let configured = false;

export interface LoadedMapsLibraries {
  core: google.maps.CoreLibrary;
  maps: google.maps.MapsLibrary;
  marker: google.maps.MarkerLibrary;
  places: google.maps.PlacesLibrary;
  routes: google.maps.RoutesLibrary;
  streetView: google.maps.StreetViewLibrary;
  geometry: google.maps.GeometryLibrary;
}

export function getConfiguredApiKey(): string | null {
  const raw = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'your_google_maps_api_key_here') return null;
  return trimmed;
}

export async function loadGoogleMapsLibraries(): Promise<LoadedMapsLibraries> {
  const apiKey = getConfiguredApiKey();
  if (!apiKey) {
    throw new Error(
      'Missing VITE_GOOGLE_MAPS_API_KEY. Copy .env.example to .env.local and add a valid Google Maps Platform API key or Maps Demo Key.'
    );
  }

  if (!configured) {
    setOptions({
      key: apiKey,
      v: 'weekly',
      language: 'en',
      region: 'US',
    });
    configured = true;
  }

  const [core, maps, marker, places, routes, streetView, geometry] =
    await Promise.all([
      importLibrary('core'),
      importLibrary('maps'),
      importLibrary('marker'),
      importLibrary('places'),
      importLibrary('routes'),
      importLibrary('streetView'),
      importLibrary('geometry'),
    ]);

  return {
    core,
    maps,
    marker,
    places,
    routes,
    streetView,
    geometry,
  };
}
