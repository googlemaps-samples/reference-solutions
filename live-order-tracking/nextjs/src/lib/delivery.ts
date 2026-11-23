export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export interface BasketItem {
  id: string;
  name: string;
  category: 'Kitchen' | 'Grocery';
  quantity: number;
  unitPrice: number;
}

export interface AddressValidationVerdict {
  inputGranularity?: string;
  validationGranularity?: string;
  geocodeGranularity?: string;
  addressComplete?: boolean;
  hasUnconfirmedComponents?: boolean;
  hasInferredComponents?: boolean;
  hasReplacedComponents?: boolean;
}

export interface AddressValidationResponse {
  responseId?: string;
  result?: {
    verdict?: AddressValidationVerdict;
    address?: {
      formattedAddress?: string;
      postalAddress?: {
        regionCode?: string;
        administrativeArea?: string;
        locality?: string;
        postalCode?: string;
        addressLines?: string[];
      };
      missingComponentTypes?: string[];
      unconfirmedComponentTypes?: string[];
      unresolvedTokens?: string[];
    };
    geocode?: {
      location?: {
        latitude: number;
        longitude: number;
      };
      plusCode?: {
        globalCode?: string;
        compoundCode?: string;
      };
      placeId?: string;
      locationType?: string;
    };
    metadata?: {
      business?: boolean;
      poBox?: boolean;
      residential?: boolean;
    };
    uspsData?: {
      standardizedAddress?: {
        firstAddressLine?: string;
        cityStateZipAddressLine?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        zipCodeExtension?: string;
      };
      dpvConfirmation?: string;
      dpvFootnote?: string;
      cassProcessed?: boolean;
      carrierRoute?: string;
      deliveryPointCode?: string;
    };
  };
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

export interface RouteStepSummary {
  instruction: string;
  maneuver?: string;
  distanceMeters: number;
  staticDurationSeconds: number;
}

export interface ComputedRouteData {
  distanceMeters: number;
  durationSeconds: number;
  durationText: string;
  encodedPolyline: string;
  steps: RouteStepSummary[];
}

export interface DeliveryTierQuote {
  eligibleByDistance: boolean;
  tierName: string;
  feeUsd: number | null;
  distanceKm: number;
}

export const KITCHEN_HUB = {
  name: 'Fulton Market Kitchen Hub',
  address: '845 W Fulton Market, Chicago, IL 60607',
  location: { lat: 41.8868, lng: -87.6486 } as LatLngLiteral,
};

export const SEED_IN_ZONE_ADDRESS = '401 N Michigan Ave, Chicago, IL 60611';
export const SEED_OUT_OF_ZONE_ADDRESS = '5801 S Ellis Ave, Chicago, IL 60637';

export const MAX_DELIVERY_DISTANCE_METERS = 8000;

/**
 * Chicago delivery zone polygon covering Fulton Market, West Loop, The Loop,
 * River North, Streeterville, Gold Coast, Old Town, Near West Side, and South Loop.
 */
export const DELIVERY_ZONE_POLYGON: LatLngLiteral[] = [
  { lat: 41.918, lng: -87.685 },
  { lat: 41.922, lng: -87.638 },
  { lat: 41.912, lng: -87.612 },
  { lat: 41.892, lng: -87.608 },
  { lat: 41.868, lng: -87.614 },
  { lat: 41.852, lng: -87.625 },
  { lat: 41.855, lng: -87.678 },
  { lat: 41.885, lng: -87.692 },
];

export const ORDER_BASKET_ITEMS: BasketItem[] = [
  {
    id: 'item-1',
    name: 'Fulton Smashburger & Garlic Fries',
    category: 'Kitchen',
    quantity: 1,
    unitPrice: 16.5,
  },
  {
    id: 'item-2',
    name: 'West Loop Harvest Grain Bowl',
    category: 'Kitchen',
    quantity: 1,
    unitPrice: 14.25,
  },
  {
    id: 'item-3',
    name: 'Artisan Sourdough & Cultured Butter',
    category: 'Grocery',
    quantity: 1,
    unitPrice: 8.75,
  },
  {
    id: 'item-4',
    name: 'Sparkling Blood Orange (4-Pack)',
    category: 'Grocery',
    quantity: 1,
    unitPrice: 6.5,
  },
];

export function computeDeliveryTier(distanceMeters: number): DeliveryTierQuote {
  const distanceKm = distanceMeters / 1000;
  if (distanceMeters <= 3000) {
    return {
      eligibleByDistance: true,
      tierName: 'Neighborhood Express (≤ 3.0 km)',
      feeUsd: 2.99,
      distanceKm,
    };
  }
  if (distanceMeters <= 5500) {
    return {
      eligibleByDistance: true,
      tierName: 'Standard Metro (≤ 5.5 km)',
      feeUsd: 4.99,
      distanceKm,
    };
  }
  if (distanceMeters <= MAX_DELIVERY_DISTANCE_METERS) {
    return {
      eligibleByDistance: true,
      tierName: 'Extended Zone (≤ 8.0 km)',
      feeUsd: 6.99,
      distanceKm,
    };
  }
  return {
    eligibleByDistance: false,
    tierName: 'Outside 8.0 km Road Limit',
    feeUsd: null,
    distanceKm,
  };
}

export function parseDurationSeconds(durationStr?: string): number {
  if (!durationStr) return 0;
  const match = /^(\d+(?:\.\d+)?)s$/.exec(durationStr.trim());
  return match ? Math.round(Number(match[1])) : 0;
}

export function formatEtaMinutes(seconds: number): string {
  const mins = Math.max(1, Math.round(seconds / 60));
  return `${mins} min`;
}

/**
 * Pure TypeScript ray-casting fallback for point-in-polygon when Maps Geometry
 * library is still initializing; when google.maps.geometry.poly.containsLocation
 * is available we use the official Google Maps Geometry API directly.
 */
export function isPointInDeliveryPolygonFallback(
  point: LatLngLiteral,
  polygon: LatLngLiteral[] = DELIVERY_ZONE_POLYGON
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Standard Google Encoded Polyline Algorithm decoder fallback so polyline
 * interpolation works immediately even before google.maps.geometry loads.
 */
export function decodeEncodedPolyline(encoded: string): LatLngLiteral[] {
  const points: LatLngLiteral[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

export function haversineMeters(a: LatLngLiteral, b: LatLngLiteral): number {
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

export function interpolateAlongPath(
  path: LatLngLiteral[],
  progress: number
): { position: LatLngLiteral; headingDeg: number } {
  if (path.length === 0) {
    return { position: KITCHEN_HUB.location, headingDeg: 0 };
  }
  if (path.length === 1 || progress <= 0) {
    return { position: path[0], headingDeg: 90 };
  }
  if (progress >= 1) {
    const prev = path[path.length - 2];
    const last = path[path.length - 1];
    return { position: last, headingDeg: computeBearing(prev, last) };
  }

  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const len = haversineMeters(path[i], path[i + 1]);
    segmentLengths.push(len);
    totalLength += len;
  }

  if (totalLength === 0) {
    return { position: path[0], headingDeg: 0 };
  }

  const targetDist = totalLength * Math.min(1, Math.max(0, progress));
  let walked = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    const segLen = segmentLengths[i];
    if (walked + segLen >= targetDist || i === segmentLengths.length - 1) {
      const ratio = segLen > 0 ? (targetDist - walked) / segLen : 0;
      const start = path[i];
      const end = path[i + 1];
      return {
        position: {
          lat: start.lat + (end.lat - start.lat) * ratio,
          lng: start.lng + (end.lng - start.lng) * ratio,
        },
        headingDeg: computeBearing(start, end),
      };
    }
    walked += segLen;
  }

  return { position: path[path.length - 1], headingDeg: 0 };
}

function computeBearing(a: LatLngLiteral, b: LatLngLiteral): number {
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

export function isDeliverableVerdict(verdict?: AddressValidationVerdict): {
  ok: boolean;
  reason: string;
} {
  if (!verdict) {
    return { ok: false, reason: 'Address has not been validated yet.' };
  }
  const goodGranularities = new Set(['SUB_PREMISE', 'PREMISE', 'PREMISE_PROXIMITY']);
  const granOk = verdict.validationGranularity
    ? goodGranularities.has(verdict.validationGranularity)
    : false;

  if (!granOk) {
    return {
      ok: false,
      reason: `Granularity "${verdict.validationGranularity ?? 'UNKNOWN'}" is too coarse for door-to-door delivery.`,
    };
  }
  if (verdict.hasUnconfirmedComponents) {
    return {
      ok: false,
      reason: 'Address contains unconfirmed street or unit components.',
    };
  }
  if (verdict.addressComplete === false) {
    return {
      ok: false,
      reason: 'Address is incomplete (missing street number, route, or postal code).',
    };
  }
  return {
    ok: true,
    reason: `Confirmed ${verdict.validationGranularity} deliverability`,
  };
}
