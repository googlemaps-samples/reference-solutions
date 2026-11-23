import React, { useEffect, useRef } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawRenderMode,
  TerraDrawSelectMode,
  type GeoJSONStoreFeatures
} from 'terra-draw';
import { TerraDrawGoogleMapsAdapter } from 'terra-draw-google-maps-adapter';
import type { TerraDrawToolMode } from '../types/gis';

interface TerraDrawControllerProps {
  activeMode: TerraDrawToolMode;
  clearSignal: number;
  onPolygonsChange: (rings: [number, number][][]) => void;
  onModeAutoSwitch?: (mode: TerraDrawToolMode) => void;
}

function extractPolygonRings(snapshot: GeoJSONStoreFeatures[]): [number, number][][] {
  const rings: [number, number][][] = [];
  for (const feature of snapshot) {
    if (
      feature.geometry.type === 'Polygon' &&
      Array.isArray(feature.geometry.coordinates) &&
      feature.geometry.coordinates.length > 0
    ) {
      const outerRing = feature.geometry.coordinates[0] as [number, number][];
      if (outerRing.length >= 4) {
        rings.push(outerRing);
      }
    }
  }
  return rings;
}

export const TerraDrawController: React.FC<TerraDrawControllerProps> = ({
  activeMode,
  clearSignal,
  onPolygonsChange,
  onModeAutoSwitch
}) => {
  const map = useMap();
  const mapsLibrary = useMapsLibrary('maps');
  const drawRef = useRef<TerraDraw | null>(null);
  const activeModeRef = useRef<TerraDrawToolMode>(activeMode);
  const onPolygonsChangeRef = useRef(onPolygonsChange);
  const onModeAutoSwitchRef = useRef(onModeAutoSwitch);

  activeModeRef.current = activeMode;
  onPolygonsChangeRef.current = onPolygonsChange;
  onModeAutoSwitchRef.current = onModeAutoSwitch;

  useEffect(() => {
    if (!map || !mapsLibrary) return;

    let isDisposed = false;
    let projectionListener: google.maps.MapsEventListener | null = null;

    const initTerraDraw = () => {
      if (isDisposed || drawRef.current) return;

      const draw = new TerraDraw({
        adapter: new TerraDrawGoogleMapsAdapter({
          map,
          lib: google.maps,
          coordinatePrecision: 9
        }),
        modes: [
          new TerraDrawRenderMode({
            modeName: 'static',
            styles: {}
          }),
          new TerraDrawPolygonMode({
            styles: {
              fillColor: '#38bdf8',
              fillOpacity: 0.2,
              outlineColor: '#38bdf8',
              outlineWidth: 2.5,
              closingPointColor: '#f8fafc',
              closingPointWidth: 5,
              closingPointOutlineColor: '#0f172a',
              closingPointOutlineWidth: 2
            }
          }),
          new TerraDrawSelectMode({
            flags: {
              polygon: {
                feature: {
                  draggable: true,
                  coordinates: {
                    midpoints: true,
                    draggable: true,
                    deletable: true
                  }
                }
              }
            }
          })
        ]
      });

      draw.start();
      if (activeModeRef.current !== 'static') {
        draw.setMode(activeModeRef.current);
      }

      const syncSnapshot = () => {
        if (!drawRef.current) return;
        const rings = extractPolygonRings(drawRef.current.getSnapshot());
        onPolygonsChangeRef.current(rings);
      };

      draw.on('finish', () => {
        syncSnapshot();
        // Switch smoothly to select mode after finishing a polygon so analysts can adjust vertices
        if (drawRef.current && drawRef.current.getMode() === 'polygon') {
          drawRef.current.setMode('select');
          onModeAutoSwitchRef.current?.('select');
        }
      });

      draw.on('change', (_ids, type) => {
        if (type === 'update' || type === 'delete') {
          syncSnapshot();
        }
      });

      drawRef.current = draw;
    };

    if (map.getProjection()) {
      initTerraDraw();
    } else {
      projectionListener = map.addListener('projection_changed', () => {
        if (map.getProjection()) {
          if (projectionListener) {
            google.maps.event.removeListener(projectionListener);
            projectionListener = null;
          }
          initTerraDraw();
        }
      });
    }

    return () => {
      isDisposed = true;
      if (projectionListener) {
        google.maps.event.removeListener(projectionListener);
      }
      if (drawRef.current) {
        try {
          drawRef.current.stop();
        } catch {
          // Ignore cleanup errors if map already torn down
        }
        drawRef.current = null;
      }
    };
  }, [map, mapsLibrary]);

  useEffect(() => {
    const draw = drawRef.current;
    if (!draw || !draw.enabled) return;

    if (draw.getMode() !== activeMode) {
      draw.setMode(activeMode);
    }
  }, [activeMode]);

  useEffect(() => {
    if (clearSignal === 0) return;
    const draw = drawRef.current;
    if (!draw || !draw.enabled) return;

    draw.clear();
    draw.setMode('static');
    onPolygonsChangeRef.current([]);
  }, [clearSignal]);

  return null;
};
