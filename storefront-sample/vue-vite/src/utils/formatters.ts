import type { LatLngPoint, OriginSelection, TravelModeKey } from '../types/storefront';

export const CLINIC_SEED_QUERY = '450 Sutter Dental San Francisco';

export const INITIAL_CLINIC_CENTER: LatLngPoint = {
  lat: 37.7896,
  lng: -122.4076,
};

export const HOME_VISIT_RADIUS_METERS = 3500;

export const DEFAULT_ORIGIN: OriginSelection = {
  label: 'Ferry Building, San Francisco, CA',
  address: '1 Ferry Building, San Francisco, CA 94111',
  location: {
    lat: 37.7955,
    lng: -122.3937,
  },
  isDefaultSeed: true,
};

export const GMP_ATTRIBUTION_IDS: string[] = ['gmp_git_agentsamples_v1.0.0'];

export const TRAVEL_MODE_META: Record<
  TravelModeKey,
  { label: string; shortLabel: string; strokeColor: string }
> = {
  DRIVING: {
    label: 'Driving',
    shortLabel: 'Drive',
    strokeColor: '#0d9488',
  },
  TRANSIT: {
    label: 'Public Transit',
    shortLabel: 'Transit',
    strokeColor: '#2563eb',
  },
  WALKING: {
    label: 'Walking',
    shortLabel: 'Walk',
    strokeColor: '#7c3aed',
  },
};

export function formatDurationMillis(durationMillis?: number | null): string {
  if (typeof durationMillis !== 'number' || !Number.isFinite(durationMillis)) {
    return '—';
  }
  const totalMinutes = Math.max(1, Math.round(durationMillis / 60_000));
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
}

export function formatDistanceMeters(distanceMeters?: number | null): string {
  if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters)) {
    return '—';
  }
  const miles = distanceMeters / 1609.344;
  if (miles < 0.2) {
    const feet = Math.round(distanceMeters * 3.28084);
    return `${feet.toLocaleString()} ft`;
  }
  const km = distanceMeters / 1000;
  return `${miles.toFixed(1)} mi (${km.toFixed(1)} km)`;
}

export function computeHaversineMeters(a: LatLngPoint, b: LatLngPoint): number {
  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
