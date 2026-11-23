import React from 'react';
import { ExternalLink, MapPin, MountainSnow, Star } from 'lucide-react';
import type { SelectedLandmark } from '../types/explorer';

interface SelectedViewpointCardProps {
  landmark: SelectedLandmark | null;
  isLoading: boolean;
}

export const SelectedViewpointCard: React.FC<SelectedViewpointCardProps> = ({
  landmark,
  isLoading
}) => {
  return (
    <section
      data-testid="selected-viewpoint-card"
      className="panel-card viewpoint-card"
      aria-label="Selected Viewpoint or Landmark Details"
    >
      <div className="panel-header">
        <div className="panel-title-group">
          <MapPin size={15} className="panel-icon" />
          <h2 className="panel-title">
            {landmark?.kind === 'place'
              ? 'Searched Landmark'
              : 'Active Trail Viewpoint'}
          </h2>
        </div>
        {landmark?.elevationM != null && (
          <span className="elevation-pill">
            <MountainSnow size={12} />
            {Math.round(landmark.elevationM).toLocaleString()} m
          </span>
        )}
      </div>

      {isLoading && !landmark ? (
        <div className="viewpoint-skeleton">
          Loading live Places &amp; Elevation telemetry...
        </div>
      ) : landmark ? (
        <div className="viewpoint-body">
          <div className="viewpoint-heading-row">
            <h3 className="viewpoint-name">{landmark.name}</h3>
            {landmark.rating != null && (
              <span className="rating-pill" title="Google Maps rating">
                <Star size={12} fill="currentColor" />
                <span>{landmark.rating.toFixed(1)}</span>
                {landmark.userRatingCount != null && (
                  <span className="rating-count">
                    ({landmark.userRatingCount.toLocaleString()})
                  </span>
                )}
              </span>
            )}
          </div>

          <p className="viewpoint-subtitle">{landmark.subtitle}</p>

          {landmark.editorialSummary && (
            <p className="viewpoint-summary">{landmark.editorialSummary}</p>
          )}

          {landmark.address && (
            <p className="viewpoint-address">{landmark.address}</p>
          )}

          <div className="viewpoint-footer">
            <span className="coord-chip">
              {landmark.lat.toFixed(4)}° N, {Math.abs(landmark.lng).toFixed(4)}° W
            </span>

            {landmark.googleMapsURI && (
              <a
                href={landmark.googleMapsURI}
                target="_blank"
                rel="noopener noreferrer"
                className="maps-link"
              >
                <span>Open in Google Maps</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
      ) : (
        <p className="viewpoint-empty">
          Select a tour chapter, click a 3D pin, or search any Lake Tahoe landmark.
        </p>
      )}
    </section>
  );
};
