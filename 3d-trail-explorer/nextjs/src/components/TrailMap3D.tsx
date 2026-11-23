'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AltitudeMode, Pin, useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  Map3D,
  MapMode,
  Marker3D,
  Polyline3D,
  Popover,
  type Map3DCameraChangedEvent,
  type Map3DRef,
} from '@vis.gl/react-google-maps/3d';
import { Compass, Layers, TriangleAlert } from 'lucide-react';
import { CHAPTER_STOPS, INITIAL_CAMERA, TAHOE_TRAIL_PATH } from '@/lib/tahoe-trail';
import type {
  CameraPreset,
  CameraTelemetry,
  ChapterStop,
  ElevationSample,
  PlaceSummary,
} from '@/types/explorer';

export interface FlyCameraRequest {
  camera: CameraPreset;
  nonce: number;
}

interface TrailMap3DProps {
  hasApiKey: boolean;
  activeChapterId: ChapterStop['id'];
  flyRequest: FlyCameraRequest | null;
  searchedLandmark: PlaceSummary | null;
  focusedSample: ElevationSample | null;
  selectedPlace: PlaceSummary | null;
  onSelectChapter: (stop: ChapterStop) => void;
  onCameraTelemetryChange: (telemetry: CameraTelemetry) => void;
}

export function TrailMap3D({
  hasApiKey,
  activeChapterId,
  flyRequest,
  searchedLandmark,
  focusedSample,
  selectedPlace,
  onSelectChapter,
  onCameraTelemetryChange,
}: TrailMap3DProps) {
  useMapsLibrary('maps3d');
  useMapsLibrary('marker');

  const map3dRef = useRef<Map3DRef | null>(null);
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const [map3dElementReady, setMap3dElementReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Detect WebGL2 capability gracefully to avoid uncaught WebGL2 console errors in GPU-less environments
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      setWebglSupported(Boolean(gl));
    } catch {
      setWebglSupported(false);
    }
  }, []);

  // Attach data-testid="gmp-map-3d" directly onto the <gmp-map-3d> element when mounted
  useEffect(() => {
    const instance = map3dRef.current?.map3d;
    if (!instance) {
      setMap3dElementReady(false);
      return;
    }
    instance.setAttribute('data-testid', 'gmp-map-3d');
    setMap3dElementReady(true);
  });

  // Execute smooth 3D camera fly-to transitions when chapters, search landmarks, or trail points are selected
  useEffect(() => {
    if (!flyRequest) return;
    const refHandle = map3dRef.current;
    if (!refHandle?.map3d) return;

    try {
      refHandle.flyCameraTo({
        endCamera: {
          center: flyRequest.camera.center,
          heading: flyRequest.camera.heading,
          tilt: flyRequest.camera.tilt,
          range: flyRequest.camera.range,
        },
        durationMillis: flyRequest.camera.durationMillis ?? 2200,
      });
    } catch {
      // Ignore if map3d is still warming up
    }
  }, [flyRequest]);

  const handleCameraChanged = (event: Map3DCameraChangedEvent) => {
    const { center, heading, tilt, range } = event.detail;
    onCameraTelemetryChange({
      lat: center.lat,
      lng: center.lng,
      altitude: center.altitude ?? 0,
      heading,
      tilt,
      range,
    });
  };

  const activeChapter =
    CHAPTER_STOPS.find((stop) => stop.id === activeChapterId) ?? CHAPTER_STOPS[0];

  const popoverPosition = searchedLandmark
    ? {
        lat: searchedLandmark.location.lat,
        lng: searchedLandmark.location.lng,
        altitude: 42,
      }
    : {
        lat: activeChapter.position.lat,
        lng: activeChapter.position.lng,
        altitude: 40,
      };

  const canRenderInteractive3D = hasApiKey && webglSupported === true && !mapError;

  return (
    <div
      data-testid="map-3d-container"
      className="relative flex-1 min-h-[520px] min-w-[300px] h-full w-full overflow-hidden bg-slate-950"
    >
      {canRenderInteractive3D && (
        <Map3D
          ref={map3dRef}
          mode={MapMode.HYBRID}
          internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
          defaultCenter={INITIAL_CAMERA.center}
          defaultHeading={INITIAL_CAMERA.heading}
          defaultTilt={INITIAL_CAMERA.tilt}
          defaultRange={INITIAL_CAMERA.range}
          defaultRoll={0}
          style={{ width: '100%', height: '100%', minHeight: '520px' }}
          onCameraChanged={handleCameraChanged}
          onError={() => {
            setMapError(
              'Photorealistic 3D Tiles could not initialize with the current API key or WebGL context.'
            );
          }}
        >
          {/* Extruded Bright-Red 3D Hiking Trail Polyline: RGB(255, 0, 0) */}
          <Polyline3D
            path={TAHOE_TRAIL_PATH}
            strokeColor="rgb(255, 0, 0)"
            strokeWidth={8}
            altitudeMode={AltitudeMode.RELATIVE_TO_GROUND}
            extruded={true}
            drawsOccludedSegments={true}
          />

          {/* Interactive 3D Chapter Viewpoint Markers */}
          {CHAPTER_STOPS.map((stop) => {
            const isActive = stop.id === activeChapterId && !searchedLandmark;
            return (
              <Marker3D
                key={stop.id}
                position={stop.position}
                altitudeMode={AltitudeMode.RELATIVE_TO_GROUND}
                extruded={true}
                drawsWhenOccluded={true}
                title={stop.label}
                onClick={() => {
                  onSelectChapter(stop);
                  setPopoverOpen(true);
                }}
              >
                <Pin
                  background={isActive ? '#ff0000' : '#0f172a'}
                  borderColor={isActive ? '#ffffff' : '#ef4444'}
                  glyphColor="#ffffff"
                  glyphText={stop.markerGlyph}
                  scale={isActive ? 1.2 : 1.0}
                />
              </Marker3D>
            );
          })}

          {/* Searched Landmark 3D Marker */}
          {searchedLandmark && (
            <Marker3D
              position={{
                lat: searchedLandmark.location.lat,
                lng: searchedLandmark.location.lng,
                altitude: 40,
              }}
              altitudeMode={AltitudeMode.RELATIVE_TO_GROUND}
              extruded={true}
              drawsWhenOccluded={true}
              title={searchedLandmark.displayName}
              onClick={() => setPopoverOpen((prev) => !prev)}
            >
              <Pin
                background="#0284c7"
                borderColor="#ffffff"
                glyphColor="#ffffff"
                glyphText="★"
                scale={1.2}
              />
            </Marker3D>
          )}

          {/* Elevation Profile Hover / Click Trail Marker */}
          {focusedSample && (
            <Marker3D
              position={{
                lat: focusedSample.lat,
                lng: focusedSample.lng,
                altitude: 26,
              }}
              altitudeMode={AltitudeMode.RELATIVE_TO_GROUND}
              extruded={true}
              title={`Elevation Point ${Math.round(focusedSample.elevation)}m`}
            >
              <Pin
                background="#f59e0b"
                borderColor="#ffffff"
                glyphColor="#0f172a"
                glyphText="▲"
                scale={0.95}
              />
            </Marker3D>
          )}

          <Popover
            position={popoverPosition}
            altitudeMode={AltitudeMode.RELATIVE_TO_GROUND}
            open={popoverOpen}
            onClose={() => setPopoverOpen(false)}
            headerContent={
              <span className="font-semibold text-slate-900">
                {selectedPlace?.displayName || activeChapter.shortTitle}
              </span>
            }
          >
            <div className="max-w-[220px] text-xs text-slate-700">
              <p>
                {selectedPlace?.formattedAddress || activeChapter.subtitle}
              </p>
              {selectedPlace?.elevationMeters !== undefined && (
                <p className="mt-1 font-medium text-red-600">
                  Elevation: {Math.round(selectedPlace.elevationMeters)} m
                </p>
              )}
            </div>
          </Popover>
        </Map3D>
      )}

      {/* Fallback or pre-hydration placeholder when <gmp-map-3d> is not yet attached */}
      {!map3dElementReady && (
        <div
          data-testid="gmp-map-3d"
          className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_top,_#0f172a,_#020617_70%)] p-6 text-center"
        >
          <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900/85 p-6 shadow-2xl backdrop-blur-md">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
              {!hasApiKey || mapError || webglSupported === false ? (
                <TriangleAlert className="h-6 w-6" />
              ) : (
                <Compass className="h-6 w-6 animate-pulse" />
              )}
            </div>
            <h3 className="text-base font-semibold text-white">
              {!hasApiKey
                ? 'Configure Google Maps API Key'
                : mapError
                  ? '3D Map Initialization Notice'
                  : webglSupported === false
                    ? 'WebGL2 Unavailable in Headless Context'
                    : 'Loading Photorealistic 3D Terrain...'}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              {!hasApiKey
                ? 'Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local (using a free Maps Demo Key or Cloud Console key) to render Lake Tahoe Photorealistic 3D Tiles, the extruded RGB(255, 0, 0) trail, and live Places & Elevation data.'
                : mapError
                  ? mapError
                  : webglSupported === false
                    ? 'This headless graphics context does not expose WebGL2. Camera tour controls, telemetry, and trail data remain interactive.'
                    : 'Initializing Google Maps Platform maps3d library for Emerald Bay, Lake Tahoe...'}
            </p>
          </div>
        </div>
      )}

      {/* Subtle Floating Trail Legend Pill */}
      <div className="pointer-events-none absolute bottom-4 right-4 z-10 flex items-center gap-3 rounded-full border border-slate-700/70 bg-slate-950/80 px-3.5 py-1.5 text-[11px] text-slate-200 shadow-lg backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-4 rounded-sm"
            style={{ backgroundColor: 'rgb(255, 0, 0)' }}
          />
          <span>3D Extruded Trail</span>
        </span>
        <span className="text-slate-600">|</span>
        <span className="inline-flex items-center gap-1 text-slate-300">
          <Layers className="h-3 w-3 text-sky-400" />
          <span>Photorealistic 3D</span>
        </span>
      </div>
    </div>
  );
}
