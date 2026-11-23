import type { GeofenceZone, LatLngLiteral } from '@/types/geofencing';

/**
 * Evaluates whether a point lies inside a polygon using Google Maps Geometry
 * (`google.maps.geometry.poly.containsLocation`), with a deterministic ray-casting
 * fallback while the geometry library is still loading.
 */
export function isPointInPolygon(
  point: LatLngLiteral,
  ring: LatLngLiteral[],
  geometryLib?: google.maps.GeometryLibrary | null
): boolean {
  if (ring.length < 3) return false;

  if (geometryLib?.poly && typeof google !== 'undefined' && google.maps) {
    const latLng = new google.maps.LatLng(point.lat, point.lng);
    const polygon = new google.maps.Polygon({ paths: ring });
    return geometryLib.poly.containsLocation(latLng, polygon);
  }

  // Deterministic ray-casting fallback before google.maps.geometry finishes loading
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].lng;
    const yi = ring[i].lat;
    const xj = ring[j].lng;
    const yj = ring[j].lat;

    const intersects =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function findMatchingGeofences(
  point: LatLngLiteral,
  zones: GeofenceZone[],
  geometryLib?: google.maps.GeometryLibrary | null
): GeofenceZone[] {
  return zones.filter((zone) => isPointInPolygon(point, zone.path, geometryLib));
}

export function getPolygonCentroid(ring: LatLngLiteral[]): LatLngLiteral {
  if (ring.length === 0) {
    return { lat: 30.2672, lng: -97.7431 };
  }
  const sum = ring.reduce(
    (acc, pt) => ({ lat: acc.lat + pt.lat, lng: acc.lng + pt.lng }),
    { lat: 0, lng: 0 }
  );
  return {
    lat: sum.lat / ring.length,
    lng: sum.lng / ring.length,
  };
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return '0.0 mi';
  const miles = meters / 1609.344;
  return `${miles.toFixed(1)} mi`;
}

export function parseDurationSeconds(durationStr?: string): number {
  if (!durationStr) return 0;
  const match = /^(\d+(?:\.\d+)?)s$/.exec(durationStr.trim());
  return match ? Math.round(Number(match[1])) : 0;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 min';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
}
