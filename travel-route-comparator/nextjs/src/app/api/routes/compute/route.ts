import { NextRequest, NextResponse } from 'next/server';
import {
  ROUTE_PALETTE,
  formatDistanceImperial,
  formatDuration,
  getServerMapsApiKey,
  parseDurationSeconds,
} from '@/lib/gmp-server';
import type { ComputedRoute, LatLngLiteral, TravelMode } from '@/types/travel';

const ROUTES_COMPUTE_URL =
  'https://routes.googleapis.com/directions/v2:computeRoutes';
const FIELD_MASK = [
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

interface ComputeRoutesRequestBody {
  origin?: LatLngLiteral;
  destination?: LatLngLiteral;
  travelMode?: TravelMode;
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  ecoFriendly?: boolean;
}

interface UpstreamMoney {
  currencyCode?: string;
  units?: string;
  nanos?: number;
}

interface UpstreamRoute {
  routeLabels?: string[];
  distanceMeters?: number;
  duration?: string;
  staticDuration?: string;
  polyline?: { encodedPolyline?: string };
  travelAdvisory?: {
    tollInfo?: { estimatedPrice?: UpstreamMoney[] };
    fuelConsumptionMicroliters?: string | number;
  };
  warnings?: string[];
  localizedValues?: {
    distance?: { text?: string };
    duration?: { text?: string };
    staticDuration?: { text?: string };
  };
}

function formatTollEstimate(prices?: UpstreamMoney[]): string | null {
  if (!prices || prices.length === 0) return null;
  const first = prices[0];
  const units = Number(first.units || 0);
  const nanos = Number(first.nanos || 0) / 1e9;
  const total = units + nanos;
  if (!Number.isFinite(total) || total <= 0) return null;
  const currency = first.currencyCode || 'USD';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(total);
  } catch {
    return `$${total.toFixed(2)}`;
  }
}

function buildRoutesPayload(
  origin: LatLngLiteral,
  destination: LatLngLiteral,
  travelMode: TravelMode,
  options: {
    avoidTolls: boolean;
    avoidHighways: boolean;
    ecoFriendly: boolean;
    includeAlternatives: boolean;
  }
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    origin: {
      location: {
        latLng: { latitude: origin.lat, longitude: origin.lng },
      },
    },
    destination: {
      location: {
        latLng: { latitude: destination.lat, longitude: destination.lng },
      },
    },
    travelMode,
    polylineQuality: 'HIGH_QUALITY',
    polylineEncoding: 'ENCODED_POLYLINE',
    computeAlternativeRoutes: options.includeAlternatives,
    languageCode: 'en-US',
    regionCode: 'US',
    units: 'IMPERIAL',
  };

  if (travelMode === 'DRIVE') {
    payload.routingPreference = options.ecoFriendly
      ? 'TRAFFIC_AWARE_OPTIMAL'
      : 'TRAFFIC_AWARE';

    const routeModifiers: Record<string, unknown> = {
      avoidTolls: options.avoidTolls,
      avoidHighways: options.avoidHighways,
    };

    const extraComputations: string[] = ['TOLLS'];
    if (options.ecoFriendly) {
      routeModifiers.vehicleInfo = { emissionType: 'GASOLINE' };
      extraComputations.push('FUEL_CONSUMPTION');
      payload.requestedReferenceRoutes = ['FUEL_EFFICIENT'];
    }

    payload.routeModifiers = routeModifiers;
    payload.extraComputations = extraComputations;
  }

  return payload;
}

