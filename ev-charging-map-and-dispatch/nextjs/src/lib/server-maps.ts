import type {
  EvConnectorSummary,
  LatLngLiteral,
  ProviderCategory,
  ServiceProvider,
} from './types';

export const PLACES_FIELD_MASK =
  'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.primaryType,places.types,places.regularOpeningHours,places.evChargeOptions,places.nationalPhoneNumber,places.googleMapsUri';

export const ROUTE_MATRIX_FIELD_MASK =
  'originIndex,destinationIndex,status,condition,distanceMeters,duration';

export const COMPUTE_ROUTES_FIELD_MASK =
  'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.viewport,routes.legs.duration,routes.legs.distanceMeters,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration';

export function getServerMapsApiKey(): string {
  const key =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    '';
  return key.trim();
}

export function isValidLatLng(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function parseDurationSeconds(duration?: string): number | undefined {
  if (!duration) return undefined;
  const match = duration.match(/^(\d+(?:\.\d+)?)s$/);
  if (!match) return undefined;
  return Math.round(Number(match[1]));
}

export function computeHaversineMeters(
  a: LatLngLiteral,
  b: LatLngLiteral
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return Math.round(2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

const CONNECTOR_LABELS: Record<string, string> = {
  EV_CONNECTOR_TYPE_J1772: 'J1772',
  EV_CONNECTOR_TYPE_TYPE_2: 'Type 2',
  EV_CONNECTOR_TYPE_CHADEMO: 'CHAdeMO',
  EV_CONNECTOR_TYPE_CCS_COMBO_1: 'CCS1',
  EV_CONNECTOR_TYPE_CCS_COMBO_2: 'CCS2',
  EV_CONNECTOR_TYPE_TESLA: 'Tesla / NACS',
  EV_CONNECTOR_TYPE_NACS: 'NACS',
  EV_CONNECTOR_TYPE_UNSPECIFIED_WALL_OUTLET: 'Wall Outlet',
  EV_CONNECTOR_TYPE_OTHER: 'Other',
};

export function formatConnectorLabel(rawType?: string): string {
  if (!rawType) return 'EV Port';
  return CONNECTOR_LABELS[rawType] ?? rawType.replace(/^EV_CONNECTOR_TYPE_/, '').replace(/_/g, ' ');
}

interface RawPlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  primaryType?: string;
  types?: string[];
  regularOpeningHours?: {
    openNow?: boolean;
    weekdayDescriptions?: string[];
  };
  evChargeOptions?: {
    connectorCount?: number;
    connectorAggregation?: Array<{
      type?: string;
      maxChargeRateKw?: number;
      count?: number;
      availableCount?: number;
      outOfServiceCount?: number;
    }>;
  };
  nationalPhoneNumber?: string;
  googleMapsUri?: string;
}

export function normalizeRawPlace(
  raw: RawPlace,
  origin: LatLngLiteral,
  fallbackCategory?: ProviderCategory
): ServiceProvider | null {
  const lat = raw.location?.latitude;
  const lng = raw.location?.longitude;
  if (!raw.id || typeof lat !== 'number' || typeof lng !== 'number') {
    return null;
  }

  const types = Array.isArray(raw.types) ? raw.types : [];
  const isEv =
    raw.primaryType === 'electric_vehicle_charging_station' ||
    types.includes('electric_vehicle_charging_station') ||
    Boolean(raw.evChargeOptions) ||
    fallbackCategory === 'ev';

  const category: ProviderCategory = isEv ? 'ev' : 'repair';

  const connectors: EvConnectorSummary[] = [];
  let maxChargeRateKw: number | undefined;
  let totalAvailable = 0;
  let hasAvailableCount = false;

  for (const agg of raw.evChargeOptions?.connectorAggregation ?? []) {
    const count = typeof agg.count === 'number' ? agg.count : 0;
    const availableCount =
      typeof agg.availableCount === 'number' ? agg.availableCount : undefined;
    if (typeof availableCount === 'number') {
      hasAvailableCount = true;
      totalAvailable += availableCount;
    }
    if (
      typeof agg.maxChargeRateKw === 'number' &&
      (maxChargeRateKw === undefined || agg.maxChargeRateKw > maxChargeRateKw)
    ) {
      maxChargeRateKw = Math.round(agg.maxChargeRateKw);
    }
    connectors.push({
      type: agg.type ?? 'EV_CONNECTOR_TYPE_OTHER',
      label: formatConnectorLabel(agg.type),
      count,
      availableCount,
      outOfServiceCount: agg.outOfServiceCount,
      maxChargeRateKw:
        typeof agg.maxChargeRateKw === 'number'
          ? Math.round(agg.maxChargeRateKw)
          : undefined,
    });
  }

  const location = { lat, lng };
  return {
    id: raw.id,
    name: raw.displayName?.text?.trim() || 'Service Provider',
    address: raw.formattedAddress?.trim() || 'Seattle, WA',
    location,
    category,
    primaryType: raw.primaryType,
    types,
    rating: typeof raw.rating === 'number' ? raw.rating : undefined,
    userRatingCount:
      typeof raw.userRatingCount === 'number' ? raw.userRatingCount : undefined,
    openNow:
      typeof raw.regularOpeningHours?.openNow === 'boolean'
        ? raw.regularOpeningHours.openNow
        : undefined,
    weekdayDescriptions: raw.regularOpeningHours?.weekdayDescriptions,
    phone: raw.nationalPhoneNumber,
    googleMapsUri: raw.googleMapsUri,
    evConnectorCount: raw.evChargeOptions?.connectorCount,
    evAvailableCount: hasAvailableCount ? totalAvailable : undefined,
    maxChargeRateKw,
    evConnectors: connectors.length > 0 ? connectors : undefined,
    straightLineMeters: computeHaversineMeters(origin, location),
  };
}
