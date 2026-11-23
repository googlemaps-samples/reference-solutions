const EARTH_RADIUS_KM = 6371.0088;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Ray-casting point-in-ring test for [lng, lat] coordinates.
 */
export function isPointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-15) + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Point-in-polygon check supporting outer ring + interior holes.
 */
export function isPointInPolygonRings(
  lng: number,
  lat: number,
  rings: number[][][]
): boolean {
  if (!rings.length || !isPointInRing(lng, lat, rings[0])) {
    return false;
  }
  for (let i = 1; i < rings.length; i++) {
    if (isPointInRing(lng, lat, rings[i])) {
      return false;
    }
  }
  return true;
}

/**
 * Computes spherical polygon area in square kilometers using the spherical excess formula.
 */
export function computePolygonAreaKm2(ring: number[][]): number {
  if (ring.length < 3) return 0;

  let total = 0;
  const len = ring.length;
  for (let i = 0; i < len; i++) {
    const p1 = ring[i];
    const p2 = ring[(i + 1) % len];
    const lon1 = toRadians(p1[0]);
    const lat1 = toRadians(p1[1]);
    const lon2 = toRadians(p2[0]);
    const lat2 = toRadians(p2[1]);
    total += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  return Math.abs((total * EARTH_RADIUS_KM * EARTH_RADIUS_KM) / 2);
}

/**
 * Computes geographic bounding box for a coordinate ring.
 */
export function computeBoundsForRing(ring: number[][]): {
  north: number;
  south: number;
  east: number;
  west: number;
} {
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
 * Computes the geometric centroid of a polygon ring.
 */
export function computeRingCentroid(ring: number[][]): { lat: number; lng: number } {
  if (!ring.length) {
    return { lat: 40.73061, lng: -73.98661 };
  }
  const unique =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;

  let sumLat = 0;
  let sumLng = 0;
  for (const [lng, lat] of unique) {
    sumLng += lng;
    sumLat += lat;
  }
  return {
    lat: sumLat / unique.length,
    lng: sumLng / unique.length
  };
}

/**
 * Samples representative locations (centroid, vertices, and interior points) for Elevation API profiling.
 */
export function buildElevationSampleLocations(
  ring: number[][],
  maxSamples = 12
): Array<{ lat: number; lng: number }> {
  if (!ring.length) return [];

  const samples: Array<{ lat: number; lng: number }> = [];
  const centroid = computeRingCentroid(ring);
  samples.push(centroid);

  const bounds = computeBoundsForRing(ring);
  const gridSteps = 3;
  for (let r = 1; r <= gridSteps; r++) {
    for (let c = 1; c <= gridSteps; c++) {
      const lat = bounds.south + ((bounds.north - bounds.south) * r) / (gridSteps + 1);
      const lng = bounds.west + ((bounds.east - bounds.west) * c) / (gridSteps + 1);
      if (isPointInRing(lng, lat, ring)) {
        samples.push({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
      }
    }
  }

  const stride = Math.max(1, Math.floor(ring.length / 6));
  for (let i = 0; i < ring.length && samples.length < maxSamples; i += stride) {
    samples.push({
      lat: Number(ring[i][1].toFixed(6)),
      lng: Number(ring[i][0].toFixed(6))
    });
  }

  return samples.slice(0, maxSamples);
}

/**
 * Choropleth fill color by district capacity utilization percentage.
 */
export function getCapacityColor(utilization: number): string {
  if (utilization >= 90) return '#ef4444';
  if (utilization >= 80) return '#f97316';
  if (utilization >= 70) return '#eab308';
  if (utilization >= 55) return '#14b8a6';
  return '#0ea5e9';
}

/**
 * RGBA tuple for deck.gl ScatterplotLayer based on sensor capacity load.
 */
export function getSensorLoadRgba(loadPct: number, alpha = 210): [number, number, number, number] {
  if (loadPct >= 88) return [239, 68, 68, alpha];
  if (loadPct >= 75) return [249, 115, 22, alpha];
  if (loadPct >= 60) return [234, 179, 8, alpha];
  if (loadPct >= 42) return [20, 184, 166, alpha];
  return [56, 189, 248, alpha];
}

/**
 * Safely detects WebGL2 availability so headless Chromium without GPU emits zero console errors.
 */
export function isWebGL2Supported(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false });
    return Boolean(gl);
  } catch {
    return false;
  }
}
