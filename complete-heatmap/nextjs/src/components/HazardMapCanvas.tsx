'use client';

import { useCallback, useState } from 'react';
import {
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  type MapMouseEvent,
} from '@vis.gl/react-google-maps';
import { DeckGlHeatmapOverlay } from '@/components/DeckGlHeatmapOverlay';
import { MapPolygon } from '@/components/MapPolygon';
import { MapPolyline } from '@/components/MapPolyline';
import { MIAMI_CENTER, MIAMI_INITIAL_ZOOM } from '@/lib/miami-hazards';
import type {
  EvacuationRouteResult,
  FloodHazardZone,
  HazardIncident,
  LatLngPoint,
  ShelterPlace,
} from '@/types/hazard';

interface HazardMapCanvasProps {
  incidents: HazardIncident[];
  floodZones: FloodHazardZone[];
  shelters: ShelterPlace[];
  selectedOrigin: LatLngPoint;
  selectedAddress: string;
  activeRoute: EvacuationRouteResult | null;
  showHeatmap: boolean;
  showPolygons: boolean;
  selectedShelterId: string | null;
  onMapClickPoint: (point: LatLngPoint) => void;
  onPolygonReady: (zoneId: string, polygon: google.maps.Polygon | null) => void;
  onSelectShelterAndRoute: (shelter: ShelterPlace) => void;
}

type InfoPopupState =
  | { kind: 'shelter'; shelter: ShelterPlace }
  | { kind: 'zone'; zone: FloodHazardZone; position: LatLngPoint }
  | { kind: 'incident'; incident: HazardIncident }
  | null;

