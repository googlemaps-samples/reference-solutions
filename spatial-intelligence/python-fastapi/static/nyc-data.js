(function () {
  'use strict';

  const NYC_DISTRICTS_GEOJSON = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: 'dist-lower-manhattan',
        properties: {
          id: 'dist-lower-manhattan',
          name: 'Lower Manhattan Financial Grid',
          borough: 'Manhattan',
          capacityUtilization: 91.4,
          capacityTier: 'Critical',
          gridCapacityMw: 480,
          targetCount: 340,
          baseLoad: 86,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-74.0185, 40.7005],
              [-73.9775, 40.7095],
              [-73.9718, 40.7288],
              [-74.0115, 40.7285],
              [-74.0185, 40.7005],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        id: 'dist-midtown-core',
        properties: {
          id: 'dist-midtown-core',
          name: 'Midtown Transit & Substation Core',
          borough: 'Manhattan',
          capacityUtilization: 94.2,
          capacityTier: 'Critical',
          gridCapacityMw: 620,
          targetCount: 420,
          baseLoad: 90,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-74.0068, 40.7315],
              [-73.9685, 40.7318],
              [-73.9602, 40.7642],
              [-73.9985, 40.7645],
              [-74.0068, 40.7315],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        id: 'dist-upper-west',
        properties: {
          id: 'dist-upper-west',
          name: 'Upper West & Lincoln Corridor',
          borough: 'Manhattan',
          capacityUtilization: 72.8,
          capacityTier: 'Elevated',
          gridCapacityMw: 390,
          targetCount: 280,
          baseLoad: 69,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-73.9955, 40.7665],
              [-73.9665, 40.7668],
              [-73.9565, 40.7995],
              [-73.9825, 40.8012],
              [-73.9955, 40.7665],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        id: 'dist-upper-east',
        properties: {
          id: 'dist-upper-east',
          name: 'Upper East & Roosevelt Spine',
          borough: 'Manhattan',
          capacityUtilization: 78.6,
          capacityTier: 'High',
          gridCapacityMw: 410,
          targetCount: 280,
          baseLoad: 75,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-73.9642, 40.7668],
              [-73.9395, 40.7672],
              [-73.9328, 40.7998],
              [-73.9542, 40.7995],
              [-73.9642, 40.7668],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        id: 'dist-downtown-brooklyn',
        properties: {
          id: 'dist-downtown-brooklyn',
          name: 'Downtown Brooklyn & DUMBO Hub',
          borough: 'Brooklyn',
          capacityUtilization: 84.5,
          capacityTier: 'High',
          gridCapacityMw: 450,
          targetCount: 320,
          baseLoad: 81,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-74.0035, 40.6785],
              [-73.9685, 40.6788],
              [-73.9655, 40.7038],
              [-73.9975, 40.7042],
              [-74.0035, 40.6785],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        id: 'dist-williamsburg',
        properties: {
          id: 'dist-williamsburg',
          name: 'Williamsburg & Greenpoint Waterfront',
          borough: 'Brooklyn',
          capacityUtilization: 67.3,
          capacityTier: 'Elevated',
          gridCapacityMw: 340,
          targetCount: 260,
          baseLoad: 64,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-73.9675, 40.7045],
              [-73.9355, 40.7048],
              [-73.9398, 40.7365],
              [-73.9652, 40.7325],
              [-73.9675, 40.7045],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        id: 'dist-lic-queens',
        properties: {
          id: 'dist-lic-queens',
          name: 'Long Island City Intermodal Sector',
          borough: 'Queens',
          capacityUtilization: 81.2,
          capacityTier: 'High',
          gridCapacityMw: 430,
          targetCount: 280,
          baseLoad: 78,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-73.9615, 40.7355],
              [-73.9245, 40.7358],
              [-73.9205, 40.7648],
              [-73.9565, 40.7625],
              [-73.9615, 40.7355],
            ],
          ],
        },
      },
      {
        type: 'Feature',
        id: 'dist-astoria',
        properties: {
          id: 'dist-astoria',
          name: 'Astoria Generation & East River Basin',
          borough: 'Queens',
          capacityUtilization: 54.9,
          capacityTier: 'Nominal',
          gridCapacityMw: 510,
          targetCount: 220,
          baseLoad: 53,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-73.9375, 40.7662],
              [-73.9035, 40.7658],
              [-73.9005, 40.7918],
              [-73.9308, 40.7932],
              [-73.9375, 40.7662],
            ],
          ],
        },
      },
    ],
  };

  function createRng(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pointInRing(lng, lat, ring) {
    if (!Array.isArray(ring) || ring.length < 3) return false;
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0];
      const yi = ring[i][1];
      const xj = ring[j][0];
      const yj = ring[j][1];
      const intersect =
        yi > lat !== yj > lat &&
        lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-15) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function pointInPolygon(lng, lat, coordinates) {
    if (!Array.isArray(coordinates) || coordinates.length === 0) return false;
    if (!pointInRing(lng, lat, coordinates[0])) return false;
    for (let i = 1; i < coordinates.length; i += 1) {
      if (pointInRing(lng, lat, coordinates[i])) return false;
    }
    return true;
  }

  function computeBoundingBox(ring) {
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

  function computePolygonCentroid(ring) {
    if (!Array.isArray(ring) || ring.length === 0) {
      return { lat: 40.73061, lng: -73.98661 };
    }
    const len =
      ring.length > 1 &&
      ring[0][0] === ring[ring.length - 1][0] &&
      ring[0][1] === ring[ring.length - 1][1]
        ? ring.length - 1
        : ring.length;
    let sumLng = 0;
    let sumLat = 0;
    for (let i = 0; i < len; i += 1) {
      sumLng += ring[i][0];
      sumLat += ring[i][1];
    }
    return {
      lat: sumLat / Math.max(1, len),
      lng: sumLng / Math.max(1, len),
    };
  }

  function computePolygonAreaKm2(ring) {
    if (!Array.isArray(ring) || ring.length < 3) return 0;
    const EARTH_RADIUS_M = 6371008.8;
    const toRad = (deg) => (deg * Math.PI) / 180;
    let total = 0;
    for (let i = 0; i < ring.length; i += 1) {
      const p1 = ring[i];
      const p2 = ring[(i + 1) % ring.length];
      const lon1 = toRad(p1[0]);
      const lat1 = toRad(p1[1]);
      const lon2 = toRad(p2[0]);
      const lat2 = toRad(p2[1]);
      total += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    }
    const areaSqMeters = Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
    return areaSqMeters / 1_000_000;
  }

  function getCapacityColor(utilizationPct) {
    if (utilizationPct >= 90) {
      return { fill: '#ef4444', stroke: '#b91c1c', rgb: [239, 68, 68] };
    }
    if (utilizationPct >= 78) {
      return { fill: '#f97316', stroke: '#c2410c', rgb: [249, 115, 22] };
    }
    if (utilizationPct >= 65) {
      return { fill: '#eab308', stroke: '#a16207', rgb: [234, 179, 8] };
    }
    return { fill: '#10b981', stroke: '#047857', rgb: [16, 185, 129] };
  }

  function generateSensors() {
    const rng = createRng(20261119);
    const sensors = [];
    let seq = 1;

    for (const feature of NYC_DISTRICTS_GEOJSON.features) {
      const ring = feature.geometry.coordinates[0];
      const bbox = computeBoundingBox(ring);
      const { id: districtId, targetCount, baseLoad } = feature.properties;

      let added = 0;
      let attempts = 0;
      while (added < targetCount && attempts < targetCount * 20) {
        attempts += 1;
        const lng = bbox.minLng + rng() * (bbox.maxLng - bbox.minLng);
        const lat = bbox.minLat + rng() * (bbox.maxLat - bbox.minLat);
        if (!pointInRing(lng, lat, ring)) continue;

        const jitter = (rng() - 0.5) * 26;
        const loadPct = Math.max(22, Math.min(99.5, Number((baseLoad + jitter).toFixed(1))));
        const capacityMw = Number((0.8 + rng() * 3.4).toFixed(2));
        sensors.push({
          id: `NYC-SNS-${String(seq).padStart(4, '0')}`,
          districtId,
          lat,
          lng,
          position: [lng, lat],
          loadPct,
          capacityMw,
          status: loadPct >= 90 ? 'critical' : loadPct >= 78 ? 'elevated' : 'nominal',
        });
        seq += 1;
        added += 1;
      }
    }

    return sensors;
  }

  const sensors = generateSensors();

  window.NYC_SPATIAL_DATA = {
    districtsGeoJson: NYC_DISTRICTS_GEOJSON,
    sensors,
    pointInRing,
    pointInPolygon,
    computeBoundingBox,
    computePolygonCentroid,
    computePolygonAreaKm2,
    getCapacityColor,
  };
})();
