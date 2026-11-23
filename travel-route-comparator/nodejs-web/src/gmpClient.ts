import {
  decodePolyline,
  downsamplePath,
  encodePolyline,
  enrichElevationSamples,
  type ElevationSample,
} from './polyline.js';

export type SupportedTravelMode = 'DRIVE' | 'BICYCLE' | 'WALK' | 'TRANSIT';

export interface RouteEndpointInput {
  placeId?: string;
  lat?: number;
  lng?: number;
  address?: string;
}

export interface ComputeRoutesInput {
  origin: RouteEndpointInput;
  destination: RouteEndpointInput;
  travelMode: SupportedTravelMode;
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  ecoFriendly?: boolean;
  computeAlternativeRoutes?: boolean;
  emissionType?: 'GASOLINE' | 'HYBRID' | 'ELECTRIC' | 'DIESEL';
}

export class GmpUpstreamError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 502, details?: unknown) {
    super(message);
    this.name = 'GmpUpstreamError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

const DENVER_BOULDER_RECTANGLE = {
  low: { latitude: 39.55, longitude: -105.45 },
  high: { latitude: 40.15, longitude: -104.75 },
};

const PLACES_SEARCH_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location';

const PLACES_AUTOCOMPLETE_FIELD_MASK =
  'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat';

const ROUTES_COMPUTE_FIELD_MASK = [
  'routes.routeLabels',
  'routes.distanceMeters',
  'routes.duration',
  'routes.staticDuration',
  'routes.polyline.encodedPolyline',
  'routes.legs.distanceMeters',
  'routes.legs.duration',
  'routes.travelAdvisory.tollInfo',
  'routes.travelAdvisory.fuelConsumptionMicroliters',
  'routes.warnings',
  'routes.localizedValues',
].join(',');

function toRoutesWaypoint(endpoint: RouteEndpointInput): Record<string, unknown> {
  if (endpoint.placeId) {
    return { placeId: endpoint.placeId };
  }
  if (typeof endpoint.lat === 'number' && typeof endpoint.lng === 'number') {
    return {
      location: {
        latLng: {
          latitude: endpoint.lat,
          longitude: endpoint.lng,
        },
      },
    };
  }
  if (endpoint.address) {
    return { address: endpoint.address };
  }
  throw new GmpUpstreamError('Waypoint must include placeId, lat/lng, or address.', 400);
}

export async function searchPlacesText(
  apiKey: string,
  textQuery: string,
  locationBias?: Record<string, unknown>
): Promise<unknown> {
  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': PLACES_SEARCH_FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery,
      regionCode: 'US',
      languageCode: 'en',
      maxResultCount: 5,
      locationBias: locationBias ?? { rectangle: DENVER_BOULDER_RECTANGLE },
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new GmpUpstreamError(
      `Places API Text Search failed (${response.status})`,
      response.status >= 400 && response.status < 500 ? response.status : 502,
      payload
    );
  }

  return payload;
}

export async function autocompletePlaces(
  apiKey: string,
  input: string,
  sessionToken?: string,
  locationBias?: Record<string, unknown>
): Promise<unknown> {
  const body: Record<string, unknown> = {
    input,
    includedRegionCodes: ['us'],
    languageCode: 'en',
    locationBias: locationBias ?? { rectangle: DENVER_BOULDER_RECTANGLE },
  };
  if (sessionToken) {
    body.sessionToken = sessionToken;
  }

  const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': PLACES_AUTOCOMPLETE_FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new GmpUpstreamError(
      `Places API Autocomplete failed (${response.status})`,
      response.status >= 400 && response.status < 500 ? response.status : 502,
      payload
    );
  }

  return payload;
}

