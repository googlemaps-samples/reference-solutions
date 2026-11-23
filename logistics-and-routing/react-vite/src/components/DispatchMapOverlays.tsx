import { useEffect, useRef } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import type { LatLngPoint } from '../types/logistics';

interface DispatchMapOverlaysProps {
  trafficEnabled: boolean;
  showRoadSnapComparison: boolean;
  rawTracePath: LatLngPoint[];
  snappedTracePath: LatLngPoint[];
  dispatchRoutePath: LatLngPoint[];
  fitBoundsTrigger: number;
}

export function DispatchMapOverlays({
  trafficEnabled,
  showRoadSnapComparison,
  rawTracePath,
  snappedTracePath,
  dispatchRoutePath,
  fitBoundsTrigger,
}: DispatchMapOverlaysProps) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const coreLib = useMapsLibrary('core');

  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const rawPolylineRef = useRef<google.maps.Polyline | null>(null);
  const snappedPolylineRef = useRef<google.maps.Polyline | null>(null);
  const dispatchPolylineRef = useRef<google.maps.Polyline | null>(null);
  const rawBreadcrumbDotsRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || !mapsLib) return;
    if (!trafficLayerRef.current) {
      trafficLayerRef.current = new mapsLib.TrafficLayer();
    }
    trafficLayerRef.current.setMap(trafficEnabled ? map : null);

    return () => {
      trafficLayerRef.current?.setMap(null);
    };
  }, [map, mapsLib, trafficEnabled]);

  useEffect(() => {
    if (!map || !mapsLib) return;

    dispatchPolylineRef.current?.setMap(null);
    if (dispatchRoutePath.length > 1) {
      dispatchPolylineRef.current = new mapsLib.Polyline({
        map,
        path: dispatchRoutePath,
        geodesic: true,
        strokeColor: '#4f46e5',
        strokeOpacity: 0.85,
        strokeWeight: 5,
        zIndex: 10,
        icons: [
          {
            icon: {
              path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 2.5,
              strokeColor: '#ffffff',
              fillColor: '#4f46e5',
              fillOpacity: 1,
            },
            offset: '48px',
            repeat: '140px',
          },
        ],
      });
    }

    return () => {
      dispatchPolylineRef.current?.setMap(null);
    };
  }, [map, mapsLib, dispatchRoutePath]);

  useEffect(() => {
    if (!map || !mapsLib) return;

    rawPolylineRef.current?.setMap(null);
    rawBreadcrumbDotsRef.current?.setMap(null);
    snappedPolylineRef.current?.setMap(null);

    if (showRoadSnapComparison) {
      if (rawTracePath.length > 1) {
        rawPolylineRef.current = new mapsLib.Polyline({
          map,
          path: rawTracePath,
          strokeColor: '#f97316',
          strokeOpacity: 0,
          strokeWeight: 2,
          zIndex: 20,
          icons: [
            {
              icon: {
                path: 'M 0,-1 0,1',
                strokeOpacity: 0.95,
                strokeWeight: 2.5,
                scale: 3,
              },
              offset: '0',
              repeat: '12px',
            },
          ],
        });

        rawBreadcrumbDotsRef.current = new mapsLib.Polyline({
          map,
          path: rawTracePath,
          strokeOpacity: 0,
          zIndex: 21,
          icons: rawTracePath.map((_, idx) => ({
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 3.5,
              fillColor: '#f97316',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 1.5,
            },
            offset: `${(idx / Math.max(1, rawTracePath.length - 1)) * 100}%`,
          })),
        });
      }

      if (snappedTracePath.length > 1) {
        snappedPolylineRef.current = new mapsLib.Polyline({
          map,
          path: snappedTracePath,
          strokeColor: '#06b6d4',
          strokeOpacity: 0.95,
          strokeWeight: 4.5,
          zIndex: 25,
        });
      }
    }

    return () => {
      rawPolylineRef.current?.setMap(null);
      rawBreadcrumbDotsRef.current?.setMap(null);
      snappedPolylineRef.current?.setMap(null);
    };
  }, [map, mapsLib, showRoadSnapComparison, rawTracePath, snappedTracePath]);

  useEffect(() => {
    if (!map || !coreLib || fitBoundsTrigger === 0) return;

    const allPoints = [
      ...dispatchRoutePath,
      ...(showRoadSnapComparison ? rawTracePath : []),
      ...(showRoadSnapComparison ? snappedTracePath : []),
    ];

    if (allPoints.length < 2) return;

    const bounds = new coreLib.LatLngBounds();
    for (const pt of allPoints) {
      bounds.extend(pt);
    }
    map.fitBounds(bounds, { top: 48, right: 48, bottom: 84, left: 48 });
  }, [
    map,
    coreLib,
    fitBoundsTrigger,
    dispatchRoutePath,
    rawTracePath,
    snappedTracePath,
    showRoadSnapComparison,
  ]);

  return null;
}
