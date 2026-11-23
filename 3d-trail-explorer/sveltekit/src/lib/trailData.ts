export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface CameraPreset {
  center: {
    lat: number;
    lng: number;
    altitude: number;
  };
  heading: number;
  tilt: number;
  range: number;
}

export interface TourChapter {
  id: 'overview' | 'trailhead' | 'ridge' | 'overlook' | 'summit';
  glyph: string;
  title: string;
  shortLabel: string;
  testId: string;
  description: string;
  placeQuery: string;
  camera: CameraPreset;
  markerPosition: {
    lat: number;
    lng: number;
    altitude: number;
  };
}

export interface ActiveViewpoint {
  id: string;
  name: string;
  source: 'chapter' | 'place';
  description: string;
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  elevationMeters?: number | null;
  location: LatLngPoint;
  camera: CameraPreset;
}

export const INITIAL_MAP_CENTER = {
  lat: 38.9542,
  lng: -120.1103,
  altitude: 1920
};

export const INITIAL_CAMERA: CameraPreset = {
  center: { lat: 38.9542, lng: -120.1103, altitude: 18 },
  heading: 315,
  tilt: 64,
  range: 4200
};

export const SEED_SEARCH_QUERY = 'Emerald Bay State Park, Lake Tahoe';

/**
 * Scenic Lake Tahoe trail path tracing Eagle Falls Trailhead along Emerald Bay
 * and the Rubicon Trail ridge to Eagle Point Overlook and Tahoe Summit vista.
 */
export const EMERALD_BAY_TRAIL_PATH: LatLngPoint[] = [
  { lat: 38.9514, lng: -120.1146 },
  { lat: 38.9519, lng: -120.1139 },
  { lat: 38.9527, lng: -120.1126 },
  { lat: 38.9536, lng: -120.1112 },
  { lat: 38.9545, lng: -120.1098 },
  { lat: 38.9554, lng: -120.1082 },
  { lat: 38.9565, lng: -120.1069 },
  { lat: 38.9577, lng: -120.1056 },
  { lat: 38.9585, lng: -120.1045 },
  { lat: 38.9591, lng: -120.1028 },
  { lat: 38.9596, lng: -120.1009 },
  { lat: 38.9592, lng: -120.0989 },
  { lat: 38.9581, lng: -120.0972 },
  { lat: 38.9569, lng: -120.0961 },
  { lat: 38.9562, lng: -120.0954 },
  { lat: 38.9576, lng: -120.0976 },
  { lat: 38.9594, lng: -120.0996 },
  { lat: 38.9612, lng: -120.1012 }
];

export const TOUR_CHAPTERS: TourChapter[] = [
  {
    id: 'overview',
    glyph: '1',
    title: '1. Emerald Bay Overview',
    shortLabel: 'Overview',
    testId: 'chapter-btn-overview',
    description:
      'High-altitude alpine framing of Emerald Bay, Fannette Island, and the granite Sierra slopes above Lake Tahoe.',
    placeQuery: 'Emerald Bay State Park, Lake Tahoe',
    camera: {
      center: { lat: 38.9542, lng: -120.1103, altitude: 18 },
      heading: 315,
      tilt: 64,
      range: 4200
    },
    markerPosition: { lat: 38.9542, lng: -120.1103, altitude: 22 }
  },
  {
    id: 'trailhead',
    glyph: '2',
    title: '2. Eagle Falls Trailhead',
    shortLabel: 'Trailhead',
    testId: 'chapter-btn-trailhead',
    description:
      'Granite staircase ascent beside cascading Eagle Falls before crossing into the Desolation Wilderness rim.',
    placeQuery: 'Eagle Falls Trailhead, South Lake Tahoe',
    camera: {
      center: { lat: 38.9519, lng: -120.1139, altitude: 18 },
      heading: 245,
      tilt: 68,
      range: 950
    },
    markerPosition: { lat: 38.9519, lng: -120.1139, altitude: 22 }
  },
  {
    id: 'ridge',
    glyph: '3',
    title: '3. Rubicon Ridge',
    shortLabel: 'Ridge',
    testId: 'chapter-btn-ridge',
    description:
      'Exposed shoreline traverse high above the emerald cove along the historic Rubicon Trail.',
    placeQuery: 'Rubicon Trail, South Lake Tahoe',
    camera: {
      center: { lat: 38.9585, lng: -120.1045, altitude: 18 },
      heading: 35,
      tilt: 72,
      range: 1350
    },
    markerPosition: { lat: 38.9585, lng: -120.1045, altitude: 22 }
  },
  {
    id: 'overlook',
    glyph: '4',
    title: '4. Eagle Point Overlook',
    shortLabel: 'Overlook',
    testId: 'chapter-btn-overlook',
    description:
      'Peninsula promontory looking straight back down Emerald Bay toward the snow-dusted crest.',
    placeQuery: 'Eagle Point, Emerald Bay, Lake Tahoe',
    camera: {
      center: { lat: 38.9562, lng: -120.0954, altitude: 18 },
      heading: 285,
      tilt: 70,
      range: 1400
    },
    markerPosition: { lat: 38.9562, lng: -120.0954, altitude: 22 }
  },
  {
    id: 'summit',
    glyph: '5',
    title: '5. Tahoe Summit Panorama',
    shortLabel: 'Summit',
    testId: 'chapter-btn-summit',
    description:
      'Sweeping upper-ridge vista across the Lake Tahoe basin and Carson Range horizon.',
    placeQuery: 'Emerald Bay Lookout, South Lake Tahoe',
    camera: {
      center: { lat: 38.9612, lng: -120.1012, altitude: 24 },
      heading: 120,
      tilt: 75,
      range: 3200
    },
    markerPosition: { lat: 38.9612, lng: -120.1012, altitude: 28 }
  }
];
