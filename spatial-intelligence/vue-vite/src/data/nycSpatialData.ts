import type {
  DistrictFeature,
  DistrictGeoJson,
  SensorCategory,
  SensorPoint,
} from '../types/gis';

export const NYC_CENTER = {
  lat: 40.73061,
  lng: -73.98661,
};

export const INITIAL_ZOOM = 12;

export const SEED_SEARCH_QUERY = 'New York City civic transit hub';

export const NYC_DISTRICTS_GEOJSON: DistrictGeoJson = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'midtown-manhattan',
      properties: {
        id: 'midtown-manhattan',
        name: 'Midtown Core Grid',
        borough: 'Manhattan',
        capacityPct: 89,
        capacityMw: 1420,
        substationCount: 18,
        status: 'High Load',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-73.9945, 40.7425],
            [-73.9685, 40.7425],
            [-73.9635, 40.7645],
            [-73.9905, 40.7645],
            [-73.9945, 40.7425],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      id: 'chelsea-hudson',
      properties: {
        id: 'chelsea-hudson',
        name: 'Hudson Yards & Chelsea',
        borough: 'Manhattan',
        capacityPct: 74,
        capacityMw: 960,
        substationCount: 12,
        status: 'Elevated',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-74.0105, 40.7345],
            [-73.9945, 40.7345],
            [-73.9905, 40.7615],
            [-74.0065, 40.7615],
            [-74.0105, 40.7345],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      id: 'lower-manhattan',
      properties: {
        id: 'lower-manhattan',
        name: 'Lower Manhattan / FiDi',
        borough: 'Manhattan',
        capacityPct: 81,
        capacityMw: 1180,
        substationCount: 15,
        status: 'Elevated',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-74.0185, 40.7005],
            [-73.9765, 40.7085],
            [-73.9785, 40.7345],
            [-74.0125, 40.7345],
            [-74.0185, 40.7005],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      id: 'upper-manhattan',
      properties: {
        id: 'upper-manhattan',
        name: 'Upper East & Harlem Corridor',
        borough: 'Manhattan',
        capacityPct: 58,
        capacityMw: 840,
        substationCount: 11,
        status: 'Nominal',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-73.9765, 40.7665],
            [-73.9415, 40.7665],
            [-73.9345, 40.7995],
            [-73.9685, 40.7995],
            [-73.9765, 40.7665],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      id: 'lic-astoria',
      properties: {
        id: 'lic-astoria',
        name: 'LIC & Queens West',
        borough: 'Queens',
        capacityPct: 62,
        capacityMw: 790,
        substationCount: 10,
        status: 'Nominal',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-73.9595, 40.7385],
            [-73.9225, 40.7385],
            [-73.9185, 40.7685],
            [-73.9535, 40.7685],
            [-73.9595, 40.7385],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      id: 'williamsburg-greenpoint',
      properties: {
        id: 'williamsburg-greenpoint',
        name: 'Williamsburg & Greenpoint',
        borough: 'Brooklyn',
        capacityPct: 68,
        capacityMw: 710,
        substationCount: 9,
        status: 'Elevated',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-73.9685, 40.7035],
            [-73.9345, 40.7035],
            [-73.9365, 40.7355],
            [-73.9645, 40.7355],
            [-73.9685, 40.7035],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      id: 'downtown-brooklyn',
      properties: {
        id: 'downtown-brooklyn',
        name: 'Downtown Brooklyn & DUMBO',
        borough: 'Brooklyn',
        capacityPct: 85,
        capacityMw: 1050,
        substationCount: 14,
        status: 'High Load',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-74.0015, 40.6805],
            [-73.9665, 40.6805],
            [-73.9695, 40.7025],
            [-73.9985, 40.7025],
            [-74.0015, 40.6805],
          ],
        ],
      },
    },
  ],
};

/**
 * Deterministic PRNG (Mulberry32) so sensor coordinates and capacity metrics
 * remain reproducible across reloads.
 */
function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Ray-casting point-in-polygon check for GeoJSON [lng, lat] rings.
 */
export function pointInPolygon(
  lng: number,
  lat: number,
  ring: [number, number][]
): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersects =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Computes approximate geodesic polygon area in square kilometers using
 * local equirectangular projection around the polygon centroid.
 */
export function computePolygonAreaKm2(ring: [number, number][]): number {
  if (ring.length < 3) {
    return 0;
  }

  let latSum = 0;
  for (const [, lat] of ring) {
    latSum += lat;
  }
  const meanLatRad = ((latSum / ring.length) * Math.PI) / 180;
  const kmPerDegLat = 111.132;
  const kmPerDegLng = 111.32 * Math.cos(meanLatRad);

  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const x1 = ring[j][0] * kmPerDegLng;
    const y1 = ring[j][1] * kmPerDegLat;
    const x2 = ring[i][0] * kmPerDegLng;
    const y2 = ring[i][1] * kmPerDegLat;
    area += x1 * y2 - x2 * y1;
  }

  return Math.abs(area) / 2;
}

