'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { formatDestinationLocalTime, formatUtcOffset } from '@/lib/formatters';
import { TimeZoneInfo } from '@/types/itinerary';

interface TimeZoneHubProps {
  destinationName: string;
  timeZoneInfo: TimeZoneInfo | null;
  loading: boolean;
}

export function TimeZoneHub({
  destinationName,
  timeZoneInfo,
  loading,
}: TimeZoneHubProps) {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const totalOffsetSeconds = timeZoneInfo
    ? timeZoneInfo.rawOffset + timeZoneInfo.dstOffset
    : 9 * 3600;
  const utcLabel = formatUtcOffset(totalOffsetSeconds);
  const localClock = timeZoneInfo
    ? formatDestinationLocalTime(
        nowMs,
        timeZoneInfo.rawOffset,
        timeZoneInfo.dstOffset,
        timeZoneInfo.timeZoneId
      )
    : '--:--:--';

  return (
    <div
      data-testid="timezone-hub"
      className="timezone-pill"
      aria-live="polite"
      title={
        timeZoneInfo
          ? `${timeZoneInfo.timeZoneId} (${timeZoneInfo.timeZoneName})`
          : `Time Zone Hub for ${destinationName}`
      }
    >
      <Clock size={15} color="#5eead4" aria-hidden="true" />
      <span className="timezone-clock">
        {loading && !timeZoneInfo ? 'Syncing…' : localClock}
      </span>
      <span className="timezone-meta">
        <span>{timeZoneInfo?.timeZoneName || `${destinationName} Time`}</span>
        <span className="utc-badge">{utcLabel}</span>
      </span>
    </div>
  );
}
