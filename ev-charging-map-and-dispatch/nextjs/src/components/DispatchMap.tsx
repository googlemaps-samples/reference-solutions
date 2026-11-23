'use client';

import { useEffect, useRef } from 'react';
import {
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  type MapMouseEvent,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { formatDistance, formatDuration } from '@/lib/dispatch-client';
import {
  SEATTLE_CENTER,
  type ComputedDispatchRoute,
  type LatLngLiteral,
  type RadiusKm,
  type ServiceProvider,
} from '@/lib/types';

interface DispatchMapProps {
  driverLocation: LatLngLiteral;
  driverAddress: string;
  radiusKm: RadiusKm;
  providers: ServiceProvider[];
  selectedProvider: ServiceProvider | null;
  activeRoute: ComputedDispatchRoute | null;
  infoWindowOpen: boolean;
  onDriverLocationChange: (loc: LatLngLiteral) => void;
  onSelectProvider: (provider: ServiceProvider) => void;
  onCloseInfoWindow: () => void;
  onMapCenterCapture: (center: LatLngLiteral) => void;
}

function ProximityCircle({
  center,
  radiusKm,
}: {
  center: LatLngLiteral;
  radiusKm: RadiusKm;
}) {
  const map = useMap('dispatch-map');
  const mapsLib = useMapsLibrary('maps');
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map || !mapsLib) return;

    const circle = new mapsLib.Circle({
      map,
      center,
      radius: radiusKm * 1000,
      strokeColor: '#2563eb',
      strokeOpacity: 0.75,
      strokeWeight: 2,
      fillColor: '#3b82f6',
      fillOpacity: 0.08,
      clickable: false,
    });
    circleRef.current = circle;

    return () => {
      circle.setMap(null);
      circleRef.current = null;
    };
  }, [map, mapsLib]);

  useEffect(() => {
    if (!circleRef.current) return;
    circleRef.current.setCenter(center);
    circleRef.current.setRadius(radiusKm * 1000);
  }, [center, radiusKm]);

  return null;
}

function RoutePolylineOverlay({
  activeRoute,
  driverLocation,
  selectedProvider,
}: {
  activeRoute: ComputedDispatchRoute | null;
  driverLocation: LatLngLiteral;
  selectedProvider: ServiceProvider | null;
}) {
  const map = useMap('dispatch-map');
  const mapsLib = useMapsLibrary('maps');
  const geometryLib = useMapsLibrary('geometry');
  const coreLib = useMapsLibrary('core');

  useEffect(() => {
    if (!map || !mapsLib || !geometryLib || !coreLib || !activeRoute) {
      return;
    }

    const decodedPath = geometryLib.encoding.decodePath(
      activeRoute.encodedPolyline
    );

    const casingLine = new mapsLib.Polyline({
      map,
      path: decodedPath,
      strokeColor: '#1e3a8a',
      strokeOpacity: 0.9,
      strokeWeight: 8,
      zIndex: 40,
      clickable: false,
    });

    const routeLine = new mapsLib.Polyline({
      map,
      path: decodedPath,
      strokeColor: '#38bdf8',
      strokeOpacity: 1,
      strokeWeight: 4,
      zIndex: 41,
      clickable: false,
    });

    const bounds = new coreLib.LatLngBounds();
    bounds.extend(driverLocation);
    if (selectedProvider) {
      bounds.extend(selectedProvider.location);
    }
    for (const pt of decodedPath) {
      bounds.extend(pt);
    }
    map.fitBounds(bounds, { top: 64, right: 48, bottom: 64, left: 48 });

    return () => {
      casingLine.setMap(null);
      routeLine.setMap(null);
    };
  }, [map, mapsLib, geometryLib, coreLib, activeRoute, driverLocation, selectedProvider]);

  return null;
}

