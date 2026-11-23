import type { AmenityCategory, LatLngPoint } from '@/types/real-estate';

export function formatCurrency(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatCompactPrice(price: number): string {
  if (price >= 1_000_000) {
    const millions = price / 1_000_000;
    return `$${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(2).replace(/0$/, '')}M`;
  }
  if (price >= 1_000) {
    return `$${Math.round(price / 1_000)}K`;
  }
  return `$${price}`;
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return '0 m';
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  const miles = meters / 1609.344;
  return `${miles.toFixed(1)} mi (${km.toFixed(1)} km)`;
}

export function formatDurationSeconds(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
}

export function parseDurationString(duration?: string | null): number {
  if (!duration) return 0;
  const match = /^(\d+(?:\.\d+)?)s$/.exec(duration.trim());
  if (!match) return 0;
  return Math.round(Number(match[1]));
}

export function haversineDistanceMeters(a: LatLngPoint, b: LatLngPoint): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function classifyAmenityCategory(primaryType?: string): Exclude<AmenityCategory, 'all'> {
  const t = (primaryType || '').toLowerCase();
  if (
    t.includes('school') ||
    t.includes('university') ||
    t.includes('preschool') ||
    t.includes('library')
  ) {
    return 'schools';
  }
  if (
    t.includes('grocery') ||
    t.includes('supermarket') ||
    t.includes('market') ||
    t.includes('food_store')
  ) {
    return 'groceries';
  }
  return 'transit';
}

export function formatPrimaryTypeLabel(primaryType?: string): string {
  if (!primaryType) return 'Place';
  return primaryType
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
