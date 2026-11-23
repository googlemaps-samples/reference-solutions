import React from 'react';
import type { ClinicVenueData } from '../types';

interface ClinicHeaderProps {
  clinic: ClinicVenueData | null;
  loading: boolean;
  showCoverage: boolean;
  onToggleCoverage: () => void;
  showStreetView: boolean;
  onToggleStreetView: () => void;
}

export const ClinicHeader: React.FC<ClinicHeaderProps> = ({
  clinic,
  loading,
  showCoverage,
  onToggleCoverage,
  showStreetView,
  onToggleStreetView,
}) => {
  const statusClass =
    clinic?.openStatus.isOpen === true
      ? 'open'
      : clinic?.openStatus.isOpen === false
        ? 'closed'
        : 'neutral';

  return (
    <header className="clinic-header">
      <div className="header-brand">
        <div className="brand-mark" aria-hidden="true">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 3c-2.5 0-4 2-4 5 0 3.5 1.8 6.5 2.5 10.5.3 1.7 1.3 2.5 2.3 2.5 1.1 0 1.7-1 2.2-3 .5-2 1.2-3 2-3s1.5 1 2 3c.5 2 1.1 3 2.2 3 1 0 2-.8 2.3-2.5C19.2 14.5 21 11.5 21 8c0-3-1.5-5-4-5-1.8 0-3.2 1-5 1S8.8 3 7 3z" />
          </svg>
        </div>

        <div className="header-title-group">
          <div className="header-title-row">
            <h1 className="clinic-name-heading">
              {loading
                ? 'Loading San Francisco Clinic...'
                : (clinic?.name ?? 'San Francisco Multi-Specialty Dental Clinic')}
            </h1>

            {clinic && (
              <span className={`status-badge ${statusClass}`}>
                <span className="status-dot" />
                {clinic.openStatus.label}
              </span>
            )}

            {clinic?.rating != null && (
              <span
                className="rating-pill"
                aria-label={`Rated ${clinic.rating.toFixed(1)} out of 5 from ${clinic.userRatingCount ?? 0} reviews`}
              >
                <span aria-hidden="true">★</span>
                <span>{clinic.rating.toFixed(1)}</span>
                {clinic.userRatingCount != null && (
                  <span style={{ fontWeight: 500, color: '#64748b' }}>
                    ({clinic.userRatingCount})
                  </span>
                )}
              </span>
            )}
          </div>

          <div className="header-subtitle">
            <span>{clinic?.category ?? 'Multi-Specialty Dental Care'}</span>
            {clinic?.address && (
              <>
                <span aria-hidden="true">•</span>
                <span>{clinic.address}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="header-actions">
        <button
          id="coverage-overlay-toggle"
          data-testid="coverage-overlay-toggle"
          type="button"
          className={`toggle-btn ${showCoverage ? 'active' : ''}`}
          aria-pressed={showCoverage}
          onClick={onToggleCoverage}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>5 km Home Visit Zone</span>
        </button>

        <button
          id="street-view-toggle"
          data-testid="street-view-toggle"
          type="button"
          className={`toggle-btn ${showStreetView ? 'active' : ''}`}
          aria-pressed={showStreetView}
          onClick={onToggleStreetView}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="5" r="2.5" />
            <path d="M12 8v5" />
            <path d="M6 21a6 6 0 0 1 12 0" />
          </svg>
          <span>{showStreetView ? 'Hide Street View' : 'Street View Entrance'}</span>
        </button>
      </div>
    </header>
  );
};
