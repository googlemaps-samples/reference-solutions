import {
  ALL_CATEGORIES,
  CATEGORY_META,
  FilterCategory,
  GeocodeLocationResult,
  LatLngLiteral,
  PlaceCategory,
  PlaceDetail,
  PlaceSummary,
  inferPlaceCategory
} from './types';

function normalizeJsPlaceSummary(
  place: google.maps.places.Place,
  forcedCategory?: PlaceCategory
): PlaceSummary | null {
  const lat = place.location?.lat();
  const lng = place.location?.lng();
  if (!place.id || typeof lat !== 'number' || typeof lng !== 'number') {
    return null;
  }

  const category =
    forcedCategory ?? inferPlaceCategory(place.primaryType, place.types);

  const photoUrls = (place.photos ?? [])
    .slice(0, 4)
    .map((photo) => {
      try {
        return photo.getURI({ maxWidth: 640 });
      } catch {
        return null;
      }
    })
    .filter((u): u is string => Boolean(u));

  return {
    id: place.id,
    displayName: place.displayName ?? 'Unnamed Place',
    formattedAddress: place.formattedAddress ?? 'Central London, UK',
    location: { lat, lng },
    category,
    primaryType: place.primaryType ?? category,
    primaryTypeDisplayName:
      place.primaryTypeDisplayName ?? CATEGORY_META[category].singular,
    types: place.types ?? [],
    rating: typeof place.rating === 'number' ? place.rating : null,
    userRatingCount:
      typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
    priceLevel: place.priceLevel ? String(place.priceLevel) : null,
    weekdayDescriptions:
      place.regularOpeningHours?.weekdayDescriptions ?? [],
    photoUrls,
    googleMapsUri: place.googleMapsURI ?? undefined
  };
}

export async function searchNearbyViaJsSdk(
  placesLib: google.maps.PlacesLibrary,
  center: LatLngLiteral,
  radiusMeters: number,
  categories: PlaceCategory[] = ALL_CATEGORIES
): Promise<PlaceSummary[]> {
  const perCatLimit = categories.length === 1 ? 16 : 7;
  const fields = [
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
    'googleMapsURI'
  ];

  const batches = await Promise.all(
    categories.map(async (cat) => {
      const { places } = await placesLib.Place.searchNearby({
        fields,
        locationRestriction: {
          center,
          radius: radiusMeters
        },
        includedTypes: CATEGORY_META[cat].includedTypes,
        maxResultCount: perCatLimit,
        language: 'en',
        region: 'GB'
      });
      return places
        .map((p) => normalizeJsPlaceSummary(p, cat))
        .filter((p): p is PlaceSummary => p !== null);
    })
  );

  const seen = new Set<string>();
  const combined: PlaceSummary[] = [];
  for (const batch of batches) {
    for (const item of batch) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        combined.push(item);
      }
    }
  }
  return combined;
}

export async function searchTextViaJsSdk(
  placesLib: google.maps.PlacesLibrary,
  textQuery: string,
  center: LatLngLiteral,
  radiusMeters: number,
  category: FilterCategory
): Promise<PlaceSummary[]> {
  const forcedCategory = category !== 'all' ? category : undefined;
  const { places } = await placesLib.Place.searchByText({
    textQuery,
    fields: [
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
      'googleMapsURI'
    ],
    locationBias: {
      center,
      radius: radiusMeters
    },
    includedType: forcedCategory
      ? CATEGORY_META[forcedCategory].includedTypes[0]
      : undefined,
    maxResultCount: 16,
    language: 'en',
    region: 'GB'
  });

  return places
    .map((p) => normalizeJsPlaceSummary(p, forcedCategory))
    .filter((p): p is PlaceSummary => p !== null);
}

export async function fetchPlaceDetailsViaJsSdk(
  placesLib: google.maps.PlacesLibrary,
  placeId: string
): Promise<PlaceDetail | null> {
  const place = new placesLib.Place({ id: placeId });
  await place.fetchFields({
    fields: [
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
      'websiteURI',
      'internationalPhoneNumber',
      'googleMapsURI'
    ]
  });

  const summary = normalizeJsPlaceSummary(place);
  if (!summary) return null;

  const reviews = (place.reviews ?? []).map((rev) => ({
    authorName: rev.authorAttribution?.displayName ?? 'Google Maps Reviewer',
    authorUri: rev.authorAttribution?.uri ?? undefined,
    rating: typeof rev.rating === 'number' ? rev.rating : null,
    relativePublishTimeDescription:
      rev.relativePublishTimeDescription ?? '',
    text: rev.text ?? '',
    googleMapsUri: rev.googleMapsURI ?? undefined
  }));

  return {
    ...summary,
    reviews,
    websiteUri: place.websiteURI ?? undefined,
    internationalPhoneNumber: place.internationalPhoneNumber ?? undefined
  };
}

export async function geocodeViaJsSdk(
  geocodingLib: google.maps.GeocodingLibrary,
  request: { address?: string; location?: LatLngLiteral }
): Promise<GeocodeLocationResult | null> {
  const geocoder = new geocodingLib.Geocoder();
  const response = await geocoder.geocode(
    request.address
      ? { address: request.address, region: 'GB' }
      : { location: request.location }
  );

  const first = response.results?.[0];
  if (!first) return null;

  const loc = first.geometry.location;
  const components = first.address_components ?? [];
  const neighborhoodComponent = components.find((c) =>
    c.types.some((t) =>
      ['neighborhood', 'sublocality_level_1', 'sublocality', 'postal_town'].includes(t)
    )
  );
  const postalCodeComponent = components.find((c) =>
    c.types.includes('postal_code')
  );

  return {
    formattedAddress: first.formatted_address,
    placeId: first.place_id,
    location: { lat: loc.lat(), lng: loc.lng() },
    neighborhood: neighborhoodComponent?.long_name,
    postalCode: postalCodeComponent?.long_name,
    plusCode: first.plus_code?.compound_code ?? first.plus_code?.global_code,
    addressComponents: components.map((c) => ({
      long_name: c.long_name,
      short_name: c.short_name,
      types: c.types
    }))
  };
}
