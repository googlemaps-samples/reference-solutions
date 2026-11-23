/**
 * NYC Infrastructure Districts GeoJSON & Deterministic Sensor Dataset
 * Centered around New York City (40.73061, -73.98661).
 */

export const NYC_CENTER = { lat: 40.73061, lng: -73.98661 };
export const INITIAL_ZOOM = 12;

export const NYC_DISTRICTS_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'lower-manhattan',
      properties: {
        id: 'lower-manhattan',
        name: 'Lower Manhattan Grid',
        borough: 'Manhattan',
        capacityLoadPct: 86,
        substationCount: 14,
        peakMw: 1420,
        gridTier: 'Critical Core',
        sensorTarget: 460,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-74.0185, 40.7005],
          [-73.9780, 40.7095],
          [-73.9720, 40.7320],
          [-74.0095, 40.7365],
          [-74.0185, 40.7005],
        ]],
      },
    },
    {
      type: 'Feature',
      id: 'midtown-core',
      properties: {
        id: 'midtown-core',
        name: 'Midtown Core Network',
        borough: 'Manhattan',
        capacityLoadPct: 92,
        substationCount: 19,
        peakMw: 2180,
        gridTier: 'High-Density Tier 1',
        sensorTarget: 520,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-74.0075, 40.7375],
          [-73.9665, 40.7330],
          [-73.9520, 40.7685],
          [-73.9965, 40.7745],
          [-74.0075, 40.7375],
        ]],
      },
    },
    {
      type: 'Feature',
      id: 'upper-manhattan',
      properties: {
        id: 'upper-manhattan',
        name: 'Upper West & Harlem Sector',
        borough: 'Manhattan',
        capacityLoadPct: 64,
        substationCount: 11,
        peakMw: 980,
        gridTier: 'Balanced Growth',
        sensorTarget: 360,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-73.9945, 40.7755],
          [-73.9495, 40.7695],
          [-73.9335, 40.8120],
          [-73.9735, 40.8165],
          [-73.9945, 40.7755],
        ]],
      },
    },
    {
      type: 'Feature',
      id: 'downtown-brooklyn',
      properties: {
        id: 'downtown-brooklyn',
        name: 'Downtown Brooklyn Hub',
        borough: 'Brooklyn',
        capacityLoadPct: 78,
        substationCount: 13,
        peakMw: 1310,
        gridTier: 'Elevated Load',
        sensorTarget: 400,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-74.0065, 40.6730],
          [-73.9615, 40.6725],
          [-73.9595, 40.7035],
          [-73.9995, 40.7030],
          [-74.0065, 40.6730],
        ]],
      },
    },
    {
      type: 'Feature',
      id: 'williamsburg-greenpoint',
      properties: {
        id: 'williamsburg-greenpoint',
        name: 'Williamsburg-Greenpoint Grid',
        borough: 'Brooklyn',
        capacityLoadPct: 58,
        substationCount: 9,
        peakMw: 840,
        gridTier: 'Nominal Capacity',
        sensorTarget: 330,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-73.9690, 40.7045],
          [-73.9270, 40.7025],
          [-73.9330, 40.7375],
          [-73.9640, 40.7365],
          [-73.9690, 40.7045],
        ]],
      },
    },
    {
      type: 'Feature',
      id: 'long-island-city',
      properties: {
        id: 'long-island-city',
        name: 'Long Island City Corridor',
        borough: 'Queens',
        capacityLoadPct: 73,
        substationCount: 12,
        peakMw: 1190,
        gridTier: 'Transit Expansion',
        sensorTarget: 330,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-73.9610, 40.7385],
          [-73.9165, 40.7365],
          [-73.9125, 40.7745],
          [-73.9515, 40.7730],
          [-73.9610, 40.7385],
        ]],
      },
    },
  ],
};

function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Ray-casting point-in-ring test for [lng, lat] coordinates.
 */
