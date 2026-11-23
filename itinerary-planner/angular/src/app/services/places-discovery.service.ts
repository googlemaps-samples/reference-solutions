import { Injectable } from '@angular/core';
import { importLibrary } from '@googlemaps/js-api-loader';
import { DiscoveryCategory, PlaceCardItem } from '../models/itinerary.models';

const PLACE_SEARCH_FIELDS: string[] = [
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
  'utcOffsetMinutes',
];

const PLACE_DETAILS_FIELDS: string[] = [
  ...PLACE_SEARCH_FIELDS,
  'viewport',
];

export interface ResolvedDestination {
  name: string;
  formattedAddress: string;
  center: google.maps.LatLngLiteral;
  viewport: google.maps.LatLngBounds | null;
  utcOffsetMinutes: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class PlacesDiscoveryService {
  async resolveDestinationFromPlace(
    place: google.maps.places.Place
  ): Promise<ResolvedDestination | null> {
    await place.fetchFields({ fields: PLACE_DETAILS_FIELDS });
    const loc = place.location;
    if (!loc) return null;

    return {
      name: place.displayName || place.formattedAddress || 'Selected Destination',
      formattedAddress: place.formattedAddress || '',
      center: { lat: loc.lat(), lng: loc.lng() },
      viewport: place.viewport ?? null,
      utcOffsetMinutes: place.utcOffsetMinutes ?? null,
    };
  }

  async searchDestinationByText(query: string): Promise<ResolvedDestination | null> {
    const { Place } = await importLibrary('places');
    const { places } = await Place.searchByText({
      textQuery: query,
      fields: PLACE_DETAILS_FIELDS,
      maxResultCount: 1,
      language: 'en',
    });

    const first = places?.[0];
    if (!first || !first.location) return null;

    return {
      name: first.displayName || query,
      formattedAddress: first.formattedAddress || '',
      center: { lat: first.location.lat(), lng: first.location.lng() },
      viewport: first.viewport ?? null,
      utcOffsetMinutes: first.utcOffsetMinutes ?? null,
    };
  }

  async discoverCategory(
    center: google.maps.LatLngLiteral,
    destinationName: string,
    category: DiscoveryCategory,
    customTextQuery?: string
  ): Promise<PlaceCardItem[]> {
    const { Place } = await importLibrary('places');

    let places: google.maps.places.Place[] = [];

    if (category === 'attractions') {
      const textQuery = customTextQuery || `top tourist attractions in ${destinationName}`;
      const response = await Place.searchByText({
        textQuery,
        fields: PLACE_SEARCH_FIELDS,
        locationBias: { center, radius: 12000 },
        maxResultCount: 8,
        language: 'en',
      });
      places = response.places ?? [];
    } else if (category === 'restaurants') {
      try {
        const nearby = await Place.searchNearby({
          fields: PLACE_SEARCH_FIELDS,
          locationRestriction: { center, radius: 5000 },
          includedPrimaryTypes: ['restaurant'],
          maxResultCount: 8,
          language: 'en',
        });
        places = nearby.places ?? [];
      } catch {
        places = [];
      }

      if (places.length < 3) {
        const fallback = await Place.searchByText({
          textQuery: `top rated restaurants in ${destinationName}`,
          fields: PLACE_SEARCH_FIELDS,
          locationBias: { center, radius: 10000 },
          maxResultCount: 8,
          language: 'en',
        });
        places = fallback.places ?? [];
      }
    } else {
      try {
        const nearby = await Place.searchNearby({
          fields: PLACE_SEARCH_FIELDS,
          locationRestriction: { center, radius: 6000 },
          includedPrimaryTypes: ['hotel', 'lodging'],
          maxResultCount: 8,
          language: 'en',
        });
        places = nearby.places ?? [];
      } catch {
        places = [];
      }

      if (places.length < 3) {
        const fallback = await Place.searchByText({
          textQuery: `top hotels in ${destinationName}`,
          fields: PLACE_SEARCH_FIELDS,
          locationBias: { center, radius: 10000 },
          maxResultCount: 8,
          language: 'en',
        });
        places = fallback.places ?? [];
      }
    }

    return places
      .map((place) => this.mapPlaceToCardItem(place, category))
      .filter((item): item is PlaceCardItem => item !== null);
  }

  mapPlaceToCardItem(
    place: google.maps.places.Place,
    category: DiscoveryCategory
  ): PlaceCardItem | null {
    if (!place.location) return null;

    let photoUrl: string | null = null;
    try {
      const firstPhoto = place.photos?.[0];
      if (firstPhoto) {
        photoUrl = firstPhoto.getURI({ maxWidth: 480, maxHeight: 320 });
      }
    } catch {
      photoUrl = null;
    }

    const weekdayDescriptions = place.regularOpeningHours?.weekdayDescriptions ?? [];
    const todayHoursSummary = this.pickTodayHours(weekdayDescriptions);

    return {
      id: place.id,
      displayName: place.displayName || 'Unnamed Place',
      formattedAddress: place.formattedAddress || 'Address unavailable',
      location: {
        lat: place.location.lat(),
        lng: place.location.lng(),
      },
      rating: place.rating ?? null,
      userRatingCount: place.userRatingCount ?? null,
      weekdayDescriptions,
      todayHoursSummary,
      photoUrl,
      primaryTypeDisplayName:
        place.primaryTypeDisplayName || this.defaultTypeLabel(category),
      priceLevel: place.priceLevel ? String(place.priceLevel) : null,
      googleMapsUri: place.googleMapsURI ?? null,
      utcOffsetMinutes: place.utcOffsetMinutes ?? null,
      category,
    };
  }

  private pickTodayHours(weekdayDescriptions: string[]): string {
    if (!weekdayDescriptions.length) {
      return 'Hours not listed';
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
    const matched = weekdayDescriptions.find((entry) =>
      entry.toLowerCase().startsWith(todayName.toLowerCase())
    );
    return matched || weekdayDescriptions[0];
  }

  private defaultTypeLabel(category: DiscoveryCategory): string {
    switch (category) {
      case 'attractions':
        return 'Attraction';
      case 'restaurants':
        return 'Restaurant';
      case 'hotels':
        return 'Hotel';
    }
  }
}
