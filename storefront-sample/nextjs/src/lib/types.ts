export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export type TravelMode = 'DRIVE' | 'TRANSIT' | 'WALK';

export type ViewMode = 'map' | 'split' | 'street-view';

export interface PlaceReview {
  authorName: string;
  authorPhotoUri?: string;
  authorUri?: string;
  rating: number;
  relativePublishTimeDescription: string;
  text: string;
  googleMapsUri?: string;
}

export interface PlacePhoto {
  name: string;
  directUri?: string;
  widthPx?: number;
  heightPx?: number;
  authorAttributions?: Array<{
    displayName: string;
    uri?: string;
  }>;
}

export interface PlaceHoursPoint {
  day: number;
  hour: number;
  minute: number;
}

export interface PlaceHoursPeriod {
  open: PlaceHoursPoint;
  close?: PlaceHoursPoint;
}

export interface ClinicPlaceDetails {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: LatLngLiteral;
  rating?: number;
  userRatingCount?: number;
  openNow?: boolean;
  weekdayDescriptions: string[];
  periods?: PlaceHoursPeriod[];
  reviews: PlaceReview[];
  photos: PlacePhoto[];
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  businessStatus?: string;
}

export interface RouteSummary {
  travelMode: TravelMode;
  durationText: string;
  durationSeconds: number;
  distanceText: string;
  distanceMeters: number;
  encodedPolyline?: string;
  path?: LatLngLiteral[];
}

export interface OriginLocation {
  label: string;
  address: string;
  location: LatLngLiteral;
}

export type VisitType = 'in-clinic' | 'home-visit';

export interface BookingConfirmation {
  confirmationCode: string;
  patientName: string;
  specialty: string;
  visitType: VisitType;
  date: string;
  timeSlot: string;
  originAddress?: string;
}
