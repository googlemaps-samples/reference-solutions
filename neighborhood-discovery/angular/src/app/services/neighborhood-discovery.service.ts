import { Injectable, inject } from '@angular/core';
import {
  CATEGORY_METADATA,
  CORE_PLACE_CATEGORIES,
  CommunitySpot,
  DiscoveredPlace,
  GMP_ATTRIBUTION_ID,
  PlaceCategory,
  PlaceReviewItem,
  ReverseGeocodeInspection,
  SEARCH_RADIUS_METERS,
  extractTodayHours,
  formatPriceLevel,
} from '../models/neighborhood.models';
import { GoogleMapsLoaderService } from './google-maps-loader.service';

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

const DETAILS_FIELDS = [
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
  'googleMapsURI',
];

@Injectable({
  providedIn: 'root',
})
export class NeighborhoodDiscoveryService {
  private readonly loader = inject(GoogleMapsLoaderService);

  async searchNearbyPlaces(
    center: google.maps.LatLngLiteral,
    categoryFilter: 'all' | PlaceCategory = 'all',
  ): Promise<DiscoveredPlace[]> {
    const libs = await this.loader.ensureLoaded();
    if (!libs) {
      return [];
    }

    const categoriesToFetch =
      categoryFilter === 'all' ? CORE_PLACE_CATEGORIES : [categoryFilter];

    const perCategoryLimit = categoryFilter === 'all' ? 6 : 16;

    const batches = await Promise.all(
      categoriesToFetch.map(async (cat) => {
        const response = await libs.Place.searchNearby({
          fields: SEARCH_FIELDS,
          locationRestriction: {
            center,
            radius: SEARCH_RADIUS_METERS,
          },
          includedPrimaryTypes: [cat],
          maxResultCount: perCategoryLimit,
          internalUsageAttributionIds: [GMP_ATTRIBUTION_ID],
        });
        return (response.places ?? []).map((place) =>
          this.mapPlaceToDiscoveredPlace(place, libs.PinElement, cat),
        );
      }),
    );

    const deduped = new Map<string, DiscoveredPlace>();
    for (const group of batches) {
      for (const item of group) {
        if (item && !deduped.has(item.id)) {
          deduped.set(item.id, item);
        }
      }
    }

    return Array.from(deduped.values()).sort(
      (a, b) => (b.rating ?? 0) - (a.rating ?? 0),
    );
  }

  async searchPlacesByText(
    textQuery: string,
    center: google.maps.LatLngLiteral,
  ): Promise<DiscoveredPlace[]> {
    const libs = await this.loader.ensureLoaded();
    if (!libs || !textQuery.trim()) {
      return [];
    }

    const response = await libs.Place.searchByText({
      textQuery: textQuery.trim(),
      fields: SEARCH_FIELDS,
      locationBias: {
        center,
        radius: SEARCH_RADIUS_METERS,
      },
      maxResultCount: 16,
      internalUsageAttributionIds: [GMP_ATTRIBUTION_ID],
    });

    return (response.places ?? [])
      .map((place) => this.mapPlaceToDiscoveredPlace(place, libs.PinElement))
      .filter((item): item is DiscoveredPlace => item !== null);
  }

  async fetchPlaceDetails(existing: DiscoveredPlace): Promise<DiscoveredPlace> {
    const libs = await this.loader.ensureLoaded();
    if (!libs) {
      return existing;
    }

    const place = new libs.Place({ id: existing.id });
    await place.fetchFields({
      fields: DETAILS_FIELDS,
    });

    const weekdayDescriptions =
      place.regularOpeningHours?.weekdayDescriptions ??
      existing.weekdayDescriptions;

    const reviews: PlaceReviewItem[] = (place.reviews ?? []).map((rev) => ({
      authorName: rev.authorAttribution?.displayName || 'Google Maps Reviewer',
      authorPhotoUri: rev.authorAttribution?.photoURI ?? null,
      rating: rev.rating ?? null,
      relativeTime: rev.relativePublishTimeDescription || '',
      text: rev.text || rev.originalText || '',
    }));

    const photoUrl =
      place.photos && place.photos.length > 0
        ? place.photos[0].getURI({ maxWidth: 640 })
        : existing.photoUrl;

    return {
      ...existing,
      displayName: place.displayName || existing.displayName,
      formattedAddress: place.formattedAddress || existing.formattedAddress,
      primaryTypeDisplayName:
        place.primaryTypeDisplayName || existing.primaryTypeDisplayName,
      rating: place.rating ?? existing.rating,
      userRatingCount: place.userRatingCount ?? existing.userRatingCount,
      priceLevel: place.priceLevel ?? existing.priceLevel,
      priceLabel: formatPriceLevel(place.priceLevel ?? existing.priceLevel),
      weekdayDescriptions,
      todayHours: extractTodayHours(weekdayDescriptions),
      photoUrl,
      googleMapsUri: place.googleMapsURI ?? existing.googleMapsUri,
      websiteUri: place.websiteURI ?? existing.websiteUri,
      internationalPhoneNumber:
        place.internationalPhoneNumber ?? existing.internationalPhoneNumber,
      reviews,
      detailsLoaded: true,
    };
  }

