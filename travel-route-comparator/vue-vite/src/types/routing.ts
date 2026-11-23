export type TravelModeKey = 'DRIVING' | 'BICYCLING' | 'WALKING' | 'TRANSIT';

export interface RoutePreferences {
  avoidTolls: boolean;
  avoidHighways: boolean;
  ecoFriendly: boolean;
}

export interface PlaceEndpoint {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: google.maps.LatLngLiteral;
}

export interface ComputedRouteOption {
  id: string;
  index: number;
  mode: TravelModeKey;
  label: string;
  color: string;
  durationMillis: number;
  durationText: string;
  distanceMeters: number;
  distanceText: string;
  isFuelEfficient: boolean;
  isDefaultRoute: boolean;
  tollText: string | null;
  fuelText: string | null;
  transitFareText: string | null;
  warnings: string[];
  path: google.maps.LatLngLiteral[];
  viewport: google.maps.LatLngBounds | null;
  rawRoute: google.maps.routes.Route;
}

export interface ModeComparisonSummary {
  mode: TravelModeKey;
  label: string;
  loading: boolean;
  error: string | null;
  routes: ComputedRouteOption[];
}

export interface ElevationSamplePoint {
  index: number;
  distanceMeters: number;
  distanceMiles: number;
  elevationMeters: number;
  elevationFeet: number;
  gradePercent: number;
  lat: number;
  lng: number;
}

export interface ElevationStats {
  gainMeters: number;
  gainFeet: number;
  lossMeters: number;
  lossFeet: number;
  minMeters: number;
  minFeet: number;
  maxMeters: number;
  maxFeet: number;
  maxGradePercent: number;
  avgGradePercent: number;
  samples: ElevationSamplePoint[];
}
