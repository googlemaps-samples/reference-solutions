import { CHICAGO_DELIVERY_ZONE_POLYGON } from '../constants/chicago';
import type {
  AddressValidationSummary,
  DeliveryRouteSummary,
  LatLngPoint,
} from '../types/delivery';
import { formatEtaMinutes } from '../utils/pricing';

const DELIVERABLE_GRANULARITIES = new Set([
  'PREMISE',
  'SUB_PREMISE',
  'PREMISE_PROXIMITY',
]);

interface AddressValidationRestResult {
  verdict?: {
    inputGranularity?: string;
    validationGranularity?: string;
    geocodeGranularity?: string;
    addressComplete?: boolean;
    hasUnconfirmedComponents?: boolean;
    hasInferredComponents?: boolean;
    hasReplacedComponents?: boolean;
  };
  address?: {
    formattedAddress?: string;
  };
  geocode?: {
    location?: {
      latitude?: number;
      longitude?: number;
    };
    placeId?: string;
  };
  metadata?: {
    business?: boolean;
    residential?: boolean;
    poBox?: boolean;
  };
  uspsData?: {
    dpvConfirmation?: string;
    carrierRoute?: string;
    standardizedAddress?: {
      firstAddressLine?: string;
      cityStateZipAddressLine?: string;
    };
  };
}

export async function validateAddressWithGmp(
  addressLine: string,
  _autocompleteEl?: google.maps.places.PlaceAutocompleteElement | null
): Promise<AddressValidationSummary> {
  const trimmed = addressLine.trim();
  if (!trimmed) {
    throw new Error('Please enter a Chicago delivery address to validate.');
  }

  let proxyFailureReason: string | null = null;

  try {
    const res = await fetch('/api/address/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        addressLines: [trimmed],
        regionCode: 'US',
        enableUspsCass: true,
      }),
    });

    if (res.ok) {
      const payload = (await res.json()) as {
        ok?: boolean;
        result?: AddressValidationRestResult | null;
        reason?: string;
      };

      const result = payload.result;
      const lat = result?.geocode?.location?.latitude;
      const lng = result?.geocode?.location?.longitude;

      if (payload.ok && result && typeof lat === 'number' && typeof lng === 'number') {
        const validationGranularity =
          result.verdict?.validationGranularity ?? 'OTHER';
        const geocodeGranularity =
          result.verdict?.geocodeGranularity ?? 'OTHER';
        const addressComplete = Boolean(result.verdict?.addressComplete);
        const hasUnconfirmedComponents = Boolean(
          result.verdict?.hasUnconfirmedComponents
        );
        const hasInferredComponents = Boolean(
          result.verdict?.hasInferredComponents
        );
        const hasReplacedComponents = Boolean(
          result.verdict?.hasReplacedComponents
        );

        const isDeliverableGranularity =
          DELIVERABLE_GRANULARITIES.has(validationGranularity) ||
          (addressComplete && DELIVERABLE_GRANULARITIES.has(geocodeGranularity));

        return {
          inputAddress: trimmed,
          formattedAddress: result.address?.formattedAddress ?? trimmed,
          placeId: result.geocode?.placeId ?? null,
          location: { lat, lng },
          verdict: {
            inputGranularity: result.verdict?.inputGranularity ?? undefined,
            validationGranularity,
            geocodeGranularity,
            addressComplete,
            hasUnconfirmedComponents,
            hasInferredComponents,
            hasReplacedComponents,
          },
          metadata: {
            business: result.metadata?.business ?? undefined,
            residential: result.metadata?.residential ?? undefined,
            poBox: result.metadata?.poBox ?? undefined,
          },
          uspsData: {
            dpvConfirmation: result.uspsData?.dpvConfirmation ?? undefined,
            carrierRoute: result.uspsData?.carrierRoute ?? undefined,
            standardizedAddressLine:
              result.uspsData?.standardizedAddress?.firstAddressLine ??
              undefined,
            cityStateZipLine:
              result.uspsData?.standardizedAddress?.cityStateZipAddressLine ??
              undefined,
          },
          isDeliverableGranularity,
          source: 'address-validation-api',
        };
      }

      proxyFailureReason = payload.reason ?? null;
    }
  } catch (err) {
    proxyFailureReason =
      err instanceof Error ? err.message : 'Address Validation proxy unavailable.';
  }

  // Graceful fallback to Geocoding Library if Address Validation API is not enabled on the key
  const { Geocoder } = (await google.maps.importLibrary(
    'geocoding'
  )) as google.maps.GeocodingLibrary;
  const geocoder = new Geocoder();
  const response = await geocoder.geocode({
    address: trimmed,
    region: 'US',
  });

  const first = response.results?.[0];
  if (!first?.geometry?.location) {
    throw new Error(
      proxyFailureReason || 'Unable to validate or geocode the supplied address.'
    );
  }

  const loc = first.geometry.location;
  const locationType = String(first.geometry.location_type ?? 'APPROXIMATE');
  const components = first.address_components ?? [];
  const hasStreetNumber = components.some((component) =>
    component.types.includes('street_number')
  );
  const hasRoute = components.some((component) =>
    component.types.includes('route')
  );
  const isPrecise =
    locationType === 'ROOFTOP' ||
    locationType === 'RANGE_INTERPOLATED' ||
    (locationType === 'GEOMETRIC_CENTER' && hasStreetNumber && hasRoute);

  return {
    inputAddress: trimmed,
    formattedAddress: first.formatted_address ?? trimmed,
    placeId: first.place_id ?? null,
    location: { lat: loc.lat(), lng: loc.lng() },
    verdict: {
      inputGranularity: isPrecise ? 'PREMISE' : 'ROUTE',
      validationGranularity: isPrecise ? 'PREMISE' : 'ROUTE',
      geocodeGranularity: locationType,
      addressComplete: isPrecise,
      hasUnconfirmedComponents: !isPrecise,
      hasInferredComponents: false,
      hasReplacedComponents: false,
    },
    metadata: {},
    uspsData: {},
    isDeliverableGranularity: isPrecise,
    source: 'places-geocoding-fallback',
    note: 'Address Validation API unavailable for this key; verified coordinates via Geocoding API.',
  };
}

