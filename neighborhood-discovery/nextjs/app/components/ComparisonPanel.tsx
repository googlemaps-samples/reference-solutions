'use client';

import React from 'react';
import {
  CATEGORY_META,
  PlaceDetail,
  PlaceSummary,
  formatPriceLevel,
  getTodayWeekdayHours
} from '@/lib/types';

interface ComparisonPanelProps {
  isOpen: boolean;
  places: Array<PlaceDetail | PlaceSummary>;
  onClose: () => void;
  onInspect: (place: PlaceSummary) => void;
  onRemove: (placeId: string) => void;
}

export default function ComparisonPanel({
  isOpen,
  places,
  onClose,
  onInspect,
  onRemove
}: ComparisonPanelProps) {
  if (!isOpen) return null;

  return (
    <section
      className="comparison-panel"
      data-testid="comparison-panel"
      aria-label="Side-by-Side Place Comparison"
    >
      <div className="comparison-header">
        <div>
          <strong style={{ fontSize: 14 }}>
            Side-by-Side Comparison ({places.length}/3)
          </strong>
          <span
            style={{
              marginLeft: 10,
              fontSize: 12,
              color: 'var(--text-muted)'
            }}
          >
            Compare live ratings, price tiers, hours, and reviews
          </span>
        </div>
        <button
          type="button"
          className="btn btn-sm"
          onClick={onClose}
          aria-label="Close comparison panel"
        >
          Collapse
        </button>
      </div>

      {places.length === 0 ? (
        <div style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
          Select <strong>+ Compare</strong> on up to 3 places in the directory
          or details drawer to compare them side-by-side.
        </div>
      ) : (
        <div className="comparison-grid">
          {places.map((place) => {
            const meta = CATEGORY_META[place.category];
            const todayHours = getTodayWeekdayHours(place.weekdayDescriptions);
            const reviewCount =
              'reviews' in place ? place.reviews.length : null;
            return (
              <div key={place.id} className="compare-col">
                <div className="place-card-top">
                  <strong style={{ fontSize: 13.5, lineHeight: 1.3 }}>
                    {place.displayName}
                  </strong>
                  <span
                    className="category-badge"
                    style={{
                      backgroundColor: meta.badgeBg,
                      color: meta.badgeText
                    }}
                  >
                    {meta.singular}
                  </span>
                </div>

                <div className="compare-metric">
                  <span>Live Rating</span>
                  <strong className="rating-pill">
                    ★ {place.rating !== null ? place.rating.toFixed(1) : 'N/A'}
                  </strong>
                </div>
                <div className="compare-metric">
                  <span>Reviews</span>
                  <strong>
                    {place.userRatingCount !== null
                      ? place.userRatingCount.toLocaleString()
                      : '0'}
                    {reviewCount !== null ? ` (${reviewCount} loaded)` : ''}
                  </strong>
                </div>
                <div className="compare-metric">
                  <span>Price Level</span>
                  <strong>{formatPriceLevel(place.priceLevel)}</strong>
                </div>
                <div className="compare-metric">
                  <span>Today&apos;s Hours</span>
                  <span style={{ textAlign: 'right', maxWidth: '62%' }}>
                    {todayHours ?? 'Not listed'}
                  </span>
                </div>
                <div className="compare-metric">
                  <span>Address</span>
                  <span style={{ textAlign: 'right', maxWidth: '65%' }}>
                    {place.formattedAddress}
                  </span>
                </div>

                <div className="place-card-actions" style={{ marginTop: 4 }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => onInspect(place)}
                  >
                    Inspect
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => onRemove(place.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
