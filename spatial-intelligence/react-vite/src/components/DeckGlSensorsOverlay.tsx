import React, { useEffect, useMemo, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { ScatterplotLayer } from '@deck.gl/layers';
import { HexagonLayer } from '@deck.gl/aggregation-layers';
import type { LayersList, PickingInfo } from '@deck.gl/core';
import type { DeckGlLayerMode, SensorPoint } from '../types/gis';
import { isWebGL2Supported } from '../utils/geometry';

interface DeckGlSensorsOverlayProps {
  allSensors: SensorPoint[];
  activeSensorIds: Record<string, true> | null;
  mode: DeckGlLayerMode;
  isDrawingMode: boolean;
  onHoverSensor: (sensor: SensorPoint | null) => void;
  onWebGLStatusChange: (available: boolean) => void;
}

function getSensorColor(sensor: SensorPoint, dimmed: boolean): [number, number, number, number] {
  const alpha = dimmed ? 48 : 220;
  if (sensor.capacityLoad >= 84) {
    return [239, 68, 68, alpha];
  }
  if (sensor.capacityLoad >= 68) {
    return [245, 158, 11, alpha];
  }
  return [56, 189, 248, alpha];
}

export const DeckGlSensorsOverlay: React.FC<DeckGlSensorsOverlayProps> = ({
  allSensors,
  activeSensorIds,
  mode,
  isDrawingMode,
  onHoverSensor,
  onWebGLStatusChange
}) => {
  const map = useMap();
  const overlayRef = useRef<GoogleMapsOverlay | null>(null);
  const webglReadyRef = useRef<boolean>(false);
  const onHoverRef = useRef(onHoverSensor);
  onHoverRef.current = onHoverSensor;

  const filteredSensors = useMemo(() => {
    if (!activeSensorIds) return allSensors;
    return allSensors.filter((sensor) => Boolean(activeSensorIds[sensor.id]));
  }, [allSensors, activeSensorIds]);

  const layers: LayersList = useMemo(() => {
    if (mode === 'hexagon') {
      return [
        new HexagonLayer<SensorPoint>({
          id: 'nyc-sensors-hexagon',
          data: filteredSensors.length ? filteredSensors : allSensors,
          pickable: !isDrawingMode,
          extruded: false,
          radius: 260,
          coverage: 0.86,
          getPosition: (d) => [d.lng, d.lat],
          getColorWeight: (d) => d.capacityLoad,
          colorAggregation: 'MEAN',
          colorRange: [
            [16, 185, 129, 175],
            [56, 189, 248, 190],
            [250, 204, 21, 200],
            [245, 158, 11, 215],
            [239, 68, 68, 230]
          ]
        })
      ];
    }

    return [
      new ScatterplotLayer<SensorPoint>({
        id: 'nyc-sensors-scatterplot',
        data: allSensors,
        pickable: !isDrawingMode,
        opacity: 0.92,
        stroked: true,
        filled: true,
        radiusScale: 1,
        radiusMinPixels: 3,
        radiusMaxPixels: 9,
        lineWidthMinPixels: 1,
        getPosition: (d) => [d.lng, d.lat],
        getRadius: (d) => {
          const isActive = !activeSensorIds || Boolean(activeSensorIds[d.id]);
          return isActive ? 48 + d.capacityLoad * 0.45 : 34;
        },
        getFillColor: (d) => {
          const isDimmed = Boolean(activeSensorIds && !activeSensorIds[d.id]);
          return getSensorColor(d, isDimmed);
        },
        getLineColor: (d) => {
          const isDimmed = Boolean(activeSensorIds && !activeSensorIds[d.id]);
          return isDimmed ? [15, 23, 42, 40] : [15, 23, 42, 185];
        },
        onHover: (info: PickingInfo<SensorPoint>) => {
          onHoverRef.current(info.object ?? null);
        },
        updateTriggers: {
          getRadius: [activeSensorIds],
          getFillColor: [activeSensorIds],
          getLineColor: [activeSensorIds]
        }
      })
    ];
  }, [allSensors, filteredSensors, activeSensorIds, mode, isDrawingMode]);

  useEffect(() => {
    const supported = isWebGL2Supported();
    webglReadyRef.current = supported;
    onWebGLStatusChange(supported);

    if (!supported || !map) {
      return;
    }

    let overlay: GoogleMapsOverlay | null = null;
    try {
      overlay = new GoogleMapsOverlay({
        interleaved: false,
        layers,
        onError: () => {
          webglReadyRef.current = false;
          onWebGLStatusChange(false);
        }
      });
      overlay.setMap(map);
      overlayRef.current = overlay;
    } catch {
      webglReadyRef.current = false;
      onWebGLStatusChange(false);
    }

    return () => {
      if (overlay) {
        try {
          overlay.setMap(null);
          overlay.finalize();
        } catch {
          // Safe cleanup in case context was already lost
        }
      }
      overlayRef.current = null;
    };
    // Intentionally initialize overlay once per map instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay || !webglReadyRef.current) return;

    try {
      overlay.setProps({
        layers,
        pickingRadius: isDrawingMode ? 0 : 8
      });
    } catch {
      onWebGLStatusChange(false);
    }
  }, [layers, isDrawingMode, onWebGLStatusChange]);

  return null;
};
