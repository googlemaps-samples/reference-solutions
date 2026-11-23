import React, { useEffect, useState } from 'react';
import {
  Clock,
  Crosshair,
  ExternalLink,
  GitCompare,
  Globe,
  MapPin,
  MessageSquareQuote,
  Phone,
  Pin,
  Radar,
  Star,
  X,
} from 'lucide-react';
import {
  CATEGORY_META,
  CommunitySpot,
  LatLngPoint,
  PlaceItem,
  ReverseGeocodeResult,
  VenueCategory,
} from '../types/neighborhood';
import { formatDistance, formatPriceLevel } from '../utils/placeMapper';
import { renderCategoryIcon } from './DirectorySidebar';

interface InspectorDrawerProps {
  selectedPlace: PlaceItem | null;
  isLoadingDetails: boolean;
  isCompared: boolean;
  comparisonFull: boolean;
  reverseGeocodeResult: ReverseGeocodeResult | null;
  isReverseGeocoding: boolean;
  selectedCommunitySpot: CommunitySpot | null;
  onClose: () => void;
  onToggleCompare: (place: PlaceItem) => void;
  onSearchAroundPoint: (center: LatLngPoint, label: string) => void;
  onSaveCommunitySpot: (spot: {
    name: string;
    category: VenueCategory | 'community';
    note: string;
    formattedAddress: string;
    location: LatLngPoint;
  }) => void;
}

