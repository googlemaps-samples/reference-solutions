const EARTH_RADIUS_KM = 6371.0088;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Ray-casting point-in-polygon check for [lng, lat] coordinates against a linear ring.
 */
export function isPointInPolygon(
  lng: number,
  lat: number,
  ring: [number, number][]
): boolean {
  if (ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersects =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Spherical polygon area in square kilometers using the shoelace spherical excess formula.
 */
export function computePolygonAreaKm2(ring: [number, number][]): number {
  if (ring.length < 3) return 0;

  let total = 0;
  const len = ring.length;
  for (let i = 0; i < len; i += 1) {
    const [lng1, lat1] = ring[i];
    const [lng2, lat2] = ring[(i + 1) % len];
    total +=
      toRadians(lng2 - lng1) *
      (2 + Math.sin(toRadians(lat1)) + Math.sin(toRadians(lat2)));
  }

  const areaKm2 = Math.abs((total * EARTH_RADIUS_KM * EARTH_RADIUS_KM) / 2);
  return Math.round(areaKm2 * 100) / 100;
}

export function computeRingCentroid(ring: [number, number][]): google.maps.LatLngLiteral {
  if (ring.length === 0) {
    return { lat: 40.73061, lng: -73.98661 };
  }
  // Exclude closing vertex if ring is closed
  const isClosed =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1];
  const vertices = isClosed ? ring.slice(0, -1) : ring;

  let sumLat = 0;
  let sumLng = 0;
  for (const [lng, lat] of vertices) {
    sumLng += lng;
    sumLat += lat;
  }
  return {
    lat: sumLat / vertices.length,
    lng: sumLng / vertices.length,
  };
}

export function samplePolygonPoints(
  ring: [number, number][],
  maxPoints = 12
): google.maps.LatLngLiteral[] {
  if (ring.length === 0) return [];
  const centroid = computeRingCentroid(ring);
  const points: google.maps.LatLngLiteral[] = [centroid];
  const step = Math.max(1, Math.floor(ring.length / Math.max(1, maxPoints - 1)));
  for (let i = 0; i < ring.length && points.length < maxPoints; i += step) {
    points.push({ lat: ring[i][1], lng: ring[i][0] });
  }
  return points;
}

export function isWebGL2Available(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return false;
    // Verify context is genuinely active and not lost
    return !gl.isContextLost();
  } catch {
    return false;
  }
}
