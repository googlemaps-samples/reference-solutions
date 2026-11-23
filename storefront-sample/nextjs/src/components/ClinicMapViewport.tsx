'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMapView,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  CLINIC_DEFAULT_LOCATION,
  HOME_VISIT_RADIUS_METERS,
  TRAVEL_MODE_META,
} from '@/lib/constants';
import type {
  ClinicPlaceDetails,
  LatLngLiteral,
  OriginLocation,
  RouteSummary,
  ViewMode,
} from '@/lib/types';

interface ClinicMapOverlaysProps {
  clinicLocation: LatLngLiteral;
  originLocation: LatLngLiteral;
  showCoverage: boolean;
  route: RouteSummary | null;
}

function ClinicMapOverlays({
  clinicLocation,
  originLocation,
  showCoverage,
  route,
}: ClinicMapOverlaysProps) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const coreLib = useMapsLibrary('core');
  const geometryLib = useMapsLibrary('geometry');

  // 3.5 km local home-visit service-area Circle overlay
  useEffect(() => {
    if (!map || !mapsLib || !showCoverage) return;

    const circle = new mapsLib.Circle({
      map,
      center: clinicLocation,
      radius: HOME_VISIT_RADIUS_METERS,
      strokeColor: '#0f766e',
      strokeOpacity: 0.65,
      strokeWeight: 2,
      fillColor: '#14b8a6',
      fillOpacity: 0.1,
      clickable: false,
    });

    return () => {
      circle.setMap(null);
    };
  }, [map, mapsLib, clinicLocation, showCoverage]);

  // Active route Polyline + camera fitBounds
  useEffect(() => {
    if (!map || !mapsLib) return;

    let pathPoints: google.maps.LatLngLiteral[] = [];

    if (route?.path && route.path.length > 0) {
      pathPoints = route.path;
    } else if (route?.encodedPolyline && geometryLib?.encoding) {
      const decoded = geometryLib.encoding.decodePath(route.encodedPolyline);
      pathPoints = decoded.map((pt) => ({ lat: pt.lat(), lng: pt.lng() }));
    }

    let polyline: google.maps.Polyline | null = null;

    if (pathPoints.length > 0) {
      const modeColor = TRAVEL_MODE_META[route?.travelMode ?? 'DRIVE'].color;
      const isWalk = route?.travelMode === 'WALK';

      polyline = new mapsLib.Polyline({
        map,
        path: pathPoints,
        geodesic: true,
        strokeColor: modeColor,
        strokeOpacity: isWalk ? 0 : 0.9,
        strokeWeight: isWalk ? 4 : 5,
        icons: isWalk
          ? [
              {
                icon: {
                  path: 'M 0,-1 0,1',
                  strokeOpacity: 0.95,
                  strokeColor: modeColor,
                  scale: 3,
                },
                offset: '0',
                repeat: '14px',
              },
            ]
          : undefined,
      });
    }

    if (coreLib?.LatLngBounds) {
      const bounds = new coreLib.LatLngBounds();
      bounds.extend(clinicLocation);
      bounds.extend(originLocation);
      for (const pt of pathPoints) {
        bounds.extend(pt);
      }
      map.fitBounds(bounds, { top: 64, right: 64, bottom: 72, left: 64 });
    }

    return () => {
      if (polyline) {
        polyline.setMap(null);
      }
    };
  }, [map, mapsLib, coreLib, geometryLib, route, clinicLocation, originLocation]);

  return null;
}

interface StreetViewEntrancePaneProps {
  clinicLocation: LatLngLiteral;
  clinicName: string;
}

function StreetViewEntrancePane({
  clinicLocation,
  clinicName,
}: StreetViewEntrancePaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const map = useMap();
  const streetViewLib = useMapsLibrary('streetView');
  const geometryLib = useMapsLibrary('geometry');
  const coreLib = useMapsLibrary('core');
  const [statusNote, setStatusNote] = useState<string>('Locating entrance Street View...');

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !streetViewLib || !coreLib) return;

    let cancelled = false;
    let panorama: google.maps.StreetViewPanorama | null = null;
    const service = new streetViewLib.StreetViewService();

    service
      .getPanorama({
        location: clinicLocation,
        radius: 75,
        preference: streetViewLib.StreetViewPreference.BEST,
        source: streetViewLib.StreetViewSource.OUTDOOR,
      })
      .then(({ data }) => {
        if (cancelled || !containerRef.current) return;
        const panoId = data.location?.pano;
        const panoLatLng = data.location?.latLng;

        let heading = 180;
        if (panoLatLng && geometryLib?.spherical) {
          const targetLatLng = new coreLib.LatLng(
            clinicLocation.lat,
            clinicLocation.lng
          );
          heading = geometryLib.spherical.computeHeading(panoLatLng, targetLatLng);
        }

        panorama = new streetViewLib.StreetViewPanorama(containerRef.current, {
          pano: panoId,
          position: panoId ? undefined : clinicLocation,
          pov: {
            heading,
            pitch: 8,
          },
          zoom: 1,
          addressControl: false,
          enableCloseButton: false,
          fullscreenControl: false,
          motionTracking: false,
        });

        if (map) {
          map.setStreetView(panorama);
        }
        setStatusNote(`Entrance Preview — ${clinicName}`);
      })
      .catch(() => {
        if (cancelled || !containerRef.current) return;
        panorama = new streetViewLib.StreetViewPanorama(containerRef.current, {
          position: clinicLocation,
          pov: { heading: 180, pitch: 8 },
          zoom: 1,
          addressControl: false,
          enableCloseButton: false,
        });
        if (map) {
          map.setStreetView(panorama);
        }
        setStatusNote(`Street View near ${clinicName}`);
      });

    return () => {
      cancelled = true;
      if (map) {
        map.setStreetView(null);
      }
      if (panorama) {
        panorama.setVisible(false);
      }
    };
  }, [clinicLocation, clinicName, streetViewLib, geometryLib, coreLib, map]);

  return (
    <div className="street-view-pane" data-testid="street-view-container">
      <div className="street-view-badge">{statusNote}</div>
      <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 260 }} />
    </div>
  );
}