export const InspectorDrawer: React.FC<InspectorDrawerProps> = ({
  selectedPlace,
  isLoadingDetails,
  isCompared,
  comparisonFull,
  reverseGeocodeResult,
  isReverseGeocoding,
  selectedCommunitySpot,
  onClose,
  onToggleCompare,
  onSearchAroundPoint,
  onSaveCommunitySpot,
}) => {
  const [showPinForm, setShowPinForm] = useState(false);
  const [spotName, setSpotName] = useState('');
  const [spotCategory, setSpotCategory] = useState<VenueCategory | 'community'>(
    'community'
  );
  const [spotNote, setSpotNote] = useState('');

  useEffect(() => {
    if (reverseGeocodeResult) {
      setShowPinForm(false);
      setSpotName('');
      setSpotNote('');
      setSpotCategory('community');
    }
  }, [reverseGeocodeResult]);

  if (
    !selectedPlace &&
    !reverseGeocodeResult &&
    !isReverseGeocoding &&
    !selectedCommunitySpot
  ) {
    return null;
  }

  // 1. Reverse-Geocode Map Click Inspector Mode
  if (reverseGeocodeResult || isReverseGeocoding) {
    return (
      <aside
        className="inspector-drawer"
        data-testid="reverse-geocode-inspector"
        aria-label="Reverse Geocode Inspector"
      >
        <div className="drawer-header">
          <div className="drawer-badge-row">
            <span className="drawer-pill drawer-pill-rose">
              <Crosshair size={13} />
              <span>Map Pin &amp; Reverse Geocode</span>
            </span>
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close inspector"
          >
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          {isReverseGeocoding && !reverseGeocodeResult ? (
            <div className="drawer-loading">
              <div className="spinner" />
              <p>Resolving street address via Geocoding API…</p>
            </div>
          ) : (
            reverseGeocodeResult && (
              <>
                <h2 className="drawer-title">
                  {reverseGeocodeResult.neighborhood}
                </h2>
                <p className="drawer-address">
                  {reverseGeocodeResult.formattedAddress}
                </p>

                <div className="geocode-coords-box">
                  <div className="coord-row">
                    <span className="coord-label">Coordinates</span>
                    <code className="coord-value">
                      {reverseGeocodeResult.location.lat.toFixed(5)},{' '}
                      {reverseGeocodeResult.location.lng.toFixed(5)}
                    </code>
                  </div>
                  {reverseGeocodeResult.postalCode && (
                    <div className="coord-row">
                      <span className="coord-label">Postcode</span>
                      <span className="coord-value">
                        {reverseGeocodeResult.postalCode}
                      </span>
                    </div>
                  )}
                  {reverseGeocodeResult.plusCode && (
                    <div className="coord-row">
                      <span className="coord-label">Plus Code</span>
                      <code className="coord-value">
                        {reverseGeocodeResult.plusCode}
                      </code>
                    </div>
                  )}
                  {reverseGeocodeResult.placeId && (
                    <div className="coord-row">
                      <span className="coord-label">Place ID</span>
                      <code className="coord-value coord-truncate">
                        {reverseGeocodeResult.placeId}
                      </code>
                    </div>
                  )}
                </div>

                <div className="drawer-cta-stack">
                  <button
                    type="button"
                    className="btn btn-secondary btn-full"
                    onClick={() =>
                      onSearchAroundPoint(
                        reverseGeocodeResult.location,
                        reverseGeocodeResult.neighborhood
                      )
                    }
                  >
                    <Radar size={15} />
                    <span>Search 5 km Around This Point</span>
                  </button>

                  {!showPinForm && (
                    <button
                      type="button"
                      data-testid="pin-community-spot-button"
                      className="btn btn-primary btn-full"
                      onClick={() => setShowPinForm(true)}
                    >
                      <Pin size={15} />
                      <span>Pin as Community Spot</span>
                    </button>
                  )}
                </div>

                {showPinForm && (
                  <form
                    className="community-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!spotName.trim()) return;
                      onSaveCommunitySpot({
                        name: spotName.trim(),
                        category: spotCategory,
                        note: spotNote.trim(),
                        formattedAddress: reverseGeocodeResult.formattedAddress,
                        location: reverseGeocodeResult.location,
                      });
                      setShowPinForm(false);
                    }}
                  >
                    <h3 className="form-heading">New Community Spot</h3>

                    <label className="form-field">
                      <span>Spot Name</span>
                      <input
                        type="text"
                        data-testid="community-spot-name-input"
                        placeholder="e.g., Hidden Courtyard Bench"
                        value={spotName}
                        onChange={(e) => setSpotName(e.target.value)}
                        required
                      />
                    </label>

                    <label className="form-field">
                      <span>Category</span>
                      <select
                        value={spotCategory}
                        onChange={(e) =>
                          setSpotCategory(
                            e.target.value as VenueCategory | 'community'
                          )
                        }
                      >
                        <option value="community">Community Gem</option>
                        <option value="restaurant">Restaurant</option>
                        <option value="cafe">Cafe</option>
                        <option value="museum">Museum</option>
                        <option value="park">Park</option>
                      </select>
                    </label>

                    <label className="form-field">
                      <span>Community Note</span>
                      <textarea
                        data-testid="community-spot-note-input"
                        rows={3}
                        placeholder="Why should neighbors check out this spot?"
                        value={spotNote}
                        onChange={(e) => setSpotNote(e.target.value)}
                      />
                    </label>

                    <div className="form-actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowPinForm(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        data-testid="save-community-spot-button"
                        className="btn btn-primary"
                      >
                        Save Spot
                      </button>
                    </div>
                  </form>
                )}
              </>
            )
          )}
        </div>
      </aside>
    );
  }

  // 2. Community Spot Inspector Mode
  if (selectedCommunitySpot) {
    const meta = CATEGORY_META[selectedCommunitySpot.category];
    return (
      <aside
        className="inspector-drawer"
        data-testid="place-details-drawer"
        aria-label="Community Spot Details"
      >
        <div className="drawer-header">
          <div className="drawer-badge-row">
            <span
              className="drawer-pill"
              style={{ backgroundColor: meta.bgTint, color: meta.textTint }}
            >
              <Pin size={13} />
              <span>Session Community Spot</span>
            </span>
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          <h2 className="drawer-title">{selectedCommunitySpot.name}</h2>
          <p className="drawer-address">
            <MapPin size={14} />
            <span>{selectedCommunitySpot.formattedAddress}</span>
          </p>

          <div className="geocode-coords-box">
            <div className="coord-row">
              <span className="coord-label">Coordinates</span>
              <code className="coord-value">
                {selectedCommunitySpot.location.lat.toFixed(5)},{' '}
                {selectedCommunitySpot.location.lng.toFixed(5)}
              </code>
            </div>
            <div className="coord-row">
              <span className="coord-label">Category</span>
              <span className="coord-value">{meta.label}</span>
            </div>
          </div>

          {selectedCommunitySpot.note && (
            <div className="drawer-section">
              <h3>Neighbor Note</h3>
              <p className="community-note-body">
                {selectedCommunitySpot.note}
              </p>
            </div>
          )}
        </div>
      </aside>
    );
  }

  // 3. Place Details Drawer Mode
  if (!selectedPlace) return null;

  const meta = CATEGORY_META[selectedPlace.category];
  const price = formatPriceLevel(selectedPlace.priceLevel);

  return (
    <aside
      className="inspector-drawer"
      data-testid="place-details-drawer"
      aria-label="Place Details"
    >
      <div className="drawer-header">
        <div className="drawer-badge-row">
          <span
            className="drawer-pill"
            style={{ backgroundColor: meta.bgTint, color: meta.textTint }}
          >
            {renderCategoryIcon(selectedPlace.category, 13)}
            <span>
              {selectedPlace.primaryTypeDisplayName ?? meta.label}
            </span>
          </span>
          <span className="drawer-distance">
            {formatDistance(selectedPlace.distanceMeters)} away
          </span>
        </div>
        <button
          type="button"
          className="drawer-close-btn"
          onClick={onClose}
          aria-label="Close place details"
        >
          <X size={18} />
        </button>
      </div>

      <div className="drawer-body">
        {selectedPlace.photoUri && (
          <div className="drawer-photo-wrap">
            <img
              src={selectedPlace.photoUri}
              alt={selectedPlace.displayName}
              className="drawer-photo"
            />
            {selectedPlace.photoAttribution && (
              <span className="photo-credit">
                Photo: {selectedPlace.photoAttribution}
              </span>
            )}
          </div>
        )}

        <h2 className="drawer-title">{selectedPlace.displayName}</h2>

        <div className="drawer-metrics-bar">
          {selectedPlace.rating !== null ? (
            <div className="drawer-rating">
              <Star size={15} className="star-icon" />
              <strong>{selectedPlace.rating.toFixed(1)}</strong>
              {selectedPlace.userRatingCount !== null && (
                <span>
                  ({selectedPlace.userRatingCount.toLocaleString()} reviews)
                </span>
              )}
            </div>
          ) : (
            <span className="muted-count">No ratings yet</span>
          )}

          {price.symbols !== '—' && (
            <span className="drawer-price-tag">
              {price.symbols} · {price.label}
            </span>
          )}
        </div>

        <p className="drawer-address">
          <MapPin size={14} />
          <span>{selectedPlace.formattedAddress}</span>
        </p>

        <div className="drawer-actions-row">
          <button
            type="button"
            data-testid="drawer-compare-button"
            className={`btn ${isCompared ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onToggleCompare(selectedPlace)}
            disabled={!isCompared && comparisonFull}
          >
            <GitCompare size={15} />
            <span>
              {isCompared
                ? 'In Comparison'
                : comparisonFull
                  ? 'Compare Full (3/3)'
                  : 'Compare Place'}
            </span>
          </button>

          {selectedPlace.googleMapsUri && (
            <a
              href={selectedPlace.googleMapsUri}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              <ExternalLink size={14} />
              <span>Google Maps</span>
            </a>
          )}
        </div>

        {/* Contact links */}
        {(selectedPlace.websiteUri || selectedPlace.internationalPhoneNumber) && (
          <div className="drawer-links-row">
            {selectedPlace.websiteUri && (
              <a
                href={selectedPlace.websiteUri}
                target="_blank"
                rel="noopener noreferrer"
                className="drawer-meta-link"
              >
                <Globe size={14} />
                <span>Official Website</span>
              </a>
            )}
            {selectedPlace.internationalPhoneNumber && (
              <span className="drawer-meta-link">
                <Phone size={14} />
                <span>{selectedPlace.internationalPhoneNumber}</span>
              </span>
            )}
          </div>
        )}

        {/* Opening Hours */}
        <section className="drawer-section">
          <div className="section-title-row">
            <Clock size={14} />
            <h3>Opening Hours</h3>
            <span
              className={`hours-status-pill ${
                selectedPlace.isOpenNow === true
                  ? 'pill-open'
                  : selectedPlace.isOpenNow === false
                    ? 'pill-closed'
                    : 'pill-neutral'
              }`}
            >
              {selectedPlace.openStatusLabel}
            </span>
          </div>

          {selectedPlace.weekdayDescriptions.length > 0 ? (
            <ul className="hours-list">
              {selectedPlace.weekdayDescriptions.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="muted-text">
              Opening hours are not published for this location.
            </p>
          )}
        </section>

        {/* Live Reviews */}
        <section className="drawer-section">
          <div className="section-title-row">
            <MessageSquareQuote size={14} />
            <h3>Customer Reviews</h3>
          </div>

          {isLoadingDetails && selectedPlace.reviews.length === 0 ? (
            <div className="drawer-loading-inline">
              <div className="spinner-sm" />
              <span>Loading live reviews…</span>
            </div>
          ) : selectedPlace.reviews.length > 0 ? (
            <div className="reviews-list">
              {selectedPlace.reviews.slice(0, 5).map((rev, idx) => (
                <article
                  key={`${rev.authorName}-${idx}`}
                  className="review-card"
                >
                  <div className="review-header">
                    <span className="review-author">{rev.authorName}</span>
                    <div className="review-meta">
                      {rev.rating !== null && (
                        <span className="review-rating">
                          <Star size={12} className="star-icon" />
                          {rev.rating.toFixed(1)}
                        </span>
                      )}
                      {rev.relativeTime && (
                        <span className="review-time">{rev.relativeTime}</span>
                      )}
                    </div>
                  </div>
                  {rev.text && <p className="review-text">{rev.text}</p>}
                </article>
              ))}
            </div>
          ) : (
            <p className="muted-text">
              No individual reviews available for this place.
            </p>
          )}
        </section>
      </div>
    </aside>
  );
};
