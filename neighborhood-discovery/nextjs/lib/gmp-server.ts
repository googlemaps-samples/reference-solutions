import { NextResponse } from 'next/server';
import {
  ALL_CATEGORIES,
  CATEGORY_META,
  GeocodeAddressComponent,
  GeocodeLocationResult,
  PlaceCategory,
  PlaceDetail,
  PlaceReview,
  PlaceSummary,
  inferPlaceCategory
} from './types';

export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Cache-Control': 'no-store'
};

export function jsonResponse(
  body: unknown,
  status = 200
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: SECURITY_HEADERS
  });
}

export function getServerGoogleMapsApiKey(): string | null {
  const key =
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    '';
  return key.length > 0 ? key : null;
}

export const PLACES_LIST_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.types',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.regularOpeningHours',
  'places.photos',
  'places.googleMapsUri'
].join(',');

export const PLACE_DETAIL_FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'primaryType',
  'primaryTypeDisplayName',
  'types',
  'rating',
  'userRatingCount',
  'priceLevel',
  'regularOpeningHours',
  'reviews',
  'photos',
  'websiteUri',
  'internationalPhoneNumber',
  'googleMapsUri'
].join(',');

interface RawPlacesPhoto {
  name?: string;
}

interface RawPlacesReview {
  rating?: number;
  relativePublishTimeDescription?: string;
  text?: { text?: string };
  originalText?: { text?: string };
  authorAttribution?: {
    displayName?: string;
    uri?: string;
  };
  googleMapsUri?: string;
}

export interface RawGooglePlace {
  id?: string;
  name?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  primaryType?: string;
  primaryTypeDisplayName?: { text?: string };
  types?: string[];
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  regularOpeningHours?: {
    weekdayDescriptions?: string[];
  };
  photos?: RawPlacesPhoto[];
  reviews?: RawPlacesReview[];
  websiteUri?: string;
  internationalPhoneNumber?: string;
  googleMapsUri?: string;
}

export function toPhotoProxyUrl(photoName?: string, maxWidthPx = 640): string | null {
  if (!photoName || !photoName.startsWith('places/')) return null;
  const params = new URLSearchParams({
    name: photoName,
    maxWidthPx: String(maxWidthPx)
  });
  return `/api/places/photo?${params.toString()}`;
}

export function normalizeGooglePlaceSummary(
  raw: RawGooglePlace,
  forcedCategory?: PlaceCategory
): PlaceSummary | null {
  const id = raw.id ?? raw.name?.replace(/^places\//, '');
  const lat = raw.location?.latitude;
  const lng = raw.location?.longitude;

  if (!id || typeof lat !== 'number' || typeof lng !== 'number') {
    return null;
  }

  const category =
    forcedCategory ?? inferPlaceCategory(raw.primaryType, raw.types);

  const photoUrls = (raw.photos ?? [])
    .slice(0, 4)
    .map((p) => toPhotoProxyUrl(p.name))
    .filter((url): url is string => url !== null);

  return {
    id,
    displayName: raw.displayName?.text ?? 'Unnamed Place',
    formattedAddress: raw.formattedAddress ?? 'Central London, UK',
    location: { lat, lng },
    category,
    primaryType: raw.primaryType ?? category,
    primaryTypeDisplayName:
      raw.primaryTypeDisplayName?.text ?? CATEGORY_META[category].singular,
    types: raw.types ?? [],
    rating: typeof raw.rating === 'number' ? raw.rating : null,
    userRatingCount:
      typeof raw.userRatingCount === 'number' ? raw.userRatingCount : null,
    priceLevel: raw.priceLevel ?? null,
    weekdayDescriptions: raw.regularOpeningHours?.weekdayDescriptions ?? [],
    photoUrls,
    googleMapsUri: raw.googleMapsUri
  };
}

export function normalizeGooglePlaceDetail(raw: RawGooglePlace): PlaceDetail | null {
  const summary = normalizeGooglePlaceSummary(raw);
  if (!summary) return null;

  const reviews: PlaceReview[] = (raw.reviews ?? []).map((rev) => ({
    authorName: rev.authorAttribution?.displayName ?? 'Google Maps Reviewer',
    authorUri: rev.authorAttribution?.uri,
    rating: typeof rev.rating === 'number' ? rev.rating : null,
    relativePublishTimeDescription: rev.relativePublishTimeDescription ?? '',
    text: rev.text?.text ?? rev.originalText?.text ?? '',
    googleMapsUri: rev.googleMapsUri
  }));

  return {
    ...summary,
    reviews,
    websiteUri: raw.websiteUri,
    internationalPhoneNumber: raw.internationalPhoneNumber
  };
}

export function extractGeocodeResult(rawResult: {
  formatted_address?: string;
  place_id?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
  address_components?: GeocodeAddressComponent[];
  plus_code?: { compound_code?: string; global_code?: string };
}): GeocodeLocationResult | null {
  const lat = rawResult.geometry?.location?.lat;
  const lng = rawResult.geometry?.location?.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return null;
  }

  const components = rawResult.address_components ?? [];
  const neighborhoodComponent = components.find((c) =>
    c.types.some((t) =>
      ['neighborhood', 'sublocality_level_1', 'sublocality', 'postal_town'].includes(t)
    )
  );
  const postalCodeComponent = components.find((c) =>
    c.types.includes('postal_code')
  );

  return {
    formattedAddress: rawResult.formatted_address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    placeId: rawResult.place_id ?? '',
    location: { lat, lng },
    neighborhood: neighborhoodComponent?.long_name,
    postalCode: postalCodeComponent?.long_name,
    plusCode:
      rawResult.plus_code?.compound_code ?? rawResult.plus_code?.global_code,
    addressComponents: components
  };
}

export function getIncludedTypesForCategories(
  categories?: PlaceCategory[]
): string[] {
  const list =
    categories && categories.length > 0 ? categories : ALL_CATEGORIES;
  const unique = new Set<string>();
  for (const cat of list) {
    const meta = CATEGORY_META[cat];
    if (meta) {
      for (const t of meta.includedTypes) {
        unique.add(t);
      }
    }
  }
  return Array.from(unique);
}
