'use client';

import React, { useEffect, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
} from 'terra-draw';
import { TerraDrawGoogleMapsAdapter } from 'terra-draw-google-maps-adapter';

export type DrawToolMode = 'static' | 'polygon' | 'select';

interface TerraDrawControllerProps {
  activeMode: DrawToolMode;
  clearTrigger: number;
  onPolygonChange: (ring: [number, number][] | null) => void;
  onReadyChange?: (ready: boolean) => void;
}

export const TerraDrawController: React.FC<TerraDrawControllerProps> = ({
  activeMode,
  clearTrigger,
  onPolygonChange,
  onReadyChange,
}) => {
  const map = useMap();
  const drawRef = useRef<TerraDraw | null>(null);
  const isReadyRef = useRef(false);
  const activeModeRef = useRef<DrawToolMode>(activeMode);
  activeModeRef.current = activeMode;

  const onPolygonChangeRef = useRef(onPolygonChange);
  onPolygonChangeRef.current = onPolygonChange;

  const onReadyChangeRef = useRef(onReadyChange);
  onReadyChangeRef.current = onReadyChange;

  const extractLatestPolygonRing = (draw: TerraDraw): [number, number][] | null => {
    try {
      const snapshot = draw.getSnapshot();
      const polygons = snapshot.filter(
        (feature) =>
          feature.geometry?.type === 'Polygon' &&
          !feature.properties?.midPoint &&
          !feature.properties?.selectionPoint &&
          Array.isArray(feature.geometry.coordinates?.[0]) &&
          feature.geometry.coordinates[0].length >= 4
      );
      if (polygons.length === 0) return null;
      const latest = polygons[polygons.length - 1];
      const coords = latest.geometry.coordinates[0] as [number, number][];
      return coords;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (!map || drawRef.current) return;

    let cancelled = false;
    let projectionListener: google.maps.MapsEventListener | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const initializeTerraDraw = () => {
      if (cancelled || drawRef.current) return;

      try {
        const instance = new TerraDraw({
          adapter: new TerraDrawGoogleMapsAdapter({
            map,
            lib: google.maps,
            coordinatePrecision: 9,
          }),
          modes: [
            new TerraDrawPolygonMode({
              editable: true,
              styles: {
                fillColor: '#38bdf8',
                fillOpacity: 0.24,
                outlineColor: '#0284c7',
                outlineWidth: 2.5,
                closingPointColor: '#ffffff',
                closingPointOutlineColor: '#0284c7',
              },
            }),
            new TerraDrawSelectMode({
              flags: {
                polygon: {
                  feature: {
                    draggable: true,
                    rotateable: true,
                    coordinates: {
                      midpoints: true,
                      draggable: true,
                      deletable: true,
                    },
                  },
                },
              },
            }),
          ],
        });

        instance.on('ready', () => {
          if (cancelled) return;
          isReadyRef.current = true;
          onReadyChangeRef.current?.(true);
          try {
            instance.setMode(activeModeRef.current);
          } catch {
            // Mode sync fallback
          }
        });

        instance.on('finish', () => {
          const ring = extractLatestPolygonRing(instance);
          if (ring) {
            onPolygonChangeRef.current(ring);
          }
        });

        instance.on('change', () => {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            const ring = extractLatestPolygonRing(instance);
            onPolygonChangeRef.current(ring);
          }, 150);
        });

        instance.start();
        drawRef.current = instance;
      } catch {
        onReadyChangeRef.current?.(false);
      }
    };

    if (map.getProjection()) {
      initializeTerraDraw();
    } else {
      projectionListener = map.addListener('projection_changed', () => {
        if (!map.getProjection()) return;
        projectionListener?.remove();
        projectionListener = null;
        initializeTerraDraw();
      });
    }

    return () => {
      cancelled = true;
      projectionListener?.remove();
      if (debounceTimer) clearTimeout(debounceTimer);
      isReadyRef.current = false;
      if (drawRef.current) {
        try {
          drawRef.current.stop();
        } catch {
          // Ignore teardown errors
        }
        drawRef.current = null;
      }
    };
  }, [map]);

  useEffect(() => {
    const draw = drawRef.current;
    if (!draw || !isReadyRef.current) return;
    try {
      draw.setMode(activeMode);
    } catch {
      // Ignore if TerraDraw is transitioning
    }
  }, [activeMode]);

  useEffect(() => {
    if (clearTrigger === 0) return;
    const draw = drawRef.current;
    if (!draw || !isReadyRef.current) return;
    try {
      draw.clear();
      draw.setMode('static');
      onPolygonChangeRef.current(null);
    } catch {
      // Ignore clear error
    }
  }, [clearTrigger]);

  return null;
};
