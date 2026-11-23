import type { PlaceHoursPeriod } from './types';

const DAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Computes whether a place is currently open in America/Los_Angeles time
 * using Places API (New) `openNow` or `regularOpeningHours.periods`.
 * Avoids calling beta-only `Place.prototype.isOpen()` on the `weekly` channel.
 */
export function computeOpenStatus(
  openNow?: boolean,
  periods?: PlaceHoursPeriod[]
): boolean | undefined {
  if (typeof openNow === 'boolean') {
    return openNow;
  }
  if (!periods || periods.length === 0) {
    return undefined;
  }

  // 24/7 check: single period opening Sunday 00:00 with no close time
  if (
    periods.length === 1 &&
    periods[0].open.day === 0 &&
    periods[0].open.hour === 0 &&
    periods[0].open.minute === 0 &&
    !periods[0].close
  ) {
    return true;
  }

  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const weekdayPart = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const hourPart = Number(parts.find((p) => p.type === 'hour')?.value ?? 12);
  const minutePart = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);

  const currentDay = DAY_INDEX[weekdayPart] ?? 1;
  const currentMinutesOfWeek = currentDay * 1440 + (hourPart % 24) * 60 + minutePart;
  const weekMinutes = 7 * 1440;

  for (const period of periods) {
    const start = period.open.day * 1440 + period.open.hour * 60 + period.open.minute;
    if (!period.close) {
      return true;
    }
    let end = period.close.day * 1440 + period.close.hour * 60 + period.close.minute;
    if (end <= start) {
      end += weekMinutes;
    }

    const adjustedNow =
      currentMinutesOfWeek < start ? currentMinutesOfWeek + weekMinutes : currentMinutesOfWeek;

    if (adjustedNow >= start && adjustedNow < end) {
      return true;
    }
  }

  return false;
}

export function formatDurationSeconds(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '1 min';
  }
  const totalMinutes = Math.max(1, Math.round(totalSeconds / 60));
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
}

export function formatDistanceMeters(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) {
    return '0.1 mi';
  }
  const miles = meters / 1609.344;
  if (miles < 0.1) {
    const feet = Math.round(meters * 3.28084);
    return `${feet} ft`;
  }
  return `${miles.toFixed(1)} mi`;
}

export function parseDurationString(duration?: string): number {
  if (!duration) return 0;
  const match = /^(\d+(?:\.\d+)?)s$/.exec(duration.trim());
  return match ? Math.round(Number(match[1])) : 0;
}
