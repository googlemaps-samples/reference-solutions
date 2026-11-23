import { useEffect } from 'react';
import { AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import type { EvacuationRouteState } from '../../types/hazard';

interface EvacuationRouteLayerProps {
  route: EvacuationRouteState | null;
}

export function EvacuationRouteLayer({ route }: EvacuationRouteLayerProps) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const coreLib = useMapsLibrary('core');

  useEffect(() => {
    if (!map || !mapsLib || !route || route.path.length === 0) return undefined;

    const mainColor = route.intersectsFloodZone ? '#d97706' : '#059669';

    const casing = new mapsLib.Polyline({
      map,
      path: route.path,
      strokeColor: '#0f172a',
      strokeOpacity: 0.75,
      strokeWeight: 9,
      zIndex: 8,
    });

    const line = new mapsLib.Polyline({
      map,
      path: route.path,
      strokeColor: mainColor,
      strokeOpacity: 0.98,
      strokeWeight: 5,
      zIndex: 9,
    });

    if (coreLib?.LatLngBounds) {
      const bounds = new coreLib.LatLngBounds();
      route.path.forEach((pt) => bounds.extend(pt));
      map.fitBounds(bounds, { top: 64, right: 64, bottom: 96, left: 64 });
    }

    return () => {
      casing.setMap(null);
      line.setMap(null);
    };
  }, [map, mapsLib, coreLib, route]);

  if (!route || route.bypassWaypoints.length === 0) {
    return null;
  }

  return (
    <>
      {route.bypassWaypoints.map((wp, idx) => (
        <AdvancedMarker
          key={`bypass-wp-${idx}`}
          position={wp}
          title="Flood-zone perimeter bypass waypoint"
          zIndex={12}
        >
          <Pin
            background="#0284c7"
            borderColor="#075985"
            glyphColor="#ffffff"
            glyph="⇄"
            scale={0.85}
          />
        </AdvancedMarker>
      ))}
    </>
  );
}
