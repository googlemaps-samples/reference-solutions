'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import {
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMapView,
  Pin,
  Polygon,
  Polyline,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
  type GeoJSONStoreFeatures,
} from 'terra-draw';
import { TerraDrawGoogleMapsAdapter } from 'terra-draw-google-maps-adapter';
import { MousePointer, Pentagon, Trash2 } from 'lucide-react';
import { AUSTIN_CENTER, AUSTIN_DEFAULT_ZOOM } from '@/data/austinSeed';
import type {
  AuditSite,
  DrawMode,
  GeofenceZone,
  LatLngLiteral,
  OptimizedRouteResult,
} from '@/types/geofencing';

interface TerraDrawBridgeProps {
  drawMode: DrawMode;
  clearSignal: number;
  onDrawModeChange: (mode: DrawMode) => void;
  onDrawnZonesChange: (zones: GeofenceZone[]) => void;
}

function extractDrawnPolygons(snapshot: GeoJSONStoreFeatures[]): GeofenceZone[] {
  const zones: GeofenceZone[] = [];
  let index = 0;

  for (const feature of snapshot) {
    if (feature.geometry.type !== 'Polygon') continue;
    const props = feature.properties as Record<string, unknown> | undefined;
    if (props?.currentlyDrawing === true) continue;

    const outerRing = feature.geometry.coordinates?.[0];
    if (!Array.isArray(outerRing) || outerRing.length < 4) continue;

    // GeoJSON rings close with first coordinate repeated at the end
    const ringPoints: LatLngLiteral[] = outerRing.slice(0, -1).map(([lng, lat]) => ({
      lat,
      lng,
    }));

    if (ringPoints.length < 3) continue;

    index += 1;
    zones.push({
      id: `drawn-${String(feature.id ?? index)}`,
      name: `Supervisor Custom Zone #${index}`,
      siteCode: `SUP-${String(index).padStart(2, '0')}`,
      source: 'supervisor-drawn',
      color: '#7c3aed',
      path: ringPoints,
    });
  }

  return zones;
}

function TerraDrawBridge({
  drawMode,
  clearSignal,
  onDrawModeChange,
  onDrawnZonesChange,
}: TerraDrawBridgeProps) {
  const map = useMap();
  const drawRef = useRef<TerraDraw | null>(null);
  const lastClearSignalRef = useRef<number>(clearSignal);
  const onDrawModeChangeRef = useRef(onDrawModeChange);
  const onDrawnZonesChangeRef = useRef(onDrawnZonesChange);

  useEffect(() => {
    onDrawModeChangeRef.current = onDrawModeChange;
    onDrawnZonesChangeRef.current = onDrawnZonesChange;
  }, [onDrawModeChange, onDrawnZonesChange]);

  useEffect(() => {
    if (!map || drawRef.current) return;

    let cancelled = false;
    let projectionListener: google.maps.MapsEventListener | null = null;

    const initializeTerraDraw = () => {
      if (cancelled || drawRef.current || typeof google === 'undefined' || !google.maps) {
        return;
      }

      const instance = new TerraDraw({
        adapter: new TerraDrawGoogleMapsAdapter({
          map,
          lib: google.maps,
          coordinatePrecision: 9,
        }),
        modes: [
          new TerraDrawSelectMode({
            flags: {
              polygon: {
                feature: {
                  draggable: true,
                  rotateable: true,
                  coordinates: {
                    midpoints: true,
                    draggable: true,
                    deletable: true,
                  },
                },
              },
            },
          }),
          new TerraDrawPolygonMode({
            editable: true,
            styles: {
              fillColor: '#7c3aed',
              fillOpacity: 0.24,
              outlineColor: '#6d28d9',
              outlineWidth: 2.5,
              closingPointColor: '#4c1d95',
              editedPointColor: '#f59e0b',
            },
          }),
        ],
      });

      instance.start();
      instance.setMode('static');

      instance.on('finish', () => {
        const zones = extractDrawnPolygons(instance.getSnapshot());
        onDrawnZonesChangeRef.current(zones);
        if (instance.getMode() === 'polygon') {
          instance.setMode('select');
          onDrawModeChangeRef.current('select');
        }
      });

      instance.on('change', () => {
        const zones = extractDrawnPolygons(instance.getSnapshot());
        onDrawnZonesChangeRef.current(zones);
      });

      drawRef.current = instance;
    };

    if (map.getProjection()) {
      initializeTerraDraw();
    } else {
      projectionListener = map.addListener('projection_changed', () => {
        if (!map.getProjection()) return;
        projectionListener?.remove();
        projectionListener = null;
        initializeTerraDraw();
      });
    }

    return () => {
      cancelled = true;
      projectionListener?.remove();
      if (drawRef.current) {
        try {
          drawRef.current.stop();
        } catch {
          // Ignore teardown errors when map unmounts
        }
        drawRef.current = null;
      }
    };
  }, [map]);

  useEffect(() => {
    const draw = drawRef.current;
    if (!draw) return;
    if (draw.getMode() !== drawMode) {
      draw.setMode(drawMode);
    }
  }, [drawMode]);

  useEffect(() => {
    if (clearSignal === lastClearSignalRef.current) return;
    lastClearSignalRef.current = clearSignal;
    const draw = drawRef.current;
    if (!draw) return;
    draw.clear();
    draw.setMode('static');
    onDrawModeChangeRef.current('static');
    onDrawnZonesChangeRef.current([]);
  }, [clearSignal]);

  return null;
}

