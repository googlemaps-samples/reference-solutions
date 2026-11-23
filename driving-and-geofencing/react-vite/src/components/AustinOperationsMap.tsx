import { useEffect } from 'react';
import {
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useMap,
} from '@vis.gl/react-google-maps';
import { Hand, MousePointer, Pentagon, Trash2 } from 'lucide-react';
import { AUSTIN_CENTER, AUSTIN_ZOOM } from '../data/austinSeedData';
import { useTerraDraw } from '../hooks/useTerraDraw';
import type {
  AuditSite,
  GeofenceZone,
  LatLngPoint,
  OptimizedRouteSummary,
  TerraDrawModeName,
} from '../types/geofencing';
import { formatDistance, formatDuration } from '../utils/formatters';
import { RoutePolylineLayer } from './RoutePolylineLayer';
import { SeededPolygonsLayer } from './SeededPolygonsLayer';

interface TerraDrawControllerProps {
  requestedMode: TerraDrawModeName;
  clearSignal: number;
  onReadyChange: (ready: boolean) => void;
  onModeChange: (mode: TerraDrawModeName) => void;
  onDrawnZonesChange: (zones: GeofenceZone[]) => void;
}

function TerraDrawController({
  requestedMode,
  clearSignal,
  onReadyChange,
  onModeChange,
  onDrawnZonesChange,
}: TerraDrawControllerProps) {
  const { isReady, activeMode, drawnZones, setMode, clearDrawn } = useTerraDraw();

  useEffect(() => {
    onReadyChange(isReady);
  }, [isReady, onReadyChange]);

  useEffect(() => {
    onModeChange(activeMode);
  }, [activeMode, onModeChange]);

  useEffect(() => {
    onDrawnZonesChange(drawnZones);
  }, [drawnZones, onDrawnZonesChange]);

  useEffect(() => {
    if (!isReady) return;
    if (requestedMode !== activeMode) {
      setMode(requestedMode);
    }
  }, [isReady, requestedMode, activeMode, setMode]);

  useEffect(() => {
    if (!isReady || clearSignal === 0) return;
    clearDrawn();
  }, [isReady, clearSignal, clearDrawn]);

  return null;
}

interface CameraControllerProps {
  panTarget: { center: LatLngPoint; zoom?: number; seq: number } | null;
}

function CameraController({ panTarget }: CameraControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || !panTarget) return;
    map.panTo(panTarget.center);
    if (typeof panTarget.zoom === 'number') {
      map.setZoom(panTarget.zoom);
    }
  }, [map, panTarget]);

  return null;
}

interface WorkerMarkerProps {
  position: LatLngPoint;
  address: string;
  matchedZone: GeofenceZone | null;
  isSelected: boolean;
  onSelect: () => void;
  onClose: () => void;
}

