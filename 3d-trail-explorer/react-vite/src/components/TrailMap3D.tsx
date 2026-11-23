import React, { useEffect } from 'react';
import { AltitudeMode, Pin } from '@vis.gl/react-google-maps';
import {
  GestureHandling,
  Map3D,
  MapMode,
  Marker3D,
  Polyline3D,
  Popover,
  useMap3D,
  type Map3DCameraChangedEvent,
  type Map3DRef
} from '@vis.gl/react-google-maps/3d';
import {
  TAHOE_INITIAL_CAMERA,
  TAHOE_TRAIL_3D_PATH,
  TRAIL_CHAPTERS
} from '../data/tahoeTrail';
import type {
  CameraTelemetry,
  ChapterId,
  ElevationSample,
  SelectedLandmark,
  TrailChapter
} from '../types/explorer';

interface TrailMap3DProps {
  map3dRef: React.RefObject<Map3DRef | null>;
  mapMode: MapMode;
  activeChapterId: ChapterId;
  selectedLandmark: SelectedLandmark | null;
  searchedLandmark: SelectedLandmark | null;
  hoveredSample: ElevationSample | null;
  popoverOpen: boolean;
  onClosePopover: () => void;
  onSelectChapter: (chapter: TrailChapter) => void;
  onSelectSearchedMarker: (landmark: SelectedLandmark) => void;
  onCameraChanged: (telemetry: CameraTelemetry) => void;
  onMapError: (message: string) => void;
}

const Map3DAttributeBridge: React.FC = () => {
  const map3d = useMap3D();

  useEffect(() => {
    if (!map3d) return;
    map3d.setAttribute('data-testid', 'gmp-map-3d');
  }, [map3d]);

  return null;
};

export const TrailMap3D: React.FC<TrailMap3DProps> = ({
  map3dRef,
  mapMode,
  activeChapterId,
  selectedLandmark,
  searchedLandmark,
  hoveredSample,
  popoverOpen,
  onClosePopover,
  onSelectChapter,
  onSelectSearchedMarker,
  onCameraChanged,
  onMapError
}) => {
  const handleCameraChanged = (ev: Map3DCameraChangedEvent) => {
    onCameraChanged({
      heading: ev.detail.heading,
      tilt: ev.detail.tilt,
      range: ev.detail.range,
      center: ev.detail.center
    });
  };

  return (
    <main
      data-testid="map-3d-container"
      className="map-stage"
      aria-label="Photorealistic 3D Lake Tahoe Trail Map"
    >
      <Map3D
        ref={map3dRef}
        className="map-3d-canvas"
        mode={mapMode}
        gestureHandling={GestureHandling.GREEDY}
        internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
        defaultCenter={TAHOE_INITIAL_CAMERA.center}
        defaultHeading={TAHOE_INITIAL_CAMERA.heading}
        defaultTilt={TAHOE_INITIAL_CAMERA.tilt}
        defaultRange={TAHOE_INITIAL_CAMERA.range}
        defaultRoll={0}
        onCameraChanged={handleCameraChanged}
        onError={() =>
          onMapError(
            'Unable to initialize Photorealistic 3D Map. Verify your VITE_GOOGLE_MAPS_API_KEY and Maps JavaScript API billing/permissions.'
          )
        }
      >
        <Map3DAttributeBridge />

        {/* Extruded bright-red RGB(255, 0, 0) 3D hiking trail polyline */}
        <Polyline3D
          path={TAHOE_TRAIL_3D_PATH}
          altitudeMode={AltitudeMode.RELATIVE_TO_GROUND}
          extruded={true}
          drawsOccludedSegments={true}
          strokeColor="rgb(255, 0, 0)"
          strokeWidth={8}
          outerColor="rgba(127, 29, 29, 0.85)"
          outerWidth={0.22}
          zIndex={5}
        />

        {/* Interactive 3D trailhead & scenic viewpoint markers */}
        {TRAIL_CHAPTERS.map((chapter) => {
          const isActive = chapter.id === activeChapterId;
          return (
            <Marker3D
              key={chapter.id}
              position={{
                lat: chapter.position.lat,
                lng: chapter.position.lng,
                altitude: 28
              }}
              altitudeMode={AltitudeMode.RELATIVE_TO_GROUND}
              extruded={true}
              drawsWhenOccluded={true}
              title={chapter.title}
              zIndex={isActive ? 20 : 10}
              onClick={() => onSelectChapter(chapter)}
            >
              <Pin
                background={chapter.pinBackground}
                borderColor={chapter.pinBorderColor}
                glyphColor="#ffffff"
                glyphText={chapter.pinGlyph}
                scale={isActive ? 1.2 : 1.0}
              />
            </Marker3D>
          );
        })}

        {/* User-searched Places API landmark marker */}
        {searchedLandmark && (
          <Marker3D
            position={{
              lat: searchedLandmark.lat,
              lng: searchedLandmark.lng,
              altitude: 34
            }}
            altitudeMode={AltitudeMode.RELATIVE_TO_GROUND}
            extruded={true}
            drawsWhenOccluded={true}
            title={searchedLandmark.name}
            zIndex={30}
            onClick={() => onSelectSearchedMarker(searchedLandmark)}
          >
            <Pin
              background="#f59e0b"
              borderColor="#fef3c7"
              glyphColor="#0f172a"
              glyphText="★"
              scale={1.25}
            />
          </Marker3D>
        )}

        {/* Interactive elevation-chart hover indicator on the 3D trail */}
        {hoveredSample && (
          <Marker3D
            position={{
              lat: hoveredSample.lat,
              lng: hoveredSample.lng,
              altitude: 22
            }}
            altitudeMode={AltitudeMode.RELATIVE_TO_GROUND}
            extruded={true}
            drawsWhenOccluded={true}
            zIndex={40}
          >
            <Pin
              background="#ffffff"
              borderColor="rgb(255, 0, 0)"
              glyphColor="rgb(255, 0, 0)"
              glyphText="▲"
              scale={0.85}
            />
          </Marker3D>
        )}

        {/* Popover anchored above the currently active viewpoint or landmark */}
        {selectedLandmark && (
          <Popover
            position={{
              lat: selectedLandmark.lat,
              lng: selectedLandmark.lng,
              altitude: 58
            }}
            altitudeMode={AltitudeMode.RELATIVE_TO_GROUND}
            open={popoverOpen}
            autoPanDisabled={true}
            onClose={onClosePopover}
            style={{
              backgroundColor: '#0f172a',
              borderRadius: '10px',
              padding: '10px 12px',
              maxWidth: '260px'
            }}
            headerContent={
              <div className="popover-header">{selectedLandmark.name}</div>
            }
          >
            <div className="popover-body">
              <p className="popover-sub">{selectedLandmark.subtitle}</p>
              {selectedLandmark.elevationM != null && (
                <p className="popover-elev">
                  Elevation: {Math.round(selectedLandmark.elevationM).toLocaleString()} m
                </p>
              )}
            </div>
          </Popover>
        )}
      </Map3D>
    </main>
  );
};
