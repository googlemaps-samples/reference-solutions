export const GMP_SOLUTION_ID = 'gmp_git_agentsamples_v1.0.0';

export function getServerMapsApiKey(): string | null {
  const key =
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    '';

  if (!key || key === 'your_google_maps_api_key_here') {
    return null;
  }

  return key;
}

export function parseCoordinateParam(value: string | null, min: number, max: number): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return null;
  }
  return parsed;
}
