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

export interface CameraTelemetry {
  heading: number;
  tilt: number;
  range: number;
  lat: number;
  lng: number;
}

export interface TourChapter {
  id: string;
  testId: string;
  stepNumber: number;
  title: string;
  shortTitle: string;
  subtitle: string;
  searchQuery: string;
  markerColor: string;
  camera: CameraPreset;
  markerPosition: {
    lat: number;
    lng: number;
    altitude: number;
  };
}

export interface ElevationSamplePoint {
  index: number;
  lat: number;
  lng: number;
  elevationMeters: number;
  elevationFeet: number;
  distanceKm: number;
  resolutionMeters: number | null;
}

export interface TrailMetrics {
  totalDistanceKm: number;
  totalDistanceMiles: number;
  minElevationMeters: number;
  maxElevationMeters: number;
  totalAscentMeters: number;
  totalDescentMeters: number;
}

export interface SelectedPlaceDetails {
  id: string;
  displayName: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  rating: number | null;
  userRatingCount: number | null;
  googleMapsURI: string | null;
  elevationMeters: number | null;
  elevationFeet: number | null;
  sourceLabel: string;
}