export async function checkPointInDeliveryZone(
  point: LatLngPoint,
  polygonCoords: LatLngPoint[] = CHICAGO_DELIVERY_ZONE_POLYGON
): Promise<boolean> {
  const [{ poly }, { Polygon }] = await Promise.all([
    google.maps.importLibrary('geometry') as Promise<google.maps.GeometryLibrary>,
    google.maps.importLibrary('maps') as Promise<google.maps.MapsLibrary>,
  ]);

  const zonePolygon = new Polygon({ paths: polygonCoords });
  return poly.containsLocation(point, zonePolygon);
}

export async function computeDeliveryRoute(
  origin: LatLngPoint,
  destination: LatLngPoint
): Promise<DeliveryRouteSummary> {
  const [{ Route }, { encoding }] = await Promise.all([
    google.maps.importLibrary('routes') as Promise<google.maps.RoutesLibrary>,
    google.maps.importLibrary('geometry') as Promise<google.maps.GeometryLibrary>,
  ]);

  const { routes } = await Route.computeRoutes({
    origin,
    destination,
    travelMode: 'DRIVING',
    routingPreference: 'TRAFFIC_AWARE',
    fields: [
      'durationMillis',
      'staticDurationMillis',
      'distanceMeters',
      'path',
      'legs',
      'localizedValues',
    ],
    internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
  });

  const primary = routes?.[0];
  if (!primary) {
    throw new Error('Routes API returned no driving route for these coordinates.');
  }

  const pathPoints: LatLngPoint[] = (primary.path ?? []).map((pt) => ({
    lat: pt.lat,
    lng: pt.lng,
  }));

  const finalPath =
    pathPoints.length >= 2 ? pathPoints : [origin, destination];

  const encodedPolyline = encoding.encodePath(finalPath);
  const distanceMeters = primary.distanceMeters ?? 0;
  const durationSeconds = Math.round((primary.durationMillis ?? 0) / 1000);
  const staticDurationSeconds = Math.round(
    (primary.staticDurationMillis ?? primary.durationMillis ?? 0) / 1000
  );

  const steps =
    primary.legs?.[0]?.steps?.map((step) => ({
      instruction: step.instructions || 'Continue along route',
      distanceMeters: step.distanceMeters ?? 0,
      durationText:
        step.localizedValues?.staticDuration ??
        formatEtaMinutes(Math.round((step.staticDurationMillis ?? 0) / 1000)),
    })) ?? [];

  return {
    distanceMeters,
    durationSeconds,
    staticDurationSeconds,
    encodedPolyline,
    path: finalPath,
    steps,
  };
}
