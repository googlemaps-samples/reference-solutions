export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Ray-casting point-in-polygon check for a single GeoJSON ring ([lng, lat][]).
 */
export function isPointInRing(
  point: [number, number],
  ring: [number, number][]
): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Point-in-polygon check supporting GeoJSON exterior ring + optional holes.
 */
export function isPointInPolygonRings(
  point: [number, number],
  rings: [number, number][][]
): boolean {
  if (!rings.length || !isPointInRing(point, rings[0])) {
    return false;
  }
  for (let i = 1; i < rings.length; i++) {
    if (isPointInRing(point, rings[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Computes approximate geodesic polygon area in square kilometers using
 * local equirectangular projection around the ring centroid.
 */
export function computePolygonAreaKm2(ring: [number, number][]): number {
  if (ring.length < 3) return 0;

  let latSum = 0;
  for (const [, lat] of ring) {
    latSum += lat;
  }
  const meanLatRad = ((latSum / ring.length) * Math.PI) / 180;
  const kmPerDegLat = 111.132;
  const kmPerDegLng = 111.32 * Math.cos(meanLatRad);

  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const [lng1, lat1] = ring[i];
    const [lng2, lat2] = ring[(i + 1) % ring.length];
    const x1 = lng1 * kmPerDegLng;
    const y1 = lat1 * kmPerDegLat;
    const x2 = lng2 * kmPerDegLng;
    const y2 = lat2 * kmPerDegLat;
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

/**
 * Computes bounding box from a GeoJSON ring ([lng, lat][]).
 */
export function computeBoundsFromRing(ring: [number, number][]): GeoBounds {
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
 * Computes polygon centroid from a GeoJSON ring ([lng, lat][]).
 */
export function computeCentroidFromRing(ring: [number, number][]): LatLngPoint {
  if (!ring.length) return { lat: 40.73061, lng: -73.98661 };

  // Exclude closing duplicate vertex if present
  const len =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.length - 1
      : ring.length;

  let lngSum = 0;
  let latSum = 0;
  for (let i = 0; i < len; i++) {
    lngSum += ring[i][0];
    latSum += ring[i][1];
  }
  return {
    lat: Number((latSum / len).toFixed(6)),
    lng: Number((lngSum / len).toFixed(6)),
  };
}

/**
 * Extracts evenly spaced vertices plus centroid for Elevation API sampling.
 */
export function getPolygonSampleLocations(
  ring: [number, number][],
  maxSamples = 12
): LatLngPoint[] {
  if (!ring.length) return [];

  const uniqueVertices =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;

  const centroid = computeCentroidFromRing(ring);
  const samples: LatLngPoint[] = [centroid];

  const step = Math.max(1, Math.floor(uniqueVertices.length / (maxSamples - 1)));
  for (let i = 0; i < uniqueVertices.length && samples.length < maxSamples; i += step) {
    samples.push({
      lat: Number(uniqueVertices[i][1].toFixed(6)),
      lng: Number(uniqueVertices[i][0].toFixed(6)),
    });
  }
  return samples;
}
