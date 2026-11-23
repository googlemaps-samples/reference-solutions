import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { AUSTIN_CENTER } from '../data/austinSeedData';
import type { AuditStop, LatLngPoint, RouteSummary } from '../types/workforce';

export interface LoadedGmpLibraries {
  Map: typeof google.maps.Map;
  Polygon: typeof google.maps.Polygon;
  InfoWindow: typeof google.maps.InfoWindow;
  AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement;
  PinElement: typeof google.maps.marker.PinElement;
  Place: typeof google.maps.places.Place;
  Route: typeof google.maps.routes.Route;
  Geocoder: typeof google.maps.Geocoder;
  poly: typeof google.maps.geometry.poly;
  LatLngBounds: typeof google.maps.LatLngBounds;
}

let loaderConfigured = false;
let cachedLibraries: LoadedGmpLibraries | null = null;

export async function loadGoogleMapsLibraries(apiKey: string): Promise<LoadedGmpLibraries> {
  if (cachedLibraries) {
    return cachedLibraries;
  }

  if (!loaderConfigured) {
    setOptions({
      key: apiKey,
      v: 'weekly',
      language: 'en-US',
      region: 'US',
    });
    loaderConfigured = true;
  }

  const [mapsLib, markerLib, placesLib, routesLib, geocodingLib, geometryLib, coreLib] =
    await Promise.all([
      importLibrary('maps'),
      importLibrary('marker'),
      importLibrary('places'),
      importLibrary('routes'),
      importLibrary('geocoding'),
      importLibrary('geometry'),
      importLibrary('core'),
    ]);

  cachedLibraries = {
    Map: mapsLib.Map,
    Polygon: mapsLib.Polygon,
    InfoWindow: mapsLib.InfoWindow,
    AdvancedMarkerElement: markerLib.AdvancedMarkerElement,
    PinElement: markerLib.PinElement,
    Place: placesLib.Place,
    Route: routesLib.Route,
    Geocoder: geocodingLib.Geocoder,
    poly: geometryLib.poly,
    LatLngBounds: coreLib.LatLngBounds,
  };

  return cachedLibraries;
}

export async function reverseGeocodeCoordinates(
  GeocoderCtor: typeof google.maps.Geocoder,
  coords: LatLngPoint
): Promise<string> {
  const geocoder = new GeocoderCtor();
  const response = await geocoder.geocode({
    location: coords,
  });

  if (response.results && response.results.length > 0) {
    return response.results[0].formatted_address;
  }

  return `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)} (Austin, TX)`;
}

export async function searchAuditSites(
  PlaceCtor: typeof google.maps.places.Place,
  query: string
): Promise<AuditStop[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const { places } = await PlaceCtor.searchByText({
    textQuery: trimmed,
    fields: ['id', 'displayName', 'formattedAddress', 'location', 'primaryTypeDisplayName'],
    locationBias: AUSTIN_CENTER,
    maxResultCount: 5,
    language: 'en-US',
    region: 'US',
    internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
  });

  const stops: AuditStop[] = [];
  for (const place of places) {
    if (!place.location) {
      continue;
    }
    stops.push({
      id: place.id,
      displayName: place.displayName ?? 'Austin Audit Site',
      formattedAddress: place.formattedAddress ?? 'Austin, TX',
      primaryType: place.primaryTypeDisplayName ?? undefined,
      location: {
        lat: place.location.lat(),
        lng: place.location.lng(),
      },
    });
  }

  return stops;
}

export interface OptimizedRouteResult {
  route: google.maps.routes.Route;
  orderedStops: AuditStop[];
  summary: RouteSummary;
}

export async function computeOptimizedAuditRoute(
  RouteCtor: typeof google.maps.routes.Route,
  stops: AuditStop[]
): Promise<OptimizedRouteResult | null> {
  if (stops.length < 2) {
    return null;
  }

  const originStop = stops[0];
  const destinationStop = stops[stops.length - 1];
  const intermediateStops = stops.slice(1, -1);

  const request: google.maps.routes.ComputeRoutesRequest = {
    origin: originStop.location,
    destination: destinationStop.location,
    intermediates: intermediateStops.map((stop) => ({
      location: stop.location,
    })),
    travelMode: 'DRIVING',
    routingPreference: 'TRAFFIC_AWARE',
    optimizeWaypointOrder: intermediateStops.length > 0,
    internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
    fields: [
      'path',
      'distanceMeters',
      'durationMillis',
      'legs',
      'optimizedIntermediateWaypointIndices',
    ],
  };

  const { routes } = await RouteCtor.computeRoutes(request);
  if (!routes || routes.length === 0) {
    return null;
  }

  const primaryRoute = routes[0];
  const optimizedIndices = primaryRoute.optimizedIntermediateWaypointIndices ?? [];

  let orderedIntermediates = intermediateStops;
  if (
    intermediateStops.length > 0 &&
    optimizedIndices.length === intermediateStops.length
  ) {
    orderedIntermediates = optimizedIndices
      .map((index) => intermediateStops[index])
      .filter((item): item is AuditStop => Boolean(item));
  }

  const combinedOrder = [originStop, ...orderedIntermediates, destinationStop];
  const legs = primaryRoute.legs ?? [];

  const orderedStops: AuditStop[] = combinedOrder.map((stop, idx) => {
    const incomingLeg = idx > 0 ? legs[idx - 1] : undefined;
    return {
      ...stop,
      legDistanceMeters: incomingLeg?.distanceMeters,
      legDurationMillis: incomingLeg?.durationMillis ?? undefined,
    };
  });

  const summary: RouteSummary = {
    totalDistanceMeters: primaryRoute.distanceMeters ?? 0,
    totalDurationMillis: primaryRoute.durationMillis ?? 0,
    stopCount: orderedStops.length,
    optimizedIndices,
  };

  return {
    route: primaryRoute,
    orderedStops,
    summary,
  };
}
