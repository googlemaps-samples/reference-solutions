import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import type {
  ComputedRouteOption,
  ElevationStats,
  PlaceEndpoint,
  RoutePreferences,
  TravelModeKey,
} from '../types/routing';
import {
  computeElevationStats,
  downsamplePath,
  formatDistanceMeters,
  formatDurationMillis,
  formatFuelMicroliters,
  formatMoney,
  toLatLngLiteral,
} from '../utils/formatters';

export const ATTRIBUTION_IDS = ['gmp_git_agentsamples_v1.0.0'] as const;
export const DEMO_MAP_ID = 'DEMO_MAP_ID';
export const DENVER_BOULDER_CENTER: google.maps.LatLngLiteral = {
  lat: 39.884,
  lng: -105.135,
};

export const SEED_ORIGIN_QUERY = 'Denver Union Station, Denver, CO';
export const SEED_DESTINATION_QUERY = 'Chautauqua Park, Boulder, CO';

export const ROUTE_PALETTE = [
  '#0f766e', // Primary teal
  '#2563eb', // Cobalt blue alternative
  '#d97706', // Amber alternative
  '#059669', // Eco emerald
];

export interface LoadedMapsLibraries {
  core: google.maps.CoreLibrary;
  maps: google.maps.MapsLibrary;
  marker: google.maps.MarkerLibrary;
  places: google.maps.PlacesLibrary;
  routes: google.maps.RoutesLibrary;
  elevation: google.maps.ElevationLibrary;
}

let loaderInitialized = false;
let librariesPromise: Promise<LoadedMapsLibraries> | null = null;

