import type { ElevationPoint, ElevationProfileSummary } from '../types/routing';

export const DENVER_BOULDER_CENTER: google.maps.LatLngLiteral = {
  lat: 39.884,
  lng: -105.135,
};

export const DENVER_BOULDER_BOUNDS: google.maps.LatLngBoundsLiteral = {
  south: 39.55,
  west: -105.55,
  north: 40.2,
  east: -104.7,
};

export const SEEDED_ORIGIN_QUERY = 'Denver Union Station, Denver, CO';
export const SEEDED_DESTINATION_QUERY = 'Chautauqua Park, Boulder, CO';

export const ROUTE_PALETTE = ['#0f766e', '#2563eb', '#d97706', '#7c3aed'];
export const ECO_ROUTE_COLOR = '#15803d';

export function toLatLngLiteral(
  point: google.maps.LatLng | google.maps.LatLngLiteral | google.maps.LatLngAltitude | null | undefined,
): google.maps.LatLngLiteral | null {
  if (!point) return null;
  const rawLat = (point as { lat: number | (() => number) }).lat;
  const rawLng = (point as { lng: number | (() => number) }).lng;
  const lat = typeof rawLat === 'function' ? rawLat.call(point) : rawLat;
  const lng = typeof rawLng === 'function' ? rawLng.call(point) : rawLng;
  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }
  return { lat, lng };
}

export function haversineDistanceMeters(
  a: google.maps.LatLngLiteral,
  b: google.maps.LatLngLiteral,
): number {
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

export function decimatePath(
  path: google.maps.LatLngLiteral[],
  maxPoints = 120,
): google.maps.LatLngLiteral[] {
  if (path.length <= maxPoints) return path;
  const result: google.maps.LatLngLiteral[] = [];
  const step = (path.length - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints - 1; i++) {
    result.push(path[Math.round(i * step)]);
  }
  result.push(path[path.length - 1]);
  return result;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return '—';
  const miles = meters / 1609.344;
  const km = meters / 1000;
  return `${miles.toFixed(1)} mi (${km.toFixed(1)} km)`;
}

export function metersToFeet(meters: number): number {
  return meters * 3.28084;
}

export function computeElevationStats(
  results: google.maps.ElevationResult[],
  routeDistanceMeters?: number,
): ElevationProfileSummary | null {
  if (!results || results.length < 2) return null;

  const rawLocations = results.map((r) => toLatLngLiteral(r.location));
  let cumulativeRawMeters = 0;
  const rawDistances: number[] = [0];

  for (let i = 1; i < results.length; i++) {
    const prev = rawLocations[i - 1];
    const curr = rawLocations[i];
    const seg = prev && curr ? haversineDistanceMeters(prev, curr) : 0;
    cumulativeRawMeters += seg;
    rawDistances.push(cumulativeRawMeters);
  }

  const totalDistanceMeters =
    routeDistanceMeters && routeDistanceMeters > 0
      ? routeDistanceMeters
      : cumulativeRawMeters;

  const scale =
    cumulativeRawMeters > 0 ? totalDistanceMeters / cumulativeRawMeters : 1;

  const points: ElevationPoint[] = [];
  let totalGainMeters = 0;
  let totalLossMeters = 0;
  let minElevationMeters = Infinity;
  let maxElevationMeters = -Infinity;
  let maxGradePercent = 0;

  for (let i = 0; i < results.length; i++) {
    const loc = rawLocations[i] ?? DENVER_BOULDER_CENTER;
    const elev = results[i].elevation;
    const distMeters = rawDistances[i] * scale;

    let gradePercent = 0;
    if (i > 0) {
      const prevDist = rawDistances[i - 1] * scale;
      const deltaDist = distMeters - prevDist;
      const deltaElev = elev - results[i - 1].elevation;
      if (deltaElev > 0) {
        totalGainMeters += deltaElev;
      } else {
        totalLossMeters += Math.abs(deltaElev);
      }
      if (deltaDist > 5) {
        gradePercent = (deltaElev / deltaDist) * 100;
      }
      if (Math.abs(gradePercent) > Math.abs(maxGradePercent)) {
        maxGradePercent = gradePercent;
      }
    }

    if (elev < minElevationMeters) minElevationMeters = elev;
    if (elev > maxElevationMeters) maxElevationMeters = elev;

    points.push({
      index: i,
      distanceKm: distMeters / 1000,
      distanceMiles: distMeters / 1609.344,
      elevationMeters: elev,
      elevationFeet: metersToFeet(elev),
      gradePercent,
      location: loc,
    });
  }

  return {
    points,
    totalGainMeters,
    totalLossMeters,
    minElevationMeters,
    maxElevationMeters,
    maxGradePercent,
    totalDistanceMeters,
  };
}
