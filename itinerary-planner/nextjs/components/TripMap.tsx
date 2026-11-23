'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AdvancedMarker,
  InfoWindow,
  Map,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { DAY_COLORS } from '@/lib/formatters';
import {
  ComputedRouteData,
  DayNumber,
  DestinationState,
  PlaceItem,
} from '@/types/itinerary';

interface TripMapProps {
  hasApiKey: boolean;
  destination: DestinationState;
  activeDay: DayNumber;
  activeStops: PlaceItem[];
  discoveryPlaces: PlaceItem[];
  routeData: ComputedRouteData | null;
  selectedPlace: PlaceItem | null;
  onSelectPlace: (place: PlaceItem) => void;
  onAddStop: (place: PlaceItem, day: DayNumber) => void;
}

function MapPolylineAndBounds({
  destination,
  activeStops,
  routeData,
  activeDay,
}: {
  destination: DestinationState;
  activeStops: PlaceItem[];
  routeData: ComputedRouteData | null;
  activeDay: DayNumber;
}) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const geometryLib = useMapsLibrary('geometry');
  const coreLib = useMapsLibrary('core');

  const dayColor = DAY_COLORS[activeDay].hex;

  // Render active day polyline from Routes API encodedPolyline
  useEffect(() => {
    if (!map || !mapsLib || !geometryLib || !routeData?.encodedPolyline) {
      return;
    }

    const decodedPath = geometryLib.encoding.decodePath(routeData.encodedPolyline);
    const polyline = new mapsLib.Polyline({
      path: decodedPath,
      strokeColor: dayColor,
      strokeOpacity: 0.9,
      strokeWeight: 5,
      geodesic: true,
      map,
    });

    return () => {
      polyline.setMap(null);
    };
  }, [map, mapsLib, geometryLib, routeData?.encodedPolyline, dayColor]);

  // Fit bounds when active stops or destination change
  useEffect(() => {
    if (!map || !coreLib) return;

    if (activeStops.length >= 2) {
      const bounds = new coreLib.LatLngBounds();
      activeStops.forEach((stop) => {
        bounds.extend(stop.location);
      });
      map.fitBounds(bounds, { top: 64, right: 48, bottom: 48, left: 48 });
      return;
    }

    if (activeStops.length === 1) {
      map.panTo(activeStops[0].location);
      map.setZoom(14);
      return;
    }

    map.panTo(destination.center);
    map.setZoom(destination.zoom);
  }, [map, coreLib, activeStops, destination.center, destination.zoom]);

  return null;
}

