import { useCallback, useEffect, useRef } from 'react';
import {
  AdvancedMarker,
  Map as GoogleMap,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import type { MapMouseEvent } from '@vis.gl/react-google-maps';
import type {
  InspectedLocation,
  MapTypeOption,
  SolarBoundingBox,
} from '../types/environmental';

interface EnvironmentalMapProps {
  apiKey: string;
  activeLocation: InspectedLocation;
  mapType: MapTypeOption;
  showAqiOverlay: boolean;
  solarBoundingBox?: SolarBoundingBox | null;
  onInspectCoordinates: (location: InspectedLocation) => void;
}

function MapEffectsController({
  apiKey,
  activeLocation,
  showAqiOverlay,
  solarBoundingBox,
}: {
  apiKey: string;
  activeLocation: InspectedLocation;
  showAqiOverlay: boolean;
  solarBoundingBox?: SolarBoundingBox | null;
}) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const lastLocationKeyRef = useRef<string>('');

  // Sync camera when location changes via search or seed reset
  useEffect(() => {
    if (!map) return;
    const key = `${activeLocation.source}:${activeLocation.coords.lat.toFixed(6)},${activeLocation.coords.lng.toFixed(6)}`;
    if (lastLocationKeyRef.current === key) return;
    lastLocationKeyRef.current = key;

    if (activeLocation.source === 'autocomplete' && activeLocation.viewport) {
      map.fitBounds(activeLocation.viewport);
    } else if (activeLocation.source === 'seed') {
      map.panTo(activeLocation.coords);
      map.setZoom(16);
    } else {
      map.panTo(activeLocation.coords);
    }
  }, [map, activeLocation]);

  // Toggle native ImageMapType US_AQI heatmap tile overlay (WebGL-free)
  useEffect(() => {
    if (!map || !mapsLib || !showAqiOverlay || !apiKey) return;

    const aqiOverlay = new mapsLib.ImageMapType({
      name: 'US AQI',
      alt: 'US Air Quality Index Heatmap',
      tileSize: new google.maps.Size(256, 256),
      minZoom: 0,
      maxZoom: 16,
      opacity: 0.62,
      getTileUrl: (coord, zoom) => {
        if (!coord || zoom < 0 || zoom > 16) return '';
        const maxTile = 1 << zoom;
        const wrappedX = ((coord.x % maxTile) + maxTile) % maxTile;
        if (coord.y < 0 || coord.y >= maxTile) return '';
        return `https://airquality.googleapis.com/v1/mapTypes/US_AQI/heatmapTiles/${zoom}/${wrappedX}/${coord.y}?key=${encodeURIComponent(apiKey)}`;
      },
    });

    map.overlayMapTypes.push(aqiOverlay);

    return () => {
      const len = map.overlayMapTypes.getLength();
      for (let i = len - 1; i >= 0; i--) {
        if (map.overlayMapTypes.getAt(i) === aqiOverlay) {
          map.overlayMapTypes.removeAt(i);
        }
      }
    };
  }, [map, mapsLib, showAqiOverlay, apiKey]);

  // Render Solar API building bounding box highlight
  useEffect(() => {
    if (!map || !mapsLib || !solarBoundingBox) return;

    const rectangle = new mapsLib.Rectangle({
      map,
      bounds: {
        south: solarBoundingBox.sw.latitude,
        west: solarBoundingBox.sw.longitude,
        north: solarBoundingBox.ne.latitude,
        east: solarBoundingBox.ne.longitude,
      },
      strokeColor: '#f59e0b',
      strokeOpacity: 0.95,
      strokeWeight: 2.5,
      fillColor: '#fbbf24',
      fillOpacity: 0.2,
      clickable: false,
    });

    return () => {
      rectangle.setMap(null);
    };
  }, [map, mapsLib, solarBoundingBox]);

  return null;
}

export function EnvironmentalMap({
  apiKey,
  activeLocation,
  mapType,
  showAqiOverlay,
  solarBoundingBox,
  onInspectCoordinates,
}: EnvironmentalMapProps) {
  const geocodingLib = useMapsLibrary('geocoding');
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  useEffect(() => {
    if (geocodingLib && !geocoderRef.current) {
      geocoderRef.current = new geocodingLib.Geocoder();
    }
  }, [geocodingLib]);

  const handleMapClick = useCallback(
    async (event: MapMouseEvent) => {
      const latLng = event.detail.latLng;
      if (!latLng) return;

      const coords = { lat: latLng.lat, lng: latLng.lng };
      const fallbackLabel = `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;

      // Update coordinates immediately for snappy environmental fetch
      onInspectCoordinates({
        name: 'Inspected Rooftop / Location',
        formattedAddress: `Coordinates ${fallbackLabel}`,
        coords,
        source: 'map-click',
      });

      if (!geocoderRef.current) return;

      try {
        const response = await geocoderRef.current.geocode({ location: coords });
        const best = response.results?.[0];
        if (best) {
          const streetPart = best.formatted_address?.split(',')[0] || 'Selected Building';
          onInspectCoordinates({
            name: streetPart,
            formattedAddress: best.formatted_address || fallbackLabel,
            coords,
            placeId: best.place_id,
            source: 'map-click',
          });
        }
      } catch {
        // Keep coordinate-based inspection if reverse geocoding returns ZERO_RESULTS (e.g. remote terrain)
      }
    },
    [onInspectCoordinates]
  );

  return (
    <div data-testid="map-container" className="map-container">
      <GoogleMap
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
        defaultCenter={{ lat: 33.4484, lng: -112.074 }}
        defaultZoom={16}
        mapTypeId={mapType}
        gestureHandling="greedy"
        streetViewControl={false}
        mapTypeControl={false}
        fullscreenControl={true}
        zoomControl={true}
        onClick={handleMapClick}
        style={{ width: '100%', height: '100%', minHeight: '560px' }}
      >
        <AdvancedMarker
          position={activeLocation.coords}
          title={activeLocation.name}
        >
          <Pin
            background="#0f766e"
            borderColor="#134e4a"
            glyphColor="#ffffff"
            scale={1.15}
          />
        </AdvancedMarker>

        <MapEffectsController
          apiKey={apiKey}
          activeLocation={activeLocation}
          showAqiOverlay={showAqiOverlay}
          solarBoundingBox={solarBoundingBox}
        />
      </GoogleMap>

      <div className="map-floating-hint">
        Click any building or coordinate on the map to inspect hyperlocal telemetry &amp; rooftop solar
      </div>

      {showAqiOverlay && (
        <div className="aqi-legend-pill" aria-label="US AQI Heatmap Legend">
          <span className="aqi-legend-title">US AQI Overlay</span>
          <div className="aqi-legend-scale">
            <span className="legend-dot" style={{ background: '#00e400' }} /> Good
            <span className="legend-dot" style={{ background: '#ffff00' }} /> Mod
            <span className="legend-dot" style={{ background: '#ff7e00' }} /> USG
            <span className="legend-dot" style={{ background: '#ff0000' }} /> Unhealthy
          </div>
          <span className="aqi-legend-note">Zoom 0–16</span>
        </div>
      )}
    </div>
  );
}
