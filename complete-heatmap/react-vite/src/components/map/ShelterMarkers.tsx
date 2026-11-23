import { useState } from 'react';
import {
  AdvancedMarker,
  InfoWindow,
  Pin,
} from '@vis.gl/react-google-maps';
import type { LatLngPoint, ShelterPlace } from '../../types/hazard';

interface ShelterMarkersProps {
  shelters: ShelterPlace[];
  selectedShelterId: string | null;
  incidentLocation: LatLngPoint | null;
  onSelectShelter: (shelter: ShelterPlace) => void;
  onRouteToShelter: (shelter: ShelterPlace) => void;
}

function isHospitalShelter(shelter: ShelterPlace): boolean {
  return (
    shelter.types.includes('hospital') ||
    shelter.displayName.toLowerCase().includes('hospital') ||
    shelter.displayName.toLowerCase().includes('medical')
  );
}

export function ShelterMarkers({
  shelters,
  selectedShelterId,
  incidentLocation,
  onSelectShelter,
  onRouteToShelter,
}: ShelterMarkersProps) {
  const [infoMarkerEl, setInfoMarkerEl] =
    useState<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [infoShelter, setInfoShelter] = useState<ShelterPlace | null>(null);

  return (
    <>
      {incidentLocation && (
        <AdvancedMarker
          position={incidentLocation}
          title="Selected Incident / Evacuation Origin"
          zIndex={20}
        >
          <Pin
            background="#dc2626"
            borderColor="#7f1d1d"
            glyphColor="#ffffff"
            glyph="!"
            scale={1.15}
          />
        </AdvancedMarker>
      )}

      {shelters.map((shelter) => {
        const hospital = isHospitalShelter(shelter);
        const isSelected = shelter.id === selectedShelterId;
        const background = shelter.insideFloodZone
          ? '#d97706'
          : hospital
            ? '#0284c7'
            : '#059669';
        const borderColor = shelter.insideFloodZone
          ? '#78350f'
          : hospital
            ? '#0c4a6e'
            : '#064e3b';

        return (
          <AdvancedMarker
            key={shelter.id}
            position={shelter.location}
            title={shelter.displayName}
            zIndex={isSelected ? 18 : 10}
            onClick={(e) => {
              const targetMarker = (e as unknown as { marker?: google.maps.marker.AdvancedMarkerElement })
                ?.marker ?? null;
              onSelectShelter(shelter);
              setInfoShelter(shelter);
              if (targetMarker) {
                setInfoMarkerEl(targetMarker);
              }
            }}
            ref={(marker) => {
              if (isSelected && infoShelter?.id === shelter.id && marker && marker !== infoMarkerEl) {
                setInfoMarkerEl(marker);
              }
            }}
          >
            <Pin
              background={background}
              borderColor={borderColor}
              glyphColor="#ffffff"
              glyph={hospital ? 'H' : 'S'}
              scale={isSelected ? 1.2 : 1.0}
            />
          </AdvancedMarker>
        );
      })}

      {infoShelter && (
        <InfoWindow
          anchor={infoMarkerEl}
          position={infoMarkerEl ? undefined : infoShelter.location}
          onCloseClick={() => {
            setInfoShelter(null);
            setInfoMarkerEl(null);
          }}
        >
          <div className="shelter-infowindow">
            <div className="shelter-infowindow-title">{infoShelter.displayName}</div>
            <div className="shelter-infowindow-address">{infoShelter.formattedAddress}</div>
            <div className="shelter-infowindow-meta">
              {infoShelter.rating ? (
                <span>★ {infoShelter.rating.toFixed(1)} ({infoShelter.userRatingCount ?? 0})</span>
              ) : (
                <span>Emergency Facility</span>
              )}
              <span>•</span>
              <span className={infoShelter.insideFloodZone ? 'text-amber' : 'text-emerald'}>
                {infoShelter.insideFloodZone ? 'Inside Flood Zone' : 'Clear of Flood Zones'}
              </span>
            </div>
            {infoShelter.hoursSummary && (
              <div className="shelter-infowindow-hours">{infoShelter.hoursSummary}</div>
            )}
            <button
              type="button"
              className="shelter-infowindow-btn"
              onClick={() => onRouteToShelter(infoShelter)}
            >
              Calculate Safe Evacuation Route
            </button>
          </div>
        </InfoWindow>
      )}
    </>
  );
}
