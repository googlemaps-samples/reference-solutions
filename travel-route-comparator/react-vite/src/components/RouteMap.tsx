import { useEffect, useRef } from 'react';
import {
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import type {
  ComputedRouteOption,
  ElevationPoint,
  PlacePoint,
  TravelModeId,
} from '../types/routing';
import { DENVER_BOULDER_CENTER } from '../utils/geo';

interface RouteMapProps {
  origin: PlacePoint | null;
  destination: PlacePoint | null;
  activeMode: TravelModeId;
  routes: ComputedRouteOption[];
  selectedRouteIndex: number;
  hoveredElevationPoint: ElevationPoint | null;
  onSelectRoute: (index: number) => void;
}

function RouteOverlays({
  origin,
  destination,
  activeMode,
  routes,
  selectedRouteIndex,
  onSelectRoute,
}: Omit<RouteMapProps, 'hoveredElevationPoint'>) {
  const map = useMap();
  const coreLib = useMapsLibrary('core');
  const mapsLib = useMapsLibrary('maps');
  const onSelectRef = useRef(onSelectRoute);
  onSelectRef.current = onSelectRoute;

  // Toggle Google BicyclingLayer when Cycling mode is active
  useEffect(() => {
    if (!map || !mapsLib) return;
    if (activeMode !== 'BICYCLING') return;

    const bikeLayer = new mapsLib.BicyclingLayer();
    bikeLayer.setMap(map);

    return () => {
      bikeLayer.setMap(null);
    };
  }, [map, mapsLib, activeMode]);

  // Render comparative route polylines (inactive underneath, active on top with casing)
  useEffect(() => {
    if (!map || !mapsLib) return;

    const createdPolylines: google.maps.Polyline[] = [];
    const listeners: google.maps.MapsEventListener[] = [];

    // Draw inactive alternatives first
    routes.forEach((route, idx) => {
      if (idx === selectedRouteIndex || route.path.length < 2) return;

      const altLine = new mapsLib.Polyline({
        path: route.path,
        strokeColor: route.color,
        strokeOpacity: 0.45,
        strokeWeight: 5,
        zIndex: 10 + idx,
        clickable: true,
        map,
      });

      const listener = altLine.addListener('click', () => {
        onSelectRef.current(idx);
      });
      createdPolylines.push(altLine);
      listeners.push(listener);
    });

    // Draw active route casing + main stroke on top
    const activeRoute = routes[selectedRouteIndex] ?? routes[0];
    if (activeRoute && activeRoute.path.length >= 2) {
      const casing = new mapsLib.Polyline({
        path: activeRoute.path,
        strokeColor: '#0f172a',
        strokeOpacity: 0.25,
        strokeWeight: 10,
        zIndex: 49,
        clickable: false,
        map,
      });

      const primary = new mapsLib.Polyline({
        path: activeRoute.path,
        strokeColor: activeRoute.color,
        strokeOpacity: 0.96,
        strokeWeight: 6,
        zIndex: 50,
        clickable: false,
        map,
      });

      createdPolylines.push(casing, primary);
    }

    return () => {
      listeners.forEach((l) => l.remove());
      createdPolylines.forEach((p) => p.setMap(null));
    };
  }, [map, mapsLib, routes, selectedRouteIndex]);

  // Fit viewport bounds to active route and endpoints
  useEffect(() => {
    if (!map || !coreLib) return;
    if (!origin && !destination && routes.length === 0) return;

    const bounds = new coreLib.LatLngBounds();
    let hasPoint = false;

    if (origin) {
      bounds.extend(origin.location);
      hasPoint = true;
    }
    if (destination) {
      bounds.extend(destination.location);
      hasPoint = true;
    }

    const activeRoute = routes[selectedRouteIndex] ?? routes[0];
    if (activeRoute && activeRoute.path.length > 0) {
      // Sample points to avoid excessive loop work on very dense paths
      const step = Math.max(1, Math.floor(activeRoute.path.length / 80));
      for (let i = 0; i < activeRoute.path.length; i += step) {
        bounds.extend(activeRoute.path[i]);
        hasPoint = true;
      }
      bounds.extend(activeRoute.path[activeRoute.path.length - 1]);
    }

    if (hasPoint) {
      map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
    }
  }, [map, coreLib, origin, destination, routes, selectedRouteIndex]);

  return null;
}

export function RouteMap({
  origin,
  destination,
  activeMode,
  routes,
  selectedRouteIndex,
  hoveredElevationPoint,
  onSelectRoute,
}: RouteMapProps) {
  return (
    <div id="map-canvas" className="map-canvas-wrapper" data-testid="map-canvas">
      <GoogleMap
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
        defaultCenter={DENVER_BOULDER_CENTER}
        defaultZoom={11}
        gestureHandling="greedy"
        mapTypeControl={true}
        streetViewControl={false}
        fullscreenControl={true}
        className="google-map-root"
      >
        <RouteOverlays
          origin={origin}
          destination={destination}
          activeMode={activeMode}
          routes={routes}
          selectedRouteIndex={selectedRouteIndex}
          onSelectRoute={onSelectRoute}
        />

        {origin && (
          <AdvancedMarker
            position={origin.location}
            title={`Origin: ${origin.name}`}
            zIndex={100}
          >
            <Pin
              background="#0f766e"
              borderColor="#134e4a"
              glyphColor="#ffffff"
              glyphText="A"
            />
          </AdvancedMarker>
        )}

        {destination && (
          <AdvancedMarker
            position={destination.location}
            title={`Destination: ${destination.name}`}
            zIndex={100}
          >
            <Pin
              background="#be123c"
              borderColor="#881337"
              glyphColor="#ffffff"
              glyphText="B"
            />
          </AdvancedMarker>
        )}

        {hoveredElevationPoint && (
          <AdvancedMarker
            position={hoveredElevationPoint.location}
            title={`Elevation: ${Math.round(hoveredElevationPoint.elevationMeters)} m`}
            zIndex={999}
          >
            <div className="elevation-map-marker">
              <div className="elevation-map-badge">
                <span>{Math.round(hoveredElevationPoint.elevationMeters)} m</span>
                <span className="elevation-map-grade">
                  {hoveredElevationPoint.gradePercent >= 0 ? '+' : ''}
                  {hoveredElevationPoint.gradePercent.toFixed(1)}%
                </span>
              </div>
              <div className="elevation-map-dot" />
            </div>
          </AdvancedMarker>
        )}
      </GoogleMap>
    </div>
  );
}
