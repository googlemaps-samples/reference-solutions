import { DestinationPreset, DiscoveryCategory } from '@/types/itinerary';

export const DAY_COLORS: Record<1 | 2, { hex: string; border: string; bgLight: string; text: string; label: string }> = {
  1: {
    hex: '#0F766E',
    border: '#115E59',
    bgLight: '#CCFBF1',
    text: '#0F766E',
    label: 'Day 1',
  },
  2: {
    hex: '#D97706',
    border: '#B45309',
    bgLight: '#FEF3C7',
    text: '#B45309',
    label: 'Day 2',
  },
};

export const DESTINATION_PRESETS: DestinationPreset[] = [
  {
    id: 'tokyo',
    label: 'Tokyo, Japan',
    city: 'Tokyo',
    center: { lat: 35.6812, lng: 139.7671 },
    zoom: 12,
  },
  {
    id: 'kyoto',
    label: 'Kyoto, Japan',
    city: 'Kyoto',
    center: { lat: 35.0116, lng: 135.7681 },
    zoom: 12,
  },
  {
    id: 'london',
    label: 'London, UK',
    city: 'London',
    center: { lat: 51.5072, lng: -0.1276 },
    zoom: 12,
  },
  {
    id: 'paris',
    label: 'Paris, France',
    city: 'Paris',
    center: { lat: 48.8566, lng: 2.3522 },
    zoom: 12,
  },
  {
    id: 'new-york',
    label: 'New York, USA',
    city: 'New York',
    center: { lat: 40.758, lng: -73.9855 },
    zoom: 12,
  },
];

export function buildDiscoveryTextQuery(city: string, category: DiscoveryCategory): string {
  switch (category) {
    case 'attractions':
      return `top tourist attractions in ${city}`;
    case 'restaurants':
      return `top rated restaurants in ${city}`;
    case 'hotels':
      return `best hotels in ${city}`;
  }
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return '0 m';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function parseDurationSeconds(duration?: string): number {
  if (!duration) return 0;
  const match = /^(\d+(?:\.\d+)?)s$/.exec(duration.trim());
  return match ? Math.round(Number(match[1])) : 0;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 min';
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function formatUtcOffset(totalOffsetSeconds: number): string {
  const sign = totalOffsetSeconds >= 0 ? '+' : '-';
  const absSeconds = Math.abs(totalOffsetSeconds);
  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  return `UTC${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatPriceLevel(priceLevel?: string): string | null {
  switch (priceLevel) {
    case 'PRICE_LEVEL_FREE':
      return 'Free';
    case 'PRICE_LEVEL_INEXPENSIVE':
      return '$';
    case 'PRICE_LEVEL_MODERATE':
      return '$$';
    case 'PRICE_LEVEL_EXPENSIVE':
      return '$$$';
    case 'PRICE_LEVEL_VERY_EXPENSIVE':
      return '$$$$';
    default:
      return null;
  }
}

export function formatDestinationLocalTime(
  nowMs: number,
  rawOffset: number,
  dstOffset: number,
  timeZoneId?: string
): string {
  const totalOffsetSeconds = rawOffset + dstOffset;
  if (timeZoneId && timeZoneId !== 'UTC_OFFSET') {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timeZoneId,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        weekday: 'short',
        hour12: false,
      }).format(new Date(nowMs));
    } catch {
      // Fall back to offset calculation if Intl doesn't recognize a zone ID
    }
  }
  const shifted = new Date(nowMs + totalOffsetSeconds * 1000);
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][shifted.getUTCDay()];
  const hh = String(shifted.getUTCHours()).padStart(2, '0');
  const mm = String(shifted.getUTCMinutes()).padStart(2, '0');
  const ss = String(shifted.getUTCSeconds()).padStart(2, '0');
  return `${weekday} ${hh}:${mm}:${ss}`;
}
