export interface DistrictProperties {
  id: string;
  name: string;
  borough: string;
  capacityMw: number;
  utilizationPct: number;
  gridTier: 'Critical' | 'High' | 'Moderate' | 'Optimal';
  substationCount: number;
  targetSla: string;
  areaKm2: number;
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
  lng: number;
  lat: number;
  loadPct: number;
  capacityKw: number;
  sensorType: 'Substation' | 'EV Feeder' | 'Transit Node' | 'Smart Meter';
  districtId: string;
  status: 'Normal' | 'Elevated' | 'Peak';
}

interface RawDistrictDef {
  id: string;
  name: string;
  borough: string;
  capacityMw: number;
  utilizationPct: number;
  substationCount: number;
  targetSla: string;
  ring: [number, number][];
}

const RAW_DISTRICTS: RawDistrictDef[] = [
  {
    id: 'mn-lower',
    name: 'Lower Manhattan Grid',
    borough: 'Manhattan',
    capacityMw: 640,
    utilizationPct: 86,
    substationCount: 14,
    targetSla: '99.99%',
    ring: [
      [-74.0185, 40.7005],
      [-74.0060, 40.7022],
      [-73.9975, 40.7082],
      [-73.9785, 40.7115],
      [-73.9742, 40.7238],
      [-73.9935, 40.7275],
      [-74.0118, 40.7268],
      [-74.0185, 40.7005],
    ],
  },
  {
    id: 'mn-midtown',
    name: 'Midtown Core Corridor',
    borough: 'Manhattan',
    capacityMw: 890,
    utilizationPct: 91,
    substationCount: 19,
    targetSla: '99.99%',
    ring: [
      [-73.9965, 40.7412],
      [-73.9718, 40.7405],
      [-73.9630, 40.7575],
      [-73.9562, 40.7685],
      [-73.9825, 40.7720],
      [-73.9932, 40.7605],
      [-73.9965, 40.7412],
    ],
  },
  {
    id: 'mn-hudson-chelsea',
    name: 'Hudson Yards & Chelsea',
    borough: 'Manhattan',
    capacityMw: 520,
    utilizationPct: 74,
    substationCount: 11,
    targetSla: '99.95%',
    ring: [
      [-74.0112, 40.7272],
      [-73.9935, 40.7275],
      [-73.9965, 40.7412],
      [-73.9932, 40.7605],
      [-74.0038, 40.7625],
      [-74.0098, 40.7450],
      [-74.0112, 40.7272],
    ],
  },
  {
    id: 'mn-ues-harlem',
    name: 'Upper East & Central Park North',
    borough: 'Manhattan',
    capacityMw: 475,
    utilizationPct: 62,
    substationCount: 10,
    targetSla: '99.95%',
    ring: [
      [-73.9720, 40.7685],
      [-73.9562, 40.7685],
      [-73.9422, 40.7855],
      [-73.9365, 40.8035],
      [-73.9585, 40.8068],
      [-73.9690, 40.7885],
      [-73.9720, 40.7685],
    ],
  },
  {
    id: 'bk-downtown',
    name: 'Downtown Brooklyn & DUMBO',
    borough: 'Brooklyn',
    capacityMw: 560,
    utilizationPct: 78,
    substationCount: 13,
    targetSla: '99.98%',
    ring: [
      [-74.0035, 40.6815],
      [-73.9725, 40.6805],
      [-73.9672, 40.6968],
      [-73.9795, 40.7038],
      [-73.9965, 40.7032],
      [-74.0065, 40.6925],
      [-74.0035, 40.6815],
    ],
  },
  {
    id: 'bk-williamsburg',
    name: 'Williamsburg & Greenpoint',
    borough: 'Brooklyn',
    capacityMw: 430,
    utilizationPct: 58,
    substationCount: 9,
    targetSla: '99.90%',
    ring: [
      [-73.9688, 40.7050],
      [-73.9425, 40.7042],
      [-73.9378, 40.7265],
      [-73.9520, 40.7385],
      [-73.9625, 40.7335],
      [-73.9688, 40.7050],
    ],
  },
  {
    id: 'qn-lic',
    name: 'Long Island City Hub',
    borough: 'Queens',
    capacityMw: 495,
    utilizationPct: 69,
    substationCount: 12,
    targetSla: '99.95%',
    ring: [
      [-73.9595, 40.7392],
      [-73.9310, 40.7385],
      [-73.9245, 40.7575],
      [-73.9485, 40.7618],
      [-73.9595, 40.7495],
      [-73.9595, 40.7392],
    ],
  },
  {
    id: 'qn-astoria',
    name: 'Astoria & Sunnyside Grid',
    borough: 'Queens',
    capacityMw: 410,
    utilizationPct: 43,
    substationCount: 8,
    targetSla: '99.90%',
    ring: [
      [-73.9380, 40.7618],
      [-73.9045, 40.7555],
      [-73.8980, 40.7770],
      [-73.9235, 40.7852],
      [-73.9395, 40.7735],
      [-73.9380, 40.7618],
    ],
  },
];

