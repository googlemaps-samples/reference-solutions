import { useCallback, useEffect, useRef, useState } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  type MapMouseEvent,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { HeaderBar } from './components/HeaderBar';
import { IncidentReporterCard } from './components/IncidentReporterCard';
import { MapLegend } from './components/MapLegend';
import { RouteSummaryCard } from './components/RouteSummaryCard';
import { ShelterListCard } from './components/ShelterListCard';
import { DeckGlHeatmapOverlay } from './components/map/DeckGlHeatmapOverlay';
import { EvacuationRouteLayer } from './components/map/EvacuationRouteLayer';
import { FloodZonePolygons } from './components/map/FloodZonePolygons';
import { ShelterMarkers } from './components/map/ShelterMarkers';
import {
  INITIAL_HAZARD_INCIDENTS,
  INITIAL_MIAMI_ZOOM,
  MIAMI_CENTER,
  MIAMI_FLOOD_ZONES,
  SEED_SHELTER_QUERY,
} from './data/miamiHazards';
import { enrichIncidentLocation } from './services/enrichmentService';
import { computeEvacuationRoute } from './services/routingService';
import { searchEmergencyShelters } from './services/shelterService';
import { fetchCurrentWeather } from './services/weatherService';
import type {
  EvacuationRouteState,
  HazardIncident,
  HazardType,
  IncidentDraft,
  LatLngPoint,
  ShelterPlace,
  WeatherSnapshot,
} from './types/hazard';
import './App.css';

interface FloodWatchWorkspaceProps {
  apiKey: string;
}

