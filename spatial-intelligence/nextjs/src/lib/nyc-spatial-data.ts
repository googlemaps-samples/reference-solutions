import {
  computeBoundsFromRing,
  computeCentroidFromRing,
  computePolygonAreaKm2,
  type GeoBounds,
  type LatLngPoint,
} from './geometry';

export type DistrictStatus = 'Optimal' | 'Elevated' | 'Critical';

export interface DistrictProperties {
  id: string;
  name: string;
  borough: string;
  capacityLoadPct: number;
  gridCapacityMw: number;
  peakDemandMw: number;
  status: DistrictStatus;
  areaKm2: number;
  bounds: GeoBounds;
  center: LatLngPoint;
  sensorCount: number;
}

export interface DistrictFeature {
  type: 'Feature';
  id: string;
  properties: DistrictProperties;
  geometry: {
    type: 'Polygon';
    coordinates: [number, number][][];
  };
}

export interface DistrictFeatureCollection {
  type: 'FeatureCollection';
  features: DistrictFeature[];
}

export interface SensorPoint {
  id: string;
  position: [number, number]; // [lng, lat] for deck.gl
  lat: number;
  lng: number;
  loadPct: number;
  throughputKw: number;
  districtId: string;
  sensorType: 'Substation' | 'Transit Telemetry' | 'Grid Relay' | 'Edge Node';
}

interface RawDistrictSeed {
  id: string;
  name: string;
  borough: string;
  capacityLoadPct: number;
  gridCapacityMw: number;
  ring: [number, number][];
}

const RAW_DISTRICTS: RawDistrictSeed[] = [
  {
    id: 'midtown-core',
    name: 'Midtown Core Grid',
    borough: 'Manhattan',
    capacityLoadPct: 88,
    gridCapacityMw: 1420,
    ring: [
      [-74.001, 40.768],
      [-73.966, 40.768],
      [-73.966, 40.741],
      [-74.001, 40.741],
      [-74.001, 40.768],
    ],
  },
  {
    id: 'lower-manhattan',
    name: 'Lower Manhattan Financial Hub',
    borough: 'Manhattan',
    capacityLoadPct: 79,
    gridCapacityMw: 1180,
    ring: [
      [-74.018, 40.726],
      [-73.978, 40.726],
      [-73.984, 40.701],
      [-74.018, 40.701],
      [-74.018, 40.726],
    ],
  },
  {
    id: 'union-gramercy',
    name: 'Flatiron & Union Corridor',
    borough: 'Manhattan',
    capacityLoadPct: 72,
    gridCapacityMw: 940,
    ring: [
      [-74.007, 40.741],
      [-73.972, 40.741],
      [-73.972, 40.726],
      [-74.007, 40.726],
      [-74.007, 40.741],
    ],
  },
  {
    id: 'upper-west-transit',
    name: 'Upper West Transit Zone',
    borough: 'Manhattan',
    capacityLoadPct: 58,
    gridCapacityMw: 860,
    ring: [
      [-73.994, 40.796],
      [-73.966, 40.796],
      [-73.966, 40.768],
      [-73.994, 40.768],
      [-73.994, 40.796],
    ],
  },
  {
    id: 'downtown-brooklyn',
    name: 'Downtown Brooklyn Nexus',
    borough: 'Brooklyn',
    capacityLoadPct: 83,
    gridCapacityMw: 1090,
    ring: [
      [-74.004, 40.705],
      [-73.964, 40.705],
      [-73.964, 40.680],
      [-74.004, 40.680],
      [-74.004, 40.705],
    ],
  },
  {
    id: 'williamsburg-waterfront',
    name: 'Williamsburg Waterfront',
    borough: 'Brooklyn',
    capacityLoadPct: 63,
    gridCapacityMw: 780,
    ring: [
      [-73.970, 40.728],
      [-73.936, 40.728],
      [-73.936, 40.705],
      [-73.970, 40.705],
      [-73.970, 40.728],
    ],
  },
  {
    id: 'lic-corridor',
    name: 'Long Island City Corridor',
    borough: 'Queens',
    capacityLoadPct: 76,
    gridCapacityMw: 980,
    ring: [
      [-73.962, 40.758],
      [-73.922, 40.758],
      [-73.922, 40.734],
      [-73.962, 40.734],
      [-73.962, 40.758],
    ],
  },
  {
    id: 'astoria-energy',
    name: 'Astoria Energy District',
    borough: 'Queens',
    capacityLoadPct: 52,
    gridCapacityMw: 1350,
    ring: [
      [-73.944, 40.784],
      [-73.904, 40.784],
      [-73.904, 40.758],
      [-73.944, 40.758],
      [-73.944, 40.784],
    ],
  },
];

