'use client';

import React from 'react';
import { ArrowLeft, Layers } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import StreetViewPreview from '@/components/StreetViewPreview';
import NearbyAmenitiesPanel from '@/components/NearbyAmenitiesPanel';
import CommuteCalculatorPanel from '@/components/CommuteCalculatorPanel';
import type { CommuteCalculationResult, PropertyListing } from '@/types/real-estate';

interface ListingDetailPanelProps {
  property: PropertyListing;
  onBack: () => void;
  commuteResult: CommuteCalculationResult | null;
  onCommuteComputed: (result: CommuteCalculationResult | null) => void;
}

export default function ListingDetailPanel({
  property,
  onBack,
  commuteResult,
  onCommuteComputed,
}: ListingDetailPanelProps) {
  return (
    <div
      id="listing-detail-panel"
      data-testid="listing-detail-panel"
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <div className="left-pane-header">
        <button type="button" className="back-btn" onClick={onBack}>
          <ArrowLeft size={14} />
          Back to Listings
        </button>
        <span className="parcel-badge">
          <Layers size={12} />
          Parcel APN {property.apn}
        </span>
      </div>

      <div className="left-pane-scroll">
        <div className="detail-container">
          <div className="detail-hero">
            <div className="detail-price-row">
              <div className="detail-price">{formatCurrency(property.price)}</div>
              <span className="property-type-chip">{property.propertyType}</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              {property.address}
            </div>
            <div style={{ fontSize: 12.5, color: '#475569', marginTop: 2 }}>
              {property.neighborhood} · {property.city}, {property.state} {property.zip}
            </div>
            <p style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.5, margin: '10px 0 0' }}>
              {property.description}
            </p>

            <div className="detail-meta-grid">
              <div className="detail-meta-box">
                <div className="detail-meta-label">Layout</div>
                <div className="detail-meta-value">
                  {property.beds} bd / {property.baths} ba
                </div>
              </div>
              <div className="detail-meta-box">
                <div className="detail-meta-label">Interior</div>
                <div className="detail-meta-value">{property.sqft.toLocaleString()} sqft</div>
              </div>
              <div className="detail-meta-box">
                <div className="detail-meta-label">Lot / Zoning</div>
                <div className="detail-meta-value">
                  {property.lotSqFt.toLocaleString()} sf · {property.zoning}
                </div>
              </div>
            </div>
          </div>

          <StreetViewPreview
            lat={property.lat}
            lng={property.lng}
            address={property.address}
          />

          <NearbyAmenitiesPanel property={property} />

          <CommuteCalculatorPanel
            property={property}
            commuteResult={commuteResult}
            onCommuteComputed={onCommuteComputed}
          />
        </div>
      </div>
    </div>
  );
}