function SelectedMarkerInfoWindow({
  provider,
  isOpen,
  onClose,
}: {
  provider: ServiceProvider | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!provider || !isOpen) return null;

  return (
    <InfoWindow
      position={provider.location}
      pixelOffset={[0, -34]}
      onCloseClick={onClose}
    >
      <div style={{ maxWidth: 260, padding: '2px 4px', color: '#0f172a' }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            color: provider.category === 'ev' ? '#059669' : '#d97706',
            marginBottom: 2,
          }}
        >
          {provider.category === 'ev' ? 'EV Fast Charging' : 'Auto Repair'}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
          {provider.name}
        </div>
        <div style={{ fontSize: 12, color: '#475569', marginBottom: 6 }}>
          {provider.address}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
          {provider.durationSeconds
            ? `${formatDuration(provider.durationSeconds)} (${formatDistance(
                provider.distanceMeters
              )})`
            : `${formatDistance(provider.straightLineMeters)} away`}
          {typeof provider.rating === 'number'
            ? ` • ★ ${provider.rating.toFixed(1)}`
            : ''}
        </div>
        {provider.category === 'ev' && provider.evConnectorCount ? (
          <div style={{ fontSize: 12, color: '#065f46', marginBottom: 6 }}>
            {typeof provider.evAvailableCount === 'number'
              ? `${provider.evAvailableCount}/${provider.evConnectorCount} ports available`
              : `${provider.evConnectorCount} EV connectors`}
            {provider.maxChargeRateKw
              ? ` • Up to ${provider.maxChargeRateKw} kW`
              : ''}
          </div>
        ) : null}
        {provider.googleMapsUri ? (
          <a
            href={provider.googleMapsUri}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#2563eb',
              textDecoration: 'underline',
            }}
          >
            View on Google Maps
          </a>
        ) : null}
      </div>
    </InfoWindow>
  );
}

export function DispatchMap({
  driverLocation,
  driverAddress,
  radiusKm,
  providers,
  selectedProvider,
  activeRoute,
  infoWindowOpen,
  onDriverLocationChange,
  onSelectProvider,
  onCloseInfoWindow,
  onMapCenterCapture,
}: DispatchMapProps) {
  const map = useMap('dispatch-map');
  const [driverMarkerRef] = useAdvancedMarkerRef();

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener('idle', () => {
      const c = map.getCenter();
      if (c) {
        onMapCenterCapture({ lat: c.lat(), lng: c.lng() });
      }
    });
    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, onMapCenterCapture]);

  const handleMapClick = (event: MapMouseEvent) => {
    if (!event.detail?.latLng) return;
    onDriverLocationChange({
      lat: event.detail.latLng.lat,
      lng: event.detail.latLng.lng,
    });
  };

  const handleDriverDragEnd = (event: google.maps.MapMouseEvent) => {
    if (!event.latLng) return;
    onDriverLocationChange({
      lat: event.latLng.lat(),
      lng: event.latLng.lng(),
    });
  };

  return (
    <div id="map-container" className="map-pane">
      <GoogleMap
        id="dispatch-map"
        className="map-canvas"
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
        defaultCenter={SEATTLE_CENTER}
        defaultZoom={12}
        gestureHandling="greedy"
        clickableIcons={false}
        onClick={handleMapClick}
      >
        <ProximityCircle center={driverLocation} radiusKm={radiusKm} />

        <RoutePolylineOverlay
          activeRoute={activeRoute}
          driverLocation={driverLocation}
          selectedProvider={selectedProvider}
        />

        <AdvancedMarker
          ref={driverMarkerRef}
          position={driverLocation}
          draggable={true}
          onDragEnd={handleDriverDragEnd}
          zIndex={100}
          title={`Driver Breakdown Location: ${driverAddress} (Drag to relocate)`}
        >
          <div className="driver-pin">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '999px',
                background: '#fef08a',
              }}
            />
            <span>Driver Pin</span>
          </div>
        </AdvancedMarker>

        {providers.map((provider) => {
          const isSelected = selectedProvider?.id === provider.id;
          return (
            <AdvancedMarker
              key={provider.id}
              position={provider.location}
              zIndex={isSelected ? 80 : 30}
              title={provider.name}
              onClick={() => onSelectProvider(provider)}
            >
              <div
                className={`provider-pin ${
                  provider.category === 'ev'
                    ? 'provider-pin-ev'
                    : 'provider-pin-repair'
                }${isSelected ? ' selected' : ''}`}
              >
                {provider.category === 'ev' ? (
                  <>
                    <span aria-hidden="true">⚡</span>
                    <span>
                      {provider.maxChargeRateKw
                        ? `${provider.maxChargeRateKw}kW`
                        : 'EV'}
                    </span>
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">🔧</span>
                    <span>Repair</span>
                  </>
                )}
              </div>
            </AdvancedMarker>
          );
        })}

        <SelectedMarkerInfoWindow
          provider={selectedProvider}
          isOpen={infoWindowOpen}
          onClose={onCloseInfoWindow}
        />
      </GoogleMap>

      <div className="map-legend-overlay" aria-label="Map legend">
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#dc2626' }} />
          Driver (Drag or click map)
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#059669' }} />
          EV Fast Charging
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#d97706' }} />
          Auto Repair
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#2563eb' }} />
          {radiusKm} km Search Ring
        </span>
      </div>
    </div>
  );
}
