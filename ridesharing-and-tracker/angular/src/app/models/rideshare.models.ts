export type VehicleEmissionType = 'GASOLINE' | 'HYBRID' | 'ELECTRIC';

export type RouteOptionKind = 'fastest' | 'eco';

export type FareTierId = 'economy' | 'comfort' | 'green';

export type DispatchPhase =
  | 'idle'
  | 'searching'
  | 'en_route_to_pickup'
  | 'arriving_pickup'
  | 'in_trip'
  | 'arrived_dropoff';

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface ResolvedPlace {
  id: string;
  name: string;
  formattedAddress: string;
  location: LatLngPoint;
}

export interface ComputedRouteOption {
  kind: RouteOptionKind;
  label: string;
  distanceMeters: number;
  durationSeconds: number;
  staticDurationSeconds: number;
  fuelConsumptionMicroliters: number | null;
  path: LatLngPoint[];
  routeLabels: string[];
  matchesBoth: boolean;
}

export interface EcoSavingsSummary {
  fuelSavedLiters: number;
  fuelSavedPercent: number;
  co2SavedGrams: number;
  timeDeltaSeconds: number;
  isSameAsFastest: boolean;
  emissionType: VehicleEmissionType;
}

export interface FareEstimate {
  id: FareTierId;
  name: string;
  subtitle: string;
  badge: string;
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  greenDiscount: number;
  totalFare: number;
  etaOffsetMinutes: number;
  co2Label: string;
  seats: number;
}

export interface CandidateDriver {
  id: string;
  name: string;
  rating: number;
  vehicleModel: string;
  licensePlate: string;
  emissionType: VehicleEmissionType;
  location: LatLngPoint;
  matrixDistanceMeters: number | null;
  matrixDurationSeconds: number | null;
  isDispatched: boolean;
}

export interface DriverTelemetry {
  driver: CandidateDriver | null;
  phase: DispatchPhase;
  statusLabel: string;
  position: LatLngPoint | null;
  heading: number;
  remainingSeconds: number;
  remainingMeters: number;
  progressPercent: number;
  pickupPath: LatLngPoint[];
}
