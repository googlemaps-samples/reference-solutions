'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AdvancedMarker,
  ControlPosition,
  Map as GoogleMap,
  MapControl,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { MarkerClusterer, type Marker as ClustererMarker } from '@googlemaps/markerclusterer';
import { TerraDraw, TerraDrawPolygonMode, TerraDrawRenderMode } from 'terra-draw';
import { TerraDrawGoogleMapsAdapter } from 'terra-draw-google-maps-adapter';
import { Briefcase, Layers, Pencil, Satellite, Trash2 } from 'lucide-react';
import { formatCompactPrice } from '@/lib/formatters';
import type {
  CommuteCalculationResult,
  LatLngPoint,
  PropertyListing,
} from '@/types/real-estate';

interface MapTarget {
  center: LatLngPoint;
  zoom?: number;
  viewport?: google.maps.LatLngBoundsLiteral;
  nonce: number;
}

interface RealEstateMapProps {
  properties: PropertyListing[];
  selectedProperty: PropertyListing | null;
  hoveredPropertyId: string | null;
  onSelectProperty: (property: PropertyListing) => void;
  onHoverProperty: (id: string | null) => void;
  searchPolygon: LatLngPoint[] | null;
  onSearchPolygonChange: (ring: LatLngPoint[] | null) => void;
  mapTarget: MapTarget | null;
  commuteResult: CommuteCalculationResult | null;
}

interface PropertyMarkerItemProps {
  property: PropertyListing;
  isSelected: boolean;
  isHovered: boolean;
  onMarkerRef: (key: string, marker: google.maps.marker.AdvancedMarkerElement | null) => void;
  onSelectProperty: (property: PropertyListing) => void;
  onHoverProperty: (id: string | null) => void;
}

