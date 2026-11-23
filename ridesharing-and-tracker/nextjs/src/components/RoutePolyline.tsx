'use client';

import { useEffect } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

interface RoutePolylineProps {
  encodedPath: string;
  strokeColor: string;
  strokeOpacity?: number;
  strokeWeight?: number;
  zIndex?: number;
  dashed?: boolean;
}

export function RoutePolyline({
  encodedPath,
  strokeColor,
  strokeOpacity = 0.9,
  strokeWeight = 5,
  zIndex = 1,
  dashed = false,
}: RoutePolylineProps) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const geometryLib = useMapsLibrary('geometry');

  useEffect(() => {
    if (!map || !mapsLib || !geometryLib || !encodedPath) return;

    const path = geometryLib.encoding.decodePath(encodedPath);
    if (!path.length) return;

    const icons: google.maps.IconSequence[] | undefined = dashed
      ? [
          {
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: 1,
              strokeWeight: Math.max(2, strokeWeight - 1),
              scale: 3,
            },
            offset: '0',
            repeat: '16px',
          },
        ]
      : undefined;

    const polyline = new mapsLib.Polyline({
      path,
      geodesic: true,
      strokeColor,
      strokeOpacity: dashed ? 0 : strokeOpacity,
      strokeWeight,
      zIndex,
      icons,
      map,
    });

    return () => {
      polyline.setMap(null);
    };
  }, [
    map,
    mapsLib,
    geometryLib,
    encodedPath,
    strokeColor,
    strokeOpacity,
    strokeWeight,
    zIndex,
    dashed,
  ]);

  return null;
}
