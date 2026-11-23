import { NYC_DISTRICTS_GEOJSON } from './nycDistricts';
import type { SensorPoint, SensorSector } from '../types/gis';
import { computePolygonCentroid, getBoundsForRing, isPointInPolygon } from '../utils/geometry';

const SECTORS: SensorSector[] = ['power', 'transit', 'telecom', 'water'];

/**
 * Deterministic PRNG (Mulberry32) so sensor telemetry is reproducible across renders.
 */
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

/**
 * Generates ~2,400 realistic NYC infrastructure sensor points distributed across districts
 * and surrounding urban corridors.
 */
export function generateNycSensors(targetCount = 2400): SensorPoint[] {
  const rand = createSeededRandom(20261119);
  const sensors: SensorPoint[] = [];

  const districts = NYC_DISTRICTS_GEOJSON.features;
  const districtMeta = districts.map((feature) => ({
    feature,
    bounds: getBoundsForRing(feature.geometry.coordinates[0]),
    centroid: computePolygonCentroid(feature.geometry.coordinates[0])
  }));

  // Allocate ~85% of sensors within district bounds (weighted slightly toward higher-capacity hubs)
  // and ~15% across wider NYC arterial corridors.
  const districtQuota = Math.floor(targetCount * 0.85);
  let idCounter = 1;

  for (let i = 0; i < districtQuota; i++) {
    const meta = districtMeta[i % districtMeta.length];
    const { feature, bounds, centroid } = meta;

    let lng = centroid.lng;
    let lat = centroid.lat;
    let placed = false;

    for (let attempt = 0; attempt < 18; attempt++) {
      const candLng = bounds.west + rand() * (bounds.east - bounds.west);
      const candLat = bounds.south + rand() * (bounds.north - bounds.south);
      if (isPointInPolygon(candLng, candLat, feature.geometry.coordinates)) {
        lng = candLng;
        lat = candLat;
        placed = true;
        break;
      }
    }

    if (!placed) {
      lng = centroid.lng + (rand() - 0.5) * 0.008;
      lat = centroid.lat + (rand() - 0.5) * 0.006;
    }

    const baseLoad = feature.properties.capacityPct;
    const jitter = (rand() - 0.45) * 28;
    const capacityLoad = Math.max(12, Math.min(99, Math.round((baseLoad + jitter) * 10) / 10));
    const sector = SECTORS[Math.floor(rand() * SECTORS.length)];
    const status =
      capacityLoad >= 84 ? 'critical' : capacityLoad >= 68 ? 'warning' : 'nominal';

    sensors.push({
      id: `NYC-SNS-${String(idCounter++).padStart(4, '0')}`,
      lng,
      lat,
      capacityLoad,
      sector,
      districtId: feature.properties.districtId,
      status
    });
  }

  // Remaining ~15% distributed across greater NYC bridges, tunnels, and outer transit corridors
  while (sensors.length < targetCount) {
    const lng = -74.028 + rand() * (74.028 - 73.865);
    const lat = 40.668 + rand() * (40.835 - 40.668);

    let matchedDistrict = 'nyc-corridor';
    for (const meta of districtMeta) {
      if (isPointInPolygon(lng, lat, meta.feature.geometry.coordinates)) {
        matchedDistrict = meta.feature.properties.districtId;
        break;
      }
    }

    const capacityLoad = Math.round((28 + rand() * 64) * 10) / 10;
    const sector = SECTORS[Math.floor(rand() * SECTORS.length)];
    const status =
      capacityLoad >= 84 ? 'critical' : capacityLoad >= 68 ? 'warning' : 'nominal';

    sensors.push({
      id: `NYC-SNS-${String(idCounter++).padStart(4, '0')}`,
      lng,
      lat,
      capacityLoad,
      sector,
      districtId: matchedDistrict,
      status
    });
  }

  return sensors;
}

export const NYC_SENSORS = generateNycSensors(2400);
