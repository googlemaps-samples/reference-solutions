import type { ElevationSamplePoint, TourChapter, TrailMetrics } from '../types/explorer';

export const INITIAL_MAP_CENTER = {
  lat: 38.9542,
  lng: -120.1103,
  altitude: 1900,
} as const;

export const SEED_SEARCH_QUERY = 'Emerald Bay State Park, Lake Tahoe';

export const LAKE_TAHOE_BOUNDS: google.maps.LatLngBoundsLiteral = {
  north: 39.26,
  south: 38.80,
  east: -119.85,
  west: -120.26,
};

/**
 * Geographic waypoints tracing the scenic Emerald Bay -> Eagle Falls -> Rubicon Ridge -> Eagle Point hiking corridor.
 * Elevations are never hardcoded; they are sampled live from the Google Maps Elevation API at runtime.
 */
export const TRAIL_WAYPOINTS: ReadonlyArray<google.maps.LatLngLiteral> = [
  { lat: 38.9519, lng: -120.1140 }, // Eagle Falls Trailhead
  { lat: 38.9526, lng: -120.1126 }, // Upper Cascade Bridge
  { lat: 38.9535, lng: -120.1112 }, // Granite Switchback
  { lat: 38.9543, lng: -120.1095 }, // Vikingsholm Rim Descent
  { lat: 38.9554, lng: -120.1066 }, // Vikingsholm Cove Shoreline
  { lat: 38.9569, lng: -120.1041 }, // Emerald Bay North Shore
  { lat: 38.9587, lng: -120.1014 }, // Parson Rock Curve
  { lat: 38.9604, lng: -120.0990 }, // Rubicon Trailhead Traverse
  { lat: 38.9615, lng: -120.0972 }, // Rubicon Ridge Overlook
  { lat: 38.9630, lng: -120.0941 }, // Boat Camp Cove
  { lat: 38.9643, lng: -120.0909 }, // Rubicon Lighthouse Point
  { lat: 38.9625, lng: -120.0886 }, // Point Vista Southbound
  { lat: 38.9598, lng: -120.0879 }, // Eagle Point Pine Bench
  { lat: 38.9574, lng: -120.0882 }, // Eagle Point Overlook
];

export const TOUR_CHAPTERS: TourChapter[] = [
  {
    id: 'overview',
    testId: 'chapter-btn-overview',
    stepNumber: 1,
    title: '1. Emerald Bay Overview',
    shortTitle: 'Emerald Bay Overview',
    subtitle: 'Full alpine basin panorama above Fannette Island & the red 3D trail corridor',
    searchQuery: 'Emerald Bay State Park, Lake Tahoe',
    markerColor: '#ef4444',
    markerPosition: { lat: 38.9542, lng: -120.1103, altitude: 28 },
    camera: {
      center: { lat: 38.9542, lng: -120.1103, altitude: 1900 },
      heading: 35,
      tilt: 66,
      range: 3800,
    },
  },
  {
    id: 'trailhead',
    testId: 'chapter-btn-trailhead',
    stepNumber: 2,
    title: '2. Eagle Falls Trailhead',
    shortTitle: 'Eagle Falls Trailhead',
    subtitle: 'Granite canyon mouth & western alpine trail entry above Emerald Bay',
    searchQuery: 'Eagle Falls Trailhead, Lake Tahoe',
    markerColor: '#f97316',
    markerPosition: { lat: 38.9519, lng: -120.1140, altitude: 24 },
    camera: {
      center: { lat: 38.9519, lng: -120.1140, altitude: 1990 },
      heading: 58,
      tilt: 72,
      range: 950,
    },
  },
  {
    id: 'ridge',
    testId: 'chapter-btn-ridge',
    stepNumber: 3,
    title: '3. Rubicon Ridge',
    shortTitle: 'Rubicon Ridge',
    subtitle: 'High-relief granite cliffs curving along Lake Tahoe’s western shore',
    searchQuery: 'Rubicon Trail, Emerald Bay, Lake Tahoe',
    markerColor: '#eab308',
    markerPosition: { lat: 38.9615, lng: -120.0972, altitude: 24 },
    camera: {
      center: { lat: 38.9615, lng: -120.0972, altitude: 1945 },
      heading: 18,
      tilt: 74,
      range: 1350,
    },
  },
  {
    id: 'overlook',
    testId: 'chapter-btn-overlook',
    stepNumber: 4,
    title: '4. Eagle Point Overlook',
    shortTitle: 'Eagle Point Overlook',
    subtitle: 'Southern headland vista framing the emerald mouth of the bay',
    searchQuery: 'Eagle Point Campground, Emerald Bay',
    markerColor: '#22c55e',
    markerPosition: { lat: 38.9574, lng: -120.0882, altitude: 24 },
    camera: {
      center: { lat: 38.9574, lng: -120.0882, altitude: 1920 },
      heading: 298,
      tilt: 71,
      range: 1200,
    },
  },
  {
    id: 'summit',
    testId: 'chapter-btn-summit',
    stepNumber: 5,
    title: '5. Tahoe Summit Panorama',
    shortTitle: 'Tahoe Summit Panorama',
    subtitle: 'Sweeping ridge-to-lake perspective across the Sierra Nevada crest',
    searchQuery: 'Emerald Bay Vista Point, Lake Tahoe',
    markerColor: '#38bdf8',
    markerPosition: { lat: 38.9598, lng: -120.1055, altitude: 28 },
    camera: {
      center: { lat: 38.9598, lng: -120.1055, altitude: 2050 },
      heading: 118,
      tilt: 78,
      range: 4200,
    },
  },
];

