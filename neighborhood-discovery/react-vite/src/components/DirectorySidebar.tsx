import React from 'react';
import {
  Clock,
  Coffee,
  Eye,
  GitCompare,
  Landmark,
  MapPin,
  Pin,
  Star,
  Trash2,
  Trees,
  Utensils,
} from 'lucide-react';
import {
  CATEGORY_META,
  CommunitySpot,
  PlaceCategory,
  PlaceItem,
  VenueCategory,
} from '../types/neighborhood';
import { formatDistance, formatPriceLevel } from '../utils/placeMapper';

interface DirectorySidebarProps {
  activeNeighborhoodName: string;
  activeCategory: PlaceCategory;
  places: PlaceItem[];
  selectedPlaceId: string | null;
  comparisonIds: string[];
  communitySpots: CommunitySpot[];
  isLoading: boolean;
  errorMessage: string | null;
  onSelectCategory: (category: PlaceCategory) => void;
  onSelectPlace: (place: PlaceItem) => void;
  onToggleCompare: (place: PlaceItem) => void;
  onSelectCommunitySpot: (spot: CommunitySpot) => void;
  onRemoveCommunitySpot: (id: string) => void;
}

const FILTER_OPTIONS: {
  id: PlaceCategory;
  label: string;
  testId: string;
}[] = [
  { id: 'all', label: 'All', testId: 'category-filter-all' },
  {
    id: 'restaurant',
    label: 'Restaurants',
    testId: 'category-filter-restaurant',
  },
  { id: 'cafe', label: 'Cafes', testId: 'category-filter-cafe' },
  { id: 'museum', label: 'Museums', testId: 'category-filter-museum' },
  { id: 'park', label: 'Parks', testId: 'category-filter-park' },
];

export function renderCategoryIcon(
  category: VenueCategory | 'community',
  size = 14
) {
  switch (category) {
    case 'restaurant':
      return <Utensils size={size} strokeWidth={2.2} />;
    case 'cafe':
      return <Coffee size={size} strokeWidth={2.2} />;
    case 'museum':
      return <Landmark size={size} strokeWidth={2.2} />;
    case 'park':
      return <Trees size={size} strokeWidth={2.2} />;
    case 'community':
      return <Pin size={size} strokeWidth={2.2} />;
  }
}

