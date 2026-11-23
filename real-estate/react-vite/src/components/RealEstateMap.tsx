import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { MarkerClusterer, type Marker } from '@googlemaps/markerclusterer';
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawRenderMode,
} from 'terra-draw';
import { TerraDrawGoogleMapsAdapter } from 'terra-draw-google-maps-adapter';
import { Layers, Map as MapIcon, Pencil, Trash2 } from 'lucide-react';
import {
  SF_DEFAULT_CENTER,
  SF_DEFAULT_ZOOM,
  formatDistance,
  formatPricePill,
} from '../data/properties';
import type {
  CommuteEstimate,
  LatLngPoint,
  NearbyAmenity,
  PropertyListing,
} from '../types';

export interface CameraTarget {
  center: LatLngPoint;
  zoom?: number;
  bounds?: google.maps.LatLngBoundsLiteral | null;
  nonce: number;
}

interface RealEstateMapProps {
  properties: PropertyListing[];
  selectedProperty: PropertyListing | null;
  hoveredProperty: PropertyListing | null;
  mapTypeId: 'roadmap' | 'satellite';
  onToggleMapType: () => void;
  onSelectProperty: (propertyId: string) => void;
  onHoverProperty: (propertyId: string | null) => void;
  isDrawing: boolean;
  hasDrawnPolygon: boolean;
  onStartDrawing: () => void;
  onClearDrawing: () => void;
  onPolygonCompleted: (coords: LatLngPoint[] | null) => void;
  clearPolygonNonce: number;
  cameraTarget: CameraTarget | null;
  visibleAmenities: NearbyAmenity[];
  selectedAmenity: NearbyAmenity | null;
  onSelectAmenity: (amenity: NearbyAmenity | null) => void;
  commuteEstimate: CommuteEstimate | null;
}

const CameraController: React.FC<{ cameraTarget: CameraTarget | null }> = ({
  cameraTarget,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !cameraTarget) return;

    if (cameraTarget.bounds) {
      map.fitBounds(cameraTarget.bounds, 48);
    } else {
      map.panTo(cameraTarget.center);
      if (typeof cameraTarget.zoom === 'number') {
        map.setZoom(cameraTarget.zoom);
      }
    }
  }, [map, cameraTarget]);

  return null;
};

const MapTypeSync: React.FC<{ mapTypeId: 'roadmap' | 'satellite' }> = ({
  mapTypeId,
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.setMapTypeId(mapTypeId);
  }, [map, mapTypeId]);

  return null;
};

interface ClusteredPropertyMarkersProps {
  properties: PropertyListing[];
  selectedPropertyId: string | null;
  hoveredPropertyId: string | null;
  onSelectProperty: (propertyId: string) => void;
  onHoverProperty: (propertyId: string | null) => void;
}

interface PropertyMarkerItemProps {
  property: PropertyListing;
  isSelected: boolean;
  isHovered: boolean;
  onSelectProperty: (propertyId: string) => void;
  onHoverProperty: (propertyId: string | null) => void;
  setMarkerRef: (marker: Marker | null, key: string) => void;
}

const PropertyMarkerItem: React.FC<PropertyMarkerItemProps> = React.memo(
  ({
    property,
    isSelected,
    isHovered,
    onSelectProperty,
    onHoverProperty,
    setMarkerRef,
  }) => {
    const markerRef = useCallback(
      (marker: google.maps.marker.AdvancedMarkerElement | null) => {
        setMarkerRef(marker, property.id);
      },
      [setMarkerRef, property.id]
    );

    const handleClick = useCallback(() => {
      onSelectProperty(property.id);
    }, [onSelectProperty, property.id]);

    return (
      <AdvancedMarker
        position={{ lat: property.lat, lng: property.lng }}
        ref={markerRef}
        zIndex={isSelected ? 1000 : isHovered ? 900 : 100}
        title={`${property.title} — ${formatPricePill(property.price)}`}
        onClick={handleClick}
      >
        <div
          data-testid="price-pill-marker"
          data-property-id={property.id}
          className={`price-pill-marker ${isSelected ? 'selected' : ''} ${
            isHovered ? 'hovered' : ''
          }`}
          onMouseEnter={() => onHoverProperty(property.id)}
          onMouseLeave={() => onHoverProperty(null)}
        >
          <span>{formatPricePill(property.price)}</span>
        </div>
      </AdvancedMarker>
    );
  }
);

