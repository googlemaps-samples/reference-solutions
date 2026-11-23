export type PlaceCategory = 'restaurant' | 'cafe' | 'museum' | 'park';
export type FilterCategory = 'all' | PlaceCategory;

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export interface NeighborhoodPreset {
  id: string;
  name: string;
  subtitle: string;
  center: LatLngLiteral;
  zoom: number;
}

export const DEFAULT_RADIUS_METERS = 5000;

export const LONDON_PRESETS: NeighborhoodPreset[] = [
  {
    id: 'covent-garden',
    name: 'Covent Garden & West End',
    subtitle: 'WC2 · Theatreland & Piazza',
    center: { lat: 51.5118, lng: -0.128 },
    zoom: 13
  },
  {
    id: 'soho',
    name: 'Soho',
    subtitle: 'W1F · Dining & Independent Cafes',
    center: { lat: 51.5136, lng: -0.1365 },
    zoom: 14
  },
  {
    id: 'south-bank',
    name: 'South Bank',
    subtitle: 'SE1 · Cultural Mile & Thameside',
    center: { lat: 51.5055, lng: -0.114 },
    zoom: 14
  },
  {
    id: 'bloomsbury',
    name: 'Bloomsbury',
    subtitle: 'WC1 · Museums & Garden Squares',
    center: { lat: 51.5229, lng: -0.128 },
    zoom: 14
  }
];

export interface CategoryMeta {
  key: PlaceCategory;
  label: string;
  singular: string;
  background: string;
  borderColor: string;
  glyphColor: string;
  glyphText: string;
  badgeBg: string;
  badgeText: string;
  includedTypes: string[];
}

export const CATEGORY_META: Record<PlaceCategory, CategoryMeta> = {
  restaurant: {
    key: 'restaurant',
    label: 'Restaurants',
    singular: 'Restaurant',
    background: '#D94E34',
    borderColor: '#9A2F1B',
    glyphColor: '#FFFFFF',
    glyphText: 'R',
    badgeBg: '#FEF2F0',
    badgeText: '#B8361E',
    includedTypes: ['restaurant']
  },
  cafe: {
    key: 'cafe',
    label: 'Cafes',
    singular: 'Cafe',
    background: '#C27803',
    borderColor: '#7C4A02',
    glyphColor: '#FFFFFF',
    glyphText: 'C',
    badgeBg: '#FEF8EC',
    badgeText: '#9A5B02',
    includedTypes: ['cafe', 'coffee_shop']
  },
  museum: {
    key: 'museum',
    label: 'Museums',
    singular: 'Museum',
    background: '#4F46E5',
    borderColor: '#312E81',
    glyphColor: '#FFFFFF',
    glyphText: 'M',
    badgeBg: '#EEF2FF',
    badgeText: '#3730A3',
    includedTypes: ['museum']
  },
  park: {
    key: 'park',
    label: 'Parks',
    singular: 'Park',
    background: '#15803D',
    borderColor: '#14532D',
    glyphColor: '#FFFFFF',
    glyphText: 'P',
    badgeBg: '#ECFDF3',
    badgeText: '#166534',
    includedTypes: ['park']
  }
};

export const ALL_CATEGORIES: PlaceCategory[] = [
  'restaurant',
  'cafe',
  'museum',
  'park'
];

export interface PlaceReview {
  authorName: string;
  authorUri?: string;
  rating: number | null;
  relativePublishTimeDescription: string;
  text: string;
  googleMapsUri?: string;
}

export interface PlaceSummary {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: LatLngLiteral;
  category: PlaceCategory;
  primaryType: string;
  primaryTypeDisplayName: string;
  types: string[];
  rating: number | null;
  userRatingCount: number | null;
  priceLevel: string | null;
  weekdayDescriptions: string[];
  photoUrls: string[];
  googleMapsUri?: string;
}

export interface PlaceDetail extends PlaceSummary {
  reviews: PlaceReview[];
  websiteUri?: string;
  internationalPhoneNumber?: string;
}

export interface GeocodeAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export interface GeocodeLocationResult {
  formattedAddress: string;
  placeId: string;
  location: LatLngLiteral;
  neighborhood?: string;
  postalCode?: string;
  plusCode?: string;
  addressComponents: GeocodeAddressComponent[];
}

export interface CommunitySpot {
  id: string;
  name: string;
  category: PlaceCategory | 'community';
  note: string;
  location: LatLngLiteral;
  formattedAddress: string;
  placeId?: string;
  createdAt: string;
}

export function inferPlaceCategory(
  primaryType?: string | null,
  types?: string[] | null
): PlaceCategory {
  const all = [primaryType ?? '', ...(types ?? [])].map((t) =>
    t.toLowerCase()
  );

  if (
    all.some((t) =>
      ['cafe', 'coffee_shop', 'tea_house', 'bakery'].includes(t)
    )
  ) {
    return 'cafe';
  }
  if (
    all.some((t) => ['museum', 'art_gallery', 'history_museum'].includes(t))
  ) {
    return 'museum';
  }
  if (
    all.some((t) => ['park', 'national_park', 'garden', 'botanical_garden'].includes(t))
  ) {
    return 'park';
  }
  if (
    all.some((t) =>
      [
        'restaurant',
        'bistro',
        'pub',
        'bar',
        'brunch_restaurant',
        'seafood_restaurant',
        'italian_restaurant',
        'british_restaurant',
        'indian_restaurant',
        'japanese_restaurant',
        'french_restaurant'
      ].includes(t)
    )
  ) {
    return 'restaurant';
  }
  return 'restaurant';
}

export function formatPriceLevel(priceLevel?: string | number | null): string {
  if (priceLevel === null || priceLevel === undefined) return 'Not listed';
  const normalized = String(priceLevel).toUpperCase();
  switch (normalized) {
    case 'PRICE_LEVEL_FREE':
    case 'FREE':
    case '0':
      return 'Free';
    case 'PRICE_LEVEL_INEXPENSIVE':
    case 'INEXPENSIVE':
    case '1':
      return '£';
    case 'PRICE_LEVEL_MODERATE':
    case 'MODERATE':
    case '2':
      return '££';
    case 'PRICE_LEVEL_EXPENSIVE':
    case 'EXPENSIVE':
    case '3':
      return '£££';
    case 'PRICE_LEVEL_VERY_EXPENSIVE':
    case 'VERY_EXPENSIVE':
    case '4':
      return '££££';
    default:
      return 'Not listed';
  }
}

export function getTodayWeekdayHours(
  weekdayDescriptions?: string[] | null
): string | null {
  if (!weekdayDescriptions || weekdayDescriptions.length === 0) return null;
  const jsDay = new Date().getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const mondayIndex = (jsDay + 6) % 7;
  const entry = weekdayDescriptions[mondayIndex] ?? weekdayDescriptions[0];
  return entry ?? null;
}

export function haversineDistanceMeters(
  a: LatLngLiteral,
  b: LatLngLiteral
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const c =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
}

export function formatDistanceLabel(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}
