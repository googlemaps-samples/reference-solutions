export const CLINIC_DEFAULT_CENTER: google.maps.LatLngLiteral = {
  lat: 37.7896,
  lng: -122.4076,
};

export const CLINIC_DEFAULT_ZOOM = 13;
export const HOME_VISIT_RADIUS_METERS = 3500;
export const SEED_SEARCH_QUERY = '450 Sutter Dental San Francisco';

export const DEFAULT_ORIGIN = {
  label: 'Ferry Building, San Francisco, CA',
  location: {
    lat: 37.7955,
    lng: -122.3937,
  } satisfies google.maps.LatLngLiteral,
};

export const GMP_ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';

export type ViewMode = 'map' | 'split' | 'street-view';
export type TravelModeId = 'DRIVING' | 'TRANSIT' | 'WALKING';
export type VisitType = 'in-clinic' | 'home-visit';

export interface ClinicPhoto {
  url: string;
  authorName: string;
  authorUri: string | null;
}

export interface ClinicReview {
  authorName: string;
  authorUri: string | null;
  authorPhotoUri: string | null;
  rating: number;
  relativeTime: string;
  text: string;
}

export interface ClinicDetails {
  id: string;
  name: string;
  formattedAddress: string;
  location: google.maps.LatLngLiteral;
  rating: number | null;
  userRatingCount: number;
  isOpenNow: boolean | null;
  weekdayDescriptions: string[];
  nationalPhoneNumber: string | null;
  websiteUri: string | null;
  googleMapsUri: string | null;
  businessStatus: string | null;
  photos: ClinicPhoto[];
  reviews: ClinicReview[];
}

export interface OriginSelection {
  label: string;
  location: google.maps.LatLngLiteral;
}

export interface RouteSummary {
  mode: TravelModeId;
  modeLabel: string;
  durationText: string;
  distanceText: string;
  originLabel: string;
  path: google.maps.LatLngLiteral[];
  viewport: google.maps.LatLngBounds | null;
}

export interface StreetViewEntranceData {
  panoId: string;
  position: google.maps.LatLngLiteral;
  heading: number;
  pitch: number;
  copyright: string | null;
  imageDate: string | null;
}

export interface BookingSubmission {
  confirmationCode: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  specialty: string;
  visitType: VisitType;
  preferredDate: string;
  preferredTime: string;
  notes: string;
}

declare global {
  interface Window {
    __ENV__?: {
      GOOGLE_MAPS_API_KEY?: string;
    };
  }
}
