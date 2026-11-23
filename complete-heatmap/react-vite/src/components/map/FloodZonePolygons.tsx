import { useEffect } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import type { FloodZone, LatLngPoint } from '../../types/hazard';

interface FloodZonePolygonsProps {
  zones: FloodZone[];
  visible: boolean;
  onPolygonClick?: (location: LatLngPoint) => void;
}

export function FloodZonePolygons({
  zones,
  visible,
  onPolygonClick,
}: FloodZonePolygonsProps) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib || !visible) return undefined;

    const polygons: google.maps.Polygon[] = [];
    const listeners: google.maps.MapsEventListener[] = [];

    for (const zone of zones) {
      const isCritical = zone.severity === 'CRITICAL';
      const polygon = new mapsLib.Polygon({
        map,
        paths: zone.paths,
        strokeColor: isCritical ? '#dc2626' : '#ea580c',
        strokeOpacity: 0.85,
        strokeWeight: 2,
        fillColor: isCritical ? '#ef4444' : '#f97316',
        fillOpacity: 0.22,
        zIndex: 2,
      });

      const listener = polygon.addListener('click', (event: google.maps.PolyMouseEvent) => {
        if (event.latLng && onPolygonClick) {
          onPolygonClick({
            lat: event.latLng.lat(),
            lng: event.latLng.lng(),
          });
        }
      });

      polygons.push(polygon);
      listeners.push(listener);
    }

    return () => {
      listeners.forEach((l) => google.maps.event.removeListener(l));
      polygons.forEach((p) => p.setMap(null));
    };
  }, [map, mapsLib, zones, visible, onPolygonClick]);

  return null;
}
