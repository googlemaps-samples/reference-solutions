import type {
  DistrictGeoJsonCollection,
  SensorCategory,
  SensorPoint
} from '$lib/types/gis';
import { computeBoundsForRing, isPointInPolygonRings } from '$lib/utils/geo';

export const NYC_CENTER = { lat: 40.73061, lng: -73.98661 } as const;
export const NYC_DEFAULT_ZOOM = 12;

export const NYC_DISTRICTS_GEOJSON: DistrictGeoJsonCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'D-MN-01',
      properties: {
        id: 'D-MN-01',
        name: 'Lower Manhattan & Financial Grid',
        borough: 'Manhattan',
        capacityUtilization: 92,
        capacityMW: 1480,
        substationCount: 14,
        status: 'Critical Load',
        centroid: { lat: 40.7115, lng: -74.0065 }
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-74.0185, 40.7005],
            [-73.9985, 40.7035],
            [-73.9785, 40.7135],
            [-73.9865, 40.7255],
            [-74.0115, 40.7255],
            [-74.0185, 40.7005]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'D-MN-02',
      properties: {
        id: 'D-MN-02',
        name: 'Midtown Transit & Commercial Core',
        borough: 'Manhattan',
        capacityUtilization: 86,
        capacityMW: 2150,
        substationCount: 19,
        status: 'High Load',
        centroid: { lat: 40.7525, lng: -73.9835 }
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-74.0085, 40.7285],
            [-73.9725, 40.7285],
            [-73.9625, 40.7685],
            [-73.9955, 40.7745],
            [-74.0085, 40.7285]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'D-MN-03',
      properties: {
        id: 'D-MN-03',
        name: 'Upper Manhattan & Harlem Corridor',
        borough: 'Manhattan',
        capacityUtilization: 68,
        capacityMW: 980,
        substationCount: 11,
        status: 'Optimal',
        centroid: { lat: 40.7995, lng: -73.9525 }
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-73.9825, 40.7755],
            [-73.9385, 40.7775],
            [-73.9295, 40.8255],
            [-73.9595, 40.8295],
            [-73.9825, 40.7755]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'D-BK-01',
      properties: {
        id: 'D-BK-01',
        name: 'Downtown Brooklyn & Navy Yard',
        borough: 'Brooklyn',
        capacityUtilization: 79,
        capacityMW: 1320,
        substationCount: 12,
        status: 'Elevated',
        centroid: { lat: 40.6955, lng: -73.9805 }
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-74.0015, 40.6805],
            [-73.9565, 40.6805],
            [-73.9515, 40.7135],
            [-73.9975, 40.7065],
            [-74.0015, 40.6805]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'D-BK-02',
      properties: {
        id: 'D-BK-02',
        name: 'South Brooklyn Waterfront & Red Hook',
        borough: 'Brooklyn',
        capacityUtilization: 54,
        capacityMW: 760,
        substationCount: 8,
        status: 'Nominal',
        centroid: { lat: 40.6605, lng: -73.9975 }
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-74.0225, 40.6405],
            [-73.9705, 40.6405],
            [-73.9685, 40.6775],
            [-74.0175, 40.6785],
            [-74.0225, 40.6405]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'D-QN-01',
      properties: {
        id: 'D-QN-01',
        name: 'Long Island City & Astoria Hub',
        borough: 'Queens',
        capacityUtilization: 83,
        capacityMW: 1540,
        substationCount: 15,
        status: 'High Load',
        centroid: { lat: 40.7535, lng: -73.9305 }
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-73.9585, 40.7335],
            [-73.9025, 40.7335],
            [-73.8985, 40.7795],
            [-73.9445, 40.7795],
            [-73.9585, 40.7335]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'D-BX-01',
      properties: {
        id: 'D-BX-01',
        name: 'South Bronx Freight & Substation Zone',
        borough: 'Bronx',
        capacityUtilization: 74,
        capacityMW: 1120,
        substationCount: 10,
        status: 'Elevated',
        centroid: { lat: 40.8135, lng: -73.9135 }
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-73.9335, 40.7965],
            [-73.8885, 40.7965],
            [-73.8845, 40.8315],
            [-73.9285, 40.8315],
            [-73.9335, 40.7965]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'D-SI-01',
      properties: {
        id: 'D-SI-01',
        name: 'Staten Island North Shore Terminal',
        borough: 'Staten Island',
        capacityUtilization: 42,
        capacityMW: 520,
        substationCount: 6,
        status: 'Nominal',
        centroid: { lat: 40.6355, lng: -74.0855 }
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-74.1155, 40.6185],
            [-74.0625, 40.6185],
            [-74.0655, 40.6495],
            [-74.1125, 40.6495],
            [-74.1155, 40.6185]
          ]
        ]
      }
    }
  ]
};

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SENSOR_CATEGORIES: SensorCategory[] = [
  'Substation Telemetry',
  'Transit Signal',
  'Grid Inverter',
  'Water Main Pressure'
];

/**
 * Generates ~2,400 deterministic NYC infrastructure telemetry sensor points
 * weighted across all 8 NYC infrastructure districts.
 */
export function generateNycSensors(totalPoints = 2400): SensorPoint[] {
  const rand = mulberry32(20261119);
  const sensors: SensorPoint[] = [];
  const features = NYC_DISTRICTS_GEOJSON.features;
  const perDistrict = Math.floor(totalPoints / features.length);

  for (let dIdx = 0; dIdx < features.length; dIdx++) {
    const feature = features[dIdx];
    const bounds = computeBoundsForRing(feature.geometry.coordinates[0]);
    const targetCount =
      dIdx === features.length - 1
        ? totalPoints - sensors.length
        : perDistrict;

    let created = 0;
    let attempts = 0;
    while (created < targetCount && attempts < targetCount * 12) {
      attempts++;
      const lng = bounds.west + rand() * (bounds.east - bounds.west);
      const lat = bounds.south + rand() * (bounds.north - bounds.south);

      if (!isPointInPolygonRings(lng, lat, feature.geometry.coordinates)) {
        continue;
      }

      const baseUtil = feature.properties.capacityUtilization;
      const jitter = (rand() - 0.5) * 24;
      const loadPct = Math.max(18, Math.min(99, Math.round(baseUtil + jitter)));
      const outputMW = Number((0.4 + rand() * 3.8 * (loadPct / 75)).toFixed(2));
      const category =
        SENSOR_CATEGORIES[Math.floor(rand() * SENSOR_CATEGORIES.length)];
      const health: SensorPoint['health'] =
        loadPct >= 88 ? 'critical' : loadPct >= 72 ? 'elevated' : 'nominal';

      sensors.push({
        id: `NYC-SNS-${String(sensors.length + 1).padStart(4, '0')}`,
        districtId: feature.properties.id,
        category,
        lng: Number(lng.toFixed(6)),
        lat: Number(lat.toFixed(6)),
        loadPct,
        outputMW,
        health
      });
      created++;
    }
  }

  return sensors;
}

export const NYC_INFRASTRUCTURE_SENSORS: SensorPoint[] = generateNycSensors(2400);
