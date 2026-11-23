export type BranchType = 'flagship' | 'kiosk' | 'atm';

export type ServiceTag = 'pickup' | 'coffee' | 'cash' | 'open24';

export type TravelModeOption = 'DRIVE' | 'WALK' | 'TRANSIT';

export interface OriginPoint {
  label: string;
  address: string;
  location: google.maps.LatLngLiteral;
  placeId?: string;
}

export interface BranchLocation {
  id: string;
  name: string;
  address: string;
  location: google.maps.LatLngLiteral;
  branchType: BranchType;
  services: ServiceTag[];
  rating: number | null;
  userRatingCount: number | null;
  weekdayDescriptions: string[];
  todayHours: string;
  isOpen24Hours: boolean;
  primaryType: string | null;
  types: string[];
  businessStatus: string | null;
}

export interface BranchMatrixMetrics {
  branchId: string;
  durationMillis: number | null;
  distanceMeters: number | null;
  durationText: string;
  distanceText: string;
  isEstimatedFallback: boolean;
}

export interface ActiveRouteInfo {
  branchId: string;
  branchName: string;
  travelMode: TravelModeOption;
  durationMillis: number | null;
  distanceMeters: number | null;
  durationText: string;
  distanceText: string;
  warnings: string[];
  route: google.maps.routes.Route;
}

export const NYC_CENTER: google.maps.LatLngLiteral = {
  lat: 40.7549,
  lng: -73.984,
};

export const INITIAL_ZOOM = 12;

export const DEFAULT_ORIGIN: OriginPoint = {
  label: 'Penn Station, Midtown NYC',
  address: '234 W 31st St, New York, NY 10001',
  location: { lat: 40.7506, lng: -73.9935 },
};

export const NYC_ORIGIN_PRESETS: OriginPoint[] = [
  DEFAULT_ORIGIN,
  {
    label: 'Grand Central Terminal',
    address: '89 E 42nd St, New York, NY 10017',
    location: { lat: 40.7527, lng: -73.9772 },
  },
  {
    label: 'SoHo / Spring St',
    address: 'Spring St & Broadway, New York, NY 10012',
    location: { lat: 40.7233, lng: -73.9985 },
  },
  {
    label: 'Upper West Side / 72nd St',
    address: '2077 Broadway, New York, NY 10023',
    location: { lat: 40.7789, lng: -73.9819 },
  },
];

export const BRANCH_TYPE_META: Record<
  BranchType,
  {
    label: string;
    shortLabel: string;
    color: string;
    bgColor: string;
    borderColor: string;
    badgeTextColor: string;
  }
> = {
  flagship: {
    label: 'Flagship Store',
    shortLabel: 'Flagship',
    color: '#1D4ED8',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    badgeTextColor: '#1E40AF',
  },
  kiosk: {
    label: 'Express Kiosk',
    shortLabel: 'Kiosk',
    color: '#D97706',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
    badgeTextColor: '#92400E',
  },
  atm: {
    label: '24/7 ATM',
    shortLabel: '24/7 ATM',
    color: '#059669',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    badgeTextColor: '#065F46',
  },
};

export const SERVICE_META: Record<
  ServiceTag,
  {
    label: string;
    shortLabel: string;
  }
> = {
  pickup: {
    label: 'Click & Collect',
    shortLabel: 'Click & Collect',
  },
  coffee: {
    label: 'Express Espresso',
    shortLabel: 'Espresso',
  },
  cash: {
    label: 'Cash Deposit',
    shortLabel: 'Cash Deposit',
  },
  open24: {
    label: 'Open 24h',
    shortLabel: 'Open 24h',
  },
};
