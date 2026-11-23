import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import type {
  ActiveRouteSummary,
  LatLngLiteral,
  ProviderOption,
  ProviderType,
  RouteStepInfo,
} from '../types/dispatch';
import {
  extractEvSummary,
  formatDistance,
  formatDuration,
  formatManeuverLabel,
  getOpeningStatus,
  haversineDistanceMeters,
} from '../utils/dispatchHelpers';

export const ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';

export interface LoadedGoogleMapsLibraries {
  core: google.maps.CoreLibrary;
  maps: google.maps.MapsLibrary;
  marker: google.maps.MarkerLibrary;
  places: google.maps.PlacesLibrary;
  routes: google.maps.RoutesLibrary;
  geocoding: google.maps.GeocodingLibrary;
}

let loaderPromise: Promise<LoadedGoogleMapsLibraries> | null = null;
let configuredKey: string | null = null;

export function initGoogleMaps(apiKey: string): Promise<LoadedGoogleMapsLibraries> {
  if (loaderPromise && configuredKey === apiKey) {
    return loaderPromise;
  }

  configuredKey = apiKey;
  setOptions({
    key: apiKey,
    v: 'weekly',
    language: 'en',
    region: 'US',
  });

  loaderPromise = Promise.all([
    importLibrary('core'),
    importLibrary('maps'),
    importLibrary('marker'),
    importLibrary('places'),
    importLibrary('routes'),
    importLibrary('geocoding'),
  ]).then(([core, maps, marker, places, routes, geocoding]) => ({
    core,
    maps,
    marker,
    places,
    routes,
    geocoding,
  }));

  return loaderPromise;
}

export async function reverseGeocodeLocation(
  geocodingLib: google.maps.GeocodingLibrary,
  location: LatLngLiteral,
): Promise<string> {
  const geocoder = new geocodingLib.Geocoder();
  try {
    const response = await geocoder.geocode({ location });
    const first = response.results?.[0];
    if (first?.formatted_address) {
      return first.formatted_address;
    }
  } catch {
    // Graceful fallback to coordinates if geocoding fails or quota is exceeded
  }
  return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
}

function mapPlaceToProvider(
  place: google.maps.places.Place,
  category: ProviderType,
  origin: LatLngLiteral,
): ProviderOption | null {
  const loc = place.location;
  if (!loc) return null;

  const latLng: LatLngLiteral = {
    lat: loc.lat(),
    lng: loc.lng(),
  };

  return {
    id: place.id,
    name: place.displayName || (category === 'ev' ? 'EV Charging Station' : 'Auto Repair Shop'),
    category,
    address: place.formattedAddress || 'Seattle, WA',
    location: latLng,
    rating: typeof place.rating === 'number' ? place.rating : null,
    userRatingCount:
      typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
    phoneNumber: place.nationalPhoneNumber ?? null,
    googleMapsUri: place.googleMapsURI ?? null,
    businessStatus: place.businessStatus ?? null,
    openingStatus: getOpeningStatus(
      place.regularOpeningHours,
      place.utcOffsetMinutes,
      place.businessStatus,
    ),
    evSummary: category === 'ev' ? extractEvSummary(place.evChargeOptions) : null,
    durationMillis: null,
    distanceMeters: null,
    etaText: null,
    distanceText: null,
    straightLineMeters: haversineDistanceMeters(origin, latLng),
  };
}

export async function searchNearbyProviders(
  placesLib: google.maps.PlacesLibrary,
  center: LatLngLiteral,
  radiusMeters: number,
): Promise<ProviderOption[]> {
  const { Place, SearchNearbyRankPreference } = placesLib;

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
    'utcOffsetMinutes',
  ];

  const evFields = [...baseFields, 'evChargeOptions'];

  const [evResult, repairResult] = await Promise.allSettled([
    Place.searchNearby({
      fields: evFields,
      locationRestriction: { center, radius: radiusMeters },
      includedPrimaryTypes: ['electric_vehicle_charging_station'],
      maxResultCount: 12,
      rankPreference: SearchNearbyRankPreference.DISTANCE,
      internalUsageAttributionIds: [ATTRIBUTION_ID],
    }),
    Place.searchNearby({
      fields: baseFields,
      locationRestriction: { center, radius: radiusMeters },
      includedPrimaryTypes: ['car_repair'],
      maxResultCount: 12,
      rankPreference: SearchNearbyRankPreference.DISTANCE,
      internalUsageAttributionIds: [ATTRIBUTION_ID],
    }),
  ]);

  const byId = new Map<string, ProviderOption>();

  if (evResult.status === 'fulfilled') {
    for (const place of evResult.value.places ?? []) {
      const mapped = mapPlaceToProvider(place, 'ev', center);
      if (mapped) {
        byId.set(mapped.id, mapped);
      }
    }
  }

  if (repairResult.status === 'fulfilled') {
    for (const place of repairResult.value.places ?? []) {
      if (!byId.has(place.id)) {
        const mapped = mapPlaceToProvider(place, 'repair', center);
        if (mapped) {
          byId.set(mapped.id, mapped);
        }
      }
    }
  }

  // Fallback to Text Search if Nearby returned nothing (e.g., edge locations)
  if (byId.size === 0) {
    const [evText, repairText] = await Promise.allSettled([
      Place.searchByText({
        textQuery: 'EV fast charging station',
        fields: evFields,
        locationBias: { center, radius: radiusMeters },
        maxResultCount: 8,
        internalUsageAttributionIds: [ATTRIBUTION_ID],
      }),
      Place.searchByText({
        textQuery: 'auto repair mechanic roadside assistance',
        fields: baseFields,
        locationBias: { center, radius: radiusMeters },
        maxResultCount: 8,
        internalUsageAttributionIds: [ATTRIBUTION_ID],
      }),
    ]);

    if (evText.status === 'fulfilled') {
      for (const place of evText.value.places ?? []) {
        const mapped = mapPlaceToProvider(place, 'ev', center);
        if (mapped) byId.set(mapped.id, mapped);
      }
    }
    if (repairText.status === 'fulfilled') {
      for (const place of repairText.value.places ?? []) {
        if (!byId.has(place.id)) {
          const mapped = mapPlaceToProvider(place, 'repair', center);
          if (mapped) byId.set(mapped.id, mapped);
        }
      }
    }
  }

  return Array.from(byId.values()).sort(
    (a, b) => a.straightLineMeters - b.straightLineMeters,
  );
}

