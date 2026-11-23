import { Injectable } from '@angular/core';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { AuditSite, OptimizedRouteResult } from '../models/workforce.models';
import { AUSTIN_CENTER } from '../data/austin-seed.data';

declare global {
  interface Window {
    __ENV__?: {
      GOOGLE_MAPS_API_KEY?: string;
    };
  }
}

export const INTERNAL_USAGE_ATTRIBUTION_IDS = ['gmp_git_agentsamples_v1.0.0'];

@Injectable({
  providedIn: 'root',
})
export class GoogleMapsService {
  private initializedPromise: Promise<void> | null = null;
  private markerLib: google.maps.MarkerLibrary | null = null;
  private placesLib: google.maps.PlacesLibrary | null = null;
  private routesLib: google.maps.RoutesLibrary | null = null;
  private geocodingLib: google.maps.GeocodingLibrary | null = null;
  private geometryLib: google.maps.GeometryLibrary | null = null;

  getApiKey(): string {
    const key = window.__ENV__?.GOOGLE_MAPS_API_KEY?.trim() || '';
    if (!key || key === 'your_google_maps_api_key_here') {
      return '';
    }
    return key;
  }

  hasApiKey(): boolean {
    return this.getApiKey().length > 0;
  }

  async ensureLoaded(): Promise<void> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Missing GOOGLE_MAPS_API_KEY in runtime environment.');
    }

    if (!this.initializedPromise) {
      this.initializedPromise = (async () => {
        setOptions({
          key: apiKey,
          v: 'weekly',
          language: 'en',
          region: 'US',
        });

        const [, , markerLib, placesLib, routesLib, geocodingLib, geometryLib] =
          await Promise.all([
            importLibrary('core'),
            importLibrary('maps'),
            importLibrary('marker'),
            importLibrary('places'),
            importLibrary('routes'),
            importLibrary('geocoding'),
            importLibrary('geometry'),
          ]);

        this.markerLib = markerLib;
        this.placesLib = placesLib;
        this.routesLib = routesLib;
        this.geocodingLib = geocodingLib;
        this.geometryLib = geometryLib;
      })();
    }

    return this.initializedPromise;
  }

  async reverseGeocode(position: google.maps.LatLngLiteral): Promise<string> {
    await this.ensureLoaded();
    const GeocoderClass = this.geocodingLib?.Geocoder ?? google.maps.Geocoder;
    const geocoder = new GeocoderClass();
    const response = await geocoder.geocode({ location: position });
    const firstResult = response.results?.[0];
    if (firstResult?.formatted_address) {
      return firstResult.formatted_address;
    }
    return `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)} (Austin, TX)`;
  }

  async searchAuditSites(
    textQuery: string,
    center: google.maps.LatLngLiteral = AUSTIN_CENTER
  ): Promise<AuditSite[]> {
    await this.ensureLoaded();
    const PlaceClass = this.placesLib?.Place ?? google.maps.places.Place;

    const request: google.maps.places.SearchByTextRequest = {
      textQuery: textQuery.trim() || 'retail stores in Austin, TX',
      fields: [
        'id',
        'displayName',
        'formattedAddress',
        'location',
        'primaryTypeDisplayName',
      ],
      locationBias: {
        center,
        radius: 16000,
      },
      language: 'en-US',
      region: 'us',
      maxResultCount: 6,
      internalUsageAttributionIds: INTERNAL_USAGE_ATTRIBUTION_IDS,
    };

    const { places } = await PlaceClass.searchByText(request);
    if (!places || places.length === 0) {
      return [];
    }

    const mapped: AuditSite[] = [];
    for (const place of places) {
      if (!place.location) {
        continue;
      }
      const lat =
        typeof place.location.lat === 'function'
          ? place.location.lat()
          : Number(place.location.lat);
      const lng =
        typeof place.location.lng === 'function'
          ? place.location.lng()
          : Number(place.location.lng);

      mapped.push({
        id: place.id || `site-${mapped.length + 1}`,
        name: place.displayName || `Audit Site ${mapped.length + 1}`,
        formattedAddress: place.formattedAddress || 'Austin, TX',
        primaryType: place.primaryTypeDisplayName || 'Retail Store',
        location: { lat, lng },
        orderIndex: mapped.length + 1,
      });
    }

    return mapped.slice(0, 5);
  }

  async computeOptimizedAuditRoute(
    origin: google.maps.LatLngLiteral,
    sites: AuditSite[]
  ): Promise<OptimizedRouteResult> {
    await this.ensureLoaded();

    if (sites.length === 0) {
      return {
        orderedStops: [],
        polylinePath: [],
        totalDistanceMeters: 0,
        totalDurationMillis: 0,
      };
    }

    const RouteClass = this.routesLib?.Route ?? google.maps.routes.Route;
    const intermediateSites = sites.length > 1 ? sites.slice(0, -1) : [];
    const destinationSite = sites[sites.length - 1];

    const request: google.maps.routes.ComputeRoutesRequest = {
      origin,
      destination: destinationSite.location,
      intermediates: intermediateSites.map((site) => ({
        location: site.location,
        vehicleStopover: true,
      })),
      travelMode: 'DRIVING',
      routingPreference: 'TRAFFIC_AWARE',
      optimizeWaypointOrder: intermediateSites.length >= 2,
      fields: [
        'path',
        'distanceMeters',
        'durationMillis',
        'legs',
        'optimizedIntermediateWaypointIndices',
        'viewport',
      ],
      internalUsageAttributionIds: INTERNAL_USAGE_ATTRIBUTION_IDS,
    };

    const { routes } = await RouteClass.computeRoutes(request);
    const primaryRoute = routes?.[0];

    if (!primaryRoute) {
      return {
        orderedStops: sites.map((site, idx) => ({
          ...site,
          orderIndex: idx + 1,
          pinContent: this.createStopPin(idx + 1, false),
        })),
        polylinePath: [],
        totalDistanceMeters: 0,
        totalDurationMillis: 0,
      };
    }

    const optimizedIndices = primaryRoute.optimizedIntermediateWaypointIndices;
    const orderedIntermediates =
      optimizedIndices && optimizedIndices.length === intermediateSites.length
        ? optimizedIndices.map((idx) => intermediateSites[idx])
        : intermediateSites;

    const orderedSequence = [...orderedIntermediates, destinationSite];
    const legs = primaryRoute.legs ?? [];

    const orderedStops: AuditSite[] = orderedSequence.map((site, idx) => {
      const leg = legs[idx];
      return {
        ...site,
        orderIndex: idx + 1,
        legDistanceMeters: leg?.distanceMeters ?? undefined,
        legDurationMillis: leg?.durationMillis ?? undefined,
        pinContent: this.createStopPin(idx + 1, false),
      };
    });

    const polylinePath: google.maps.LatLngLiteral[] = (primaryRoute.path ?? []).map(
      (point) => ({
        lat: point.lat,
        lng: point.lng,
      })
    );

    return {
      orderedStops,
      polylinePath,
      totalDistanceMeters: primaryRoute.distanceMeters ?? 0,
      totalDurationMillis: primaryRoute.durationMillis ?? 0,
      viewport: primaryRoute.viewport ?? null,
    };
  }

  isPointInPolygon(
    point: google.maps.LatLngLiteral,
    polygonPath: google.maps.LatLngLiteral[]
  ): boolean {
    if (polygonPath.length < 3 || (!this.geometryLib && !google.maps.geometry)) {
      return false;
    }
    const polyHelper =
      this.geometryLib?.poly ?? google.maps.geometry?.poly;
    if (!polyHelper) {
      return false;
    }
    const latLng = new google.maps.LatLng(point.lat, point.lng);
    const polygon = new google.maps.Polygon({ paths: polygonPath });
    return polyHelper.containsLocation(latLng, polygon);
  }

  createStopPin(orderNumber: number, isSelected: boolean): google.maps.marker.PinElement {
    const PinElementClass =
      this.markerLib?.PinElement ?? google.maps.marker.PinElement;

    return new PinElementClass({
      glyphText: String(orderNumber),
      glyphColor: '#ffffff',
      background: isSelected ? '#0f172a' : '#1a73e8',
      borderColor: isSelected ? '#1a73e8' : '#1557b0',
      scale: isSelected ? 1.2 : 1.05,
    });
  }

  createWorkerPin(isInsideGeofence: boolean): google.maps.marker.PinElement {
    const PinElementClass =
      this.markerLib?.PinElement ?? google.maps.marker.PinElement;

    return new PinElementClass({
      glyphText: 'W',
      glyphColor: '#ffffff',
      background: isInsideGeofence ? '#059669' : '#d97706',
      borderColor: isInsideGeofence ? '#065f46' : '#92400e',
      scale: 1.15,
    });
  }
}
