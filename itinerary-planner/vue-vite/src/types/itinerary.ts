export type DayId = 1 | 2;

export type DiscoveryCategory = 'attractions' | 'restaurants' | 'hotels';

export type TravelModeKey = 'DRIVE' | 'WALK' | 'TRANSIT';

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface CityPreset {
  id: string;
  name: string;
  country: string;
  center: LatLngPoint;
  zoom: number;
  fallbackTimeZoneId: string;
  fallbackTimeZoneName: string;
  fallbackUtcOffsetMinutes: number;
}

export interface DiscoveredPlace {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: LatLngPoint;
  rating: number | null;
  userRatingCount: number | null;
  primaryTypeDisplayName: string | null;
  weekdayDescriptions: string[];
  photoUrl: string | null;
  photoAttributions: string[];
  googleMapsURI: string | null;
  utcOffsetMinutes: number | null;
  category: DiscoveryCategory;
}

export interface ItineraryStop {
  uid: string;
  place: DiscoveredPlace;
  day: DayId;
}

export interface RouteLegSummary {
  fromName: string;
  toName: string;
  distanceMeters: number;
  durationMillis: number;
  distanceText: string;
  durationText: string;
}

export interface ComputedRouteResult {
  polylines: google.maps.Polyline[];
  totalDistanceMeters: number;
  totalDurationMillis: number;
  distanceText: string;
  durationText: string;
  legs: RouteLegSummary[];
  optimizedIntermediateIndices: number[];
  bounds: google.maps.LatLngBounds | null;
  notice: string | null;
}

export interface TimeZoneInfo {
  timeZoneId: string;
  timeZoneName: string;
  rawOffsetSeconds: number;
  dstOffsetSeconds: number;
  totalOffsetMinutes: number;
  utcOffsetLabel: string;
  source: 'timezone-api' | 'place-offset' | 'preset';
}

export const DAY_COLORS: Record<DayId, { primary: string; border: string; light: string; label: string }> = {
  1: {
    primary: '#0F766E',
    border: '#115E59',
    light: '#CCFBF1',
    label: 'Day 1',
  },
  2: {
    primary: '#D97706',
    border: '#B45309',
    light: '#FEF3C7',
    label: 'Day 2',
  },
};

export const CITY_PRESETS: CityPreset[] = [
  {
    id: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    center: { lat: 35.6812, lng: 139.7671 },
    zoom: 12,
    fallbackTimeZoneId: 'Asia/Tokyo',
    fallbackTimeZoneName: 'Japan Standard Time',
    fallbackUtcOffsetMinutes: 540,
  },
  {
    id: 'kyoto',
    name: 'Kyoto',
    country: 'Japan',
    center: { lat: 35.0116, lng: 135.7681 },
    zoom: 12,
    fallbackTimeZoneId: 'Asia/Tokyo',
    fallbackTimeZoneName: 'Japan Standard Time',
    fallbackUtcOffsetMinutes: 540,
  },
  {
    id: 'paris',
    name: 'Paris',
    country: 'France',
    center: { lat: 48.8566, lng: 2.3522 },
    zoom: 12,
    fallbackTimeZoneId: 'Europe/Paris',
    fallbackTimeZoneName: 'Central European Time',
    fallbackUtcOffsetMinutes: 60,
  },
  {
    id: 'london',
    name: 'London',
    country: 'United Kingdom',
    center: { lat: 51.5074, lng: -0.1278 },
    zoom: 12,
    fallbackTimeZoneId: 'Europe/London',
    fallbackTimeZoneName: 'Greenwich Mean Time',
    fallbackUtcOffsetMinutes: 0,
  },
  {
    id: 'new-york',
    name: 'New York',
    country: 'United States',
    center: { lat: 40.758, lng: -73.9855 },
    zoom: 12,
    fallbackTimeZoneId: 'America/New_York',
    fallbackTimeZoneName: 'Eastern Standard Time',
    fallbackUtcOffsetMinutes: -300,
  },
  {
    id: 'sydney',
    name: 'Sydney',
    country: 'Australia',
    center: { lat: -33.8688, lng: 151.2093 },
    zoom: 12,
    fallbackTimeZoneId: 'Australia/Sydney',
    fallbackTimeZoneName: 'Australian Eastern Daylight Time',
    fallbackUtcOffsetMinutes: 660,
  },
];
