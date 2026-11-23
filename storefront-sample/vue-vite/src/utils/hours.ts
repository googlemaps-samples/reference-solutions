import type { OpenStatusSummary } from '../types/storefront';

/**
 * Computes live open/closed status from regularOpeningHours.periods on the
 * Maps JS `weekly` channel without calling beta-only `place.isOpen()`.
 */
export function computeOpenNowStatus(
  openingHours: google.maps.places.OpeningHours | null | undefined,
  utcOffsetMinutes?: number | null
): OpenStatusSummary {
  if (!openingHours) {
    return {
      isOpen: null,
      label: 'Hours unavailable',
      detail: 'Check Google Maps listing for current schedule',
    };
  }

  const periods = openingHours.periods ?? [];
  if (periods.length === 0) {
    return {
      isOpen: null,
      label: 'Hours unavailable',
      detail: 'Schedule not listed',
    };
  }

  // 24/7 venue: single period with day 0, hour 0, minute 0, and no close point
  if (
    periods.length === 1 &&
    periods[0].open &&
    !periods[0].close &&
    periods[0].open.day === 0 &&
    periods[0].open.hour === 0 &&
    periods[0].open.minute === 0
  ) {
    return {
      isOpen: true,
      label: 'Open 24 hours',
      detail: 'Open continuously',
    };
  }

  const { day, minutesOfDay } = getClinicLocalDayAndMinutes(utcOffsetMinutes);
  const currentWeekMinute = day * 1440 + minutesOfDay;

  let isOpenNow = false;
  let closingTimeText: string | null = null;

  for (const period of periods) {
    if (!period.open) continue;
    const openWeekMinute =
      period.open.day * 1440 + period.open.hour * 60 + period.open.minute;

    if (!period.close) {
      if (currentWeekMinute >= openWeekMinute) {
        isOpenNow = true;
      }
      continue;
    }

    let closeWeekMinute =
      period.close.day * 1440 + period.close.hour * 60 + period.close.minute;

    // Handle periods wrapping past Saturday night into Sunday morning
    if (closeWeekMinute <= openWeekMinute) {
      closeWeekMinute += 7 * 1440;
    }

    const adjustedCurrent =
      currentWeekMinute < openWeekMinute && closeWeekMinute >= 7 * 1440
        ? currentWeekMinute + 7 * 1440
        : currentWeekMinute;

    if (adjustedCurrent >= openWeekMinute && adjustedCurrent < closeWeekMinute) {
      isOpenNow = true;
      closingTimeText = formatClockTime(period.close.hour, period.close.minute);
      break;
    }
  }

  if (isOpenNow) {
    return {
      isOpen: true,
      label: 'Open now',
      detail: closingTimeText ? `Closes at ${closingTimeText}` : 'Currently open',
    };
  }

  const nextOpen = findNextOpenPeriod(periods, currentWeekMinute);
  return {
    isOpen: false,
    label: 'Closed',
    detail: nextOpen ?? 'Check weekly hours',
  };
}

function getClinicLocalDayAndMinutes(utcOffsetMinutes?: number | null): {
  day: number;
  minutesOfDay: number;
} {
  const now = new Date();
  if (typeof utcOffsetMinutes === 'number' && Number.isFinite(utcOffsetMinutes)) {
    const shifted = new Date(now.getTime() + utcOffsetMinutes * 60_000);
    return {
      day: shifted.getUTCDay(),
      minutesOfDay: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
    };
  }

  // Fallback to San Francisco local timezone (America/Los_Angeles)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
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

  const weekdayPart = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const hourPart = Number(parts.find((p) => p.type === 'hour')?.value ?? '9');
  const minutePart = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');

  return {
    day: weekdayMap[weekdayPart] ?? 1,
    minutesOfDay: hourPart * 60 + minutePart,
  };
}

function findNextOpenPeriod(
  periods: google.maps.places.OpeningHoursPeriod[],
  currentWeekMinute: number
): string | null {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  let bestDelta = Number.POSITIVE_INFINITY;
  let bestLabel: string | null = null;

  for (const period of periods) {
    if (!period.open) continue;
    const openWeekMinute =
      period.open.day * 1440 + period.open.hour * 60 + period.open.minute;
    let delta = openWeekMinute - currentWeekMinute;
    if (delta <= 0) delta += 7 * 1440;

    if (delta < bestDelta) {
      bestDelta = delta;
      const timeStr = formatClockTime(period.open.hour, period.open.minute);
      const dayLabel =
        Math.floor(openWeekMinute / 1440) === Math.floor(currentWeekMinute / 1440) &&
        delta < 1440
          ? 'today'
          : dayNames[period.open.day] ?? '';
      bestLabel = `Opens ${dayLabel} at ${timeStr}`.trim();
    }
  }

  return bestLabel;
}

function formatClockTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const mm = String(minute).padStart(2, '0');
  return `${h12}:${mm} ${period}`;
}
