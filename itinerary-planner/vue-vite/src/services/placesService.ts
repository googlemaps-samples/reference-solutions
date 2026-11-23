import type { DiscoveredPlace, DiscoveryCategory, LatLngPoint } from '../types/itinerary';
import { GMP_ATTRIBUTION_ID } from './mapsLoader';

export const PLACE_DISCOVERY_FIELDS: string[] = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'rating',
  'userRatingCount',
  'regularOpeningHours',
  'photos',
  'primaryTypeDisplayName',
  'googleMapsURI',
  'utcOffsetMinutes',
];

export function serializePlace(
  place: google.maps.places.Place,
  category: DiscoveryCategory
): DiscoveredPlace | null {
  if (!place.location || !place.id) {
    return null;
  }

  const firstPhoto = place.photos && place.photos.length > 0 ? place.photos[0] : null;
  let photoUrl: string | null = null;
  let photoAttributions: string[] = [];

  if (firstPhoto) {
    try {
      photoUrl = firstPhoto.getURI({ maxWidth: 480, maxHeight: 320 });
      photoAttributions = (firstPhoto.authorAttributions ?? [])
        .map((attr) => attr.displayName)
        .filter((name): name is string => Boolean(name));
    } catch {
      photoUrl = null;
    }
  }

  return {
    id: place.id,
    displayName: place.displayName ?? 'Unnamed Place',
    formattedAddress: place.formattedAddress ?? '',
    location: {
      lat: place.location.lat(),
      lng: place.location.lng(),
    },
    rating: typeof place.rating === 'number' ? place.rating : null,
    userRatingCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
    primaryTypeDisplayName: place.primaryTypeDisplayName ?? null,
    weekdayDescriptions: place.regularOpeningHours?.weekdayDescriptions
      ? [...place.regularOpeningHours.weekdayDescriptions]
      : [],
    photoUrl,
    photoAttributions,
    googleMapsURI: place.googleMapsURI ?? null,
    utcOffsetMinutes: typeof place.utcOffsetMinutes === 'number' ? place.utcOffsetMinutes : null,
    category,
  };
}

export async function searchPlacesForCategory(
  placesLib: google.maps.PlacesLibrary,
  cityName: string,
  center: LatLngPoint,
  category: DiscoveryCategory
): Promise<DiscoveredPlace[]> {
  const { Place } = placesLib;

  if (category === 'hotels') {
    try {
      const { places } = await Place.searchNearby({
        fields: PLACE_DISCOVERY_FIELDS,
        locationRestriction: {
          center,
          radius: 8000,
        },
        includedPrimaryTypes: ['hotel', 'lodging'],
        maxResultCount: 8,
        internalUsageAttributionIds: [GMP_ATTRIBUTION_ID],
      });

      const mapped = places
        .map((p) => serializePlace(p, 'hotels'))
        .filter((p): p is DiscoveredPlace => p !== null);

      if (mapped.length > 0) {
        return mapped;
      }
    } catch {
      // Fallback to searchByText if searchNearby fails or returns empty
    }
  }

  const queryByCategory: Record<DiscoveryCategory, string> = {
    attractions: `top tourist attractions in ${cityName}`,
    restaurants: `top rated restaurants in ${cityName}`,
    hotels: `best hotels in ${cityName}`,
  };

  const { places } = await Place.searchByText({
    textQuery: queryByCategory[category],
    fields: PLACE_DISCOVERY_FIELDS,
    locationBias: {
      center,
      radius: 12000,
    },
    maxResultCount: 8,
    internalUsageAttributionIds: [GMP_ATTRIBUTION_ID],
  });

  return places
    .map((p) => serializePlace(p, category))
    .filter((p): p is DiscoveredPlace => p !== null);
}

export async function fetchPlaceDetailsById(
  placesLib: google.maps.PlacesLibrary,
  placeId: string,
  category: DiscoveryCategory = 'attractions'
): Promise<DiscoveredPlace | null> {
  const { Place } = placesLib;
  const place = new Place({ id: placeId });
  await place.fetchFields({
    fields: [...PLACE_DISCOVERY_FIELDS, 'viewport'],
  });
  return serializePlace(place, category);
}
