import { Injectable } from '@angular/core';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import * as markerClustererLib from '@googlemaps/markerclusterer';
import {
  CommuteLegResult,
  CommuteSummary,
  LatLngPoint,
  NearbyAmenity,
} from '../models/real-estate.models';

declare global {
  interface Window {
    __ENV__?: {
      GOOGLE_MAPS_API_KEY?: string;
    };
  }
}

export interface WorkplaceSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
  placePrediction: google.maps.places.PlacePrediction;
}

export interface ResolvedWorkplace {
  name: string;
  address: string;
  location: LatLngPoint;
}

const SF_BOUNDS: google.maps.LatLngBoundsLiteral = {
  south: 37.703,
  west: -122.527,
  north: 37.815,
  east: -122.348,
};

@Injectable({
  providedIn: 'root',
})
export class GoogleMapsService {
  private loadPromise: Promise<void> | null = null;
  private isLoaded = false;
  private amenitiesCache = new Map<string, NearbyAmenity[]>();

  getApiKey(): string {
    return (window.__ENV__?.GOOGLE_MAPS_API_KEY || '').trim();
  }

  hasValidApiKey(): boolean {
    const key = this.getApiKey();
    return Boolean(key && key !== 'your_google_maps_api_key_here');
  }

  async ensureLoaded(): Promise<boolean> {
    if (this.isLoaded) return true;
    const apiKey = this.getApiKey();
    if (!this.hasValidApiKey()) {
      return false;
    }

    if (!this.loadPromise) {
      // Expose @googlemaps/markerclusterer globally for @angular/google-maps MapMarkerClusterer
      (globalThis as Record<string, unknown>)['markerClusterer'] = markerClustererLib;

      setOptions({
        key: apiKey,
        v: 'weekly',
        language: 'en',
        region: 'US',
        mapIds: ['DEMO_MAP_ID'],
      });

      this.loadPromise = Promise.all([
        importLibrary('core'),
        importLibrary('maps'),
        importLibrary('marker'),
        importLibrary('places'),
        importLibrary('routes'),
        importLibrary('streetView'),
        importLibrary('geometry'),
        importLibrary('geocoding'),
      ]).then(() => {
        this.isLoaded = true;
      });
    }

    await this.loadPromise;
    return true;
  }

  async searchNearbyAmenities(lat: number, lng: number): Promise<NearbyAmenity[]> {
    const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    const cached = this.amenitiesCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const loaded = await this.ensureLoaded();
    if (!loaded) {
      return [];
    }

    const [{ Place, SearchNearbyRankPreference }, { spherical }] = await Promise.all([
      importLibrary('places'),
      importLibrary('geometry'),
    ]);

    const center = { lat, lng };
    const fields = [
      'id',
      'displayName',
      'formattedAddress',
      'location',
      'primaryType',
      'primaryTypeDisplayName',
      'rating',
      'userRatingCount',
    ];

    const categoryConfigs: Array<{
      category: Exclude<NearbyAmenity['category'], 'all'>;
      includedPrimaryTypes: string[];
    }> = [
      {
        category: 'schools',
        includedPrimaryTypes: ['school', 'primary_school', 'secondary_school', 'university'],
      },
      {
        category: 'groceries',
        includedPrimaryTypes: ['supermarket', 'grocery_store'],
      },
      {
        category: 'transit',
        includedPrimaryTypes: [
          'transit_station',
          'subway_station',
          'light_rail_station',
          'train_station',
          'bus_station',
        ],
      },
    ];

    const results = await Promise.allSettled(
      categoryConfigs.map(async (cfg) => {
        const response = await Place.searchNearby({
          fields,
          locationRestriction: {
            center,
            radius: 5000,
          },
          includedPrimaryTypes: cfg.includedPrimaryTypes,
          maxResultCount: 5,
          rankPreference: SearchNearbyRankPreference.DISTANCE,
        });
        return { category: cfg.category, places: response.places || [] };
      })
    );

    const seenIds = new Set<string>();
    const amenities: NearbyAmenity[] = [];
    const originLatLng = new google.maps.LatLng(lat, lng);

    for (const outcome of results) {
      if (outcome.status !== 'fulfilled') continue;
      const { category, places } = outcome.value;
      for (const place of places) {
        if (!place.id || !place.location || seenIds.has(place.id)) continue;
        seenIds.add(place.id);

        const placeLat = place.location.lat();
        const placeLng = place.location.lng();
        const distanceMeters = Math.round(
          spherical.computeDistanceBetween(originLatLng, place.location)
        );

        amenities.push({
          id: place.id,
          name: place.displayName || 'Unnamed Place',
          address: place.formattedAddress || 'San Francisco, CA',
          category,
          primaryTypeLabel:
            place.primaryTypeDisplayName ||
            (place.primaryType ? place.primaryType.replace(/_/g, ' ') : category),
          lat: placeLat,
          lng: placeLng,
          distanceMeters,
          rating: typeof place.rating === 'number' ? place.rating : undefined,
          userRatingCount:
            typeof place.userRatingCount === 'number' ? place.userRatingCount : undefined,
        });
      }
    }

    amenities.sort((a, b) => a.distanceMeters - b.distanceMeters);
    this.amenitiesCache.set(cacheKey, amenities);
    return amenities;
  }

