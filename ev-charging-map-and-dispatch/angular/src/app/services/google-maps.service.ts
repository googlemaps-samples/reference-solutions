import { Injectable } from '@angular/core';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import {
  ActiveDispatchRoute,
  EvConnectorSummary,
  ProviderCategory,
  RouteStepItem,
  ServiceProviderItem,
} from '../models/dispatch.models';

declare global {
  interface Window {
    __ENV__?: {
      GOOGLE_MAPS_API_KEY?: string;
    };
  }
}

export const ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';
export const SEATTLE_CENTER: google.maps.LatLngLiteral = {
  lat: 47.6062,
  lng: -122.3321,
};

@Injectable({
  providedIn: 'root',
})
export class GoogleMapsService {
  private initialized = false;
  private loadPromise: Promise<void> | null = null;
  private geocoder: google.maps.Geocoder | null = null;
  private PinElementCtor: typeof google.maps.marker.PinElement | null = null;

  getApiKey(): string {
    return (window.__ENV__?.GOOGLE_MAPS_API_KEY ?? '').trim();
  }

  hasApiKey(): boolean {
    return this.getApiKey().length > 0;
  }

  async ensureLoaded(): Promise<void> {
    if (this.initialized) {
      return;
    }
    if (this.loadPromise) {
      return this.loadPromise;
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error(
        'Missing GOOGLE_MAPS_API_KEY. Copy .env.example to .env and configure your key.',
      );
    }

    this.loadPromise = (async () => {
      setOptions({
        key: apiKey,
        v: 'weekly',
        language: 'en',
        region: 'US',
      });

      const [, markerLib, , , geocodingLib] = await Promise.all([
        importLibrary('maps'),
        importLibrary('marker'),
        importLibrary('places'),
        importLibrary('routes'),
        importLibrary('geocoding'),
        importLibrary('core'),
      ]);

      this.PinElementCtor = markerLib.PinElement;
      this.geocoder = new geocodingLib.Geocoder();
      this.initialized = true;
    })();

    try {
      await this.loadPromise;
    } catch (err) {
      this.loadPromise = null;
      throw err;
    }
  }

  createDriverPinElement(): google.maps.marker.PinElement | null {
    if (!this.PinElementCtor) {
      return null;
    }
    return new this.PinElementCtor({
      background: '#dc2626',
      borderColor: '#991b1b',
      glyphColor: '#ffffff',
      glyphText: 'SOS',
      scale: 1.2,
    });
  }

  createProviderPinElement(
    category: ProviderCategory,
    selected: boolean,
  ): google.maps.marker.PinElement | null {
    if (!this.PinElementCtor) {
      return null;
    }
    const isEv = category === 'ev';
    return new this.PinElementCtor({
      background: isEv ? '#0f9d58' : '#d97706',
      borderColor: selected ? '#0f172a' : isEv ? '#065f46' : '#92400e',
      glyphColor: '#ffffff',
      glyphText: isEv ? 'EV' : 'FX',
      scale: selected ? 1.22 : 1.0,
    });
  }

  async createPlaceAutocompleteElement(
    biasCenter: google.maps.LatLngLiteral,
  ): Promise<google.maps.places.PlaceAutocompleteElement> {
    await this.ensureLoaded();
    const { PlaceAutocompleteElement } = (await importLibrary(
      'places',
    )) as google.maps.PlacesLibrary;

    const element = new PlaceAutocompleteElement({
      locationBias: {
        center: biasCenter,
        radius: 30000,
      },
      includedRegionCodes: ['us'],
      requestedLanguage: 'en',
      requestedRegion: 'us',
    });
    element.setAttribute('aria-label', 'Search breakdown or pickup address');
    return element;
  }

  async reverseGeocode(coords: google.maps.LatLngLiteral): Promise<string> {
    await this.ensureLoaded();
    if (!this.geocoder) {
      const { Geocoder } = (await importLibrary(
        'geocoding',
      )) as google.maps.GeocodingLibrary;
      this.geocoder = new Geocoder();
    }

    try {
      const response = await this.geocoder.geocode({ location: coords });
      const best = response.results?.[0];
      if (best?.formatted_address) {
        return best.formatted_address;
      }
    } catch {
      // Fallback to coordinates if geocoder returns ZERO_RESULTS or transient error
    }
    return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
  }

