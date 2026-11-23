import type {
  CameraPreset,
  ChapterStop,
  ElevationSample,
  LatLngAltitudePoint,
  TrailMetrics,
} from '@/types/explorer';

/**
 * Lake Tahoe — Emerald Bay / Eagle Falls / Rubicon Trail 3D path coordinates.
 * Altitude values (14m) are applied relative to ground for crisp 3D extrusion
 * above the photorealistic Sierra Nevada terrain mesh.
 */
export const TAHOE_TRAIL_PATH: LatLngAltitudePoint[] = [
  { lat: 38.9508, lng: -120.1142, altitude: 14 }, // Eagle Falls Trailhead
  { lat: 38.9516, lng: -120.1121, altitude: 14 }, // Lower Eagle Falls Bridge
  { lat: 38.9529, lng: -120.1095, altitude: 14 }, // Vikingsholm Cove Descent
  { lat: 38.9542, lng: -120.1103, altitude: 14 }, // Emerald Bay Overlook Point
  { lat: 38.9563, lng: -120.1072, altitude: 14 }, // North Shore Traverse
  { lat: 38.9589, lng: -120.1056, altitude: 14 }, // Rubicon Switchbacks South
  { lat: 38.9611, lng: -120.1041, altitude: 14 }, // Granite Ledge Climb
  { lat: 38.9625, lng: -120.1028, altitude: 14 }, // Rubicon Ridge Crest
  { lat: 38.9642, lng: -120.1069, altitude: 14 }, // High Ridge Saddle
  { lat: 38.9668, lng: -120.1128, altitude: 14 }, // Alpine Bench Approach
  { lat: 38.9698, lng: -120.1215, altitude: 14 }, // Tahoe Summit Panorama
  { lat: 38.9621, lng: -120.1001, altitude: 14 }, // East Spur Descent
  { lat: 38.9574, lng: -120.0956, altitude: 14 }, // Lighthouse Point Traverse
  { lat: 38.9527, lng: -120.0928, altitude: 14 }, // Eagle Point Overlook
];

export const INITIAL_CAMERA: CameraPreset = {
  center: {
    lat: 38.9542,
    lng: -120.1103,
    altitude: 1920,
  },
  heading: 38,
  tilt: 66,
  range: 4200,
  durationMillis: 2000,
};

export const CHAPTER_STOPS: ChapterStop[] = [
  {
    id: 'overview',
    testId: 'chapter-btn-overview',
    order: 1,
    label: '1. Emerald Bay Overview',
    shortTitle: 'Emerald Bay Overview',
    subtitle: 'Glacial fjord & Fannette Island vista',
    placeQuery: 'Emerald Bay State Park, Lake Tahoe',
    markerGlyph: '1',
    position: {
      lat: 38.9542,
      lng: -120.1103,
      altitude: 35,
    },
    camera: {
      center: { lat: 38.9542, lng: -120.1103, altitude: 1920 },
      heading: 38,
      tilt: 66,
      range: 4200,
      durationMillis: 2200,
    },
  },
  {
    id: 'trailhead',
    testId: 'chapter-btn-trailhead',
    order: 2,
    label: '2. Eagle Falls Trailhead',
    shortTitle: 'Eagle Falls Trailhead',
    subtitle: 'Granite cascade & Desolation Wilderness gateway',
    placeQuery: 'Eagle Falls Trailhead, South Lake Tahoe',
    markerGlyph: '2',
    position: {
      lat: 38.9508,
      lng: -120.1142,
      altitude: 35,
    },
    camera: {
      center: { lat: 38.9508, lng: -120.1142, altitude: 2010 },
      heading: 242,
      tilt: 71,
      range: 1450,
      durationMillis: 2200,
    },
  },
  {
    id: 'ridge',
    testId: 'chapter-btn-ridge',
    order: 3,
    label: '3. Rubicon Ridge',
    shortTitle: 'Rubicon Ridge',
    subtitle: 'Exposed granite spine above the western shore',
    placeQuery: 'Rubicon Trail, Emerald Bay, Lake Tahoe',
    markerGlyph: '3',
    position: {
      lat: 38.9625,
      lng: -120.1028,
      altitude: 35,
    },
    camera: {
      center: { lat: 38.9625, lng: -120.1028, altitude: 2080 },
      heading: 128,
      tilt: 68,
      range: 1950,
      durationMillis: 2200,
    },
  },
  {
    id: 'overlook',
    testId: 'chapter-btn-overlook',
    order: 4,
    label: '4. Eagle Point Overlook',
    shortTitle: 'Eagle Point Overlook',
    subtitle: 'Open-lake narrows & eastern Sierra backdrop',
    placeQuery: 'Eagle Point, Emerald Bay State Park, Lake Tahoe',
    markerGlyph: '4',
    position: {
      lat: 38.9527,
      lng: -120.0928,
      altitude: 35,
    },
    camera: {
      center: { lat: 38.9527, lng: -120.0928, altitude: 1930 },
      heading: 295,
      tilt: 72,
      range: 1750,
      durationMillis: 2200,
    },
  },
  {
    id: 'summit',
    testId: 'chapter-btn-summit',
    order: 5,
    label: '5. Tahoe Summit Panorama',
    shortTitle: 'Tahoe Summit Panorama',
    subtitle: 'High-alpine crest overlooking the entire basin',
    placeQuery: 'Maggie Peak, Lake Tahoe',
    markerGlyph: '5',
    position: {
      lat: 38.9698,
      lng: -120.1215,
      altitude: 45,
    },
    camera: {
      center: { lat: 38.9698, lng: -120.1215, altitude: 2450 },
      heading: 112,
      tilt: 62,
      range: 4600,
      durationMillis: 2400,
    },
  },
];

export const SEED_SEARCH_QUERY = 'Emerald Bay State Park, Lake Tahoe';

export function haversineDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function buildElevationSamples(
  rawResults: Array<{
    elevation: number;
    resolution?: number;
    location: { lat: number; lng: number };
  }>
): ElevationSample[] {
  let cumulativeKm = 0;
  return rawResults.map((item, idx) => {
    if (idx > 0) {
      cumulativeKm += haversineDistanceKm(
        rawResults[idx - 1].location,
        item.location
      );
    }
    return {
      index: idx,
      lat: item.location.lat,
      lng: item.location.lng,
      elevation: item.elevation,
      resolution: item.resolution ?? 0,
      distanceKm: cumulativeKm,
    };
  });
}

export function computeTrailMetrics(samples: ElevationSample[]): TrailMetrics {
  if (samples.length === 0) {
    return {
      totalDistanceKm: 0,
      minElevationM: 0,
      maxElevationM: 0,
      totalAscentM: 0,
      totalDescentM: 0,
    };
  }

  let minElevationM = samples[0].elevation;
  let maxElevationM = samples[0].elevation;
  let totalAscentM = 0;
  let totalDescentM = 0;

  for (let i = 0; i < samples.length; i += 1) {
    const elev = samples[i].elevation;
    if (elev < minElevationM) minElevationM = elev;
    if (elev > maxElevationM) maxElevationM = elev;
    if (i > 0) {
      const diff = elev - samples[i - 1].elevation;
      if (diff > 0) totalAscentM += diff;
      else totalDescentM += Math.abs(diff);
    }
  }

  return {
    totalDistanceKm: samples[samples.length - 1].distanceKm,
    minElevationM,
    maxElevationM,
    totalAscentM,
    totalDescentM,
  };
}
