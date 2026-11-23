import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  AUSTIN_CENTER,
  DEFAULT_SEARCH_QUERY,
  SEEDED_GEOFENCES,
  WORKER_PRESETS,
} from './data/austinSeedData';
import type {
  AuditSite,
  ClockInRecord,
  GeofenceZone,
  LatLngPoint,
  OptimizedRouteSummary,
  TerraDrawModeName,
} from './types/geofencing';
import { getPolygonCentroid } from './utils/formatters';
import { TopHeaderBar } from './components/TopHeaderBar';
import { OperationsSidebar } from './components/OperationsSidebar';
import { AustinOperationsMap } from './components/AustinOperationsMap';

const RAW_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
const HAS_API_KEY =
  RAW_API_KEY.length > 0 && RAW_API_KEY !== 'your_google_maps_api_key_here';

interface WorkspaceProps {
  hasApiKey: boolean;
}

function AustinGeofencingWorkspace({ hasApiKey }: WorkspaceProps) {
  const mapsLib = useMapsLibrary('maps');
  const geometryLib = useMapsLibrary('geometry');
  const geocodingLib = useMapsLibrary('geocoding');
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');

  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    WORKER_PRESETS[0].id,
  );
  const [drawnZones, setDrawnZones] = useState<GeofenceZone[]>([]);
  const [terraDrawReady, setTerraDrawReady] = useState(false);
  const [terraDrawMode, setTerraDrawMode] =
    useState<TerraDrawModeName>('static');
  const [clearDrawSignal, setClearDrawSignal] = useState(0);

  const [workerAddress, setWorkerAddress] = useState<string>(
    'Waiting for Geocoding API…',
  );
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [lastClockIn, setLastClockIn] = useState<ClockInRecord | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>(DEFAULT_SEARCH_QUERY);
  const [auditSites, setAuditSites] = useState<AuditSite[]>([]);
  const [isSearchingSites, setIsSearchingSites] = useState(false);

  const [activeRoute, setActiveRoute] =
    useState<google.maps.routes.Route | null>(null);
  const [routeSummary, setRouteSummary] =
    useState<OptimizedRouteSummary | null>(null);
  const [isComputingRoute, setIsComputingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const [panTarget, setPanTarget] = useState<{
    center: LatLngPoint;
    zoom?: number;
    seq: number;
  } | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  const initialSearchRanRef = useRef(false);
  const panSeqRef = useRef(0);

  const selectedPreset = useMemo(
    () =>
      WORKER_PRESETS.find((preset) => preset.id === selectedPresetId) ??
      WORKER_PRESETS[0],
    [selectedPresetId],
  );
  const workerPosition = selectedPreset.position;

  const allZones = useMemo(
    () => [...SEEDED_GEOFENCES, ...drawnZones],
    [drawnZones],
  );

  // Evaluate geofence containment using google.maps.geometry.poly.containsLocation
  const matchedZone = useMemo<GeofenceZone | null>(() => {
    if (!geometryLib || !mapsLib) {
      return null;
    }
    for (const zone of allZones) {
      if (zone.path.length < 3) continue;
      const polygon = new mapsLib.Polygon({ paths: zone.path });
      if (geometryLib.poly.containsLocation(workerPosition, polygon)) {
        return zone;
      }
    }
    return null;
  }, [geometryLib, mapsLib, allZones, workerPosition]);

  // Reverse-geocode worker coordinates whenever worker position changes
  useEffect(() => {
    if (!hasApiKey || !geocodingLib) {
      if (!hasApiKey) {
        setWorkerAddress('Configure VITE_GOOGLE_MAPS_API_KEY to reverse-geocode');
      }
      return;
    }

    let cancelled = false;
    setIsGeocoding(true);

    const geocoder = new geocodingLib.Geocoder();
    geocoder
      .geocode({ location: workerPosition })
      .then((response) => {
        if (cancelled) return;
        const formatted = response.results?.[0]?.formatted_address;
        setWorkerAddress(
          formatted ??
            `${workerPosition.lat.toFixed(5)}, ${workerPosition.lng.toFixed(5)}`,
        );
      })
      .catch(() => {
        if (cancelled) return;
        setWorkerAddress(
          `Austin, TX (${workerPosition.lat.toFixed(5)}, ${workerPosition.lng.toFixed(5)})`,
        );
      })
      .finally(() => {
        if (!cancelled) setIsGeocoding(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasApiKey, geocodingLib, workerPosition]);

  // Compute optimized multi-stop driving route with Route.computeRoutes
  const computeOptimizedRoute = useCallback(
    async (sites: AuditSite[], origin: LatLngPoint) => {
      if (!routesLib || sites.length < 2) {
        setActiveRoute(null);
        setRouteSummary(null);
        return;
      }

      setIsComputingRoute(true);
      setRouteError(null);

      try {
        const intermediatesInput = sites.slice(0, -1);
        const destinationStop = sites[sites.length - 1];

        const { routes } = await routesLib.Route.computeRoutes({
          origin,
          destination: destinationStop.location,
          intermediates: intermediatesInput.map((site) => ({
            location: site.location,
          })),
          travelMode: 'DRIVING',
          routingPreference: 'TRAFFIC_AWARE',
          optimizeWaypointOrder: true,
          fields: [
            'path',
            'legs',
            'distanceMeters',
            'durationMillis',
            'optimizedIntermediateWaypointIndices',
            'viewport',
          ],
          internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
        });

        const primaryRoute = routes?.[0];
        if (!primaryRoute) {
          setRouteError('No driving route returned for these stops.');
          setActiveRoute(null);
          setRouteSummary(null);
          return;
        }

        const optimizedIndices =
          primaryRoute.optimizedIntermediateWaypointIndices ?? [];
        const orderedIntermediates =
          optimizedIndices.length === intermediatesInput.length
            ? optimizedIndices.map((idx) => intermediatesInput[idx])
            : intermediatesInput;

        const orderedStops = [...orderedIntermediates, destinationStop];
        const legs = (primaryRoute.legs ?? []).map((leg, idx) => ({
          stopId: orderedStops[idx]?.id ?? `leg-${idx}`,
          distanceMeters: leg.distanceMeters ?? 0,
          durationMillis: leg.durationMillis ?? 0,
        }));

        setActiveRoute(primaryRoute);
        setRouteSummary({
          orderedStops,
          totalDistanceMeters: primaryRoute.distanceMeters ?? 0,
          totalDurationMillis: primaryRoute.durationMillis ?? 0,
          legs,
        });
      } catch {
        setRouteError(
          'Unable to optimize route. Verify Routes API is enabled on your API key.',
        );
      } finally {
        setIsComputingRoute(false);
      }
    },
    [routesLib],
  );

  // Places API (New) Text Search for Austin audit sites
  const runPlacesSearch = useCallback(
    async (queryText: string) => {
      if (!placesLib || !queryText.trim()) return;

      setIsSearchingSites(true);
      setRouteError(null);

      try {
        const { places } = await placesLib.Place.searchByText({
          textQuery: queryText.trim(),
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'primaryTypeDisplayName',
          ],
          locationBias: {
            center: AUSTIN_CENTER,
            radius: 15000,
          },
          maxResultCount: 5,
          language: 'en-US',
          region: 'us',
        });

        const mapped: AuditSite[] = places
          .filter((place) => Boolean(place.location))
          .map((place) => ({
            id: place.id,
            name: place.displayName || 'Austin Retail Site',
            address: place.formattedAddress || 'Austin, TX',
            primaryType: place.primaryTypeDisplayName ?? undefined,
            location: {
              lat: place.location!.lat(),
              lng: place.location!.lng(),
            },
          }));

        setAuditSites(mapped);
        if (mapped.length >= 2 && routesLib) {
          void computeOptimizedRoute(mapped, workerPosition);
        } else {
          setActiveRoute(null);
          setRouteSummary(null);
        }
      } catch {
        setRouteError(
          'Places search failed. Verify Places API (New) is enabled on your key.',
        );
      } finally {
        setIsSearchingSites(false);
      }
    },
    [placesLib, routesLib, computeOptimizedRoute, workerPosition],
  );

  // Seed initial audit sites & route once Places + Routes libraries load
  useEffect(() => {
    if (!hasApiKey || !placesLib || !routesLib || initialSearchRanRef.current) {
      return;
    }
    initialSearchRanRef.current = true;
    void runPlacesSearch(DEFAULT_SEARCH_QUERY);
  }, [hasApiKey, placesLib, routesLib, runPlacesSearch]);

  const handleSelectPreset = useCallback((presetId: string) => {
    setSelectedPresetId(presetId);
    setLastClockIn(null);
    const preset = WORKER_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      panSeqRef.current += 1;
      setPanTarget({
        center: preset.position,
        zoom: 13,
        seq: panSeqRef.current,
      });
    }
  }, []);

  const handleClockIn = useCallback(() => {
    if (!matchedZone) return;
    setLastClockIn({
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      zoneName: matchedZone.name,
      address: workerAddress,
      position: workerPosition,
    });
  }, [matchedZone, workerAddress, workerPosition]);

  const handleFocusZone = useCallback((zone: GeofenceZone) => {
    panSeqRef.current += 1;
    setPanTarget({
      center: getPolygonCentroid(zone.path),
      zoom: 15,
      seq: panSeqRef.current,
    });
  }, []);

  const handleFocusAuditSite = useCallback((site: AuditSite) => {
    panSeqRef.current += 1;
    setPanTarget({
      center: site.location,
      zoom: 14,
      seq: panSeqRef.current,
    });
    setSelectedMarkerId(site.id);
  }, []);

  const handleAddPlaceFromAutocomplete = useCallback(
    (site: AuditSite) => {
      setAuditSites((prev) => {
        if (prev.some((existing) => existing.id === site.id)) {
          return prev;
        }
        const updated = [...prev, site];
        void computeOptimizedRoute(updated, workerPosition);
        return updated;
      });
      panSeqRef.current += 1;
      setPanTarget({
        center: site.location,
        zoom: 14,
        seq: panSeqRef.current,
      });
    },
    [computeOptimizedRoute, workerPosition],
  );

  const handleRemoveAuditSite = useCallback(
    (siteId: string) => {
      setAuditSites((prev) => {
        const updated = prev.filter((site) => site.id !== siteId);
        if (updated.length >= 2) {
          void computeOptimizedRoute(updated, workerPosition);
        } else {
          setActiveRoute(null);
          setRouteSummary(null);
        }
        return updated;
      });
      if (selectedMarkerId === siteId) {
        setSelectedMarkerId(null);
      }
    },
    [computeOptimizedRoute, workerPosition, selectedMarkerId],
  );

  const handleClearDrawn = useCallback(() => {
    setClearDrawSignal((seq) => seq + 1);
  }, []);

  return (
    <div className="app-shell">
      <TopHeaderBar
        activeZoneCount={allZones.length}
        matchedZone={matchedZone}
        routeSummary={routeSummary}
      />

      <main className="workspace-grid">
        <OperationsSidebar
          hasApiKey={hasApiKey}
          presets={WORKER_PRESETS}
          selectedPresetId={selectedPresetId}
          onSelectPreset={handleSelectPreset}
          workerPosition={workerPosition}
          workerAddress={workerAddress}
          isGeocoding={isGeocoding}
          matchedZone={matchedZone}
          lastClockIn={lastClockIn}
          onClockIn={handleClockIn}
          allZones={allZones}
          onFocusZone={handleFocusZone}
          terraDrawReady={terraDrawReady}
          terraDrawMode={terraDrawMode}
          onSetTerraDrawMode={setTerraDrawMode}
          onClearDrawnZones={handleClearDrawn}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSearchSites={() => void runPlacesSearch(searchQuery)}
          isSearchingSites={isSearchingSites}
          onAddPlaceFromAutocomplete={handleAddPlaceFromAutocomplete}
          auditSites={auditSites}
          onRemoveAuditSite={handleRemoveAuditSite}
          onFocusAuditSite={handleFocusAuditSite}
          onOptimizeRoute={() =>
            void computeOptimizedRoute(auditSites, workerPosition)
          }
          isComputingRoute={isComputingRoute}
          routeSummary={routeSummary}
          routeError={routeError}
        />

        {hasApiKey ? (
          <AustinOperationsMap
            allZones={allZones}
            matchedZone={matchedZone}
            workerPosition={workerPosition}
            workerAddress={workerAddress}
            auditSites={auditSites}
            route={activeRoute}
            routeSummary={routeSummary}
            terraDrawReady={terraDrawReady}
            terraDrawMode={terraDrawMode}
            clearDrawSignal={clearDrawSignal}
            drawnZoneCount={drawnZones.length}
            panTarget={panTarget}
            selectedMarkerId={selectedMarkerId}
            onSelectMarkerId={setSelectedMarkerId}
            onTerraDrawReadyChange={setTerraDrawReady}
            onTerraDrawModeChange={setTerraDrawMode}
            onDrawnZonesChange={setDrawnZones}
            onRequestMode={setTerraDrawMode}
            onRequestClearDrawn={handleClearDrawn}
            onPolygonClick={handleFocusZone}
          />
        ) : (
          <div id="map-container" className="map-container map-setup-fallback">
            <div className="setup-card">
              <h2>Google Maps API Key Required</h2>
              <p>
                Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in <code>.env.local</code>{' '}
                to render the Austin interactive map, Terra Draw polygon tools,
                Geocoder address lookup, Places Text Search, and Routes API
                waypoint optimization.
              </p>
              <ol>
                <li>
                  Mint a free prototyping key at{' '}
                  <a
                      href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Maps Demo Key
                  </a>
                  .
                </li>
                <li>
                  Copy <code>.env.example</code> to <code>.env.local</code> and
                  paste your key.
                </li>
                <li>Restart the Vite server.</li>
              </ol>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export function App() {
  if (!HAS_API_KEY) {
    return <AustinGeofencingWorkspace hasApiKey={false} />;
  }

  return (
    <APIProvider
      apiKey={RAW_API_KEY}
      libraries={['maps', 'marker', 'places', 'routes', 'geocoding', 'geometry']}
      language="en"
      region="US"
    >
      <AustinGeofencingWorkspace hasApiKey={true} />
    </APIProvider>
  );
}

export default App;
