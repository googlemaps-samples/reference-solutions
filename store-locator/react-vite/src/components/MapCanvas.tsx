import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  MarkerClusterer,
  SuperClusterAlgorithm,
  type Cluster,
} from '@googlemaps/markerclusterer';
import {
  BRANCH_TYPE_META,
  INITIAL_ZOOM,
  NYC_CENTER,
  SERVICE_META,
  type ActiveRouteInfo,
  type BranchLocation,
  type BranchMatrixMetrics,
  type OriginPoint,
} from '../types/locator';
import { BranchTypeIcon, RouteBoltIcon } from './Icons';

interface MapCanvasProps {
  branches: BranchLocation[];
  metricsById: Record<string, BranchMatrixMetrics>;
  origin: OriginPoint;
  selectedBranchId: string | null;
  fastestBranchId: string | null;
  activeRoute: ActiveRouteInfo | null;
  onSelectBranch: (branchId: string) => void;
  onClearSelection: () => void;
  hasApiKey: boolean;
}

interface BranchMarkerItemProps {
  branch: BranchLocation;
  isSelected: boolean;
  isFastest: boolean;
  onSelect: (branchId: string) => void;
  setMarkerRef: (
    marker: google.maps.marker.AdvancedMarkerElement | null,
    key: string
  ) => void;
}

const BranchMarkerItem: React.FC<BranchMarkerItemProps> = ({
  branch,
  isSelected,
  isFastest,
  onSelect,
  setMarkerRef,
}) => {
  const meta = BRANCH_TYPE_META[branch.branchType];
  const handleClick = useCallback(
    () => onSelect(branch.id),
    [onSelect, branch.id]
  );

  const refCallback = useCallback(
    (marker: google.maps.marker.AdvancedMarkerElement | null) => {
      setMarkerRef(marker, branch.id);
    },
    [setMarkerRef, branch.id]
  );

  return (
    <AdvancedMarker
      ref={refCallback}
      position={branch.location}
      title={branch.name}
      zIndex={isSelected ? 800 : isFastest ? 600 : 200}
      onClick={handleClick}
    >
      <div
        className={`custom-branch-pin ${isSelected ? 'selected' : ''} ${isFastest ? 'fastest' : ''}`}
        data-branch-type={branch.branchType}
        style={{
          backgroundColor: meta.color,
        }}
      >
        <BranchTypeIcon type={branch.branchType} size={15} />
        {isFastest && <span className="pin-fastest-dot" title="Fastest" />}
      </div>
    </AdvancedMarker>
  );
};

interface ClusteredBranchLayerProps {
  branches: BranchLocation[];
  metricsById: Record<string, BranchMatrixMetrics>;
  selectedBranchId: string | null;
  fastestBranchId: string | null;
  onSelectBranch: (branchId: string) => void;
  onClearSelection: () => void;
}

