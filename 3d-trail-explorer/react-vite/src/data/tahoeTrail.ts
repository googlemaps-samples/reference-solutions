import type { ElevationSample, TrailChapter, TrailMetrics } from '../types/explorer';

export const TAHOE_INITIAL_CENTER = {
  lat: 38.9542,
  lng: -120.1103,
  altitude: 1905
} as const;

export const TAHOE_INITIAL_CAMERA = {
  center: TAHOE_INITIAL_CENTER,
  heading: 315,
  tilt: 64,
  range: 3400
} as const;

export const SEED_SEARCH_QUERY = 'Emerald Bay State Park, Lake Tahoe';

export const TRAIL_CHAPTERS: TrailChapter[] = [
  {
    id: 'overview',
    testId: 'chapter-btn-overview',
    stepNumber: 1,
    title: '1. Emerald Bay Overview',
    subtitle: 'Fannette Island & Glacial Basin',
    description:
      'Panoramic aerial vantage above Fannette Island and Emerald Bay, framed by Sierra Nevada granite ridges and turquoise glacial waters.',
    position: { lat: 38.9542, lng: -120.1103 },
    camera: {
      center: { lat: 38.9542, lng: -120.1103, altitude: 1905 },
      heading: 315,
      tilt: 64,
      range: 3400
    },
    pinGlyph: '1',
    pinBackground: '#0ea5e9',
    pinBorderColor: '#e0f2fe',
    placesSearchQuery: 'Emerald Bay State Park, Lake Tahoe'
  },
  {
    id: 'trailhead',
    testId: 'chapter-btn-trailhead',
    stepNumber: 2,
    title: '2. Eagle Falls Trailhead',
    subtitle: 'Cascade Gorge & Footbridge',
    description:
      'Western trailhead perched above Highway 89 where snowmelt cascades down granite chutes toward Vikingsholm.',
    position: { lat: 38.9502, lng: -120.1178 },
    camera: {
      center: { lat: 38.9502, lng: -120.1178, altitude: 2010 },
      heading: 245,
      tilt: 68,
      range: 1450
    },
    pinGlyph: '2',
    pinBackground: '#f97316',
    pinBorderColor: '#ffedd5',
    placesSearchQuery: 'Eagle Falls Trailhead, South Lake Tahoe'
  },
  {
    id: 'ridge',
    testId: 'chapter-btn-ridge',
    stepNumber: 3,
    title: '3. Rubicon Ridge',
    subtitle: 'North Shore Granite Traverse',
    description:
      'Elevated lakeshore traverse hugging sheer cliffs between Emerald Point and Rubicon Point with unobstructed views across the bay.',
    position: { lat: 38.9636, lng: -120.1066 },
    camera: {
      center: { lat: 38.9636, lng: -120.1066, altitude: 1985 },
      heading: 18,
      tilt: 72,
      range: 1650
    },
    pinGlyph: '3',
    pinBackground: '#ef4444',
    pinBorderColor: '#fee2e2',
    placesSearchQuery: 'Rubicon Trail, Emerald Bay, Lake Tahoe'
  },
  {
    id: 'overlook',
    testId: 'chapter-btn-overlook',
    stepNumber: 4,
    title: '4. Eagle Point Overlook',
    subtitle: 'East Peninsula Rim',
    description:
      'Dramatic promontory guarding the mouth of Emerald Bay with crisp sightlines toward Eagle Rock and Vikingsholm Cove.',
    position: { lat: 38.9519, lng: -120.0974 },
    camera: {
      center: { lat: 38.9519, lng: -120.0974, altitude: 1945 },
      heading: 292,
      tilt: 70,
      range: 1550
    },
    pinGlyph: '4',
    pinBackground: '#10b981',
    pinBorderColor: '#d1fae5',
    placesSearchQuery: 'Eagle Point, Emerald Bay, Lake Tahoe'
  },
  {
    id: 'summit',
    testId: 'chapter-btn-summit',
    stepNumber: 5,
    title: '5. Tahoe Summit Panorama',
    subtitle: 'Alpine Crest · 360° Vista',
    description:
      'High Sierra crestline overlooking the full expanse of Lake Tahoe, Emerald Bay, and the Desolation Wilderness peaks.',
    position: { lat: 38.9722, lng: -120.1252 },
    camera: {
      center: { lat: 38.9722, lng: -120.1252, altitude: 2440 },
      heading: 132,
      tilt: 75,
      range: 2800
    },
    pinGlyph: '5',
    pinBackground: '#8b5cf6',
    pinBorderColor: '#ede9fe',
    placesSearchQuery: 'Rubicon Peak, Lake Tahoe'
  }
];

