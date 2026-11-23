export type EmissionType = 'GASOLINE' | 'HYBRID' | 'ELECTRIC';

export type RouteMode = 'fastest' | 'eco';

export type FareTierId = 'economy' | 'comfort' | 'green';

export type SimulationPhase =
  | 'IDLE'
  | 'EN_ROUTE_TO_PICKUP'
  | 'ARRIVED_AT_PICKUP'
  | 'IN_TRANSIT'
  | 'COMPLETED';

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export interface ResolvedPlace {
  id: string;
  name: string;
  formattedAddress: string;
  location: LatLngLiteral;
}

export interface ComputedRouteData {
  mode: RouteMode;
  routeLabels: string[];
  distanceMeters: number;
  durationSeconds: number;
  staticDurationSeconds: number;
  encodedPolyline: string;
  fuelConsumptionMicroliters: number | null;
  localizedDistance: string;
  localizedDuration: string;
}

export interface EcoSavingsSummary {
  isSameRoute: boolean;
  fuelSavedLiters: number;
  fuelSavedPercent: number;
  co2SavedKg: number;
  energySavedKwh: number;
  timeDeltaSeconds: number;
  fastestFuelLiters: number | null;
  ecoFuelLiters: number | null;
}

export interface FareEstimate {
  id: FareTierId;
  name: string;
  tagline: string;
  vehicleClass: string;
  totalUsd: number;
  baseFareUsd: number;
  distanceChargeUsd: number;
  timeChargeUsd: number;
  bookingFeeUsd: number;
  ecoDiscountUsd: number;
  etaMinutes: number;
}

export interface CandidateDriver {
  id: string;
  name: string;
  rating: number;
  vehicleModel: string;
  licensePlate: string;
  emissionType: EmissionType;
  tier: FareTierId;
  location: LatLngLiteral;
  etaToPickupSeconds?: number;
  distanceToPickupMeters?: number;
}

export interface DriverSimulationState {
  phase: SimulationPhase;
  isRunning: boolean;
  dispatchedDriver: CandidateDriver | null;
  currentPosition: LatLngLiteral | null;
  heading: number;
  progressPercent: number;
  remainingEtaSeconds: number;
  remainingDistanceMeters: number;
  approachPolyline: string | null;
}