interface ClinicMapViewportProps {
  hasApiKey: boolean;
  clinic: ClinicPlaceDetails | null;
  origin: OriginLocation;
  showCoverage: boolean;
  viewMode: ViewMode;
  route: RouteSummary | null;
}

export function ClinicMapViewport({
  hasApiKey,
  clinic,
  origin,
  showCoverage,
  viewMode,
  route,
}: ClinicMapViewportProps) {
  const [infoWindowOpen, setInfoWindowOpen] = useState(false);

  const clinicLocation = clinic?.location ?? CLINIC_DEFAULT_LOCATION;
  const clinicName = clinic?.displayName ?? '450 Sutter Dental Studio';
  const showStreetView = viewMode === 'split' || viewMode === 'street-view';

  const splitClass =
    viewMode === 'split'
      ? 'is-split'
      : viewMode === 'street-view'
      ? 'is-street-only'
      : '';

  return (
    <div className={`viewport-split-grid ${splitClass}`}>
      <div className="map-pane" data-testid="map-container">
        {hasApiKey ? (
          <>
            <GoogleMapView
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
              defaultCenter={CLINIC_DEFAULT_LOCATION}
              defaultZoom={13}
              gestureHandling="greedy"
              mapTypeControl={false}
              streetViewControl={false}
              fullscreenControl={false}
              style={{ width: '100%', height: '100%', minHeight: '540px' }}
            >
              <AdvancedMarker
                position={clinicLocation}
                title={clinicName}
                onClick={() => setInfoWindowOpen(true)}
              >
                <div className="clinic-marker-badge">
                  <span className="clinic-marker-dot">+</span>
                  <span>{clinicName}</span>
                </div>
              </AdvancedMarker>

              {infoWindowOpen && (
                <InfoWindow
                  position={clinicLocation}
                  onCloseClick={() => setInfoWindowOpen(false)}
                >
                  <div className="info-window-card">
                    <div className="info-window-title">{clinicName}</div>
                    <div className="info-window-sub">
                      {clinic?.formattedAddress ?? '450 Sutter St, San Francisco, CA'}
                    </div>
                    {typeof clinic?.rating === 'number' && (
                      <div className="info-window-sub">
                        Rating: {clinic.rating.toFixed(1)} ({clinic.userRatingCount ?? 0} reviews)
                      </div>
                    )}
                  </div>
                </InfoWindow>
              )}

              <AdvancedMarker position={origin.location} title={`Origin: ${origin.label}`}>
                <Pin
                  background="#1d4ed8"
                  borderColor="#1e3a8a"
                  glyphColor="#ffffff"
                  glyphText="A"
                />
              </AdvancedMarker>

              <ClinicMapOverlays
                clinicLocation={clinicLocation}
                originLocation={origin.location}
                showCoverage={showCoverage}
                route={route}
              />
            </GoogleMapView>

            <div className="map-legend-chip">
              <span className="legend-item">
                <span className="legend-dot" style={{ background: '#0f766e' }} />
                Clinic Pin
              </span>
              <span className="legend-item">
                <span className="legend-dot" style={{ background: '#1d4ed8' }} />
                Origin
              </span>
              {showCoverage && (
                <span className="legend-item">
                  <span
                    className="legend-dot"
                    style={{
                      background: 'rgba(20, 184, 166, 0.35)',
                      border: '1px solid #0f766e',
                    }}
                  />
                  3.5 km Home-Visit Zone
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="map-fallback-box">
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>
              Google Maps API Key Required
            </h2>
            <p style={{ maxWidth: 460, fontSize: 13.5, color: 'var(--text-secondary)' }}>
              Add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to <code>.env.local</code>{' '}
              to render the interactive San Francisco map, custom Advanced Markers,
              3.5 km home-visit coverage overlay, Street View entrance preview, and
              live Places &amp; Routes data.
            </p>
          </div>
        )}
      </div>

      {hasApiKey && showStreetView && (
        <StreetViewEntrancePane
          clinicLocation={clinicLocation}
          clinicName={clinicName}
        />
      )}
    </div>
  );
}