const ClusteredBranchLayer: React.FC<ClusteredBranchLayerProps> = ({
  branches,
  metricsById,
  selectedBranchId,
  fastestBranchId,
  onSelectBranch,
  onClearSelection,
}) => {
  const map = useMap();
  const markerLibrary = useMapsLibrary('marker');
  const [markers, setMarkers] = useState<
    Record<string, google.maps.marker.AdvancedMarkerElement>
  >({});

  const selectedBranch = useMemo(
    () =>
      selectedBranchId
        ? branches.find((b) => b.id === selectedBranchId) ?? null
        : null,
    [branches, selectedBranchId]
  );

  const clusterer = useMemo(() => {
    if (!map || !markerLibrary) return null;

    return new MarkerClusterer({
      map,
      algorithm: new SuperClusterAlgorithm({
        radius: 72,
        maxZoom: 15,
      }),
      renderer: {
        render: ({ count, position }: Cluster) => {
          const el = document.createElement('div');
          el.className = 'cluster-pin-badge';
          el.textContent = String(count);
          el.title = `${count} nearby branches — click to zoom in`;

          return new markerLibrary.AdvancedMarkerElement({
            position,
            content: el,
            zIndex: 950 + count,
          });
        },
      },
      onClusterClick: (_event, cluster, targetMap) => {
        if (cluster.bounds) {
          targetMap.fitBounds(cluster.bounds, 64);
        }
      },
    });
  }, [map, markerLibrary]);

  useEffect(() => {
    return () => {
      clusterer?.clearMarkers();
      clusterer?.setMap(null);
    };
  }, [clusterer]);

  useEffect(() => {
    if (!clusterer) return;
    const validIds: Record<string, true> = {};
    for (const branch of branches) {
      validIds[branch.id] = true;
    }
    const activeMarkers = Object.entries(markers)
      .filter(([key]) => validIds[key])
      .map(([, marker]) => marker);

    clusterer.clearMarkers();
    if (activeMarkers.length > 0) {
      clusterer.addMarkers(activeMarkers);
    }
  }, [clusterer, markers, branches]);

  const setMarkerRef = useCallback(
    (marker: google.maps.marker.AdvancedMarkerElement | null, key: string) => {
      setMarkers((prev) => {
        if ((marker && prev[key] === marker) || (!marker && !prev[key])) {
          return prev;
        }
        if (marker) {
          return { ...prev, [key]: marker };
        }
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    []
  );

  useEffect(() => {
    if (!map || !selectedBranch) return;
    map.panTo(selectedBranch.location);
    const currentZoom = map.getZoom() ?? INITIAL_ZOOM;
    if (currentZoom < 15) {
      map.setZoom(15);
    }
  }, [map, selectedBranch]);

  const selectedMetrics = selectedBranch
    ? metricsById[selectedBranch.id]
    : undefined;
  const selectedAnchor =
    selectedBranch && markers[selectedBranch.id]
      ? markers[selectedBranch.id]
      : null;

  return (
    <>
      {branches.map((branch) => (
        <BranchMarkerItem
          key={branch.id}
          branch={branch}
          isSelected={branch.id === selectedBranchId}
          isFastest={branch.id === fastestBranchId}
          onSelect={onSelectBranch}
          setMarkerRef={setMarkerRef}
        />
      ))}

      {selectedBranch && selectedAnchor && (
        <InfoWindow
          anchor={selectedAnchor}
          onCloseClick={onClearSelection}
          pixelOffset={[0, -6]}
        >
          <div className="info-window-card">
            <div className="info-window-badges">
              <span
                className="info-type-pill"
                style={{
                  color: BRANCH_TYPE_META[selectedBranch.branchType].badgeTextColor,
                  backgroundColor:
                    BRANCH_TYPE_META[selectedBranch.branchType].bgColor,
                }}
              >
                {BRANCH_TYPE_META[selectedBranch.branchType].label}
              </span>
              {selectedBranch.id === fastestBranchId && (
                <span className="info-fastest-pill">
                  <RouteBoltIcon size={11} />
                  Fastest
                </span>
              )}
            </div>
            <h4 className="info-window-title">{selectedBranch.name}</h4>
            <p className="info-window-address">{selectedBranch.address}</p>

            {selectedMetrics && (
              <div className="info-window-metrics">
                <strong>{selectedMetrics.durationText}</strong>
                <span>·</span>
                <span>{selectedMetrics.distanceText}</span>
              </div>
            )}

            <p className="info-window-hours">{selectedBranch.todayHours}</p>

            <div className="info-window-services">
              {selectedBranch.services.map((svc) => (
                <span key={svc} className="info-service-tag">
                  {SERVICE_META[svc].shortLabel}
                </span>
              ))}
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

const RoutePolylineLayer: React.FC<{ activeRoute: ActiveRouteInfo | null }> = ({
  activeRoute,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !activeRoute) return;

    const polylines = activeRoute.route.createPolylines(
      activeRoute.travelMode === 'TRANSIT'
        ? {
            polylineOptions: {
              strokeWeight: 6,
              strokeOpacity: 0.9,
              zIndex: 500,
            },
          }
        : {
            polylineOptions: {
              strokeColor: '#2563EB',
              strokeOpacity: 0.92,
              strokeWeight: 6,
              zIndex: 500,
            },
          }
    );

    polylines.forEach((line) => line.setMap(map));

    if (activeRoute.route.viewport) {
      map.fitBounds(activeRoute.route.viewport, {
        top: 64,
        right: 64,
        bottom: 100,
        left: 64,
      });
    }

    return () => {
      polylines.forEach((line) => line.setMap(null));
    };
  }, [map, activeRoute]);

  return null;
};

export const MapCanvas: React.FC<MapCanvasProps> = ({
  branches,
  metricsById,
  origin,
  selectedBranchId,
  fastestBranchId,
  activeRoute,
  onSelectBranch,
  onClearSelection,
  hasApiKey,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(INITIAL_ZOOM);

  return (
    <section
      className="map-container"
      data-testid="map-container"
      aria-label="Interactive NYC branch map"
    >
      {hasApiKey ? (
        <GoogleMap
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
          defaultCenter={NYC_CENTER}
          defaultZoom={INITIAL_ZOOM}
          gestureHandling="greedy"
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={true}
          onZoomChanged={(e) => {
            if (typeof e.detail.zoom === 'number') {
              setZoomLevel(Math.round(e.detail.zoom));
            }
          }}
          className="google-map-root"
        >
          <AdvancedMarker
            position={origin.location}
            title={`Origin: ${origin.label}`}
            zIndex={900}
          >
            <div className="origin-pin-marker">
              <span className="origin-pin-pulse" />
              <span className="origin-pin-core">YOU</span>
            </div>
          </AdvancedMarker>

          <ClusteredBranchLayer
            branches={branches}
            metricsById={metricsById}
            selectedBranchId={selectedBranchId}
            fastestBranchId={fastestBranchId}
            onSelectBranch={onSelectBranch}
            onClearSelection={onClearSelection}
          />

          <RoutePolylineLayer activeRoute={activeRoute} />
        </GoogleMap>
      ) : (
        <div className="map-placeholder-state">
          <div className="map-placeholder-card">
            <h2>Google Maps Preview Unavailable</h2>
            <p>
              Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in{' '}
              <code>.env.local</code> using a free Maps Demo Key or Google Cloud
              key to render the interactive NYC map, Marker Clustering, Places
              API (New) search, and Routes API polylines.
            </p>
            <a
                href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
              target="_blank"
              rel="noreferrer"
              className="demo-key-cta"
            >
              Get a Free Maps Demo Key
            </a>
          </div>
        </div>
      )}

      <div className="map-legend" data-testid="map-legend">
        <div className="legend-items">
          <span className="legend-item">
            <span
              className="legend-dot"
              style={{ backgroundColor: BRANCH_TYPE_META.flagship.color }}
            />
            Flagship Store
          </span>
          <span className="legend-item">
            <span
              className="legend-dot"
              style={{ backgroundColor: BRANCH_TYPE_META.kiosk.color }}
            />
            Express Kiosk
          </span>
          <span className="legend-item">
            <span
              className="legend-dot"
              style={{ backgroundColor: BRANCH_TYPE_META.atm.color }}
            />
            24/7 ATM
          </span>
          <span className="legend-item">
            <span className="legend-cluster-dot">3+</span>
            Cluster
          </span>
          <span className="legend-item">
            <span className="legend-origin-dot" />
            Origin
          </span>
        </div>
        <div className="legend-zoom-hint">
          Zoom {zoomLevel} · {zoomLevel < 15 ? 'Zoom in or click clusters to expand' : 'Showing individual branch pins'}
        </div>
      </div>
    </section>
  );
};
