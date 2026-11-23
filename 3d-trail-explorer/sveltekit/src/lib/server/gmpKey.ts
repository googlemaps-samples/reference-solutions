import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

export function resolveServerApiKey(): string | null {
  const candidate =
    publicEnv.PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    privateEnv.GOOGLE_MAPS_API_KEY?.trim() ||
    '';

  if (!candidate || candidate === 'your_google_maps_api_key_here') {
    return null;
  }

  return candidate;
}
