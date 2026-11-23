import type { OpenStatus } from '../types';

export const COVERAGE_RADIUS_METERS = 5000;

export const DEFAULT_SF_CENTER: google.maps.LatLngLiteral = {
  lat: 37.7879,
  lng: -122.4074,
};

export const SEED_ORIGIN_QUERY = 'Ferry Building, San Francisco, CA';

export const SEED_CLINIC_QUERY = 'dental clinic San Francisco, CA';

/**
 * Computes great-circle distance in meters between two LatLngLiteral points.
 * Uses the Maps JS Geometry library when loaded, falling back to Haversine.
 */
export function computeDistanceMeters(
  a: google.maps.LatLngLiteral,
  b: google.maps.LatLngLiteral,
  geometryLib?: google.maps.GeometryLibrary | null
): number {
  if (geometryLib?.spherical) {
    return geometryLib.spherical.computeDistanceBetween(a, b);
  }
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function formatDistanceMeters(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  const miles = meters / 1609.344;
  return `${miles.toFixed(1)} mi (${km.toFixed(1)} km)`;
}

export function formatDurationMillis(millis: number): string {
  const totalMinutes = Math.max(1, Math.round(millis / 60000));
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
}

/**
 * Evaluates open/closed status safely on the Maps JS `weekly` channel
 * using `regularOpeningHours.periods` in San Francisco (`America/Los_Angeles`)
 * time, avoiding beta-only `Place.prototype.isOpen()`.
 */
export function computeOpenStatusFromPeriods(
  openingHours: google.maps.places.OpeningHours | null | undefined
): OpenStatus {
  const periods = openingHours?.periods;
  if (!periods || periods.length === 0) {
    return { isOpen: null, label: 'Hours unavailable' };
  }

  // Open 24/7 convention: single period starting Sunday 00:00 with no close
  if (
    periods.length === 1 &&
    periods[0].open.day === 0 &&
    periods[0].open.hour === 0 &&
    periods[0].open.minute === 0 &&
    !periods[0].close
  ) {
    return { isOpen: true, label: 'Open 24 hours' };
  }

  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const weekdayStr = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const hourStr = parts.find((p) => p.type === 'hour')?.value ?? '12';
  const minuteStr = parts.find((p) => p.type === 'minute')?.value ?? '00';

  const currentDay = weekdayMap[weekdayStr] ?? now.getDay();
  const currentHour = parseInt(hourStr, 10) % 24;
  const currentMinute = parseInt(minuteStr, 10);
  const nowMinutesOfWeek = currentDay * 1440 + currentHour * 60 + currentMinute;
  const weekLength = 7 * 1440;

  for (const period of periods) {
    const openMin =
      period.open.day * 1440 + period.open.hour * 60 + period.open.minute;
    if (!period.close) {
      return { isOpen: true, label: 'Open now' };
    }
    let closeMin =
      period.close.day * 1440 + period.close.hour * 60 + period.close.minute;

    if (closeMin <= openMin) {
      closeMin += weekLength;
    }

    if (
      (nowMinutesOfWeek >= openMin && nowMinutesOfWeek < closeMin) ||
      (nowMinutesOfWeek + weekLength >= openMin &&
        nowMinutesOfWeek + weekLength < closeMin)
    ) {
      return { isOpen: true, label: 'Open now' };
    }
  }

  return { isOpen: false, label: 'Closed now' };
}
