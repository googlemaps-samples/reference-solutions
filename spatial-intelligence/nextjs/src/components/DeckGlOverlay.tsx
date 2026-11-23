'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useMap } from '@vis.gl/react-google-maps';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { ScatterplotLayer } from '@deck.gl/layers';
import { HexagonLayer } from '@deck.gl/aggregation-layers';
import type { SensorPoint } from '@/lib/nyc-spatial-data';

export type DeckLayerMode = 'scatterplot' | 'hexagon';

interface DeckGlOverlayProps {
  points: SensorPoint[];
  highlightedIds: Record<string, true> | null;
  mode: DeckLayerMode;
  visible: boolean;
  onWebglAvailabilityChange?: (available: boolean) => void;
}

function detectWebGL2Support(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    const gl2 = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false });
    return Boolean(gl2);
  } catch {
    return false;
  }
}

function getLoadColor(loadPct: number, isHighlighted: boolean): [number, number, number, number] {
  const alpha = isHighlighted ? 235 : 70;
  if (loadPct >= 80) return [239, 68, 68, alpha]; // Critical red
  if (loadPct >= 65) return [245, 158, 11, alpha]; // Elevated amber
  return [16, 185, 129, alpha]; // Optimal emerald
}

export const DeckGlOverlay: React.FC<DeckGlOverlayProps> = ({
  points,
  highlightedIds,
  mode,
  visible,
  onWebglAvailabilityChange,
}) => {
  const map = useMap();
  const overlayRef = useRef<GoogleMapsOverlay | null>(null);
  const webglSupported = useMemo(() => detectWebGL2Support(), []);

  useEffect(() => {
    onWebglAvailabilityChange?.(webglSupported);
  }, [webglSupported, onWebglAvailabilityChange]);

  const layers = useMemo(() => {
    if (!webglSupported || !visible) return [];

    if (mode === 'hexagon') {
      const activePoints = highlightedIds
        ? points.filter((pt) => Boolean(highlightedIds[pt.id]))
        : points;

      return [
        new HexagonLayer<SensorPoint>({
          id: 'nyc-sensor-hexagon-layer',
          data: activePoints,
          getPosition: (d) => d.position,
          getColorWeight: (d) => d.loadPct,
          colorAggregation: 'MEAN',
          getElevationWeight: (d) => d.throughputKw,
          elevationAggregation: 'SUM',
          radius: 260,
          elevationScale: 8,
          extruded: true,
          coverage: 0.84,
          opacity: 0.78,
          pickable: false,
          colorRange: [
            [16, 185, 129],
            [52, 211, 153],
            [251, 191, 36],
            [245, 158, 11],
            [249, 115, 22],
            [239, 68, 68],
          ],
        }),
      ];
    }

    return [
      new ScatterplotLayer<SensorPoint>({
        id: 'nyc-sensor-scatterplot-layer',
        data: points,
        getPosition: (d) => d.position,
        getFillColor: (d) =>
          getLoadColor(d.loadPct, highlightedIds ? Boolean(highlightedIds[d.id]) : true),
        getLineColor: [255, 255, 255, 160],
        getRadius: (d) =>
          highlightedIds && !highlightedIds[d.id]
            ? 24
            : 34 + Math.round((d.loadPct / 100) * 28),
        radiusMinPixels: 3,
        radiusMaxPixels: 11,
        stroked: true,
        lineWidthMinPixels: 1,
        pickable: false,
        updateTriggers: {
          getFillColor: [highlightedIds],
          getRadius: [highlightedIds],
        },
      }),
    ];
  }, [points, highlightedIds, mode, visible, webglSupported]);

  useEffect(() => {
    if (!map || !webglSupported) return;

    let overlay: GoogleMapsOverlay | null = null;
    try {
      overlay = new GoogleMapsOverlay({
        interleaved: false,
        layers,
        onError: () => {
          onWebglAvailabilityChange?.(false);
        },
      });
      overlay.setMap(map);
      overlayRef.current = overlay;
    } catch {
      onWebglAvailabilityChange?.(false);
    }

    return () => {
      if (overlay) {
        try {
          overlay.setMap(null);
          overlay.finalize();
        } catch {
          // Ignore WebGL context teardown issues
        }
      }
      overlayRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, webglSupported]);

  useEffect(() => {
    if (!overlayRef.current || !webglSupported) return;
    try {
      overlayRef.current.setProps({ layers });
    } catch {
      onWebglAvailabilityChange?.(false);
    }
  }, [layers, webglSupported, onWebglAvailabilityChange]);

  return null;
};
