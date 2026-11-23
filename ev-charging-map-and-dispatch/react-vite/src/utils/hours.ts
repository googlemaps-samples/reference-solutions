import type { OpeningStatus } from '../types/dispatch';

const MINUTES_PER_DAY = 24 * 60;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

function getSeattleTimeParts(): { day: number; minuteOfDay: number; dayName: string } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'long',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const weekdayStr = parts.find((p) => p.type === 'weekday')?.value ?? 'Monday';
  const hourVal = Number(parts.find((p) => p.type === 'hour')?.value ?? '12') % 24;
  const minuteVal = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');

  const dayMap: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  return {
    day: dayMap[weekdayStr] ?? now.getDay(),
    minuteOfDay: hourVal * 60 + minuteVal,
    dayName: weekdayStr,
  };
}

/**
 * Computes open/closed status from `place.regularOpeningHours` without calling
 * beta-only `place.isOpen()`, ensuring full compatibility on the `weekly` Maps JS channel.
 */
export function evaluateOpeningStatus(
  regularOpeningHours: google.maps.places.OpeningHours | null | undefined,
): OpeningStatus {
  if (!regularOpeningHours) {
    return { state: 'unknown', label: 'Hours N/A', todayHours: null };
  }

  const { day, minuteOfDay, dayName } = getSeattleTimeParts();
  const descriptions = regularOpeningHours.weekdayDescriptions ?? [];
  const todayDescRaw = descriptions.find((line) =>
    line.toLowerCase().startsWith(dayName.toLowerCase()),
  );
  const todayHours = todayDescRaw
    ? todayDescRaw.split(':').slice(1).join(':').trim()
    : null;

  const periods = regularOpeningHours.periods ?? [];
  if (periods.length === 0) {
    if (todayHours && /open 24 hours/i.test(todayHours)) {
      return { state: 'open_24h', label: 'Open 24/7', todayHours };
    }
    if (todayHours) {
      return { state: 'unknown', label: todayHours, todayHours };
    }
    return { state: 'unknown', label: 'Hours N/A', todayHours: null };
  }

  // Standard Google Places representation for 24/7 locations:
  // single period starting Sunday 00:00 with no close point.
  if (
    periods.length === 1 &&
    periods[0].open.day === 0 &&
    periods[0].open.hour === 0 &&
    periods[0].open.minute === 0 &&
    !periods[0].close
  ) {
    return {
      state: 'open_24h',
      label: 'Open 24/7',
      todayHours: todayHours ?? 'Open 24 hours',
    };
  }

  const currentWeekMinute = day * MINUTES_PER_DAY + minuteOfDay;

  for (const period of periods) {
    const openMinute =
      period.open.day * MINUTES_PER_DAY +
      period.open.hour * 60 +
      period.open.minute;

    if (!period.close) {
      if (currentWeekMinute >= openMinute) {
        return { state: 'open', label: 'Open Now', todayHours };
      }
      continue;
    }

    const closeMinute =
      period.close.day * MINUTES_PER_DAY +
      period.close.hour * 60 +
      period.close.minute;

    if (closeMinute >= openMinute) {
      if (currentWeekMinute >= openMinute && currentWeekMinute < closeMinute) {
        return { state: 'open', label: 'Open Now', todayHours };
      }
    } else {
      // Wraps past Saturday midnight into Sunday
      if (
        currentWeekMinute >= openMinute ||
        currentWeekMinute < closeMinute % MINUTES_PER_WEEK
      ) {
        return { state: 'open', label: 'Open Now', todayHours };
      }
    }
  }

  return { state: 'closed', label: 'Closed', todayHours };
}