export function pointInRing(point, ring) {
  const x = point[0];
  const y = point[1];
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
 * Point-in-polygon supporting GeoJSON Polygon coordinates (outer ring + holes).
 */
export function pointInPolygon(lng, lat, polygonCoords) {
  if (!Array.isArray(polygonCoords) || polygonCoords.length === 0) return false;
  if (!pointInRing([lng, lat], polygonCoords[0])) return false;
  for (let h = 1; h < polygonCoords.length; h++) {
    if (pointInRing([lng, lat], polygonCoords[h])) return false;
  }
  return true;
}

/**
 * Computes ring bounding box [minLng, minLat, maxLng, maxLat].
 */
export function getRingBounds(ring) {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of ring) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }
  return { minLng, minLat, maxLng, maxLat };
}

/**
 * Computes centroid [lng, lat] of a GeoJSON outer ring.
 */
export function getRingCentroid(ring) {
  if (!ring || ring.length === 0) return [NYC_CENTER.lng, NYC_CENTER.lat];
  let sumLng = 0;
  let sumLat = 0;
  const count =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.length - 1
      : ring.length;
  for (let i = 0; i < count; i++) {
    sumLng += ring[i][0];
    sumLat += ring[i][1];
  }
  return [sumLng / Math.max(1, count), sumLat / Math.max(1, count)];
}

/**
 * Computes approximate geodesic polygon area in square kilometers using spherical excess.
 */
export function computePolygonAreaKm2(ring) {
  if (!Array.isArray(ring) || ring.length < 3) return 0;
  const earthRadiusKm = 6371.0088;
  const toRad = (deg) => (deg * Math.PI) / 180;
  let total = 0;
  const len = ring.length;
  for (let i = 0; i < len; i++) {
    const p1 = ring[i];
    const p2 = ring[(i + 1) % len];
    total +=
      toRad(p2[0] - p1[0]) *
      (2 + Math.sin(toRad(p1[1])) + Math.sin(toRad(p2[1])));
  }
  return Math.abs((total * earthRadiusKm * earthRadiusKm) / 2);
}

/**
 * Generates ~2,400 deterministic infrastructure telemetry sensors inside the NYC district polygons.
 */
export function generateNycSensors() {
  const rand = mulberry32(20260301);
  const sensors = [];
  let seq = 1;

  for (const feature of NYC_DISTRICTS_GEOJSON.features) {
    const props = feature.properties;
    const coords = feature.geometry.coordinates;
    const ring = coords[0];
    const bounds = getRingBounds(ring);
    const baseLoad = props.capacityLoadPct;
    const target = props.sensorTarget;

    let created = 0;
    let attempts = 0;
    while (created < target && attempts < target * 15) {
      attempts++;
      const lng = bounds.minLng + rand() * (bounds.maxLng - bounds.minLng);
      const lat = bounds.minLat + rand() * (bounds.maxLat - bounds.minLat);
      if (!pointInPolygon(lng, lat, coords)) continue;

      const jitter = (rand() - 0.5) * 32;
      const loadPct = Math.max(12, Math.min(99, Math.round(baseLoad + jitter)));
      const kw = Math.round(120 + loadPct * 6.5 + rand() * 85);
      const status =
        loadPct >= 85 ? 'critical' : loadPct >= 65 ? 'elevated' : 'nominal';

      sensors.push({
        id: `NYC-SNS-${String(seq++).padStart(4, '0')}`,
        position: [Number(lng.toFixed(6)), Number(lat.toFixed(6))],
        districtId: props.id,
        districtName: props.name,
        loadPct,
        kw,
        status,
      });
      created++;
    }
  }

  return sensors;
}

export const NYC_SENSORS = generateNycSensors();

export function summarizeSensors(sensorList) {
  const count = sensorList.length;
  if (count === 0) {
    return {
      count: 0,
      avgLoad: 0,
      peakLoad: 0,
      criticalCount: 0,
      totalMw: 0,
    };
  }
  let sumLoad = 0;
  let peakLoad = 0;
  let criticalCount = 0;
  let totalKw = 0;
  for (const s of sensorList) {
    sumLoad += s.loadPct;
    if (s.loadPct > peakLoad) peakLoad = s.loadPct;
    if (s.status === 'critical') criticalCount++;
    totalKw += s.kw;
  }
  return {
    count,
    avgLoad: Math.round((sumLoad / count) * 10) / 10,
    peakLoad,
    criticalCount,
    totalMw: Math.round((totalKw / 1000) * 10) / 10,
  };
}
