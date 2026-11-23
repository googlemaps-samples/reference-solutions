export type ChapterId =
  | 'overview'
  | 'trailhead'
  | 'ridge'
  | 'overlook'
  | 'summit';

export interface TrailCameraPreset {
  center: {
    lat: number;
    lng: number;
    altitude: number;
  };
  heading: number;
  tilt: number;
  range: number;
}

export interface TrailChapter {
  id: ChapterId;
  testId: string;
  stepNumber: number;
  title: string;
  subtitle: string;
  description: string;
  position: {
    lat: number;
    lng: number;
  };
  camera: TrailCameraPreset;
  pinGlyph: string;
  pinBackground: string;
  pinBorderColor: string;
  placesSearchQuery: string;
}

export interface ElevationSample {
  index: number;
  lat: number;
  lng: number;
  elevation: number;
  resolution: number;
  distanceKm: number;
}

export interface TrailMetrics {
  totalDistanceKm: number;
  minElevationM: number;
  maxElevationM: number;
  totalAscentM: number;
  totalDescentM: number;
}

export interface SelectedLandmark {
  id: string;
  kind: 'chapter' | 'place';
  name: string;
  subtitle: string;
  address?: string | null;
  rating?: number | null;
  userRatingCount?: number | null;
  googleMapsURI?: string | null;
  editorialSummary?: string | null;
  lat: number;
  lng: number;
  elevationM?: number | null;
  chapterId?: ChapterId;
  types?: string[];
}

export interface CameraTelemetry {
  heading: number;
  tilt: number;
  range: number;
  center: {
    lat: number;
    lng: number;
    altitude: number;
  };
}
