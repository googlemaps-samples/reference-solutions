'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  AdvancedMarker,
  Map,
  MapMouseEvent,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { ActiveLocation, MapLayerType, SolarLatLng } from '@/types/environment';

interface SolarBoundingBox {
  sw: SolarLatLng;
  ne: SolarLatLng;
}

interface EnvironmentalMapProps {
  hasApiKey: boolean;
  activeLocation: ActiveLocation;
  pendingViewport: google.maps.LatLngBounds | null;
  mapType: MapLayerType;
  showAqiLayer: boolean;
  solarBoundingBox?: SolarBoundingBox;
  onMapCoordinateSelect: (location: ActiveLocation) => void;
  onViewportConsumed: () => void;
}

function MapEffectsHandler({
  activeLocation,
  pendingViewport,
  showAqiLayer,
  solarBoundingBox,
  onViewportConsumed,
}: {
  activeLocation: ActiveLocation;
  pendingViewport: google.maps.LatLngBounds | null;
  showAqiLayer: boolean;
  solarBoundingBox?: SolarBoundingBox;
  onViewportConsumed: () => void;
}) {
  const map = useMap();
  const mapsLibrary = useMapsLibrary('maps');
  const lastCoordsRef = useRef<string>('');

  // Pan / fitBounds when location or viewport changes
  useEffect(() => {
    if (!map) return;
    const coordKey = `${activeLocation.lat.toFixed(6)},${activeLocation.lng.toFixed(6)},${activeLocation.source}`;
    if (pendingViewport) {
      map.fitBounds(pendingViewport);
      lastCoordsRef.current = coordKey;
      onViewportConsumed();
      return;
    }

    if (lastCoordsRef.current === coordKey) return;
    lastCoordsRef.current = coordKey;

    map.panTo({ lat: activeLocation.lat, lng: activeLocation.lng });
    if (activeLocation.source === 'seed') {
      map.setZoom(16);
    }
  }, [map, activeLocation, pendingViewport, onViewportConsumed]);

  // Native WebGL-free ImageMapType overlay for US_AQI heatmap tiles
  useEffect(() => {
    if (!map || !mapsLibrary || !showAqiLayer) return;

    const aqiTileLayer = new google.maps.ImageMapType({
      name: 'US_AQI',
      tileSize: new google.maps.Size(256, 256),
      maxZoom: 16,
      minZoom: 0,
      opacity: 0.58,
      getTileUrl: (coord, zoom) => {
        if (zoom < 0 || zoom > 16) return '';
        const maxTile = 1 << zoom;
        if (coord.y < 0 || coord.y >= maxTile) return '';
        const normX = ((coord.x % maxTile) + maxTile) % maxTile;
        return `/api/air-quality/tiles?mapType=US_AQI&zoom=${zoom}&x=${normX}&y=${coord.y}`;
      },
    });

    map.overlayMapTypes.push(aqiTileLayer);

    return () => {
      const idx = map.overlayMapTypes.getArray().indexOf(aqiTileLayer);
      if (idx !== -1) {
        map.overlayMapTypes.removeAt(idx);
      }
    };
  }, [map, mapsLibrary, showAqiLayer]);

  // Solar building bounding box highlight
  useEffect(() => {
    if (!map || !mapsLibrary || !solarBoundingBox) return;

    const buildingBoundsRect = new google.maps.Rectangle({
      map,
      bounds: {
        south: solarBoundingBox.sw.latitude,
        west: solarBoundingBox.sw.longitude,
        north: solarBoundingBox.ne.latitude,
        east: solarBoundingBox.ne.longitude,
      },
      strokeColor: '#d97706',
      strokeOpacity: 0.95,
      strokeWeight: 2,
      fillColor: '#f59e0b',
      fillOpacity: 0.22,
      clickable: false,
    });

    return () => {
      buildingBoundsRect.setMap(null);
    };
  }, [map, mapsLibrary, solarBoundingBox]);

  return null;
}

