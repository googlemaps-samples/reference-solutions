import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

export const GMP_ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';
export const DEFAULT_MAP_ID = 'DEMO_MAP_ID';

export interface LoadedGoogleMapsLibraries {
  mapsLib: google.maps.MapsLibrary;
  markerLib: google.maps.MarkerLibrary;
  placesLib: google.maps.PlacesLibrary;
  routesLib: google.maps.RoutesLibrary;
  streetViewLib: google.maps.StreetViewLibrary;
  coreLib: google.maps.CoreLibrary;
}

let optionsConfigured = false;
let librariesPromise: Promise<LoadedGoogleMapsLibraries> | null = null;

export function getApiKey(): string {
  return (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
}

export function loadMapsLibraries(): Promise<LoadedGoogleMapsLibraries> {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    return Promise.reject(
      new Error(
        'Missing VITE_GOOGLE_MAPS_API_KEY. Copy .env.example to .env.local and provide a Google Maps Platform API key or Maps Demo Key.'
      )
    );
  }

  if (!optionsConfigured) {
    setOptions({
      key: apiKey,
      v: 'weekly',
      language: 'en',
      region: 'US',
      mapIds: [DEFAULT_MAP_ID],
    });
    optionsConfigured = true;
  }

  if (!librariesPromise) {
    librariesPromise = Promise.all([
      importLibrary('maps'),
      importLibrary('marker'),
      importLibrary('places'),
      importLibrary('routes'),
      importLibrary('streetView'),
      importLibrary('core'),
    ]).then(([mapsLib, markerLib, placesLib, routesLib, streetViewLib, coreLib]) => ({
      mapsLib,
      markerLib,
      placesLib,
      routesLib,
      streetViewLib,
      coreLib,
    }));
  }

  return librariesPromise;
}
