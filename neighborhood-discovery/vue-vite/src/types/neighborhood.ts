export type DiscoveryCategory = 'restaurant' | 'cafe' | 'museum' | 'park';

export type PlaceCategory = 'all' | DiscoveryCategory;

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export interface NeighborhoodPreset {
  id: string;
  label: string;
  center: LatLngLiteral;
  description: string;
}

export interface PlaceReviewItem {
  authorName: string;
  authorUri?: string;
  rating: number | null;
  relativePublishTime: string;
  text: string;
}

export interface DiscoveredPlace {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: LatLngLiteral;
  category: DiscoveryCategory;
  primaryType: string | null;
  primaryTypeDisplayName: string | null;
  types: string[];
  rating: number | null;
  userRatingCount: number | null;
  priceLevel: string | null;
  weekdayDescriptions: string[];
  photoUrl: string | null;
  reviews: PlaceReviewItem[];
  websiteURI: string | null;
  internationalPhoneNumber: string | null;
  googleMapsURI: string | null;
  detailsLoaded: boolean;
}

export interface ReverseGeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  placeId: string | null;
  neighborhoodName: string;
  plusCode: string | null;
}

export interface CommunitySpot {
  id: string;
  name: string;
  note: string;
  category: DiscoveryCategory;
  lat: number;
  lng: number;
  formattedAddress: string;
  placeId: string | null;
  createdAt: string;
}
