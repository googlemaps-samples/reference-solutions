import type { LatLngPoint } from '../types/geofencing';

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return '0.0 mi';
  const miles = meters / 1609.344;
  return `${miles.toFixed(1)} mi`;
}

export function formatDuration(millis: number): string {
  if (!Number.isFinite(millis) || millis <= 0) return '0 min';
  const totalMinutes = Math.max(1, Math.round(millis / 60000));
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
}

export function getPolygonCentroid(path: LatLngPoint[]): LatLngPoint {
  if (path.length === 0) {
    return { lat: 30.2672, lng: -97.7431 };
  }
  let latSum = 0;
  let lngSum = 0;
  for (const pt of path) {
    latSum += pt.lat;
    lngSum += pt.lng;
  }
  return {
    lat: latSum / path.length,
    lng: lngSum / path.length,
  };
}
