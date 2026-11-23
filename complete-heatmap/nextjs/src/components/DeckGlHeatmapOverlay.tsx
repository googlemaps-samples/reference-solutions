'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import type { HazardIncident } from '@/types/hazard';

interface DeckGlHeatmapOverlayProps {
  incidents: HazardIncident[];
  visible: boolean;
  onRenderModeChange?: (mode: 'webgl2' | 'fallback-2d') => void;
}

function detectWebGL2(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false });
    return Boolean(gl);
  } catch {
    return false;
  }
}

export function DeckGlHeatmapOverlay({
  incidents,
  visible,
  onRenderModeChange,
}: DeckGlHeatmapOverlayProps) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const [webgl2Available, setWebgl2Available] = useState<boolean | null>(null);
  const overlayRef = useRef<GoogleMapsOverlay | null>(null);
  const fallbackCirclesRef = useRef<google.maps.Circle[]>([]);

  useEffect(() => {
    const supported = detectWebGL2();
    setWebgl2Available(supported);
    onRenderModeChange?.(supported ? 'webgl2' : 'fallback-2d');
  }, [onRenderModeChange]);

  const heatmapLayers = useMemo(() => {
    if (!visible || incidents.length === 0) {
      return [];
    }

    return [
      new HeatmapLayer<HazardIncident>({
        id: 'miami-hazard-heatmap',
        data: incidents,
        getPosition: (d: HazardIncident) => [d.lng, d.lat],
        getWeight: (d: HazardIncident) => d.weight,
        radiusPixels: 48,
        intensity: 1.4,
        threshold: 0.05,
        aggregation: 'SUM',
        colorRange: [
          [254, 240, 138, 120],
          [253, 186, 116, 165],
          [251, 146, 60, 195],
          [239, 68, 68, 220],
          [185, 28, 28, 240],
          [127, 29, 29, 255],
        ],
      }),
    ];
  }, [incidents, visible]);

  // Primary WebGL2 deck.gl GoogleMapsOverlay path
  useEffect(() => {
    if (!map || webgl2Available !== true) {
      return;
    }

    let overlay: GoogleMapsOverlay | null = null;
    try {
      overlay = new GoogleMapsOverlay({
        interleaved: false,
        layers: [],
      });
      overlay.setMap(map);
      overlayRef.current = overlay;
    } catch {
      setWebgl2Available(false);
      onRenderModeChange?.('fallback-2d');
      return;
    }

    return () => {
      if (overlayRef.current) {
        try {
          overlayRef.current.setMap(null);
          overlayRef.current.finalize();
        } catch {
          // Ignore teardown errors
        }
        overlayRef.current = null;
      }
    };
  }, [map, webgl2Available, onRenderModeChange]);

  useEffect(() => {
    if (!overlayRef.current || webgl2Available !== true) {
      return;
    }
    try {
      overlayRef.current.setProps({ layers: heatmapLayers });
    } catch {
      setWebgl2Available(false);
      onRenderModeChange?.('fallback-2d');
    }
  }, [heatmapLayers, webgl2Available, onRenderModeChange]);

  // Graceful 2D fallback for headless Chromium environments without WebGL2
  useEffect(() => {
    if (!map || !mapsLib || webgl2Available !== false) {
      return;
    }

    // Clear existing fallback circles
    for (const circle of fallbackCirclesRef.current) {
      circle.setMap(null);
    }
    fallbackCirclesRef.current = [];

    if (!visible) {
      return;
    }

    const created: google.maps.Circle[] = [];
    for (const incident of incidents) {
      const normalized = Math.min(Math.max(incident.weight / 10, 0.3), 1);
      const fillColor =
        normalized > 0.78
          ? '#b91c1c'
          : normalized > 0.6
          ? '#ef4444'
          : '#f59e0b';

      const outerCircle = new mapsLib.Circle({
        map,
        center: { lat: incident.lat, lng: incident.lng },
        radius: 170 + normalized * 140,
        strokeOpacity: 0,
        fillColor,
        fillOpacity: 0.18 + normalized * 0.14,
        clickable: false,
        zIndex: 5,
      });

      const coreCircle = new mapsLib.Circle({
        map,
        center: { lat: incident.lat, lng: incident.lng },
        radius: 65 + normalized * 55,
        strokeOpacity: 0,
        fillColor: '#dc2626',
        fillOpacity: 0.25 + normalized * 0.2,
        clickable: false,
        zIndex: 6,
      });

      created.push(outerCircle, coreCircle);
    }

    fallbackCirclesRef.current = created;

    return () => {
      for (const circle of fallbackCirclesRef.current) {
        circle.setMap(null);
      }
      fallbackCirclesRef.current = [];
    };
  }, [map, mapsLib, webgl2Available, incidents, visible]);

  return null;
}
