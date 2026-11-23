import { useEffect, useRef } from 'react';
import {
  AdvancedMarker,
  Circle,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  Polyline,
  useMap,
} from '@vis.gl/react-google-maps';
import { Clock, Navigation, Star, Wrench, Zap } from 'lucide-react';
import type {
  ActiveDispatchRoute,
  DispatchProvider,
  LatLngLiteral,
  RadiusKm,
} from '../types/dispatch';

interface DispatchMapProps {
  driverLocation: LatLngLiteral;
  driverAddress: string;
  radiusKm: RadiusKm;
  providers: DispatchProvider[];
  selectedProvider: DispatchProvider | null;
  activeRoute: ActiveDispatchRoute | null;
  viewportToFit: google.maps.LatLngBounds | null;
  onMapCenterUpdate: (center: LatLngLiteral) => void;
  onRelocateDriver: (location: LatLngLiteral) => void;
  onSelectProvider: (provider: DispatchProvider | null) => void;
  onDispatchRoute: (provider: DispatchProvider) => void;
}

const SEATTLE_CENTER: LatLngLiteral = { lat: 47.6062, lng: -122.3321 };

export function DispatchMap({
  driverLocation,
  driverAddress,
  radiusKm,
  providers,
  selectedProvider,
  activeRoute,
  viewportToFit,
  onMapCenterUpdate,
  onRelocateDriver,
  onSelectProvider,
  onDispatchRoute,
}: DispatchMapProps) {
  const map = useMap();
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    if (!map || !viewportToFit) return;
    map.fitBounds(viewportToFit, { top: 48, right: 48, bottom: 48, left: 48 });
  }, [map, viewportToFit]);

  useEffect(() => {
    if (!map || !activeRoute) return;
    if (activeRoute.viewport) {
      map.fitBounds(activeRoute.viewport, {
        top: 64,
        right: 64,
        bottom: 64,
        left: 64,
      });
    }
  }, [map, activeRoute]);

  useEffect(() => {
    if (!map) return;
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    if (!activeRoute) {
      map.panTo(driverLocation);
    }
  }, [map, driverLocation, activeRoute]);

  return (
    <section
      id="map-container"
      data-testid="map-container"
      className="map-pane"
      aria-label="Interactive Seattle EV and roadside dispatch map"
    >
      <GoogleMap
        defaultCenter={SEATTLE_CENTER}
        defaultZoom={12}
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
        gestureHandling="greedy"
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={true}
        onCameraChanged={(ev) => {
          onMapCenterUpdate(ev.detail.center);
        }}
        onClick={(ev) => {
          if (ev.detail.latLng) {
            onSelectProvider(null);
            onRelocateDriver(ev.detail.latLng);
          }
        }}
      >
        <Circle
          center={driverLocation}
          radius={radiusKm * 1000}
          strokeColor="#0284c7"
          strokeOpacity={0.8}
          strokeWeight={2}
          fillColor="#0ea5e9"
          fillOpacity={0.08}
          clickable={false}
        />

        {activeRoute && activeRoute.path.length > 1 && (
          <>
            <Polyline
              path={activeRoute.path}
              strokeColor="#0f172a"
              strokeOpacity={0.45}
              strokeWeight={9}
              zIndex={19}
            />
            <Polyline
              path={activeRoute.path}
              strokeColor="#0d9488"
              strokeOpacity={0.95}
              strokeWeight={5}
              zIndex={20}
            />
          </>
        )}

        <AdvancedMarker
          position={driverLocation}
          draggable={true}
          zIndex={1000}
          title={`Driver Breakdown Location: ${driverAddress} (drag to relocate)`}
          onDragEnd={(event) => {
            if (event.latLng) {
              onRelocateDriver({
                lat: event.latLng.lat(),
                lng: event.latLng.lng(),
              });
            }
          }}
        >
          <div className="driver-pin" aria-label="Driver breakdown location pin">
            <span className="driver-pin-pulse" />
            <span className="driver-pin-core">SOS</span>
          </div>
        </AdvancedMarker>

        {providers.map((provider, idx) => {
          const isSelected = selectedProvider?.id === provider.id;
          const isRouted = activeRoute?.providerId === provider.id;
          const isEv = provider.category === 'ev_charging';

          return (
            <AdvancedMarker
              key={provider.id}
              position={provider.location}
              title={`${provider.name} (${provider.durationText ?? 'ETA calculating'})`}
              zIndex={isRouted ? 800 : isSelected ? 700 : 200 - idx}
              onClick={() => onSelectProvider(provider)}
            >
              <Pin
                background={isEv ? '#059669' : '#d97706'}
                borderColor={isRouted ? '#0f172a' : isEv ? '#065f46' : '#92400e'}
                glyphColor="#ffffff"
                glyphText={isEv ? '⚡' : '🔧'}
                scale={isSelected || isRouted ? 1.25 : 1}
              />
            </AdvancedMarker>
          );
        })}

        {selectedProvider && (
          <InfoWindow
            position={selectedProvider.location}
            pixelOffset={[0, -40]}
            onCloseClick={() => onSelectProvider(null)}
            headerContent={
              <div className="infowindow-header">
                <span
                  className={`category-chip ${
                    selectedProvider.category === 'ev_charging' ? 'ev' : 'repair'
                  }`}
                >
                  {selectedProvider.category === 'ev_charging' ? (
                    <>
                      <Zap size={12} />
                      <span>EV Charging</span>
                    </>
                  ) : (
                    <>
                      <Wrench size={12} />
                      <span>Auto Repair</span>
                    </>
                  )}
                </span>
                <strong className="infowindow-title">
                  {selectedProvider.name}
                </strong>
              </div>
            }
          >
            <div className="infowindow-body">
              <p className="infowindow-address">{selectedProvider.address}</p>

              <div className="infowindow-stats">
                {selectedProvider.rating !== null && (
                  <span className="rating-badge">
                    <Star size={12} fill="currentColor" />
                    <span>{selectedProvider.rating.toFixed(1)}</span>
                    {selectedProvider.userRatingCount !== null && (
                      <span>({selectedProvider.userRatingCount})</span>
                    )}
                  </span>
                )}
                <span className="infowindow-eta">
                  <Clock size={12} />
                  <span>
                    {selectedProvider.durationText ?? '—'} •{' '}
                    {selectedProvider.distanceText ?? '—'}
                  </span>
                </span>
              </div>

              {selectedProvider.category === 'ev_charging' &&
                selectedProvider.evMaxKw !== null && (
                  <p className="infowindow-ev">
                    Fast charge up to {Math.round(selectedProvider.evMaxKw)} kW
                    {selectedProvider.evAvailableConnectors !== null &&
                    selectedProvider.evTotalConnectors !== null
                      ? ` • ${selectedProvider.evAvailableConnectors}/${selectedProvider.evTotalConnectors} open`
                      : ''}
                  </p>
                )}

              <button
                type="button"
                className="btn-dispatch infowindow-btn"
                onClick={() => onDispatchRoute(selectedProvider)}
              >
                <Navigation size={13} />
                <span>Route Here</span>
              </button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      <div className="map-legend-overlay" aria-hidden="true">
        <span className="legend-item">
          <span className="legend-dot driver" />
          <span>Driver Pin (Drag or Click Map)</span>
        </span>
        <span className="legend-item">
          <span className="legend-dot ev" />
          <span>EV Station</span>
        </span>
        <span className="legend-item">
          <span className="legend-dot repair" />
          <span>Auto Repair</span>
        </span>
      </div>
    </section>
  );
}
