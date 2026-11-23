import { Injectable } from '@angular/core';
import {
  AddressValidationSummary,
  DELIVERY_ZONE_POLYGON,
  DeliveryEligibility,
  KITCHEN_HUB,
  LatLngPoint,
  MAX_DELIVERY_DISTANCE_METERS,
  RouteSummary,
  RouteStepSummary,
} from '../models/delivery.models';
import { LoadedMapsLibraries } from './maps-loader.service';

@Injectable({ providedIn: 'root' })
export class DeliveryTrackingService {
  private zonePolygonInstance: google.maps.Polygon | null = null;

  private extractLatLng(
    loc: google.maps.LatLng | google.maps.LatLngLiteral | { latitude?: number; longitude?: number } | null | undefined
  ): LatLngPoint | null {
    if (!loc) return null;
    if ('lat' in loc && 'lng' in loc) {
      const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
      const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
      if (typeof lat === 'number' && typeof lng === 'number') {
        return { lat, lng };
      }
    }
    if ('latitude' in loc && 'longitude' in loc) {
      if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
        return { lat: loc.latitude, lng: loc.longitude };
      }
    }
    return null;
  }

  private resolvePropertyType(metadata?: {
    residential?: boolean | null;
    business?: boolean | null;
    poBox?: boolean | null;
  } | null): 'Residential' | 'Business' | 'PO Box' | 'Unknown' {
    if (!metadata) return 'Unknown';
    if (metadata.poBox) return 'PO Box';
    if (metadata.residential) return 'Residential';
    if (metadata.business) return 'Business';
    return 'Unknown';
  }

  private isGranularityDeliverable(granularity: string | null | undefined): boolean {
    return granularity === 'PREMISE' || granularity === 'SUB_PREMISE' || granularity === 'PREMISE_PROXIMITY';
  }

  async validateAddress(
    libs: LoadedMapsLibraries,
    streetInput: string,
    unitInput: string,
    fallbackPlace?: { formattedAddress?: string | null; location?: LatLngPoint | null; id?: string | null }
  ): Promise<AddressValidationSummary> {
    const addressLines = [streetInput.trim(), unitInput.trim()].filter(Boolean);

    try {
      const { AddressValidation } = libs.addressValidation;
      const result = await AddressValidation.fetchAddressValidation({
        address: {
          regionCode: 'US',
          languageCode: 'en',
          addressLines,
        },
        uspsCASSEnabled: true,
        internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
      });

      const verdict = result.verdict;
      const validationGranularity = verdict?.validationGranularity ?? null;
      const geocodeGranularity = verdict?.geocodeGranularity ?? null;
      const inputGranularity = verdict?.inputGranularity ?? null;
      const addressComplete = Boolean(verdict?.addressComplete);
      const hasUnconfirmedComponents = Boolean(verdict?.hasUnconfirmedComponents);
      const hasInferredComponents = Boolean(verdict?.hasInferredComponents);
      const hasReplacedComponents = Boolean(verdict?.hasReplacedComponents);

      const location = this.extractLatLng(result.geocode?.location) ?? fallbackPlace?.location ?? null;
      const propertyType = this.resolvePropertyType(result.metadata);
      const isPoBox = propertyType === 'PO Box';
      const deliverable =
        !isPoBox &&
        this.isGranularityDeliverable(validationGranularity) &&
        Boolean(location) &&
        !hasUnconfirmedComponents;

      const uspsStd = result.uspsData?.standardizedAddress;
      const uspsStandardizedLine = uspsStd
        ? [uspsStd.firstAddressLine, uspsStd.cityStateZipAddressLine].filter(Boolean).join(', ')
        : null;

      return {
        status: deliverable ? 'validated' : 'warning',
        formattedAddress: result.address?.formattedAddress || fallbackPlace?.formattedAddress || streetInput,
        placeId: result.geocode?.placeId ?? fallbackPlace?.id ?? null,
        location,
        plusCode: result.geocode?.plusCode?.compoundCode ?? result.geocode?.plusCode?.globalCode ?? null,
        validationGranularity,
        geocodeGranularity,
        inputGranularity,
        addressComplete,
        hasUnconfirmedComponents,
        hasInferredComponents,
        hasReplacedComponents,
        deliverable,
        propertyType,
        uspsDpvConfirmation: result.uspsData?.dpvConfirmation ?? null,
        uspsStandardizedLine,
        source: 'address-validation-js',
        message: isPoBox
          ? 'PO Boxes are not eligible for courier drop-off.'
          : deliverable
            ? 'Verified premise-level deliverable address.'
            : 'Address needs confirmation or lacks premise-level granularity.',
      };
    } catch {
      // Try BFF proxy /api/address/validate if available, otherwise fallback to Places/Geocoder coordinates
      try {
        const resp = await fetch('/api/address/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: {
              regionCode: 'US',
              languageCode: 'en',
              addressLines,
            },
            enableUspsCass: true,
          }),
        });

        if (resp.ok) {
          const payload = (await resp.json()) as {
            result?: {
              verdict?: {
                validationGranularity?: string;
                geocodeGranularity?: string;
                inputGranularity?: string;
                addressComplete?: boolean;
                hasUnconfirmedComponents?: boolean;
                hasInferredComponents?: boolean;
                hasReplacedComponents?: boolean;
              };
              address?: { formattedAddress?: string };
              geocode?: {
                location?: { latitude?: number; longitude?: number };
                placeId?: string;
                plusCode?: { compoundCode?: string; globalCode?: string };
              };
              metadata?: { residential?: boolean; business?: boolean; poBox?: boolean };
              uspsData?: {
                dpvConfirmation?: string;
                standardizedAddress?: { firstAddressLine?: string; cityStateZipAddressLine?: string };
              };
            };
          };
          const r = payload.result;
          if (r) {
            const verdict = r.verdict;
            const validationGranularity = verdict?.validationGranularity ?? null;
            const hasUnconfirmedComponents = Boolean(verdict?.hasUnconfirmedComponents);
            const location = this.extractLatLng(r.geocode?.location) ?? fallbackPlace?.location ?? null;
            const propertyType = this.resolvePropertyType(r.metadata);
            const isPoBox = propertyType === 'PO Box';
            const deliverable =
              !isPoBox &&
              this.isGranularityDeliverable(validationGranularity) &&
              Boolean(location) &&
              !hasUnconfirmedComponents;

            const uspsStd = r.uspsData?.standardizedAddress;
            const uspsStandardizedLine = uspsStd
              ? [uspsStd.firstAddressLine, uspsStd.cityStateZipAddressLine].filter(Boolean).join(', ')
              : null;

            return {
              status: deliverable ? 'validated' : 'warning',
              formattedAddress: r.address?.formattedAddress || fallbackPlace?.formattedAddress || streetInput,
              placeId: r.geocode?.placeId ?? fallbackPlace?.id ?? null,
              location,
              plusCode: r.geocode?.plusCode?.compoundCode ?? r.geocode?.plusCode?.globalCode ?? null,
              validationGranularity,
              geocodeGranularity: verdict?.geocodeGranularity ?? null,
              inputGranularity: verdict?.inputGranularity ?? null,
              addressComplete: Boolean(verdict?.addressComplete),
              hasUnconfirmedComponents,
              hasInferredComponents: Boolean(verdict?.hasInferredComponents),
              hasReplacedComponents: Boolean(verdict?.hasReplacedComponents),
              deliverable,
              propertyType,
              uspsDpvConfirmation: r.uspsData?.dpvConfirmation ?? null,
              uspsStandardizedLine,
              source: 'address-validation-bff',
              message: deliverable
                ? 'Verified premise-level deliverable address.'
                : 'Address requires confirmation or lacks premise-level granularity.',
            };
          }
        }
      } catch {
        // Proceed to Places fallback
      }

      const resolvedLocation = fallbackPlace?.location ?? (await this.resolveViaPlacesTextSearch(libs, streetInput));
      if (resolvedLocation) {
        return {
          status: 'warning',
          formattedAddress: fallbackPlace?.formattedAddress || streetInput,
          placeId: fallbackPlace?.id ?? null,
          location: resolvedLocation,
          plusCode: null,
          validationGranularity: 'PREMISE_PROXIMITY',
          geocodeGranularity: 'ROOFTOP',
          inputGranularity: 'PREMISE',
          addressComplete: true,
          hasUnconfirmedComponents: false,
          hasInferredComponents: false,
          hasReplacedComponents: false,
          deliverable: true,
          propertyType: 'Unknown',
          uspsDpvConfirmation: null,
          uspsStandardizedLine: null,
          source: 'places-fallback',
          message:
            'Address Validation API unavailable for this key; coordinates resolved live via Places API (New).',
        };
      }

      return {
        status: 'error',
        formattedAddress: streetInput,
        placeId: null,
        location: null,
        plusCode: null,
        validationGranularity: null,
        geocodeGranularity: null,
        inputGranularity: null,
        addressComplete: false,
        hasUnconfirmedComponents: true,
        hasInferredComponents: false,
        hasReplacedComponents: false,
        deliverable: false,
        propertyType: 'Unknown',
        uspsDpvConfirmation: null,
        uspsStandardizedLine: null,
        source: 'address-validation-js',
        message: 'Could not validate or geocode this address. Select a suggestion from autocomplete.',
      };
    }
  }

  async resolveViaPlacesTextSearch(
    libs: LoadedMapsLibraries,
    query: string
  ): Promise<LatLngPoint | null> {
    try {
      const { Place } = libs.places;
      const { places } = await Place.searchByText({
        textQuery: query,
        fields: ['location', 'formattedAddress', 'id'],
        maxResultCount: 1,
        locationBias: {
          center: KITCHEN_HUB.location,
          radius: 25000,
        },
      });
      const first = places?.[0];
      return this.extractLatLng(first?.location);
    } catch {
      return null;
    }
  }

  async resolveAddressDetails(
    libs: LoadedMapsLibraries,
    query: string
  ): Promise<{ formattedAddress: string; location: LatLngPoint; id: string | null } | null> {
    try {
      const { Place } = libs.places;
      const { places } = await Place.searchByText({
        textQuery: query,
        fields: ['location', 'formattedAddress', 'id'],
        maxResultCount: 1,
        locationBias: {
          center: KITCHEN_HUB.location,
          radius: 25000,
        },
      });
      const first = places?.[0];
      const location = this.extractLatLng(first?.location);
      if (!location) return null;
      return {
        formattedAddress: first?.formattedAddress || query,
        location,
        id: first?.id ?? null,
      };
    } catch {
      return null;
    }
  }

  isInsideDeliveryPolygon(libs: LoadedMapsLibraries, point: LatLngPoint): boolean {
    if (!this.zonePolygonInstance) {
      this.zonePolygonInstance = new libs.maps.Polygon({
        paths: DELIVERY_ZONE_POLYGON,
      });
    }
    const latLng = new libs.core.LatLng(point.lat, point.lng);
    return libs.geometry.poly.containsLocation(latLng, this.zonePolygonInstance);
  }

  async computeDeliveryRoute(
    libs: LoadedMapsLibraries,
    destination: LatLngPoint
  ): Promise<RouteSummary> {
    try {
      const { Route } = libs.routes;
      const { routes } = await Route.computeRoutes({
        origin: KITCHEN_HUB.location,
        destination,
        travelMode: 'DRIVING',
        routingPreference: google.maps.routes.RoutingPreference.TRAFFIC_AWARE,
        fields: ['durationMillis', 'staticDurationMillis', 'distanceMeters', 'path', 'legs'],
      });

      const primary = routes?.[0];
      if (!primary) {
        throw new Error('No driving route returned by Routes API.');
      }

      const rawPath = primary.path ?? [];
      const path: LatLngPoint[] = rawPath.map((pt) => ({
        lat: pt.lat,
        lng: pt.lng,
      }));

      const latLngObjects = path.map((p) => new libs.core.LatLng(p.lat, p.lng));
      const encodedPolyline =
        latLngObjects.length > 0 ? libs.geometry.encoding.encodePath(latLngObjects) : '';

      const distanceMeters = primary.distanceMeters ?? 0;
      const durationMillis = primary.durationMillis ?? primary.staticDurationMillis ?? 0;

      const steps: RouteStepSummary[] = [];
      for (const leg of primary.legs ?? []) {
        for (const step of leg.steps ?? []) {
          if (step.instructions) {
            steps.push({
              instruction: step.instructions,
              distanceMeters: step.distanceMeters ?? 0,
              durationSeconds: Math.round((step.staticDurationMillis ?? 0) / 1000),
            });
          }
        }
      }

      return {
        distanceMeters,
        distanceKm: Number((distanceMeters / 1000).toFixed(2)),
        durationMillis,
        durationMinutes: Math.max(1, Math.round(durationMillis / 60000)),
        encodedPolyline,
        path,
        steps,
      };
    } catch (sdkErr) {
      // Fallback to BFF /api/routes/compute
      const resp = await fetch('/api/routes/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: { latitude: KITCHEN_HUB.location.lat, longitude: KITCHEN_HUB.location.lng },
            },
          },
          destination: {
            location: {
              latLng: { latitude: destination.lat, longitude: destination.lng },
            },
          },
        }),
      });

      if (!resp.ok) {
        throw sdkErr instanceof Error ? sdkErr : new Error('Failed to compute route.');
      }

      const payload = (await resp.json()) as {
        routes?: Array<{
          distanceMeters?: number;
          duration?: string;
          polyline?: { encodedPolyline?: string };
          legs?: Array<{
            steps?: Array<{
              navigationInstruction?: { instructions?: string };
              distanceMeters?: number;
              staticDuration?: string;
            }>;
          }>;
        }>;
      };

      const route = payload.routes?.[0];
      if (!route) {
        throw new Error('No route returned by Routes API.');
      }

      const encoded = route.polyline?.encodedPolyline ?? '';
      const decoded = encoded ? libs.geometry.encoding.decodePath(encoded) : [];
      const path = decoded.map((pt) => ({ lat: pt.lat(), lng: pt.lng() }));
      const distanceMeters = route.distanceMeters ?? 0;
      const durationSeconds = Number((route.duration ?? '0s').replace('s', '')) || 0;
      const durationMillis = durationSeconds * 1000;

      const steps: RouteStepSummary[] = [];
      for (const leg of route.legs ?? []) {
        for (const step of leg.steps ?? []) {
          const text = step.navigationInstruction?.instructions;
          if (text) {
            const sec = Number((step.staticDuration ?? '0s').replace('s', '')) || 0;
            steps.push({
              instruction: text,
              distanceMeters: step.distanceMeters ?? 0,
              durationSeconds: sec,
            });
          }
        }
      }

      return {
        distanceMeters,
        distanceKm: Number((distanceMeters / 1000).toFixed(2)),
        durationMillis,
        durationMinutes: Math.max(1, Math.round(durationMillis / 60000)),
        encodedPolyline: encoded,
        path,
        steps,
      };
    }
  }

  evaluateEligibility(
    insidePolygon: boolean,
    distanceMeters: number,
    deliverableAddress: boolean
  ): DeliveryEligibility {
    const withinDistanceLimit = distanceMeters <= MAX_DELIVERY_DISTANCE_METERS;
    const distanceKm = Number((distanceMeters / 1000).toFixed(2));

    if (!deliverableAddress) {
      return {
        insidePolygon,
        withinDistanceLimit,
        eligible: false,
        feeTierLabel: 'Address Confirmation Required',
        deliveryFee: null,
        reason: 'Drop-off address must pass premise-level validation before dispatch.',
      };
    }

    if (!insidePolygon && !withinDistanceLimit) {
      return {
        insidePolygon: false,
        withinDistanceLimit: false,
        eligible: false,
        feeTierLabel: 'Outside Polygon & > 8 km',
        deliveryFee: null,
        reason: `Drop-off is outside our Chicago polygon and ${distanceKm} km exceeds the 8.0 km road limit.`,
      };
    }

    if (!insidePolygon) {
      return {
        insidePolygon: false,
        withinDistanceLimit,
        eligible: false,
        feeTierLabel: 'Outside Delivery Polygon',
        deliveryFee: null,
        reason: 'Coordinate falls outside our Fulton Market Chicago delivery polygon.',
      };
    }

    if (!withinDistanceLimit) {
      return {
        insidePolygon: true,
        withinDistanceLimit: false,
        eligible: false,
        feeTierLabel: 'Exceeds 8 km Road Limit',
        deliveryFee: null,
        reason: `Road route is ${distanceKm} km, exceeding our 8.0 km maximum delivery distance.`,
      };
    }

    if (distanceMeters <= 3000) {
      return {
        insidePolygon: true,
        withinDistanceLimit: true,
        eligible: true,
        feeTierLabel: 'Tier 1 · Express (≤ 3 km)',
        deliveryFee: 2.99,
        reason: `Inside Chicago zone and ${distanceKm} km road distance qualifies for $2.99 Express delivery.`,
      };
    }

    if (distanceMeters <= 5500) {
      return {
        insidePolygon: true,
        withinDistanceLimit: true,
        eligible: true,
        feeTierLabel: 'Tier 2 · Standard (3–5.5 km)',
        deliveryFee: 4.99,
        reason: `Inside Chicago zone and ${distanceKm} km road distance qualifies for $4.99 Standard delivery.`,
      };
    }

    return {
      insidePolygon: true,
      withinDistanceLimit: true,
      eligible: true,
      feeTierLabel: 'Tier 3 · Extended (5.5–8 km)',
      deliveryFee: 6.99,
      reason: `Inside Chicago zone and ${distanceKm} km road distance qualifies for $6.99 Extended delivery.`,
    };
  }

  interpolateAlongPath(
    path: LatLngPoint[],
    progress: number
  ): { position: LatLngPoint; headingDegrees: number } {
    if (path.length === 0) {
      return { position: KITCHEN_HUB.location, headingDegrees: 0 };
    }
    if (path.length === 1 || progress <= 0) {
      const heading =
        path.length > 1 ? this.computeBearing(path[0], path[1]) : 0;
      return { position: path[0], headingDegrees: heading };
    }
    if (progress >= 1) {
      const last = path[path.length - 1];
      const prev = path[path.length - 2];
      return { position: last, headingDegrees: this.computeBearing(prev, last) };
    }

    const segmentLengths: number[] = [];
    let totalLength = 0;
    for (let i = 0; i < path.length - 1; i += 1) {
      const d = this.haversineMeters(path[i], path[i + 1]);
      segmentLengths.push(d);
      totalLength += d;
    }

    if (totalLength === 0) {
      return { position: path[0], headingDegrees: 0 };
    }

    const targetDist = totalLength * progress;
    let accumulated = 0;
    for (let i = 0; i < segmentLengths.length; i += 1) {
      const segLen = segmentLengths[i];
      if (accumulated + segLen >= targetDist && segLen > 0) {
        const localT = (targetDist - accumulated) / segLen;
        const a = path[i];
        const b = path[i + 1];
        return {
          position: {
            lat: a.lat + (b.lat - a.lat) * localT,
            lng: a.lng + (b.lng - a.lng) * localT,
          },
          headingDegrees: this.computeBearing(a, b),
        };
      }
      accumulated += segLen;
    }

    const last = path[path.length - 1];
    return { position: last, headingDegrees: 0 };
  }

  private haversineMeters(a: LatLngPoint, b: LatLngPoint): number {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const sinLat = Math.sin(dLat / 2);
    const sinLng = Math.sin(dLng / 2);
    const h =
      sinLat * sinLat +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  private computeBearing(a: LatLngPoint, b: LatLngPoint): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }

  buildStaticReceiptUrl(
    origin: LatLngPoint,
    destination: LatLngPoint,
    encodedPolyline: string
  ): string {
    const params = new URLSearchParams({
      origin: `${origin.lat.toFixed(6)},${origin.lng.toFixed(6)}`,
      destination: `${destination.lat.toFixed(6)},${destination.lng.toFixed(6)}`,
      enc: encodedPolyline,
    });
    return `/api/maps/static-receipt?${params.toString()}`;
  }
}