export const DirectorySidebar: React.FC<DirectorySidebarProps> = ({
  activeNeighborhoodName,
  activeCategory,
  places,
  selectedPlaceId,
  comparisonIds,
  communitySpots,
  isLoading,
  errorMessage,
  onSelectCategory,
  onSelectPlace,
  onToggleCompare,
  onSelectCommunitySpot,
  onRemoveCommunitySpot,
}) => {
  return (
    <aside className="directory-sidebar" aria-label="Neighborhood Directory">
      <div className="sidebar-header">
        <div className="sidebar-location-row">
          <div className="location-heading">
            <MapPin size={15} className="location-pin-icon" />
            <span className="location-name">{activeNeighborhoodName}</span>
          </div>
          <span className="results-pill">
            {isLoading ? 'Searching…' : `${places.length} places · 5 km`}
          </span>
        </div>

        <div className="category-chips" role="group" aria-label="Filter by category">
          {FILTER_OPTIONS.map((opt) => {
            const isActive = activeCategory === opt.id;
            const meta =
              opt.id === 'all' ? null : CATEGORY_META[opt.id];
            return (
              <button
                key={opt.id}
                type="button"
                data-testid={opt.testId}
                className={`category-chip ${isActive ? 'category-chip-active' : ''}`}
                style={
                  isActive && meta
                    ? {
                        backgroundColor: meta.color,
                        borderColor: meta.color,
                        color: '#ffffff',
                      }
                    : undefined
                }
                onClick={() => onSelectCategory(opt.id)}
                aria-pressed={isActive}
              >
                {opt.id !== 'all' && renderCategoryIcon(opt.id, 13)}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="sidebar-scroll">
        {errorMessage && (
          <div className="sidebar-alert" role="alert">
            {errorMessage}
          </div>
        )}

        <div
          className="places-results-list"
          data-testid="places-results-list"
        >
          {isLoading && places.length === 0 && (
            <div className="sidebar-empty">
              <div className="spinner" />
              <p>Discovering Central London places within 5 km…</p>
            </div>
          )}

          {!isLoading && places.length === 0 && !errorMessage && (
            <div className="sidebar-empty">
              <p>No places found for this filter in the 5 km radius.</p>
            </div>
          )}

          {places.map((place) => {
            const meta = CATEGORY_META[place.category];
            const isSelected = place.id === selectedPlaceId;
            const isCompared = comparisonIds.includes(place.id);
            const price = formatPriceLevel(place.priceLevel);

            return (
              <article
                key={place.id}
                className={`place-card ${isSelected ? 'place-card-selected' : ''}`}
                onClick={() => onSelectPlace(place)}
              >
                <div className="place-card-top">
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
                  <span className="distance-label">
                    {formatDistance(place.distanceMeters)}
                  </span>
                </div>

                <h3 className="place-card-title">{place.displayName}</h3>

                <div className="place-card-metrics">
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
                    <span className="muted-count">No ratings yet</span>
                  )}

                  {price.symbols !== '—' && (
                    <>
                      <span className="dot-sep">·</span>
                      <span className="price-inline" title={price.label}>
                        {price.symbols}
                      </span>
                    </>
                  )}
                </div>

                <p className="place-card-address">{place.formattedAddress}</p>

                <div className="place-card-hours">
                  <Clock size={12} />
                  <span
                    className={
                      place.isOpenNow === true
                        ? 'status-open'
                        : place.isOpenNow === false
                          ? 'status-closed'
                          : 'status-neutral'
                    }
                  >
                    {place.openStatusLabel}
                  </span>
                  {place.todayHours !== 'Hours unavailable' && (
                    <span className="hours-snippet">· {place.todayHours}</span>
                  )}
                </div>

                <div
                  className="place-card-actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="btn-card btn-card-inspect"
                    onClick={() => onSelectPlace(place)}
                  >
                    <Eye size={13} />
                    <span>Inspect</span>
                  </button>
                  <button
                    type="button"
                    className={`btn-card ${isCompared ? 'btn-card-compared' : ''}`}
                    onClick={() => onToggleCompare(place)}
                    disabled={!isCompared && comparisonIds.length >= 3}
                    title={
                      !isCompared && comparisonIds.length >= 3
                        ? 'Maximum 3 places can be compared'
                        : isCompared
                          ? 'Remove from comparison'
                          : 'Add to side-by-side comparison'
                    }
                  >
                    <GitCompare size={13} />
                    <span>{isCompared ? 'Added' : 'Compare'}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <section className="community-section" aria-label="Community Spots">
          <div className="community-header">
            <div className="community-title-row">
              <Pin size={14} />
              <h4>Community Spots (Session)</h4>
            </div>
            <span className="community-count">{communitySpots.length}</span>
          </div>

          {communitySpots.length === 0 ? (
            <p className="community-hint">
              Click anywhere on the map to reverse-geocode an address and pin a
              community spot.
            </p>
          ) : (
            <div className="community-list">
              {communitySpots.map((spot) => (
                <div
                  key={spot.id}
                  className="community-item"
                  onClick={() => onSelectCommunitySpot(spot)}
                >
                  <div className="community-item-main">
                    <div className="community-item-title">{spot.name}</div>
                    <div className="community-item-address">
                      {spot.formattedAddress}
                    </div>
                    {spot.note && (
                      <div className="community-item-note">{spot.note}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="icon-btn-subtle"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveCommunitySpot(spot.id);
                    }}
                    aria-label={`Remove ${spot.name}`}
                    title="Remove community spot"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </aside>
  );
};
