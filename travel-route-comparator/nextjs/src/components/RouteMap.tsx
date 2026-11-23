'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import {
  AdvancedMarker,
  Map as GoogleMap,
  Pin,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { Bike, Compass, Maximize2 } from 'lucide-react';
import { decodePolyline, haversineMeters } from '@/lib/polyline';
import type {
  ComputedRoute,
  ElevationSamplePoint,
  PlaceEndpoint,
  TravelMode,
} from '@/types/travel';

interface RouteMapProps {
  origin: PlaceEndpoint | null;
  destination: PlaceEndpoint | null;
  activeMode: TravelMode;
  routes: ComputedRoute[];
  selectedRouteIndex: number;
  elevationPoints: ElevationSamplePoint[];
  hoveredPointIndex: number | null;
  onSelectRoute: (index: number) => void;
  onHoverPointIndex: (index: number | null) => void;
}

const DENVER_BOULDER_CENTER = { lat: 39.884, lng: -105.135 };

function RoutePolylinesAndLayers({
  origin,
  destination,
  activeMode,
  routes,
  selectedRouteIndex,
  elevationPoints,
  onSelectRoute,
  onHoverPointIndex,
  fitTrigger,
}: {
  origin: PlaceEndpoint | null;
  destination: PlaceEndpoint | null;
  activeMode: TravelMode;
  routes: ComputedRoute[];
  selectedRouteIndex: number;
  elevationPoints: ElevationSamplePoint[];
  onSelectRoute: (index: number) => void;
  onHoverPointIndex: (index: number | null) => void;
  fitTrigger: number;
}) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const coreLib = useMapsLibrary('core');

  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const bicyclingLayerRef = useRef<google.maps.BicyclingLayer | null>(null);
  const elevationRef = useRef(elevationPoints);
  const onSelectRef = useRef(onSelectRoute);
  const onHoverRef = useRef(onHoverPointIndex);

  useEffect(() => {
    elevationRef.current = elevationPoints;
  }, [elevationPoints]);

  useEffect(() => {
    onSelectRef.current = onSelectRoute;
    onHoverRef.current = onHoverPointIndex;
  }, [onSelectRoute, onHoverPointIndex]);

  // Toggle BicyclingLayer when Cycling mode is active
  useEffect(() => {
    if (!map || !mapsLib) return;

    if (!bicyclingLayerRef.current) {
      bicyclingLayerRef.current = new mapsLib.BicyclingLayer();
    }

    if (activeMode === 'BICYCLE') {
      bicyclingLayerRef.current.setMap(map);
    } else {
      bicyclingLayerRef.current.setMap(null);
    }

    return () => {
      bicyclingLayerRef.current?.setMap(null);
    };
  }, [map, mapsLib, activeMode]);

  // Render route polylines (alternatives underneath, active route with crisp casing on top)
  useEffect(() => {
    if (!map || !mapsLib) return;

    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    const ordered = [...routes].sort((a, b) => {
      if (a.index === selectedRouteIndex) return 1;
      if (b.index === selectedRouteIndex) return -1;
      return a.index - b.index;
    });

    const created: google.maps.Polyline[] = [];

    for (const route of ordered) {
      if (!route.encodedPolyline) continue;
      const path = decodePolyline(route.encodedPolyline);
      if (path.length === 0) continue;

      const isActive = route.index === selectedRouteIndex;

      if (isActive) {
        const casing = new mapsLib.Polyline({
          path,
          map,
          strokeColor: '#ffffff',
          strokeOpacity: 0.9,
          strokeWeight: 10,
          zIndex: 25,
          clickable: false,
        });
        created.push(casing);
      }

      const line = new mapsLib.Polyline({
        path,
        map,
        strokeColor: route.color,
        strokeOpacity: isActive ? 0.96 : 0.55,
        strokeWeight: isActive ? 6 : 4,
        zIndex: isActive ? 30 : 12 + route.index,
        clickable: true,
      });

      line.addListener('click', () => {
        onSelectRef.current(route.index);
      });

      if (isActive) {
        line.addListener('mousemove', (e: google.maps.MapMouseEvent) => {
          const pts = elevationRef.current;
          if (!e.latLng || pts.length === 0) return;
          const target = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          let bestIdx = 0;
          let bestDist = Number.POSITIVE_INFINITY;
          for (let i = 0; i < pts.length; i++) {
            const d = haversineMeters(target, {
              lat: pts[i].lat,
              lng: pts[i].lng,
            });
            if (d < bestDist) {
              bestDist = d;
              bestIdx = i;
            }
          }
          onHoverRef.current(bestIdx);
        });

        line.addListener('mouseout', () => {
          onHoverRef.current(null);
        });
      }

      created.push(line);
    }

    polylinesRef.current = created;

    return () => {
      created.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [map, mapsLib, routes, selectedRouteIndex]);

  // Fit bounds when routes, endpoints, or manual fit trigger change
  useEffect(() => {
    if (!map || !coreLib) return;

    const activeRoute =
      routes.find((r) => r.index === selectedRouteIndex) || routes[0];
    const bounds = new coreLib.LatLngBounds();
    let hasPoint = false;

    if (activeRoute?.encodedPolyline) {
      const pts = decodePolyline(activeRoute.encodedPolyline);
      for (const pt of pts) {
        bounds.extend(pt);
        hasPoint = true;
      }
    }

    if (origin?.location) {
      bounds.extend(origin.location);
      hasPoint = true;
    }
    if (destination?.location) {
      bounds.extend(destination.location);
      hasPoint = true;
    }

    if (hasPoint) {
      map.fitBounds(bounds, { top: 56, right: 56, bottom: 56, left: 56 });
    }
  }, [map, coreLib, origin, destination, routes, selectedRouteIndex, fitTrigger]);

  return null;
}

export default function RouteMap({
  origin,
  destination,
  activeMode,
  routes,
  selectedRouteIndex,
  elevationPoints,
  hoveredPointIndex,
  onSelectRoute,
  onHoverPointIndex,
}: RouteMapProps) {
  const [fitTrigger, setFitTrigger] = React.useState(0);

  const handleFitRoute = useCallback(() => {
    setFitTrigger((n) => n + 1);
  }, []);

  const hoveredPoint =
    hoveredPointIndex !== null && elevationPoints[hoveredPointIndex]
      ? elevationPoints[hoveredPointIndex]
      : null;

  return (
    <div
      id="map-canvas"
      data-testid="map-canvas"
      className="relative w-full flex-1 min-h-[520px] overflow-hidden bg-slate-200"
    >
      <GoogleMap
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
        defaultCenter={DENVER_BOULDER_CENTER}
        defaultZoom={11}
        gestureHandling="greedy"
        mapTypeControl={true}
        streetViewControl={false}
        fullscreenControl={false}
        className="h-full w-full min-h-[520px]"
      >
        <RoutePolylinesAndLayers
          origin={origin}
          destination={destination}
          activeMode={activeMode}
          routes={routes}
          selectedRouteIndex={selectedRouteIndex}
          elevationPoints={elevationPoints}
          onSelectRoute={onSelectRoute}
          onHoverPointIndex={onHoverPointIndex}
          fitTrigger={fitTrigger}
        />

        {origin && (
          <AdvancedMarker
            position={origin.location}
            title={`Origin: ${origin.displayName}`}
            zIndex={40}
          >
            <Pin
              background="#0f766e"
              borderColor="#ffffff"
              glyphColor="#ffffff"
              glyphText="A"
            />
          </AdvancedMarker>
        )}

        {destination && (
          <AdvancedMarker
            position={destination.location}
            title={`Destination: ${destination.displayName}`}
            zIndex={40}
          >
            <Pin
              background="#dc2626"
              borderColor="#ffffff"
              glyphColor="#ffffff"
              glyphText="B"
            />
          </AdvancedMarker>
        )}

        {hoveredPoint && (
          <AdvancedMarker
            position={{ lat: hoveredPoint.lat, lng: hoveredPoint.lng }}
            title={`Elevation: ${Math.round(hoveredPoint.elevationFeet)} ft`}
            zIndex={60}
          >
            <div className="pointer-events-none relative flex flex-col items-center">
              <div className="mb-1.5 whitespace-nowrap rounded-full bg-slate-900/95 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-md ring-1 ring-white/20 tabular-nums">
                {Math.round(hoveredPoint.elevationFeet).toLocaleString()} ft ·{' '}
                {hoveredPoint.gradePercent >= 0 ? '+' : ''}
                {hoveredPoint.gradePercent.toFixed(1)}%
              </div>
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/25">
                <div className="h-3 w-3 rounded-full border-2 border-white bg-amber-500 shadow" />
              </div>
            </div>
          </AdvancedMarker>
        )}
      </GoogleMap>

      {/* Top-right floating map controls & legend */}
      <div className="pointer-events-none absolute right-3 top-3 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={handleFitRoute}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-teal-700"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          Fit Route
        </button>

        {activeMode === 'BICYCLE' && (
          <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/95 px-2.5 py-1 text-[11px] font-medium text-emerald-800 shadow-sm backdrop-blur">
            <Bike className="h-3.5 w-3.5" />
            Bike Lanes & Trails Active
          </div>
        )}
      </div>

      {/* Bottom-left route color legend */}
      {routes.length > 0 && (
        <div className="pointer-events-auto absolute bottom-3 left-3 flex flex-wrap items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white/95 px-3 py-1.5 text-[11px] text-slate-700 shadow-sm backdrop-blur">
          <span className="inline-flex items-center gap-1 font-semibold text-slate-500">
            <Compass className="h-3 w-3" />
            Routes:
          </span>
          {routes.map((r) => {
            const isActive = r.index === selectedRouteIndex;
            const isEco = r.routeLabels.includes('FUEL_EFFICIENT');
            return (
              <button
                key={r.index}
                type="button"
                onClick={() => onSelectRoute(r.index)}
                className={`inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition ${
                  isActive
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: r.color }}
                />
                <span>
                  {isEco
                    ? 'Eco'
                    : r.index === 0
                      ? 'Primary'
                      : `Alt ${r.index}`}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
