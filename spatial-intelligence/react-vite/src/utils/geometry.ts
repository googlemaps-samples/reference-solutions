const EARTH_RADIUS_M = 6378137;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Ray-casting point-in-polygon check for a [lng, lat] coordinate against a single GeoJSON ring.
 */
export function isPointInRing(lng: number, lat: number, ring: [number, number][]): boolean {
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

    if (intersects) inside = !inside;
  }

  return inside;
}

/**
 * Checks whether [lng, lat] falls inside a GeoJSON Polygon (outer ring minus holes).
 */
export function isPointInPolygon(
  lng: number,
  lat: number,
  coordinates: [number, number][][]
): boolean {
  if (!coordinates.length || !isPointInRing(lng, lat, coordinates[0])) {
    return false;
  }
  for (let i = 1; i < coordinates.length; i++) {
    if (isPointInRing(lng, lat, coordinates[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Computes spherical geodesic polygon area in square kilometers using the ring's spherical excess.
 */
export function computePolygonAreaKm2(ring: [number, number][]): number {
  if (ring.length < 3) return 0;

  let areaRad = 0;
  const len = ring.length;
  for (let i = 0; i < len; i++) {
    const p1 = ring[i];
    const p2 = ring[(i + 1) % len];
    areaRad +=
      toRadians(p2[0] - p1[0]) *
      (2 + Math.sin(toRadians(p1[1])) + Math.sin(toRadians(p2[1])));
  }

  const areaM2 = Math.abs((areaRad * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
  return areaM2 / 1_000_000;
}

/**
 * Computes the arithmetic centroid of a GeoJSON coordinate ring.
 */
export function computePolygonCentroid(ring: [number, number][]): { lat: number; lng: number } {
  if (!ring.length) return { lat: 40.73061, lng: -73.98661 };

  const uniqueCount =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.length - 1
      : ring.length;

  let sumLng = 0;
  let sumLat = 0;
  for (let i = 0; i < uniqueCount; i++) {
    sumLng += ring[i][0];
    sumLat += ring[i][1];
  }

  return {
    lat: sumLat / uniqueCount,
    lng: sumLng / uniqueCount
  };
}

/**
 * Computes an axis-aligned LatLngBoundsLiteral for a coordinate ring.
 */
export function getBoundsForRing(ring: [number, number][]): google.maps.LatLngBoundsLiteral {
  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;

  for (const [lng, lat] of ring) {
    if (lat > north) north = lat;
    if (lat < south) south = lat;
    if (lng > east) east = lng;
    if (lng < west) west = lng;
  }

  return { north, south, east, west };
}

/**
 * Selects evenly distributed vertices plus the centroid from a polygon ring for Elevation API sampling.
 */
export function getElevationSampleLocations(
  ring: [number, number][],
  maxSamples = 10
): google.maps.LatLngLiteral[] {
  if (!ring.length) return [];
  const centroid = computePolygonCentroid(ring);
  const points: google.maps.LatLngLiteral[] = [centroid];

  const vertexLimit = Math.max(1, maxSamples - 1);
  const step = Math.max(1, Math.floor(ring.length / vertexLimit));

  for (let i = 0; i < ring.length && points.length < maxSamples; i += step) {
    points.push({ lat: ring[i][1], lng: ring[i][0] });
  }

  return points;
}

/**
 * Safely tests whether WebGL2 is available in the current browser context without throwing.
 */
export function isWebGL2Supported(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false });
    return Boolean(gl);
  } catch {
    return false;
  }
}
