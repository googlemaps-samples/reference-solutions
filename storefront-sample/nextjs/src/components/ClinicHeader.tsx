'use client';

import { Eye, MapPin, Phone, Radar } from 'lucide-react';
import type { ClinicPlaceDetails, ViewMode } from '@/lib/types';

interface ClinicHeaderProps {
  clinic: ClinicPlaceDetails | null;
  showCoverage: boolean;
  onToggleCoverage: () => void;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
}

export function ClinicHeader({
  clinic,
  showCoverage,
  onToggleCoverage,
  viewMode,
  onChangeViewMode,
}: ClinicHeaderProps) {
  const clinicTitle = clinic?.displayName ?? '450 Sutter Dental Studio';
  const streetViewActive = viewMode !== 'map';

  return (
    <header className="clinic-header" data-testid="clinic-header">
      <div className="header-brand">
        <div className="brand-mark" aria-hidden="true">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3v18" />
            <path d="M3 12h18" />
          </svg>
        </div>

        <div className="brand-copy">
          <div className="brand-title-row">
            <span className="brand-title">{clinicTitle}</span>
            {clinic?.openNow === true && (
              <span className="status-pill open">Open Now</span>
            )}
            {clinic?.openNow === false && (
              <span className="status-pill closed">Closed Now</span>
            )}
            {clinic?.openNow === undefined && (
              <span className="status-pill neutral">San Francisco, CA</span>
            )}
          </div>

          <div className="brand-meta">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={12} />
              {clinic?.formattedAddress ?? 'Union Square Multi-Specialty Dental Hub'}
            </span>
            {clinic?.nationalPhoneNumber && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Phone size={12} />
                {clinic.nationalPhoneNumber}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="header-actions">
        <button
          type="button"
          data-testid="coverage-overlay-toggle"
          className={`toggle-btn ${showCoverage ? 'active' : ''}`}
          aria-pressed={showCoverage}
          onClick={onToggleCoverage}
        >
          <Radar size={15} />
          <span>{showCoverage ? 'Home-Visit Zone: On' : 'Home-Visit Zone: Off'}</span>
        </button>

        <button
          type="button"
          data-testid="street-view-toggle"
          className={`toggle-btn ${streetViewActive ? 'active' : ''}`}
          aria-pressed={streetViewActive}
          onClick={() => onChangeViewMode(streetViewActive ? 'map' : 'split')}
        >
          <Eye size={15} />
          <span>{streetViewActive ? 'Hide Entrance View' : 'Street View Entrance'}</span>
        </button>

        <div className="view-switcher" role="group" aria-label="Viewport layout mode">
          <button
            type="button"
            className={`view-pill ${viewMode === 'map' ? 'active' : ''}`}
            onClick={() => onChangeViewMode('map')}
          >
            Map
          </button>
          <button
            type="button"
            className={`view-pill ${viewMode === 'split' ? 'active' : ''}`}
            onClick={() => onChangeViewMode('split')}
          >
            Split
          </button>
          <button
            type="button"
            className={`view-pill ${viewMode === 'street-view' ? 'active' : ''}`}
            onClick={() => onChangeViewMode('street-view')}
          >
            Street View
          </button>
        </div>
      </div>
    </header>
  );
}
