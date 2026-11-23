export type TravelModeId = 'DRIVING' | 'BICYCLING' | 'WALKING' | 'TRANSIT';

export interface PlacePoint {
  id: string;
  name: string;
  formattedAddress: string;
  location: google.maps.LatLngLiteral;
}

export interface RouteModifiersState {
  avoidTolls: boolean;
  avoidHighways: boolean;
  ecoFriendly: boolean;
}

export interface ComputedRouteOption {
  id: string;
  index: number;
  mode: TravelModeId;
  label: string;
  routeLabels: string[];
  description?: string;
  distanceMeters: number;
  durationSeconds: number;
  staticDurationSeconds?: number;
  distanceText: string;
  durationText: string;
  path: google.maps.LatLngLiteral[];
  hasTolls: boolean;
  tollEstimateText?: string;
  fuelLiters?: number;
  transitSummary?: string;
  warnings: string[];
  color: string;
  rawRoute: google.maps.routes.Route;
}

export interface ModeRouteBundle {
  mode: TravelModeId;
  routes: ComputedRouteOption[];
  error?: string;
  isLoading: boolean;
}

export interface ElevationPoint {
  index: number;
  distanceKm: number;
  distanceMiles: number;
  elevationMeters: number;
  elevationFeet: number;
  gradePercent: number;
  location: google.maps.LatLngLiteral;
}

export interface ElevationProfileSummary {
  points: ElevationPoint[];
  totalGainMeters: number;
  totalLossMeters: number;
  minElevationMeters: number;
  maxElevationMeters: number;
  maxGradePercent: number;
  totalDistanceMeters: number;
}
