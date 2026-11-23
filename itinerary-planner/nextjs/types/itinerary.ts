export type DayNumber = 1 | 2;

export type DiscoveryCategory = 'attractions' | 'restaurants' | 'hotels';

export type TravelMode = 'DRIVE' | 'WALK' | 'TRANSIT';

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export interface PlacePhoto {
  name: string;
  widthPx?: number;
  heightPx?: number;
  authorAttributions?: Array<{
    displayName?: string;
    uri?: string;
  }>;
}

export interface PlaceOpeningHours {
  openNow?: boolean;
  weekdayDescriptions?: string[];
}

export interface PlaceItem {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: LatLngLiteral;
  rating?: number;
  userRatingCount?: number;
  regularOpeningHours?: PlaceOpeningHours;
  photos?: PlacePhoto[];
  primaryTypeDisplayName?: string;
  priceLevel?: string;
  googleMapsUri?: string;
  utcOffsetMinutes?: number;
  category?: DiscoveryCategory;
}

export interface TimeZoneInfo {
  timeZoneId: string;
  timeZoneName: string;
  rawOffset: number;
  dstOffset: number;
  source: 'timezone-api' | 'place-fallback';
}

export interface RouteLegSummary {
  distanceMeters: number;
  durationSeconds: number;
  durationText: string;
}

export interface ComputedRouteData {
  distanceMeters: number;
  durationSeconds: number;
  durationText: string;
  encodedPolyline: string;
  optimizedIntermediateWaypointIndex?: number[];
  legs: RouteLegSummary[];
  viewport?: {
    low: { latitude: number; longitude: number };
    high: { latitude: number; longitude: number };
  };
}

export interface DestinationState {
  name: string;
  formattedAddress: string;
  center: LatLngLiteral;
  zoom: number;
  placeId?: string;
  utcOffsetMinutes?: number;
}

export interface DestinationPreset {
  id: string;
  label: string;
  city: string;
  center: LatLngLiteral;
  zoom: number;
}
