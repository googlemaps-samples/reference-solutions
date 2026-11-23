export type TravelMode = 'DRIVE' | 'BICYCLE' | 'WALK' | 'TRANSIT';

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export interface PlaceEndpoint {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: LatLngLiteral;
}

export interface RouteModifiersState {
  avoidTolls: boolean;
  avoidHighways: boolean;
  ecoFriendly: boolean;
}

export interface ComputedRoute {
  index: number;
  routeLabels: string[];
  distanceMeters: number;
  durationSeconds: number;
  staticDurationSeconds: number;
  durationText: string;
  distanceText: string;
  encodedPolyline: string;
  color: string;
  tollEstimateText: string | null;
  fuelConsumptionLiters: number | null;
  warnings: string[];
}

export interface RouteComputeResult {
  travelMode: TravelMode;
  routes: ComputedRoute[];
  fallbackApplied?: boolean;
  error?: string;
}

export interface ElevationSamplePoint {
  index: number;
  lat: number;
  lng: number;
  elevationMeters: number;
  elevationFeet: number;
  distanceMeters: number;
  gradePercent: number;
  resolution: number;
}

export interface ElevationProfileSummary {
  points: ElevationSamplePoint[];
  totalGainMeters: number;
  totalLossMeters: number;
  minElevationMeters: number;
  maxElevationMeters: number;
  maxGradePercent: number;
  totalDistanceMeters: number;
  source: 'bff' | 'sdk';
}