export function HazardMapCanvas({
  incidents,
  floodZones,
  shelters,
  selectedOrigin,
  selectedAddress,
  activeRoute,
  showHeatmap,
  showPolygons,
  selectedShelterId,
  onMapClickPoint,
  onPolygonReady,
  onSelectShelterAndRoute,
}: HazardMapCanvasProps) {
  const [heatmapMode, setHeatmapMode] = useState<'webgl2' | 'fallback-2d'>('webgl2');
  const [infoPopup, setInfoPopup] = useState<InfoPopupState>(null);

  const handleMapClick = useCallback(
    (event: MapMouseEvent) => {
      const latLng = event.detail.latLng;
      if (!latLng) return;
      setInfoPopup(null);
      onMapClickPoint({ lat: latLng.lat, lng: latLng.lng });
    },
    [onMapClickPoint]
  );

  const handleZoneClick = useCallback(
    (zone: FloodHazardZone, position: LatLngPoint) => {
      setInfoPopup({ kind: 'zone', zone, position });
      onMapClickPoint(position);
    },
    [onMapClickPoint]
  );

  const userReportedIncidents = incidents.filter((inc) => inc.isUserReported);

  return (
    <div id="map-container" data-testid="map-container" className="map-canvas-shell">
      <GoogleMap
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
        defaultCenter={MIAMI_CENTER}
        defaultZoom={MIAMI_INITIAL_ZOOM}
        gestureHandling="greedy"
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={true}
        onClick={handleMapClick}
        style={{ width: '100%', height: '100%' }}
      >
        <DeckGlHeatmapOverlay
          incidents={incidents}
          visible={showHeatmap}
          onRenderModeChange={setHeatmapMode}
        />

        {floodZones.map((zone) => (
          <MapPolygon
            key={zone.id}
            zone={zone}
            visible={showPolygons}
            onPolygonReady={onPolygonReady}
            onZoneClick={handleZoneClick}
          />
        ))}

        {activeRoute && activeRoute.decodedPath.length > 0 && (
          <MapPolyline
            path={activeRoute.decodedPath}
            intersectsFloodZone={activeRoute.intersectsFloodZone}
          />
        )}

        {/* Active Incident / Evacuation Origin Pin */}
        <AdvancedMarker
          position={selectedOrigin}
          title={`Selected Origin: ${selectedAddress}`}
          zIndex={50}
        >
          <Pin
            background="#0284c7"
            borderColor="#0c4a6e"
            glyphColor="#ffffff"
            scale={1.2}
          >
            📍
          </Pin>
        </AdvancedMarker>

        {/* User-Submitted Hazard Reports */}
        {userReportedIncidents.map((inc) => (
          <AdvancedMarker
            key={inc.id}
            position={{ lat: inc.lat, lng: inc.lng }}
            title={`${inc.type} (${inc.reportedAt})`}
            zIndex={45}
            onClick={() => setInfoPopup({ kind: 'incident', incident: inc })}
          >
            <Pin
              background="#dc2626"
              borderColor="#7f1d1d"
              glyphColor="#ffffff"
              scale={1.05}
            >
              ⚠️
            </Pin>
          </AdvancedMarker>
        ))}

        {/* Nearby Emergency Shelters (Places API New) */}
        {shelters.map((shelter) => {
          const isSelected = shelter.id === selectedShelterId;
          return (
            <AdvancedMarker
              key={shelter.id}
              position={shelter.location}
              title={shelter.name}
              zIndex={isSelected ? 60 : 40}
              onClick={() => setInfoPopup({ kind: 'shelter', shelter })}
            >
              <Pin
                background={isSelected ? '#059669' : '#0f766e'}
                borderColor={isSelected ? '#064e3b' : '#134e4a'}
                glyphColor="#ffffff"
                scale={isSelected ? 1.28 : 1.05}
              >
                {shelter.category === 'Hospital' ? '🏥' : '🏛️'}
              </Pin>
            </AdvancedMarker>
          );
        })}

        {infoPopup?.kind === 'shelter' && (
          <InfoWindow
            position={infoPopup.shelter.location}
            onCloseClick={() => setInfoPopup(null)}
          >
            <div className="map-infowindow">
              <div className="iw-badge">{infoPopup.shelter.category}</div>
              <h3>{infoPopup.shelter.name}</h3>
              <p>{infoPopup.shelter.address}</p>
              {typeof infoPopup.shelter.rating === 'number' && (
                <p className="iw-meta">
                  Rating: {infoPopup.shelter.rating.toFixed(1)} ★ (
                  {infoPopup.shelter.userRatingCount ?? 0} reviews)
                </p>
              )}
              <button
                type="button"
                className="iw-route-btn"
                onClick={() => {
                  onSelectShelterAndRoute(infoPopup.shelter);
                  setInfoPopup(null);
                }}
              >
                Route Evacuation Here
              </button>
            </div>
          </InfoWindow>
        )}

        {infoPopup?.kind === 'zone' && (
          <InfoWindow
            position={infoPopup.position}
            onCloseClick={() => setInfoPopup(null)}
          >
            <div className="map-infowindow">
              <div className="iw-badge is-danger">
                {infoPopup.zone.severity} FLOOD ZONE
              </div>
              <h3>{infoPopup.zone.name}</h3>
              <p>{infoPopup.zone.description}</p>
              <p className="iw-meta">
                Estimated surge depth: {infoPopup.zone.surgeEstimateMeters} m
              </p>
            </div>
          </InfoWindow>
        )}

        {infoPopup?.kind === 'incident' && (
          <InfoWindow
            position={{ lat: infoPopup.incident.lat, lng: infoPopup.incident.lng }}
            onCloseClick={() => setInfoPopup(null)}
          >
            <div className="map-infowindow">
              <div className="iw-badge is-danger">REPORTED HAZARD</div>
              <h3>{infoPopup.incident.type}</h3>
              <p>{infoPopup.incident.address ?? 'Miami, FL'}</p>
              {infoPopup.incident.notes && <p>{infoPopup.incident.notes}</p>}
              <p className="iw-meta">
                Severity {infoPopup.incident.weight}/10 · {infoPopup.incident.reportedAt}
              </p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Bottom-Left Compact Legend & Planning Disclaimer */}
      <div className="map-legend-card">
        <div className="legend-row">
          <span className="legend-swatch swatch-heat" />
          <span>
            Incident Heatmap (
            {heatmapMode === 'webgl2' ? 'deck.gl WebGL2' : '2D Fallback'})
          </span>
        </div>
        <div className="legend-row">
          <span className="legend-swatch swatch-flood" />
          <span>Active Flood-Hazard Polygons</span>
        </div>
        <div className="legend-row">
          <span className="legend-swatch swatch-route" />
          <span>Flood-Avoidance Evacuation Route</span>
        </div>
        <div className="legend-row">
          <span className="legend-swatch swatch-shelter" />
          <span>Hospitals &amp; Community Shelters</span>
        </div>
        <p className="legend-disclaimer">
          Civic situational awareness tool. Follow official Miami-Dade Emergency
          Management orders during active storms.
        </p>
      </div>
    </div>
  );
}