  async searchNearbyProviders(
    center: google.maps.LatLngLiteral,
    radiusMeters: number,
  ): Promise<ServiceProviderItem[]> {
    await this.ensureLoaded();
    const { Place, SearchNearbyRankPreference } = (await importLibrary(
      'places',
    )) as google.maps.PlacesLibrary;

    const baseFields = [
      'id',
      'displayName',
      'formattedAddress',
      'location',
      'rating',
      'userRatingCount',
      'primaryType',
      'types',
      'regularOpeningHours',
      'nationalPhoneNumber',
      'googleMapsURI',
      'businessStatus',
    ];

    const [evRes, repairRes] = await Promise.all([
      Place.searchNearby({
        fields: [...baseFields, 'evChargeOptions'],
        locationRestriction: { center, radius: radiusMeters },
        includedPrimaryTypes: ['electric_vehicle_charging_station'],
        maxResultCount: 12,
        rankPreference: SearchNearbyRankPreference.DISTANCE,
        language: 'en-US',
        region: 'us',
      }).catch(() => ({ places: [] as google.maps.places.Place[] })),
      Place.searchNearby({
        fields: baseFields,
        locationRestriction: { center, radius: radiusMeters },
        includedPrimaryTypes: ['car_repair'],
        maxResultCount: 12,
        rankPreference: SearchNearbyRankPreference.DISTANCE,
        language: 'en-US',
        region: 'us',
      }).catch(() => ({ places: [] as google.maps.places.Place[] })),
    ]);

    const seen = new Set<string>();
    const combined: ServiceProviderItem[] = [];

    const appendPlaces = (
      places: google.maps.places.Place[],
      category: ProviderCategory,
    ) => {
      for (const place of places) {
        const id = place.id;
        const loc = place.location;
        if (!id || !loc || seen.has(id)) {
          continue;
        }
        seen.add(id);

        const coords: google.maps.LatLngLiteral = {
          lat: loc.lat(),
          lng: loc.lng(),
        };
        const straightLineMeters = this.haversineMeters(center, coords);
        const evInfo = this.extractEvOptions(place.evChargeOptions);
        const availability = this.deriveAvailability(place, category, evInfo);

        combined.push({
          id,
          name: place.displayName || (category === 'ev' ? 'EV Charging Station' : 'Auto Repair Shop'),
          address: place.formattedAddress || 'Seattle, WA',
          category,
          location: coords,
          rating: typeof place.rating === 'number' ? place.rating : null,
          userRatingCount:
            typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
          primaryType: place.primaryType ?? null,
          phoneNumber: place.nationalPhoneNumber ?? null,
          googleMapsUri: place.googleMapsURI ?? null,
          availabilityLabel: availability.label,
          isAvailableBadgePositive: availability.positive,
          evConnectorCount: evInfo.totalConnectors,
          evMaxKw: evInfo.maxKw,
          evConnectors: evInfo.connectors,
          distanceMeters: null,
          distanceText: this.formatDistance(straightLineMeters),
          durationMillis: null,
          etaText: 'Calculating…',
          straightLineMeters,
        });
      }
    };

    appendPlaces(evRes.places ?? [], 'ev');
    appendPlaces(repairRes.places ?? [], 'repair');

    // Sort initially by straight-line distance and keep up to 20 for RouteMatrix
    combined.sort((a, b) => a.straightLineMeters - b.straightLineMeters);
    return combined.slice(0, 20);
  }