PropertyMarkerItem.displayName = 'PropertyMarkerItem';

const ClusteredPropertyMarkers: React.FC<ClusteredPropertyMarkersProps> = ({
  properties,
  selectedPropertyId,
  hoveredPropertyId,
  onSelectProperty,
  onHoverProperty,
}) => {
  const map = useMap();
  const markerLib = useMapsLibrary('marker');
  const [markers, setMarkers] = useState<Record<string, Marker>>({});

  const clusterer = useMemo(() => {
    if (!map || !markerLib) return null;

    return new MarkerClusterer({
      map,
      renderer: {
        render: ({ count, position }) => {
          const badge = document.createElement('div');
          badge.className = 'cluster-pill-badge';
          badge.textContent = `${count} homes`;
          badge.setAttribute('aria-label', `${count} clustered properties`);

          return new markerLib.AdvancedMarkerElement({
            position,
            content: badge,
            zIndex: 800 + count,
          });
        },
      },
    });
  }, [map, markerLib]);

  useEffect(() => {
    return () => {
      clusterer?.clearMarkers();
    };
  }, [clusterer]);

  useEffect(() => {
    if (!clusterer) return;
    clusterer.clearMarkers();
    const activeMarkers = Object.values(markers);
    if (activeMarkers.length > 0) {
      clusterer.addMarkers(activeMarkers);
    }
  }, [clusterer, markers]);

  const setMarkerRef = useCallback((marker: Marker | null, key: string) => {
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
  }, []);

  return (
    <>
      {properties.map((property) => (
        <PropertyMarkerItem
          key={property.id}
          property={property}
          isSelected={property.id === selectedPropertyId}
          isHovered={property.id === hoveredPropertyId}
          onSelectProperty={onSelectProperty}
          onHoverProperty={onHoverProperty}
          setMarkerRef={setMarkerRef}
        />
      ))}
    </>
  );
};

const ParcelPolygonLayer: React.FC<{
  selectedProperty: PropertyListing | null;
  hoveredProperty: PropertyListing | null;
}> = ({ selectedProperty, hoveredProperty }) => {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib || !selectedProperty) return;

    const selectedPolygon = new mapsLib.Polygon({
      paths: selectedProperty.parcelPolygon,
      strokeColor: '#0284c7',
      strokeOpacity: 0.96,
      strokeWeight: 3,
      fillColor: '#38bdf8',
      fillOpacity: 0.3,
      clickable: false,
      zIndex: 30,
      map,
    });

    return () => {
      selectedPolygon.setMap(null);
    };
  }, [map, mapsLib, selectedProperty]);

  useEffect(() => {
    if (
      !map ||
      !mapsLib ||
      !hoveredProperty ||
      hoveredProperty.id === selectedProperty?.id
    ) {
      return;
    }

    const hoverPolygon = new mapsLib.Polygon({
      paths: hoveredProperty.parcelPolygon,
      strokeColor: '#0ea5e9',
      strokeOpacity: 0.85,
      strokeWeight: 2,
      fillColor: '#7dd3fc',
      fillOpacity: 0.16,
      clickable: false,
      zIndex: 20,
      map,
    });

    return () => {
      hoverPolygon.setMap(null);
    };
  }, [map, mapsLib, hoveredProperty, selectedProperty?.id]);

  return null;
};

interface TerraDrawPolygonFilterProps {
  isDrawing: boolean;
  clearPolygonNonce: number;
  onPolygonCompleted: (coords: LatLngPoint[] | null) => void;
}

