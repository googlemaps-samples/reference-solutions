export interface CameraTelemetry {
  lat: number;
  lng: number;
  altitude: number;
  heading: number;
  tilt: number;
  range: number;
}

export interface TourChapter {
  id: 'overview' | 'trailhead' | 'ridge' | 'overlook' | 'summit';
  testId: string;
  stepNumber: number;
  title: string;
  shortLabel: string;
  subtitle: string;
  description: string;
  placeQuery: string;
  markerPosition: { lat: number; lng: number };
  camera: {
    center: { lat: number; lng: number; altitude: number };
    heading: number;
    tilt: number;
    range: number;
  };
}

export interface TrailWaypoint {
  lat: number;
  lng: number;
  label?: string;
}

export interface ElevationSample {
  index: number;
  lat: number;
  lng: number;
  elevationMeters: number;
  distanceKm: number;
  resolutionMeters: number;
}

export interface TrailMetrics {
  totalDistanceKm: number;
  minElevationMeters: number;
  maxElevationMeters: number;
  totalAscentMeters: number;
  totalDescentMeters: number;
}

export interface SelectedViewpointInfo {
  title: string;
  subtitle: string;
  address?: string;
  lat: number;
  lng: number;
  elevationMeters?: number | null;
  rating?: number | null;
  userRatingCount?: number | null;
  googleMapsUri?: string | null;
  source: 'trail-chapter' | 'places-search' | 'elevation-sample';
  description?: string;
}

export const INITIAL_CENTER = {
  lat: 38.9542,
  lng: -120.1103,
  altitude: 1950,
};

export const SEED_SEARCH_QUERY = 'Emerald Bay State Park, Lake Tahoe';

/**
 * Geographic trail path tracing Eagle Falls -> Vikingsholm -> Rubicon Ridge -> Eagle Point -> Tahoe Summit Panorama
 */
export const LAKE_TAHOE_TRAIL_PATH: TrailWaypoint[] = [
  { lat: 38.9516, lng: -120.1135, label: 'Eagle Falls Trailhead' },
  { lat: 38.9523, lng: -120.1117 },
  { lat: 38.9531, lng: -120.1101 },
  { lat: 38.9537, lng: -120.1086 },
  { lat: 38.9541, lng: -120.1072 },
  { lat: 38.9554, lng: -120.1069 },
  { lat: 38.9568, lng: -120.1066 },
  { lat: 38.9578, lng: -120.1062, label: 'Rubicon Ridge' },
  { lat: 38.9574, lng: -120.1032 },
  { lat: 38.9569, lng: -120.0998 },
  { lat: 38.9563, lng: -120.0968 },
  { lat: 38.9565, lng: -120.0942, label: 'Eagle Point Overlook' },
  { lat: 38.9592, lng: -120.0954 },
  { lat: 38.9621, lng: -120.0968 },
  { lat: 38.9648, lng: -120.0985, label: 'Tahoe Summit Panorama' },
];

export const TOUR_CHAPTERS: TourChapter[] = [
  {
    id: 'overview',
    testId: 'chapter-btn-overview',
    stepNumber: 1,
    title: '1. Emerald Bay Overview',
    shortLabel: 'Overview',
    subtitle: 'Full Emerald Bay Amphitheater & Fannette Island',
    description:
      'High-altitude 3D vantage above Emerald Bay State Park framing the bright-red Rubicon Trail corridor, glacial ridges, and Fannette Island.',
    placeQuery: 'Emerald Bay State Park, Lake Tahoe',
    markerPosition: { lat: 38.9542, lng: -120.1103 },
    camera: {
      center: { lat: 38.9542, lng: -120.1103, altitude: 1950 },
      heading: 42,
      tilt: 66,
      range: 3400,
    },
  },
  {
    id: 'trailhead',
    testId: 'chapter-btn-trailhead',
    stepNumber: 2,
    title: '2. Eagle Falls Trailhead',
    shortLabel: '1',
    subtitle: 'Granite Switchbacks & Cascade Entry',
    description:
      'Western granite trailhead overlooking the upper canyon switchbacks descending toward the Emerald Bay shoreline.',
    placeQuery: 'Eagle Falls Trailhead, South Lake Tahoe',
    markerPosition: { lat: 38.9516, lng: -120.1135 },
    camera: {
      center: { lat: 38.9516, lng: -120.1135, altitude: 2020 },
      heading: 65,
      tilt: 68,
      range: 950,
    },
  },
  {
    id: 'ridge',
    testId: 'chapter-btn-ridge',
    stepNumber: 3,
    title: '3. Rubicon Ridge',
    shortLabel: '2',
    subtitle: 'Cliffside Pine Traverse Above Turquoise Water',
    description:
      'Mid-route granite bench hugging the northern wall of Emerald Bay with dramatic elevation relief along the Rubicon Trail.',
    placeQuery: 'Rubicon Trail, Emerald Bay, Lake Tahoe',
    markerPosition: { lat: 38.9578, lng: -120.1062 },
    camera: {
      center: { lat: 38.9578, lng: -120.1062, altitude: 1980 },
      heading: 135,
      tilt: 72,
      range: 1100,
    },
  },
  {
    id: 'overlook',
    testId: 'chapter-btn-overlook',
    stepNumber: 4,
    title: '4. Eagle Point Overlook',
    shortLabel: '3',
    subtitle: 'Peninsula Headland & Bay Entrance Vista',
    description:
      'Sweeping eastern headland framing the mouth of Emerald Bay where alpine moraines meet open Lake Tahoe waters.',
    placeQuery: 'Eagle Point Campground, Lake Tahoe',
    markerPosition: { lat: 38.9565, lng: -120.0942 },
    camera: {
      center: { lat: 38.9565, lng: -120.0942, altitude: 1920 },
      heading: 255,
      tilt: 70,
      range: 1350,
    },
  },
  {
    id: 'summit',
    testId: 'chapter-btn-summit',
    stepNumber: 5,
    title: '5. Tahoe Summit Panorama',
    shortLabel: '4',
    subtitle: 'High Alpine Ridge & Lake Basin Horizon',
    description:
      'Elevated northern crest capturing the full 3D topography from Emerald Bay across the Sierra Nevada horizon.',
    placeQuery: 'Rubicon Point, Lake Tahoe',
    markerPosition: { lat: 38.9648, lng: -120.0985 },
    camera: {
      center: { lat: 38.9648, lng: -120.0985, altitude: 2150 },
      heading: 175,
      tilt: 64,
      range: 2900,
    },
  },
];

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
