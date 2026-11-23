import { MAX_DELIVERY_DISTANCE_METERS } from '../constants/chicago';
import type { DeliveryEligibility, LatLngPoint, OrderItem } from '../types/delivery';

export function evaluateDeliveryEligibility(
  inPolygonZone: boolean,
  distanceMeters: number | null,
  isDeliverableGranularity: boolean
): DeliveryEligibility {
  if (!isDeliverableGranularity) {
    return {
      inPolygonZone,
      withinDistanceLimit: false,
      isEligible: false,
      tierLabel: 'Address incomplete',
      deliveryFee: null,
      reason:
        'Address validation granularity is not precise enough for doorstep delivery. Please include a valid street number.',
    };
  }

  if (!inPolygonZone) {
    return {
      inPolygonZone: false,
      withinDistanceLimit: distanceMeters !== null ? distanceMeters <= MAX_DELIVERY_DISTANCE_METERS : false,
      isEligible: false,
      tierLabel: 'Outside zone',
      deliveryFee: null,
      reason: 'Drop-off coordinate is outside the Chicago Fulton Market polygon delivery zone.',
    };
  }

  if (distanceMeters === null) {
    return {
      inPolygonZone,
      withinDistanceLimit: false,
      isEligible: false,
      tierLabel: 'Route unavailable',
      deliveryFee: null,
      reason: 'Could not compute a driving route to this destination.',
    };
  }

  const km = distanceMeters / 1000;
  if (distanceMeters > MAX_DELIVERY_DISTANCE_METERS) {
    return {
      inPolygonZone,
      withinDistanceLimit: false,
      isEligible: false,
      tierLabel: 'Over 8 km limit',
      deliveryFee: null,
      reason: `Road distance (${km.toFixed(2)} km) exceeds the 8.0 km maximum delivery cap.`,
    };
  }

  if (km <= 3.0) {
    return {
      inPolygonZone: true,
      withinDistanceLimit: true,
      isEligible: true,
      tierLabel: 'Tier 1 (<= 3 km)',
      deliveryFee: 2.99,
      reason: `Eligible inside polygon and within Tier 1 radius (${km.toFixed(2)} km).`,
    };
  }

  if (km <= 5.5) {
    return {
      inPolygonZone: true,
      withinDistanceLimit: true,
      isEligible: true,
      tierLabel: 'Tier 2 (3–5.5 km)',
      deliveryFee: 4.99,
      reason: `Eligible inside polygon and within Tier 2 radius (${km.toFixed(2)} km).`,
    };
  }

  return {
    inPolygonZone: true,
    withinDistanceLimit: true,
    isEligible: true,
    tierLabel: 'Tier 3 (5.5–8 km)',
    deliveryFee: 6.99,
    reason: `Eligible inside polygon and within Tier 3 radius (${km.toFixed(2)} km).`,
  };
}

export function formatDistanceKm(meters: number): string {
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatEtaMinutes(seconds: number): string {
  const mins = Math.max(1, Math.round(seconds / 60));
  return `${mins} min`;
}

export function calculateSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

/**
 * Interpolates a position and compass heading (degrees) along a polyline path
 * for a normalized progress t in [0, 1].
 */
export function interpolateAlongPath(
  path: LatLngPoint[],
  t: number
): { position: LatLngPoint; heading: number } {
  if (path.length === 0) {
    return { position: { lat: 41.8868, lng: -87.6486 }, heading: 0 };
  }
  if (path.length === 1 || t <= 0) {
    const heading =
      path.length > 1 ? computeBearing(path[0], path[1]) : 90;
    return { position: path[0], heading };
  }
  if (t >= 1) {
    const last = path[path.length - 1];
    const prev = path[path.length - 2];
    return { position: last, heading: computeBearing(prev, last) };
  }

  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const d = haversineMeters(path[i], path[i + 1]);
    segmentLengths.push(d);
    totalLength += d;
  }

  if (totalLength === 0) {
    return { position: path[0], heading: 0 };
  }

  const targetDist = t * totalLength;
  let accumulated = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
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
        heading: computeBearing(a, b),
      };
    }
    accumulated += segLen;
  }

  const last = path[path.length - 1];
  const prev = path[path.length - 2];
  return { position: last, heading: computeBearing(prev, last) };
}

function haversineMeters(a: LatLngPoint, b: LatLngPoint): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function computeBearing(a: LatLngPoint, b: LatLngPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}
