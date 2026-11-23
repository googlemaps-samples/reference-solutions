'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AdvancedMarker,
  InfoWindow,
  Pin,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { Navigation } from 'lucide-react';
import type { FleetVehicle, LatLngPoint, LogisticsHub } from '@/lib/types';

export function TrafficOverlay({ enabled }: { enabled: boolean }) {
  const map = useMap();
  const mapsLibrary = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLibrary || !enabled) return;

    const trafficLayer = new mapsLibrary.TrafficLayer();
    trafficLayer.setMap(map);

    return () => {
      trafficLayer.setMap(null);
    };
  }, [map, mapsLibrary, enabled]);

  return null;
}

interface PolylineOverlayProps {
  path: LatLngPoint[];
  strokeColor: string;
  strokeWeight: number;
  strokeOpacity?: number;
  dashed?: boolean;
  zIndex?: number;
}

export function PolylineOverlay({
  path,
  strokeColor,
  strokeWeight,
  strokeOpacity = 0.9,
  dashed = false,
  zIndex = 2,
}: PolylineOverlayProps) {
  const map = useMap();
  const mapsLibrary = useMapsLibrary('maps');

  useEffect(() => {
    if (!map || !mapsLibrary || path.length < 2) return;

    const polyline = new mapsLibrary.Polyline({
      path,
      geodesic: true,
      strokeColor,
      strokeWeight,
      strokeOpacity: dashed ? 0 : strokeOpacity,
      zIndex,
      icons: dashed
        ? [
            {
              icon: {
                path: 'M 0,-1 0,1',
                strokeOpacity: 0.95,
                strokeColor,
                scale: 3,
              },
              offset: '0',
              repeat: '14px',
            },
          ]
        : undefined,
    });

    polyline.setMap(map);

    return () => {
      polyline.setMap(null);
    };
  }, [map, mapsLibrary, path, strokeColor, strokeWeight, strokeOpacity, dashed, zIndex]);

  return null;
}

export function EncodedRoutePolyline({
  encodedPolyline,
}: {
  encodedPolyline: string;
}) {
  const geometryLibrary = useMapsLibrary('geometry');

  const decodedPath = useMemo<LatLngPoint[]>(() => {
    if (!encodedPolyline || !geometryLibrary?.encoding) return [];
    try {
      const pts = geometryLibrary.encoding.decodePath(encodedPolyline);
      return pts.map((latLng) => ({
        lat: latLng.lat(),
        lng: latLng.lng(),
      }));
    } catch {
      return [];
    }
  }, [encodedPolyline, geometryLibrary]);

  if (decodedPath.length < 2) return null;

  return (
    <PolylineOverlay
      path={decodedPath}
      strokeColor="#4f46e5"
      strokeWeight={5}
      strokeOpacity={0.85}
      zIndex={1}
    />
  );
}

interface VehicleMarkerProps {
  vehicle: FleetVehicle;
  isSelected: boolean;
  isInfoOpen: boolean;
  onSelect: (vehicleId: string) => void;
  onCloseInfo: () => void;
}

export function VehicleMarker({
  vehicle,
  isSelected,
  isInfoOpen,
  onSelect,
  onCloseInfo,
}: VehicleMarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  const statusClass =
    vehicle.status === 'En Route'
      ? 'en-route'
      : vehicle.status === 'Delayed'
        ? 'delayed'
        : 'idle';

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={vehicle.position}
        title={`${vehicle.id} (${vehicle.status})`}
        zIndex={isSelected ? 50 : 30}
        onClick={() => onSelect(vehicle.id)}
      >
        <div
          className={`vehicle-pin ${statusClass} ${isSelected ? 'selected' : ''}`}
        >
          <Navigation
            size={11}
            style={{
              transform: `rotate(${vehicle.headingDeg}deg)`,
            }}
          />
          <span>{vehicle.id}</span>
        </div>
      </AdvancedMarker>

      {isInfoOpen && marker && (
        <InfoWindow anchor={marker} onCloseClick={onCloseInfo} maxWidth={260}>
          <div style={{ padding: '2px 4px', color: '#0f172a', fontSize: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
              {vehicle.callsign}
            </div>
            <div style={{ color: '#475569', marginBottom: 6 }}>
              {vehicle.unitType} · <strong>{vehicle.status}</strong>
            </div>
            <div style={{ display: 'grid', gap: 3, fontSize: 11 }}>
              <div>
                <strong>Speed:</strong> {vehicle.speedMph} mph
              </div>
              <div>
                <strong>Corridor:</strong> {vehicle.corridorName}
              </div>
              <div>
                <strong>Next Stop:</strong> {vehicle.nextStopLabel}
              </div>
              <div>
                <strong>ETA:</strong>{' '}
                {vehicle.etaMinutes !== null
                  ? `${vehicle.etaMinutes} min`
                  : 'Standby'}
              </div>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

interface HubMarkerProps {
  hub: LogisticsHub;
  stopNumber?: number;
}

export function HubMarker({ hub, stopNumber }: HubMarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [open, setOpen] = useState(false);

  const isDepot = hub.role === 'depot';
  const glyphText = isDepot ? 'D' : String(stopNumber ?? '•');

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={hub.location}
        title={hub.name}
        zIndex={isDepot ? 25 : 20}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Pin
          background={isDepot ? '#1e3a8a' : '#0284c7'}
          borderColor="#ffffff"
          glyphColor="#ffffff"
          glyphText={glyphText}
          scale={isDepot ? 1.15 : 1.0}
        />
      </AdvancedMarker>

      {open && marker && (
        <InfoWindow
          anchor={marker}
          onCloseClick={() => setOpen(false)}
          maxWidth={250}
        >
          <div style={{ padding: '2px 4px', color: '#0f172a', fontSize: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 3 }}>
              {isDepot ? 'Central Depot' : `Drop-off Stop #${stopNumber}`}:{' '}
              {hub.name}
            </div>
            <div style={{ color: '#475569', fontSize: 11 }}>{hub.address}</div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}
