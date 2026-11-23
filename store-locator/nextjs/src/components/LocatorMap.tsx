'use client';

import { useEffect, useState } from 'react';
import {
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  useMap,
} from '@vis.gl/react-google-maps';
import { BRANCH_TYPE_META, NYC_CENTER } from '@/lib/classify';
import { ClusteredBranchMarkers } from '@/components/ClusteredBranchMarkers';
import { PlaceAutocompleteWidget } from '@/components/PlaceAutocompleteWidget';
import { RoutePolyline } from '@/components/RoutePolyline';
import type {
  Branch,
  ComputedRoute,
  OriginLocation,
  RouteMatrixMetric,
} from '@/types/locator';

interface LocatorMapProps {
  hasApiKey: boolean;
  branches: Branch[];
  selectedBranchId: string | null;
  fastestBranchId: string | null;
  onSelectBranch: (branchId: string) => void;
  origin: OriginLocation;
  onOriginFromWidget: (origin: OriginLocation) => void;
  activeRoute: ComputedRoute | null;
  metricsByBranchId: Record<string, RouteMatrixMetric>;
  onRefreshSearchArea: (center: { lat: number; lng: number }) => void;
}

function MapViewportSync({
  origin,
  onSearchCenter,
}: {
  origin: OriginLocation;
  onSearchCenter: (center: { lat: number; lng: number }) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.panTo(origin.location);
  }, [map, origin.location]);

  return (
    <div className="map-top-right-actions">
      <button
        type="button"
        className="map-action-btn"
        onClick={() => {
          if (!map) return;
          const center = map.getCenter();
          if (center) {
            const coords = center.toJSON();
            onSearchCenter(coords);
          }
        }}
      >
        Search This Area
      </button>
      <button
        type="button"
        className="map-action-btn"
        onClick={() => {
          if (!map) return;
          map.panTo(NYC_CENTER);
          map.setZoom(12);
        }}
      >
        Reset NYC View
      </button>
    </div>
  );
}

export function LocatorMap({
  hasApiKey,
  branches,
  selectedBranchId,
  fastestBranchId,
  onSelectBranch,
  origin,
  onOriginFromWidget,
  activeRoute,
  metricsByBranchId,
  onRefreshSearchArea,
}: LocatorMapProps) {
  const [infoClosedForId, setInfoClosedForId] = useState<string | null>(null);
  const selectedBranch =
    branches.find((b) => b.id === selectedBranchId) ?? null;

  useEffect(() => {
    setInfoClosedForId(null);
  }, [selectedBranchId]);

  const showInfoWindow =
    Boolean(selectedBranch) && infoClosedForId !== selectedBranch?.id;

  const selectedMetric = selectedBranch
    ? metricsByBranchId[selectedBranch.id]
    : undefined;

  return (
    <section className="map-pane" aria-label="Interactive NYC branch map">
      <div className="map-container" data-testid="map-container">
        {hasApiKey ? (
          <GoogleMap
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
            defaultCenter={NYC_CENTER}
            defaultZoom={12}
            gestureHandling="greedy"
            mapTypeControl={false}
            streetViewControl={false}
            fullscreenControl={true}
            style={{ width: '100%', height: '100%', minHeight: '560px' }}
          >
            <PlaceAutocompleteWidget onSelectOrigin={onOriginFromWidget} />

            <MapViewportSync
              origin={origin}
              onSearchCenter={onRefreshSearchArea}
            />

            <ClusteredBranchMarkers
              branches={branches}
              selectedBranchId={selectedBranchId}
              fastestBranchId={fastestBranchId}
              onSelectBranch={onSelectBranch}
            />

            <AdvancedMarker
              position={origin.location}
              zIndex={1500}
              title={`Starting Origin: ${origin.label}`}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    padding: '5px 10px',
                    borderRadius: '999px',
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: '2.5px solid #38bdf8',
                    boxShadow: '0 6px 16px rgba(15, 23, 42, 0.35)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  You: {origin.label.split('/')[0].trim()}
                </div>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '999px',
                    backgroundColor: '#0284c7',
                    border: '2.5px solid #ffffff',
                    marginTop: '3px',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.35)',
                  }}
                />
              </div>
            </AdvancedMarker>

            <RoutePolyline
              route={activeRoute}
              originLocation={origin.location}
              destinationLocation={selectedBranch?.location ?? null}
            />

            {selectedBranch && showInfoWindow && (
              <InfoWindow
                position={selectedBranch.location}
                pixelOffset={[0, -40]}
                onCloseClick={() => setInfoClosedForId(selectedBranch.id)}
              >
                <div
                  style={{
                    maxWidth: '250px',
                    padding: '2px 4px',
                    fontFamily: 'inherit',
                  }}
                >
                  <div
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: BRANCH_TYPE_META[selectedBranch.branchType].color,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: '3px',
                    }}
                  >
                    {BRANCH_TYPE_META[selectedBranch.branchType].label}
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#0f172a',
                      marginBottom: '4px',
                    }}
                  >
                    {selectedBranch.name}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#475569',
                      marginBottom: '6px',
                      lineHeight: 1.35,
                    }}
                  >
                    {selectedBranch.address}
                  </div>
                  {(activeRoute?.branchId === selectedBranch.id ||
                    selectedMetric) && (
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#1d4ed8',
                        marginBottom: '4px',
                      }}
                    >
                      {activeRoute?.branchId === selectedBranch.id
                        ? `${activeRoute.durationText} · ${activeRoute.distanceText}`
                        : `${selectedMetric?.durationText} · ${selectedMetric?.distanceText}`}
                    </div>
                  )}
                  {selectedBranch.weekdayDescriptions[0] && (
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {selectedBranch.weekdayDescriptions[0]}
                    </div>
                  )}
                </div>
              </InfoWindow>
            )}
          </GoogleMap>
        ) : (
          <div className="missing-key-overlay">
            <div className="missing-key-card">
              <h2>Google Maps API Key Required</h2>
              <p>
                Configure <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in{' '}
                <code>.env.local</code> to initialize the interactive NYC map,
                live Places API (New) search, and Routes API calculations.
              </p>
              <ol>
                <li>
                  Copy <code>.env.example</code> to <code>.env.local</code>.
                </li>
                <li>
                  Get a free zero-billing Maps Demo Key from{' '}
                  <a
                      href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
                    target="_blank"
                    rel="noreferrer"
                  >
                    mapsplatform.google.com/maps-demo-key
                  </a>
                  .
                </li>
                <li>Restart the Next.js server.</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      <div className="map-legend" data-testid="map-legend">
        <div className="legend-title">NYC Branch Legend</div>
        <div className="legend-items">
          <div className="legend-item">
            <span
              className="legend-dot"
              style={{ backgroundColor: '#1d4ed8' }}
            />
            <span>Flagship Store</span>
          </div>
          <div className="legend-item">
            <span
              className="legend-dot"
              style={{ backgroundColor: '#d97706' }}
            />
            <span>Express Kiosk</span>
          </div>
          <div className="legend-item">
            <span
              className="legend-dot"
              style={{ backgroundColor: '#059669' }}
            />
            <span>24/7 ATM</span>
          </div>
        </div>
        <div className="legend-hint">
          Zoom in or click a cluster to expand individual branch markers.
        </div>
      </div>
    </section>
  );
}