function FloodWatchWorkspace({ apiKey }: FloodWatchWorkspaceProps) {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');
  const geocodingLib = useMapsLibrary('geocoding');
  const elevationLib = useMapsLibrary('elevation');
  const geometryLib = useMapsLibrary('geometry');

  const [incidents, setIncidents] = useState<HazardIncident[]>(INITIAL_HAZARD_INCIDENTS);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showPolygons, setShowPolygons] = useState<boolean>(true);
  const [rendererMode, setRendererMode] = useState<'webgl2' | 'canvas-fallback'>('webgl2');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  const [miamiWeather, setMiamiWeather] = useState<WeatherSnapshot | null>(null);
  const [incidentDraft, setIncidentDraft] = useState<IncidentDraft | null>(null);
  const [lastSubmittedId, setLastSubmittedId] = useState<string | null>(null);

  const [shelters, setShelters] = useState<ShelterPlace[]>([]);
  const [sheltersLoading, setSheltersLoading] = useState<boolean>(false);
  const [sheltersError, setSheltersError] = useState<string | null>(null);
  const [shelterQuery, setShelterQuery] = useState<string>(SEED_SHELTER_QUERY);
  const [selectedShelterId, setSelectedShelterId] = useState<string | null>(null);

  const [avoidFloodEnabled, setAvoidFloodEnabled] = useState<boolean>(true);
  const [activeRoute, setActiveRoute] = useState<EvacuationRouteState | null>(null);
  const [routingLoading, setRoutingLoading] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const enrichAbortRef = useRef<AbortController | null>(null);
  const initialSheltersLoadedRef = useRef<boolean>(false);
  const initialEnrichLoadedRef = useRef<boolean>(false);

  // Fetch baseline Miami weather for the top bar
  useEffect(() => {
    if (!apiKey) return undefined;
    const controller = new AbortController();
    fetchCurrentWeather(MIAMI_CENTER, apiKey, controller.signal)
      .then(setMiamiWeather)
      .catch(() => {
        // Ignore abort / network errors cleanly
      });
    return () => controller.abort();
  }, [apiKey]);

  // Enrich any clicked / selected location in parallel
  const triggerLocationEnrichment = useCallback(
    async (location: LatLngPoint, presetAddress?: string) => {
      enrichAbortRef.current?.abort();
      const controller = new AbortController();
      enrichAbortRef.current = controller;

      setLastSubmittedId(null);
      setIncidentDraft({
        location,
        address: presetAddress ?? 'Resolving street address...',
        elevationMeters: null,
        weather: null,
        insideFloodZoneName: null,
        loading: true,
      });

      try {
        const result = await enrichIncidentLocation({
          location,
          apiKey,
          floodZones: MIAMI_FLOOD_ZONES,
          geocodingLib,
          elevationLib,
          geometryLib,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        setIncidentDraft({
          location,
          address: presetAddress && result.address.includes('Miami, FL') === false
            ? presetAddress
            : result.address,
          elevationMeters: result.elevationMeters,
          weather: result.weather,
          insideFloodZoneName: result.insideFloodZoneName,
          loading: false,
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setIncidentDraft((prev) =>
          prev
            ? { ...prev, loading: false, error: 'Partial telemetry available.' }
            : null
        );
      }
    },
    [apiKey, geocodingLib, elevationLib, geometryLib]
  );

  // Seed initial incident enrichment at Miami center once libraries load
  useEffect(() => {
    if (!apiKey || initialEnrichLoadedRef.current) return;
    if (!geocodingLib || !elevationLib) return;
    initialEnrichLoadedRef.current = true;
    void triggerLocationEnrichment(MIAMI_CENTER);
  }, [apiKey, geocodingLib, elevationLib, triggerLocationEnrichment]);

  // Load nearby emergency shelters on startup via Places API (New)
  const runShelterSearch = useCallback(
    async (queryText: string, originPoint?: LatLngPoint): Promise<ShelterPlace[]> => {
      if (!placesLib) return [];
      setShelterQuery(queryText);
      setSheltersLoading(true);
      setSheltersError(null);
      try {
        const results = await searchEmergencyShelters({
          query: queryText,
          origin: originPoint ?? incidentDraft?.location ?? MIAMI_CENTER,
          placesLib,
          geometryLib,
          floodZones: MIAMI_FLOOD_ZONES,
        });
        setShelters(results);
        return results;
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Unable to query nearby shelters via Places API (New).';
        setSheltersError(msg);
        return [];
      } finally {
        setSheltersLoading(false);
      }
    },
    [placesLib, geometryLib, incidentDraft?.location]
  );

  useEffect(() => {
    if (!apiKey || !placesLib || initialSheltersLoadedRef.current) return;
    initialSheltersLoadedRef.current = true;
    void runShelterSearch(SEED_SHELTER_QUERY, MIAMI_CENTER);
  }, [apiKey, placesLib, runShelterSearch]);

  const handleMapClick = useCallback(
    (event: MapMouseEvent) => {
      const latLng = event.detail?.latLng;
      if (!latLng) return;
      void triggerLocationEnrichment({ lat: latLng.lat, lng: latLng.lng });
    },
    [triggerLocationEnrichment]
  );

  const handleAddressSelect = useCallback(
    (location: LatLngPoint, label: string) => {
      map?.panTo(location);
      map?.setZoom(14);
      void triggerLocationEnrichment(location, label);
    },
    [map, triggerLocationEnrichment]
  );

  const handleSubmitIncident = useCallback(
    (payload: { type: HazardType; weight: number; note: string }) => {
      if (!incidentDraft) return;
      const newId = `user-inc-${Date.now()}`;
      const newIncident: HazardIncident = {
        id: newId,
        lat: incidentDraft.location.lat,
        lng: incidentDraft.location.lng,
        weight: payload.weight,
        type: payload.type,
        address: incidentDraft.address,
        elevationMeters: incidentDraft.elevationMeters,
        weatherSummary: incidentDraft.weather?.conditionText,
        note: payload.note || undefined,
        reportedAt: 'Just now',
        isUserReported: true,
      };
      setIncidents((prev) => [newIncident, ...prev]);
      setLastSubmittedId(newId);
    },
    [incidentDraft]
  );

  const calculateRouteToShelter = useCallback(
    async (shelter: ShelterPlace, avoidFlood: boolean) => {
      if (!routesLib) {
        setRouteError('Routes library is still initializing.');
        return;
      }
      const origin = incidentDraft?.location ?? MIAMI_CENTER;
      setSelectedShelterId(shelter.id);
      setRoutingLoading(true);
      setRouteError(null);

      try {
        const computed = await computeEvacuationRoute({
          origin,
          destination: shelter,
          avoidFloodEnabled: avoidFlood,
          floodZones: MIAMI_FLOOD_ZONES,
          routesLib,
          geometryLib,
        });
        setActiveRoute(computed);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Unable to calculate evacuation route via Routes API.';
        setRouteError(msg);
      } finally {
        setRoutingLoading(false);
      }
    },
    [routesLib, geometryLib, incidentDraft?.location]
  );

  const handleFindSafeShelter = useCallback(async () => {
    const origin = incidentDraft?.location ?? MIAMI_CENTER;
    let list = shelters;
    if (list.length === 0 && placesLib) {
      list = await runShelterSearch(SEED_SHELTER_QUERY, origin);
    }
    if (list.length === 0) {
      setRouteError('No emergency shelters available to route to yet.');
      return;
    }
    const safeCandidate = list.find((s) => !s.insideFloodZone) ?? list[0];
    await calculateRouteToShelter(safeCandidate, avoidFloodEnabled);
  }, [
    incidentDraft?.location,
    shelters,
    placesLib,
    runShelterSearch,
    calculateRouteToShelter,
    avoidFloodEnabled,
  ]);

  const handleToggleAvoidFlood = useCallback(
    (enabled: boolean) => {
      setAvoidFloodEnabled(enabled);
      if (activeRoute) {
        void calculateRouteToShelter(activeRoute.destination, enabled);
      }
    },
    [activeRoute, calculateRouteToShelter]
  );

  return (
    <div className="app-shell">
      <HeaderBar
        miamiWeather={miamiWeather}
        showHeatmap={showHeatmap}
        showPolygons={showPolygons}
        findingShelter={routingLoading}
        sidebarOpen={sidebarOpen}
        incidentCount={incidents.length}
        onToggleHeatmap={() => setShowHeatmap((prev) => !prev)}
        onTogglePolygons={() => setShowPolygons((prev) => !prev)}
        onFindSafeShelter={() => void handleFindSafeShelter()}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />

      <main className="dashboard-main">
        <aside className={`control-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
          <IncidentReporterCard
            draft={incidentDraft}
            lastSubmittedId={lastSubmittedId}
            onSelectAddressLocation={handleAddressSelect}
            onSubmitReport={handleSubmitIncident}
          />

          <RouteSummaryCard
            route={activeRoute}
            routingLoading={routingLoading}
            routeError={routeError}
            avoidFloodEnabled={avoidFloodEnabled}
            onToggleAvoidFlood={handleToggleAvoidFlood}
          />

          <ShelterListCard
            shelters={shelters}
            selectedShelterId={selectedShelterId}
            loading={sheltersLoading}
            error={sheltersError}
            searchQuery={shelterQuery}
            onSearchShelters={(q) => void runShelterSearch(q)}
            onRouteToShelter={(shelter) => void calculateRouteToShelter(shelter, avoidFloodEnabled)}
          />
        </aside>

        <section
          id="map-container"
          data-testid="map-container"
          className="map-canvas-section"
          aria-label="Interactive Miami Hazard and Shelter Map"
        >
          {!apiKey ? (
            <div className="missing-key-overlay">
              <div className="missing-key-card">
                <h2>Google Maps API Key Required</h2>
                <p>
                  Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in <code>.env.local</code> to load the interactive Miami map, deck.gl HeatmapLayer, Places API (New) shelters, and Routes API evacuation paths.
                </p>
                <p>
                  You can obtain a free prototyping key at{' '}
                  <a
                    href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Maps Demo Key
                  </a>
                  .
                </p>
              </div>
            </div>
          ) : (
            <GoogleMap
              defaultCenter={MIAMI_CENTER}
              defaultZoom={INITIAL_MIAMI_ZOOM}
              mapId="DEMO_MAP_ID"
                internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
              gestureHandling="greedy"
              streetViewControl={false}
              mapTypeControl={true}
              fullscreenControl={true}
              onClick={handleMapClick}
              style={{ width: '100%', height: '100%' }}
            >
              <DeckGlHeatmapOverlay
                incidents={incidents}
                visible={showHeatmap}
                onRendererModeChange={setRendererMode}
              />

              <FloodZonePolygons
                zones={MIAMI_FLOOD_ZONES}
                visible={showPolygons}
                onPolygonClick={(loc) => void triggerLocationEnrichment(loc)}
              />

              <EvacuationRouteLayer route={activeRoute} />

              <ShelterMarkers
                shelters={shelters}
                selectedShelterId={selectedShelterId}
                incidentLocation={incidentDraft?.location ?? null}
                onSelectShelter={(s) => setSelectedShelterId(s.id)}
                onRouteToShelter={(s) => void calculateRouteToShelter(s, avoidFloodEnabled)}
              />
            </GoogleMap>
          )}

          <MapLegend rendererMode={rendererMode} />
        </section>
      </main>
    </div>
  );
}

function MissingKeyWorkspace() {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showPolygons, setShowPolygons] = useState<boolean>(true);

  return (
    <div className="app-shell">
      <HeaderBar
        miamiWeather={null}
        showHeatmap={showHeatmap}
        showPolygons={showPolygons}
        findingShelter={false}
        sidebarOpen={sidebarOpen}
        incidentCount={INITIAL_HAZARD_INCIDENTS.length}
        onToggleHeatmap={() => setShowHeatmap((prev) => !prev)}
        onTogglePolygons={() => setShowPolygons((prev) => !prev)}
        onFindSafeShelter={() => {}}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />

      <main className="dashboard-main">
        <aside className={`control-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
          <section
            id="incident-report-panel"
            data-testid="incident-report-panel"
            className="sidebar-card"
          >
            <div className="card-header">
              <div className="card-title-row">
                <h2>Civic Incident Reporter</h2>
              </div>
              <span className="card-badge">API Key Needed</span>
            </div>
            <p className="card-hint">
              Configure <code>VITE_GOOGLE_MAPS_API_KEY</code> in <code>.env.local</code> to enable interactive map clicks, reverse geocoding, elevation lookup, and live weather telemetry.
            </p>
          </section>

          <RouteSummaryCard
            route={null}
            routingLoading={false}
            routeError={null}
            avoidFloodEnabled={true}
            onToggleAvoidFlood={() => {}}
          />

          <ShelterListCard
            shelters={[]}
            selectedShelterId={null}
            loading={false}
            error={null}
            searchQuery={SEED_SHELTER_QUERY}
            onSearchShelters={() => {}}
            onRouteToShelter={() => {}}
          />
        </aside>

        <section
          id="map-container"
          data-testid="map-container"
          className="map-canvas-section"
          aria-label="Interactive Miami Hazard and Shelter Map"
        >
          <div className="missing-key-overlay">
            <div className="missing-key-card">
              <h2>Google Maps API Key Required</h2>
              <p>
                Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in <code>.env.local</code> to load the interactive Miami map, deck.gl HeatmapLayer, Places API (New) shelters, and Routes API evacuation paths.
              </p>
              <p>
                You can obtain a free prototyping key at{' '}
                <a
                  href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
                  target="_blank"
                  rel="noreferrer"
                >
                  Maps Demo Key
                </a>
                .
              </p>
            </div>
          </div>
          <MapLegend rendererMode="canvas-fallback" />
        </section>
      </main>
    </div>
  );
}

export default function App() {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() ?? '';

  if (!apiKey) {
    return <MissingKeyWorkspace />;
  }

  return (
    <APIProvider apiKey={apiKey} version="weekly" language="en" region="US">
      <FloodWatchWorkspace apiKey={apiKey} />
    </APIProvider>
  );
}
