import { useEffect, useMemo, useRef, useState } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import type { HazardIncident } from '../../types/hazard';

interface DeckGlHeatmapOverlayProps {
  incidents: HazardIncident[];
  visible: boolean;
  onRendererModeChange?: (mode: 'webgl2' | 'canvas-fallback') => void;
}

function checkWebGL2Support(): boolean {
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
  onRendererModeChange,
}: DeckGlHeatmapOverlayProps) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const [useFallback, setUseFallback] = useState<boolean>(() => !checkWebGL2Support());
  const overlayRef = useRef<GoogleMapsOverlay | null>(null);
  const fallbackCirclesRef = useRef<google.maps.Circle[]>([]);

  useEffect(() => {
    onRendererModeChange?.(useFallback ? 'canvas-fallback' : 'webgl2');
  }, [useFallback, onRendererModeChange]);

  const layers = useMemo(() => {
    if (!visible || useFallback) return [];
    return [
      new HeatmapLayer<HazardIncident>({
        id: 'miami-hazard-heatmap',
        data: incidents,
        getPosition: (d: HazardIncident) => [d.lng, d.lat],
        getWeight: (d: HazardIncident) => d.weight,
        radiusPixels: 44,
        intensity: 1.45,
        threshold: 0.04,
        opacity: 0.78,
        colorRange: [
          [254, 240, 138, 130],
          [253, 186, 116, 170],
          [249, 115, 22, 200],
          [239, 68, 68, 220],
          [185, 28, 28, 240],
          [127, 29, 29, 255],
        ],
      }),
    ];
  }, [incidents, visible, useFallback]);

  // WebGL2 deck.gl GoogleMapsOverlay lifecycle
  useEffect(() => {
    if (!map || useFallback) {
      if (overlayRef.current) {
        try {
          overlayRef.current.setMap(null);
          overlayRef.current.finalize();
        } catch {
          // Ignore teardown errors
        }
        overlayRef.current = null;
      }
      return;
    }

    try {
      const overlay = new GoogleMapsOverlay({
        interleaved: true,
        layers,
        onError: () => {
          setUseFallback(true);
        },
      });
      overlay.setMap(map);
      overlayRef.current = overlay;

      return () => {
        try {
          overlay.setMap(null);
          overlay.finalize();
        } catch {
          // Ignore teardown errors
        }
        overlayRef.current = null;
      };
    } catch {
      setUseFallback(true);
      return undefined;
    }
  }, [map, useFallback]);

  // Update deck.gl layers reactively when incidents or visibility change
  useEffect(() => {
    if (useFallback || !overlayRef.current) return;
    try {
      overlayRef.current.setProps({ layers });
    } catch {
      setUseFallback(true);
    }
  }, [layers, useFallback]);

  // Graceful non-WebGL2 Google Maps Circle heatmap fallback (headless Chromium compatibility)
  useEffect(() => {
    fallbackCirclesRef.current.forEach((circle) => circle.setMap(null));
    fallbackCirclesRef.current = [];

    if (!map || !mapsLib || !useFallback || !visible) {
      return undefined;
    }

    const circles = incidents.map((incident) => {
      const normalized = Math.min(1, Math.max(0.2, incident.weight / 10));
      const fillColor =
        normalized >= 0.8 ? '#b91c1c' : normalized >= 0.6 ? '#ea580c' : '#f59e0b';
      return new mapsLib.Circle({
        map,
        center: { lat: incident.lat, lng: incident.lng },
        radius: 140 + incident.weight * 26,
        fillColor,
        fillOpacity: 0.18 + normalized * 0.22,
        strokeColor: fillColor,
        strokeOpacity: 0.32,
        strokeWeight: 1,
        clickable: false,
        zIndex: 1,
      });
    });

    fallbackCirclesRef.current = circles;

    return () => {
      circles.forEach((circle) => circle.setMap(null));
      fallbackCirclesRef.current = [];
    };
  }, [map, mapsLib, useFallback, visible, incidents]);

  return null;
}
