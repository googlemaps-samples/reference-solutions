export type ProviderCategory = 'ev' | 'repair';
export type CategoryFilter = 'all' | ProviderCategory;
export type RadiusKm = 5 | 10 | 15;

export interface EvConnectorSummary {
  typeLabel: string;
  count: number;
  availableCount: number | null;
  maxChargeRateKw: number;
}

export interface ServiceProviderItem {
  id: string;
  name: string;
  address: string;
  category: ProviderCategory;
  location: google.maps.LatLngLiteral;
  rating: number | null;
  userRatingCount: number | null;
  primaryType: string | null;
  phoneNumber: string | null;
  googleMapsUri: string | null;
  availabilityLabel: string;
  isAvailableBadgePositive: boolean;
  evConnectorCount: number | null;
  evMaxKw: number | null;
  evConnectors: EvConnectorSummary[];
  distanceMeters: number | null;
  distanceText: string;
  durationMillis: number | null;
  etaText: string;
  straightLineMeters: number;
}

export interface RouteStepItem {
  index: number;
  instruction: string;
  maneuver: string;
  distanceText: string;
  durationText: string;
}

export interface ActiveDispatchRoute {
  provider: ServiceProviderItem;
  distanceText: string;
  durationText: string;
  steps: RouteStepItem[];
}
