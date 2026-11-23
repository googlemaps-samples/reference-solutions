import { useState } from 'react';
import {
  BedDouble,
  Check,
  Compass,
  ExternalLink,
  Eye,
  Landmark,
  MapPin,
  Plus,
  Star,
  Utensils,
} from 'lucide-react';
import type {
  DiscoveryCategory,
  ItineraryDay,
  PlaceItem,
} from '../types/itinerary';
import { formatPriceLevel, getTodayHoursSummary } from '../utils/formatters';

interface DiscoveryPanelProps {
  destinationLabel: string;
  activeCategory: DiscoveryCategory;
  results: PlaceItem[];
  isLoading: boolean;
  error: string | null;
  day1Ids: string[];
  day2Ids: string[];
  selectedPlaceId: string | null;
  onSelectCategory: (category: DiscoveryCategory) => void;
  onAddToDay: (place: PlaceItem, day: ItineraryDay) => void;
  onInspectPlace: (place: PlaceItem) => void;
}

export function DiscoveryPanel({
  destinationLabel,
  activeCategory,
  results,
  isLoading,
  error,
  day1Ids,
  day2Ids,
  selectedPlaceId,
  onSelectCategory,
  onAddToDay,
  onInspectPlace,
}: DiscoveryPanelProps) {
  const [expandedHoursIds, setExpandedHoursIds] = useState<
    Record<string, boolean>
  >({});

  const toggleHours = (id: string) => {
    setExpandedHoursIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section className="sidebar-section" aria-label="Place discovery">
      <div className="section-header-row">
        <h2 className="section-title">
          <Compass size={14} /> Discover {destinationLabel}
        </h2>
      </div>

      <div
        data-testid="discovery-category-tabs"
        className="discovery-tabs"
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeCategory === 'attractions'}
          className={`discovery-tab ${
            activeCategory === 'attractions' ? 'active' : ''
          }`}
          onClick={() => onSelectCategory('attractions')}
        >
          <Landmark size={13} /> Attractions
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeCategory === 'restaurants'}
          className={`discovery-tab ${
            activeCategory === 'restaurants' ? 'active' : ''
          }`}
          onClick={() => onSelectCategory('restaurants')}
        >
          <Utensils size={13} /> Restaurants
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeCategory === 'hotels'}
          className={`discovery-tab ${
            activeCategory === 'hotels' ? 'active' : ''
          }`}
          onClick={() => onSelectCategory('hotels')}
        >
          <BedDouble size={13} /> Hotels
        </button>
      </div>

      <div data-testid="discovery-results-list" className="discovery-list">
        {isLoading && (
          <div className="empty-state">
            Loading live Places API (New) results for {destinationLabel}...
          </div>
        )}

        {!isLoading && error && <div className="empty-state">{error}</div>}

        {!isLoading && !error && results.length === 0 && (
          <div className="empty-state">
            No places found in this category. Try another category or search a
            nearby city.
          </div>
        )}

        {!isLoading &&
          results.map((place) => {
            const inDay1 = day1Ids.includes(place.id);
            const inDay2 = day2Ids.includes(place.id);
            const isSelected = selectedPlaceId === place.id;
            const priceText = formatPriceLevel(place.priceLevel);
            const todayHours = getTodayHoursSummary(place.weekdayDescriptions);
            const isHoursExpanded = Boolean(expandedHoursIds[place.id]);

            return (
              <article
                key={place.id}
                className={`place-card ${isSelected ? 'selected' : ''}`}
              >
                <div className="place-card-top">
                  {place.photoUrl ? (
                    <img
                      className="place-thumb"
                      src={place.photoUrl}
                      alt={place.displayName}
                      loading="lazy"
                    />
                  ) : (
                    <div className="place-thumb-placeholder" aria-hidden="true">
                      <MapPin size={22} />
                    </div>
                  )}

                  <div className="place-card-body">
                    <div className="place-title-row">
                      <h3 className="place-name">{place.displayName}</h3>
                    </div>

                    <div className="place-rating-row">
                      {place.rating !== null && (
                        <span className="rating-pill">
                          <Star size={11} fill="currentColor" />
                          {place.rating.toFixed(1)}
                          {place.userRatingCount !== null && (
                            <span style={{ fontWeight: 500, color: '#78350f' }}>
                              ({place.userRatingCount.toLocaleString()})
                            </span>
                          )}
                        </span>
                      )}

                      {place.primaryTypeDisplayName && (
                        <span className="type-pill">
                          {place.primaryTypeDisplayName}
                        </span>
                      )}

                      {priceText && (
                        <span className="type-pill">{priceText}</span>
                      )}
                    </div>

                    {place.formattedAddress && (
                      <p className="place-address">{place.formattedAddress}</p>
                    )}

                    {todayHours && (
                      <div className="place-hours">
                        <span>{todayHours}</span>
                        {place.weekdayDescriptions.length > 1 && (
                          <button
                            type="button"
                            className="hours-toggle-btn"
                            onClick={() => toggleHours(place.id)}
                          >
                            {isHoursExpanded ? 'Hide hours' : 'Weekly hours'}
                          </button>
                        )}
                        {isHoursExpanded && (
                          <ul className="hours-weekly-list">
                            {place.weekdayDescriptions.map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="place-card-actions">
                  <button
                    type="button"
                    className={`action-chip-btn ${inDay1 ? 'added-day1' : ''}`}
                    onClick={() => onAddToDay(place, 1)}
                  >
                    {inDay1 ? <Check size={12} /> : <Plus size={12} />}
                    {inDay1 ? 'In Day 1' : 'Day 1'}
                  </button>

                  <button
                    type="button"
                    className={`action-chip-btn ${inDay2 ? 'added-day2' : ''}`}
                    onClick={() => onAddToDay(place, 2)}
                  >
                    {inDay2 ? <Check size={12} /> : <Plus size={12} />}
                    {inDay2 ? 'In Day 2' : 'Day 2'}
                  </button>

                  <button
                    type="button"
                    className="action-chip-btn"
                    onClick={() => onInspectPlace(place)}
                  >
                    <Eye size={12} /> Street View
                  </button>

                  {place.googleMapsURI && (
                    <a
                      className="maps-link-btn"
                      href={place.googleMapsURI}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open on Google Maps"
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </article>
            );
          })}
      </div>
    </section>
  );
}
