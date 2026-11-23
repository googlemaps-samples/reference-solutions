import React from 'react';
import {
  Clock,
  Eye,
  GitCompare,
  MapPin,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { CATEGORY_META, PlaceItem } from '../types/neighborhood';
import { formatDistance, formatPriceLevel } from '../utils/placeMapper';
import { renderCategoryIcon } from './DirectorySidebar';

interface ComparisonPanelProps {
  isOpen: boolean;
  places: PlaceItem[];
  onClose: () => void;
  onInspectPlace: (place: PlaceItem) => void;
  onRemovePlace: (placeId: string) => void;
  onClearAll: () => void;
}

export const ComparisonPanel: React.FC<ComparisonPanelProps> = ({
  isOpen,
  places,
  onClose,
  onInspectPlace,
  onRemovePlace,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <section
      className="comparison-panel"
      data-testid="comparison-panel"
      aria-label="Side-by-Side Place Comparison"
    >
      <div className="comparison-header">
        <div className="comparison-title-group">
          <GitCompare size={16} />
          <h2>Side-by-Side Comparison ({places.length}/3)</h2>
        </div>

        <div className="comparison-header-actions">
          {places.length > 0 && (
            <button
              type="button"
              className="btn-text-subtle"
              onClick={onClearAll}
            >
              Clear all
            </button>
          )}
          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close comparison panel"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {places.length === 0 ? (
        <div className="comparison-empty">
          <p>
            Select <strong>Compare</strong> on up to 3 places from the directory
            or details drawer to compare live ratings, prices, opening hours,
            and reviews side by side.
          </p>
        </div>
      ) : (
        <div className="comparison-grid">
          {places.map((place) => {
            const meta = CATEGORY_META[place.category];
            const price = formatPriceLevel(place.priceLevel);
            const topReview = place.reviews[0];

            return (
              <article key={place.id} className="compare-card">
                <div className="compare-card-top">
                  <span
                    className="category-badge"
                    style={{
                      backgroundColor: meta.bgTint,
                      color: meta.textTint,
                    }}
                  >
                    {renderCategoryIcon(place.category, 12)}
                    <span>
                      {place.primaryTypeDisplayName ?? meta.label}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="icon-btn-subtle"
                    onClick={() => onRemovePlace(place.id)}
                    aria-label={`Remove ${place.displayName} from comparison`}
                    title="Remove from comparison"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <h3 className="compare-card-title">{place.displayName}</h3>

                <dl className="compare-specs">
                  <div className="compare-spec-row">
                    <dt>Rating</dt>
                    <dd>
                      {place.rating !== null ? (
                        <span className="rating-inline">
                          <Star size={13} className="star-icon" />
                          <strong>{place.rating.toFixed(1)}</strong>
                          {place.userRatingCount !== null && (
                            <span className="muted-count">
                              ({place.userRatingCount.toLocaleString()})
                            </span>
                          )}
                        </span>
                      ) : (
                        'Unrated'
                      )}
                    </dd>
                  </div>

                  <div className="compare-spec-row">
                    <dt>Price</dt>
                    <dd>
                      {price.symbols !== '—'
                        ? `${price.symbols} (${price.label})`
                        : 'Not listed'}
                    </dd>
                  </div>

                  <div className="compare-spec-row">
                    <dt>Distance</dt>
                    <dd>{formatDistance(place.distanceMeters)}</dd>
                  </div>

                  <div className="compare-spec-row">
                    <dt>Hours</dt>
                    <dd className="compare-hours-cell">
                      <Clock size={12} />
                      <span>
                        {place.openStatusLabel}
                        {place.todayHours !== 'Hours unavailable'
                          ? ` · ${place.todayHours}`
                          : ''}
                      </span>
                    </dd>
                  </div>

                  <div className="compare-spec-row">
                    <dt>Address</dt>
                    <dd className="compare-address-cell">
                      <MapPin size={12} />
                      <span>{place.formattedAddress}</span>
                    </dd>
                  </div>
                </dl>

                {topReview?.text && (
                  <blockquote className="compare-review-quote">
                    “{topReview.text.slice(0, 115)}
                    {topReview.text.length > 115 ? '…' : ''}”
                  </blockquote>
                )}

                <button
                  type="button"
                  className="btn-card btn-card-inspect compare-inspect-btn"
                  onClick={() => onInspectPlace(place)}
                >
                  <Eye size={13} />
                  <span>Full Details &amp; Reviews</span>
                </button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
