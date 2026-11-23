export type EmissionType = 'GASOLINE' | 'HYBRID' | 'ELECTRIC';

export type RouteOptionKind = 'fastest' | 'eco';

export type FareTierId = 'economy' | 'comfort' | 'green';

export type SimulationPhase =
  | 'idle'
  | 'approaching_pickup'
  | 'at_pickup'
  | 'on_trip'
  | 'arrived';

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface ResolvedPlace {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: LatLngPoint;
}

export interface ComputedRouteInfo {
  kind: RouteOptionKind;
  label: string;
  routeLabels: string[];
  distanceMeters: number;
  durationMillis: number;
  staticDurationMillis: number;
  distanceText: string;
  durationText: string;
  fuelConsumptionMicroliters: number | null;
  path: LatLngPoint[];
  isSharedWithFastest?: boolean;
}

export interface EcoSavingsSummary {
  hasSeparateEcoRoute: boolean;
  fastestFuelLiters: number | null;
  ecoFuelLiters: number | null;
  fuelSavedLiters: number;
  fuelSavedGallons: number;
  energySavedKwh: number;
  co2SavedKg: number;
  percentSaved: number;
  timeDeltaMinutes: number;
  headline: string;
  detail: string;
}

export interface FareTierEstimate {
  id: FareTierId;
  name: string;
  subtitle: string;
  badge: string;
  totalFare: number;
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  bookingFee: number;
  ecoDiscount: number;
  distanceMiles: number;
  durationMinutes: number;
  vehicleExamples: string;
  co2EstimateKg: number;
}

export interface CandidateDriver {
  id: string;
  name: string;
  rating: number;
  vehicleModel: string;
  vehicleColor: string;
  licensePlate: string;
  tier: FareTierId;
  emissionType: EmissionType;
  position: LatLngPoint;
  etaToPickupSeconds: number | null;
  distanceToPickupMeters: number | null;
  etaText: string;
  distanceText: string;
}

export interface DriverTelemetry {
  phase: SimulationPhase;
  isRunning: boolean;
  progressPercent: number;
  remainingSeconds: number;
  remainingMeters: number;
  currentHeading: number;
  currentPosition: LatLngPoint | null;
  statusLabel: string;
}
