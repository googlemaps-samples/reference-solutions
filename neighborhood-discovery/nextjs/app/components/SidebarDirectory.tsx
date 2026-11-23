'use client';

import React from 'react';
import {
  ALL_CATEGORIES,
  CATEGORY_META,
  CommunitySpot,
  FilterCategory,
  LatLngLiteral,
  PlaceSummary,
  formatDistanceLabel,
  formatPriceLevel,
  getTodayWeekdayHours,
  haversineDistanceMeters
} from '@/lib/types';

interface SidebarDirectoryProps {
  places: PlaceSummary[];
  allPlacesCount: number;
  categoryCounts: Record<FilterCategory, number>;
  activeCategory: FilterCategory;
  activeAreaLabel: string;
  activeCenter: LatLngLiteral;
  selectedPlaceId: string | null;
  compareIds: string[];
  communitySpots: CommunitySpot[];
  isLoading: boolean;
  errorMessage: string | null;
  onCategoryChange: (category: FilterCategory) => void;
  onInspectPlace: (place: PlaceSummary) => void;
  onToggleCompare: (place: PlaceSummary) => void;
  onFocusCommunitySpot: (spot: CommunitySpot) => void;
  onDeleteCommunitySpot: (spotId: string) => void;
}

export default function SidebarDirectory({
  places,
  allPlacesCount,
  categoryCounts,
  activeCategory,
  activeAreaLabel,
  activeCenter,
  selectedPlaceId,
  compareIds,
  communitySpots,
  isLoading,
  errorMessage,
  onCategoryChange,
  onInspectPlace,
  onToggleCompare,
  onFocusCommunitySpot,
  onDeleteCommunitySpot
}: SidebarDirectoryProps) {
  return (
    <aside className="sidebar" aria-label="Neighborhood Directory">
      <div className="sidebar-filters">
        <div className="filter-chips" role="group" aria-label="Category filters">
          <button
            type="button"
            id="category-filter-all"
            data-testid="category-filter-all"
            className={`filter-chip ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => onCategoryChange('all')}
          >
            All ({categoryCounts.all})
          </button>
          {ALL_CATEGORIES.map((cat) => {
            const meta = CATEGORY_META[cat];
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                id={`category-filter-${cat}`}
                data-testid={`category-filter-${cat}`}
                className={`filter-chip ${isActive ? 'active' : ''}`}
                onClick={() => onCategoryChange(cat)}
              >
                <span
                  className="chip-dot"
                  style={{ backgroundColor: meta.background }}
                />
                {meta.label} ({categoryCounts[cat]})
              </button>
            );
          })}
        </div>

        <div className="status-bar">
          <span>
            <strong>{places.length}</strong>{' '}
            {places.length === 1 ? 'place' : 'places'} shown (
            {allPlacesCount} within 5 km of <strong>{activeAreaLabel}</strong>)
          </span>
          {isLoading && <span>Refreshing…</span>}
        </div>
      </div>

      <div className="sidebar-scroll" data-testid="places-results-list">
        {errorMessage && (
          <div className="banner-error" role="alert">
            {errorMessage}
          </div>
        )}

        {!isLoading && places.length === 0 && !errorMessage && (
          <div className="banner-notice">
            No places matched this filter within 5 km of {activeAreaLabel}. Try
            switching to <strong>All</strong> or searching another London
            neighborhood.
          </div>
        )}

        {places.map((place) => {
          const meta = CATEGORY_META[place.category];
          const isSelected = place.id === selectedPlaceId;
          const isCompared = compareIds.includes(place.id);
          const todayHours = getTodayWeekdayHours(place.weekdayDescriptions);
          const distance = formatDistanceLabel(
            haversineDistanceMeters(activeCenter, place.location)
          );

          return (
            <article
              key={place.id}
              className={`place-card ${isSelected ? 'selected' : ''}`}
              data-testid={`place-card-${place.id}`}
            >
              <div className="place-card-top">
                <h3 className="place-title">{place.displayName}</h3>
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

              <div className="place-meta-row">
                <span className="rating-pill">
                  ★ {place.rating !== null ? place.rating.toFixed(1) : 'New'}
                </span>
                {place.userRatingCount !== null && (
                  <span>({place.userRatingCount.toLocaleString()} reviews)</span>
                )}
                <span>· {formatPriceLevel(place.priceLevel)}</span>
                <span>· {distance}</span>
              </div>

              <p className="place-address">{place.formattedAddress}</p>

              {todayHours && (
                <p className="place-hours-line">{todayHours}</p>
              )}

              <div className="place-card-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => onInspectPlace(place)}
                >
                  Inspect Details
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${isCompared ? 'btn-active' : ''}`}
                  onClick={() => onToggleCompare(place)}
                  disabled={!isCompared && compareIds.length >= 3}
                  title={
                    !isCompared && compareIds.length >= 3
                      ? 'Maximum 3 places can be compared'
                      : 'Toggle side-by-side comparison'
                  }
                >
                  {isCompared ? '✓ Comparing' : '+ Compare'}
                </button>
              </div>
            </article>
          );
        })}

        <section className="community-section" aria-label="Community Spots">
          <h4 className="section-heading">
            Community Spots ({communitySpots.length})
          </h4>
          {communitySpots.length === 0 ? (
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: 'var(--text-muted)',
                lineHeight: 1.45
              }}
            >
              Click anywhere on the map to reverse-geocode its street address
              and pin a local community spot for this session.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {communitySpots.map((spot) => (
                <div
                  key={spot.id}
                  className="place-card"
                  style={{ borderColor: '#99F6E4', background: '#F0FDFA' }}
                >
                  <div className="place-card-top">
                    <h4 className="place-title">★ {spot.name}</h4>
                    <span
                      className="category-badge"
                      style={{ background: '#CCFBF1', color: '#115E59' }}
                    >
                      {spot.category === 'community'
                        ? 'Community'
                        : CATEGORY_META[spot.category].singular}
                    </span>
                  </div>
                  <p className="place-address">{spot.formattedAddress}</p>
                  {spot.note && (
                    <p
                      style={{
                        margin: '4px 0 0',
                        fontSize: 12,
                        color: '#134E4A'
                      }}
                    >
                      {spot.note}
                    </p>
                  )}
                  <div className="place-card-actions">
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => onFocusCommunitySpot(spot)}
                    >
                      Show on Map
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => onDeleteCommunitySpot(spot.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
