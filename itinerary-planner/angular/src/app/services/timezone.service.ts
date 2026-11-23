import { Injectable, inject } from '@angular/core';
import { TimeZoneInfo } from '../models/itinerary.models';
import { GoogleMapsLoaderService } from './google-maps-loader.service';

interface TimeZoneApiPayload {
  status: string;
  timeZoneId?: string;
  timeZoneName?: string;
  rawOffset?: number;
  dstOffset?: number;
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TimezoneService {
  private readonly loader = inject(GoogleMapsLoaderService);

  async fetchTimeZone(
    location: google.maps.LatLngLiteral,
    fallbackUtcOffsetMinutes: number | null,
    fallbackTimeZoneId = 'UTC',
    fallbackTimeZoneName = 'Coordinated Universal Time'
  ): Promise<TimeZoneInfo> {
    const timestamp = Math.floor(Date.now() / 1000);
    const locationParam = `${location.lat.toFixed(6)},${location.lng.toFixed(6)}`;

    // 1. Try local BFF proxy (/api/timezone) served by serve-dist.mjs
    try {
      const proxyRes = await fetch(
        `/api/timezone?location=${encodeURIComponent(locationParam)}&timestamp=${timestamp}&language=en`
      );
      if (proxyRes.ok) {
        const contentType = proxyRes.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = (await proxyRes.json()) as TimeZoneApiPayload;
          if (data.status === 'OK' && data.timeZoneId) {
            return this.buildFromApiResponse(data);
          }
        }
      }
    } catch {
      // Fall through to direct REST or Place.utcOffsetMinutes fallback
    }

    // 2. Fallback to direct Time Zone REST API when running via ng serve
    const apiKey = this.loader.getApiKey();
    if (apiKey) {
      try {
        const directUrl = new URL('https://maps.googleapis.com/maps/api/timezone/json');
        directUrl.searchParams.set('location', locationParam);
        directUrl.searchParams.set('timestamp', String(timestamp));
        directUrl.searchParams.set('language', 'en');
        directUrl.searchParams.set('key', apiKey);

        const directRes = await fetch(directUrl.toString());
        if (directRes.ok) {
          const data = (await directRes.json()) as TimeZoneApiPayload;
          if (data.status === 'OK' && data.timeZoneId) {
            return this.buildFromApiResponse(data);
          }
        }
      } catch {
        // Fall through to Place.utcOffsetMinutes fallback
      }
    }

    // 3. Graceful fallback using Place.utcOffsetMinutes from Places API (New)
    if (fallbackUtcOffsetMinutes !== null && Number.isFinite(fallbackUtcOffsetMinutes)) {
      return {
        timeZoneId: fallbackTimeZoneId,
        timeZoneName: fallbackTimeZoneName || 'Local Destination Time',
        rawOffsetSeconds: fallbackUtcOffsetMinutes * 60,
        dstOffsetSeconds: 0,
        totalOffsetMinutes: fallbackUtcOffsetMinutes,
        utcOffsetLabel: this.formatUtcOffset(fallbackUtcOffsetMinutes),
        source: 'place-utc-offset',
      };
    }

    // 4. Preset fallback
    return {
      timeZoneId: fallbackTimeZoneId,
      timeZoneName: fallbackTimeZoneName,
      rawOffsetSeconds: 0,
      dstOffsetSeconds: 0,
      totalOffsetMinutes: 0,
      utcOffsetLabel: 'UTC+00:00',
      source: 'preset-fallback',
    };
  }

  formatLocalClock(
    info: TimeZoneInfo,
    now: Date = new Date()
  ): { timeText: string; dateText: string } {
    if (info.source === 'timezone-api' && info.timeZoneId) {
      try {
        const timeText = new Intl.DateTimeFormat('en-US', {
          timeZone: info.timeZoneId,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(now);
        const dateText = new Intl.DateTimeFormat('en-US', {
          timeZone: info.timeZoneId,
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }).format(now);
        return { timeText, dateText };
      } catch {
        // Fall back to offset arithmetic below
      }
    }

    const shiftedMs = now.getTime() + info.totalOffsetMinutes * 60_000;
    const shifted = new Date(shiftedMs);
    const pad = (n: number) => String(n).padStart(2, '0');
    const timeText = `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}`;
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const dateText = `${weekdays[shifted.getUTCDay()]}, ${months[shifted.getUTCMonth()]} ${shifted.getUTCDate()}`;
    return { timeText, dateText };
  }

  private buildFromApiResponse(data: TimeZoneApiPayload): TimeZoneInfo {
    const rawOffsetSeconds = data.rawOffset ?? 0;
    const dstOffsetSeconds = data.dstOffset ?? 0;
    const totalOffsetMinutes = Math.round((rawOffsetSeconds + dstOffsetSeconds) / 60);
    return {
      timeZoneId: data.timeZoneId || 'UTC',
      timeZoneName: data.timeZoneName || 'Local Time',
      rawOffsetSeconds,
      dstOffsetSeconds,
      totalOffsetMinutes,
      utcOffsetLabel: this.formatUtcOffset(totalOffsetMinutes),
      source: 'timezone-api',
    };
  }

  formatUtcOffset(offsetMinutes: number): string {
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const abs = Math.abs(offsetMinutes);
    const hours = String(Math.floor(abs / 60)).padStart(2, '0');
    const mins = String(abs % 60).padStart(2, '0');
    return `UTC${sign}${hours}:${mins}`;
  }
}
