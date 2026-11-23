'use client';

import { useEffect } from 'react';
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import type { ComputedRoute, LatLngLiteral } from '@/types/locator';

interface RoutePolylineProps {
  route: ComputedRoute | null;
  originLocation: LatLngLiteral;
  destinationLocation: LatLngLiteral | null;
}

export function RoutePolyline({
  route,
  originLocation,
  destinationLocation,
}: RoutePolylineProps) {
  const map = useMap();
  const geometryLib = useMapsLibrary('geometry');
  const coreLib = useMapsLibrary('core');
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !geometryLib || !coreLib || !mapsLib || !route?.encodedPolyline) {
      return;
    }

    const path = geometryLib.encoding.decodePath(route.encodedPolyline);
    if (path.length === 0) return;

    const casing = new mapsLib.Polyline({
      path,
      strokeColor: '#0f172a',
      strokeOpacity: 0.38,
      strokeWeight: 9,
      zIndex: 40,
      map,
    });

    const stroke = new mapsLib.Polyline({
      path,
      strokeColor: '#1a73e8',
      strokeOpacity: 0.95,
      strokeWeight: 5.5,
      zIndex: 45,
      map,
    });

    const bounds = new coreLib.LatLngBounds();
    path.forEach((pt) => bounds.extend(pt));
    bounds.extend(originLocation);
    if (destinationLocation) {
      bounds.extend(destinationLocation);
    }

    map.fitBounds(bounds, { top: 72, right: 64, bottom: 72, left: 64 });

    return () => {
      casing.setMap(null);
      stroke.setMap(null);
    };
  }, [map, geometryLib, coreLib, mapsLib, route, originLocation, destinationLocation]);

  return null;
}
