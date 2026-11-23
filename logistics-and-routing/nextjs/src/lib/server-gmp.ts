import { NextResponse } from 'next/server';

export function getServerGoogleMapsApiKey(): string | null {
  const key =
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!key || key === 'your_google_maps_api_key_here') {
    return null;
  }
  return key;
}

export function jsonWithSecurityHeaders(
  body: unknown,
  init?: ResponseInit
): NextResponse {
  const response = NextResponse.json(body, init);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
