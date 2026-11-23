export type BranchType = 'flagship' | 'kiosk' | 'atm';

export type ServiceTag = 'pickup' | 'coffee' | 'cash' | 'open24';

export type TravelMode = 'DRIVE' | 'WALK' | 'TRANSIT';

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  location: LatLngLiteral;
  branchType: BranchType;
  services: ServiceTag[];
  primaryType?: string;
  types: string[];
  rating?: number;
  userRatingCount?: number;
  weekdayDescriptions: string[];
  businessStatus?: string;
  nationalPhoneNumber?: string;
}

export interface OriginLocation {
  label: string;
  address?: string;
  location: LatLngLiteral;
  placeId?: string;
}

export interface RouteMatrixMetric {
  branchId: string;
  durationSeconds: number;
  durationText: string;
  distanceMeters: number;
  distanceText: string;
  condition?: string;
}

export interface ComputedRoute {
  branchId: string;
  travelMode: TravelMode;
  encodedPolyline: string;
  durationSeconds: number;
  durationText: string;
  distanceMeters: number;
  distanceText: string;
}

export interface AutocompleteSuggestionItem {
  placeId: string;
  primaryText: string;
  secondaryText: string;
  fullText: string;
}

export interface RawGooglePlace {
  id?: string;
  displayName?: {
    text?: string;
    languageCode?: string;
  };
  formattedAddress?: string;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  types?: string[];
  primaryType?: string;
  rating?: number;
  userRatingCount?: number;
  regularOpeningHours?: {
    weekdayDescriptions?: string[];
  };
  businessStatus?: string;
  nationalPhoneNumber?: string;
}