export function TripMap({
  hasApiKey,
  destination,
  activeDay,
  activeStops,
  discoveryPlaces,
  routeData,
  selectedPlace,
  onSelectPlace,
  onAddStop,
}: TripMapProps) {
  const [infoPlace, setInfoPlace] = useState<PlaceItem | null>(null);
  const markerElementsRef = useRef<Record<string, google.maps.marker.AdvancedMarkerElement | null>>({});

  const activeDayStyle = DAY_COLORS[activeDay];

  const activeStopIds = useMemo(() => {
    const lookup: Record<string, boolean> = {};
    for (const stop of activeStops) {
      lookup[stop.id] = true;
    }
    return lookup;
  }, [activeStops]);

  const unscheduledDiscovery = useMemo(
    () => discoveryPlaces.filter((place) => !activeStopIds[place.id]),
    [discoveryPlaces, activeStopIds]
  );

  if (!hasApiKey) {
    return (
      <div data-testid="map-container" className="map-container">
        <div className="setup-banner">
          <div className="setup-card">
            <h2 style={{ margin: '0 0 8px 0', fontSize: 18 }}>
              Google Maps Platform API Key Required
            </h2>
            <p style={{ margin: '0 0 12px 0', fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
              Add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to{' '}
              <code>.env.local</code> and restart the Next.js server to load the
              interactive Tokyo map, live Places API (New) discovery, Routes API
              multi-stop polylines, Time Zone Hub, and Street View preview.
            </p>
            <a
              href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-block',
                background: '#0f766e',
                color: '#ffffff',
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Get a free Maps Demo Key →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="map-container" className="map-container">
      <div className="map-overlay-legend" aria-label="Map legend">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            className="day-dot"
            style={{ background: activeDayStyle.hex, marginRight: 0 }}
          />
          {activeDayStyle.label} Route ({activeStops.length} stops)
        </span>
        <span style={{ color: '#64748b', fontWeight: 500 }}>
          • {unscheduledDiscovery.length} discovery pins
        </span>
      </div>

      <Map
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
        defaultCenter={destination.center}
        defaultZoom={destination.zoom}
        gestureHandling="greedy"
        mapTypeControl={true}
        streetViewControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <MapPolylineAndBounds
          destination={destination}
          activeStops={activeStops}
          routeData={routeData}
          activeDay={activeDay}
        />

        {unscheduledDiscovery.map((place) => {
          const isSelected = selectedPlace?.id === place.id;
          return (
            <AdvancedMarker
              key={`disc-${place.id}`}
              position={place.location}
              title={place.displayName}
              zIndex={isSelected ? 25 : 5}
              ref={(el) => {
                markerElementsRef.current[place.id] = el;
              }}
              onClick={() => {
                onSelectPlace(place);
                setInfoPlace(place);
              }}
            >
              <Pin
                background={isSelected ? '#1d4ed8' : '#475569'}
                borderColor={isSelected ? '#1e3a8a' : '#334155'}
                glyphColor="#ffffff"
                scale={isSelected ? 1.0 : 0.78}
              />
            </AdvancedMarker>
          );
        })}

        {activeStops.map((stop, index) => {
          const isSelected = selectedPlace?.id === stop.id;
          return (
            <AdvancedMarker
              key={`stop-${activeDay}-${stop.id}`}
              position={stop.location}
              title={`${index + 1}. ${stop.displayName}`}
              zIndex={isSelected ? 50 : 30 + index}
              ref={(el) => {
                markerElementsRef.current[stop.id] = el;
              }}
              onClick={() => {
                onSelectPlace(stop);
                setInfoPlace(stop);
              }}
            >
              <Pin
                background={activeDayStyle.hex}
                borderColor={activeDayStyle.border}
                glyphColor="#ffffff"
                glyphText={String(index + 1)}
                scale={isSelected ? 1.2 : 1.05}
              />
            </AdvancedMarker>
          );
        })}

        {infoPlace && (
          <InfoWindow
            anchor={markerElementsRef.current[infoPlace.id] ?? undefined}
            position={
              markerElementsRef.current[infoPlace.id]
                ? undefined
                : infoPlace.location
            }
            maxWidth={260}
            onCloseClick={() => setInfoPlace(null)}
          >
            <div style={{ padding: '2px 2px 4px 2px', color: '#0f172a' }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                {infoPlace.displayName}
              </div>
              {infoPlace.rating !== undefined && (
                <div style={{ fontSize: 12, color: '#b45309', fontWeight: 600, marginBottom: 4 }}>
                  ★ {infoPlace.rating.toFixed(1)}{' '}
                  {infoPlace.userRatingCount !== undefined
                    ? `(${infoPlace.userRatingCount.toLocaleString()})`
                    : ''}
                </div>
              )}
              <div style={{ fontSize: 11, color: '#475569', marginBottom: 8 }}>
                {infoPlace.formattedAddress}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => onSelectPlace(infoPlace)}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '4px 8px',
                    borderRadius: 5,
                    border: '1px solid #1d4ed8',
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    cursor: 'pointer',
                  }}
                >
                  Street View
                </button>
                {!activeStopIds[infoPlace.id] && (
                  <button
                    type="button"
                    onClick={() => {
                      onAddStop(infoPlace, activeDay);
                      setInfoPlace(null);
                    }}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '4px 8px',
                      borderRadius: 5,
                      border: `1px solid ${activeDayStyle.hex}`,
                      background: activeDayStyle.bgLight,
                      color: activeDayStyle.text,
                      cursor: 'pointer',
                    }}
                  >
                    + Add to Day {activeDay}
                  </button>
                )}
              </div>
            </div>
          </InfoWindow>
        )}
      </Map>
    </div>
  );
}
