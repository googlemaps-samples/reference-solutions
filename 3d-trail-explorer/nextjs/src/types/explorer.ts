export interface LatLngAltitudePoint {
  lat: number;
  lng: number;
  altitude?: number;
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
  durationMillis?: number;
}

export interface CameraTelemetry {
  lat: number;
  lng: number;
  altitude: number;
  heading: number;
  tilt: number;
  range: number;
}

export interface ChapterStop {
  id: 'overview' | 'trailhead' | 'ridge' | 'overlook' | 'summit';
  testId: string;
  order: number;
  label: string;
  shortTitle: string;
  subtitle: string;
  placeQuery: string;
  markerGlyph: string;
  position: {
    lat: number;
    lng: number;
    altitude: number;
  };
  camera: CameraPreset;
}

export interface PlaceSummary {
  id?: string;
  displayName: string;
  formattedAddress?: string;
  location: {
    lat: number;
    lng: number;
  };
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  elevationMeters?: number;
  source: 'places-api' | 'chapter-preset';
}

export interface AutocompletePrediction {
  placeId: string;
  primaryText: string;
  secondaryText: string;
  fullText: string;
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
