import { useEffect, useRef } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import type { GeofenceZone } from '../types/geofencing';

interface SeededPolygonsLayerProps {
  zones: GeofenceZone[];
  matchedZoneId: string | null;
  onPolygonClick?: (zone: GeofenceZone) => void;
}

export function SeededPolygonsLayer({
  zones,
  matchedZoneId,
  onPolygonClick,
}: SeededPolygonsLayerProps) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const polygonsRef = useRef<Record<string, google.maps.Polygon>>({});
  const onPolygonClickRef = useRef(onPolygonClick);
  onPolygonClickRef.current = onPolygonClick;

  useEffect(() => {
    if (!map || !mapsLib) return;

    const existing = polygonsRef.current;
    const nextIds: Record<string, boolean> = {};

    for (const zone of zones) {
      if (zone.source !== 'seeded') continue;
      nextIds[zone.id] = true;

      const isMatched = zone.id === matchedZoneId;
      const strokeOpacity = isMatched ? 0.95 : 0.78;
      const strokeWeight = isMatched ? 3 : 2;
      const fillOpacity = isMatched ? 0.3 : 0.16;

      if (existing[zone.id]) {
        existing[zone.id].setOptions({
          strokeColor: zone.color,
          strokeOpacity,
          strokeWeight,
          fillColor: zone.color,
          fillOpacity,
        });
      } else {
        const polygon = new mapsLib.Polygon({
          paths: zone.path,
          map,
          strokeColor: zone.color,
          strokeOpacity,
          strokeWeight,
          fillColor: zone.color,
          fillOpacity,
          clickable: true,
          zIndex: 1,
        });

        polygon.addListener('click', () => {
          onPolygonClickRef.current?.(zone);
        });

        existing[zone.id] = polygon;
      }
    }

    for (const id of Object.keys(existing)) {
      if (!nextIds[id]) {
        existing[id].setMap(null);
        delete existing[id];
      }
    }
  }, [map, mapsLib, zones, matchedZoneId]);

  useEffect(() => {
    const polygons = polygonsRef.current;
    return () => {
      for (const id of Object.keys(polygons)) {
        polygons[id].setMap(null);
        delete polygons[id];
      }
    };
  }, []);

  return null;
}
