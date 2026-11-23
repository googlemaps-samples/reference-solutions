export type PlaceCategory = 'restaurant' | 'cafe' | 'museum' | 'park';
export type CategoryFilter = 'all' | PlaceCategory;

export interface NeighborhoodPreset {
  id: string;
  label: string;
  subtitle: string;
  center: google.maps.LatLngLiteral;
}

export interface CategoryMeta {
  id: PlaceCategory;
  label: string;
  pluralLabel: string;
  glyphText: string;
  background: string;
  borderColor: string;
  badgeBg: string;
  badgeText: string;
}

export interface PlaceReviewItem {
  authorName: string;
  authorPhotoUri: string | null;
  rating: number | null;
  relativeTime: string;
  text: string;
}

export interface DiscoveredPlace {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: google.maps.LatLngLiteral;
  category: PlaceCategory;
  primaryTypeDisplayName: string;
  rating: number | null;
  userRatingCount: number | null;
  priceLevel: google.maps.places.PriceLevelString | null;
  priceLabel: string;
  weekdayDescriptions: string[];
  todayHours: string;
  photoUrl: string | null;
  googleMapsUri: string | null;
  websiteUri: string | null;
  internationalPhoneNumber: string | null;
  reviews: PlaceReviewItem[];
  detailsLoaded: boolean;
  pin: google.maps.marker.PinElement;
}

export interface CommunitySpot {
  id: string;
  name: string;
  note: string;
  category: PlaceCategory;
  address: string;
  placeId: string | null;
  location: google.maps.LatLngLiteral;
  createdAt: string;
  pin: google.maps.marker.PinElement;
}

export interface ReverseGeocodeInspection {
  location: google.maps.LatLngLiteral;
  formattedAddress: string;
  placeId: string | null;
  pin: google.maps.marker.PinElement;
}

export const SEARCH_RADIUS_METERS = 5000;
export const MAX_COMPARISON_ITEMS = 3;
export const GMP_ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';

export const LONDON_NEIGHBORHOOD_PRESETS: NeighborhoodPreset[] = [
  {
    id: 'covent-garden',
    label: 'Covent Garden & West End',
    subtitle: 'Theatreland, Piazza & Seven Dials',
    center: { lat: 51.5118, lng: -0.128 },
  },
  {
    id: 'soho',
    label: 'Soho',
    subtitle: 'Dining, Jazz & Independent Cafes',
    center: { lat: 51.5137, lng: -0.1337 },
  },
  {
    id: 'south-bank',
    label: 'South Bank',
    subtitle: 'Thameside Culture, Galleries & Walks',
    center: { lat: 51.5055, lng: -0.1145 },
  },
  {
    id: 'bloomsbury',
    label: 'Bloomsbury',
    subtitle: 'Museums, Bookshops & Garden Squares',
    center: { lat: 51.5229, lng: -0.1277 },
  },
];

export const CATEGORY_METADATA: Record<PlaceCategory, CategoryMeta> = {
  restaurant: {
    id: 'restaurant',
    label: 'Restaurant',
    pluralLabel: 'Restaurants',
    glyphText: 'R',
    background: '#D93829',
    borderColor: '#991B1B',
    badgeBg: '#FEE2E2',
    badgeText: '#991B1B',
  },
  cafe: {
    id: 'cafe',
    label: 'Cafe',
    pluralLabel: 'Cafes',
    glyphText: 'C',
    background: '#C25E00',
    borderColor: '#7C2D12',
    badgeBg: '#FEF3C7',
    badgeText: '#92400E',
  },
  museum: {
    id: 'museum',
    label: 'Museum',
    pluralLabel: 'Museums',
    glyphText: 'M',
    background: '#4F46E5',
    borderColor: '#312E81',
    badgeBg: '#E0E7FF',
    badgeText: '#3730A3',
  },
  park: {
    id: 'park',
    label: 'Park',
    pluralLabel: 'Parks',
    glyphText: 'P',
    background: '#15803D',
    borderColor: '#14532D',
    badgeBg: '#DCFCE7',
    badgeText: '#166534',
  },
};

export const CORE_PLACE_CATEGORIES: PlaceCategory[] = [
  'restaurant',
  'cafe',
  'museum',
  'park',
];

export function formatPriceLevel(
  priceLevel: google.maps.places.PriceLevelString | null | undefined,
): string {
  switch (priceLevel) {
    case 'FREE':
      return 'Free';
    case 'INEXPENSIVE':
      return '£';
    case 'MODERATE':
      return '££';
    case 'EXPENSIVE':
      return '£££';
    case 'VERY_EXPENSIVE':
      return '££££';
    default:
      return 'N/A';
  }
}

export function extractTodayHours(weekdayDescriptions: string[]): string {
  if (!weekdayDescriptions || weekdayDescriptions.length === 0) {
    return 'Hours unavailable';
  }
  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const todayName = dayNames[new Date().getDay()];
  const match = weekdayDescriptions.find((entry) =>
    entry.toLowerCase().startsWith(todayName.toLowerCase()),
  );
  if (!match) {
    return weekdayDescriptions[0];
  }
  const colonIdx = match.indexOf(':');
  return colonIdx >= 0 ? match.slice(colonIdx + 1).trim() : match;
}
