import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import {
  GMP_USAGE_ATTRIBUTION_ID,
  MAX_DELIVERY_DISTANCE_METERS,
  calculateDeliveryTier,
  type LatLngPoint,
} from '../config/delivery';
import type {
  RouteComputationResult,
  RouteStepSummary,
  ValidatedAddressResult,
  ZoneEligibilityResult,
} from '../types/delivery';

export interface LoadedGoogleMapsLibraries {
  maps: google.maps.MapsLibrary;
  marker: google.maps.MarkerLibrary;
  places: google.maps.PlacesLibrary;
  addressValidation: google.maps.AddressValidationLibrary;
  routes: google.maps.RoutesLibrary;
  geometry: google.maps.GeometryLibrary;
  core: google.maps.CoreLibrary;
}

let optionsConfigured = false;

export async function initGoogleMaps(apiKey: string): Promise<LoadedGoogleMapsLibraries> {
  if (!optionsConfigured) {
    setOptions({
      key: apiKey,
      v: 'weekly',
      language: 'en',
      region: 'US',
    });
    optionsConfigured = true;
  }

  const [maps, marker, places, addressValidation, routes, geometry, core] =
    await Promise.all([
      importLibrary('maps'),
      importLibrary('marker'),
      importLibrary('places'),
      importLibrary('addressValidation'),
      importLibrary('routes'),
      importLibrary('geometry'),
      importLibrary('core'),
    ]);

  return {
    maps,
    marker,
    places,
    addressValidation,
    routes,
    geometry,
    core,
  };
}

const DELIVERABLE_GRANULARITIES = new Set<string>([
  'SUB_PREMISE',
  'PREMISE',
  'PREMISE_PROXIMITY',
  'BLOCK',
]);

