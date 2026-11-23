import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

export const GMP_ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';

let isConfigured = false;
let librariesPromise: Promise<LoadedMapsLibraries> | null = null;

export interface LoadedMapsLibraries {
  mapsLib: google.maps.MapsLibrary;
  markerLib: google.maps.MarkerLibrary;
  placesLib: google.maps.PlacesLibrary;
  routesLib: google.maps.RoutesLibrary;
  streetViewLib: google.maps.StreetViewLibrary;
  geometryLib: google.maps.GeometryLibrary;
  geocodingLib: google.maps.GeocodingLibrary;
  coreLib: google.maps.CoreLibrary;
}

export function getGoogleMapsApiKey(): string {
  return (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
}

export function hasGoogleMapsApiKey(): boolean {
  const key = getGoogleMapsApiKey();
  return key.length > 0 && key !== 'your_google_maps_api_key_here';
}

export function loadGoogleMapsLibraries(): Promise<LoadedMapsLibraries> {
  if (librariesPromise) {
    return librariesPromise;
  }

  const key = getGoogleMapsApiKey();
  if (!hasGoogleMapsApiKey()) {
    return Promise.reject(
      new Error(
        'Missing VITE_GOOGLE_MAPS_API_KEY. Copy .env.example to .env.local and provide a Google Maps Platform API key or Maps Demo Key.'
      )
    );
  }

  if (!isConfigured) {
    setOptions({
      key,
      v: 'weekly',
      language: 'en',
      region: 'US',
      solutionChannel: 'gmp_git_agentsamples_v1.0.0',
    });
    isConfigured = true;
  }

  librariesPromise = Promise.all([
    importLibrary('maps'),
    importLibrary('marker'),
    importLibrary('places'),
    importLibrary('routes'),
    importLibrary('streetView'),
    importLibrary('geometry'),
    importLibrary('geocoding'),
    importLibrary('core'),
  ]).then(
    ([
      mapsLib,
      markerLib,
      placesLib,
      routesLib,
      streetViewLib,
      geometryLib,
      geocodingLib,
      coreLib,
    ]) => ({
      mapsLib,
      markerLib,
      placesLib,
      routesLib,
      streetViewLib,
      geometryLib,
      geocodingLib,
      coreLib,
    })
  );

  return librariesPromise;
}
