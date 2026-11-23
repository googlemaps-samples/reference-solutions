import type {
  ConnectorSummaryItem,
  EvConnectorSummary,
  LatLngLiteral,
  OpeningStatusInfo,
} from '../types/dispatch';

const CONNECTOR_LABELS: Record<string, string> = {
  CCS_COMBO_1: 'CCS1',
  CCS_COMBO_2: 'CCS2',
  CHADEMO: 'CHAdeMO',
  J1772: 'J1772',
  NACS: 'NACS',
  TESLA: 'Tesla',
  TYPE_2: 'Type 2',
  OTHER: 'Other',
};

export function formatConnectorType(type: string | null | undefined): string {
  if (!type) return 'Standard';
  return CONNECTOR_LABELS[type] ?? type.replace(/_/g, ' ');
}

export function extractEvSummary(
  evChargeOptions: google.maps.places.EVChargeOptions | null | undefined,
): EvConnectorSummary | null {
  if (!evChargeOptions) return null;

  const aggregations = evChargeOptions.connectorAggregations ?? [];
  let maxKw = 0;
  let hasAvailabilityData = false;
  let availableSum = 0;
  let countFromAggregations = 0;

  const connectors: ConnectorSummaryItem[] = aggregations.map((agg) => {
    const rateKw = Math.round(agg.maxChargeRateKw ?? 0);
    if (rateKw > maxKw) maxKw = rateKw;

    const count = agg.count ?? 0;
    countFromAggregations += count;

    const avail = agg.availableCount ?? null;
    if (avail !== null && avail !== undefined) {
      hasAvailabilityData = true;
      availableSum += avail;
    }

    return {
      typeLabel: formatConnectorType(agg.type),
      count,
      availableCount: avail,
      outOfServiceCount: agg.outOfServiceCount ?? null,
      maxChargeRateKw: rateKw,
    };
  });

  const totalConnectors = evChargeOptions.connectorCount || countFromAggregations;

  return {
    totalConnectors,
    totalAvailable: hasAvailabilityData ? availableSum : null,
    maxChargeRateKw: maxKw,
    isFastCharger: maxKw >= 50,
    connectors,
  };
}

/**
 * Computes open/closed status using OpeningHours.periods and utcOffsetMinutes
 * so it remains 100% compatible with the weekly Maps JS API channel
 * (avoids calling beta-only place.isOpen()).
 */
export function getOpeningStatus(
  regularOpeningHours: google.maps.places.OpeningHours | null | undefined,
  utcOffsetMinutes: number | null | undefined,
  businessStatus: string | null | undefined,
): OpeningStatusInfo {
  if (businessStatus === 'CLOSED_PERMANENTLY') {
    return { isOpen: false, badgeText: 'Permanently Closed', todayHoursText: null };
  }
  if (businessStatus === 'CLOSED_TEMPORARILY') {
    return { isOpen: false, badgeText: 'Temporarily Closed', todayHoursText: null };
  }

  const periods = regularOpeningHours?.periods;
  const weekdayDescriptions = regularOpeningHours?.weekdayDescriptions ?? [];

  // Default to Seattle Pacific Time (-420 or -480) if utcOffsetMinutes is omitted
  const nowUtcMillis = Date.now();
  const effectiveOffsetMinutes =
    typeof utcOffsetMinutes === 'number' ? utcOffsetMinutes : -new Date().getTimezoneOffset();
  const placeLocalDate = new Date(nowUtcMillis + effectiveOffsetMinutes * 60_000);
  const currentDay = placeLocalDate.getUTCDay(); // 0 = Sunday .. 6 = Saturday
  const currentMinutesOfDay =
    placeLocalDate.getUTCHours() * 60 + placeLocalDate.getUTCMinutes();
  const currentWeekMinutes = currentDay * 1440 + currentMinutesOfDay;

  let todayHoursText: string | null = null;
  if (weekdayDescriptions.length === 7) {
    // weekdayDescriptions typically starts on Monday (index 0) -> Sunday (index 6)
    const descIdx = (currentDay + 6) % 7;
    todayHoursText = weekdayDescriptions[descIdx] ?? null;
  }

  if (!periods || periods.length === 0) {
    return {
      isOpen: null,
      badgeText: businessStatus === 'OPERATIONAL' ? 'Operational' : 'Hours N/A',
      todayHoursText,
    };
  }

  // Always open: single period starting Sunday 00:00 with no close
  if (
    periods.length === 1 &&
    periods[0].open.day === 0 &&
    periods[0].open.hour === 0 &&
    periods[0].open.minute === 0 &&
    !periods[0].close
  ) {
    return {
      isOpen: true,
      badgeText: 'Open 24 Hours',
      todayHoursText: todayHoursText ?? 'Open 24 hours',
    };
  }

  const WEEK_MINUTES = 7 * 1440;
  let isOpenNow = false;

  for (const period of periods) {
    const startMin =
      period.open.day * 1440 + period.open.hour * 60 + period.open.minute;

    if (!period.close) {
      isOpenNow = true;
      break;
    }

    let endMin =
      period.close.day * 1440 + period.close.hour * 60 + period.close.minute;
    if (endMin <= startMin) {
      endMin += WEEK_MINUTES;
    }

    const candidateNow =
      currentWeekMinutes < startMin
        ? currentWeekMinutes + WEEK_MINUTES
        : currentWeekMinutes;

    if (candidateNow >= startMin && candidateNow < endMin) {
      isOpenNow = true;
      break;
    }
  }

  return {
    isOpen: isOpenNow,
    badgeText: isOpenNow ? 'Open Now' : 'Closed',
    todayHoursText,
  };
}

export function haversineDistanceMeters(a: LatLngLiteral, b: LatLngLiteral): number {
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

export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || Number.isNaN(meters)) {
    return '—';
  }
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  return `${km.toFixed(km >= 10 ? 1 : 2)} km`;
}

export function formatDuration(millis: number | null | undefined): string {
  if (
    millis === null ||
    millis === undefined ||
    !Number.isFinite(millis) ||
    millis <= 0
  ) {
    return '—';
  }
  const totalMinutes = Math.max(1, Math.round(millis / 60_000));
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
}

export function formatManeuverLabel(maneuver: string | null | undefined): string {
  if (!maneuver) return 'Continue';
  return maneuver
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
