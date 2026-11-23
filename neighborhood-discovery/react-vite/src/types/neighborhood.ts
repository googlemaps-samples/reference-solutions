export type VenueCategory = 'restaurant' | 'cafe' | 'museum' | 'park';
export type PlaceCategory = 'all' | VenueCategory;

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface NeighborhoodPreset {
  id: string;
  label: string;
  subtitle: string;
  center: LatLngPoint;
  zoom: number;
}

export interface PlaceReviewItem {
  authorName: string;
  authorPhotoUri?: string | null;
  authorUri?: string | null;
  rating: number | null;
  relativeTime: string | null;
  text: string | null;
}

export interface PlaceItem {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: LatLngPoint;
  primaryType: string | null;
  primaryTypeDisplayName: string | null;
  types: string[];
  category: VenueCategory;
  rating: number | null;
  userRatingCount: number | null;
  priceLevel: string | null;
  weekdayDescriptions: string[];
  todayHours: string;
  openStatusLabel: string;
  isOpenNow: boolean | null;
  reviews: PlaceReviewItem[];
  photoUri: string | null;
  photoAttribution: string | null;
  websiteUri: string | null;
  internationalPhoneNumber: string | null;
  googleMapsUri: string | null;
  distanceMeters: number;
  detailsLoaded: boolean;
}

export interface ReverseGeocodeResult {
  location: LatLngPoint;
  formattedAddress: string;
  neighborhood: string;
  postalCode: string | null;
  placeId: string | null;
  plusCode: string | null;
}

export interface CommunitySpot {
  id: string;
  name: string;
  category: VenueCategory | 'community';
  note: string;
  formattedAddress: string;
  location: LatLngPoint;
  createdAt: string;
}

export interface CategoryStyleMeta {
  id: PlaceCategory;
  label: string;
  pluralLabel: string;
  color: string;
  borderColor: string;
  bgTint: string;
  textTint: string;
}

export const DEFAULT_CENTER: LatLngPoint = {
  lat: 51.5118,
  lng: -0.128,
};

export const DEFAULT_ZOOM = 13;
export const SEARCH_RADIUS_METERS = 5000;

export const LONDON_PRESETS: NeighborhoodPreset[] = [
  {
    id: 'covent-garden',
    label: 'Covent Garden',
    subtitle: 'West End · Theatreland & Piazza',
    center: { lat: 51.5118, lng: -0.128 },
    zoom: 13,
  },
  {
    id: 'soho',
    label: 'Soho',
    subtitle: 'Dining, Coffee & Carnaby',
    center: { lat: 51.5136, lng: -0.1365 },
    zoom: 14,
  },
  {
    id: 'south-bank',
    label: 'South Bank',
    subtitle: 'Thames Cultural Mile',
    center: { lat: 51.5055, lng: -0.1145 },
    zoom: 13,
  },
  {
    id: 'bloomsbury',
    label: 'Bloomsbury',
    subtitle: 'Museums, Squares & Bookshops',
    center: { lat: 51.5226, lng: -0.1268 },
    zoom: 14,
  },
  {
    id: 'mayfair',
    label: 'Mayfair',
    subtitle: 'Galleries, Parks & Fine Dining',
    center: { lat: 51.5095, lng: -0.1476 },
    zoom: 14,
  },
  {
    id: 'shoreditch',
    label: 'Shoreditch',
    subtitle: 'East London Cafes & Studios',
    center: { lat: 51.5246, lng: -0.0785 },
    zoom: 14,
  },
];

export const CATEGORY_META: Record<VenueCategory | 'community', CategoryStyleMeta> = {
  restaurant: {
    id: 'restaurant',
    label: 'Restaurant',
    pluralLabel: 'Restaurants',
    color: '#dc2626',
    borderColor: '#991b1b',
    bgTint: '#fef2f2',
    textTint: '#b91c1c',
  },
  cafe: {
    id: 'cafe',
    label: 'Cafe',
    pluralLabel: 'Cafes',
    color: '#d97706',
    borderColor: '#92400e',
    bgTint: '#fffbeb',
    textTint: '#b45309',
  },
  museum: {
    id: 'museum',
    label: 'Museum',
    pluralLabel: 'Museums',
    color: '#4f46e5',
    borderColor: '#3730a3',
    bgTint: '#eef2ff',
    textTint: '#4338ca',
  },
  park: {
    id: 'park',
    label: 'Park',
    pluralLabel: 'Parks',
    color: '#059669',
    borderColor: '#065f46',
    bgTint: '#ecfdf5',
    textTint: '#047857',
  },
  community: {
    id: 'all',
    label: 'Community Spot',
    pluralLabel: 'Community Spots',
    color: '#0d9488',
    borderColor: '#115e59',
    bgTint: '#f0fdfa',
    textTint: '#0f766e',
  },
};