  async rankProvidersByRouteMatrix(
    origin: google.maps.LatLngLiteral,
    providers: ServiceProviderItem[],
  ): Promise<ServiceProviderItem[]> {
    if (providers.length === 0) {
      return [];
    }
    await this.ensureLoaded();
    const { RouteMatrix } = (await importLibrary(
      'routes',
    )) as google.maps.RoutesLibrary;

    try {
      const { matrix } = await RouteMatrix.computeRouteMatrix({
        origins: [origin],
        destinations: providers.map((p) => p.location),
        travelMode: 'DRIVING',
        routingPreference: 'TRAFFIC_AWARE',
        fields: ['condition', 'distanceMeters', 'durationMillis'],
        internalUsageAttributionIds: [ATTRIBUTION_ID],
      });

      const items = matrix?.rows?.[0]?.items ?? [];
      const enriched = providers.map((provider, idx) => {
        const item = items[idx];
        const hasRoute =
          item &&
          item.condition === 'ROUTE_EXISTS' &&
          typeof item.durationMillis === 'number' &&
          Number.isFinite(item.durationMillis);

        const distanceMeters =
          hasRoute && typeof item.distanceMeters === 'number'
            ? item.distanceMeters
            : provider.straightLineMeters;

        const durationMillis = hasRoute ? (item.durationMillis ?? null) : null;

        return {
          ...provider,
          distanceMeters,
          distanceText: this.formatDistance(distanceMeters),
          durationMillis,
          etaText:
            durationMillis !== null
              ? this.formatDuration(durationMillis)
              : this.estimateFallbackEta(provider.straightLineMeters),
        };
      });

      enriched.sort((a, b) => {
        const aTime = a.durationMillis ?? Number.MAX_SAFE_INTEGER;
        const bTime = b.durationMillis ?? Number.MAX_SAFE_INTEGER;
        if (aTime !== bTime) {
          return aTime - bTime;
        }
        return a.straightLineMeters - b.straightLineMeters;
      });

      return enriched;
    } catch {
      // Graceful fallback using straight-line estimates if RouteMatrix errors
      return providers.map((provider) => ({
        ...provider,
        distanceMeters: Math.round(provider.straightLineMeters),
        distanceText: this.formatDistance(provider.straightLineMeters),
        etaText: this.estimateFallbackEta(provider.straightLineMeters),
      }));
    }
  }

  async computeDispatchRoute(
    origin: google.maps.LatLngLiteral,
    provider: ServiceProviderItem,
  ): Promise<{
    route: google.maps.routes.Route;
    summary: ActiveDispatchRoute;
  }> {
    await this.ensureLoaded();
    const { Route } = (await importLibrary('routes')) as google.maps.RoutesLibrary;

    const { routes } = await Route.computeRoutes({
      origin,
      destination: provider.location,
      travelMode: 'DRIVING',
      routingPreference: 'TRAFFIC_AWARE',
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport', 'legs'],
      internalUsageAttributionIds: [ATTRIBUTION_ID],
    });

    const route = routes?.[0];
    if (!route) {
      throw new Error('No drivable dispatch route was returned for this destination.');
    }

    const leg = route.legs?.[0];
    const totalMeters = route.distanceMeters ?? leg?.distanceMeters ?? provider.distanceMeters ?? 0;
    const totalMillis = route.durationMillis ?? leg?.durationMillis ?? provider.durationMillis ?? 0;

    const steps: RouteStepItem[] = (leg?.steps ?? []).map((step, index) => ({
      index: index + 1,
      instruction: step.instructions?.trim() || 'Continue along route',
      maneuver: step.maneuver || 'STRAIGHT',
      distanceText:
        step.localizedValues?.distance ||
        this.formatDistance(step.distanceMeters ?? 0),
      durationText:
        step.localizedValues?.staticDuration ||
        this.formatDuration(step.staticDurationMillis ?? 0),
    }));

    return {
      route,
      summary: {
        provider,
        distanceText: this.formatDistance(totalMeters),
        durationText: this.formatDuration(totalMillis),
        steps,
      },
    };
  }

  private extractEvOptions(evChargeOptions?: google.maps.places.EVChargeOptions | null): {
    totalConnectors: number | null;
    maxKw: number | null;
    connectors: EvConnectorSummary[];
  } {
    if (!evChargeOptions) {
      return { totalConnectors: null, maxKw: null, connectors: [] };
    }

    const aggregations = evChargeOptions.connectorAggregations ?? [];
    let maxKw: number | null = null;
    const connectors: EvConnectorSummary[] = [];

    for (const agg of aggregations) {
      const kw = typeof agg.maxChargeRateKw === 'number' ? agg.maxChargeRateKw : 0;
      if (kw > 0 && (maxKw === null || kw > maxKw)) {
        maxKw = Math.round(kw);
      }
      connectors.push({
        typeLabel: this.formatConnectorType(agg.type),
        count: agg.count ?? 0,
        availableCount: typeof agg.availableCount === 'number' ? agg.availableCount : null,
        maxChargeRateKw: Math.round(kw),
      });
    }

    const totalConnectors =
      typeof evChargeOptions.connectorCount === 'number'
        ? evChargeOptions.connectorCount
        : connectors.reduce((sum, c) => sum + c.count, 0) || null;

    return { totalConnectors, maxKw, connectors };
  }

