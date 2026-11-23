import { useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CloudRain,
  MapPin,
  Mountain,
  Send,
  Wind,
} from 'lucide-react';
import { HAZARD_TYPE_OPTIONS } from '../data/miamiHazards';
import type { HazardType, IncidentDraft, LatLngPoint } from '../types/hazard';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';

interface IncidentReporterCardProps {
  draft: IncidentDraft | null;
  lastSubmittedId: string | null;
  onSelectAddressLocation: (location: LatLngPoint, label: string) => void;
  onSubmitReport: (payload: {
    type: HazardType;
    weight: number;
    note: string;
  }) => void;
}

export function IncidentReporterCard({
  draft,
  lastSubmittedId,
  onSelectAddressLocation,
  onSubmitReport,
}: IncidentReporterCardProps) {
  const [hazardType, setHazardType] = useState<HazardType>('Street Flooding');
  const [severityWeight, setSeverityWeight] = useState<number>(7);
  const [note, setNote] = useState<string>('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    onSubmitReport({
      type: hazardType,
      weight: severityWeight,
      note: note.trim(),
    });
    setNote('');
  };

  return (
    <section
      id="incident-report-panel"
      data-testid="incident-report-panel"
      className="sidebar-card"
      aria-labelledby="incident-panel-heading"
    >
      <div className="card-header">
        <div className="card-title-row">
          <AlertTriangle size={17} className="text-crimson" />
          <h2 id="incident-panel-heading">Civic Incident Reporter</h2>
        </div>
        <span className="card-badge">Click Map to Enrich</span>
      </div>

      <p className="card-hint">
        Click anywhere on the Miami map (or select an address below) to auto-populate reverse-geocoded street address, terrain elevation, and live weather.
      </p>

      <div className="autocomplete-wrapper">
        <label className="field-label">Locate Miami Address (Places Autocomplete)</label>
        <PlaceAutocompleteInput onSelectLocation={onSelectAddressLocation} />
      </div>

      {draft ? (
        <div className="enrichment-box">
          <div className="enrichment-row">
            <MapPin size={15} className="text-crimson shrink-0" />
            <div className="enrichment-content">
              <div className="enrichment-label">
                Street Address &amp; Coordinates
                {draft.loading && <span className="loading-dot">Enriching...</span>}
              </div>
              <div className="enrichment-value">{draft.address}</div>
              <div className="enrichment-sub">
                {draft.location.lat.toFixed(5)}, {draft.location.lng.toFixed(5)}
                {draft.insideFloodZoneName && (
                  <span className="zone-alert-chip">Inside: {draft.insideFloodZoneName}</span>
                )}
              </div>
            </div>
          </div>

          <div className="telemetry-grid">
            <div className="telemetry-tile">
              <div className="telemetry-label">
                <Mountain size={13} />
                <span>Elevation</span>
              </div>
              <div className="telemetry-val">
                {draft.elevationMeters !== null ? `${draft.elevationMeters.toFixed(2)} m` : 'Pending...'}
              </div>
              <div className="telemetry-note">
                {draft.elevationMeters !== null
                  ? draft.elevationMeters < 2.0
                    ? 'Low-lying surge risk'
                    : 'Moderate grade'
                  : 'Elevation API'}
              </div>
            </div>

            <div className="telemetry-tile">
              <div className="telemetry-label">
                <Wind size={13} />
                <span>Wind &amp; Gusts</span>
              </div>
              <div className="telemetry-val">
                {draft.weather?.windSpeedKmh !== null && draft.weather?.windSpeedKmh !== undefined
                  ? `${Math.round(draft.weather.windSpeedKmh)} km/h ${draft.weather.windCardinal}`
                  : '--'}
              </div>
              <div className="telemetry-note">
                {draft.weather?.windGustKmh !== null && draft.weather?.windGustKmh !== undefined
                  ? `Gusts ${Math.round(draft.weather.windGustKmh)} km/h`
                  : draft.weather?.unavailableReason ?? 'Weather API'}
              </div>
            </div>

            <div className="telemetry-tile">
              <div className="telemetry-label">
                <CloudRain size={13} />
                <span>Precipitation</span>
              </div>
              <div className="telemetry-val">
                {draft.weather?.precipPercent !== null && draft.weather?.precipPercent !== undefined
                  ? `${draft.weather.precipPercent}%`
                  : '--'}
              </div>
              <div className="telemetry-note">
                {draft.weather?.precipQpfMm !== null && draft.weather?.precipQpfMm !== undefined
                  ? `${draft.weather.precipQpfMm} mm/hr • ${draft.weather.conditionText}`
                  : draft.weather?.conditionText ?? 'Live conditions'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="empty-state-box">
          Click any street or flood zone on the map to drop an incident pin.
        </div>
      )}

      <form onSubmit={handleSubmit} className="incident-form">
        <div className="form-row-2">
          <div>
            <label htmlFor="incident-type-select" className="field-label">
              Hazard Category
            </label>
            <select
              id="incident-type-select"
              data-testid="incident-type-select"
              className="form-select"
              value={hazardType}
              onChange={(e) => setHazardType(e.target.value as HazardType)}
            >
              {HAZARD_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="incident-severity-select" className="field-label">
              Severity Weight
            </label>
            <select
              id="incident-severity-select"
              className="form-select"
              value={severityWeight}
              onChange={(e) => setSeverityWeight(Number(e.target.value))}
            >
              <option value={4}>Moderate (4)</option>
              <option value={7}>High (7)</option>
              <option value={10}>Critical (10)</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="incident-note-input" className="field-label">
            Field Observation (optional)
          </label>
          <input
            id="incident-note-input"
            type="text"
            className="form-input"
            placeholder="e.g., Knee-deep water blocking northbound lane"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={140}
          />
        </div>

        <button
          id="incident-submit-btn"
          data-testid="incident-submit-btn"
          type="submit"
          className="submit-incident-btn"
          disabled={!draft}
        >
          <Send size={15} />
          <span>Log Hazard Report to Heatmap</span>
        </button>

        {lastSubmittedId && (
          <div className="submit-success-banner" role="status">
            <CheckCircle2 size={14} />
            <span>Incident added to live Miami HeatmapLayer.</span>
          </div>
        )}
      </form>
    </section>
  );
}
