import React, { useEffect, useRef, useState } from 'react';
import {
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import type {
  ClinicVenueData,
  OriginLocation,
  RouteSummaryData,
  TravelModeKey,
} from '../types';
import {
  COVERAGE_RADIUS_METERS,
  DEFAULT_SF_CENTER,
  formatDistanceMeters,
  formatDurationMillis,
} from '../utils/geo';

interface ClinicMapViewportProps {
  clinic: ClinicVenueData | null;
  origin: OriginLocation | null;
  travelMode: TravelModeKey;
  showCoverage: boolean;
  showStreetView: boolean;
  onRouteComputed: (summary: RouteSummaryData | null) => void;
  onRouteLoadingChange: (loading: boolean) => void;
  onRouteError: (error: string | null) => void;
}

const MODE_COLORS: Record<TravelModeKey, string> = {
  DRIVING: '#0f766e',
  TRANSIT: '#7c3aed',
  WALKING: '#059669',
};

const CoverageCircleOverlay: React.FC<{
  center: google.maps.LatLngLiteral;
  visible: boolean;
}> = ({ center, visible }) => {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib || !visible) return;

    const circle = new mapsLib.Circle({
      map,
      center,
      radius: COVERAGE_RADIUS_METERS,
      fillColor: '#0f766e',
      fillOpacity: 0.1,
      strokeColor: '#0f766e',
      strokeOpacity: 0.65,
      strokeWeight: 2,
      clickable: false,
    });

    return () => {
      circle.setMap(null);
    };
  }, [map, mapsLib, center.lat, center.lng, visible]);

  return null;
};

const RoutePolylineLayer: React.FC<{
  origin: OriginLocation;
  destination: ClinicVenueData;
  travelMode: TravelModeKey;
  onRouteComputed: (summary: RouteSummaryData | null) => void;
  onRouteLoadingChange: (loading: boolean) => void;
  onRouteError: (error: string | null) => void;
}> = ({
  origin,
  destination,
  travelMode,
  onRouteComputed,
  onRouteLoadingChange,
  onRouteError,
}) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const mapsLib = useMapsLibrary('maps');
  const coreLib = useMapsLibrary('core');

  const onRouteComputedRef = useRef(onRouteComputed);
  const onRouteLoadingRef = useRef(onRouteLoadingChange);
  const onRouteErrorRef = useRef(onRouteError);

  useEffect(() => {
    onRouteComputedRef.current = onRouteComputed;
    onRouteLoadingRef.current = onRouteLoadingChange;
    onRouteErrorRef.current = onRouteError;
  }, [onRouteComputed, onRouteLoadingChange, onRouteError]);

  useEffect(() => {
    if (!map || !routesLib || !mapsLib) return;

    let cancelled = false;
    let activePolylines: google.maps.Polyline[] = [];

    const clearPolylines = () => {
      activePolylines.forEach((line) => line.setMap(null));
      activePolylines = [];
    };

    const compute = async () => {
      onRouteLoadingRef.current(true);
      onRouteErrorRef.current(null);

      try {
        const request: google.maps.routes.ComputeRoutesRequest = {
          origin: origin.location,
          destination: destination.location,
          travelMode: travelMode as google.maps.TravelModeString,
          fields: [
            'path',
            'durationMillis',
            'distanceMeters',
            'localizedValues',
            'viewport',
            'description',
            'warnings',
          ],
          internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
          ...(travelMode === 'TRANSIT' ? { departureTime: new Date() } : {}),
        };

        const { routes } = await routesLib.Route.computeRoutes(request);
        if (cancelled) return;

        if (!routes || routes.length === 0) {
          clearPolylines();
          onRouteComputedRef.current(null);
          onRouteErrorRef.current(
            `No ${travelMode.toLowerCase()} route is currently available between these locations.`
          );
          onRouteLoadingRef.current(false);
          return;
        }

        const primaryRoute = routes[0];
        const color = MODE_COLORS[travelMode];

        let drawn = primaryRoute.createPolylines({
          polylineOptions: {
            map,
            strokeColor: color,
            strokeOpacity: 0.92,
            strokeWeight: 5,
          },
        });

        if ((!drawn || drawn.length === 0) && primaryRoute.path?.length) {
          const fallbackPolyline = new mapsLib.Polyline({
            map,
            path: primaryRoute.path,
            geodesic: true,
            strokeColor: color,
            strokeOpacity: 0.92,
            strokeWeight: 5,
          });
          drawn = [fallbackPolyline];
        }

        activePolylines = drawn ?? [];

        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport, {
            top: 48,
            right: 48,
            bottom: 72,
            left: 48,
          });
        } else if (coreLib) {
          const bounds = new coreLib.LatLngBounds();
          bounds.extend(origin.location);
          bounds.extend(destination.location);
          map.fitBounds(bounds, {
            top: 48,
            right: 48,
            bottom: 72,
            left: 48,
          });
        }

        const distanceMeters = primaryRoute.distanceMeters ?? 0;
        const durationMillis = primaryRoute.durationMillis ?? 0;

        onRouteComputedRef.current({
          travelMode,
          durationText:
            primaryRoute.localizedValues?.duration ??
            formatDurationMillis(durationMillis),
          distanceText:
            primaryRoute.localizedValues?.distance ??
            formatDistanceMeters(distanceMeters),
          distanceMeters,
          durationMillis,
          description: primaryRoute.description ?? null,
          warnings: primaryRoute.warnings ?? [],
        });
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to calculate route at this time.';
        onRouteComputedRef.current(null);
        onRouteErrorRef.current(message);
      } finally {
        if (!cancelled) {
          onRouteLoadingRef.current(false);
        }
      }
    };

    void compute();

    return () => {
      cancelled = true;
      clearPolylines();
    };
  }, [
    map,
    routesLib,
    mapsLib,
    coreLib,
    origin.location.lat,
    origin.location.lng,
    destination.location.lat,
    destination.location.lng,
    travelMode,
  ]);

  return null;
};

