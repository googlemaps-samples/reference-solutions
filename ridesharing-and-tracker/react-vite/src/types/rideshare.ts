export type EmissionType = 'GASOLINE' | 'HYBRID' | 'ELECTRIC';

export type RouteKind = 'fastest' | 'eco';

export type RideTierId = 'economy' | 'comfort' | 'green';

export interface ResolvedPlace {
  id: string;
  name: string;
  address: string;
  location: google.maps.LatLngLiteral;
}

export interface ComputedRouteData {
  kind: RouteKind;
  label: string;
  description: string;
  distanceMeters: number;
  durationMillis: number;
  staticDurationMillis: number;
  distanceText: string;
  durationText: string;
  fuelConsumptionMicroliters: number | null;
  path: google.maps.LatLngLiteral[];
  routeLabels: string[];
}

export interface RouteComparisonResult {
  fastest: ComputedRouteData;
  eco: ComputedRouteData;
  isSameRoute: boolean;
}

export interface CandidateDriver {
  id: string;
  name: string;
  vehicle: string;
  plate: string;
  rating: number;
  emissionType: EmissionType;
  initialLocation: google.maps.LatLngLiteral;
  neighborhood: string;
  etaMillis?: number;
  distanceMeters?: number;
}

export type DriverSimulationPhase =
  | 'idle'
  | 'en_route_pickup'
  | 'arrived_pickup'
  | 'in_trip'
  | 'completed';

export interface DriverLiveState {
  driver: CandidateDriver | null;
  phase: DriverSimulationPhase;
  position: google.maps.LatLngLiteral | null;
  heading: number;
  remainingSeconds: number;
  remainingMeters: number;
  progressPct: number;
  isPaused: boolean;
  approachPath: google.maps.LatLngLiteral[];
  approachDurationMillis: number;
  approachDistanceMeters: number;
}

export interface FareEstimate {
  tierId: RideTierId;
  name: string;
  subtitle: string;
  badge?: string;
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  bookingFee: number;
  totalFare: number;
  etaMinutes: number;
  ecoTag?: string;
}
