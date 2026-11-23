export type BranchType = 'flagship' | 'kiosk' | 'atm';

export type ServiceTag = 'pickup' | 'coffee' | 'cash' | 'open24';

export type TravelModeOption = 'DRIVE' | 'WALK' | 'TRANSIT';

export interface OriginPoint {
  label: string;
  address: string;
  lat: number;
  lng: number;
}

export interface BranchLocation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: BranchType;
  typeLabel: string;
  services: ServiceTag[];
  serviceLabels: string[];
  rating: number | null;
  userRatingCount: number | null;
  weekdayDescriptions: string[];
  businessStatus: string | null;
  durationMillis: number | null;
  distanceMeters: number | null;
  etaText: string;
  distanceText: string;
}

export interface AutocompleteSuggestionItem {
  placeId: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
  suggestion: google.maps.places.AutocompleteSuggestion;
}

export interface ActiveRouteSummary {
  branchId: string;
  branchName: string;
  branchTypeLabel: string;
  travelMode: TravelModeOption;
  etaText: string;
  distanceText: string;
  durationMillis: number | null;
  distanceMeters: number | null;
  route: google.maps.routes.Route;
}

export const NYC_CENTER: google.maps.LatLngLiteral = {
  lat: 40.7549,
  lng: -73.984,
};

export const DEFAULT_ORIGIN: OriginPoint = {
  label: 'Penn Station (Midtown West)',
  address: '234 W 31st St, New York, NY 10001',
  lat: 40.7506,
  lng: -73.9935,
};

export const PRESET_ORIGINS: OriginPoint[] = [
  DEFAULT_ORIGIN,
  {
    label: 'Grand Central Terminal',
    address: '89 E 42nd St, New York, NY 10017',
    lat: 40.7527,
    lng: -73.9772,
  },
  {
    label: 'Union Square',
    address: 'E 14th St & Broadway, New York, NY 10003',
    lat: 40.7359,
    lng: -73.9911,
  },
  {
    label: 'SoHo / Broadway',
    address: '540 Broadway, New York, NY 10012',
    lat: 40.7233,
    lng: -73.9977,
  },
];

export const SERVICE_METADATA: Record<
  ServiceTag,
  { label: string; testId: string }
> = {
  pickup: { label: 'Click & Collect', testId: 'filter-service-pickup' },
  coffee: { label: 'Express Espresso', testId: 'filter-service-coffee' },
  cash: { label: 'Cash Deposit', testId: 'filter-service-cash' },
  open24: { label: 'Open 24h', testId: 'filter-service-open24' },
};

export const BRANCH_TYPE_METADATA: Record<
  BranchType,
  { label: string; shortCode: string; color: string }
> = {
  flagship: {
    label: 'Flagship Store',
    shortCode: 'F',
    color: '#1d4ed8',
  },
  kiosk: {
    label: 'Express Kiosk',
    shortCode: 'K',
    color: '#d97706',
  },
  atm: {
    label: '24/7 ATM',
    shortCode: 'A',
    color: '#059669',
  },
};
