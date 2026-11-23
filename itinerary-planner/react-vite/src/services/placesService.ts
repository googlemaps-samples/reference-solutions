import type {
  DiscoveryCategory,
  LatLngPoint,
  PlaceItem,
} from '../types/itinerary';

const DISCOVERY_FIELDS = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'rating',
  'userRatingCount',
  'regularOpeningHours',
  'photos',
  'primaryTypeDisplayName',
  'priceLevel',
  'googleMapsURI',
];

const DETAIL_FIELDS = [...DISCOVERY_FIELDS, 'utcOffsetMinutes', 'viewport'];

export function mapPlaceToItem(
  place: google.maps.places.Place,
  category: DiscoveryCategory | 'custom',
): PlaceItem | null {
  if (!place.location || !place.id) return null;

  let photoUrl: string | null = null;
  try {
    const firstPhoto = place.photos?.[0];
    if (firstPhoto) {
      photoUrl = firstPhoto.getURI({ maxWidth: 480, maxHeight: 320 });
    }
  } catch {
    photoUrl = null;
  }

  return {
    id: place.id,
    displayName: place.displayName ?? 'Unnamed Place',
    formattedAddress: place.formattedAddress ?? '',
    location: {
      lat: place.location.lat(),
      lng: place.location.lng(),
    },
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? null,
    weekdayDescriptions: place.regularOpeningHours?.weekdayDescriptions ?? [],
    photoUrl,
    primaryTypeDisplayName: place.primaryTypeDisplayName ?? null,
    priceLevel: place.priceLevel ? String(place.priceLevel) : null,
    googleMapsURI: place.googleMapsURI ?? null,
    utcOffsetMinutes:
      typeof place.utcOffsetMinutes === 'number'
        ? place.utcOffsetMinutes
        : null,
    category,
  };
}

export async function searchDiscoveryPlaces(
  placesLib: google.maps.PlacesLibrary,
  category: DiscoveryCategory,
  cityLabel: string,
  center: LatLngPoint,
): Promise<PlaceItem[]> {
  const { Place } = placesLib;

  if (category === 'hotels') {
    try {
      const { places } = await Place.searchNearby({
        fields: DISCOVERY_FIELDS,
        locationRestriction: {
          center,
          radius: 4500,
        },
        includedPrimaryTypes: ['hotel', 'lodging'],
        maxResultCount: 10,
      });

      const items = places
        .map((p) => mapPlaceToItem(p, 'hotels'))
        .filter((item): item is PlaceItem => item !== null);

      if (items.length > 0) {
        return items;
      }
    } catch {
      // Fall back to searchByText if searchNearby fails for sparse areas
    }
  }

  const queryByCategory: Record<DiscoveryCategory, string> = {
    attractions: `top tourist attractions in ${cityLabel}`,
    restaurants: `best rated restaurants in ${cityLabel}`,
    hotels: `top rated hotels in ${cityLabel}`,
  };

  const { places } = await Place.searchByText({
    fields: DISCOVERY_FIELDS,
    textQuery: queryByCategory[category],
    locationBias: {
      center,
      radius: 12000,
    },
    maxResultCount: 10,
  });

  return places
    .map((p) => mapPlaceToItem(p, category))
    .filter((item): item is PlaceItem => item !== null);
}

export async function resolveDestinationContext(
  placesLib: google.maps.PlacesLibrary,
  cityQuery: string,
): Promise<{
  label: string;
  center: LatLngPoint;
  utcOffsetMinutes: number | null;
} | null> {
  const { Place } = placesLib;
  const { places } = await Place.searchByText({
    fields: ['id', 'displayName', 'location', 'utcOffsetMinutes'],
    textQuery: cityQuery,
    maxResultCount: 1,
  });

  const first = places[0];
  if (!first || !first.location) return null;

  return {
    label: first.displayName ?? cityQuery,
    center: {
      lat: first.location.lat(),
      lng: first.location.lng(),
    },
    utcOffsetMinutes:
      typeof first.utcOffsetMinutes === 'number'
        ? first.utcOffsetMinutes
        : null,
  };
}

export async function fetchSelectedAutocompletePlace(
  place: google.maps.places.Place,
): Promise<{ item: PlaceItem; utcOffsetMinutes: number | null } | null> {
  await place.fetchFields({ fields: DETAIL_FIELDS });
  const item = mapPlaceToItem(place, 'custom');
  if (!item) return null;
  return {
    item,
    utcOffsetMinutes: item.utcOffsetMinutes,
  };
}
