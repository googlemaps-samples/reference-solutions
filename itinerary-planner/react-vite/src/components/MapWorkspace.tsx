import { useEffect, useRef } from 'react';
import {
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useMap,
} from '@vis.gl/react-google-maps';
import { Star } from 'lucide-react';
import { DAY_COLORS } from '../constants/destinations';
import type { ItineraryDay, LatLngPoint, PlaceItem } from '../types/itinerary';

interface MapWorkspaceProps {
  center: LatLngPoint;
  zoom: number;
  activeDay: ItineraryDay;
  activeStops: PlaceItem[];
  otherDayStops: PlaceItem[];
  routes: google.maps.routes.Route[];
  selectedPlace: PlaceItem | null;
  infoWindowOpen: boolean;
  onSelectPlace: (place: PlaceItem, openInfo?: boolean) => void;
  onCloseInfoWindow: () => void;
}

function MapViewportAndRouteOverlay({
  center,
  zoom,
  activeDay,
  activeStops,
  routes,
  selectedPlace,
}: {
  center: LatLngPoint;
  zoom: number;
  activeDay: ItineraryDay;
  activeStops: PlaceItem[];
  routes: google.maps.routes.Route[];
  selectedPlace: PlaceItem | null;
}) {
  const map = useMap();
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  // Pan/zoom smoothly when destination changes
  useEffect(() => {
    if (!map) return;
    map.setCenter(center);
    map.setZoom(zoom);
  }, [map, center.lat, center.lng, zoom]);

  // Fit bounds to active day's stops when switching day or updating stops
  useEffect(() => {
    if (!map || activeStops.length === 0) return;

    if (activeStops.length === 1) {
      map.panTo(activeStops[0].location);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    for (const stop of activeStops) {
      bounds.extend(stop.location);
    }
    map.fitBounds(bounds, { top: 64, right: 48, bottom: 48, left: 48 });
  }, [map, activeDay, activeStops]);

  // Pan smoothly to inspected place if user clicks a discovery card outside current bounds
  useEffect(() => {
    if (!map || !selectedPlace) return;
    map.panTo(selectedPlace.location);
  }, [map, selectedPlace]);

  // Render Routes API polylines via Route.createPolylines()
  useEffect(() => {
    for (const poly of polylinesRef.current) {
      poly.setMap(null);
    }
    polylinesRef.current = [];

    if (!map || routes.length === 0) return;

    const strokeColor = DAY_COLORS[activeDay].hex;
    const created: google.maps.Polyline[] = [];

    for (const route of routes) {
      try {
        const routePolylines = route.createPolylines({
          polylineOptions: {
            strokeColor,
            strokeOpacity: 0.9,
            strokeWeight: 5,
          },
        });
        for (const poly of routePolylines) {
          poly.setMap(map);
          created.push(poly);
        }
      } catch {
        if (route.path && route.path.length > 1) {
          const fallbackPoly = new google.maps.Polyline({
            path: route.path,
            strokeColor,
            strokeOpacity: 0.9,
            strokeWeight: 5,
            map,
          });
          created.push(fallbackPoly);
        }
      }
    }

    polylinesRef.current = created;

    return () => {
      for (const poly of created) {
        poly.setMap(null);
      }
      polylinesRef.current = [];
    };
  }, [map, routes, activeDay]);

  return null;
}

export function MapWorkspace({
  center,
  zoom,
  activeDay,
  activeStops,
  otherDayStops,
  routes,
  selectedPlace,
  infoWindowOpen,
  onSelectPlace,
  onCloseInfoWindow,
}: MapWorkspaceProps) {
  const activeColor = DAY_COLORS[activeDay].hex;
  const otherDay: ItineraryDay = activeDay === 1 ? 2 : 1;
  const otherColor = DAY_COLORS[otherDay].hex;

  const activeIds = new Set(activeStops.map((s) => s.id));
  const otherIds = new Set(otherDayStops.map((s) => s.id));
  const showStandaloneSelectedPin =
    selectedPlace !== null &&
    !activeIds.has(selectedPlace.id) &&
    !otherIds.has(selectedPlace.id);

  return (
    <div data-testid="map-container" className="map-container-wrap">
      <div className="map-legend-overlay">
        <span>
          <span
            className="legend-dot"
            style={{ backgroundColor: activeColor }}
          />
          Day {activeDay} Route ({activeStops.length})
        </span>
        {otherDayStops.length > 0 && (
          <span style={{ opacity: 0.72 }}>
            <span
              className="legend-dot"
              style={{ backgroundColor: otherColor }}
            />
            Day {otherDay} ({otherDayStops.length})
          </span>
        )}
      </div>

      <GoogleMap
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
        defaultCenter={center}
        defaultZoom={zoom}
        gestureHandling="greedy"
        mapTypeControl={false}
        streetViewControl={true}
        fullscreenControl={true}
        style={{ width: '100%', height: '100%' }}
      >
        <MapViewportAndRouteOverlay
          center={center}
          zoom={zoom}
          activeDay={activeDay}
          activeStops={activeStops}
          routes={routes}
          selectedPlace={selectedPlace}
        />

        {/* Secondary muted pins for the inactive itinerary day */}
        {otherDayStops
          .filter((stop) => !activeIds.has(stop.id))
          .map((stop, idx) => (
            <AdvancedMarker
              key={`other-${otherDay}-${stop.id}`}
              position={stop.location}
              title={`Day ${otherDay} · Stop ${idx + 1}: ${stop.displayName}`}
              zIndex={10 + idx}
              onClick={() => onSelectPlace(stop, true)}
            >
              <Pin
                background={otherColor}
                borderColor="#ffffff"
                glyphColor="#ffffff"
                glyphText={String(idx + 1)}
                scale={0.85}
              />
            </AdvancedMarker>
          ))}

        {/* Primary numbered day-colored Advanced Markers for the active day */}
        {activeStops.map((stop, idx) => {
          const isSelected = selectedPlace?.id === stop.id;
          return (
            <AdvancedMarker
              key={`active-${activeDay}-${stop.id}`}
              position={stop.location}
              title={`Day ${activeDay} · Stop ${idx + 1}: ${stop.displayName}`}
              zIndex={100 + idx + (isSelected ? 50 : 0)}
              onClick={() => onSelectPlace(stop, true)}
            >
              <Pin
                background={activeColor}
                borderColor="#ffffff"
                glyphColor="#ffffff"
                glyphText={String(idx + 1)}
                scale={isSelected ? 1.25 : 1.1}
              />
            </AdvancedMarker>
          );
        })}

        {/* Selected discovery place pin when not already in Day 1 / Day 2 */}
        {showStandaloneSelectedPin && selectedPlace && (
          <AdvancedMarker
            key={`selected-${selectedPlace.id}`}
            position={selectedPlace.location}
            title={selectedPlace.displayName}
            zIndex={200}
            onClick={() => onSelectPlace(selectedPlace, true)}
          >
            <Pin
              background="#4f46e5"
              borderColor="#ffffff"
              glyphColor="#ffffff"
              glyphText="★"
              scale={1.15}
            />
          </AdvancedMarker>
        )}

        {infoWindowOpen && selectedPlace && (
          <InfoWindow
            position={selectedPlace.location}
            pixelOffset={[0, -34]}
            onCloseClick={onCloseInfoWindow}
          >
            <div className="map-infowindow">
              {selectedPlace.photoUrl && (
                <img
                  src={selectedPlace.photoUrl}
                  alt={selectedPlace.displayName}
                />
              )}
              <h4>{selectedPlace.displayName}</h4>
              {selectedPlace.rating !== null && (
                <p>
                  <Star
                    size={11}
                    fill="#d97706"
                    color="#d97706"
                    style={{ verticalAlign: '-1px', marginRight: 3 }}
                  />
                  <strong>{selectedPlace.rating.toFixed(1)}</strong>
                  {selectedPlace.userRatingCount !== null
                    ? ` (${selectedPlace.userRatingCount.toLocaleString()})`
                    : ''}
                  {selectedPlace.primaryTypeDisplayName
                    ? ` · ${selectedPlace.primaryTypeDisplayName}`
                    : ''}
                </p>
              )}
              {selectedPlace.formattedAddress && (
                <p>{selectedPlace.formattedAddress}</p>
              )}
              <button
                type="button"
                className="infowindow-btn"
                onClick={() => onSelectPlace(selectedPlace, true)}
              >
                Focused in Street View
              </button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