  private deriveAvailability(
    place: google.maps.places.Place,
    category: ProviderCategory,
    evInfo: {
      totalConnectors: number | null;
      maxKw: number | null;
      connectors: EvConnectorSummary[];
    },
  ): { label: string; positive: boolean } {
    if (category === 'ev') {
      const availableKnown = evInfo.connectors.some((c) => c.availableCount !== null);
      if (availableKnown) {
        const availableSum = evInfo.connectors.reduce(
          (sum, c) => sum + (c.availableCount ?? 0),
          0,
        );
        const total = evInfo.totalConnectors ?? evInfo.connectors.reduce((s, c) => s + c.count, 0);
        const kwText = evInfo.maxKw ? ` · ${evInfo.maxKw} kW` : '';
        return {
          label: `${availableSum}/${total} ports free${kwText}`,
          positive: availableSum > 0,
        };
      }
      if (evInfo.totalConnectors) {
        const kwText = evInfo.maxKw ? ` · up to ${evInfo.maxKw} kW` : '';
        return {
          label: `${evInfo.totalConnectors} chargers${kwText}`,
          positive: true,
        };
      }
    }

    // Weekly-channel safe opening hours check (never call beta-only place.isOpen())
    const periods = place.regularOpeningHours?.periods;
    if (periods && periods.length > 0) {
      if (periods.length === 1 && periods[0].open && !periods[0].close) {
        return { label: 'Open 24 hours', positive: true };
      }
      const openNow = this.isOpenInSeattleNow(periods);
      if (openNow !== null) {
        return {
          label: openNow ? 'Open now' : 'Closed now',
          positive: openNow,
        };
      }
    }

    if (place.businessStatus === 'OPERATIONAL') {
      return {
        label: category === 'ev' ? 'Station active' : 'Operational',
        positive: true,
      };
    }

    return { label: 'Check hours', positive: false };
  }

  private isOpenInSeattleNow(
    periods: google.maps.places.OpeningHoursPeriod[],
  ): boolean | null {
    try {
      const now = new Date();
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(now);

      const weekdayStr = parts.find((p) => p.type === 'weekday')?.value ?? '';
      const hour = Number.parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10) % 24;
      const minute = Number.parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);

      const dayMap: Record<string, number> = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
      };
      const currentDay = dayMap[weekdayStr];
      if (currentDay === undefined) {
        return null;
      }

      const currentMinutesOfWeek = currentDay * 1440 + hour * 60 + minute;

      for (const period of periods) {
        if (!period.open) {
          continue;
        }
        const openMinutes =
          period.open.day * 1440 + period.open.hour * 60 + period.open.minute;

        if (!period.close) {
          return true;
        }
        let closeMinutes =
          period.close.day * 1440 + period.close.hour * 60 + period.close.minute;

        if (closeMinutes <= openMinutes) {
          closeMinutes += 7 * 1440;
        }

        const candidateMinutes =
          currentMinutesOfWeek < openMinutes
            ? currentMinutesOfWeek + 7 * 1440
            : currentMinutesOfWeek;

        if (candidateMinutes >= openMinutes && candidateMinutes < closeMinutes) {
          return true;
        }
      }
      return false;
    } catch {
      return null;
    }
  }

  private formatConnectorType(type?: string | null): string {
    switch (type) {
      case 'CCS_COMBO_1':
        return 'CCS1';
      case 'CCS_COMBO_2':
        return 'CCS2';
      case 'CHADEMO':
        return 'CHAdeMO';
      case 'J1772':
        return 'J1772';
      case 'NACS':
        return 'NACS';
      case 'TESLA':
        return 'Tesla';
      case 'TYPE_2':
        return 'Type 2';
      default:
        return 'EV Port';
    }
  }

  formatDistance(meters: number): string {
    if (!Number.isFinite(meters) || meters < 0) {
      return '—';
    }
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  }

  formatDuration(durationMillis: number): string {
    if (!Number.isFinite(durationMillis) || durationMillis <= 0) {
      return '1 min';
    }
    const mins = Math.max(1, Math.round(durationMillis / 60000));
    if (mins < 60) {
      return `${mins} min`;
    }
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs} hr ${rem} min` : `${hrs} hr`;
  }

  private estimateFallbackEta(meters: number): string {
    // Approx ~32 km/h urban driving fallback
    const millis = (meters / 8.8) * 1000;
    return `~${this.formatDuration(millis)}`;
  }

  private haversineMeters(
    a: google.maps.LatLngLiteral,
    b: google.maps.LatLngLiteral,
  ): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }
}