const StreetViewEntrancePanel: React.FC<{
  clinic: ClinicVenueData | null;
}> = ({ clinic }) => {
  const map = useMap('clinic-map-instance');
  const streetViewLib = useMapsLibrary('streetView');
  const geometryLib = useMapsLibrary('geometry');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(
    'Locating Street View panorama near clinic entrance...'
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!streetViewLib || !container || !clinic) return;

    let cancelled = false;
    const svService = new streetViewLib.StreetViewService();
    const panorama = new streetViewLib.StreetViewPanorama(container, {
      addressControl: false,
      fullscreenControl: true,
      enableCloseButton: false,
      visible: true,
    });

    const loadPanorama = async () => {
      setStatusMessage('Locating Street View panorama near clinic entrance...');
      try {
        const { data } = await svService.getPanorama({
          location: clinic.location,
          radius: 90,
          preference: streetViewLib.StreetViewPreference.BEST,
          sources: [streetViewLib.StreetViewSource.OUTDOOR],
        });

        if (cancelled) return;

        const panoLocation = data.location?.latLng;
        if (data.location?.pano && panoLocation) {
          let heading = 0;
          if (geometryLib?.spherical) {
            heading = geometryLib.spherical.computeHeading(
              panoLocation,
              clinic.location
            );
          }
          panorama.setPano(data.location.pano);
          panorama.setPov({ heading, pitch: 4 });
          panorama.setVisible(true);
          if (map) {
            map.setStreetView(panorama);
          }
          setStatusMessage(null);
        } else {
          setStatusMessage('Street View imagery is unavailable at this entrance.');
        }
      } catch {
        if (!cancelled) {
          setStatusMessage(
            'Street View imagery could not be loaded for this address.'
          );
        }
      }
    };

    void loadPanorama();

    return () => {
      cancelled = true;
      if (map) {
        map.setStreetView(null);
      }
      panorama.setVisible(false);
    };
  }, [streetViewLib, geometryLib, map, clinic?.location.lat, clinic?.location.lng]);

  return (
    <div
      id="street-view-panel"
      data-testid="street-view-panel"
      className="street-view-panel"
      aria-label="Street View Entrance Preview"
    >
      <div className="street-view-bar">
        <span>Street View Entrance Preview</span>
        {clinic && (
          <span style={{ color: '#99f6e4', fontWeight: 500 }}>
            {clinic.name}
          </span>
        )}
      </div>

      <div ref={containerRef} className="street-view-canvas" />

      {statusMessage && (
        <div className="street-view-status">{statusMessage}</div>
      )}
    </div>
  );
};