function PropertyMarkerItem({
  property,
  isSelected,
  isHovered,
  onMarkerRef,
  onSelectProperty,
  onHoverProperty,
}: PropertyMarkerItemProps) {
  const handleRef = useCallback(
    (marker: google.maps.marker.AdvancedMarkerElement | null) => {
      onMarkerRef(property.id, marker);
    },
    [onMarkerRef, property.id]
  );

  const handleClick = useCallback(() => {
    onSelectProperty(property);
  }, [onSelectProperty, property]);

  const handleMouseEnter = useCallback(() => {
    onHoverProperty(property.id);
  }, [onHoverProperty, property.id]);

  const handleMouseLeave = useCallback(() => {
    onHoverProperty(null);
  }, [onHoverProperty]);

  return (
    <AdvancedMarker
      ref={handleRef}
      position={{ lat: property.lat, lng: property.lng }}
      zIndex={isSelected ? 100 : isHovered ? 50 : 1}
      title={`${property.address} — ${formatCompactPrice(property.price)}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        data-testid={`price-pill-${property.id}`}
        className={`price-pill-marker${
          isSelected ? ' price-pill-marker--selected' : ''
        }${isHovered ? ' price-pill-marker--hovered' : ''}`}
      >
        {formatCompactPrice(property.price)}
      </div>
    </AdvancedMarker>
  );
}

/**
 * Renders HTML price-pill AdvancedMarkers synchronized with MarkerClusterer.
 */
function ClusteredPropertyMarkers({
  properties,
  selectedPropertyId,
  hoveredPropertyId,
  onSelectProperty,
  onHoverProperty,
}: {
  properties: PropertyListing[];
  selectedPropertyId: string | null;
  hoveredPropertyId: string | null;
  onSelectProperty: (property: PropertyListing) => void;
  onHoverProperty: (id: string | null) => void;
}) {
  const map = useMap();
  const [markers, setMarkers] = useState<Record<string, ClustererMarker>>({});

  const clusterer = useMemo(() => {
    if (!map) return null;
    return new MarkerClusterer({ map });
  }, [map]);

  useEffect(() => {
    return () => {
      if (clusterer) {
        clusterer.clearMarkers();
        clusterer.setMap(null);
      }
    };
  }, [clusterer]);

  const handleMarkerRef = useCallback(
    (key: string, marker: google.maps.marker.AdvancedMarkerElement | null) => {
      setMarkers((prev) => {
        if ((marker && prev[key] === marker) || (!marker && !prev[key])) {
          return prev;
        }
        if (marker) {
          return { ...prev, [key]: marker };
        }
        const { [key]: _removed, ...rest } = prev;
        return rest;
      });
    },
    []
  );

  useEffect(() => {
    if (!clusterer) return;
    clusterer.clearMarkers();
    const list = Object.values(markers);
    if (list.length > 0) {
      clusterer.addMarkers(list);
    }
  }, [clusterer, markers]);

  return (
    <>
      {properties.map((property) => (
        <PropertyMarkerItem
          key={property.id}
          property={property}
          isSelected={property.id === selectedPropertyId}
          isHovered={property.id === hoveredPropertyId}
          onMarkerRef={handleMarkerRef}
          onSelectProperty={onSelectProperty}
          onHoverProperty={onHoverProperty}
        />
      ))}
    </>
  );
}

/**
 * Renders the cadastral lot/parcel Polygon outline for the selected listing.
 */
function SelectedParcelPolygon({ property }: { property: PropertyListing | null }) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib || !property || property.parcelPolygon.length < 3) return;

    const polygon = new mapsLib.Polygon({
      paths: property.parcelPolygon,
      strokeColor: '#059669',
      strokeOpacity: 0.95,
      strokeWeight: 3,
      fillColor: '#10b981',
      fillOpacity: 0.28,
      clickable: false,
      zIndex: 12,
      map,
    });

    return () => {
      polygon.setMap(null);
    };
  }, [map, mapsLib, property]);

  return null;
}

/**
 * Renders the decoded Routes API commute polyline and workplace AdvancedMarker.
 */
function CommuteRouteOverlay({
  property,
  commuteResult,
}: {
  property: PropertyListing | null;
  commuteResult: CommuteCalculationResult | null;
}) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const geometryLib = useMapsLibrary('geometry');
  const coreLib = useMapsLibrary('core');

  useEffect(() => {
    if (!map || !mapsLib || !geometryLib || !coreLib || !property || !commuteResult) return;

    let polyline: google.maps.Polyline | null = null;
    if (commuteResult.encodedPolyline) {
      const decodedPath = geometryLib.encoding.decodePath(commuteResult.encodedPolyline);
      polyline = new mapsLib.Polyline({
        path: decodedPath,
        strokeColor: '#1d4ed8',
        strokeOpacity: 0.9,
        strokeWeight: 5,
        map,
      });
    }

    const bounds = new coreLib.LatLngBounds();
    bounds.extend({ lat: property.lat, lng: property.lng });
    bounds.extend(commuteResult.destinationLocation);
    map.fitBounds(bounds, 72);

    return () => {
      if (polyline) {
        polyline.setMap(null);
      }
    };
  }, [map, mapsLib, geometryLib, coreLib, property, commuteResult]);

  if (!commuteResult) return null;

  return (
    <AdvancedMarker
      position={commuteResult.destinationLocation}
      zIndex={120}
      title={commuteResult.destinationLabel}
    >
      <div className="workplace-pin">
        <Briefcase size={12} />
        <span>Workplace</span>
      </div>
    </AdvancedMarker>
  );
}

/**
 * Synchronizes camera viewport when searching a location or selecting a property.
 */
function MapViewportController({ mapTarget }: { mapTarget: MapTarget | null }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !mapTarget) return;
    if (mapTarget.viewport) {
      map.fitBounds(mapTarget.viewport);
    } else {
      map.panTo(mapTarget.center);
      if (typeof mapTarget.zoom === 'number') {
        map.setZoom(mapTarget.zoom);
      }
    }
  }, [map, mapTarget]);

  return null;
}

/**
 * Initializes Terra Draw once the Google Map projection is ready and emits
 * finished polygon search-area coordinates.
 */
function TerraDrawController({
  isDrawing,
  onDrawingChange,
  onSearchPolygonChange,
  clearNonce,
}: {
  isDrawing: boolean;
  onDrawingChange: (drawing: boolean) => void;
  onSearchPolygonChange: (ring: LatLngPoint[] | null) => void;
  clearNonce: number;
}) {
  const map = useMap();
  const drawRef = useRef<TerraDraw | null>(null);
  const [drawReady, setDrawReady] = useState(false);

  const onDrawingChangeRef = useRef(onDrawingChange);
  onDrawingChangeRef.current = onDrawingChange;
  const onPolygonRef = useRef(onSearchPolygonChange);
  onPolygonRef.current = onSearchPolygonChange;

  useEffect(() => {
    if (!map || drawRef.current) return;

    let cancelled = false;
    let projListener: google.maps.MapsEventListener | null = null;

    const initTerraDraw = () => {
      if (cancelled || drawRef.current) return;

      const instance = new TerraDraw({
        adapter: new TerraDrawGoogleMapsAdapter({
          map,
          lib: google.maps,
          coordinatePrecision: 9,
        }),
        modes: [
          new TerraDrawPolygonMode({
            styles: {
              fillColor: '#1d4ed8',
              fillOpacity: 0.16,
              outlineColor: '#1d4ed8',
              outlineWidth: 2.5,
            },
          }),
          new TerraDrawRenderMode({
            modeName: 'static',
            styles: {
              polygonFillColor: '#1d4ed8',
              polygonFillOpacity: 0.14,
              polygonOutlineColor: '#1d4ed8',
              polygonOutlineWidth: 2.5,
            },
          }),
        ],
      });

      instance.on('finish', (featureId) => {
        const feature = instance.getSnapshotFeature(featureId);
        if (feature && feature.geometry.type === 'Polygon') {
          const outerRing = feature.geometry.coordinates[0] || [];
          const latLngRing: LatLngPoint[] = outerRing.map(([lng, lat]) => ({ lat, lng }));
          // Keep only the newest search polygon
          const allFeatures = instance.getSnapshot();
          const staleIds = allFeatures
            .filter((item) => item.id !== featureId && item.id !== undefined)
            .map((item) => item.id as string | number);
          if (staleIds.length > 0) {
            instance.removeFeatures(staleIds);
          }
          onPolygonRef.current(latLngRing);
        }
        instance.setMode('static');
        onDrawingChangeRef.current(false);
      });

      instance.start();
      instance.setMode('static');
      drawRef.current = instance;
      setDrawReady(true);
    };

    if (map.getProjection()) {
      initTerraDraw();
    } else {
      projListener = map.addListener('projection_changed', () => {
        if (!map.getProjection()) return;
        projListener?.remove();
        initTerraDraw();
      });
    }

    return () => {
      cancelled = true;
      projListener?.remove();
      if (drawRef.current) {
        try {
          drawRef.current.stop();
        } catch {
          // Ignore teardown errors when map unmounts
        }
        drawRef.current = null;
      }
      setDrawReady(false);
    };
  }, [map]);

  useEffect(() => {
    const instance = drawRef.current;
    if (!instance || !drawReady) return;
    if (isDrawing) {
      instance.clear();
      instance.setMode('polygon');
    } else {
      instance.setMode('static');
    }
  }, [isDrawing, drawReady]);

  useEffect(() => {
    if (clearNonce === 0) return;
    const instance = drawRef.current;
    if (!instance) return;
    instance.clear();
    instance.setMode('static');
  }, [clearNonce]);

  return null;
}

export default function RealEstateMap({
  properties,
  selectedProperty,
  hoveredPropertyId,
  onSelectProperty,
  onHoverProperty,
  searchPolygon,
  onSearchPolygonChange,
  mapTarget,
  commuteResult,
}: RealEstateMapProps) {
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'hybrid'>('roadmap');
  const [isDrawing, setIsDrawing] = useState(false);
  const [clearNonce, setClearNonce] = useState(0);

  const handleToggleDraw = () => {
    if (isDrawing) {
      setIsDrawing(false);
    } else {
      onSearchPolygonChange(null);
      setIsDrawing(true);
    }
  };

  const handleClearArea = () => {
    setIsDrawing(false);
    onSearchPolygonChange(null);
    setClearNonce((n) => n + 1);
  };

  return (
    <div id="map-container" data-testid="map-container" className="map-pane">
      <GoogleMap
        mapId="DEMO_MAP_ID"
        defaultCenter={{ lat: 37.7749, lng: -122.4194 }}
        defaultZoom={13}
        mapTypeId={mapTypeId}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={true}
        internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
        style={{ width: '100%', height: '100%', minHeight: '560px' }}
      >
        <MapControl position={ControlPosition.TOP_LEFT}>
          <div className="map-floating-controls">
            <button
              id="draw-area-btn"
              data-testid="draw-area-btn"
              type="button"
              className={`map-pill-btn${isDrawing ? ' map-pill-btn--active' : ''}`}
              onClick={handleToggleDraw}
            >
              <Pencil size={14} />
              {isDrawing ? 'Drawing Polygon (Cancel)' : 'Draw Search Area'}
            </button>

            <button
              id="clear-area-btn"
              data-testid="clear-area-btn"
              type="button"
              className="map-pill-btn map-pill-btn--danger"
              onClick={handleClearArea}
              disabled={!searchPolygon && !isDrawing}
            >
              <Trash2 size={14} />
              Clear Area
            </button>

            <button
              id="map-type-toggle"
              data-testid="map-type-toggle"
              type="button"
              className={`map-pill-btn${mapTypeId === 'hybrid' ? ' map-pill-btn--active' : ''}`}
              onClick={() =>
                setMapTypeId((prev) => (prev === 'roadmap' ? 'hybrid' : 'roadmap'))
              }
            >
              <Satellite size={14} />
              {mapTypeId === 'roadmap' ? 'Satellite' : 'Roadmap'}
            </button>
          </div>
        </MapControl>

        <ClusteredPropertyMarkers
          properties={properties}
          selectedPropertyId={selectedProperty?.id ?? null}
          hoveredPropertyId={hoveredPropertyId}
          onSelectProperty={onSelectProperty}
          onHoverProperty={onHoverProperty}
        />

        <SelectedParcelPolygon property={selectedProperty} />

        <CommuteRouteOverlay property={selectedProperty} commuteResult={commuteResult} />

        <MapViewportController mapTarget={mapTarget} />

        <TerraDrawController
          isDrawing={isDrawing}
          onDrawingChange={setIsDrawing}
          onSearchPolygonChange={onSearchPolygonChange}
          clearNonce={clearNonce}
        />
      </GoogleMap>

      {isDrawing && (
        <div className="drawing-hint-banner">
          Click on the map to place search boundary vertices. Click the starting point or
          double-click to finish.
        </div>
      )}

      {selectedProperty && (
        <div className="parcel-legend-chip">
          <span className="parcel-swatch" aria-hidden="true" />
          <Layers size={13} color="#059669" />
          <span>
            Lot Parcel {selectedProperty.apn} ({selectedProperty.lotSqFt.toLocaleString()} sqft ·{' '}
            {selectedProperty.zoning})
          </span>
        </div>
      )}
    </div>
  );
}
