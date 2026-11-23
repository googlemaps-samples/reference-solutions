'use client';

import React, { useEffect } from 'react';
import {
  AdvancedMarker,
  Map as GoogleMap,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { RoutePolyline } from '@/components/RoutePolyline';
import type {
  CandidateDriver,
  ComputedRouteData,
  DriverSimulationState,
  ResolvedPlace,
  RouteMode,
} from '@/types/rideshare';

interface RideshareMapProps {
  pickup: ResolvedPlace | null;
  dropoff: ResolvedPlace | null;
  fastestRoute: ComputedRouteData | null;
  ecoRoute: ComputedRouteData | null;
  selectedRouteMode: RouteMode;
  candidateDrivers: CandidateDriver[];
  simulation: DriverSimulationState;
}

function MapViewportFitter({
  pickup,
  dropoff,
  fastestRoute,
  ecoRoute,
  candidateDrivers,
}: {
  pickup: ResolvedPlace | null;
  dropoff: ResolvedPlace | null;
  fastestRoute: ComputedRouteData | null;
  ecoRoute: ComputedRouteData | null;
  candidateDrivers: CandidateDriver[];
}) {
  const map = useMap();
  const coreLib = useMapsLibrary('core');
  const geometryLib = useMapsLibrary('geometry');

  useEffect(() => {
    if (!map || !coreLib || !geometryLib) return;
    if (!pickup && !dropoff && !fastestRoute && !ecoRoute) return;

    const bounds = new coreLib.LatLngBounds();
    let hasPoint = false;

    if (pickup) {
      bounds.extend(pickup.location);
      hasPoint = true;
    }
    if (dropoff) {
      bounds.extend(dropoff.location);
      hasPoint = true;
    }

    const addPolylineToBounds = (encoded?: string) => {
      if (!encoded) return;
      const decoded = geometryLib.encoding.decodePath(encoded);
      decoded.forEach((pt) => {
        bounds.extend(pt);
        hasPoint = true;
      });
    };

    addPolylineToBounds(fastestRoute?.encodedPolyline);
    addPolylineToBounds(ecoRoute?.encodedPolyline);

    candidateDrivers.forEach((drv) => {
      bounds.extend(drv.location);
      hasPoint = true;
    });

    if (hasPoint) {
      map.fitBounds(bounds, { top: 56, right: 48, bottom: 88, left: 48 });
    }
  }, [map, coreLib, geometryLib, pickup, dropoff, fastestRoute, ecoRoute, candidateDrivers]);

  return null;
}

export function RideshareMap({
  pickup,
  dropoff,
  fastestRoute,
  ecoRoute,
  selectedRouteMode,
  candidateDrivers,
  simulation,
}: RideshareMapProps) {
  const isSameRoute =
    Boolean(fastestRoute && ecoRoute) &&
    fastestRoute?.encodedPolyline === ecoRoute?.encodedPolyline;

  const dispatchedDriverId = simulation.dispatchedDriver?.id ?? null;

  return (
    <div className="relative h-full w-full">
      <GoogleMap
        id="rideshare-map"
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
        defaultCenter={{ lat: 34.0328, lng: -118.3669 }}
        defaultZoom={12}
        gestureHandling="greedy"
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={true}
        className="h-full w-full"
      >
        <MapViewportFitter
          pickup={pickup}
          dropoff={dropoff}
          fastestRoute={fastestRoute}
          ecoRoute={ecoRoute}
          candidateDrivers={candidateDrivers}
        />

        {/* Render secondary unselected route underneath for visual comparison */}
        {!isSameRoute && fastestRoute && selectedRouteMode === 'eco' && (
          <RoutePolyline
            encodedPath={fastestRoute.encodedPolyline}
            strokeColor="#2563EB"
            strokeOpacity={0.45}
            strokeWeight={5}
            zIndex={2}
            dashed={true}
          />
        )}

        {!isSameRoute && ecoRoute && selectedRouteMode === 'fastest' && (
          <RoutePolyline
            encodedPath={ecoRoute.encodedPolyline}
            strokeColor="#059669"
            strokeOpacity={0.5}
            strokeWeight={5}
            zIndex={2}
            dashed={true}
          />
        )}

        {/* Render active selected route prominently with outer casing */}
        {selectedRouteMode === 'fastest' && fastestRoute && (
          <>
            <RoutePolyline
              encodedPath={fastestRoute.encodedPolyline}
              strokeColor="#1E3A8A"
              strokeOpacity={0.95}
              strokeWeight={8}
              zIndex={3}
            />
            <RoutePolyline
              encodedPath={fastestRoute.encodedPolyline}
              strokeColor="#3B82F6"
              strokeOpacity={1}
              strokeWeight={5}
              zIndex={4}
            />
          </>
        )}

        {selectedRouteMode === 'eco' && ecoRoute && (
          <>
            <RoutePolyline
              encodedPath={ecoRoute.encodedPolyline}
              strokeColor="#065F46"
              strokeOpacity={0.95}
              strokeWeight={8}
              zIndex={3}
            />
            <RoutePolyline
              encodedPath={ecoRoute.encodedPolyline}
              strokeColor="#10B981"
              strokeOpacity={1}
              strokeWeight={5}
              zIndex={4}
            />
          </>
        )}

        {/* Driver-to-pickup approach route */}
        {simulation.approachPolyline &&
          simulation.phase === 'EN_ROUTE_TO_PICKUP' && (
            <RoutePolyline
              encodedPath={simulation.approachPolyline}
              strokeColor="#F59E0B"
              strokeOpacity={0.95}
              strokeWeight={4}
              zIndex={5}
              dashed={true}
            />
          )}

        {/* Pickup AdvancedMarker */}
        {pickup && (
          <AdvancedMarker
            position={pickup.location}
            zIndex={30}
            title={`Pickup: ${pickup.name}`}
          >
            <div className="flex flex-col items-center">
              <div className="mb-1 flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow-md backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="max-w-[150px] truncate">{pickup.name}</span>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-xs font-bold text-white shadow-lg">
                A
              </div>
            </div>
          </AdvancedMarker>
        )}

        {/* Drop-off AdvancedMarker */}
        {dropoff && (
          <AdvancedMarker
            position={dropoff.location}
            zIndex={30}
            title={`Drop-off: ${dropoff.name}`}
          >
            <div className="flex flex-col items-center">
              <div className="mb-1 flex items-center gap-1.5 rounded-full border border-rose-200 bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow-md backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="max-w-[150px] truncate">{dropoff.name}</span>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-rose-600 text-xs font-bold text-white shadow-lg">
                B
              </div>
            </div>
          </AdvancedMarker>
        )}

        {/* Idle candidate drivers */}
        {candidateDrivers
          .filter((drv) => drv.id !== dispatchedDriverId)
          .map((drv) => (
            <AdvancedMarker
              key={drv.id}
              position={drv.location}
              zIndex={15}
              title={`${drv.name} · ${drv.vehicleModel}`}
            >
              <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 px-2 py-1 text-[10px] font-semibold text-slate-700 shadow-md">
                <span className="inline-block h-2 w-2 rounded-full bg-slate-400" />
                <span>{drv.name}</span>
              </div>
            </AdvancedMarker>
          ))}

        {/* Live Dispatched Driver Animated AdvancedMarker */}
        {simulation.dispatchedDriver && simulation.currentPosition && (
          <AdvancedMarker
            position={simulation.currentPosition}
            zIndex={50}
            title={`Live Driver: ${simulation.dispatchedDriver.name} (${simulation.dispatchedDriver.vehicleModel})`}
          >
            <div className="flex flex-col items-center">
              <div className="mb-1 flex items-center gap-1.5 rounded-full border border-amber-300 bg-slate-900 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-lg">
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                <span>{simulation.dispatchedDriver.name}</span>
              </div>
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-slate-900 shadow-xl transition-transform duration-75"
                style={{
                  transform: `rotate(${Math.round(simulation.heading)}deg)`,
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M12 2L17 10V19C17 20.1 16.1 21 15 21H9C7.9 21 7 20.1 7 19V10L12 2Z"
                    fill="#34D399"
                  />
                  <path
                    d="M9 11H15L14 7.5H10L9 11Z"
                    fill="#0F172A"
                  />
                </svg>
              </div>
            </div>
          </AdvancedMarker>
        )}
      </GoogleMap>

      {/* Floating Map Route Legend */}
      <div
        data-testid="map-route-legend"
        className="pointer-events-auto absolute bottom-4 left-4 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/90 bg-white/95 px-3.5 py-2.5 text-xs font-medium text-slate-700 shadow-lg backdrop-blur-md"
      >
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-5 rounded-full bg-blue-600" />
          <span>Fastest (Traffic-Aware)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-5 rounded-full bg-emerald-600" />
          <span>Eco-Friendly</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-amber-500" />
          <span>Driver Pickup Approach</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-[9px] font-bold text-emerald-400">
            ●
          </span>
          <span>Live Driver</span>
        </div>
      </div>
    </div>
  );
}
