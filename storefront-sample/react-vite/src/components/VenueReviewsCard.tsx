import React from 'react';
import type { ClinicVenueData } from '../types';

interface VenueReviewsCardProps {
  clinic: ClinicVenueData | null;
  loading: boolean;
}

export const VenueReviewsCard: React.FC<VenueReviewsCardProps> = ({
  clinic,
  loading,
}) => {
  const reviews = clinic?.reviews ?? [];

  return (
    <section
      id="venue-reviews-list"
      data-testid="venue-reviews-list"
      className="card"
      aria-label="Google Patient Reviews"
    >
      <div className="card-header">
        <h2 className="card-title">Patient Reviews</h2>
        {clinic?.rating != null && (
          <span className="card-badge">
            ★ {clinic.rating.toFixed(1)} ({clinic.userRatingCount ?? reviews.length})
          </span>
        )}
      </div>

      {loading && !clinic ? (
        <p className="muted-note">Loading live Google patient reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="muted-note">No patient reviews returned for this clinic yet.</p>
      ) : (
        <div className="reviews-list">
          {reviews.slice(0, 4).map((review, index) => (
            <article key={`${review.authorName}-${index}`} className="review-card">
              <div className="review-top">
                <span className="review-author">
                  {review.authorUri ? (
                    <a
                      href={review.authorUri}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {review.authorName}
                    </a>
                  ) : (
                    review.authorName
                  )}
                </span>
                <span className="review-meta">
                  <span className="review-stars" aria-label={`${review.rating} stars`}>
                    {'★'.repeat(Math.max(1, Math.min(5, Math.round(review.rating))))}
                  </span>
                  {review.relativeTime && <span>{review.relativeTime}</span>}
                </span>
              </div>
              {review.text && <p className="review-text">{review.text}</p>}
            </article>
          ))}
        </div>
      )}

      <div className="google-attribution">
        <span>Reviews powered by Google Places API (New)</span>
        {clinic?.googleMapsUri && (
          <a
            href={clinic.googleMapsUri}
            target="_blank"
            rel="noreferrer"
            style={{ color: '#0f766e', fontWeight: 600, textDecoration: 'none' }}
          >
            Read all on Google
          </a>
        )}
      </div>
    </section>
  );
};
