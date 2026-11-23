import { NextResponse } from 'next/server';

export function getServerGmpApiKey(): string | null {
  const key =
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    '';
  if (!key || key === 'your_google_maps_api_key_here') {
    return null;
  }
  return key;
}

export function parseCoordinates(
  latRaw: string | number | null | undefined,
  lngRaw: string | number | null | undefined
): { lat: number; lng: number } | null {
  const lat = typeof latRaw === 'number' ? latRaw : Number(latRaw);
  const lng = typeof lngRaw === 'number' ? lngRaw : Number(lngRaw);
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

export function missingKeyResponse(): NextResponse {
  return NextResponse.json(
    {
      error:
        'Google Maps Platform API key is not configured on the server. Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (or GOOGLE_MAPS_API_KEY) to .env.local.',
    },
    { status: 500 }
  );
}

export async function proxyGmpJson(options: {
  url: string;
  method: 'GET' | 'POST';
  apiKey: string;
  fieldMask?: string;
  body?: unknown;
}): Promise<Response> {
  const headers: Record<string, string> = {
    'X-Goog-Api-Key': options.apiKey,
  };
  if (options.fieldMask) {
    headers['X-Goog-FieldMask'] = options.fieldMask;
  }
  if (options.method === 'POST') {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(options.url, {
    method: options.method,
    headers,
    body: options.method === 'POST' ? JSON.stringify(options.body ?? {}) : undefined,
    cache: 'no-store',
  });

  // If a non-Places API rejects X-Goog-FieldMask on an unexpected field path,
  // retry cleanly without the optional header while keeping X-Goog-Api-Key.
  if (
    response.status === 400 &&
    options.fieldMask &&
    !options.url.includes('places.googleapis.com')
  ) {
    const cloned = response.clone();
    const errText = await cloned.text();
    if (errText.toLowerCase().includes('fieldmask') || errText.toLowerCase().includes('field_mask')) {
      const retryHeaders: Record<string, string> = {
        'X-Goog-Api-Key': options.apiKey,
      };
      if (options.method === 'POST') {
        retryHeaders['Content-Type'] = 'application/json';
      }
      return fetch(options.url, {
        method: options.method,
        headers: retryHeaders,
        body: options.method === 'POST' ? JSON.stringify(options.body ?? {}) : undefined,
        cache: 'no-store',
      });
    }
  }

  return response;
}
