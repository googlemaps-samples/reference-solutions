'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { Compass, Route as RouteIcon, ShieldCheck } from 'lucide-react';
import {
  PRE_SEEDED_GEOFENCES,
  SEED_SEARCH_QUERY,
  WORKER_GPS_PRESETS,
} from '@/data/austinSeed';
import { findMatchingGeofences, formatDistance, formatDuration } from '@/lib/geofence';
import { GeofenceMapCanvas } from '@/components/GeofenceMapCanvas';
import { OperationsSidebar } from '@/components/OperationsSidebar';
import type {
  AuditSite,
  ClockInLogEntry,
  DrawMode,
  GeofenceZone,
  LatLngLiteral,
  OptimizedRouteResult,
} from '@/types/geofencing';

interface AttendanceAuditWorkspaceProps {
  apiKey: string;
}

export function AttendanceAuditWorkspace({ apiKey }: AttendanceAuditWorkspaceProps) {
  const trimmedKey = apiKey.trim();
  const hasApiKey =
    trimmedKey.length > 0 && trimmedKey !== 'your_google_maps_api_key_here';

  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    WORKER_GPS_PRESETS[0].id
  );
  const [drawnZones, setDrawnZones] = useState<GeofenceZone[]>([]);
  const [drawMode, setDrawMode] = useState<DrawMode>('static');
  const [clearSignal, setClearSignal] = useState<number>(0);
  const [geometryLib, setGeometryLib] = useState<google.maps.GeometryLibrary | null>(null);

  const [workerAddress, setWorkerAddress] = useState<string>(
    hasApiKey
      ? 'Resolving Austin street address...'
      : 'Configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to resolve address'
  );
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [clockInLogs, setClockInLogs] = useState<ClockInLogEntry[]>([]);

  const [searchQuery, setSearchQuery] = useState<string>(SEED_SEARCH_QUERY);
  const [auditSites, setAuditSites] = useState<AuditSite[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState<boolean>(false);
  const [placesError, setPlacesError] = useState<string | null>(null);

  const [routeData, setRouteData] = useState<OptimizedRouteResult | null>(null);
  const [isComputingRoute, setIsComputingRoute] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<LatLngLiteral | null>(null);

  const selectedPreset = useMemo(
    () =>
      WORKER_GPS_PRESETS.find((preset) => preset.id === selectedPresetId) ??
      WORKER_GPS_PRESETS[0],
    [selectedPresetId]
  );

  const workerCoords = selectedPreset.coords;

  const allZones = useMemo(
    () => [...PRE_SEEDED_GEOFENCES, ...drawnZones],
    [drawnZones]
  );

  const matchingZones = useMemo(
    () => findMatchingGeofences(workerCoords, allZones, geometryLib),
    [workerCoords, allZones, geometryLib]
  );

  const matchingZoneIds = useMemo(
    () => matchingZones.map((z) => z.id),
    [matchingZones]
  );

  const isInsideGeofence = matchingZones.length > 0;

  const orderedStops = useMemo(() => {
    if (routeData && routeData.orderedStops.length > 0) {
      return routeData.orderedStops;
    }
    return auditSites;
  }, [routeData, auditSites]);

  // Reverse-geocode worker GPS coordinates via BFF /api/geocode/reverse
  useEffect(() => {
    if (!hasApiKey) return;

    const controller = new AbortController();
    setIsGeocoding(true);
    setGeocodeError(null);

    fetch(
      `/api/geocode/reverse?lat=${encodeURIComponent(
        workerCoords.lat
      )}&lng=${encodeURIComponent(workerCoords.lng)}`,
      { signal: controller.signal }
    )
      .then(async (res) => {
        const data = (await res.json()) as {
          formattedAddress?: string;
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error || 'Reverse geocoding failed');
        }
        setWorkerAddress(
          data.formattedAddress ||
            `${workerCoords.lat.toFixed(5)}, ${workerCoords.lng.toFixed(5)}`
        );
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        const message =
          err instanceof Error ? err.message : 'Unable to reverse geocode coordinates.';
        setGeocodeError(message);
        setWorkerAddress(
          `${workerCoords.lat.toFixed(5)}, ${workerCoords.lng.toFixed(5)} (Austin, TX)`
        );
      })
      .finally(() => {
        setIsGeocoding(false);
      });

    return () => controller.abort();
  }, [hasApiKey, workerCoords.lat, workerCoords.lng]);

  const computeOptimizedRoute = useCallback(
    async (sitesToRoute: AuditSite[], originCoords: LatLngLiteral) => {
      if (!hasApiKey || sitesToRoute.length === 0) {
        setRouteData(null);
        return;
      }

      setIsComputingRoute(true);
      setRouteError(null);

      try {
        const res = await fetch('/api/routes/compute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: originCoords,
            destination: originCoords,
            intermediates: sitesToRoute.map((s) => s.location),
          }),
        });

        const payload = (await res.json()) as {
          optimizedIntermediateWaypointIndex?: number[];
          distanceMeters?: number;
          durationSeconds?: number;
          encodedPolyline?: string;
          legs?: { distanceMeters: number; durationSeconds: number }[];
          error?: string;
        };

        if (!res.ok) {
          throw new Error(payload.error || 'Failed to compute optimized route.');
        }

        const indices = payload.optimizedIntermediateWaypointIndex ?? [];
        const reordered =
          indices.length === sitesToRoute.length
            ? indices.map((idx) => sitesToRoute[idx]).filter(Boolean)
            : sitesToRoute;

        setRouteData({
          orderedStops: reordered,
          optimizedIndices: indices,
          encodedPolyline: payload.encodedPolyline ?? '',
          totalDistanceMeters: payload.distanceMeters ?? 0,
          totalDurationSeconds: payload.durationSeconds ?? 0,
          legs: payload.legs ?? [],
        });

        if (reordered.length > 0) {
          setSelectedStopId(reordered[0].id);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unable to optimize audit route.';
        setRouteError(message);
      } finally {
        setIsComputingRoute(false);
      }
    },
    [hasApiKey]
  );

  const runSiteSearch = useCallback(
    async (queryText: string) => {
      if (!hasApiKey) return;

      setIsSearchingPlaces(true);
      setPlacesError(null);

      try {
        const res = await fetch('/api/places/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            textQuery: queryText.trim() || SEED_SEARCH_QUERY,
            maxResultCount: 5,
          }),
        });

        const payload = (await res.json()) as {
          places?: AuditSite[];
          error?: string;
        };

        if (!res.ok) {
          throw new Error(payload.error || 'Places Text Search failed.');
        }

        const discovered = payload.places ?? [];
        setAuditSites(discovered);
        if (discovered.length > 0) {
          await computeOptimizedRoute(discovered, workerCoords);
        } else {
          setRouteData(null);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unable to search Austin audit sites.';
        setPlacesError(message);
      } finally {
        setIsSearchingPlaces(false);
      }
    },
    [hasApiKey, computeOptimizedRoute, workerCoords]
  );

  // Initial seed load of live Austin audit sites & optimized route
  useEffect(() => {
    if (!hasApiKey) return;
    void runSiteSearch(SEED_SEARCH_QUERY);
    // Run once on initial mount when API key is configured
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasApiKey]);

  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const nextPreset = WORKER_GPS_PRESETS.find((p) => p.id === presetId);
    if (nextPreset) {
      setFocusTarget(nextPreset.coords);
    }
  };

  const handleClockIn = () => {
    if (!isInsideGeofence) return;
    const zone = matchingZones[0];
    const entry: ClockInLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      zoneName: zone.name,
      address: workerAddress,
      coords: workerCoords,
    };
    setClockInLogs((prev) => [entry, ...prev]);
  };

  const handleClearDrawn = () => {
    setClearSignal((n) => n + 1);
  };

  const handleAddAutocompleteSite = useCallback(
    (newSite: AuditSite) => {
      setAuditSites((prev) => {
        if (prev.some((s) => s.id === newSite.id)) return prev;
        const updated = [...prev, newSite];
        void computeOptimizedRoute(updated, workerCoords);
        return updated;
      });
      setFocusTarget(newSite.location);
      setSelectedStopId(newSite.id);
    },
    [computeOptimizedRoute, workerCoords]
  );

  const handleOptimizeRouteClick = () => {
    void computeOptimizedRoute(auditSites, workerCoords);
  };

  const workspaceBody = (
    <div className="app-shell">
      <header className="top-header">
        <div className="header-brand">
          <span className="brand-icon" aria-hidden="true">
            <Compass size={18} />
          </span>
          <h1 className="header-title">
            Field Workforce Geofenced Attendance &amp; Site Audit Router
          </h1>
          <span className="header-district-badge">Austin, TX • District 04</span>
        </div>

        <div className="header-metrics">
          <span className="header-pill">
            <ShieldCheck size={14} color="#38bdf8" />
            {allZones.length} Geofence Zones
          </span>
          <span className={`header-pill ${isInsideGeofence ? 'inside' : 'outside'}`}>
            {isInsideGeofence ? 'Clock-In Eligible' : 'Clock-In Locked'}
          </span>
          <span className="header-pill">
            <RouteIcon size={14} color="#60a5fa" />
            {routeData
              ? `${formatDuration(routeData.totalDurationSeconds)} • ${formatDistance(
                  routeData.totalDistanceMeters
                )}`
              : `${orderedStops.length} Audit Sites`}
          </span>
        </div>
      </header>

      <main className="workspace-grid">
        <OperationsSidebar
          hasApiKey={hasApiKey}
          selectedPresetId={selectedPresetId}
          onPresetChange={handlePresetChange}
          workerCoords={workerCoords}
          workerAddress={workerAddress}
          isGeocoding={isGeocoding}
          geocodeError={geocodeError}
          matchingZones={matchingZones}
          onClockIn={handleClockIn}
          clockInLogs={clockInLogs}
          allZones={allZones}
          drawMode={drawMode}
          onDrawModeChange={setDrawMode}
          onClearDrawn={handleClearDrawn}
          onFocusLocation={setFocusTarget}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSearchSubmit={() => void runSiteSearch(searchQuery)}
          isSearchingPlaces={isSearchingPlaces}
          placesError={placesError}
          onAddAutocompleteSite={handleAddAutocompleteSite}
          orderedStops={orderedStops}
          selectedStopId={selectedStopId}
          onSelectStop={setSelectedStopId}
          routeData={routeData}
          isComputingRoute={isComputingRoute}
          routeError={routeError}
          onOptimizeRoute={handleOptimizeRouteClick}
        />

        <GeofenceMapCanvas
          hasApiKey={hasApiKey}
          preSeededZones={PRE_SEEDED_GEOFENCES}
          matchingZoneIds={matchingZoneIds}
          workerCoords={workerCoords}
          isInsideGeofence={isInsideGeofence}
          orderedStops={orderedStops}
          routeData={routeData}
          selectedStopId={selectedStopId}
          onSelectStop={setSelectedStopId}
          drawMode={drawMode}
          onDrawModeChange={setDrawMode}
          clearSignal={clearSignal}
          onClearDrawn={handleClearDrawn}
          onDrawnZonesChange={setDrawnZones}
          focusTarget={focusTarget}
          onGeometryReady={setGeometryLib}
        />
      </main>
    </div>
  );

  if (!hasApiKey) {
    return workspaceBody;
  }

  return (
    <APIProvider
      apiKey={trimmedKey}
      libraries={['places', 'routes', 'geocoding', 'geometry', 'marker']}
      language="en"
      region="US"
    >
      {workspaceBody}
    </APIProvider>
  );
}
