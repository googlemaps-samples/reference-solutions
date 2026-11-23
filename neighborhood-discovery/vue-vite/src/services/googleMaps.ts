import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import {
  DISCOVERY_CATEGORIES,
  GMP_ATTRIBUTION_ID,
  SEARCH_RADIUS_METERS,
} from '../constants/london';
import type {
  DiscoveredPlace,
  DiscoveryCategory,
  LatLngLiteral,
  PlaceCategory,
  PlaceReviewItem,
  ReverseGeocodeResult,
} from '../types/neighborhood';

export interface LoadedMapsLibraries {
  core: google.maps.CoreLibrary;
  maps: google.maps.MapsLibrary;
  marker: google.maps.MarkerLibrary;
  places: google.maps.PlacesLibrary;
  geocoding: google.maps.GeocodingLibrary;
}

let librariesPromise: Promise<LoadedMapsLibraries> | null = null;
let optionsConfigured = false;

export function getApiKey(): string {
  return (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
}

export function loadMapsLibraries(): Promise<LoadedMapsLibraries> {
  if (librariesPromise) {
    return librariesPromise;
  }

  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
    return Promise.reject(
      new Error(
        'Missing VITE_GOOGLE_MAPS_API_KEY. Copy .env.example to .env.local and add your Google Maps Platform API key or Maps Demo Key.'
      )
    );
  }

  if (!optionsConfigured) {
    setOptions({
      key: apiKey,
      v: 'weekly',
      language: 'en',
      region: 'GB',
    });
    optionsConfigured = true;
  }

  librariesPromise = Promise.all([
    importLibrary('core'),
    importLibrary('maps'),
    importLibrary('marker'),
    importLibrary('places'),
    importLibrary('geocoding'),
  ])
    .then(([core, maps, marker, places, geocoding]) => ({
      core,
      maps,
      marker,
      places,
      geocoding,
    }))
    .catch((err) => {
      librariesPromise = null;
      throw err;
    });

  return librariesPromise;
}

const SEARCH_FIELDS = [
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
  'photos',
  'googleMapsURI',
];

const DETAIL_FIELDS = [
  ...SEARCH_FIELDS,
  'reviews',
  'websiteURI',
  'internationalPhoneNumber',
];

function inferCategory(primaryType?: string | null, types?: string[]): DiscoveryCategory {
  const candidates = [primaryType ?? '', ...(types ?? [])];
  for (const candidate of candidates) {
    if (candidate === 'restaurant' || candidate.includes('restaurant')) return 'restaurant';
    if (candidate === 'cafe' || candidate === 'coffee_shop' || candidate.includes('cafe')) return 'cafe';
    if (candidate === 'museum' || candidate === 'art_gallery') return 'museum';
    if (candidate === 'park' || candidate === 'garden') return 'park';
  }
  return 'restaurant';
}

export function formatPriceLevel(priceLevel: unknown): string | null {
  if (priceLevel === null || priceLevel === undefined) return null;
  const raw = String(priceLevel).toUpperCase();
  if (raw === 'FREE' || raw === '0') return 'Free';
  if (raw === 'INEXPENSIVE' || raw === '1') return '£';
  if (raw === 'MODERATE' || raw === '2') return '££';
  if (raw === 'EXPENSIVE' || raw === '3') return '£££';
  if (raw === 'VERY_EXPENSIVE' || raw === '4') return '££££';
  return raw;
}

