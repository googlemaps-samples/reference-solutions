export const FRONT_RANGE_BIAS_RECTANGLE = {
  low: { latitude: 39.55, longitude: -105.45 },
  high: { latitude: 40.15, longitude: -104.75 },
};

export function getServerMapsApiKey(): string | null {
  const key =
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

  if (!key || key === 'your_google_maps_api_key_here') {
    return null;
  }
  return key;
}

export function parseDurationSeconds(duration?: string): number {
  if (!duration) return 0;
  const match = duration.match(/^([\d.]+)s$/);
  return match ? Math.round(Number(match[1])) : 0;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${Math.max(1, mins)} min`;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

export function formatDistanceImperial(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return '—';
  const miles = meters / 1609.344;
  if (miles < 0.2) {
    const feet = Math.round(meters * 3.28084);
    return `${feet} ft`;
  }
  return `${miles.toFixed(1)} mi`;
}

export const ROUTE_PALETTE = [
  '#0f766e', // Primary deep pine teal
  '#2563eb', // Cobalt alternative 1
  '#d97706', // Amber alternative 2
  '#059669', // Emerald eco-friendly
];