export function getApiKey(): string {
  return (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
}

export function isApiKeyConfigured(): boolean {
  const key = getApiKey();
  return Boolean(key && key !== 'your_google_maps_api_key_here');
}

export async function loadGoogleMapsLibraries(): Promise<LoadedMapsLibraries> {
  if (librariesPromise) {
    return librariesPromise;
  }

  const key = getApiKey();
  if (!isApiKeyConfigured()) {
    throw new Error(
      'Missing VITE_GOOGLE_MAPS_API_KEY. Copy .env.example to .env.local and add a valid Google Maps Platform API key or Maps Demo Key.',
    );
  }

  if (!loaderInitialized) {
    setOptions({
      key,
      v: 'weekly',
      language: 'en-US',
      region: 'US',
    });
    loaderInitialized = true;
  }

  librariesPromise = Promise.all([
    importLibrary('core'),
    importLibrary('maps'),
    importLibrary('marker'),
    importLibrary('places'),
    importLibrary('routes'),
    importLibrary('elevation'),
  ]).then(([core, maps, marker, places, routes, elevation]) => ({
    core,
    maps,
    marker,
    places,
    routes,
    elevation,
  }));

  return librariesPromise;
}

export async function searchSeedPlace(
  placesLib: google.maps.PlacesLibrary,
  textQuery: string,
): Promise<PlaceEndpoint> {
  const { Place } = placesLib;
  const { places } = await Place.searchByText({
    textQuery,
    fields: ['id', 'displayName', 'formattedAddress', 'location'],
    locationBias: {
      center: DENVER_BOULDER_CENTER,
      radius: 50000,
    },
    language: 'en-US',
    region: 'us',
    maxResultCount: 1,
  });

  const place = places?.[0];
  if (!place || !place.location) {
    throw new Error(`Could not resolve place "${textQuery}" via Places API (New).`);
  }

  return {
    id: place.id ?? textQuery,
    displayName: place.displayName ?? textQuery,
    formattedAddress: place.formattedAddress ?? '',
    location: toLatLngLiteral(place.location),
  };
}

function buildRouteLabel(
  route: google.maps.routes.Route,
  index: number,
  mode: TravelModeKey,
): { label: string; isFuelEfficient: boolean; isDefaultRoute: boolean } {
  const labels = route.routeLabels ?? [];
  const isFuelEfficient = labels.includes('FUEL_EFFICIENT' as google.maps.routes.RouteLabel);
  const isDefaultRoute = labels.includes('DEFAULT_ROUTE' as google.maps.routes.RouteLabel);

  if (isFuelEfficient && !isDefaultRoute) {
    return { label: 'Eco-Friendly Route', isFuelEfficient: true, isDefaultRoute: false };
  }
  if (isFuelEfficient && isDefaultRoute) {
    return {
      label: mode === 'DRIVING' ? 'Fastest & Eco Route' : 'Recommended Route',
      isFuelEfficient: true,
      isDefaultRoute: true,
    };
  }
  if (isDefaultRoute || index === 0) {
    const modePrefix: Record<TravelModeKey, string> = {
      DRIVING: 'Recommended Drive',
      BICYCLING: 'Primary Bike Route',
      WALKING: 'Primary Trail Walk',
      TRANSIT: 'Recommended Transit',
    };
    return { label: modePrefix[mode], isFuelEfficient: false, isDefaultRoute: true };
  }
  return {
    label: `Alternative Route ${index}`,
    isFuelEfficient: false,
    isDefaultRoute: false,
  };
}

export async function computeRoutesForMode(
  routesLib: google.maps.RoutesLibrary,
  origin: PlaceEndpoint,
  destination: PlaceEndpoint,
  mode: TravelModeKey,
  prefs: RoutePreferences,
): Promise<ComputedRouteOption[]> {
  const { Route } = routesLib;

  const baseFields = [
    'path',
    'distanceMeters',
    'durationMillis',
    'staticDurationMillis',
    'routeLabels',
    'travelAdvisory',
    'localizedValues',
    'warnings',
  ];

  const request: google.maps.routes.ComputeRoutesRequest = {
    origin: origin.location,
    destination: destination.location,
    travelMode: mode,
    fields: baseFields,
    computeAlternativeRoutes: true,
    language: 'en-US',
    region: 'us',
    internalUsageAttributionIds: [...ATTRIBUTION_IDS],
  };

  if (mode === 'DRIVING') {
    const wantsEco = prefs.ecoFriendly;
    // Routes API requires TRAFFIC_AWARE_OPTIMAL whenever FUEL_CONSUMPTION or FUEL_EFFICIENT is requested.
    request.routingPreference = wantsEco ? 'TRAFFIC_AWARE_OPTIMAL' : 'TRAFFIC_AWARE';
    request.routeModifiers = {
      avoidTolls: prefs.avoidTolls,
      avoidHighways: prefs.avoidHighways,
      ...(wantsEco ? { vehicleInfo: { emissionType: 'GASOLINE' } } : {}),
    };
    request.extraComputations = wantsEco ? ['TOLLS', 'FUEL_CONSUMPTION'] : ['TOLLS'];
    if (wantsEco) {
      request.requestedReferenceRoutes = ['FUEL_EFFICIENT'];
    }
  }

  let response: { routes?: google.maps.routes.Route[] };
  try {
    response = await Route.computeRoutes(request);
  } catch (err) {
    // Fallback to standard TRAFFIC_AWARE + TOLLS if eco-friendly or fuel computation is rejected
    if (mode === 'DRIVING' && request.requestedReferenceRoutes) {
      const fallbackReq: google.maps.routes.ComputeRoutesRequest = {
        ...request,
        routingPreference: 'TRAFFIC_AWARE',
        extraComputations: ['TOLLS'],
        requestedReferenceRoutes: undefined,
        routeModifiers: {
          avoidTolls: prefs.avoidTolls,
          avoidHighways: prefs.avoidHighways,
        },
      };
      response = await Route.computeRoutes(fallbackReq);
    } else {
      throw err;
    }
  }

  const routes = response.routes ?? [];
  return routes.map((route, index) => {
    const { label, isFuelEfficient, isDefaultRoute } = buildRouteLabel(
      route,
      index,
      mode,
    );

    const path = (route.path ?? []).map((pt) => toLatLngLiteral(pt));
    const durationMillis =
      route.durationMillis ?? route.staticDurationMillis ?? 0;
    const distanceMeters = route.distanceMeters ?? 0;

    const durationText =
      route.localizedValues?.duration ||
      route.localizedValues?.staticDuration ||
      formatDurationMillis(durationMillis);
    const distanceText =
      route.localizedValues?.distance || formatDistanceMeters(distanceMeters);

    const tollPrices = route.travelAdvisory?.tollInfo?.estimatedPrices ?? [];
    const tollText =
      tollPrices.length > 0
        ? tollPrices
            .map((p) => formatMoney(p))
            .filter((x): x is string => Boolean(x))
            .join(' – ') || 'Toll road'
        : null;

    const fuelText = formatFuelMicroliters(
      route.travelAdvisory?.fuelConsumptionMicroliters,
    );
    const transitFareText = formatMoney(route.travelAdvisory?.transitFare);

    const color =
      isFuelEfficient && !isDefaultRoute
        ? '#059669'
        : ROUTE_PALETTE[index % ROUTE_PALETTE.length];

    return {
      id: `${mode}-${index}`,
      index,
      mode,
      label,
      color,
      durationMillis,
      durationText,
      distanceMeters,
      distanceText,
      isFuelEfficient,
      isDefaultRoute,
      tollText,
      fuelText,
      transitFareText,
      warnings: route.warnings ?? [],
      path,
      viewport: route.viewport ?? null,
      rawRoute: route,
    };
  });
}

export async function fetchRouteElevationProfile(
  elevationLib: google.maps.ElevationLibrary,
  path: google.maps.LatLngLiteral[],
  totalDistanceMeters: number,
  samplesCount = 64,
): Promise<ElevationStats> {
  if (path.length < 2) {
    return computeElevationStats([], totalDistanceMeters);
  }
  const { ElevationService } = elevationLib;
  const service = new ElevationService();
  const compactPath = downsamplePath(path, 160);
  const response = await service.getElevationAlongPath({
    path: compactPath,
    samples: samplesCount,
  });

  return computeElevationStats(response.results ?? [], totalDistanceMeters);
}
