export interface PathMeasure {
  points: google.maps.LatLngLiteral[];
  cumulativeMeters: number[];
  totalMeters: number;
}

function haversineMeters(
  a: google.maps.LatLngLiteral,
  b: google.maps.LatLngLiteral
): number {
  if (typeof google !== 'undefined' && google.maps?.geometry?.spherical) {
    return google.maps.geometry.spherical.computeDistanceBetween(a, b);
  }
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function computeBearing(
  a: google.maps.LatLngLiteral,
  b: google.maps.LatLngLiteral
): number {
  if (typeof google !== 'undefined' && google.maps?.geometry?.spherical) {
    return google.maps.geometry.spherical.computeHeading(a, b);
  }
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      Math.cos(toRad(b.lng - a.lng));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function buildPathMeasure(
  points: google.maps.LatLngLiteral[]
): PathMeasure {
  if (points.length === 0) {
    return { points: [], cumulativeMeters: [], totalMeters: 0 };
  }
  const cumulativeMeters: number[] = [0];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += haversineMeters(points[i - 1], points[i]);
    cumulativeMeters.push(total);
  }
  return { points, cumulativeMeters, totalMeters: total };
}

export function sampleAlongPath(
  measure: PathMeasure,
  progress: number
): {
  position: google.maps.LatLngLiteral;
  heading: number;
  remainingMeters: number;
} {
  const { points, cumulativeMeters, totalMeters } = measure;
  if (points.length === 0) {
    return {
      position: { lat: 34.0328, lng: -118.3669 },
      heading: 0,
      remainingMeters: 0,
    };
  }
  if (points.length === 1 || totalMeters <= 0) {
    return {
      position: points[0],
      heading: 0,
      remainingMeters: 0,
    };
  }

  const clamped = Math.max(0, Math.min(1, progress));
  const targetDist = clamped * totalMeters;

  // Binary search for segment
  let lo = 0;
  let hi = cumulativeMeters.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cumulativeMeters[mid] <= targetDist) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const segStart = cumulativeMeters[lo];
  const segEnd = cumulativeMeters[hi];
  const segLen = segEnd - segStart;
  const t = segLen > 0 ? (targetDist - segStart) / segLen : 0;

  const p1 = points[lo];
  const p2 = points[hi];

  let position: google.maps.LatLngLiteral;
  if (typeof google !== 'undefined' && google.maps?.geometry?.spherical) {
    const interp = google.maps.geometry.spherical.interpolate(p1, p2, t);
    position = { lat: interp.lat(), lng: interp.lng() };
  } else {
    position = {
      lat: p1.lat + (p2.lat - p1.lat) * t,
      lng: p1.lng + (p2.lng - p1.lng) * t,
    };
  }

  const heading = computeBearing(p1, p2);
  const remainingMeters = Math.max(0, totalMeters - targetDist);

  return { position, heading, remainingMeters };
}
