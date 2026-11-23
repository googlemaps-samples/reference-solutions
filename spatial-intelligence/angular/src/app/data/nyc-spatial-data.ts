import {
  DistrictGeoJsonCollection,
  DistrictSummary,
  SensorPoint,
} from '../models/gis.models';
import {
  computePolygonAreaKm2,
  computeRingCentroid,
  isPointInPolygon,
} from '../utils/spatial-math';

export const NYC_CENTER: google.maps.LatLngLiteral = {
  lat: 40.73061,
  lng: -73.98661,
};

export const NYC_DEFAULT_ZOOM = 12;

export const NYC_DISTRICTS_GEOJSON: DistrictGeoJsonCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'MN-MID',
      properties: {
        id: 'MN-MID',
        code: 'MN-05',
        name: 'Midtown Core Grid',
        borough: 'Manhattan',
        capacityPct: 89,
        capacityMw: 420,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-74.0065, 40.7425],
            [-73.972, 40.738],
            [-73.9635, 40.764],
            [-73.994, 40.7715],
            [-74.0065, 40.7425],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      id: 'MN-FIDI',
      properties: {
        id: 'MN-FIDI',
        code: 'MN-01',
        name: 'Lower Manhattan & FiDi',
        borough: 'Manhattan',
        capacityPct: 84,
        capacityMw: 315,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-74.018, 40.701],
            [-73.9975, 40.707],
            [-73.975, 40.7175],
            [-73.988, 40.7385],
            [-74.0095, 40.7405],
            [-74.018, 40.701],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      id: 'MN-UPP',
      properties: {
        id: 'MN-UPP',
        code: 'MN-10',
        name: 'Upper West & Harlem',
        borough: 'Manhattan',
        capacityPct: 68,
        capacityMw: 245,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-73.991, 40.774],
            [-73.952, 40.7675],
            [-73.934, 40.8065],
            [-73.9695, 40.816],
            [-73.991, 40.774],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      id: 'BK-DT',
      properties: {
        id: 'BK-DT',
        code: 'BK-02',
        name: 'Downtown Brooklyn & DUMBO',
        borough: 'Brooklyn',
        capacityPct: 79,
        capacityMw: 290,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-74.007, 40.6805],
            [-73.972, 40.678],
            [-73.963, 40.6995],
            [-73.996, 40.7055],
            [-74.007, 40.6805],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      id: 'BK-WBG',
      properties: {
        id: 'BK-WBG',
        code: 'BK-01',
        name: 'Williamsburg & Greenpoint',
        borough: 'Brooklyn',
        capacityPct: 74,
        capacityMw: 230,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-73.969, 40.7045],
            [-73.936, 40.702],
            [-73.941, 40.735],
            [-73.9625, 40.7365],
            [-73.969, 40.7045],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      id: 'QN-LIC',
      properties: {
        id: 'QN-LIC',
        code: 'QN-02',
        name: 'Long Island City Corridor',
        borough: 'Queens',
        capacityPct: 86,
        capacityMw: 275,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-73.9615, 40.738],
            [-73.922, 40.7365],
            [-73.918, 40.7615],
            [-73.954, 40.7635],
            [-73.9615, 40.738],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      id: 'QN-AST',
      properties: {
        id: 'QN-AST',
        code: 'QN-01',
        name: 'Astoria Substation Zone',
        borough: 'Queens',
        capacityPct: 63,
        capacityMw: 260,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-73.944, 40.764],
            [-73.902, 40.762],
            [-73.893, 40.786],
            [-73.932, 40.789],
            [-73.944, 40.764],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      id: 'BX-HUB',
      properties: {
        id: 'BX-HUB',
        code: 'BX-01',
        name: 'South Bronx Energy Hub',
        borough: 'Bronx',
        capacityPct: 71,
        capacityMw: 210,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-73.934, 40.802],
            [-73.896, 40.7995],
            [-73.892, 40.8245],
            [-73.928, 40.8285],
            [-73.934, 40.802],
          ],
        ],
      },
    },
  ],
};

function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
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

/**
 * Generates 2,400 deterministic NYC infrastructure sensor points weighted by district capacity.
 */
export function generateNycSensors(totalCount = 2400): SensorPoint[] {
  const rng = createSeededRng(20250401);
  const sensors: SensorPoint[] = [];
  const features = NYC_DISTRICTS_GEOJSON.features;

  const perDistrict = Math.floor(totalCount / features.length);

  for (const feature of features) {
    const ring = feature.geometry.coordinates[0];
    const bbox = getBoundingBox(ring);
    const baseCapacity = feature.properties.capacityPct;

    let generated = 0;
    let attempts = 0;
    while (generated < perDistrict && attempts < perDistrict * 15) {
      attempts += 1;
      const lng = bbox.minLng + rng() * (bbox.maxLng - bbox.minLng);
      const lat = bbox.minLat + rng() * (bbox.maxLat - bbox.minLat);

      if (!isPointInPolygon(lng, lat, ring)) {
        continue;
      }

      const loadVariance = (rng() - 0.45) * 28;
      const loadPct = Math.max(18, Math.min(99, Math.round(baseCapacity + loadVariance)));
      const capacityKw = Math.round(120 + rng() * 680);
      const status: SensorPoint['status'] =
        loadPct >= 85 ? 'critical' : loadPct >= 70 ? 'elevated' : 'nominal';

      sensors.push({
        id: `${feature.id}-S${String(sensors.length + 1).padStart(4, '0')}`,
        position: [lng, lat],
        lat,
        lng,
        loadPct,
        capacityKw,
        districtId: feature.id,
        status,
      });
      generated += 1;
    }
  }

  return sensors;
}

export function buildDistrictSummaries(sensors: SensorPoint[]): DistrictSummary[] {
  return NYC_DISTRICTS_GEOJSON.features.map((feature) => {
    const ring = feature.geometry.coordinates[0];
    const matching = sensors.filter((s) => s.districtId === feature.id);
    const avgLoadPct =
      matching.length > 0
        ? Math.round(
            (matching.reduce((acc, s) => acc + s.loadPct, 0) / matching.length) * 10
          ) / 10
        : feature.properties.capacityPct;
    const peakLoadPct =
      matching.length > 0
        ? Math.max(...matching.map((s) => s.loadPct))
        : feature.properties.capacityPct;

    return {
      ...feature.properties,
      ring,
      centroid: computeRingCentroid(ring),
      areaKm2: computePolygonAreaKm2(ring),
      sensorCount: matching.length,
      avgLoadPct,
      peakLoadPct,
    };
  });
}