export async function rankProvidersWithRouteMatrix(
  routesLib: google.maps.RoutesLibrary,
  origin: LatLngLiteral,
  providers: ProviderOption[],
): Promise<ProviderOption[]> {
  if (providers.length === 0) return [];

  const { RouteMatrix, RoutingPreference, TravelMode } = routesLib;
  const targets = providers.slice(0, 24);

  const runMatrix = async (
    routingPreference: google.maps.routes.RoutingPreference,
  ) => {
    return RouteMatrix.computeRouteMatrix({
      origins: [origin],
      destinations: targets.map((p) => p.location),
      travelMode: TravelMode.DRIVING,
      routingPreference,
      fields: ['condition', 'distanceMeters', 'durationMillis', 'localizedValues'],
      internalUsageAttributionIds: [ATTRIBUTION_ID],
    });
  };

  let matrixResponse: { matrix: google.maps.routes.RouteMatrix } | null = null;
  try {
    matrixResponse = await runMatrix(RoutingPreference.TRAFFIC_AWARE);
  } catch {
    try {
      matrixResponse = await runMatrix(RoutingPreference.TRAFFIC_UNAWARE);
    } catch {
      matrixResponse = null;
    }
  }

  const items = matrixResponse?.matrix?.rows?.[0]?.items ?? [];

  const enriched = targets.map((provider, idx) => {
    const item = items[idx];
    if (item && item.condition === 'ROUTE_EXISTS') {
      const durationMillis =
        typeof item.durationMillis === 'number' && Number.isFinite(item.durationMillis)
          ? item.durationMillis
          : null;
      const distanceMeters =
        typeof item.distanceMeters === 'number' ? item.distanceMeters : null;
      return {
        ...provider,
        durationMillis,
        distanceMeters,
        etaText: item.localizedValues?.duration || formatDuration(durationMillis),
        distanceText: item.localizedValues?.distance || formatDistance(distanceMeters),
      };
    }

    return {
      ...provider,
      etaText: null,
      distanceText: formatDistance(provider.straightLineMeters),
    };
  });

  return enriched.sort((a, b) => {
    const aEta = a.durationMillis ?? Number.MAX_SAFE_INTEGER;
    const bEta = b.durationMillis ?? Number.MAX_SAFE_INTEGER;
    if (aEta !== bEta) return aEta - bEta;
    return a.straightLineMeters - b.straightLineMeters;
  });
}

export async function computeDispatchRoute(
  routesLib: google.maps.RoutesLibrary,
  origin: LatLngLiteral,
  originAddress: string,
  provider: ProviderOption,
): Promise<{ route: google.maps.routes.Route; summary: ActiveRouteSummary }> {
  const { Route, RoutingPreference, TravelMode } = routesLib;

  const callCompute = (routingPreference: google.maps.routes.RoutingPreference) =>
    Route.computeRoutes({
      origin,
      destination: provider.location,
      travelMode: TravelMode.DRIVING,
      routingPreference,
      fields: [
        'path',
        'legs',
        'distanceMeters',
        'durationMillis',
        'localizedValues',
        'viewport',
      ],
      internalUsageAttributionIds: [ATTRIBUTION_ID],
    });

  let response: Awaited<ReturnType<typeof Route.computeRoutes>>;
  try {
    response = await callCompute(RoutingPreference.TRAFFIC_AWARE);
  } catch {
    response = await callCompute(RoutingPreference.TRAFFIC_UNAWARE);
  }

  const route = response.routes?.[0];
  if (!route) {
    throw new Error('No drivable route found between your location and this provider.');
  }

  const leg = route.legs?.[0];
  const rawSteps = leg?.steps ?? [];

  const steps: RouteStepInfo[] = rawSteps.map((step, idx) => ({
    index: idx + 1,
    instruction:
      step.instructions?.trim() ||
      formatManeuverLabel(step.maneuver) ||
      'Continue straight',
    maneuver: step.maneuver ?? null,
    distanceText:
      step.localizedValues?.distance || formatDistance(step.distanceMeters),
    durationText:
      step.localizedValues?.staticDuration ||
      formatDuration(step.staticDurationMillis),
  }));

  const durationMillis =
    typeof route.durationMillis === 'number' && Number.isFinite(route.durationMillis)
      ? route.durationMillis
      : provider.durationMillis;

  const distanceMeters =
    typeof route.distanceMeters === 'number'
      ? route.distanceMeters
      : provider.distanceMeters;

  const summary: ActiveRouteSummary = {
    provider,
    originAddress,
    durationText:
      route.localizedValues?.duration ||
      leg?.localizedValues?.duration ||
      formatDuration(durationMillis),
    distanceText:
      route.localizedValues?.distance ||
      leg?.localizedValues?.distance ||
      formatDistance(distanceMeters),
    durationMillis,
    distanceMeters,
    steps,
  };

  return { route, summary };
}
