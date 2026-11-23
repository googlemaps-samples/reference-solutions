export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export type ProviderCategory = 'ev' | 'repair';
export type FilterCategory = 'all' | ProviderCategory;
export type RadiusKm = 5 | 10 | 15;

export interface EvConnectorSummary {
  type: string;
  label: string;
  count: number;
  availableCount?: number;
  outOfServiceCount?: number;
  maxChargeRateKw?: number;
}

export interface ServiceProvider {
  id: string;
  name: string;
  address: string;
  location: LatLngLiteral;
  category: ProviderCategory;
  primaryType?: string;
  types?: string[];
  rating?: number;
  userRatingCount?: number;
  openNow?: boolean;
  weekdayDescriptions?: string[];
  phone?: string;
  googleMapsUri?: string;
  evConnectorCount?: number;
  evAvailableCount?: number;
  maxChargeRateKw?: number;
  evConnectors?: EvConnectorSummary[];
  distanceMeters?: number;
  durationSeconds?: number;
  straightLineMeters: number;
}

export interface RouteStep {
  instruction: string;
  maneuver?: string;
  distanceMeters: number;
  durationSeconds: number;
}

export interface ComputedDispatchRoute {
  destinationId: string;
  destinationName: string;
  destinationCategory: ProviderCategory;
  encodedPolyline: string;
  distanceMeters: number;
  durationSeconds: number;
  viewport?: {
    low: LatLngLiteral;
    high: LatLngLiteral;
  };
  steps: RouteStep[];
}

export interface ReverseGeocodeResult {
  formattedAddress: string;
  shortLabel: string;
  placeId?: string;
}

export const SEATTLE_CENTER: LatLngLiteral = {
  lat: 47.6062,
  lng: -122.3321,
};

export const DEFAULT_RADIUS_KM: RadiusKm = 10;