interface MapViewportControllerProps {
  focusTarget: LatLngLiteral | null;
}

function MapViewportController({ focusTarget }: MapViewportControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || !focusTarget) return;
    map.panTo(focusTarget);
  }, [map, focusTarget]);

  return null;
}

interface AuditStopMarkerProps {
  stop: AuditSite;
  index: number;
  isSelected: boolean;
  leg?: { distanceMeters: number; durationSeconds: number };
  onSelect: () => void;
  onClose: () => void;
}

function AuditStopMarker({
  stop,
  index,
  isSelected,
  leg,
  onSelect,
  onClose,
}: AuditStopMarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={stop.location}
        title={`Stop ${index + 1}: ${stop.displayName}`}
        clickable
        onClick={onSelect}
        zIndex={isSelected ? 45 : 30}
      >
        <Pin
          background={isSelected ? '#0f172a' : '#2563eb'}
          borderColor={isSelected ? '#38bdf8' : '#1e3a8a'}
          glyphColor="#ffffff"
          glyphText={String(index + 1)}
          scale={isSelected ? 1.18 : 1.0}
        />
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow anchor={marker} onCloseClick={onClose}>
          <div className="infowindow-body">
            <div className="infowindow-title">
              Stop #{index + 1}: {stop.displayName}
            </div>
            <div className="infowindow-meta">{stop.primaryType}</div>
            <div>{stop.formattedAddress}</div>
            {leg && (
              <div
                style={{
                  marginTop: 6,
                  paddingTop: 6,
                  borderTop: '1px solid #e2e8f0',
                  fontWeight: 600,
                  color: '#1d4ed8',
                }}
              >
                Leg Drive: {(leg.distanceMeters / 1609.344).toFixed(1)} mi •{' '}
                {Math.max(1, Math.round(leg.durationSeconds / 60))} min
              </div>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
}

interface GeofenceMapCanvasProps {
  hasApiKey: boolean;
  preSeededZones: GeofenceZone[];
  matchingZoneIds: string[];
  workerCoords: LatLngLiteral;
  isInsideGeofence: boolean;
  orderedStops: AuditSite[];
  routeData: OptimizedRouteResult | null;
  selectedStopId: string | null;
  onSelectStop: (stopId: string | null) => void;
  drawMode: DrawMode;
  onDrawModeChange: (mode: DrawMode) => void;
  clearSignal: number;
  onClearDrawn: () => void;
  onDrawnZonesChange: (zones: GeofenceZone[]) => void;
  focusTarget: LatLngLiteral | null;
  onGeometryReady: (lib: google.maps.GeometryLibrary) => void;
}

export function GeofenceMapCanvas({
  hasApiKey,
  preSeededZones,
  matchingZoneIds,
  workerCoords,
  isInsideGeofence,
  orderedStops,
  routeData,
  selectedStopId,
  onSelectStop,
  drawMode,
  onDrawModeChange,
  clearSignal,
  onClearDrawn,
  onDrawnZonesChange,
  focusTarget,
  onGeometryReady,
}: GeofenceMapCanvasProps) {
  const geometryLib = useMapsLibrary('geometry');

  useEffect(() => {
    if (geometryLib) {
      onGeometryReady(geometryLib);
    }
  }, [geometryLib, onGeometryReady]);

  const decodedRoutePath = useMemo(() => {
    if (!routeData?.encodedPolyline || !geometryLib?.encoding) {
      return [] as google.maps.LatLng[];
    }
    return geometryLib.encoding.decodePath(routeData.encodedPolyline);
  }, [routeData?.encodedPolyline, geometryLib]);

  return (
    <div id="map-container" data-testid="map-container" className="map-canvas-pane">
      {/* Top-Left Floating Terra Draw Toolbar */}
      <div
        id="terra-draw-toolbar"
        data-testid="terra-draw-toolbar"
        className="terra-toolbar"
        role="toolbar"
        aria-label="Terra Draw Geofence Toolbar"
      >
        <button
          id="draw-polygon-btn"
          data-testid="draw-polygon-btn"
          type="button"
          className={`btn btn-secondary ${drawMode === 'polygon' ? 'active' : ''}`}
          onClick={() => onDrawModeChange(drawMode === 'polygon' ? 'static' : 'polygon')}
        >
          <Pentagon size={14} />
          <span>{drawMode === 'polygon' ? 'Drawing Polygon' : 'Draw Polygon'}</span>
        </button>

        <button
          id="select-mode-btn"
          data-testid="select-mode-btn"
          type="button"
          className={`btn btn-secondary ${drawMode === 'select' ? 'active' : ''}`}
          onClick={() => onDrawModeChange(drawMode === 'select' ? 'static' : 'select')}
        >
          <MousePointer size={14} />
          <span>Select / Edit</span>
        </button>

        <button
          id="clear-drawn-btn"
          data-testid="clear-drawn-btn"
          type="button"
          className="btn btn-danger-outline"
          onClick={onClearDrawn}
        >
          <Trash2 size={14} />
          <span>Clear Drawn</span>
        </button>
      </div>

      {drawMode === 'polygon' && (
        <div className="terra-hint">
          Click on the map to place polygon vertices. Click the first vertex or double-click to
          finish your custom geofence.
        </div>
      )}
      {drawMode === 'select' && (
        <div className="terra-hint">
          Click any supervisor-drawn polygon to drag, reshape vertices, or inspect coverage.
        </div>
      )}

      {!hasApiKey ? (
        <div className="missing-key-overlay">
          <div className="missing-key-card">
            <h2 style={{ margin: '0 0 8px 0', fontSize: 17 }}>
              Google Maps Platform API Key Required
            </h2>
            <p style={{ margin: '0 0 10px 0', fontSize: 13, color: '#475569' }}>
              Set <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in <code>.env.local</code> to render
              the interactive Austin geofence map, live Places search, Geocoding v4 reverse lookup,
              and Routes API v2 waypoint optimization.
            </p>
            <p style={{ margin: 0, fontSize: 12.5, color: '#334155' }}>
              Need a free prototype key with zero billing setup? Generate a{' '}
              <a
                href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
                target="_blank"
                rel="noreferrer"
                style={{ color: '#2563eb', fontWeight: 600 }}
              >
                Google Maps Demo Key
              </a>
              .
            </p>
          </div>
        </div>
      ) : (
        <GoogleMapView
          defaultCenter={AUSTIN_CENTER}
          defaultZoom={AUSTIN_DEFAULT_ZOOM}
          mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
          gestureHandling="greedy"
          clickableIcons={false}
          streetViewControl={false}
          mapTypeControl={false}
          style={{ width: '100%', height: '100%', minHeight: '540px' }}
        >
          <TerraDrawBridge
            drawMode={drawMode}
            clearSignal={clearSignal}
            onDrawModeChange={onDrawModeChange}
            onDrawnZonesChange={onDrawnZonesChange}
          />
          <MapViewportController focusTarget={focusTarget} />

          {/* Pre-seeded Austin client site geofence polygons */}
          {preSeededZones.map((zone) => {
            const isOccupied = matchingZoneIds.includes(zone.id);
            return (
              <Polygon
                key={zone.id}
                paths={zone.path}
                clickable={false}
                strokeColor={isOccupied ? '#059669' : zone.color}
                strokeOpacity={0.95}
                strokeWeight={isOccupied ? 3 : 2}
                fillColor={isOccupied ? '#10b981' : zone.color}
                fillOpacity={isOccupied ? 0.24 : 0.14}
              />
            );
          })}

          {/* Optimized Multi-Stop Driving Route Polyline */}
          {decodedRoutePath.length > 0 && (
            <Polyline
              path={decodedRoutePath}
              strokeColor="#1d4ed8"
              strokeOpacity={0.88}
              strokeWeight={5}
            />
          )}

          {/* Simulated Worker GPS AdvancedMarker */}
          <AdvancedMarker
            position={workerCoords}
            title="Simulated Field Worker GPS Position"
            zIndex={50}
          >
            <div className={`worker-pin ${isInsideGeofence ? 'inside' : 'outside'}`}>
              <span>{isInsideGeofence ? 'Worker: In Zone' : 'Worker: Outside'}</span>
            </div>
          </AdvancedMarker>

          {/* Numbered Audit Stop AdvancedMarkers */}
          {orderedStops.map((stop, idx) => (
            <AuditStopMarker
              key={stop.id}
              stop={stop}
              index={idx}
              isSelected={stop.id === selectedStopId}
              leg={routeData?.legs?.[idx]}
              onSelect={() => onSelectStop(stop.id)}
              onClose={() => onSelectStop(null)}
            />
          ))}
        </GoogleMapView>
      )}

      {/* Map Legend */}
      <div className="map-legend" aria-label="Map Legend">
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#0284c7' }} />
          Seeded Geofence
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#7c3aed' }} />
          Supervisor Drawn
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#059669' }} />
          Worker Inside
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#e11d48' }} />
          Worker Outside
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#1d4ed8' }} />
          Optimized Route
        </span>
      </div>
    </div>
  );
}