export const ClinicMapViewport: React.FC<ClinicMapViewportProps> = ({
  clinic,
  origin,
  travelMode,
  showCoverage,
  showStreetView,
  onRouteComputed,
  onRouteLoadingChange,
  onRouteError,
}) => {
  const [clinicMarkerRef, clinicMarker] = useAdvancedMarkerRef();
  const [originMarkerRef, originMarker] = useAdvancedMarkerRef();
  const [openInfo, setOpenInfo] = useState<'clinic' | 'origin' | null>(null);

  const mapCenter = clinic?.location ?? DEFAULT_SF_CENTER;

  return (
    <div
      className={`viewport-panel ${showStreetView ? 'split-active' : ''}`}
    >
      <div className="map-stage">
        <div
          id="clinic-map"
          data-testid="clinic-map"
          className="clinic-map-container"
        >
          <GoogleMap
            id="clinic-map-instance"
            style={{ width: '100%', height: '100%' }}
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
            defaultCenter={mapCenter}
            defaultZoom={13}
            gestureHandling="greedy"
            mapTypeControl={false}
            streetViewControl={false}
            fullscreenControl={true}
            onClick={() => setOpenInfo(null)}
          >
          {clinic && (
            <>
              <AdvancedMarker
                ref={clinicMarkerRef}
                position={clinic.location}
                title={clinic.name}
                onClick={() => setOpenInfo('clinic')}
              >
                <div className="clinic-pin">
                  <span aria-hidden="true">🦷</span>
                  <span>{clinic.name}</span>
                </div>
              </AdvancedMarker>

              {openInfo === 'clinic' && clinicMarker && (
                <InfoWindow
                  anchor={clinicMarker}
                  onCloseClick={() => setOpenInfo(null)}
                  headerContent={<strong>{clinic.name}</strong>}
                >
                  <div style={{ fontSize: '0.82rem', maxWidth: 240 }}>
                    <div>{clinic.address}</div>
                    {clinic.rating != null && (
                      <div style={{ marginTop: 4, fontWeight: 600 }}>
                        ★ {clinic.rating.toFixed(1)} ({clinic.userRatingCount ?? 0} reviews)
                      </div>
                    )}
                    <div style={{ marginTop: 4, color: '#0f766e', fontWeight: 600 }}>
                      {clinic.openStatus.label}
                    </div>
                  </div>
                </InfoWindow>
              )}

              <CoverageCircleOverlay
                center={clinic.location}
                visible={showCoverage}
              />
            </>
          )}

          {origin && (
            <>
              <AdvancedMarker
                ref={originMarkerRef}
                position={origin.location}
                title={`Origin: ${origin.name}`}
                onClick={() => setOpenInfo('origin')}
              >
                <div className="origin-pin">
                  <span aria-hidden="true">📍</span>
                  <span>Origin: {origin.name}</span>
                </div>
              </AdvancedMarker>

              {openInfo === 'origin' && originMarker && (
                <InfoWindow
                  anchor={originMarker}
                  onCloseClick={() => setOpenInfo(null)}
                  headerContent={<strong>Starting Origin</strong>}
                >
                  <div style={{ fontSize: '0.82rem', maxWidth: 220 }}>
                    <div>{origin.name}</div>
                    <div style={{ color: '#475569', marginTop: 2 }}>
                      {origin.address}
                    </div>
                  </div>
                </InfoWindow>
              )}
            </>
          )}

          {clinic && origin && (
            <RoutePolylineLayer
              origin={origin}
              destination={clinic}
              travelMode={travelMode}
              onRouteComputed={onRouteComputed}
              onRouteLoadingChange={onRouteLoadingChange}
              onRouteError={onRouteError}
            />
          )}
        </GoogleMap>
        </div>

        <div className="map-legend-overlay" aria-label="Map Legend">
          <span className="legend-item">
            <span className="legend-dot" style={{ background: '#0f766e' }} />
            Dental Clinic
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: '#1d4ed8' }} />
            Your Origin
          </span>
          <span className="legend-item">
            <span
              className="legend-dot"
              style={{ background: MODE_COLORS[travelMode] }}
            />
            {travelMode} Route
          </span>
          {showCoverage && (
            <span className="legend-item">
              <span
                className="legend-dot"
                style={{
                  background: 'rgba(15, 118, 110, 0.25)',
                  border: '1.5px solid #0f766e',
                }}
              />
              5 km Home Visit Zone
            </span>
          )}
        </div>
      </div>

      {showStreetView && <StreetViewEntrancePanel clinic={clinic} />}
    </div>
  );
};
