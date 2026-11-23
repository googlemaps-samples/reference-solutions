import type { LatLngLiteral } from '../types/dispatch';

const EARTH_RADIUS_METERS = 6371000;

export function haversineDistanceMeters(a: LatLngLiteral, b: LatLngLiteral): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLng = Math.sin(dLng / 2);
  const h =
    sinHalfLat * sinHalfLat +
    Math.cos(lat1) * Math.cos(lat2) * sinHalfLng * sinHalfLng;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistance(meters: number | null | undefined): string {
  if (meters == null || !Number.isFinite(meters)) return '—';
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  const miles = meters / 1609.344;
  return `${km.toFixed(1)} km (${miles.toFixed(1)} mi)`;
}

export function formatCompactDistance(meters: number | null | undefined): string {
  if (meters == null || !Number.isFinite(meters)) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDurationSeconds(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  const totalMins = Math.max(1, Math.round(seconds / 60));
  if (totalMins < 60) {
    return `${totalMins} min`;
  }
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`;
}

export function formatConnectorType(connectorType: string): string {
  const map: Record<string, string> = {
    CCS_COMBO_1: 'CCS1',
    CCS_COMBO_2: 'CCS2',
    NACS: 'NACS',
    TESLA: 'Tesla',
    CHADEMO: 'CHAdeMO',
    J1772: 'J1772',
    TYPE_2: 'Type 2',
    OTHER: 'Other',
    UNSPECIFIED_WALL_OUTLET: 'Wall',
  };
  return map[connectorType] ?? connectorType.replace(/_/g, ' ');
}

export function formatManeuverLabel(maneuver: string | null | undefined): string {
  if (!maneuver) return 'Continue';
  return maneuver
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