function buildComputeRoutesBody(
  params: ComputeRoutesInput,
  options: { includeAlternatives: boolean; includeEco: boolean }
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    origin: toRoutesWaypoint(params.origin),
    destination: toRoutesWaypoint(params.destination),
    travelMode: params.travelMode,
    polylineQuality: 'HIGH_QUALITY',
    polylineEncoding: 'ENCODED_POLYLINE',
    languageCode: 'en-US',
    units: 'IMPERIAL',
  };

  if (options.includeAlternatives) {
    body.computeAlternativeRoutes = true;
  }

  if (params.travelMode === 'DRIVE') {
    body.routingPreference = options.includeEco ? 'TRAFFIC_AWARE_OPTIMAL' : 'TRAFFIC_AWARE';

    const routeModifiers: Record<string, unknown> = {
      avoidTolls: Boolean(params.avoidTolls),
      avoidHighways: Boolean(params.avoidHighways),
    };

    const extraComputations: string[] = ['TOLLS'];
    if (options.includeEco) {
      routeModifiers.vehicleInfo = {
        emissionType: params.emissionType ?? 'GASOLINE',
      };
      body.requestedReferenceRoutes = ['FUEL_EFFICIENT'];
      extraComputations.push('FUEL_CONSUMPTION');
    }

    body.routeModifiers = routeModifiers;
    body.extraComputations = extraComputations;
  }

  return body;
}

async function callComputeRoutes(
  apiKey: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; status: number; payload: Record<string, unknown> }> {
  const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': ROUTES_COMPUTE_FIELD_MASK,
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: response.ok, status: response.status, payload };
}

export async function computeRoutes(apiKey: string, params: ComputeRoutesInput): Promise<unknown> {
  const wantAlternatives = params.computeAlternativeRoutes !== false;
  const wantEco = params.travelMode === 'DRIVE' && Boolean(params.ecoFriendly);

  const primaryBody = buildComputeRoutesBody(params, {
    includeAlternatives: wantAlternatives,
    includeEco: wantEco,
  });

  let result = await callComputeRoutes(apiKey, primaryBody);

  // Fallback 1: If combining computeAlternativeRoutes + FUEL_EFFICIENT or a specific mode's
  // alternative routing returns 400, retry gracefully with single route / eco fallback.
  if (!result.ok && result.status === 400 && wantAlternatives) {
    const retryBody = buildComputeRoutesBody(params, {
      includeAlternatives: false,
      includeEco: wantEco,
    });
    result = await callComputeRoutes(apiKey, retryBody);
  }

  if (!result.ok && result.status === 400 && wantEco) {
    const retryNoEcoBody = buildComputeRoutesBody(params, {
      includeAlternatives: wantAlternatives,
      includeEco: false,
    });
    result = await callComputeRoutes(apiKey, retryNoEcoBody);
  }

  if (!result.ok) {
    throw new GmpUpstreamError(
      `Routes API computeRoutes failed (${result.status})`,
      result.status >= 400 && result.status < 500 ? result.status : 502,
      result.payload
    );
  }

  return result.payload;
}

export async function fetchElevationProfile(
  apiKey: string,
  encodedPolyline: string,
  samplesCount = 64
): Promise<unknown> {
  const decoded = decodePolyline(encodedPolyline);
  if (decoded.length < 2) {
    throw new GmpUpstreamError('Encoded polyline must contain at least 2 points.', 400);
  }

  const downsampled = downsamplePath(decoded, 200);
  const safeEncodedPath = encodePolyline(downsampled);

  const url = new URL('https://maps.googleapis.com/maps/api/elevation/json');
  url.searchParams.set('path', `enc:${safeEncodedPath}`);
  url.searchParams.set('samples', String(samplesCount));
  url.searchParams.set('key', apiKey);

  const response = await fetch(url.toString(), { method: 'GET' });
  const payload = (await response.json().catch(() => ({}))) as {
    status?: string;
    error_message?: string;
    results?: ElevationSample[];
  };

  if (!response.ok || payload.status !== 'OK' || !Array.isArray(payload.results)) {
    throw new GmpUpstreamError(
      payload.error_message || `Elevation API failed (${payload.status || response.status})`,
      response.ok ? 400 : 502,
      payload
    );
  }

  const enriched = enrichElevationSamples(payload.results);
  return {
    status: payload.status,
    results: enriched.samples,
    metrics: enriched.metrics,
  };
}
