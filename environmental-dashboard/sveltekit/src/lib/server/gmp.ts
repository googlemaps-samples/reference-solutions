import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';

export const PHOENIX_SEED = {
  name: 'Phoenix City Hall',
  address: '200 W Washington St, Phoenix, AZ 85003, USA',
  lat: 33.4484,
  lng: -112.074,
  query: 'Phoenix City Hall, Phoenix, AZ'
} as const;

export function getServerApiKey(): string {
  const privateKey = (privateEnv as Record<string, string | undefined>).GOOGLE_MAPS_API_KEY;
  const publicKey = publicEnv.PUBLIC_GOOGLE_MAPS_API_KEY;
  const candidate = (privateKey || publicKey || '').trim();
  if (!candidate || candidate === 'your_google_maps_api_key_here') {
    return '';
  }
  return candidate;
}

export function missingKeyResponse() {
  return json(
    {
      error:
        'PUBLIC_GOOGLE_MAPS_API_KEY is not configured. Add a valid Google Maps Platform API key or Maps Demo Key to your .env file.',
      missingKey: true
    },
    { status: 503 }
  );
}

export function parseCoordinates(
  latParam: string | number | null | undefined,
  lngParam: string | number | null | undefined
): { lat: number; lng: number } | null {
  const lat = typeof latParam === 'number' ? latParam : Number(latParam);
  const lng = typeof lngParam === 'number' ? lngParam : Number(lngParam);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null;
  }

  return { lat, lng };
}

export function extractErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (obj.error && typeof obj.error === 'object') {
      const errObj = obj.error as Record<string, unknown>;
      if (typeof errObj.message === 'string' && errObj.message.trim()) {
        return errObj.message;
      }
    }
    if (typeof obj.message === 'string' && obj.message.trim()) {
      return obj.message;
    }
  }
  return fallback;
}