  async forwardGeocodeAddress(address: string): Promise<{
    location: google.maps.LatLngLiteral;
    formattedAddress: string;
    label: string;
  } | null> {
    const libs = await this.loader.ensureLoaded();
    if (!libs || !address.trim()) {
      return null;
    }

    const geocoder = new libs.Geocoder();
    const response = await geocoder.geocode({
      address: address.trim(),
      region: 'GB',
    });

    const top = response.results?.[0];
    if (!top?.geometry?.location) {
      return null;
    }

    const lat = top.geometry.location.lat();
    const lng = top.geometry.location.lng();
    return {
      location: { lat, lng },
      formattedAddress: top.formatted_address,
      label: top.formatted_address.split(',')[0] || address.trim(),
    };
  }

  async reverseGeocodeLocation(
    location: google.maps.LatLngLiteral,
  ): Promise<ReverseGeocodeInspection | null> {
    const libs = await this.loader.ensureLoaded();
    if (!libs) {
      return null;
    }

    const geocoder = new libs.Geocoder();
    const response = await geocoder.geocode({
      location,
    });

    const top = response.results?.[0];
    const formattedAddress =
      top?.formatted_address ||
      `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`;

    const pin = new libs.PinElement({
      background: '#0F172A',
      borderColor: '#38BDF8',
      glyphColor: '#38BDF8',
      glyphText: '?',
      scale: 1.15,
    });
    pin.style.cursor = 'pointer';

    return {
      location,
      formattedAddress,
      placeId: top?.place_id ?? null,
      pin,
    };
  }

  async createCommunitySpot(params: {
    name: string;
    note: string;
    category: PlaceCategory;
    address: string;
    placeId: string | null;
    location: google.maps.LatLngLiteral;
  }): Promise<CommunitySpot | null> {
    const libs = await this.loader.ensureLoaded();
    if (!libs) {
      return null;
    }

    const pin = new libs.PinElement({
      background: '#0F766E',
      borderColor: '#115E59',
      glyphColor: '#FFFFFF',
      glyphText: '+',
      scale: 1.15,
    });
    pin.style.cursor = 'pointer';

    return {
      id: `community-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: params.name.trim(),
      note: params.note.trim(),
      category: params.category,
      address: params.address,
      placeId: params.placeId,
      location: params.location,
      createdAt: new Date().toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      pin,
    };
  }

  updatePinSelectionStyle(
    place: DiscoveredPlace,
    isSelected: boolean,
    isCompared: boolean,
  ): void {
    const meta = CATEGORY_METADATA[place.category];
    place.pin.scale = isSelected ? 1.3 : isCompared ? 1.18 : 1.0;
    place.pin.borderColor = isSelected
      ? '#0F172A'
      : isCompared
        ? '#F59E0B'
        : meta.borderColor;
  }

  private mapPlaceToDiscoveredPlace(
    place: google.maps.places.Place,
    PinElementCtor: typeof google.maps.marker.PinElement,
    fallbackCategory?: PlaceCategory,
  ): DiscoveredPlace | null {
    const loc = place.location;
    if (!loc || !place.id) {
      return null;
    }

    const category = this.resolveCategory(place, fallbackCategory);
    const meta = CATEGORY_METADATA[category];
    const weekdayDescriptions =
      place.regularOpeningHours?.weekdayDescriptions ?? [];

    const pin = new PinElementCtor({
      background: meta.background,
      borderColor: meta.borderColor,
      glyphColor: '#FFFFFF',
      glyphText: meta.glyphText,
      scale: 1.0,
    });
    pin.style.cursor = 'pointer';

    const photoUrl =
      place.photos && place.photos.length > 0
        ? place.photos[0].getURI({ maxWidth: 480 })
        : null;

    return {
      id: place.id,
      displayName: place.displayName || 'Unnamed Place',
      formattedAddress: place.formattedAddress || 'Central London',
      location: { lat: loc.lat(), lng: loc.lng() },
      category,
      primaryTypeDisplayName: place.primaryTypeDisplayName || meta.label,
      rating: place.rating ?? null,
      userRatingCount: place.userRatingCount ?? null,
      priceLevel: place.priceLevel ?? null,
      priceLabel: formatPriceLevel(place.priceLevel),
      weekdayDescriptions,
      todayHours: extractTodayHours(weekdayDescriptions),
      photoUrl,
      googleMapsUri: place.googleMapsURI ?? null,
      websiteUri: null,
      internationalPhoneNumber: null,
      reviews: [],
      detailsLoaded: false,
      pin,
    };
  }

  private resolveCategory(
    place: google.maps.places.Place,
    fallback?: PlaceCategory,
  ): PlaceCategory {
    const primary = (place.primaryType || '').toLowerCase();
    const types = (place.types || []).map((t) => t.toLowerCase());

    if (
      primary === 'cafe' ||
      primary === 'coffee_shop' ||
      types.includes('cafe') ||
      types.includes('coffee_shop')
    ) {
      if (fallback === 'cafe' || primary === 'cafe' || primary === 'coffee_shop') {
        return 'cafe';
      }
    }
    if (
      primary === 'museum' ||
      primary === 'art_gallery' ||
      types.includes('museum')
    ) {
      return 'museum';
    }
    if (primary === 'park' || types.includes('park')) {
      return 'park';
    }
    if (primary === 'restaurant' || types.includes('restaurant')) {
      return 'restaurant';
    }
    return fallback ?? 'restaurant';
  }
}
