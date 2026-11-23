export type TravelModeKey = 'DRIVING' | 'TRANSIT' | 'WALKING';

export interface ClinicPhoto {
  url: string;
  authorName?: string;
  authorUri?: string;
}

export interface ClinicReview {
  authorName: string;
  authorUri?: string;
  rating: number;
  relativeTime: string;
  text: string;
}

export interface OpenStatus {
  isOpen: boolean | null;
  label: string;
}

export interface ClinicVenueData {
  id: string;
  name: string;
  category: string;
  address: string;
  location: google.maps.LatLngLiteral;
  rating: number | null;
  userRatingCount: number | null;
  phone: string | null;
  websiteUri: string | null;
  googleMapsUri: string | null;
  weekdayDescriptions: string[];
  openStatus: OpenStatus;
  photos: ClinicPhoto[];
  reviews: ClinicReview[];
}

export interface OriginLocation {
  id?: string;
  name: string;
  address: string;
  location: google.maps.LatLngLiteral;
  isSeedDefault: boolean;
}

export interface RouteSummaryData {
  travelMode: TravelModeKey;
  durationText: string;
  distanceText: string;
  distanceMeters: number;
  durationMillis: number;
  description: string | null;
  warnings: string[];
}

export interface BookingSubmission {
  referenceId: string;
  patientName: string;
  contact: string;
  specialty: string;
  visitType: 'in-clinic' | 'home-visit';
  date: string;
  timeSlot: string;
  originAddress: string;
  clinicName: string;
}
