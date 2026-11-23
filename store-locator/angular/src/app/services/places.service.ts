import { Injectable, inject } from '@angular/core';
import {
  AutocompleteSuggestionItem,
  BRANCH_TYPE_METADATA,
  BranchLocation,
  BranchType,
  NYC_CENTER,
  OriginPoint,
  SERVICE_METADATA,
  ServiceTag,
} from '../models/store.models';
import { MapsLoaderService } from './maps-loader.service';

const NYC_BOUNDS: google.maps.LatLngBoundsLiteral = {
  north: 40.879,
  south: 40.684,
  east: -73.88,
  west: -74.048,
};

const BRANCH_SEARCH_SEEDS: Array<{
  type: BranchType;
  textQuery: string;
  maxResultCount: number;
}> = [
  {
    type: 'flagship',
    textQuery: 'flagship retail department store in Manhattan, New York',
    maxResultCount: 8,
  },
  {
    type: 'kiosk',
    textQuery: 'espresso coffee kiosk in Manhattan, New York',
    maxResultCount: 8,
  },
  {
    type: 'atm',
    textQuery: '24 hour ATM in Manhattan, New York',
    maxResultCount: 8,
  },
];

@Injectable({
  providedIn: 'root',
})
export class PlacesService {
  private readonly mapsLoader = inject(MapsLoaderService);
  private sessionToken: google.maps.places.AutocompleteSessionToken | null =
    null;

  async searchNycBranches(): Promise<BranchLocation[]> {
    const { places } = await this.mapsLoader.load();
    const { Place } = places;

    const fields = [
      'id',
      'displayName',
      'formattedAddress',
      'location',
      'types',
      'primaryType',
      'rating',
      'userRatingCount',
      'regularOpeningHours',
      'businessStatus',
    ];

    const responses = await Promise.all(
      BRANCH_SEARCH_SEEDS.map(async (seed) => {
        try {
          const result = await Place.searchByText({
            textQuery: seed.textQuery,
            fields,
            locationBias: {
              center: NYC_CENTER,
              radius: 6500,
            },
            maxResultCount: seed.maxResultCount,
            language: 'en',
            region: 'US',
          });
          return { seedType: seed.type, places: result.places || [] };
        } catch (err) {
          console.error(`Place.searchByText failed for ${seed.type}:`, err);
          return { seedType: seed.type, places: [] as google.maps.places.Place[] };
        }
      })
    );

    const byId = new Map<string, BranchLocation>();

    for (const group of responses) {
      for (const place of group.places) {
        if (!place.id || !place.location) continue;
        if (byId.has(place.id)) continue;

        const branchType = this.classifyBranchType(place, group.seedType);
        const weekdayDescriptions =
          place.regularOpeningHours?.weekdayDescriptions ?? [];
        const services = this.deriveServices(
          branchType,
          place,
          weekdayDescriptions
        );

        byId.set(place.id, {
          id: place.id,
          name: place.displayName || 'NYC Branch',
          address: place.formattedAddress || 'New York, NY',
          lat: place.location.lat(),
          lng: place.location.lng(),
          type: branchType,
          typeLabel: BRANCH_TYPE_METADATA[branchType].label,
          services,
          serviceLabels: services.map((s) => SERVICE_METADATA[s].label),
          rating: typeof place.rating === 'number' ? place.rating : null,
          userRatingCount:
            typeof place.userRatingCount === 'number'
              ? place.userRatingCount
              : null,
          weekdayDescriptions,
          businessStatus: place.businessStatus ?? null,
          durationMillis: null,
          distanceMeters: null,
          etaText: 'Calculating...',
          distanceText: '—',
        });
      }
    }

    return Array.from(byId.values());
  }

  async fetchAutocomplete(query: string): Promise<AutocompleteSuggestionItem[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return [];
    }

    const { places } = await this.mapsLoader.load();
    const { AutocompleteSessionToken, AutocompleteSuggestion } = places;

