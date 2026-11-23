'use client';

import React from 'react';
import { MapPin, RotateCcw } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import type { PropertyListing } from '@/types/real-estate';

interface PropertyListProps {
  properties: PropertyListing[];
  selectedPropertyId: string | null;
  hoveredPropertyId: string | null;
  onSelectProperty: (property: PropertyListing) => void;
  onHoverProperty: (id: string | null) => void;
  hasActiveAreaFilter: boolean;
  onResetAll: () => void;
}

export default function PropertyList({
  properties,
  selectedPropertyId,
  hoveredPropertyId,
  onSelectProperty,
  onHoverProperty,
  hasActiveAreaFilter,
  onResetAll,
}: PropertyListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="left-pane-header">
        <div>
          <h2 className="left-pane-title">San Francisco Real Estate</h2>
          <div className="left-pane-sub">
            {hasActiveAreaFilter
              ? 'Filtered by drawn Terra Draw search polygon'
              : 'Click a home to inspect lot parcel, Street View & commute'}
          </div>
        </div>
      </div>

      <div id="property-list" data-testid="property-list" className="left-pane-scroll">
        {properties.length === 0 ? (
          <div className="empty-state">
            <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 14 }}>
              No homes match the current filters
            </p>
            <p style={{ margin: '0 0 14px', fontSize: 12.5 }}>
              Adjust price, bedroom, or property type filters, or clear your drawn search area.
            </p>
            <button type="button" className="primary-btn" onClick={onResetAll}>
              <RotateCcw size={14} />
              Reset Filters &amp; Search Area
            </button>
          </div>
        ) : (
          <div className="property-grid">
            {properties.map((property) => {
              const isSelected = property.id === selectedPropertyId;
              const isHovered = property.id === hoveredPropertyId;

              return (
                <button
                  key={property.id}
                  type="button"
                  data-testid="property-card"
                  data-property-id={property.id}
                  className={`property-card${isSelected ? ' property-card--selected' : ''}${
                    isHovered ? ' property-card--hovered' : ''
                  }`}
                  onClick={() => onSelectProperty(property)}
                  onMouseEnter={() => onHoverProperty(property.id)}
                  onMouseLeave={() => onHoverProperty(null)}
                >
                  <div className="property-card-top">
                    <div className="property-price">{formatCurrency(property.price)}</div>
                    <span className="property-type-chip">{property.propertyType}</span>
                  </div>

                  <div className="property-address">{property.address}</div>
                  <div className="property-neighborhood">
                    <MapPin size={13} />
                    <span>
                      {property.neighborhood}, {property.city} {property.zip}
                    </span>
                  </div>

                  <div className="property-specs">
                    <span>{property.beds} bd</span>
                    <span>•</span>
                    <span>{property.baths} ba</span>
                    <span>•</span>
                    <span>{property.sqft.toLocaleString()} sqft</span>
                    <span className="property-apn-tag">APN {property.apn}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
