import { useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Clock, Globe } from 'lucide-react';
import { DESTINATION_PRESETS } from '../constants/destinations';
import { fetchSelectedAutocompletePlace } from '../services/placesService';
import type { PlaceItem, TimeZoneState } from '../types/itinerary';
import { formatDestinationTime } from '../utils/formatters';

interface DestinationHeaderProps {
  destinationId: string;
  destinationLabel: string;
  timezone: TimeZoneState;
  nowMs: number;
  onSelectPreset: (presetId: string) => void;
  onAutocompleteSelect: (place: PlaceItem, utcOffsetMinutes: number | null) => void;
}

export function DestinationHeader({
  destinationId,
  destinationLabel,
  timezone,
  nowMs,
  onSelectPreset,
  onAutocompleteSelect,
}: DestinationHeaderProps) {
  const placesLib = useMapsLibrary('places');
  const autocompleteHostRef = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(onAutocompleteSelect);
  callbackRef.current = onAutocompleteSelect;

  useEffect(() => {
    const host = autocompleteHostRef.current;
    if (!placesLib || !host) return;

    const autocompleteElement = new placesLib.PlaceAutocompleteElement({
      requestedLanguage: 'en',
    });
    autocompleteElement.setAttribute(
      'placeholder',
      'Search city or landmark (e.g. Tokyo, Kyoto, Paris)...',
    );
    autocompleteElement.setAttribute(
      'aria-label',
      'Search destination city or landmark',
    );

    const handleSelect = async (event: Event) => {
      const selectEvent =
        event as google.maps.places.PlacePredictionSelectEvent;
      if (!selectEvent.placePrediction) return;
      try {
        const place = selectEvent.placePrediction.toPlace();
        const result = await fetchSelectedAutocompletePlace(place);
        if (result) {
          callbackRef.current(result.item, result.utcOffsetMinutes);
        }
      } catch {
        // Ignore transient autocomplete selection errors gracefully
      }
    };

    autocompleteElement.addEventListener('gmp-select', handleSelect);
    host.replaceChildren(autocompleteElement);

    return () => {
      autocompleteElement.removeEventListener('gmp-select', handleSelect);
      host.replaceChildren();
    };
  }, [placesLib]);

  const { timeStr, dateStr } = formatDestinationTime(nowMs, timezone);

  return (
    <header className="app-header">
      <div className="brand-block">
        <div className="brand-icon" aria-hidden="true">
          <Globe size={18} />
        </div>
        <div>
          <h1 className="brand-title">Trip Itinerary Planner</h1>
          <p className="brand-subtitle">Hotels, Routes &amp; Time Zone Hub</p>
        </div>
      </div>

      <div className="header-controls">
        <div className="autocomplete-wrapper">
          <div
            ref={autocompleteHostRef}
            data-testid="destination-search-input"
            className="autocomplete-host"
          />
        </div>

        <select
          data-testid="destination-quick-select"
          className="quick-select"
          aria-label="Quick destination selector"
          value={destinationId}
          onChange={(e) => onSelectPreset(e.target.value)}
        >
          {DESTINATION_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
          {destinationId === 'custom' && (
            <option value="custom">{destinationLabel}</option>
          )}
        </select>
      </div>

      <div
        data-testid="timezone-hub"
        className="timezone-hub"
        aria-live="polite"
        title={`Source: ${
          timezone.source === 'timezone-api'
            ? 'Google Time Zone API'
            : 'Places API UTC Offset'
        }`}
      >
        <div className="tz-clock-group">
          <div className="tz-time-row">
            <Clock size={14} />
            <span>{timeStr}</span>
            <span className="tz-offset-badge">{timezone.utcOffsetLabel}</span>
          </div>
          <div className="tz-meta-row">
            {destinationLabel} · {dateStr} ·{' '}
            {timezone.timeZoneId
              ? `${timezone.timeZoneName} (${timezone.timeZoneId})`
              : timezone.timeZoneName}
          </div>
        </div>
      </div>
    </header>
  );
}
