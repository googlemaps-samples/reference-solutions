import type { TimeZoneState } from '../types/itinerary';

export function formatUtcOffset(totalSeconds: number): string {
  const sign = totalSeconds >= 0 ? '+' : '-';
  const absMinutes = Math.round(Math.abs(totalSeconds) / 60);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  return `UTC${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatDestinationTime(
  nowMs: number,
  tz: TimeZoneState,
): { timeStr: string; dateStr: string } {
  if (tz.timeZoneId) {
    try {
      const timeStr = new Intl.DateTimeFormat('en-US', {
        timeZone: tz.timeZoneId,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(nowMs);

      const dateStr = new Intl.DateTimeFormat('en-US', {
        timeZone: tz.timeZoneId,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).format(nowMs);

      return { timeStr, dateStr };
    } catch {
      // Fall through to offset math if IANA zone is unrecognized
    }
  }

  const shifted = new Date(nowMs + tz.totalOffsetSeconds * 1000);
  const timeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(shifted);

  const dateStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(shifted);

  return { timeStr, dateStr };
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return '0 m';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(millis: number): string {
  if (!Number.isFinite(millis) || millis <= 0) return '0 min';
  const totalMinutes = Math.max(1, Math.round(millis / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

export function formatPriceLevel(priceLevel?: string | null): string | null {
  if (!priceLevel) return null;
  const normalized = priceLevel.toUpperCase();
  if (normalized.includes('FREE')) return 'Free';
  if (normalized.includes('VERY_EXPENSIVE') || normalized === 'VERY EXPENSIVE') return '$$$$';
  if (normalized.includes('EXPENSIVE')) return '$$$';
  if (normalized.includes('MODERATE')) return '$$';
  if (normalized.includes('INEXPENSIVE')) return '$';
  return null;
}

export function getTodayHoursSummary(weekdayDescriptions: string[]): string | null {
  if (!weekdayDescriptions || weekdayDescriptions.length === 0) return null;
  // weekdayDescriptions starts with Monday (index 0) .. Sunday (index 6)
  const jsDay = new Date().getDay(); // 0 = Sunday, 1 = Monday...
  const idx = jsDay === 0 ? 6 : jsDay - 1;
  return weekdayDescriptions[idx] ?? weekdayDescriptions[0] ?? null;
}
