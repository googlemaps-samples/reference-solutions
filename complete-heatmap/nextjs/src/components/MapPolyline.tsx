'use client';

import { useEffect } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import type { LatLngPoint } from '@/types/hazard';

interface MapPolylineProps {
  path: LatLngPoint[];
  intersectsFloodZone: boolean;
}

export function MapPolyline({ path, intersectsFloodZone }: MapPolylineProps) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLib || path.length === 0) return;

    const casing = new mapsLib.Polyline({
      path,
      geodesic: true,
      strokeColor: '#0f172a',
      strokeOpacity: 0.85,
      strokeWeight: 9,
      zIndex: 30,
      map,
    });

    const routeLine = new mapsLib.Polyline({
      path,
      geodesic: true,
      strokeColor: intersectsFloodZone ? '#f59e0b' : '#10b981',
      strokeOpacity: 1,
      strokeWeight: 5,
      zIndex: 31,
      icons: [
        {
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 2.8,
            strokeColor: '#ffffff',
            fillColor: '#ffffff',
            fillOpacity: 1,
          },
          offset: '35%',
          repeat: '120px',
        },
      ],
      map,
    });

    return () => {
      casing.setMap(null);
      routeLine.setMap(null);
    };
  }, [map, mapsLib, path, intersectsFloodZone]);

  return null;
}
