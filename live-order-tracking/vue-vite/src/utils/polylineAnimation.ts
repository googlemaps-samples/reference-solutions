import type { LatLngPoint } from '../config/delivery';

export interface PolylineProfile {
  points: LatLngPoint[];
  cumulativeDistances: number[];
  totalDistance: number;
}

function haversineMeters(a: LatLngPoint, b: LatLngPoint): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function buildPolylineProfile(points: LatLngPoint[]): PolylineProfile {
  if (points.length === 0) {
    return { points: [], cumulativeDistances: [], totalDistance: 0 };
  }
  const cumulativeDistances: number[] = [0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineMeters(points[i - 1], points[i]);
    cumulativeDistances.push(total);
  }
  return {
    points,
    cumulativeDistances,
    totalDistance: total,
  };
}

export function interpolateAlongProfile(
  profile: PolylineProfile,
  progress: number,
): LatLngPoint | null {
  const { points, cumulativeDistances, totalDistance } = profile;
  if (points.length === 0) return null;
  if (points.length === 1 || totalDistance <= 0) return points[0];

  const clamped = Math.max(0, Math.min(1, progress));
  if (clamped === 0) return points[0];
  if (clamped === 1) return points[points.length - 1];

  const targetDist = clamped * totalDistance;
  let segIndex = 0;
  for (let i = 1; i < cumulativeDistances.length; i++) {
    if (cumulativeDistances[i] >= targetDist) {
      segIndex = i - 1;
      break;
    }
  }

  const startDist = cumulativeDistances[segIndex];
  const endDist = cumulativeDistances[segIndex + 1];
  const segLen = endDist - startDist;
  const ratio = segLen > 0 ? (targetDist - startDist) / segLen : 0;

  const p0 = points[segIndex];
  const p1 = points[segIndex + 1];
  return {
    lat: p0.lat + (p1.lat - p0.lat) * ratio,
    lng: p0.lng + (p1.lng - p0.lng) * ratio,
  };
}