export function normalizePlace(
  place: google.maps.places.Place,
  fallbackCategory?: DiscoveryCategory,
  detailsLoaded = false
): DiscoveredPlace | null {
  const loc = place.location;
  if (!loc || !place.id) {
    return null;
  }

  const lat = typeof loc.lat === 'function' ? loc.lat() : Number(loc.lat);
  const lng = typeof loc.lng === 'function' ? loc.lng() : Number(loc.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const photoUrl =
    place.photos && place.photos.length > 0
      ? place.photos[0].getURI({ maxWidth: 640, maxHeight: 360 })
      : null;

  const reviews: PlaceReviewItem[] = (place.reviews ?? []).map((rev) => ({
    authorName: rev.authorAttribution?.displayName ?? 'Google Maps Reviewer',
    authorUri: rev.authorAttribution?.uri ?? undefined,
    rating: typeof rev.rating === 'number' ? rev.rating : null,
    relativePublishTime: rev.relativePublishTimeDescription ?? '',
    text: rev.text ?? rev.originalText ?? '',
  }));

  const category =
    fallbackCategory ?? inferCategory(place.primaryType, place.types);

  return {
    id: place.id,
    displayName: place.displayName ?? 'Unnamed Place',
    formattedAddress: place.formattedAddress ?? 'Address unavailable',
    location: { lat, lng },
    category,
    primaryType: place.primaryType ?? null,
    primaryTypeDisplayName: place.primaryTypeDisplayName ?? null,
    types: place.types ?? [],
    rating: typeof place.rating === 'number' ? place.rating : null,
    userRatingCount:
      typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
    priceLevel: formatPriceLevel(place.priceLevel),
    weekdayDescriptions: place.regularOpeningHours?.weekdayDescriptions ?? [],
    photoUrl,
    reviews,
    websiteURI: place.websiteURI ?? null,
    internationalPhoneNumber: place.internationalPhoneNumber ?? null,
    googleMapsURI: place.googleMapsURI ?? null,
    detailsLoaded,
  };
}

export async function fetchNearbyPlaces(
  center: LatLngLiteral,
  category: PlaceCategory,
  radiusMeters: number = SEARCH_RADIUS_METERS
): Promise<DiscoveredPlace[]> {
  const { places } = await loadMapsLibraries();
  const { Place, SearchNearbyRankPreference } = places;

  const includedPrimaryTypes =
    category === 'all' ? [...DISCOVERY_CATEGORIES] : [category];

  const { places: rawPlaces } = await Place.searchNearby({
    fields: SEARCH_FIELDS,
    locationRestriction: {
      center,
      radius: radiusMeters,
    },
    includedPrimaryTypes,
    maxResultCount: 20,
    rankPreference: SearchNearbyRankPreference.POPULARITY,
    language: 'en',
    region: 'GB',
    internalUsageAttributionIds: [GMP_ATTRIBUTION_ID],
  });

  const normalized: DiscoveredPlace[] = [];
  for (const p of rawPlaces) {
    const item = normalizePlace(
      p,
      category === 'all' ? undefined : category,
      false
    );
    if (item) {
      normalized.push(item);
    }
  }
  return normalized;
}

export async function searchPlacesByText(
  textQuery: string,
  center: LatLngLiteral,
  radiusMeters: number = SEARCH_RADIUS_METERS
): Promise<DiscoveredPlace[]> {
  const { places } = await loadMapsLibraries();
  const { Place } = places;

  const { places: rawPlaces } = await Place.searchByText({
    textQuery,
    fields: SEARCH_FIELDS,
    locationBias: {
      center,
      radius: radiusMeters,
    },
    maxResultCount: 16,
    language: 'en',
    region: 'GB',
    internalUsageAttributionIds: [GMP_ATTRIBUTION_ID],
  });

  const normalized: DiscoveredPlace[] = [];
  for (const p of rawPlaces) {
    const item = normalizePlace(p, undefined, false);
    if (item) {
      normalized.push(item);
    }
  }
  return normalized;
}

export async function fetchPlaceDetails(placeId: string): Promise<DiscoveredPlace | null> {
  const { places } = await loadMapsLibraries();
  const { Place } = places;

  const place = new Place({
    id: placeId,
    requestedLanguage: 'en',
    requestedRegion: 'GB',
  });

  await place.fetchFields({
    fields: DETAIL_FIELDS,
  });

  return normalizePlace(place, undefined, true);
}

export async function fetchPlaceDetailsFromInstance(
  place: google.maps.places.Place
): Promise<DiscoveredPlace | null> {
  await place.fetchFields({
    fields: DETAIL_FIELDS,
  });
  return normalizePlace(place, undefined, true);
}

function extractNeighborhoodName(
  results: google.maps.GeocoderResult[],
  fallbackAddress: string
): string {
  const preferredTypes = [
    'neighborhood',
    'sublocality_level_1',
    'sublocality',
    'postal_town',
    'locality',
  ];
  for (const result of results) {
    for (const targetType of preferredTypes) {
      const comp = result.address_components?.find((c) =>
        c.types.includes(targetType)
      );
      if (comp?.long_name) {
        return comp.long_name;
      }
    }
  }
  return fallbackAddress.split(',')[0]?.trim() || 'Central London';
}

export async function forwardGeocodeAddress(
  address: string
): Promise<ReverseGeocodeResult | null> {
  const trimmed = address.trim();
  if (!trimmed) return null;

  const { geocoding } = await loadMapsLibraries();
  const geocoder = new geocoding.Geocoder();

  let response: google.maps.GeocoderResponse;
  try {
    response = await geocoder.geocode({
      address: trimmed,
      region: 'GB',
      componentRestrictions: { country: 'GB' },
    });
  } catch {
    response = await geocoder.geocode({
      address: trimmed,
      region: 'GB',
    });
  }

  const first = response.results[0];
  if (!first) return null;

  return {
    lat: first.geometry.location.lat(),
    lng: first.geometry.location.lng(),
    formattedAddress: first.formatted_address,
    placeId: first.place_id ?? null,
    neighborhoodName: extractNeighborhoodName(
      response.results,
      first.formatted_address
    ),
    plusCode: response.plus_code?.global_code ?? first.plus_code?.global_code ?? null,
  };
}

export async function reverseGeocodeLocation(
  location: LatLngLiteral
): Promise<ReverseGeocodeResult> {
  const { geocoding } = await loadMapsLibraries();
  const geocoder = new geocoding.Geocoder();

  const response = await geocoder.geocode({
    location,
  });

  const first = response.results[0];
  if (!first) {
    return {
      lat: location.lat,
      lng: location.lng,
      formattedAddress: `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`,
      placeId: null,
      neighborhoodName: 'Pinned Location',
      plusCode: null,
    };
  }

  return {
    lat: location.lat,
    lng: location.lng,
    formattedAddress: first.formatted_address,
    placeId: first.place_id ?? null,
    neighborhoodName: extractNeighborhoodName(
      response.results,
      first.formatted_address
    ),
    plusCode:
      response.plus_code?.global_code ?? first.plus_code?.global_code ?? null,
  };
}

export function getTodayHoursLabel(weekdayDescriptions: string[]): string {
  if (!weekdayDescriptions.length) return 'Hours not listed';
  const londonDay = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    timeZone: 'Europe/London',
  }).format(new Date());

  const match = weekdayDescriptions.find((line) =>
    line.toLowerCase().startsWith(londonDay.toLowerCase())
  );
  return match ?? weekdayDescriptions[0];
}
