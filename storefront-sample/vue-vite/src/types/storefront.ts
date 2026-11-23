export type TravelModeKey = 'DRIVING' | 'TRANSIT' | 'WALKING';

export type MapViewMode = 'map' | 'split' | 'streetview';

export type VisitType = 'in-clinic' | 'home-visit';

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface ClinicReviewItem {
  id: string;
  authorName: string;
  authorUri: string | null;
  authorPhotoUri: string | null;
  rating: number | null;
  relativePublishTime: string;
  text: string;
  googleMapsUri: string | null;
}

export interface ClinicPhotoItem {
  id: string;
  url: string;
  authorName: string | null;
  authorUri: string | null;
}

export interface OpenStatusSummary {
  isOpen: boolean | null;
  label: string;
  detail: string;
}

export interface ClinicVenueData {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: LatLngPoint;
  rating: number | null;
  userRatingCount: number | null;
  nationalPhoneNumber: string | null;
  websiteUri: string | null;
  googleMapsUri: string | null;
  businessStatus: string | null;
  weekdayDescriptions: string[];
  openStatus: OpenStatusSummary;
  photos: ClinicPhotoItem[];
  reviews: ClinicReviewItem[];
}

export interface OriginSelection {
  label: string;
  address: string;
  location: LatLngPoint;
  isDefaultSeed?: boolean;
}

export interface ComputedRouteSummary {
  travelMode: TravelModeKey;
  durationText: string;
  distanceText: string;
  durationMillis: number | null;
  distanceMeters: number | null;
  originLabel: string;
  destinationLabel: string;
}

export interface AppointmentBookingPayload {
  patientName: string;
  contactInfo: string;
  specialty: string;
  visitType: VisitType;
  preferredDate: string;
  preferredTime: string;
}

export interface AppointmentConfirmation {
  referenceCode: string;
  patientName: string;
  contactInfo: string;
  specialty: string;
  visitType: VisitType;
  preferredDate: string;
  preferredTime: string;
  clinicName: string;
  clinicAddress: string;
  etaSummary: string | null;
}
