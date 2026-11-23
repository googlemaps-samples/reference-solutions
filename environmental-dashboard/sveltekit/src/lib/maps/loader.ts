import { env } from '$env/dynamic/public';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

let configured = false;

export function getPublicApiKey(): string {
  const key = (env.PUBLIC_GOOGLE_MAPS_API_KEY || '').trim();
  if (!key || key === 'your_google_maps_api_key_here') {
    return '';
  }
  return key;
}

export function ensureMapsLoaderConfigured(): boolean {
  const apiKey = getPublicApiKey();
  if (!apiKey) {
    return false;
  }

  if (!configured) {
    setOptions({
      key: apiKey,
      v: 'weekly',
      mapIds: ['DEMO_MAP_ID'],
      language: 'en',
      region: 'US'
    });
    configured = true;
  }

  return true;
}

export { importLibrary };