async function callUpstreamComputeRoutes(
  apiKey: string,
  payload: Record<string, unknown>
) {
  const res = await fetch(ROUTES_COMPUTE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const data = (await res.json()) as {
    routes?: UpstreamRoute[];
    error?: { message?: string; status?: string };
  };

  return { res, data };
}

export async function POST(req: NextRequest) {
  const apiKey = getServerMapsApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'Google Maps API key is not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local.',
      },
      { status: 503 }
    );
  }

  let body: ComputeRoutesRequestBody;
  try {
    body = (await req.json()) as ComputeRoutesRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const {
    origin,
    destination,
    travelMode = 'BICYCLE',
    avoidTolls = false,
    avoidHighways = false,
    ecoFriendly = false,
  } = body;

  if (
    !origin ||
    !destination ||
    typeof origin.lat !== 'number' ||
    typeof origin.lng !== 'number' ||
    typeof destination.lat !== 'number' ||
    typeof destination.lng !== 'number'
  ) {
    return NextResponse.json(
      { error: 'Valid origin and destination {lat, lng} coordinates are required.' },
      { status: 400 }
    );
  }

  try {
    let fallbackApplied = false;
    let payload = buildRoutesPayload(origin, destination, travelMode, {
      avoidTolls,
      avoidHighways,
      ecoFriendly,
      includeAlternatives: true,
    });

    let { res, data } = await callUpstreamComputeRoutes(apiKey, payload);

    // Fallback 1: If ecoFriendly + computeAlternativeRoutes fails, retry ecoFriendly without alternatives
    if (!res.ok && travelMode === 'DRIVE' && ecoFriendly) {
      fallbackApplied = true;
      payload = buildRoutesPayload(origin, destination, travelMode, {
        avoidTolls,
        avoidHighways,
        ecoFriendly: true,
        includeAlternatives: false,
      });
      ({ res, data } = await callUpstreamComputeRoutes(apiKey, payload));
    }

    // Fallback 2: If TRAFFIC_AWARE_OPTIMAL / FUEL_EFFICIENT still fails (e.g. Demo Key scope), retry standard TRAFFIC_AWARE
    if (!res.ok && travelMode === 'DRIVE' && ecoFriendly) {
      fallbackApplied = true;
      payload = buildRoutesPayload(origin, destination, travelMode, {
        avoidTolls,
        avoidHighways,
        ecoFriendly: false,
        includeAlternatives: true,
      });
      ({ res, data } = await callUpstreamComputeRoutes(apiKey, payload));
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          travelMode,
          routes: [],
          error:
            data.error?.message ||
            `Routes API returned status ${res.status} for ${travelMode}.`,
        },
        { status: res.status }
      );
    }

    const rawRoutes = data.routes || [];
    const routes: ComputedRoute[] = rawRoutes.map((route, idx) => {
      const labels = route.routeLabels || (idx === 0 ? ['DEFAULT_ROUTE'] : ['DEFAULT_ROUTE_ALTERNATE']);
      const durationSeconds = parseDurationSeconds(route.duration);
      const staticDurationSeconds =
        parseDurationSeconds(route.staticDuration) || durationSeconds;
      const distanceMeters = route.distanceMeters || 0;
      const isEco = labels.includes('FUEL_EFFICIENT');
      const color = isEco
        ? ROUTE_PALETTE[3]
        : ROUTE_PALETTE[idx % (ROUTE_PALETTE.length - 1)];

      const microliters = route.travelAdvisory?.fuelConsumptionMicroliters;
      const fuelConsumptionLiters =
        microliters !== undefined && microliters !== null
          ? Number(microliters) / 1_000_000
          : null;

      return {
        index: idx,
        routeLabels: labels,
        distanceMeters,
        durationSeconds,
        staticDurationSeconds,
        durationText:
          route.localizedValues?.duration?.text || formatDuration(durationSeconds),
        distanceText:
          route.localizedValues?.distance?.text ||
          formatDistanceImperial(distanceMeters),
        encodedPolyline: route.polyline?.encodedPolyline || '',
        color,
        tollEstimateText: formatTollEstimate(
          route.travelAdvisory?.tollInfo?.estimatedPrice
        ),
        fuelConsumptionLiters:
          fuelConsumptionLiters !== null && Number.isFinite(fuelConsumptionLiters)
            ? Number(fuelConsumptionLiters.toFixed(2))
            : null,
        warnings: route.warnings || [],
      };
    });

    return NextResponse.json({
      travelMode,
      routes,
      fallbackApplied,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unexpected server error.';
    return NextResponse.json(
      { travelMode, routes: [], error: message },
      { status: 500 }
    );
  }
}