export function EnvironmentalMap({
  hasApiKey,
  activeLocation,
  pendingViewport,
  mapType,
  showAqiLayer,
  solarBoundingBox,
  onMapCoordinateSelect,
  onViewportConsumed,
}: EnvironmentalMapProps) {
  const geocodingLibrary = useMapsLibrary('geocoding');
  const clickSeqRef = useRef(0);

  const handleMapClick = useCallback(
    async (event: MapMouseEvent) => {
      const latLng = event.detail?.latLng;
      if (!latLng) return;

      const lat = latLng.lat;
      const lng = latLng.lng;
      const seq = ++clickSeqRef.current;

      onMapCoordinateSelect({
        lat,
        lng,
        name: 'Selected Building / Point',
        formattedAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        source: 'map-click',
      });

      if (!geocodingLibrary) return;

      try {
        const geocoder = new geocodingLibrary.Geocoder();
        const response = await geocoder.geocode({ location: { lat, lng } });
        if (seq !== clickSeqRef.current) return;

        const best = response.results?.[0];
        if (best?.formatted_address) {
          const shortTitle =
            best.address_components?.[0]?.short_name && best.address_components?.[1]?.short_name
              ? `${best.address_components[0].short_name} ${best.address_components[1].short_name}`
              : best.formatted_address.split(',')[0];

          onMapCoordinateSelect({
            lat,
            lng,
            name: shortTitle || 'Inspected Location',
            formattedAddress: best.formatted_address,
            placeId: best.place_id,
            source: 'map-click',
          });
        }
      } catch {
        // Gracefully keep coordinate label when reverse geocoding has no street address (e.g. parks/water)
      }
    },
    [geocodingLibrary, onMapCoordinateSelect]
  );

  return (
    <section
      data-testid="map-container"
      className="map-panel"
      aria-label="Interactive Google Map for environmental and rooftop solar inspection"
    >
      {hasApiKey ? (
        <Map
          mapId="DEMO_MAP_ID"
          internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
          defaultCenter={{ lat: 33.4484, lng: -112.074 }}
          defaultZoom={16}
          mapTypeId={mapType}
          gestureHandling="greedy"
          clickableIcons={false}
          style={{ width: '100%', height: '100%', minHeight: '520px' }}
          onClick={handleMapClick}
        >
          <AdvancedMarker
            position={{ lat: activeLocation.lat, lng: activeLocation.lng }}
            title={activeLocation.name}
          >
            <Pin background="#0f766e" borderColor="#134e4a" glyphColor="#ffffff" />
          </AdvancedMarker>

          <MapEffectsHandler
            activeLocation={activeLocation}
            pendingViewport={pendingViewport}
            showAqiLayer={showAqiLayer}
            solarBoundingBox={solarBoundingBox}
            onViewportConsumed={onViewportConsumed}
          />
        </Map>
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            minHeight: '520px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center',
            color: '#334155',
          }}
        >
          <p style={{ fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>
            Google Maps Platform API Key Required
          </p>
          <p style={{ maxWidth: '460px', fontSize: '13px', color: '#475569', margin: 0 }}>
            Add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to <code>.env.local</code> and restart
            the server to render the interactive 2D map, Places Autocomplete, Weather, Air Quality,
            Pollen, and Rooftop Solar layers.
          </p>
        </div>
      )}

      <div className="map-overlay-card">
        <div style={{ fontWeight: 600, color: '#0f172a' }}>
          Click any building or rooftop to inspect
        </div>
        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
          Amber highlight marks the Solar API building footprint when covered.
        </div>
        {showAqiLayer && (
          <div style={{ marginTop: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#0f766e' }}>
              US AQI Heatmap Overlay Active
            </div>
            <div className="aqi-legend-bar" />
            <div className="aqi-legend-labels">
              <span>Good</span>
              <span>Moderate</span>
              <span>Unhealthy</span>
              <span>Hazardous</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
