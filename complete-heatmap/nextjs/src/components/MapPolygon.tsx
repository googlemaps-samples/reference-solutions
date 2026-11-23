'use client';

import { useEffect } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import type { FloodHazardZone } from '@/types/hazard';

interface MapPolygonProps {
  zone: FloodHazardZone;
  visible: boolean;
  onPolygonReady?: (zoneId: string, polygon: google.maps.Polygon | null) => void;
  onZoneClick?: (zone: FloodHazardZone, latLng: google.maps.LatLngLiteral) => void;
}

export function MapPolygon({
  zone,
  visible,
  onPolygonReady,
  onZoneClick,
}: MapPolygonProps) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib) return;

    const polygon = new mapsLib.Polygon({
      paths: zone.ring,
      strokeColor: zone.strokeColor,
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillColor: zone.fillColor,
      fillOpacity: 0.24,
      clickable: true,
      visible,
      zIndex: 10,
    });

    polygon.setMap(map);
    onPolygonReady?.(zone.id, polygon);

    const listener = polygon.addListener(
      'click',
      (e: google.maps.PolyMouseEvent) => {
        if (e.latLng) {
          onZoneClick?.(zone, { lat: e.latLng.lat(), lng: e.latLng.lng() });
        }
      }
    );

    return () => {
      listener.remove();
      polygon.setMap(null);
      onPolygonReady?.(zone.id, null);
    };
  }, [map, mapsLib, zone, visible, onPolygonReady, onZoneClick]);

  return null;
}
