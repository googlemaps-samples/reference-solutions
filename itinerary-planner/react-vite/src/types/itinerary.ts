export type DiscoveryCategory = 'attractions' | 'restaurants' | 'hotels';

export type ItineraryDay = 1 | 2;

export type TravelModeOption = 'DRIVING' | 'WALKING' | 'TRANSIT';

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface PlaceItem {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: LatLngPoint;
  rating: number | null;
  userRatingCount: number | null;
  weekdayDescriptions: string[];
  photoUrl: string | null;
  primaryTypeDisplayName: string | null;
  priceLevel: string | null;
  googleMapsURI: string | null;
  utcOffsetMinutes: number | null;
  category: DiscoveryCategory | 'custom';
}

export interface DestinationPreset {
  id: string;
  label: string;
  cityQuery: string;
  center: LatLngPoint;
  zoom: number;
}

export interface TimeZoneState {
  timeZoneId: string | null;
  timeZoneName: string;
  rawOffsetSeconds: number;
  dstOffsetSeconds: number;
  totalOffsetSeconds: number;
  utcOffsetLabel: string;
  source: 'timezone-api' | 'places-fallback' | 'loading';
}

export interface RouteLegSummary {
  fromName: string;
  toName: string;
  distanceMeters: number;
  durationMillis: number;
  distanceText?: string;
  durationText?: string;
}

export interface RouteSummaryState {
  totalDistanceMeters: number;
  totalDurationMillis: number;
  legs: RouteLegSummary[];
  isComputing: boolean;
  isOptimized: boolean;
  note: string | null;
  error: string | null;
}