const TerraDrawPolygonFilter: React.FC<TerraDrawPolygonFilterProps> = ({
  isDrawing,
  clearPolygonNonce,
  onPolygonCompleted,
}) => {
  const map = useMap();
  const drawRef = useRef<TerraDraw | null>(null);
  const [drawReady, setDrawReady] = useState(false);
  const onPolygonCompletedRef = useRef(onPolygonCompleted);

  useEffect(() => {
    onPolygonCompletedRef.current = onPolygonCompleted;
  }, [onPolygonCompleted]);

  useEffect(() => {
    if (!map) return;

    let disposed = false;
    let projectionListener: google.maps.MapsEventListener | null = null;

    const initTerraDraw = () => {
      if (disposed || drawRef.current || !map.getProjection()) return;

      const draw = new TerraDraw({
        adapter: new TerraDrawGoogleMapsAdapter({
          map,
          lib: google.maps,
          coordinatePrecision: 9,
        }),
        modes: [
          new TerraDrawPolygonMode({
            editable: false,
            styles: {
              fillColor: '#0284c7',
              fillOpacity: 0.18,
              outlineColor: '#0369a1',
              outlineOpacity: 0.95,
              outlineWidth: 3,
              closingPointColor: '#0284c7',
              closingPointWidth: 6,
              closingPointOutlineColor: '#ffffff',
              closingPointOutlineWidth: 2,
            },
          }),
          new TerraDrawRenderMode({
            modeName: 'static',
            styles: {
              polygonFillColor: '#0284c7',
              polygonFillOpacity: 0.14,
              polygonOutlineColor: '#0369a1',
              polygonOutlineWidth: 2.5,
            },
          }),
        ],
      });

      draw.start();
      draw.setMode('static');

      draw.on('finish', (finishedId) => {
        const snapshot = draw.getSnapshot();
        const feature = snapshot.find((item) => item.id === finishedId);

        if (feature && feature.geometry.type === 'Polygon') {
          const outerRing = feature.geometry.coordinates[0] ?? [];
          const latLngs: LatLngPoint[] = outerRing.map(([lng, lat]) => ({
            lat,
            lng,
          }));
          if (latLngs.length >= 3) {
            onPolygonCompletedRef.current(latLngs);
          }
        }

        draw.setMode('static');
      });

      drawRef.current = draw;
      setDrawReady(true);
    };

    if (map.getProjection()) {
      initTerraDraw();
    } else {
      projectionListener = map.addListener('projection_changed', initTerraDraw);
    }

    return () => {
      disposed = true;
      projectionListener?.remove();
      if (drawRef.current) {
        try {
          drawRef.current.stop();
        } catch {
          // Ignore teardown errors if map is already detached
        }
        drawRef.current = null;
      }
      setDrawReady(false);
    };
  }, [map]);

  useEffect(() => {
    const draw = drawRef.current;
    if (!draw || !drawReady) return;

    if (isDrawing) {
      draw.clear();
      draw.setMode('polygon');
    } else {
      draw.setMode('static');
    }
  }, [isDrawing, drawReady]);

  useEffect(() => {
    if (clearPolygonNonce === 0) return;
    const draw = drawRef.current;
    if (!draw || !drawReady) return;

    draw.clear();
    draw.setMode('static');
  }, [clearPolygonNonce, drawReady]);

  return null;
};

const CommuteRouteOverlay: React.FC<{
  commuteEstimate: CommuteEstimate | null;
  selectedPropertyId: string | null;
}> = ({ commuteEstimate, selectedPropertyId }) => {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  const activeEstimate =
    commuteEstimate && commuteEstimate.propertyId === selectedPropertyId
      ? commuteEstimate
      : null;

  useEffect(() => {
    if (!map || !mapsLib || !activeEstimate || activeEstimate.routePath.length < 2) {
      return;
    }

    const polyline = new mapsLib.Polyline({
      path: activeEstimate.routePath,
      strokeColor: '#0f766e',
      strokeOpacity: 0.9,
      strokeWeight: 4,
      zIndex: 40,
      map,
    });

    return () => {
      polyline.setMap(null);
    };
  }, [map, mapsLib, activeEstimate]);

  if (!activeEstimate) return null;

  return (
    <AdvancedMarker
      position={activeEstimate.workplace.location}
      title={`Workplace: ${activeEstimate.workplace.label}`}
      zIndex={950}
    >
      <Pin
        background="#0f766e"
        borderColor="#134e4a"
        glyphColor="#ffffff"
        glyphText="W"
      />
    </AdvancedMarker>
  );
};