export function computePolygonCentroid(ring: [number, number][]): {
  lat: number;
  lng: number;
} {
  if (ring.length === 0) {
    return NYC_CENTER;
  }
  let sumLng = 0;
  let sumLat = 0;
  const count = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
    ? ring.length - 1
    : ring.length;

  for (let i = 0; i < count; i++) {
    sumLng += ring[i][0];
    sumLat += ring[i][1];
  }
  return {
    lat: sumLat / count,
    lng: sumLng / count,
  };
}

export function samplePolygonElevationPoints(
  ring: [number, number][],
  maxSamples = 12
): Array<{ lat: number; lng: number }> {
  if (ring.length === 0) {
    return [NYC_CENTER];
  }

  const centroid = computePolygonCentroid(ring);
  const points: Array<{ lat: number; lng: number }> = [centroid];

  const step = Math.max(1, Math.floor(ring.length / Math.max(1, maxSamples - 1)));
  for (let i = 0; i < ring.length && points.length < maxSamples; i += step) {
    points.push({ lat: ring[i][1], lng: ring[i][0] });
  }

  return points;
}

function getBoundingBox(ring: [number, number][]) {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of ring) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  return { minLng, maxLng, minLat, maxLat };
}

const CATEGORIES: SensorCategory[] = [
  'Grid Node',
  'Transit Telemetry',
  'Thermal Conduit',
  'Stormwater Sensor',
];

function generateNycSensors(totalCount = 2400): SensorPoint[] {
  const rng = createRng(20260301);
  const features = NYC_DISTRICTS_GEOJSON.features;
  const sensors: SensorPoint[] = [];

  // Allocate ~310 sensors per district (2,170) + 230 corridor bridge sensors = 2,400 total
  const perDistrictTarget = 310;
  let index = 1;

  for (const feature of features) {
    const ring = feature.geometry.coordinates[0];
    const bbox = getBoundingBox(ring);
    const baseLoad = feature.properties.capacityPct;
    let added = 0;
    let attempts = 0;

    while (added < perDistrictTarget && attempts < perDistrictTarget * 12) {
      attempts++;
      const lng = bbox.minLng + rng() * (bbox.maxLng - bbox.minLng);
      const lat = bbox.minLat + rng() * (bbox.maxLat - bbox.minLat);

      if (!pointInPolygon(lng, lat, ring)) {
        continue;
      }

      const jitter = (rng() - 0.5) * 26;
      const loadPct = Math.max(18, Math.min(99, Math.round(baseLoad + jitter)));
      const category = CATEGORIES[Math.floor(rng() * CATEGORIES.length)];

      sensors.push({
        id: `NYC-SNS-${String(index).padStart(4, '0')}`,
        lng: Number(lng.toFixed(6)),
        lat: Number(lat.toFixed(6)),
        loadPct,
        outputKw: Math.round(120 + loadPct * 4.8 + rng() * 90),
        category,
        districtId: feature.properties.id,
      });

      index++;
      added++;
    }
  }

  // Fill remaining points along NYC bridge & inter-borough telemetry corridors
  while (sensors.length < totalCount) {
    const lng = -74.018 + rng() * 0.1;
    const lat = 40.682 + rng() * 0.115;
    const loadPct = Math.max(25, Math.min(97, Math.round(52 + rng() * 40)));
    const category = CATEGORIES[Math.floor(rng() * CATEGORIES.length)];

    sensors.push({
      id: `NYC-SNS-${String(index).padStart(4, '0')}`,
      lng: Number(lng.toFixed(6)),
      lat: Number(lat.toFixed(6)),
      loadPct,
      outputKw: Math.round(120 + loadPct * 4.5 + rng() * 75),
      category,
      districtId: 'corridor-network',
    });
    index++;
  }

  return sensors;
}

export const NYC_SENSOR_POINTS: SensorPoint[] = generateNycSensors(2400);

export const CITYWIDE_AREA_KM2: number = Number(
  NYC_DISTRICTS_GEOJSON.features
    .reduce((acc, f) => acc + computePolygonAreaKm2(f.geometry.coordinates[0]), 0)
    .toFixed(2)
);

export function getDistrictCapacityColor(capacityPct: number): string {
  if (capacityPct >= 82) return '#f43f5e'; // High Load (rose-500)
  if (capacityPct >= 66) return '#f59e0b'; // Elevated (amber-500)
  return '#10b981'; // Nominal (emerald-500)
}

export function getDistrictFeatureById(id: string): DistrictFeature | undefined {
  return NYC_DISTRICTS_GEOJSON.features.find((f) => f.properties.id === id);
}
