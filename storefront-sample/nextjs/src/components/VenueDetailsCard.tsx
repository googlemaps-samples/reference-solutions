'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Globe,
  MapPin,
  Phone,
  Star,
} from 'lucide-react';
import type { ClinicPlaceDetails } from '@/lib/types';

interface VenueDetailsCardProps {
  clinic: ClinicPlaceDetails | null;
  loading: boolean;
  error: string | null;
}

export function VenueDetailsCard({ clinic, loading, error }: VenueDetailsCardProps) {
  const [hoursExpanded, setHoursExpanded] = useState(false);

  return (
    <section className="panel-card" data-testid="venue-details-panel">
      <div className="card-header">
        <div>
          <div className="card-eyebrow">Live Google Places Storefront</div>
          <h1 className="card-title">
            {clinic?.displayName ?? 'Loading clinic details...'}
          </h1>
        </div>
        {clinic?.openNow === true && <span className="status-pill open">Open Now</span>}
        {clinic?.openNow === false && <span className="status-pill closed">Closed</span>}
      </div>

      {loading && !clinic && (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Fetching live clinic rating, opening hours, photos, and patient reviews from Places API (New)...
        </p>
      )}

      {error && !clinic && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      {clinic && (
        <>
          {typeof clinic.rating === 'number' && (
            <div className="rating-row">
              <span className="rating-score">{clinic.rating.toFixed(1)}</span>
              <span className="stars-row" aria-label={`Rated ${clinic.rating} out of 5`}>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star
                    key={idx}
                    size={14}
                    fill={idx < Math.round(clinic.rating ?? 0) ? '#f59e0b' : 'none'}
                    stroke="#f59e0b"
                  />
                ))}
              </span>
              {typeof clinic.userRatingCount === 'number' && (
                <span className="rating-count">
                  ({clinic.userRatingCount.toLocaleString()} Google reviews)
                </span>
              )}
            </div>
          )}

          <div className="venue-meta-list">
            <div className="venue-meta-item">
              <MapPin size={15} />
              <span>{clinic.formattedAddress}</span>
            </div>
            {clinic.nationalPhoneNumber && (
              <div className="venue-meta-item">
                <Phone size={15} />
                <span>{clinic.nationalPhoneNumber}</span>
              </div>
            )}
            {clinic.websiteUri && (
              <div className="venue-meta-item">
                <Globe size={15} />
                <a
                  href={clinic.websiteUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="google-maps-link"
                >
                  {clinic.websiteUri.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                </a>
              </div>
            )}
          </div>

          {clinic.photos.length > 0 && (
            <div className="photo-strip" aria-label="Clinic photos from Google Places">
              {clinic.photos.slice(0, 3).map((photo, index) => (
                <div className="photo-thumb-wrap" key={photo.name || index}>
                  <img
                    className="photo-thumb"
                    src={
                      photo.directUri ||
                      `/api/places/photo?name=${encodeURIComponent(photo.name)}&maxWidthPx=640`
                    }
                    alt={`${clinic.displayName} photo ${index + 1}`}
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}

          {clinic.weekdayDescriptions.length > 0 && (
            <div>
              <button
                type="button"
                className="hours-toggle-btn"
                aria-expanded={hoursExpanded}
                onClick={() => setHoursExpanded((prev) => !prev)}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={14} />
                  Weekly Opening Hours
                </span>
                {hoursExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              {hoursExpanded && (
                <ul className="hours-list" style={{ marginTop: 6 }}>
                  {clinic.weekdayDescriptions.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: 8,
              }}
            >
              Patient Reviews (Google Places)
            </div>

            <div className="reviews-list" data-testid="venue-reviews-list">
              {clinic.reviews.length === 0 ? (
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  No recent Google reviews returned for this listing.
                </p>
              ) : (
                clinic.reviews.slice(0, 3).map((review, index) => (
                  <article className="review-card" key={`${review.authorName}-${index}`}>
                    <div className="review-top">
                      <span className="review-author">{review.authorName}</span>
                      <span className="stars-row" aria-label={`${review.rating} stars`}>
                        {Array.from({ length: 5 }).map((_, starIdx) => (
                          <Star
                            key={starIdx}
                            size={12}
                            fill={starIdx < review.rating ? '#f59e0b' : 'none'}
                            stroke="#f59e0b"
                          />
                        ))}
                      </span>
                    </div>
                    {review.relativePublishTimeDescription && (
                      <div className="review-time">
                        {review.relativePublishTimeDescription}
                      </div>
                    )}
                    {review.text && <p className="review-text">{review.text}</p>}
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="google-attribution-row">
            <span>Place data powered by Google</span>
            {clinic.googleMapsUri && (
              <a
                href={clinic.googleMapsUri}
                target="_blank"
                rel="noopener noreferrer"
                className="google-maps-link"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <span>Open in Google Maps</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </>
      )}
    </section>
  );
}