export const RealEstateMap: React.FC<RealEstateMapProps> = ({
  properties,
  selectedProperty,
  hoveredProperty,
  mapTypeId,
  onToggleMapType,
  onSelectProperty,
  onHoverProperty,
  isDrawing,
  hasDrawnPolygon,
  onStartDrawing,
  onClearDrawing,
  onPolygonCompleted,
  clearPolygonNonce,
  cameraTarget,
  visibleAmenities,
  selectedAmenity,
  onSelectAmenity,
  commuteEstimate,
}) => {
  return (
    <div id="map-container" data-testid="map-container" className="map-container">
      {/* Floating top-left map controls */}
      <div className="map-floating-controls">
        <button
          id="draw-area-btn"
          data-testid="draw-area-btn"
          type="button"
          className={`map-control-btn ${isDrawing ? 'active' : ''}`}
          onClick={onStartDrawing}
        >
          <Pencil size={14} />
          <span>
            {isDrawing ? 'Click points · double-click to finish' : 'Draw Search Area'}
          </span>
        </button>

        <button
          id="clear-area-btn"
          data-testid="clear-area-btn"
          type="button"
          className="map-control-btn secondary"
          disabled={!hasDrawnPolygon && !isDrawing}
          onClick={onClearDrawing}
        >
          <Trash2 size={14} />
          <span>Clear Area</span>
        </button>

        <button
          id="map-type-toggle"
          data-testid="map-type-toggle"
          type="button"
          className="map-control-btn"
          onClick={onToggleMapType}
        >
          {mapTypeId === 'roadmap' ? <Layers size={14} /> : <MapIcon size={14} />}
          <span>{mapTypeId === 'roadmap' ? 'Satellite' : 'Roadmap'}</span>
        </button>
      </div>

      {isDrawing && (
        <div className="drawing-hint-banner">
          Click on the map to outline your custom San Francisco search boundary. Double-click or click your starting vertex to apply the filter.
        </div>
      )}

      <GoogleMap
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
        defaultCenter={SF_DEFAULT_CENTER}
        defaultZoom={SF_DEFAULT_ZOOM}
        mapTypeId={mapTypeId}
        gestureHandling="greedy"
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={true}
        zoomControl={true}
        clickableIcons={false}
        style={{ width: '100%', height: '100%', minHeight: '560px' }}
      >
        <MapTypeSync mapTypeId={mapTypeId} />
        <CameraController cameraTarget={cameraTarget} />

        <ParcelPolygonLayer
          selectedProperty={selectedProperty}
          hoveredProperty={hoveredProperty}
        />

        <TerraDrawPolygonFilter
          isDrawing={isDrawing}
          clearPolygonNonce={clearPolygonNonce}
          onPolygonCompleted={onPolygonCompleted}
        />

        <ClusteredPropertyMarkers
          properties={properties}
          selectedPropertyId={selectedProperty?.id ?? null}
          hoveredPropertyId={hoveredProperty?.id ?? null}
          onSelectProperty={onSelectProperty}
          onHoverProperty={onHoverProperty}
        />

        {visibleAmenities.map((amenity) => (
          <AdvancedMarker
            key={`amenity-${amenity.id}`}
            position={amenity.location}
            title={amenity.name}
            zIndex={50}
            onClick={() => onSelectAmenity(amenity)}
          >
            <div className={`amenity-map-dot ${amenity.category}`} />
          </AdvancedMarker>
        ))}

        {selectedAmenity && (
          <InfoWindow
            position={selectedAmenity.location}
            onCloseClick={() => onSelectAmenity(null)}
          >
            <div className="amenity-infowindow">
              <strong>{selectedAmenity.name}</strong>
              <p>{selectedAmenity.address}</p>
              <span>{formatDistance(selectedAmenity.distanceMeters)} from home</span>
            </div>
          </InfoWindow>
        )}

        <CommuteRouteOverlay
          commuteEstimate={commuteEstimate}
          selectedPropertyId={selectedProperty?.id ?? null}
        />
      </GoogleMap>
    </div>
  );
};
