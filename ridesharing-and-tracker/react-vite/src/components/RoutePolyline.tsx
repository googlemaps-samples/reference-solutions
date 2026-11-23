import { useEffect, useRef } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

interface RoutePolylineProps {
  path: google.maps.LatLngLiteral[];
  strokeColor: string;
  strokeOpacity?: number;
  strokeWeight?: number;
  zIndex?: number;
  dashed?: boolean;
  onClick?: () => void;
}

export function RoutePolyline({
  path,
  strokeColor,
  strokeOpacity = 0.9,
  strokeWeight = 6,
  zIndex = 1,
  dashed = false,
  onClick,
}: RoutePolylineProps) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  useEffect(() => {
    if (!map || !mapsLib || path.length < 2) {
      return;
    }

    const icons: google.maps.IconSequence[] | undefined = dashed
      ? [
          {
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: 0.95,
              scale: 3,
            },
            offset: '0',
            repeat: '14px',
          },
        ]
      : undefined;

    const polyline = new mapsLib.Polyline({
      path,
      map,
      geodesic: true,
      strokeColor,
      strokeOpacity: dashed ? 0 : strokeOpacity,
      strokeWeight,
      zIndex,
      clickable: Boolean(onClickRef.current),
      icons,
    });

    const listener = polyline.addListener('click', () => {
      onClickRef.current?.();
    });

    return () => {
      listener.remove();
      polyline.setMap(null);
    };
  }, [map, mapsLib, path, strokeColor, strokeOpacity, strokeWeight, zIndex, dashed]);

  return null;
}
