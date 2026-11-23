import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

let configuredKey: string | null = null;

export function getApiKey(): string {
  return (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
}

export function ensureMapsOptions(apiKey: string): void {
  if (configuredKey === apiKey) {
    return;
  }
  setOptions({
    key: apiKey,
    v: 'weekly',
    language: 'en-US',
    region: 'US',
  });
  configuredKey = apiKey;
}

export async function loadAllLogisticsLibraries(apiKey: string) {
  ensureMapsOptions(apiKey);
  const [coreLib, mapsLib, markerLib, placesLib, routesLib, geometryLib] =
    await Promise.all([
      importLibrary('core'),
      importLibrary('maps'),
      importLibrary('marker'),
      importLibrary('places'),
      importLibrary('routes'),
      importLibrary('geometry'),
    ]);

  return {
    coreLib,
    mapsLib,
    markerLib,
    placesLib,
    routesLib,
    geometryLib,
  };
}