const EARTH_RADIUS_KM = 6371;

export function haversineDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function buildElevationSamplesAndMetrics(
  results: google.maps.ElevationResult[]
): { samples: ElevationSamplePoint[]; metrics: TrailMetrics } {
  const samples: ElevationSamplePoint[] = [];
  let cumulativeKm = 0;

  for (let i = 0; i < results.length; i += 1) {
    const item = results[i];
    const lat = item.location?.lat() ?? TRAIL_WAYPOINTS[0].lat;
    const lng = item.location?.lng() ?? TRAIL_WAYPOINTS[0].lng;

    if (i > 0) {
      const prev = samples[i - 1];
      cumulativeKm += haversineDistanceKm(
        { lat: prev.lat, lng: prev.lng },
        { lat, lng }
      );
    }

    const elevationMeters = item.elevation;
    samples.push({
      index: i,
      lat,
      lng,
      elevationMeters,
      elevationFeet: elevationMeters * 3.28084,
      distanceKm: cumulativeKm,
      resolutionMeters: typeof item.resolution === 'number' ? item.resolution : null,
    });
  }

  let minElevationMeters = Infinity;
  let maxElevationMeters = -Infinity;
  let totalAscentMeters = 0;
  let totalDescentMeters = 0;

  for (let i = 0; i < samples.length; i += 1) {
    const elev = samples[i].elevationMeters;
    if (elev < minElevationMeters) minElevationMeters = elev;
    if (elev > maxElevationMeters) maxElevationMeters = elev;

    if (i > 0) {
      const diff = elev - samples[i - 1].elevationMeters;
      if (diff > 0) totalAscentMeters += diff;
      else totalDescentMeters += Math.abs(diff);
    }
  }

  const metrics: TrailMetrics = {
    totalDistanceKm: cumulativeKm,
    totalDistanceMiles: cumulativeKm * 0.621371,
    minElevationMeters: Number.isFinite(minElevationMeters) ? minElevationMeters : 0,
    maxElevationMeters: Number.isFinite(maxElevationMeters) ? maxElevationMeters : 0,
    totalAscentMeters,
    totalDescentMeters,
  };

  return { samples, metrics };
}

export function metersToFeet(meters: number): number {
  return meters * 3.28084;
}