export async function validateDeliveryAddress(
  libs: LoadedGoogleMapsLibraries,
  addressInput: string,
  fallbackLocation?: LatLngPoint | null,
  fallbackPlaceId?: string | null,
): Promise<ValidatedAddressResult> {
  const trimmed = addressInput.trim();
  if (!trimmed) {
    throw new Error('Please enter a Chicago delivery address.');
  }

  try {
    const { AddressValidation } = libs.addressValidation;
    const response = await AddressValidation.fetchAddressValidation({
      address: {
        addressLines: [trimmed],
        regionCode: 'US',
      },
      uspsCASSEnabled: true,
      internalUsageAttributionIds: [GMP_USAGE_ATTRIBUTION_ID],
    });

    const verdict = response.verdict;
    const geocode = response.geocode;
    const address = response.address;
    const metadata = response.metadata;
    const uspsData = response.uspsData;

    const validationGranularity = verdict?.validationGranularity ?? 'OTHER';
    const geocodeGranularity = verdict?.geocodeGranularity ?? 'OTHER';
    const addressComplete = Boolean(verdict?.addressComplete);
    const hasUnconfirmedComponents = Boolean(verdict?.hasUnconfirmedComponents);
    const hasInferredComponents = Boolean(verdict?.hasInferredComponents);
    const hasReplacedComponents = Boolean(verdict?.hasReplacedComponents);

    const loc = geocode?.location;
    const resolvedLocation: LatLngPoint | null = loc
      ? { lat: loc.lat, lng: loc.lng }
      : (fallbackLocation ?? null);

    if (!resolvedLocation) {
      throw new Error('Address Validation did not return deliverable coordinates.');
    }

    const isPoBox = Boolean(metadata?.poBox);
    const granularityOk =
      DELIVERABLE_GRANULARITIES.has(validationGranularity) ||
      DELIVERABLE_GRANULARITIES.has(geocodeGranularity);
    const dpvConfirmation = uspsData?.dpvConfirmation ?? null;
    const dpvOk = dpvConfirmation !== 'N';
    const deliverable = granularityOk && !isPoBox && dpvOk;

    let deliverabilityReason = 'Premise-level address confirmed for courier drop-off.';
    if (isPoBox) {
      deliverabilityReason = 'PO Boxes cannot receive hot kitchen or perishable grocery deliveries.';
    } else if (!granularityOk) {
      deliverabilityReason = `Address granularity (${validationGranularity}) is too coarse. Include a street number.`;
    } else if (!dpvOk) {
      deliverabilityReason = 'USPS DPV could not confirm a physical delivery point at this street number.';
    } else if (hasUnconfirmedComponents) {
      deliverabilityReason = 'Deliverable with minor unconfirmed components — verify apartment/suite if applicable.';
    }

    return {
      source: 'address-validation',
      inputAddress: trimmed,
      formattedAddress: address?.formattedAddress ?? trimmed,
      placeId: geocode?.placeId ?? fallbackPlaceId ?? null,
      plusCode: geocode?.plusCode?.compoundCode ?? geocode?.plusCode?.globalCode ?? null,
      location: resolvedLocation,
      verdict: {
        validationGranularity,
        geocodeGranularity,
        addressComplete,
        hasUnconfirmedComponents,
        hasInferredComponents,
        hasReplacedComponents,
      },
      metadata: metadata
        ? {
            residential: Boolean(metadata.residential),
            business: Boolean(metadata.business),
            poBox: Boolean(metadata.poBox),
          }
        : null,
      uspsData: uspsData
        ? {
            dpvConfirmation: uspsData.dpvConfirmation ?? null,
            dpvVacant: uspsData.dpvVacant ?? null,
            carrierRoute: uspsData.carrierRoute ?? null,
            cassProcessed: Boolean(uspsData.cassProcessed),
            standardizedLine1: uspsData.standardizedAddress?.firstAddressLine ?? null,
            standardizedCityStateZip:
              uspsData.standardizedAddress?.cityStateZipAddressLine ?? null,
          }
        : null,
      deliverable,
      deliverabilityReason,
    };
  } catch (err) {
    // Graceful fallback if Address Validation API is not enabled on a restricted/demo key
    let resolvedLocation = fallbackLocation ?? null;
    let formattedAddress = trimmed;
    let resolvedPlaceId = fallbackPlaceId ?? null;
    let locationType = 'APPROXIMATE';

    if (!resolvedLocation) {
      const { Geocoder } = await importLibrary('geocoding');
      const geocoder = new Geocoder();
      const geoRes = await geocoder.geocode({
        address: trimmed,
        region: 'US',
      });
      const top = geoRes.results[0];
      if (!top?.geometry?.location) {
        throw err instanceof Error ? err : new Error('Unable to resolve address coordinates.');
      }
      resolvedLocation = {
        lat: top.geometry.location.lat(),
        lng: top.geometry.location.lng(),
      };
      formattedAddress = top.formatted_address ?? trimmed;
      resolvedPlaceId = top.place_id ?? null;
      locationType = String(top.geometry.location_type ?? 'ROOFTOP');
    } else {
      locationType = 'ROOFTOP';
    }

    const granularity =
      locationType === 'ROOFTOP' || locationType === 'RANGE_INTERPOLATED'
        ? 'PREMISE'
        : 'ROUTE';

    return {
      source: 'geocoder-fallback',
      inputAddress: trimmed,
      formattedAddress,
      placeId: resolvedPlaceId,
      plusCode: null,
      location: resolvedLocation,
      verdict: {
        validationGranularity: granularity,
        geocodeGranularity: granularity,
        addressComplete: granularity === 'PREMISE',
        hasUnconfirmedComponents: false,
        hasInferredComponents: false,
        hasReplacedComponents: false,
      },
      metadata: null,
      uspsData: null,
      deliverable: granularity === 'PREMISE',
      deliverabilityReason:
        'Verified via Geocoding fallback (enable Address Validation API for full USPS CASS & DPV metadata).',
    };
  }
}

function downsamplePath(points: LatLngPoint[], maxPoints: number): LatLngPoint[] {
  if (points.length <= maxPoints) return points;
  const sampled: LatLngPoint[] = [points[0]];
  const step = (points.length - 1) / (maxPoints - 1);
  for (let i = 1; i < maxPoints - 1; i++) {
    sampled.push(points[Math.round(i * step)]);
  }
  sampled.push(points[points.length - 1]);
  return sampled;
}

