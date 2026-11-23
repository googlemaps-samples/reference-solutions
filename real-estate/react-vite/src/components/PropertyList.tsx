import React, { useEffect, useRef } from 'react';
import { BedDouble, Bath, Maximize2, MapPin, Layers } from 'lucide-react';
import { formatCurrencyFull } from '../data/properties';
import type { PropertyListing } from '../types';

interface PropertyListProps {
  properties: PropertyListing[];
  selectedPropertyId: string | null;
  hoveredPropertyId: string | null;
  hasPolygonFilter: boolean;
  onSelectProperty: (propertyId: string) => void;
  onHoverProperty: (propertyId: string | null) => void;
  onResetAllFilters: () => void;
}

export const PropertyList: React.FC<PropertyListProps> = ({
  properties,
  selectedPropertyId,
  hoveredPropertyId,
  hasPolygonFilter,
  onSelectProperty,
  onHoverProperty,
  onResetAllFilters,
}) => {
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!selectedPropertyId) return;
    const node = cardRefs.current[selectedPropertyId];
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedPropertyId]);

  return (
    <section className="property-list-section" aria-label="Matching Real Estate Listings">
      <div className="section-header-row">
        <div>
          <h2 className="section-title">San Francisco Listings</h2>
          <p className="section-caption">
            Click a listing or map pill to inspect its parcel boundary, Street View, amenities &amp; commute
          </p>
        </div>
      </div>

      <div id="property-list" data-testid="property-list" className="property-list">
        {properties.length === 0 ? (
          <div className="empty-listings-card">
            <p className="empty-listings-title">No homes match the current filters</p>
            <p className="empty-listings-copy">
              {hasPolygonFilter
                ? 'Try clearing your drawn search polygon or widening your price/bedroom criteria.'
                : 'Try adjusting your max price, minimum bedrooms, or property type filter.'}
            </p>
            <button type="button" className="secondary-btn" onClick={onResetAllFilters}>
              Reset filters
            </button>
          </div>
        ) : (
          properties.map((property) => {
            const isSelected = property.id === selectedPropertyId;
            const isHovered = property.id === hoveredPropertyId;

            return (
              <article
                key={property.id}
                ref={(el) => {
                  cardRefs.current[property.id] = el;
                }}
                data-testid="property-card"
                data-property-id={property.id}
                className={`property-card ${isSelected ? 'selected' : ''} ${
                  isHovered ? 'hovered' : ''
                }`}
                onClick={() => onSelectProperty(property.id)}
                onMouseEnter={() => onHoverProperty(property.id)}
                onMouseLeave={() => onHoverProperty(null)}
                tabIndex={0}
                role="button"
                aria-pressed={isSelected}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectProperty(property.id);
                  }
                }}
              >
                <div
                  className="property-card-banner"
                  style={{ background: property.accentGradient }}
                >
                  <span className="property-type-chip">{property.propertyType}</span>
                  <span className="property-neighborhood-chip">{property.neighborhood}</span>
                </div>

                <div className="property-card-body">
                  <div className="property-price-row">
                    <span className="property-price">{formatCurrencyFull(property.price)}</span>
                    <span className="property-dom">{property.daysOnMarket}d on market</span>
                  </div>

                  <div className="property-specs-row">
                    <span>
                      <BedDouble size={13} /> {property.beds} bd
                    </span>
                    <span>
                      <Bath size={13} /> {property.baths} ba
                    </span>
                    <span>
                      <Maximize2 size={13} /> {property.sqft.toLocaleString()} sqft
                    </span>
                    <span>
                      <Layers size={13} /> Lot {property.lotSizeSqFt.toLocaleString()} sqft
                    </span>
                  </div>

                  <h3 className="property-title">{property.title}</h3>
                  <p className="property-address">
                    <MapPin size={12} /> {property.address}
                  </p>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
};