  async fetchWorkplaceSuggestions(
    input: string,
    sessionToken?: google.maps.places.AutocompleteSessionToken
  ): Promise<WorkplaceSuggestion[]> {
    const trimmed = input.trim();
    if (trimmed.length < 2) return [];

    const loaded = await this.ensureLoaded();
    if (!loaded) return [];

    const { AutocompleteSuggestion } = await importLibrary('places');
    const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: trimmed,
      locationBias: SF_BOUNDS,
      sessionToken,
    });

    return suggestions
      .filter((s) => Boolean(s.placePrediction))
      .slice(0, 5)
      .map((s) => {
        const prediction = s.placePrediction!;
        const mainText = prediction.mainText?.text || prediction.text.text;
        const secondaryText = prediction.secondaryText?.text || '';
        return {
          placeId: prediction.placeId,
          mainText,
          secondaryText,
          fullText: prediction.text.text,
          placePrediction: prediction,
        };
      });
  }

  async resolveWorkplaceFromText(query: string): Promise<ResolvedWorkplace | null> {
    const trimmed = query.trim();
    if (!trimmed) return null;

    const loaded = await this.ensureLoaded();
    if (!loaded) return null;

    const { Place } = await importLibrary('places');
    try {
      const { places } = await Place.searchByText({
        textQuery: trimmed,
        fields: ['id', 'displayName', 'formattedAddress', 'location'],
        locationBias: SF_BOUNDS,
        maxResultCount: 1,
      });

      const match = places?.[0];
      if (match?.location) {
        return {
          name: match.displayName || trimmed,
          address: match.formattedAddress || trimmed,
          location: {
            lat: match.location.lat(),
            lng: match.location.lng(),
          },
        };
      }
    } catch {
      // Fallback to Geocoder if text search fails
    }

    try {
      const { Geocoder } = await importLibrary('geocoding');
      const geocoder = new Geocoder();
      const geoResp = await geocoder.geocode({
        address: trimmed,
        bounds: SF_BOUNDS,
      });
      const first = geoResp.results?.[0];
      if (first?.geometry?.location) {
        return {
          name: trimmed,
          address: first.formatted_address || trimmed,
          location: {
            lat: first.geometry.location.lat(),
            lng: first.geometry.location.lng(),
          },
        };
      }
    } catch {
      return null;
    }

    return null;
  }

  async computeCommute(
    origin: LatLngPoint,
    workplace: ResolvedWorkplace
  ): Promise<{ summary: CommuteSummary; routePath: LatLngPoint[] }> {
    const loaded = await this.ensureLoaded();
    if (!loaded) {
      throw new Error('Google Maps JS API is not loaded.');
    }

    const { RouteMatrix, Route, RoutingPreference } = await importLibrary('routes');
    const { UnitSystem } = await importLibrary('core');

    const computeMatrixForMode = async (
      travelMode: google.maps.TravelMode | 'DRIVING' | 'TRANSIT'
    ): Promise<CommuteLegResult> => {
      try {
        const request: google.maps.routes.ComputeRouteMatrixRequest = {
          origins: [origin],
          destinations: [workplace.location],
          travelMode: travelMode as google.maps.TravelMode,
          units: UnitSystem.IMPERIAL,
          fields: ['distanceMeters', 'durationMillis', 'condition', 'localizedValues'],
          ...(travelMode === 'DRIVING'
            ? {
                routingPreference: RoutingPreference.TRAFFIC_AWARE,
              }
            : {}),
        };

        const { matrix } = await RouteMatrix.computeRouteMatrix(request);
        const item = matrix.rows?.[0]?.items?.[0];

        if (!item || item.condition !== 'ROUTE_EXISTS') {
          return {
            durationText: 'Unavailable',
            distanceText: '--',
            durationSeconds: 0,
            distanceMeters: 0,
            available: false,
            note: 'No route returned for this mode',
          };
        }

        const durationMillis = item.durationMillis ?? 0;
        const durationSeconds = Math.round(durationMillis / 1000);
        const distanceMeters = item.distanceMeters ?? 0;

        const durationText =
          item.localizedValues?.duration || this.formatDuration(durationSeconds);
        const distanceText =
          item.localizedValues?.distance || this.formatDistance(distanceMeters);

        return {
          durationText,
          distanceText,
          durationSeconds,
          distanceMeters,
          available: true,
        };
      } catch (err) {
        return {
          durationText: 'Unavailable',
          distanceText: '--',
          durationSeconds: 0,
          distanceMeters: 0,
          available: false,
          note: err instanceof Error ? err.message : 'Route computation error',
        };
      }
    };

    const computeRoutePolyline = async (): Promise<LatLngPoint[]> => {
      try {
        const { routes } = await Route.computeRoutes({
          origin,
          destination: workplace.location,
          travelMode: 'DRIVING' as google.maps.TravelMode,
          routingPreference: RoutingPreference.TRAFFIC_AWARE,
          fields: ['path', 'distanceMeters', 'durationMillis'],
        });
        const firstRoute = routes?.[0];
        if (!firstRoute?.path) return [];
        return firstRoute.path.map((pt) => ({
          lat: pt.lat,
          lng: pt.lng,
        }));
      } catch {
        return [];
      }
    };

    const [driving, transit, routePath] = await Promise.all([
      computeMatrixForMode('DRIVING'),
      computeMatrixForMode('TRANSIT'),
      computeRoutePolyline(),
    ]);

    return {
      summary: {
        workplaceName: workplace.name,
        workplaceAddress: workplace.address,
        workplaceLocation: workplace.location,
        driving,
        transit,
      },
      routePath,
    };
  }

  isLocationInPolygon(point: LatLngPoint, polygon: google.maps.Polygon): boolean {
    if (!window.google?.maps?.geometry?.poly) return true;
    return google.maps.geometry.poly.containsLocation(
      new google.maps.LatLng(point.lat, point.lng),
      polygon
    );
  }

  private formatDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return '1 min';
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs} hr ${rem} min` : `${hrs} hr`;
  }

  private formatDistance(meters: number): string {
    if (!meters || meters <= 0) return '0.1 mi';
    const miles = meters / 1609.344;
    return `${miles.toFixed(1)} mi`;
  }
}