/**
 * 2D coordinates along the Emerald Bay -> Eagle Falls -> Rubicon Ridge -> Tahoe Summit -> Eagle Point trail.
 * Used for both Elevation API path sampling and extruded 3D Polyline3D rendering.
 */
export const TAHOE_TRAIL_WAYPOINTS: google.maps.LatLngLiteral[] = [
  { lat: 38.9502, lng: -120.1178 }, // Eagle Falls Trailhead
  { lat: 38.9511, lng: -120.1161 },
  { lat: 38.9522, lng: -120.1146 },
  { lat: 38.9531, lng: -120.1135 },
  { lat: 38.9543, lng: -120.1128 },
  { lat: 38.9557, lng: -120.1119 },
  { lat: 38.9571, lng: -120.1107 },
  { lat: 38.9588, lng: -120.1095 },
  { lat: 38.9606, lng: -120.1082 },
  { lat: 38.9621, lng: -120.1073 },
  { lat: 38.9636, lng: -120.1066 }, // Rubicon Ridge
  { lat: 38.9654, lng: -120.1088 },
  { lat: 38.9675, lng: -120.1124 },
  { lat: 38.9696, lng: -120.1169 },
  { lat: 38.9712, lng: -120.1213 },
  { lat: 38.9722, lng: -120.1252 }, // Tahoe Summit Panorama
  { lat: 38.9698, lng: -120.1201 },
  { lat: 38.9665, lng: -120.1132 },
  { lat: 38.9629, lng: -120.1038 },
  { lat: 38.9592, lng: -120.0991 },
  { lat: 38.9555, lng: -120.0978 },
  { lat: 38.9519, lng: -120.0974 }  // Eagle Point Overlook
];

export const TAHOE_TRAIL_3D_PATH: google.maps.LatLngAltitudeLiteral[] =
  TAHOE_TRAIL_WAYPOINTS.map((pt) => ({
    lat: pt.lat,
    lng: pt.lng,
    altitude: 16
  }));

export function haversineDistanceKm(
  a: google.maps.LatLngLiteral,
  b: google.maps.LatLngLiteral
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function buildElevationSamples(
  results: google.maps.ElevationResult[]
): { samples: ElevationSample[]; metrics: TrailMetrics } {
  const samples: ElevationSample[] = [];
  let cumulativeDistanceKm = 0;
  let minElevationM = Number.POSITIVE_INFINITY;
  let maxElevationM = Number.NEGATIVE_INFINITY;
  let totalAscentM = 0;
  let totalDescentM = 0;

  results.forEach((item, index) => {
    const loc = item.location;
    const lat = loc ? loc.lat() : TAHOE_TRAIL_WAYPOINTS[0].lat;
    const lng = loc ? loc.lng() : TAHOE_TRAIL_WAYPOINTS[0].lng;

    if (index > 0) {
      const prev = samples[index - 1];
      cumulativeDistanceKm += haversineDistanceKm(
        { lat: prev.lat, lng: prev.lng },
        { lat, lng }
      );
      const delta = item.elevation - prev.elevation;
      if (delta > 0) {
        totalAscentM += delta;
      } else {
        totalDescentM += Math.abs(delta);
      }
    }

    if (item.elevation < minElevationM) minElevationM = item.elevation;
    if (item.elevation > maxElevationM) maxElevationM = item.elevation;

    samples.push({
      index,
      lat,
      lng,
      elevation: item.elevation,
      resolution: item.resolution ?? 0,
      distanceKm: cumulativeDistanceKm
    });
  });

  if (samples.length === 0) {
    return {
      samples: [],
      metrics: {
        totalDistanceKm: 0,
        minElevationM: 0,
        maxElevationM: 0,
        totalAscentM: 0,
        totalDescentM: 0
      }
    };
  }

  return {
    samples,
    metrics: {
      totalDistanceKm: cumulativeDistanceKm,
      minElevationM,
      maxElevationM,
      totalAscentM,
      totalDescentM
    }
  };
}
