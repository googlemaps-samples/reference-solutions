import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

let configured = false;
let librariesPromise: Promise<LoadedGmpLibraries> | null = null;

export interface LoadedGmpLibraries {
  core: google.maps.CoreLibrary;
  maps: google.maps.MapsLibrary;
  marker: google.maps.MarkerLibrary;
  places: google.maps.PlacesLibrary;
  routes: google.maps.RoutesLibrary;
  geocoding: google.maps.GeocodingLibrary;
  elevation: google.maps.ElevationLibrary;
  geometry: google.maps.GeometryLibrary;
}

export function ensureGmpConfigured(apiKey: string): void {
  if (configured) return;
  setOptions({
    key: apiKey,
    v: 'weekly',
    language: 'en',
    region: 'US',
    mapIds: ['DEMO_MAP_ID'],
    solutionChannel: 'gmp_git_agentsamples_v1.0.0',
  });
  configured = true;
}

export function loadGmpLibraries(apiKey: string): Promise<LoadedGmpLibraries> {
  ensureGmpConfigured(apiKey);
  if (!librariesPromise) {
    librariesPromise = Promise.all([
      importLibrary('core'),
      importLibrary('maps'),
      importLibrary('marker'),
      importLibrary('places'),
      importLibrary('routes'),
      importLibrary('geocoding'),
      importLibrary('elevation'),
      importLibrary('geometry'),
    ]).then(([core, maps, marker, places, routes, geocoding, elevation, geometry]) => ({
      core,
      maps,
      marker,
      places,
      routes,
      geocoding,
      elevation,
      geometry,
    }));
  }
  return librariesPromise;
}