function WorkerMarker({
  position,
  address,
  matchedZone,
  isSelected,
  onSelect,
  onClose,
}: WorkerMarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const isInside = matchedZone !== null;

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={position}
        title="Simulated Field Worker GPS"
        zIndex={50}
        onClick={onSelect}
      >
        <div
          className={`worker-marker-chip ${
            isInside ? 'worker-marker-inside' : 'worker-marker-outside'
          }`}
        >
          <span className="worker-pulse-dot" />
          <span className="worker-marker-label">WORKER</span>
        </div>
      </AdvancedMarker>
      {isSelected && marker && (
        <InfoWindow anchor={marker} onCloseClick={onClose}>
          <div className="map-infowindow">
            <div className="infowindow-title">Field Worker GPS Position</div>
            <div className="infowindow-status">
              {isInside
                ? `Inside: ${matchedZone.name}`
                : 'Outside active geofences'}
            </div>
            <div className="infowindow-address">{address}</div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

interface AuditStopMarkerProps {
  site: AuditSite;
  index: number;
  legDistanceMeters?: number;
  legDurationMillis?: number;
  isSelected: boolean;
  onSelect: () => void;
  onClose: () => void;
}

function AuditStopMarker({
  site,
  index,
  legDistanceMeters,
  legDurationMillis,
  isSelected,
  onSelect,
  onClose,
}: AuditStopMarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={site.location}
        title={`Stop ${index + 1}: ${site.name}`}
        zIndex={30 + index}
        onClick={onSelect}
      >
        <Pin
          background="#1d4ed8"
          borderColor="#1e3a8a"
          glyphColor="#ffffff"
          glyphText={String(index + 1)}
        />
      </AdvancedMarker>
      {isSelected && marker && (
        <InfoWindow anchor={marker} onCloseClick={onClose}>
          <div className="map-infowindow">
            <div className="infowindow-title">
              Stop #{index + 1}: {site.name}
            </div>
            {site.primaryType && (
              <div className="infowindow-type">{site.primaryType}</div>
            )}
            <div className="infowindow-address">{site.address}</div>
            {typeof legDistanceMeters === 'number' &&
              typeof legDurationMillis === 'number' && (
                <div className="infowindow-leg">
                  Drive leg: {formatDistance(legDistanceMeters)} ·{' '}
                  {formatDuration(legDurationMillis)}
                </div>
              )}
          </div>
        </InfoWindow>
      )}
    </>
  );
}

interface AustinOperationsMapProps {
  allZones: GeofenceZone[];
  matchedZone: GeofenceZone | null;
  workerPosition: LatLngPoint;
  workerAddress: string;
  auditSites: AuditSite[];
  route: google.maps.routes.Route | null;
  routeSummary: OptimizedRouteSummary | null;
  terraDrawReady: boolean;
  terraDrawMode: TerraDrawModeName;
  clearDrawSignal: number;
  drawnZoneCount: number;
  panTarget: { center: LatLngPoint; zoom?: number; seq: number } | null;
  selectedMarkerId: string | null;
  onSelectMarkerId: (id: string | null) => void;
  onTerraDrawReadyChange: (ready: boolean) => void;
  onTerraDrawModeChange: (mode: TerraDrawModeName) => void;
  onDrawnZonesChange: (zones: GeofenceZone[]) => void;
  onRequestMode: (mode: TerraDrawModeName) => void;
  onRequestClearDrawn: () => void;
  onPolygonClick: (zone: GeofenceZone) => void;
}

export function AustinOperationsMap({
  allZones,
  matchedZone,
  workerPosition,
  workerAddress,
  auditSites,
  route,
  routeSummary,
  terraDrawReady,
  terraDrawMode,
  clearDrawSignal,
  drawnZoneCount,
  panTarget,
  selectedMarkerId,
  onSelectMarkerId,
  onTerraDrawReadyChange,
  onTerraDrawModeChange,
  onDrawnZonesChange,
  onRequestMode,
  onRequestClearDrawn,
  onPolygonClick,
}: AustinOperationsMapProps) {
  const orderedStops = routeSummary ? routeSummary.orderedStops : auditSites;

  return (
    <div id="map-container" className="map-container">
      {/* Top-Left Floating Terra Draw Toolbar */}
      <div
        id="terra-draw-toolbar"
        className="terra-draw-toolbar"
        role="toolbar"
        aria-label="Terra Draw Geofence Toolbar"
      >
        <button
          id="draw-polygon-btn"
          type="button"
          disabled={!terraDrawReady}
          className={`toolbar-btn ${
            terraDrawMode === 'polygon' ? 'toolbar-btn-amber' : ''
          }`}
          onClick={() => onRequestMode('polygon')}
        >
          <Pentagon size={14} />
          <span>Draw Polygon</span>
        </button>

        <button
          id="select-mode-btn"
          type="button"
          disabled={!terraDrawReady}
          className={`toolbar-btn ${
            terraDrawMode === 'select' ? 'toolbar-btn-blue' : ''
          }`}
          onClick={() => onRequestMode('select')}
        >
          <MousePointer size={14} />
          <span>Select / Edit</span>
        </button>

        <button
          id="inspect-mode-btn"
          type="button"
          disabled={!terraDrawReady}
          className={`toolbar-btn ${
            terraDrawMode === 'static' ? 'toolbar-btn-neutral' : ''
          }`}
          onClick={() => onRequestMode('static')}
        >
          <Hand size={14} />
          <span>Pan</span>
        </button>

        <button
          id="clear-drawn-btn"
          type="button"
          disabled={!terraDrawReady || drawnZoneCount === 0}
          className="toolbar-btn toolbar-btn-danger"
          onClick={onRequestClearDrawn}
        >
          <Trash2 size={14} />
          <span>Clear Drawn</span>
        </button>
      </div>

      <GoogleMap
        defaultCenter={AUSTIN_CENTER}
        defaultZoom={AUSTIN_ZOOM}
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
        gestureHandling="greedy"
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={true}
        style={{ width: '100%', height: '100%', minHeight: '540px' }}
      >
        <CameraController panTarget={panTarget} />

        <TerraDrawController
          requestedMode={terraDrawMode}
          clearSignal={clearDrawSignal}
          onReadyChange={onTerraDrawReadyChange}
          onModeChange={onTerraDrawModeChange}
          onDrawnZonesChange={onDrawnZonesChange}
        />

        <SeededPolygonsLayer
          zones={allZones}
          matchedZoneId={matchedZone?.id ?? null}
          onPolygonClick={onPolygonClick}
        />

        <RoutePolylineLayer route={route} />

        <WorkerMarker
          position={workerPosition}
          address={workerAddress}
          matchedZone={matchedZone}
          isSelected={selectedMarkerId === 'worker'}
          onSelect={() => onSelectMarkerId('worker')}
          onClose={() => onSelectMarkerId(null)}
        />

        {orderedStops.map((stop, idx) => {
          const leg = routeSummary?.legs[idx];
          return (
            <AuditStopMarker
              key={stop.id}
              site={stop}
              index={idx}
              legDistanceMeters={leg?.distanceMeters}
              legDurationMillis={leg?.durationMillis}
              isSelected={selectedMarkerId === stop.id}
              onSelect={() => onSelectMarkerId(stop.id)}
              onClose={() => onSelectMarkerId(null)}
            />
          );
        })}
      </GoogleMap>
    </div>
  );
}