function getStatusFromLoad(loadPct: number): DistrictStatus {
  if (loadPct >= 80) return 'Critical';
  if (loadPct >= 65) return 'Elevated';
  return 'Optimal';
}

// Deterministic Mulberry32 PRNG so SSR & CSR produce identical sensor datasets
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SENSOR_TYPES: SensorPoint['sensorType'][] = [
  'Substation',
  'Transit Telemetry',
  'Grid Relay',
  'Edge Node',
];

const POINTS_PER_DISTRICT = 300; // 8 * 300 = 2,400 infrastructure sensor points

function buildDataset(): {
  districtsGeoJson: DistrictFeatureCollection;
  sensors: SensorPoint[];
} {
  const rand = createSeededRandom(20261119);
  const sensors: SensorPoint[] = [];

  const features: DistrictFeature[] = RAW_DISTRICTS.map((seed) => {
    const bounds = computeBoundsFromRing(seed.ring);
    const center = computeCentroidFromRing(seed.ring);
    const areaKm2 = Number(computePolygonAreaKm2(seed.ring).toFixed(2));
    const peakDemandMw = Math.round((seed.gridCapacityMw * seed.capacityLoadPct) / 100);

    for (let i = 0; i < POINTS_PER_DISTRICT; i++) {
      // Cluster slightly toward the district center with bounded jitter inside bounds
      const u = (rand() + rand()) / 2;
      const v = (rand() + rand()) / 2;
      const lng = Number(
        (bounds.west + (bounds.east - bounds.west) * (0.04 + u * 0.92)).toFixed(6)
      );
      const lat = Number(
        (bounds.south + (bounds.north - bounds.south) * (0.04 + v * 0.92)).toFixed(6)
      );
      const loadJitter = (rand() - 0.5) * 26;
      const loadPct = Math.max(
        18,
        Math.min(99, Math.round(seed.capacityLoadPct + loadJitter))
      );
      const throughputKw = Math.round(240 + loadPct * 8.5 + rand() * 190);
      const sensorType = SENSOR_TYPES[(i + Math.floor(rand() * 4)) % SENSOR_TYPES.length];

      sensors.push({
        id: `${seed.id}-node-${i + 1}`,
        position: [lng, lat],
        lat,
        lng,
        loadPct,
        throughputKw,
        districtId: seed.id,
        sensorType,
      });
    }

    return {
      type: 'Feature',
      id: seed.id,
      properties: {
        id: seed.id,
        name: seed.name,
        borough: seed.borough,
        capacityLoadPct: seed.capacityLoadPct,
        gridCapacityMw: seed.gridCapacityMw,
        peakDemandMw,
        status: getStatusFromLoad(seed.capacityLoadPct),
        areaKm2,
        bounds,
        center,
        sensorCount: POINTS_PER_DISTRICT,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [seed.ring],
      },
    };
  });

  return {
    districtsGeoJson: {
      type: 'FeatureCollection',
      features,
    },
    sensors,
  };
}

const DATASET = buildDataset();

export const NYC_DISTRICTS_GEOJSON: DistrictFeatureCollection = DATASET.districtsGeoJson;
export const NYC_SENSOR_POINTS: SensorPoint[] = DATASET.sensors;

export const NYC_INITIAL_CENTER = { lat: 40.73061, lng: -73.98661 };
export const NYC_INITIAL_ZOOM = 12;
export const SEED_SEARCH_QUERY = 'New York City civic transit hub';

/**
 * Default citywide elevation transect (Manhattan -> Brooklyn -> Queens)
 * used before a specific district or Terra Draw polygon is chosen.
 */
export const DEFAULT_ELEVATION_TRANSECT: LatLngPoint[] = [
  { lat: 40.7061, lng: -74.0088 },
  { lat: 40.73061, lng: -73.98661 },
  { lat: 40.7527, lng: -73.9772 },
  { lat: 40.7681, lng: -73.9819 },
  { lat: 40.7447, lng: -73.9485 },
  { lat: 40.6929, lng: -73.9903 },
];
