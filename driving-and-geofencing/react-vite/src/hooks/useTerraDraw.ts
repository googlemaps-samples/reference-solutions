import { useCallback, useEffect, useRef, useState } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
  type GeoJSONStoreFeatures,
} from 'terra-draw';
import { TerraDrawGoogleMapsAdapter } from 'terra-draw-google-maps-adapter';
import type { GeofenceZone, LatLngPoint, TerraDrawModeName } from '../types/geofencing';

interface UseTerraDrawResult {
  isReady: boolean;
  activeMode: TerraDrawModeName;
  drawnZones: GeofenceZone[];
  setMode: (mode: TerraDrawModeName) => void;
  clearDrawn: () => void;
}

function extractDrawnPolygons(snapshot: GeoJSONStoreFeatures[]): GeofenceZone[] {
  const zones: GeofenceZone[] = [];
  let customCounter = 1;

  for (const feature of snapshot) {
    if (feature.geometry.type !== 'Polygon') continue;
    const outerRing = feature.geometry.coordinates[0];
    if (!outerRing || outerRing.length < 4) continue;

    // Exclude closing duplicate vertex when converting GeoJSON ring to Maps path
    const rawCoords = outerRing.slice(0, -1);
    const path: LatLngPoint[] = rawCoords.map(([lng, lat]: number[]) => ({
      lat,
      lng,
    }));
    if (path.length < 3) continue;

    zones.push({
      id: `drawn-${String(feature.id)}`,
      name: `Supervisor Zone #${customCounter}`,
      district: 'Custom Drawn Perimeter',
      source: 'drawn',
      color: '#d97706',
      path,
    });
    customCounter += 1;
  }

  return zones;
}

export function useTerraDraw(): UseTerraDrawResult {
  const map = useMap();
  const drawRef = useRef<TerraDraw | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [activeMode, setActiveMode] = useState<TerraDrawModeName>('static');
  const [drawnZones, setDrawnZones] = useState<GeofenceZone[]>([]);

  useEffect(() => {
    if (!map || drawRef.current) return;

    let cancelled = false;
    let projectionListener: google.maps.MapsEventListener | null = null;

    const syncSnapshot = (instance: TerraDraw) => {
      try {
        const snapshot = instance.getSnapshot();
        setDrawnZones(extractDrawnPolygons(snapshot));
      } catch {
        // Ignore transient store reads during teardown
      }
    };

    const initialize = () => {
      if (cancelled || drawRef.current) return;

      const instance = new TerraDraw({
        adapter: new TerraDrawGoogleMapsAdapter({
          map,
          lib: google.maps,
          coordinatePrecision: 9,
          isolatedData: true,
        }),
        modes: [
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
          new TerraDrawPolygonMode({
            editable: true,
            styles: {
              fillColor: '#f59e0b',
              fillOpacity: 0.24,
              outlineColor: '#d97706',
              outlineWidth: 2.5,
              closingPointColor: '#b45309',
              closingPointWidth: 5,
              closingPointOutlineColor: '#ffffff',
              closingPointOutlineWidth: 2,
            },
          }),
        ],
      });

      instance.start();
      instance.setMode('static');

      instance.on('finish', () => {
        syncSnapshot(instance);
      });

      instance.on('change', () => {
        syncSnapshot(instance);
      });

      drawRef.current = instance;
      setIsReady(true);
      setActiveMode('static');
    };

    if (map.getProjection()) {
      initialize();
    } else {
      projectionListener = map.addListener('projection_changed', () => {
        if (!map.getProjection()) return;
        projectionListener?.remove();
        projectionListener = null;
        initialize();
      });
    }

    return () => {
      cancelled = true;
      projectionListener?.remove();
      if (drawRef.current) {
        try {
          drawRef.current.stop();
        } catch {
          // Safe cleanup on unmount
        }
        drawRef.current = null;
      }
      setIsReady(false);
    };
  }, [map]);

  const setMode = useCallback((mode: TerraDrawModeName) => {
    const instance = drawRef.current;
    if (!instance) return;
    instance.setMode(mode);
    setActiveMode(mode);
  }, []);

  const clearDrawn = useCallback(() => {
    const instance = drawRef.current;
    if (!instance) return;
    instance.clear();
    instance.setMode('static');
    setActiveMode('static');
    setDrawnZones([]);
  }, []);

  return {
    isReady,
    activeMode,
    drawnZones,
    setMode,
    clearDrawn,
  };
}