    if (!this.sessionToken) {
      this.sessionToken = new AutocompleteSessionToken();
    }

    const { suggestions } =
      await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: trimmed,
        sessionToken: this.sessionToken,
        locationBias: NYC_BOUNDS,
        includedRegionCodes: ['us'],
        language: 'en',
        region: 'us',
      });

    const items: AutocompleteSuggestionItem[] = [];
    for (const suggestion of suggestions) {
      const pred = suggestion.placePrediction;
      if (!pred) continue;
      items.push({
        placeId: pred.placeId,
        mainText: pred.mainText?.text || pred.text.toString(),
        secondaryText: pred.secondaryText?.text || '',
        fullText: pred.text.toString(),
        suggestion,
      });
    }

    return items;
  }

  async resolveSuggestion(
    item: AutocompleteSuggestionItem
  ): Promise<OriginPoint | null> {
    await this.mapsLoader.load();
    const pred = item.suggestion.placePrediction;
    if (!pred) return null;

    const place = pred.toPlace();
    await place.fetchFields({
      fields: ['displayName', 'formattedAddress', 'location'],
    });

    // Rotate session token after completing a Place Details selection
    const { places } = await this.mapsLoader.load();
    this.sessionToken = new places.AutocompleteSessionToken();

    if (!place.location) return null;

    return {
      label: place.displayName || item.mainText,
      address: place.formattedAddress || item.fullText,
      lat: place.location.lat(),
      lng: place.location.lng(),
    };
  }

  async geocodeAddress(query: string): Promise<OriginPoint | null> {
    const trimmed = query.trim();
    if (!trimmed) return null;

    const { geocoding } = await this.mapsLoader.load();
    const geocoder = new geocoding.Geocoder();

    try {
      const response = await geocoder.geocode({
        address: trimmed,
        bounds: NYC_BOUNDS,
        componentRestrictions: { country: 'US' },
      });

      const first = response.results?.[0];
      if (!first?.geometry?.location) return null;

      return {
        label: trimmed,
        address: first.formatted_address || trimmed,
        lat: first.geometry.location.lat(),
        lng: first.geometry.location.lng(),
      };
    } catch (err) {
      console.error('Geocoder fallback failed:', err);
      return null;
    }
  }

  private classifyBranchType(
    place: google.maps.places.Place,
    fallback: BranchType
  ): BranchType {
    const types = new Set([
      ...(place.types ?? []),
      ...(place.primaryType ? [place.primaryType] : []),
    ]);

    if (types.has('atm') || types.has('bank')) {
      return 'atm';
    }
    if (
      types.has('cafe') ||
      types.has('coffee_shop') ||
      types.has('bakery') ||
      types.has('fast_food_restaurant')
    ) {
      return 'kiosk';
    }
    if (
      types.has('department_store') ||
      types.has('shopping_mall') ||
      types.has('clothing_store') ||
      types.has('store')
    ) {
      return 'flagship';
    }
    return fallback;
  }

  private deriveServices(
    type: BranchType,
    place: google.maps.places.Place,
    weekdayDescriptions: string[]
  ): ServiceTag[] {
    const services: ServiceTag[] = [];
    const joinedHours = weekdayDescriptions.join(' ').toLowerCase();
    const isOpen24 =
      joinedHours.includes('open 24 hours') ||
      joinedHours.includes('24 hours') ||
      type === 'atm';

    if (type === 'flagship') {
      services.push('pickup');
      if (
        (place.types ?? []).some((t) =>
          ['cafe', 'food', 'restaurant', 'bakery'].includes(t)
        )
      ) {
        services.push('coffee');
      }
      if (isOpen24) services.push('open24');
    } else if (type === 'kiosk') {
      services.push('coffee', 'pickup');
      if (isOpen24) services.push('open24');
    } else {
      services.push('cash');
      if (isOpen24) services.push('open24');
    }

    return services;
  }
}
