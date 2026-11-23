'use client';

import React, { useEffect, useState } from 'react';
import { Car, Navigation, TrainFront } from 'lucide-react';
import type { CommuteCalculationResult, PropertyListing } from '@/types/real-estate';

interface CommuteCalculatorPanelProps {
  property: PropertyListing;
  commuteResult: CommuteCalculationResult | null;
  onCommuteComputed: (result: CommuteCalculationResult | null) => void;
}

const WORKPLACE_PRESETS = [
  'Salesforce Tower, San Francisco, CA',
  'Ferry Building, San Francisco, CA',
  'UCSF Mission Bay, San Francisco, CA',
];

export default function CommuteCalculatorPanel({
  property,
  commuteResult,
  onCommuteComputed,
}: CommuteCalculatorPanelProps) {
  const [workplaceQuery, setWorkplaceQuery] = useState(
    'Salesforce Tower, San Francisco, CA'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear previous property-specific route when switching to a different listing
  useEffect(() => {
    onCommuteComputed(null);
    setError(null);
  }, [property.id, onCommuteComputed]);

  const runCalculation = async (queryOverride?: string) => {
    const rawQuery = (queryOverride ?? workplaceQuery).trim();
    if (!rawQuery) {
      setError('Please enter a workplace address or landmark.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Resolve workplace destination via Places API (New) Text Search BFF
      const textQuery = rawQuery.toLowerCase().includes('san francisco')
        ? rawQuery
        : `${rawQuery}, San Francisco, CA`;

      const placeRes = await fetch('/api/places/search-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textQuery,
          biasCenter: { lat: property.lat, lng: property.lng },
          biasRadiusMeters: 25000,
        }),
      });

      const placePayload = await placeRes.json();
      if (!placeRes.ok) {
        throw new Error(placePayload?.error || 'Could not resolve workplace address.');
      }

      const topPlace = placePayload?.places?.[0];
      if (!topPlace?.location) {
        throw new Error('No matching workplace location found. Try a more specific address.');
      }

      const destinationLocation = {
        lat: topPlace.location.latitude as number,
        lng: topPlace.location.longitude as number,
      };
      const destinationLabel =
        topPlace.displayName?.text || topPlace.formattedAddress || rawQuery;

      const origin = { lat: property.lat, lng: property.lng };

      // 2. Compute Driving (TRAFFIC_AWARE) & Transit ETAs via Routes API Route Matrix
      //    and fetch encoded polyline via Compute Routes in parallel.
      const [matrixRes, routeRes] = await Promise.all([
        fetch('/api/routes/matrix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origin, destination: destinationLocation }),
        }),
        fetch('/api/routes/compute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin,
            destination: destinationLocation,
            travelMode: 'DRIVE',
          }),
        }),
      ]);

      const matrixPayload = await matrixRes.json();
      if (!matrixRes.ok) {
        throw new Error(matrixPayload?.error || 'Route Matrix calculation failed.');
      }

      let encodedPolyline: string | null = null;
      if (routeRes.ok) {
        const routePayload = await routeRes.json();
        encodedPolyline = routePayload?.routes?.[0]?.polyline?.encodedPolyline ?? null;
      }

      onCommuteComputed({
        destinationLabel,
        destinationLocation,
        drive: matrixPayload.drive,
        transit: matrixPayload.transit,
        encodedPolyline,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to calculate commute.');
      onCommuteComputed(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runCalculation();
  };

  return (
    <div
      id="commute-calculator-panel"
      data-testid="commute-calculator-panel"
      className="section-card"
    >
      <div className="section-header">
        <h3 className="section-title">
          <Navigation size={15} />
          Workplace Commute Calculator
        </h3>
        <span className="status-note" style={{ margin: 0 }}>
          Routes API Matrix
        </span>
      </div>

      <form className="commute-form" onSubmit={handleSubmit}>
        <input
          id="workplace-input"
          data-testid="workplace-input"
          type="text"
          className="text-input"
          placeholder="Enter workplace address or landmark..."
          aria-label="Workplace destination"
          value={workplaceQuery}
          onChange={(e) => setWorkplaceQuery(e.target.value)}
        />
        <button
          id="calculate-commute-btn"
          data-testid="calculate-commute-btn"
          type="submit"
          className="primary-btn"
          disabled={loading}
        >
          {loading ? 'Calculating…' : 'Calculate'}
        </button>
      </form>

      <div className="preset-chips">
        {WORKPLACE_PRESETS.map((preset) => {
          const shortName = preset.split(',')[0];
          return (
            <button
              key={preset}
              type="button"
              className="preset-chip"
              onClick={() => {
                setWorkplaceQuery(preset);
                void runCalculation(preset);
              }}
            >
              {shortName}
            </button>
          );
        })}
      </div>

      {error && <p className="error-text">{error}</p>}

      {commuteResult && (
        <div>
          <p className="status-note" style={{ marginBottom: 8 }}>
            To: <strong>{commuteResult.destinationLabel}</strong>
          </p>
          <div className="commute-results-grid">
            <div
              id="commute-drive-eta"
              data-testid="commute-drive-eta"
              className="commute-result-card"
            >
              <div className="commute-mode-label">
                <Car size={13} />
                Drive (Traffic-Aware)
              </div>
              <div className="commute-eta-value">
                {commuteResult.drive.available ? commuteResult.drive.durationText : 'Unavailable'}
              </div>
              <div className="commute-dist-sub">{commuteResult.drive.distanceText}</div>
            </div>

            <div
              id="commute-transit-eta"
              data-testid="commute-transit-eta"
              className="commute-result-card"
            >
              <div className="commute-mode-label">
                <TrainFront size={13} />
                Public Transit
              </div>
              <div className="commute-eta-value">
                {commuteResult.transit.available
                  ? commuteResult.transit.durationText
                  : 'Unavailable'}
              </div>
              <div className="commute-dist-sub">{commuteResult.transit.distanceText}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
