import React, { useState } from 'react';
import type { ClinicVenueData } from '../types';
import { COVERAGE_RADIUS_METERS, formatDistanceMeters } from '../utils/geo';

interface VenueStorefrontCardProps {
  clinic: ClinicVenueData | null;
  loading: boolean;
  error: string | null;
  distanceFromOriginMeters: number | null;
  originName: string | null;
}

export const VenueStorefrontCard: React.FC<VenueStorefrontCardProps> = ({
  clinic,
  loading,
  error,
  distanceFromOriginMeters,
  originName,
}) => {
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState(0);
  const [showAllHours, setShowAllHours] = useState(false);

  const activePhoto = clinic?.photos[selectedPhotoIdx] ?? clinic?.photos[0] ?? null;
  const withinCoverage =
    distanceFromOriginMeters != null &&
    distanceFromOriginMeters <= COVERAGE_RADIUS_METERS;

  return (
    <section
      id="venue-details-panel"
      data-testid="venue-details-panel"
      className="card"
      aria-label="Live Clinic Storefront Details"
    >
      <div className="card-header">
        <h2 className="card-title">Clinic Storefront</h2>
        <span className="card-badge">Places API (New)</span>
      </div>

      {error && <div className="error-inline">{error}</div>}

      <div className="venue-hero">
        {activePhoto ? (
          <>
            <img
              src={activePhoto.url}
              alt={clinic ? `${clinic.name} storefront` : 'Dental clinic photo'}
            />
            {activePhoto.authorName && (
              <div className="venue-photo-credit">
                Photo:{' '}
                {activePhoto.authorUri ? (
                  <a
                    href={activePhoto.authorUri}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {activePhoto.authorName}
                  </a>
                ) : (
                  activePhoto.authorName
                )}
              </div>
            )}
          </>
        ) : (
          <div className="venue-hero-fallback">
            <span>
              {loading
                ? 'Fetching live clinic photos...'
                : 'San Francisco Multi-Specialty Dental Clinic'}
            </span>
          </div>
        )}
      </div>

      {clinic && clinic.photos.length > 1 && (
        <div className="venue-gallery" role="list" aria-label="Clinic photos">
          {clinic.photos.slice(0, 5).map((photo, index) => (
            <button
              key={photo.url}
              type="button"
              className={`venue-thumb-btn ${index === selectedPhotoIdx ? 'active' : ''}`}
              onClick={() => setSelectedPhotoIdx(index)}
              aria-label={`View clinic photo ${index + 1}`}
            >
              <img src={photo.url} alt={`${clinic.name} thumbnail ${index + 1}`} />
            </button>
          ))}
        </div>
      )}

      {loading && !clinic ? (
        <p className="muted-note">Loading live business details from Google Places...</p>
      ) : clinic ? (
        <div className="venue-meta-list">
          <div className="venue-meta-item">
            <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>
              {clinic.name}
            </strong>
          </div>

          <div className="venue-meta-item">
            <span aria-hidden="true">📍</span>
            <span>{clinic.address}</span>
          </div>

          {clinic.phone && (
            <div className="venue-meta-item">
              <span aria-hidden="true">📞</span>
              <a href={`tel:${clinic.phone.replace(/[^\d+]/g, '')}`}>
                {clinic.phone}
              </a>
            </div>
          )}

          {clinic.websiteUri && (
            <div className="venue-meta-item">
              <span aria-hidden="true">🌐</span>
              <a href={clinic.websiteUri} target="_blank" rel="noreferrer">
                {clinic.websiteUri.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            </div>
          )}

          {clinic.googleMapsUri && (
            <div className="venue-meta-item">
              <span aria-hidden="true">🗺️</span>
              <a href={clinic.googleMapsUri} target="_blank" rel="noreferrer">
                View listing on Google Maps
              </a>
            </div>
          )}

          {clinic.weekdayDescriptions.length > 0 && (
            <div>
              <div className="venue-meta-item">
                <span aria-hidden="true">🕒</span>
                <div>
                  <span>
                    <strong>{clinic.openStatus.label}</strong>
                  </span>{' '}
                  <button
                    type="button"
                    className="hours-toggle-btn"
                    onClick={() => setShowAllHours((prev) => !prev)}
                  >
                    {showAllHours ? 'Hide weekly hours' : 'Show weekly hours'}
                  </button>
                </div>
              </div>

              {showAllHours && (
                <ul className="hours-list">
                  {clinic.weekdayDescriptions.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      ) : null}

      <div className="coverage-notice">
        <span aria-hidden="true">🚐</span>
        <div>
          <strong>5 km Mobile Home-Visit Coverage:</strong>{' '}
          {distanceFromOriginMeters != null && originName ? (
            withinCoverage ? (
              <span>
                {originName} is{' '}
                <strong>{formatDistanceMeters(distanceFromOriginMeters)}</strong>{' '}
                away — eligible for mobile dental home visits.
              </span>
            ) : (
              <span>
                {originName} is{' '}
                <strong>{formatDistanceMeters(distanceFromOriginMeters)}</strong>{' '}
                away — outside the 5 km home-visit zone (in-clinic visits available).
              </span>
            )
          ) : (
            <span>
              Available within a 5,000 m radius across central San Francisco.
            </span>
          )}
        </div>
      </div>
    </section>
  );
};
