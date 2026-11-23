'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Compass, GraduationCap, ShoppingBag, Star, TrainFront } from 'lucide-react';
import {
  classifyAmenityCategory,
  formatDistance,
  formatPrimaryTypeLabel,
  haversineDistanceMeters,
} from '@/lib/formatters';
import type { AmenityCategory, NearbyAmenity, PropertyListing } from '@/types/real-estate';

interface NearbyAmenitiesPanelProps {
  property: PropertyListing;
}

interface RawNearbyPlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  primaryType?: string;
  rating?: number;
  userRatingCount?: number;
  location?: {
    latitude?: number;
    longitude?: number;
  };
}

const CATEGORY_GROUPS: Array<{
  category: Exclude<AmenityCategory, 'all'>;
  includedTypes: string[];
}> = [
  {
    category: 'schools',
    includedTypes: ['school', 'primary_school', 'secondary_school'],
  },
  {
    category: 'groceries',
    includedTypes: ['supermarket', 'grocery_store'],
  },
  {
    category: 'transit',
    includedTypes: ['transit_station', 'subway_station', 'light_rail_station', 'bus_station'],
  },
];

export default function NearbyAmenitiesPanel({ property }: NearbyAmenitiesPanelProps) {
  const [activeTab, setActiveTab] = useState<AmenityCategory>('all');
  const [amenities, setAmenities] = useState<NearbyAmenity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadNearby() {
      setLoading(true);
      setError(null);

      try {
        const responses = await Promise.all(
          CATEGORY_GROUPS.map(async (group) => {
            const res = await fetch('/api/places/nearby', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lat: property.lat,
                lng: property.lng,
                radiusMeters: 5000,
                includedTypes: group.includedTypes,
                maxResultCount: 5,
              }),
            });
            const payload = await res.json();
            if (!res.ok) {
              throw new Error(payload?.error || 'Failed to fetch nearby places');
            }
            const places: RawNearbyPlace[] = Array.isArray(payload?.places) ? payload.places : [];
            return { category: group.category, places };
          })
        );

        if (cancelled) return;

        const seenIds = new Set<string>();
        const normalized: NearbyAmenity[] = [];

        for (const { category, places } of responses) {
          for (const place of places) {
            const id = place.id || '';
            const lat = place.location?.latitude;
            const lng = place.location?.longitude;
            if (!id || typeof lat !== 'number' || typeof lng !== 'number' || seenIds.has(id)) {
              continue;
            }
            seenIds.add(id);

            const distanceMeters = haversineDistanceMeters(
              { lat: property.lat, lng: property.lng },
              { lat, lng }
            );

            normalized.push({
              id,
              name: place.displayName?.text || 'Unnamed Place',
              address: place.formattedAddress || '',
              primaryType: place.primaryType || '',
              category: place.primaryType ? classifyAmenityCategory(place.primaryType) : category,
              lat,
              lng,
              distanceMeters,
              rating: typeof place.rating === 'number' ? place.rating : undefined,
              userRatingCount:
                typeof place.userRatingCount === 'number' ? place.userRatingCount : undefined,
            });
          }
        }

        normalized.sort((a, b) => a.distanceMeters - b.distanceMeters);
        setAmenities(normalized);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load nearby amenities.');
          setAmenities([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadNearby();
    return () => {
      cancelled = true;
    };
  }, [property.id, property.lat, property.lng]);

  const visibleAmenities = useMemo(() => {
    if (activeTab === 'all') return amenities;
    return amenities.filter((item) => item.category === activeTab);
  }, [amenities, activeTab]);

  const renderCategoryIcon = (category: Exclude<AmenityCategory, 'all'>) => {
    if (category === 'schools') return <GraduationCap size={13} />;
    if (category === 'groceries') return <ShoppingBag size={13} />;
    return <TrainFront size={13} />;
  };

  return (
    <div
      id="nearby-amenities-panel"
      data-testid="nearby-amenities-panel"
      className="section-card"
    >
      <div className="section-header">
        <h3 className="section-title">
          <Compass size={15} />
          Nearby Essentials (5 km)
        </h3>
        <span className="status-note" style={{ margin: 0 }}>
          Places API (New)
        </span>
      </div>

      <div className="amenity-tabs" role="tablist" aria-label="Nearby amenity categories">
        <button
          id="amenity-tab-all"
          data-testid="amenity-tab-all"
          type="button"
          role="tab"
          aria-selected={activeTab === 'all'}
          className={`amenity-tab${activeTab === 'all' ? ' amenity-tab--active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All ({amenities.length})
        </button>
        <button
          id="amenity-tab-schools"
          data-testid="amenity-tab-schools"
          type="button"
          role="tab"
          aria-selected={activeTab === 'schools'}
          className={`amenity-tab${activeTab === 'schools' ? ' amenity-tab--active' : ''}`}
          onClick={() => setActiveTab('schools')}
        >
          Schools
        </button>
        <button
          id="amenity-tab-groceries"
          data-testid="amenity-tab-groceries"
          type="button"
          role="tab"
          aria-selected={activeTab === 'groceries'}
          className={`amenity-tab${activeTab === 'groceries' ? ' amenity-tab--active' : ''}`}
          onClick={() => setActiveTab('groceries')}
        >
          Groceries
        </button>
        <button
          id="amenity-tab-transit"
          data-testid="amenity-tab-transit"
          type="button"
          role="tab"
          aria-selected={activeTab === 'transit'}
          className={`amenity-tab${activeTab === 'transit' ? ' amenity-tab--active' : ''}`}
          onClick={() => setActiveTab('transit')}
        >
          Transit
        </button>
      </div>

      {loading && <p className="status-note">Discovering nearby schools, groceries &amp; transit…</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && (
        <div
          id="nearby-amenities-list"
          data-testid="nearby-amenities-list"
          className="amenity-list"
        >
          {visibleAmenities.length === 0 ? (
            <p className="status-note">No nearby places found for this category within 5 km.</p>
          ) : (
            visibleAmenities.map((item) => (
              <div key={item.id} className="amenity-item">
                <div style={{ minWidth: 0 }}>
                  <div className="amenity-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {renderCategoryIcon(item.category)}
                    <span>{item.name}</span>
                  </div>
                  <div className="amenity-sub">
                    {formatPrimaryTypeLabel(item.primaryType)}
                    {item.address ? ` · ${item.address}` : ''}
                  </div>
                </div>
                <div className="amenity-metrics">
                  <div className="amenity-distance">{formatDistance(item.distanceMeters)}</div>
                  {typeof item.rating === 'number' && (
                    <div className="amenity-rating">
                      <Star
                        size={11}
                        style={{ display: 'inline', verticalAlign: '-1px', marginRight: 2 }}
                      />
                      {item.rating.toFixed(1)}
                      {typeof item.userRatingCount === 'number' ? ` (${item.userRatingCount})` : ''}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
