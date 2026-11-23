export type BranchType = 'flagship' | 'kiosk' | 'atm';

export type ServiceTag = 'pickup' | 'coffee' | 'cash' | 'open24';

export type TravelModeOption = 'DRIVE' | 'WALK' | 'TRANSIT';

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  location: LatLngPoint;
  branchType: BranchType;
  services: ServiceTag[];
  rating: number | null;
  userRatingCount: number | null;
  todayHours: string | null;
  weekdayDescriptions: string[];
  businessStatus: string | null;
  primaryType: string | null;
  durationMillis: number | null;
  distanceMeters: number | null;
  etaText: string | null;
  distanceText: string | null;
  isFastest: boolean;
}

export interface OriginLocation {
  label: string;
  address: string;
  location: LatLngPoint;
}

export interface AutocompletePredictionItem {
  placeId: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
  prediction: google.maps.places.PlacePrediction;
}

export interface ActiveRouteSummary {
  branchId: string;
  branchName: string;
  branchType: BranchType;
  etaText: string;
  distanceText: string;
  travelMode: TravelModeOption;
  isFastest: boolean;
}

export interface OriginPreset {
  id: string;
  label: string;
  address: string;
  location: LatLngPoint;
}
