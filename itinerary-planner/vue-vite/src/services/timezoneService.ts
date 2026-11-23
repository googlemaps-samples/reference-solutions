import type { CityPreset, LatLngPoint, TimeZoneInfo } from '../types/itinerary';
import { getApiKey } from './mapsLoader';

interface GoogleTimeZoneApiResponse {
  status: string;
  dstOffset?: number;
  rawOffset?: number;
  timeZoneId?: string;
  timeZoneName?: string;
  errorMessage?: string;
}

export function formatUtcOffsetLabel(totalMinutes: number): string {
  const sign = totalMinutes >= 0 ? '+' : '-';
  const absMins = Math.abs(Math.round(totalMinutes));
  const hours = Math.floor(absMins / 60);
  const mins = absMins % 60;
  return `UTC${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function formatDestinationLocalTime(totalOffsetMinutes: number, nowMs: number = Date.now()): {
  timeString: string;
  dateString: string;
} {
  const shifted = new Date(nowMs + totalOffsetMinutes * 60_000);
  const hours = String(shifted.getUTCHours()).padStart(2, '0');
  const minutes = String(shifted.getUTCMinutes()).padStart(2, '0');
  const seconds = String(shifted.getUTCSeconds()).padStart(2, '0');

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateString = `${weekdays[shifted.getUTCDay()]}, ${months[shifted.getUTCMonth()]} ${shifted.getUTCDate()}`;

  return {
    timeString: `${hours}:${minutes}:${seconds}`,
    dateString,
  };
}

export async function fetchTimeZoneForLocation(
  location: LatLngPoint,
  placeUtcOffsetMinutes?: number | null,
  matchedPreset?: CityPreset | null
): Promise<TimeZoneInfo> {
  const apiKey = getApiKey();
  const timestamp = Math.floor(Date.now() / 1000);

  if (apiKey && apiKey !== 'your_google_maps_api_key_here') {
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/timezone/json');
      url.searchParams.set('location', `${location.lat},${location.lng}`);
      url.searchParams.set('timestamp', String(timestamp));
      url.searchParams.set('key', apiKey);

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = (await res.json()) as GoogleTimeZoneApiResponse;
        if (
          data.status === 'OK' &&
          typeof data.rawOffset === 'number' &&
          typeof data.dstOffset === 'number'
        ) {
          const totalOffsetMinutes = Math.round((data.rawOffset + data.dstOffset) / 60);
          return {
            timeZoneId: data.timeZoneId ?? 'Local',
            timeZoneName: data.timeZoneName ?? formatUtcOffsetLabel(totalOffsetMinutes),
            rawOffsetSeconds: data.rawOffset,
            dstOffsetSeconds: data.dstOffset,
            totalOffsetMinutes,
            utcOffsetLabel: formatUtcOffsetLabel(totalOffsetMinutes),
            source: 'timezone-api',
          };
        }
      }
    } catch {
      // Graceful fallback to Place.utcOffsetMinutes or preset below
    }
  }

  if (typeof placeUtcOffsetMinutes === 'number') {
    const label = formatUtcOffsetLabel(placeUtcOffsetMinutes);
    return {
      timeZoneId: matchedPreset?.fallbackTimeZoneId ?? label,
      timeZoneName: matchedPreset?.fallbackTimeZoneName ?? `Destination Time (${label})`,
      rawOffsetSeconds: placeUtcOffsetMinutes * 60,
      dstOffsetSeconds: 0,
      totalOffsetMinutes: placeUtcOffsetMinutes,
      utcOffsetLabel: label,
      source: 'place-offset',
    };
  }

  if (matchedPreset) {
    const label = formatUtcOffsetLabel(matchedPreset.fallbackUtcOffsetMinutes);
    return {
      timeZoneId: matchedPreset.fallbackTimeZoneId,
      timeZoneName: matchedPreset.fallbackTimeZoneName,
      rawOffsetSeconds: matchedPreset.fallbackUtcOffsetMinutes * 60,
      dstOffsetSeconds: 0,
      totalOffsetMinutes: matchedPreset.fallbackUtcOffsetMinutes,
      utcOffsetLabel: label,
      source: 'preset',
    };
  }

  const approxOffsetMinutes = Math.round(location.lng / 15) * 60;
  const label = formatUtcOffsetLabel(approxOffsetMinutes);
  return {
    timeZoneId: label,
    timeZoneName: `Estimated Solar Zone (${label})`,
    rawOffsetSeconds: approxOffsetMinutes * 60,
    dstOffsetSeconds: 0,
    totalOffsetMinutes: approxOffsetMinutes,
    utcOffsetLabel: label,
    source: 'preset',
  };
}
