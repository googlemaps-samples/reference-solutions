'use client';

import React, { useState } from 'react';
import {
  ALL_CATEGORIES,
  CATEGORY_META,
  CommunitySpot,
  GeocodeLocationResult,
  LatLngLiteral,
  PlaceCategory,
  PlaceDetail,
  PlaceSummary,
  formatDistanceLabel,
  formatPriceLevel,
  haversineDistanceMeters
} from '@/lib/types';

interface DetailsDrawerProps {
  selectedPlace: PlaceDetail | PlaceSummary | null;
  isLoadingDetails: boolean;
  reverseGeocodePoint: GeocodeLocationResult | null;
  isGeocodingPoint: boolean;
  activeCenter: LatLngLiteral;
  isCompared: boolean;
  canAddCompare: boolean;
  onClose: () => void;
  onToggleCompare: (place: PlaceSummary) => void;
  onSaveCommunitySpot: (spot: Omit<CommunitySpot, 'id' | 'createdAt'>) => void;
}

export default function DetailsDrawer({
  selectedPlace,
  isLoadingDetails,
  reverseGeocodePoint,
  isGeocodingPoint,
  activeCenter,
  isCompared,
  canAddCompare,
  onClose,
  onToggleCompare,
  onSaveCommunitySpot
}: DetailsDrawerProps) {
  const [spotName, setSpotName] = useState('');
  const [spotCategory, setSpotCategory] = useState<PlaceCategory | 'community'>(
    'community'
  );
  const [spotNote, setSpotNote] = useState('');
  const [showPinFormForPlace, setShowPinFormForPlace] = useState(false);

  if (!selectedPlace && !reverseGeocodePoint && !isGeocodingPoint) {
    return null;
  }

  const handlePinSubmit = (
    e: React.FormEvent,
    location: LatLngLiteral,
    formattedAddress: string,
    placeId?: string
  ) => {
    e.preventDefault();
    const trimmedName = spotName.trim();
    if (!trimmedName) return;

    onSaveCommunitySpot({
      name: trimmedName,
      category: spotCategory,
      note: spotNote.trim(),
      location,
      formattedAddress,
      placeId
    });
    setSpotName('');
    setSpotNote('');
    setShowPinFormForPlace(false);
  };

  if (reverseGeocodePoint || isGeocodingPoint) {
    return (
      <section
        className="details-drawer"
        data-testid="reverse-geocode-inspector"
        aria-label="Reverse Geocode Inspector"
      >
        <div className="drawer-header">
          <div>
            <span
              className="category-badge"
              style={{ background: '#E0F2FE', color: '#0369A1' }}
            >
              Reverse Geocode Pin
            </span>
            <h3 className="place-title" style={{ marginTop: 6 }}>
              {isGeocodingPoint
                ? 'Resolving street address…'
                : reverseGeocodePoint?.neighborhood ?? 'Pinned Map Location'}
            </h3>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            onClick={onClose}
            aria-label="Close inspector"
          >
            ✕
          </button>
        </div>

        <div className="drawer-body">
          {isGeocodingPoint ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
              Querying Google Maps Geocoding API for human-readable street
              address…
            </p>
          ) : (
            reverseGeocodePoint && (
              <>
                <div
                  style={{
                    background: 'var(--bg-subtle)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    fontSize: 12.5
                  }}
                >
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    Street Address
                  </div>
                  <div style={{ marginTop: 3, color: 'var(--text-secondary)' }}>
                    {reverseGeocodePoint.formattedAddress}
                  </div>
                  <div
                    className="mono"
                    style={{
                      marginTop: 8,
                      fontSize: 11.5,
                      color: 'var(--text-muted)'
                    }}
                  >
                    {reverseGeocodePoint.location.lat.toFixed(6)},{' '}
                    {reverseGeocodePoint.location.lng.toFixed(6)}
                  </div>
                  {reverseGeocodePoint.placeId && (
                    <div
                      className="mono"
                      style={{
                        marginTop: 4,
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        wordBreak: 'break-all'
                      }}
                    >
                      Place ID: {reverseGeocodePoint.placeId}
                    </div>
                  )}
                  {reverseGeocodePoint.postalCode && (
                    <div style={{ marginTop: 4, fontSize: 12 }}>
                      Postcode: <strong>{reverseGeocodePoint.postalCode}</strong>
                    </div>
                  )}
                </div>

                <form
                  onSubmit={(e) =>
                    handlePinSubmit(
                      e,
                      reverseGeocodePoint.location,
                      reverseGeocodePoint.formattedAddress,
                      reverseGeocodePoint.placeId
                    )
                  }
                  style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                >
                  <h4 className="section-heading" style={{ marginBottom: 2 }}>
                    Pin New Community Spot
                  </h4>
                  <input
                    id="community-spot-name-input"
                    data-testid="community-spot-name-input"
                    type="text"
                    className="text-input"
                    placeholder="Spot name (e.g., Hidden Courtyard Bench)"
                    value={spotName}
                    onChange={(e) => setSpotName(e.target.value)}
                    required
                  />
                  <select
                    className="select-input"
                    value={spotCategory}
                    onChange={(e) =>
                      setSpotCategory(
                        e.target.value as PlaceCategory | 'community'
                      )
                    }
                    aria-label="Community spot category"
                  >
                    <option value="community">Community Spot</option>
                    {ALL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_META[c].singular}
                      </option>
                    ))}
                  </select>
                  <textarea
                    id="community-spot-note-input"
                    data-testid="community-spot-note-input"
                    className="textarea-input"
                    placeholder="Add local notes (wifi, seating, quiet hours…)"
                    value={spotNote}
                    onChange={(e) => setSpotNote(e.target.value)}
                  />
                  <button
                    id="save-community-spot-button"
                    data-testid="save-community-spot-button"
                    type="submit"
                    className="btn btn-primary"
                  >
                    Save Community Spot
                  </button>
                </form>
              </>
            )
          )}
        </div>
      </section>
    );
  }

  if (!selectedPlace) return null;

  const meta = CATEGORY_META[selectedPlace.category];
  const detail = 'reviews' in selectedPlace ? selectedPlace : null;
  const distanceLabel = formatDistanceLabel(
    haversineDistanceMeters(activeCenter, selectedPlace.location)
  );

  return (
    <section
      className="details-drawer"
      data-testid="place-details-drawer"
      aria-label="Place Details Drawer"
    >
      <div className="drawer-header">
        <div>
          <span
            className="category-badge"
            style={{ backgroundColor: meta.badgeBg, color: meta.badgeText }}
          >
            {selectedPlace.primaryTypeDisplayName || meta.singular}
          </span>
          <h3 className="place-title" style={{ marginTop: 6, fontSize: 16 }}>
            {selectedPlace.displayName}
          </h3>
        </div>
        <button
          type="button"
          className="btn btn-sm"
          onClick={onClose}
          aria-label="Close place details"
        >
          ✕
        </button>
      </div>

      <div className="drawer-body">
        {selectedPlace.photoUrls[0] && (
          <img
            src={selectedPlace.photoUrls[0]}
            alt={selectedPlace.displayName}
            className="drawer-photo"
          />
        )}

        <div className="place-meta-row" style={{ marginTop: 0 }}>
          <span className="rating-pill">
            ★{' '}
            {selectedPlace.rating !== null
              ? selectedPlace.rating.toFixed(1)
              : 'Unrated'}
          </span>
          {selectedPlace.userRatingCount !== null && (
            <span>
              ({selectedPlace.userRatingCount.toLocaleString()} Google reviews)
            </span>
          )}
          <span>· {formatPriceLevel(selectedPlace.priceLevel)}</span>
          <span>· {distanceLabel}</span>
        </div>

        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
          <div>{selectedPlace.formattedAddress}</div>
          {detail?.internationalPhoneNumber && (
            <div style={{ marginTop: 4 }}>
              Phone: <strong>{detail.internationalPhoneNumber}</strong>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
            {detail?.websiteUri && (
              <a
                href={detail.websiteUri}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)' }}
              >
                Official Website ↗
              </a>
            )}
            {selectedPlace.googleMapsUri && (
              <a
                href={selectedPlace.googleMapsUri}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)' }}
              >
                Open in Google Maps ↗
              </a>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            id="drawer-compare-button"
            data-testid="drawer-compare-button"
            type="button"
            className={`btn btn-sm ${isCompared ? 'btn-active' : 'btn-primary'}`}
            onClick={() => onToggleCompare(selectedPlace)}
            disabled={!isCompared && !canAddCompare}
          >
            {isCompared ? '✓ Remove from Compare' : '+ Add to Compare'}
          </button>
          <button
            id="pin-community-spot-button"
            data-testid="pin-community-spot-button"
            type="button"
            className="btn btn-sm"
            onClick={() => {
              setSpotName((prev) => prev || selectedPlace.displayName);
              setShowPinFormForPlace((v) => !v);
            }}
          >
            {showPinFormForPlace ? 'Hide Pin Form' : '★ Pin Community Note'}
          </button>
        </div>

        {showPinFormForPlace && (
          <form
            onSubmit={(e) =>
              handlePinSubmit(
                e,
                selectedPlace.location,
                selectedPlace.formattedAddress,
                selectedPlace.id
              )
            }
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: 10,
              borderRadius: 10,
              background: 'var(--bg-subtle)'
            }}
          >
            <input
              id="community-spot-name-input"
              data-testid="community-spot-name-input"
              type="text"
              className="text-input"
              placeholder="Spot label"
              value={spotName}
              onChange={(e) => setSpotName(e.target.value)}
              required
            />
            <textarea
              id="community-spot-note-input"
              data-testid="community-spot-note-input"
              className="textarea-input"
              placeholder="Add community note..."
              value={spotNote}
              onChange={(e) => setSpotNote(e.target.value)}
            />
            <button
              id="save-community-spot-button"
              data-testid="save-community-spot-button"
              type="submit"
              className="btn btn-sm btn-primary"
            >
              Save Community Spot
            </button>
          </form>
        )}

        <div>
          <h4 className="section-heading">Opening Hours</h4>
          {selectedPlace.weekdayDescriptions.length > 0 ? (
            <ul className="hours-list">
              {selectedPlace.weekdayDescriptions.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
              {isLoadingDetails
                ? 'Loading schedule…'
                : 'Opening hours not reported for this venue.'}
            </p>
          )}
        </div>

        <div>
          <h4 className="section-heading">
            Live Customer Reviews ({detail?.reviews.length ?? 0})
          </h4>
          {isLoadingDetails && !detail ? (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
              Fetching live reviews from Places API (New)…
            </p>
          ) : detail && detail.reviews.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {detail.reviews.slice(0, 5).map((rev, idx) => (
                <div key={`${rev.authorName}-${idx}`} className="review-card">
                  <div className="review-header">
                    <span>{rev.authorName}</span>
                    <span className="rating-pill">
                      {rev.rating !== null ? `★ ${rev.rating}` : ''}
                      {rev.relativePublishTimeDescription
                        ? ` · ${rev.relativePublishTimeDescription}`
                        : ''}
                    </span>
                  </div>
                  {rev.text && <p className="review-text">{rev.text}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
              No customer reviews returned for this place.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
