import { useEffect, useRef } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

interface RoutePolylineLayerProps {
  route: google.maps.routes.Route | null;
}

export function RoutePolylineLayer({ route }: RoutePolylineLayerProps) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    for (const polyline of polylinesRef.current) {
      polyline.setMap(null);
    }
    polylinesRef.current = [];

    if (!map || !routesLib || !route) return;

    const created = route.createPolylines({
      polylineOptions: {
        map,
        strokeColor: '#1d4ed8',
        strokeOpacity: 0.9,
        strokeWeight: 5,
        zIndex: 10,
      },
    });

    polylinesRef.current = created;

    return () => {
      for (const polyline of polylinesRef.current) {
        polyline.setMap(null);
      }
      polylinesRef.current = [];
    };
  }, [map, routesLib, route]);

  return null;
}
