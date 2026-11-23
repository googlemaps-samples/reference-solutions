export function getServerGoogleMapsApiKey(): string | null {
  const key =
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    '';

  if (!key || key === 'your_google_maps_api_key_here') {
    return null;
  }
  return key;
}

export function buildGmpHeaders(apiKey: string, fieldMask: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': fieldMask,
    'X-Goog-Maps-Solution-ID': 'gmp_git_agentsamples_v1.0.0',
  };
}

export function isValidLatLng(point: unknown): point is { lat: number; lng: number } {
  if (!point || typeof point !== 'object') return false;
  const candidate = point as Record<string, unknown>;
  return (
    typeof candidate.lat === 'number' &&
    Number.isFinite(candidate.lat) &&
    candidate.lat >= -90 &&
    candidate.lat <= 90 &&
    typeof candidate.lng === 'number' &&
    Number.isFinite(candidate.lng) &&
    candidate.lng >= -180 &&
    candidate.lng <= 180
  );
}
