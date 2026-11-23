import type { LatLngPoint, TimeZoneState } from '../types/itinerary';
import { formatUtcOffset } from '../utils/formatters';

interface TimeZoneProxyResponse {
  status: string;
  timeZoneId?: string;
  timeZoneName?: string;
  rawOffset?: number;
  dstOffset?: number;
  errorMessage?: string;
}

export async function fetchDestinationTimeZone(
  location: LatLngPoint,
  fallbackUtcOffsetMinutes: number | null,
): Promise<TimeZoneState> {
  const timestamp = Math.floor(Date.now() / 1000);

  try {
    const params = new URLSearchParams({
      lat: String(location.lat),
      lng: String(location.lng),
      timestamp: String(timestamp),
    });

    const response = await fetch(`/api/timezone?${params.toString()}`);
    if (response.ok) {
      const data = (await response.json()) as TimeZoneProxyResponse;
      if (
        data.status === 'OK' &&
        typeof data.rawOffset === 'number' &&
        data.timeZoneId
      ) {
        const dstOffsetSeconds = data.dstOffset ?? 0;
        const totalOffsetSeconds = data.rawOffset + dstOffsetSeconds;
        return {
          timeZoneId: data.timeZoneId,
          timeZoneName: data.timeZoneName ?? data.timeZoneId,
          rawOffsetSeconds: data.rawOffset,
          dstOffsetSeconds,
          totalOffsetSeconds,
          utcOffsetLabel: formatUtcOffset(totalOffsetSeconds),
          source: 'timezone-api',
        };
      }
    }
  } catch {
    // Fall back gracefully to Place.utcOffsetMinutes when Time Zone endpoint is unavailable
  }

  if (fallbackUtcOffsetMinutes !== null) {
    const totalOffsetSeconds = fallbackUtcOffsetMinutes * 60;
    return {
      timeZoneId: null,
      timeZoneName: 'Destination Local Time',
      rawOffsetSeconds: totalOffsetSeconds,
      dstOffsetSeconds: 0,
      totalOffsetSeconds,
      utcOffsetLabel: formatUtcOffset(totalOffsetSeconds),
      source: 'places-fallback',
    };
  }

  return {
    timeZoneId: null,
    timeZoneName: 'Destination Time',
    rawOffsetSeconds: 0,
    dstOffsetSeconds: 0,
    totalOffsetSeconds: 0,
    utcOffsetLabel: 'UTC+00:00',
    source: 'places-fallback',
  };
}
