export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export type ServiceCategory = 'all' | 'ev' | 'repair';

export type ProviderType = 'ev' | 'repair';

export type SearchRadiusMeters = 5000 | 10000 | 15000;

export interface ConnectorSummaryItem {
  typeLabel: string;
  count: number;
  availableCount: number | null;
  outOfServiceCount: number | null;
  maxChargeRateKw: number;
}

export interface EvConnectorSummary {
  totalConnectors: number;
  totalAvailable: number | null;
  maxChargeRateKw: number;
  isFastCharger: boolean;
  connectors: ConnectorSummaryItem[];
}

export interface OpeningStatusInfo {
  isOpen: boolean | null;
  badgeText: string;
  todayHoursText: string | null;
}

export interface ProviderOption {
  id: string;
  name: string;
  category: ProviderType;
  address: string;
  location: LatLngLiteral;
  rating: number | null;
  userRatingCount: number | null;
  phoneNumber: string | null;
  googleMapsUri: string | null;
  businessStatus: string | null;
  openingStatus: OpeningStatusInfo;
  evSummary: EvConnectorSummary | null;
  durationMillis: number | null;
  distanceMeters: number | null;
  etaText: string | null;
  distanceText: string | null;
  straightLineMeters: number;
}

export interface RouteStepInfo {
  index: number;
  instruction: string;
  maneuver: string | null;
  distanceText: string;
  durationText: string;
}

export interface ActiveRouteSummary {
  provider: ProviderOption;
  originAddress: string;
  durationText: string;
  distanceText: string;
  durationMillis: number | null;
  distanceMeters: number | null;
  steps: RouteStepInfo[];
}