export async function computeDeliveryRoute(
  libs: LoadedGoogleMapsLibraries,
  origin: LatLngPoint,
  destination: LatLngPoint,
): Promise<RouteComputationResult> {
  const { Route, RoutingPreference } = libs.routes;
  const { TravelMode } = libs.routes;

  const { routes } = await Route.computeRoutes({
    origin,
    destination,
    travelMode: TravelMode.DRIVING,
    routingPreference: RoutingPreference.TRAFFIC_AWARE,
    fields: [
      'durationMillis',
      'staticDurationMillis',
      'distanceMeters',
      'path',
      'legs',
      'localizedValues',
    ],
    internalUsageAttributionIds: [GMP_USAGE_ATTRIBUTION_ID],
  });

  const primary = routes?.[0];
  if (!primary) {
    throw new Error('Routes API returned no drivable route to this address.');
  }

  const rawPath = primary.path ?? [];
  const pathPoints: LatLngPoint[] = rawPath.map((pt) => ({
    lat: pt.lat,
    lng: pt.lng,
  }));

  if (pathPoints.length < 2) {
    pathPoints.push(origin, destination);
  }

  const staticMapSample = downsamplePath(pathPoints, 85);
  const encodedPolyline = libs.geometry.encoding.encodePath(
    staticMapSample.map((p) => new libs.core.LatLng(p.lat, p.lng)),
  );

  const steps: RouteStepSummary[] = [];
  for (const leg of primary.legs ?? []) {
    for (const step of leg.steps ?? []) {
      steps.push({
        instruction: step.instructions?.trim() || 'Continue along route',
        distanceMeters: step.distanceMeters ?? 0,
        durationSeconds: Math.round((step.staticDurationMillis ?? 0) / 1000),
      });
    }
  }

  const durationSeconds = Math.max(60, Math.round((primary.durationMillis ?? 0) / 1000));
  const staticDurationSeconds = Math.max(
    60,
    Math.round((primary.staticDurationMillis ?? primary.durationMillis ?? 0) / 1000),
  );

  return {
    distanceMeters: primary.distanceMeters ?? 0,
    durationSeconds,
    staticDurationSeconds,
    encodedPolyline,
    pathPoints,
    steps,
  };
}

export function evaluateZoneEligibility(
  libs: LoadedGoogleMapsLibraries,
  destination: LatLngPoint,
  polygon: google.maps.Polygon,
  routeDistanceMeters: number,
): ZoneEligibilityResult {
  const latLng = new libs.core.LatLng(destination.lat, destination.lng);
  const insidePolygon = libs.geometry.poly.containsLocation(latLng, polygon);
  const withinDistanceLimit = routeDistanceMeters <= MAX_DELIVERY_DISTANCE_METERS;
  const tier = calculateDeliveryTier(routeDistanceMeters);
  const isEligible = insidePolygon && withinDistanceLimit && tier.eligibleByDistance;

  let reason = 'Inside Fulton Market Core Zone & within 8.0 km road limit.';
  if (!insidePolygon && !withinDistanceLimit) {
    reason = `Outside Chicago delivery polygon and ${(routeDistanceMeters / 1000).toFixed(2)} km exceeds 8.0 km limit.`;
  } else if (!insidePolygon) {
    reason = 'Drop-off coordinate falls outside the Chicago core delivery polygon.';
  } else if (!withinDistanceLimit) {
    reason = `Road distance (${(routeDistanceMeters / 1000).toFixed(2)} km) exceeds the 8.0 km limit.`;
  }

  return {
    insidePolygon,
    withinDistanceLimit,
    isEligible,
    tierLabel: isEligible ? tier.tierLabel : 'Ineligible for On-Demand Delivery',
    deliveryFee: isEligible ? tier.fee : 0,
    reason,
  };
}

export function buildStaticReceiptMapUrl(
  apiKey: string,
  origin: LatLngPoint,
  destination: LatLngPoint,
  encodedPolyline: string,
): string {
  const params = new URLSearchParams({
    size: '560x240',
    scale: '2',
    maptype: 'roadmap',
    key: apiKey,
  });

  const url =
    `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}` +
    `&markers=${encodeURIComponent(`color:0x0f172a|label:K|${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}`)}` +
    `&markers=${encodeURIComponent(`color:0x059669|label:D|${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}`)}` +
    `&path=${encodeURIComponent(`weight:4|color:0x2563EBFF|enc:${encodedPolyline}`)}`;

  return url;
}
