export type ItineraryDay = 1 | 2;

export type DiscoveryCategory = 'attractions' | 'restaurants' | 'hotels';

export type TravelModeKey = 'DRIVE' | 'WALK' | 'TRANSIT';

export interface DestinationPreset {
  id: string;
  name: string;
  country: string;
  query: string;
  center: google.maps.LatLngLiteral;
  zoom: number;
  fallbackTimeZoneId: string;
  fallbackTimeZoneName: string;
  fallbackUtcOffsetMinutes: number;
}

export interface PlaceCardItem {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: google.maps.LatLngLiteral;
  rating: number | null;
  userRatingCount: number | null;
  weekdayDescriptions: string[];
  todayHoursSummary: string;
  photoUrl: string | null;
  primaryTypeDisplayName: string;
  priceLevel: string | null;
  googleMapsUri: string | null;
  utcOffsetMinutes: number | null;
  category: DiscoveryCategory;
}

export interface ItineraryStop extends PlaceCardItem {
  stopUid: string;
}

export interface RouteLegSummary {
  fromName: string;
  toName: string;
  distanceMeters: number;
  durationMillis: number;
  distanceText: string;
  durationText: string;
}

export interface DayRouteSummary {
  day: ItineraryDay;
  travelMode: TravelModeKey;
  distanceMeters: number;
  durationMillis: number;
  totalDistanceText: string;
  totalDurationText: string;
  path: google.maps.LatLngLiteral[];
  legs: RouteLegSummary[];
  optimized: boolean;
  errorMessage: string | null;
}

export interface TimeZoneInfo {
  timeZoneId: string;
  timeZoneName: string;
  rawOffsetSeconds: number;
  dstOffsetSeconds: number;
  totalOffsetMinutes: number;
  utcOffsetLabel: string;
  source: 'timezone-api' | 'place-utc-offset' | 'preset-fallback';
}

export interface StreetViewPreviewState {
  placeId: string | null;
  title: string;
  address: string;
  location: google.maps.LatLngLiteral;
  status: 'idle' | 'loading' | 'ready' | 'unavailable';
  copyright: string | null;
  panoId: string | null;
  message: string | null;
}

export const DAY_COLORS: Record<
  ItineraryDay,
  { primary: string; border: string; lightBg: string; label: string }
> = {
  1: {
    primary: '#0F766E',
    border: '#115E59',
    lightBg: '#F0FDFA',
    label: 'Day 1',
  },
  2: {
    primary: '#D97706',
    border: '#B45309',
    lightBg: '#FFFBEB',
    label: 'Day 2',
  },
};

export const DESTINATION_PRESETS: DestinationPreset[] = [
  {
    id: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    query: 'top tourist attractions in Tokyo',
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
    query: 'top tourist attractions in Kyoto',
    center: { lat: 35.0116, lng: 135.7681 },
    zoom: 13,
    fallbackTimeZoneId: 'Asia/Tokyo',
    fallbackTimeZoneName: 'Japan Standard Time',
    fallbackUtcOffsetMinutes: 540,
  },
  {
    id: 'london',
    name: 'London',
    country: 'United Kingdom',
    query: 'top tourist attractions in London',
    center: { lat: 51.5074, lng: -0.1278 },
    zoom: 12,
    fallbackTimeZoneId: 'Europe/London',
    fallbackTimeZoneName: 'Greenwich Mean Time',
    fallbackUtcOffsetMinutes: 0,
  },
  {
    id: 'paris',
    name: 'Paris',
    country: 'France',
    query: 'top tourist attractions in Paris',
    center: { lat: 48.8566, lng: 2.3522 },
    zoom: 12,
    fallbackTimeZoneId: 'Europe/Paris',
    fallbackTimeZoneName: 'Central European Time',
    fallbackUtcOffsetMinutes: 60,
  },
  {
    id: 'new-york',
    name: 'New York',
    country: 'United States',
    query: 'top tourist attractions in New York City',
    center: { lat: 40.758, lng: -73.9855 },
    zoom: 12,
    fallbackTimeZoneId: 'America/New_York',
    fallbackTimeZoneName: 'Eastern Time',
    fallbackUtcOffsetMinutes: -300,
  },
  {
    id: 'sydney',
    name: 'Sydney',
    country: 'Australia',
    query: 'top tourist attractions in Sydney',
    center: { lat: -33.8688, lng: 151.2093 },
    zoom: 13,
    fallbackTimeZoneId: 'Australia/Sydney',
    fallbackTimeZoneName: 'Australian Eastern Time',
    fallbackUtcOffsetMinutes: 600,
  },
];

declare global {
  interface Window {
    __GMP_CONFIG__?: {
      googleMapsApiKey?: string;
    };
  }
}