function classifyTier(utilizationPct: number): DistrictProperties['gridTier'] {
  if (utilizationPct >= 80) return 'Critical';
  if (utilizationPct >= 65) return 'High';
  if (utilizationPct >= 50) return 'Moderate';
  return 'Optimal';
}

function computePolygonAreaKm2(ring: [number, number][]): number {
  const earthRadiusM = 6371008.8;
  let areaRad = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [lng1, lat1] = ring[i];
    const [lng2, lat2] = ring[i + 1];
    const p1Lng = (lng1 * Math.PI) / 180;
    const p1Lat = (lat1 * Math.PI) / 180;
    const p2Lng = (lng2 * Math.PI) / 180;
    const p2Lat = (lat2 * Math.PI) / 180;
    areaRad += (p2Lng - p1Lng) * (2 + Math.sin(p1Lat) + Math.sin(p2Lat));
  }
  const areaM2 = Math.abs((areaRad * earthRadiusM * earthRadiusM) / 2);
  return Number((areaM2 / 1_000_000).toFixed(2));
}

function pointInRing(lng: number, lat: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function createPrng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SENSOR_TYPES: SensorPoint['sensorType'][] = [
  'Substation',
  'EV Feeder',
  'Transit Node',
  'Smart Meter',
];

function buildSpatialDataset(): {
  districts: DistrictFeatureCollection;
  sensors: SensorPoint[];
} {
  const features: DistrictFeature[] = RAW_DISTRICTS.map((d) => ({
    type: 'Feature',
    id: d.id,
    properties: {
      id: d.id,
      name: d.name,
      borough: d.borough,
      capacityMw: d.capacityMw,
      utilizationPct: d.utilizationPct,
      gridTier: classifyTier(d.utilizationPct),
      substationCount: d.substationCount,
      targetSla: d.targetSla,
      areaKm2: computePolygonAreaKm2(d.ring),
    },
    geometry: {
      type: 'Polygon',
      coordinates: [d.ring],
    },
  }));

  const rand = createPrng(20260319);
  const sensors: SensorPoint[] = [];
  const totalTarget = 2400;
  const perDistrict = Math.floor(totalTarget / RAW_DISTRICTS.length); // 300 per district = 2,400 total

  let seq = 1;
  for (const district of RAW_DISTRICTS) {
    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    for (const [lng, lat] of district.ring) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }

    let placed = 0;
    let attempts = 0;
    while (placed < perDistrict && attempts < perDistrict * 25) {
      attempts++;
      const lng = minLng + rand() * (maxLng - minLng);
      const lat = minLat + rand() * (maxLat - minLat);
      if (!pointInRing(lng, lat, district.ring)) continue;

      const jitter = (rand() - 0.5) * 28;
      const loadPct = Math.max(12, Math.min(99, Math.round(district.utilizationPct + jitter)));
      const status: SensorPoint['status'] =
        loadPct >= 80 ? 'Peak' : loadPct >= 62 ? 'Elevated' : 'Normal';

      sensors.push({
        id: `NYC-${String(seq).padStart(4, '0')}`,
        lng: Number(lng.toFixed(6)),
        lat: Number(lat.toFixed(6)),
        loadPct,
        capacityKw: Math.round(120 + rand() * 880),
        sensorType: SENSOR_TYPES[Math.floor(rand() * SENSOR_TYPES.length)],
        districtId: district.id,
        status,
      });
      seq++;
      placed++;
    }
  }

  return {
    districts: {
      type: 'FeatureCollection',
      features,
    },
    sensors,
  };
}

export const NYC_SPATIAL_DATA = buildSpatialDataset();
