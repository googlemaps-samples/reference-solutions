export type ProviderCategory = 'ev_charging' | 'auto_repair';

export type CategoryFilter = 'all' | ProviderCategory;

export type RadiusKm = 5 | 10 | 15;

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export interface EvConnectorSummary {
  type: string;
  label: string;
  count: number;
  availableCount: number | null;
  outOfServiceCount: number | null;
  maxChargeRateKw: number | null;
}

export interface OpeningStatus {
  state: 'open_24h' | 'open' | 'closed' | 'unknown';
  label: string;
  todayHours: string | null;
}

export interface DispatchProvider {
  id: string;
  name: string;
  category: ProviderCategory;
  address: string;
  location: LatLngLiteral;
  rating: number | null;
  userRatingCount: number | null;
  phoneNumber: string | null;
  googleMapsUri: string | null;
  primaryType: string | null;
  openingStatus: OpeningStatus;
  weekdayDescriptions: string[];
  evTotalConnectors: number | null;
  evAvailableConnectors: number | null;
  evMaxKw: number | null;
  evConnectors: EvConnectorSummary[];
  /** Driving distance in meters from RouteMatrix (or null before ranking) */
  distanceMeters: number | null;
  /** Driving duration in seconds from RouteMatrix (or null before ranking) */
  durationSeconds: number | null;
  /** Formatted driving distance text */
  distanceText: string | null;
  /** Formatted driving ETA text */
  durationText: string | null;
  /** Straight-line distance fallback in meters */
  straightLineMeters: number;
}

export interface RouteStepSummary {
  instruction: string;
  maneuver: string | null;
  distanceText: string;
  durationText: string;
}

export interface ActiveDispatchRoute {
  providerId: string;
  providerName: string;
  providerCategory: ProviderCategory;
  distanceMeters: number;
  durationSeconds: number;
  distanceText: string;
  durationText: string;
  path: LatLngLiteral[];
  viewport: google.maps.LatLngBounds | null;
  steps: RouteStepSummary[];
}
