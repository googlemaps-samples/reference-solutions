import { useState } from 'react';
import {
  AdvancedMarker,
  InfoWindow,
  Pin,
} from '@vis.gl/react-google-maps';
import type { FleetVehicle, LogisticsHub, VehicleStatus } from '../types/logistics';

interface VehicleMarkersProps {
  vehicles: FleetVehicle[];
  selectedVehicleId: string;
  onSelectVehicle: (vehicleId: string) => void;
  depot: LogisticsHub | null;
  orderedStops: LogisticsHub[];
}

const STATUS_BADGE_COLORS: Record<
  VehicleStatus,
  { bg: string; border: string; dot: string; label: string }
> = {
  'en-route': {
    bg: '#065f46',
    border: '#34d399',
    dot: '#10b981',
    label: 'En Route',
  },
  delayed: {
    bg: '#991b1b',
    border: '#f87171',
    dot: '#ef4444',
    label: 'Delayed',
  },
  idle: {
    bg: '#334155',
    border: '#94a3b8',
    dot: '#94a3b8',
    label: 'Idle',
  },
};

export function VehicleMarkers({
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
  depot,
  orderedStops,
}: VehicleMarkersProps) {
  const [infoVehicleId, setInfoVehicleId] = useState<string | null>(null);
  const [selectedHubId, setSelectedHubId] = useState<string | null>(null);

  const infoVehicle = vehicles.find((v) => v.id === infoVehicleId) ?? null;
  const allHubs = [
    ...(depot ? [{ hub: depot, badge: 'D', isDepot: true }] : []),
    ...orderedStops.map((hub, index) => ({
      hub,
      badge: String(index + 1),
      isDepot: false,
    })),
  ];
  const activeHubEntry = allHubs.find((entry) => entry.hub.id === selectedHubId) ?? null;

  return (
    <>
      {depot && (
        <AdvancedMarker
          key={`depot-${depot.id}`}
          position={depot.position}
          title={`Central Depot: ${depot.name}`}
          zIndex={40}
          onClick={() => {
            setInfoVehicleId(null);
            setSelectedHubId(depot.id);
          }}
        >
          <Pin
            background="#1e1b4b"
            borderColor="#818cf8"
            glyphColor="#ffffff"
            glyphText="D"
            scale={1.15}
          />
        </AdvancedMarker>
      )}

      {orderedStops.map((stop, idx) => (
        <AdvancedMarker
          key={`stop-${stop.id}`}
          position={stop.position}
          title={`Stop #${idx + 1}: ${stop.name}`}
          zIndex={35}
          onClick={() => {
            setInfoVehicleId(null);
            setSelectedHubId(stop.id);
          }}
        >
          <Pin
            background="#4f46e5"
            borderColor="#c7d2fe"
            glyphColor="#ffffff"
            glyphText={String(idx + 1)}
            scale={1.0}
          />
        </AdvancedMarker>
      ))}

      {vehicles.map((vehicle) => {
        const isSelected = vehicle.id === selectedVehicleId;
        const theme = STATUS_BADGE_COLORS[vehicle.status];

        return (
          <AdvancedMarker
            key={vehicle.id}
            position={vehicle.position}
            title={`${vehicle.label} (${theme.label})`}
            zIndex={isSelected ? 60 : 50}
            onClick={() => {
              setSelectedHubId(null);
              onSelectVehicle(vehicle.id);
              setInfoVehicleId(vehicle.id);
            }}
          >
            <div
              className={`map-vehicle-pill ${isSelected ? 'is-selected' : ''}`}
              style={{
                backgroundColor: theme.bg,
                borderColor: isSelected ? '#ffffff' : theme.border,
              }}
            >
              <span
                className="map-vehicle-dot"
                style={{ backgroundColor: theme.dot }}
              />
              <span className="map-vehicle-label">{vehicle.label}</span>
              <span className="map-vehicle-speed">{vehicle.speedMph}mph</span>
            </div>
          </AdvancedMarker>
        );
      })}

      {infoVehicle && (
        <InfoWindow
          position={infoVehicle.position}
          pixelOffset={[0, -34]}
          onCloseClick={() => setInfoVehicleId(null)}
        >
          <div className="map-infowindow">
            <div className="map-infowindow-head">
              <strong>{infoVehicle.label}</strong>
              <span className={`status-chip status-${infoVehicle.status}`}>
                {STATUS_BADGE_COLORS[infoVehicle.status].label}
              </span>
            </div>
            <div className="map-infowindow-meta">
              <div>{infoVehicle.unitType} &bull; {infoVehicle.driver}</div>
              <div>Corridor: {infoVehicle.corridor}</div>
              <div>
                Speed: <strong>{infoVehicle.speedMph} mph</strong> &bull; ETA:{' '}
                <strong>{infoVehicle.etaText}</strong>
              </div>
              <div>Next Stop: {infoVehicle.nextStop}</div>
            </div>
          </div>
        </InfoWindow>
      )}

      {activeHubEntry && (
        <InfoWindow
          position={activeHubEntry.hub.position}
          pixelOffset={[0, -38]}
          onCloseClick={() => setSelectedHubId(null)}
        >
          <div className="map-infowindow">
            <div className="map-infowindow-head">
              <strong>
                {activeHubEntry.isDepot
                  ? 'Central Depot'
                  : `Drop-Off Hub #${activeHubEntry.badge}`}
              </strong>
            </div>
            <div className="map-infowindow-meta">
              <div style={{ fontWeight: 600 }}>{activeHubEntry.hub.name}</div>
              <div>{activeHubEntry.hub.address}</div>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}
