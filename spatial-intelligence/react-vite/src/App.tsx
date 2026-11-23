import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useMap,
  useMapsLibrary
} from '@vis.gl/react-google-maps';
import { AlertTriangle, MousePointer, PenTool, Trash2 } from 'lucide-react';
import { NYC_DISTRICTS_GEOJSON, getDistrictFillColor } from './data/nycDistricts';
import { NYC_SENSORS } from './data/sensorGenerator';
import type {
  BasemapType,
  CivicHubPlace,
  DeckGlLayerMode,
  ElevationSamplePoint,
  ElevationSummary,
  SensorPoint,
  SensorSector,
  TerraDrawToolMode,
  ZoneAnalyticsSummary
} from './types/gis';
import {
  computePolygonAreaKm2,
  getBoundsForRing,
  getElevationSampleLocations,
  isPointInPolygon
} from './utils/geometry';
import { WorkbenchHeader } from './components/WorkbenchHeader';
import { AnalyticsSidebar } from './components/AnalyticsSidebar';
import { GeoJsonDistrictLayer } from './components/GeoJsonDistrictLayer';
import { DeckGlSensorsOverlay } from './components/DeckGlSensorsOverlay';
import { TerraDrawController } from './components/TerraDrawController';

const NYC_CENTER: google.maps.LatLngLiteral = { lat: 40.73061, lng: -73.98661 };
const INITIAL_ZOOM = 12;
const SEED_SEARCH_QUERY = 'New York City civic transit hub';

const DEFAULT_NYC_ELEVATION_TRANSECT: google.maps.LatLngLiteral[] = [
  { lat: 40.7061, lng: -74.0142 },
  { lat: 40.7195, lng: -74.0005 },
  { lat: 40.7348, lng: -73.9911 },
  { lat: 40.7505, lng: -73.9935 },
  { lat: 40.758, lng: -73.9855 },
  { lat: 40.745, lng: -73.952 },
  { lat: 40.768, lng: -73.925 },
  { lat: 40.7812, lng: -73.9665 }
];

const TOTAL_NYC_DISTRICT_AREA_KM2 = NYC_DISTRICTS_GEOJSON.features.reduce(
  (sum, feat) => sum + computePolygonAreaKm2(feat.geometry.coordinates[0]),
  0
);

interface MapServicesBridgeProps {
  basemap: BasemapType;
  selectedDistrictId: string | null;
  drawnPolygons: [number, number][][];
  elevationSampleNonce: number;
  fitBoundsTarget: google.maps.LatLngBoundsLiteral | null;
  panTarget: google.maps.LatLngLiteral | null;
  onCivicHubsLoaded: (hubs: CivicHubPlace[]) => void;
  onCivicHubsError: (message: string | null) => void;
  onElevationUpdate: (summary: ElevationSummary) => void;
}

/**
 * Bridges Google Maps JS SDK libraries (places, elevation) and camera commands inside <APIProvider>.
 */
const MapServicesBridge: React.FC<MapServicesBridgeProps> = ({
  basemap,
  selectedDistrictId,
  drawnPolygons,
  elevationSampleNonce,
  fitBoundsTarget,
  panTarget,
  onCivicHubsLoaded,
  onCivicHubsError,
  onElevationUpdate
}) => {
  const map = useMap();
  const placesLibrary = useMapsLibrary('places');
  const elevationLibrary = useMapsLibrary('elevation');
  const elevationServiceRef = useRef<google.maps.ElevationService | null>(null);
  const civicLoadedRef = useRef(false);

  // Sync basemap type smoothly
  useEffect(() => {
    if (!map) return;
    map.setMapTypeId(basemap);
  }, [map, basemap]);

  // Smooth zoom-to-bounds when district or viewport target changes
  useEffect(() => {
    if (!map || !fitBoundsTarget) return;
    map.fitBounds(fitBoundsTarget, { top: 48, right: 48, bottom: 48, left: 48 });
  }, [map, fitBoundsTarget]);

  // Pan smoothly when selecting a civic hub
  useEffect(() => {
    if (!map || !panTarget) return;
    map.panTo(panTarget);
    const currentZoom = map.getZoom() ?? INITIAL_ZOOM;
    if (currentZoom < 14) {
      map.setZoom(14);
    }
  }, [map, panTarget]);

  // Seed Places API (New) search for NYC civic transit hubs
  useEffect(() => {
    if (!placesLibrary || civicLoadedRef.current) return;
    civicLoadedRef.current = true;

    let cancelled = false;
    void placesLibrary.Place.searchByText({
      textQuery: SEED_SEARCH_QUERY,
      fields: ['id', 'displayName', 'formattedAddress', 'location', 'types'],
      locationBias: { center: NYC_CENTER, radius: 12000 },
      maxResultCount: 6,
      language: 'en-US',
      region: 'us'
    })
      .then(({ places }) => {
        if (cancelled) return;
        const normalized: CivicHubPlace[] = places
          .filter((p) => Boolean(p.location))
          .map((p) => ({
            id: p.id,
            displayName: p.displayName ?? 'NYC Civic Hub',
            formattedAddress: p.formattedAddress ?? 'New York, NY',
            location: {
              lat: p.location!.lat(),
              lng: p.location!.lng()
            },
            types: p.types ?? []
          }));
        onCivicHubsLoaded(normalized);
        onCivicHubsError(null);
      })
      .catch(() => {
        if (!cancelled) {
          onCivicHubsError('Places API (New) query unavailable for current key/quota.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [placesLibrary, onCivicHubsLoaded, onCivicHubsError]);

  // Live Elevation API terrain sampling for drawn polygon, selected district, or city transect
  useEffect(() => {
    if (!elevationLibrary) return;

    if (!elevationServiceRef.current) {
      elevationServiceRef.current = new elevationLibrary.ElevationService();
    }

    let locations = DEFAULT_NYC_ELEVATION_TRANSECT;
    let sourceLabel = 'NYC Mid-Harbor Transect';

    if (drawnPolygons.length > 0) {
      const latestRing = drawnPolygons[drawnPolygons.length - 1];
      locations = getElevationSampleLocations(latestRing, 12);
      sourceLabel = 'Custom Terra Draw Zone';
    } else if (selectedDistrictId) {
      const dist = NYC_DISTRICTS_GEOJSON.features.find(
        (d) => d.properties.districtId === selectedDistrictId
      );
      if (dist) {
        locations = getElevationSampleLocations(dist.geometry.coordinates[0], 10);
        sourceLabel = dist.properties.name;
      }
    }

    if (!locations.length) return;

    let cancelled = false;
    onElevationUpdate({
      status: 'loading',
      sourceLabel,
      minMeters: null,
      meanMeters: null,
      maxMeters: null,
      resolutionMeters: null,
      samples: []
    });

    void elevationServiceRef.current
      .getElevationForLocations({ locations })
      .then(({ results }) => {
        if (cancelled) return;

        const samples: ElevationSamplePoint[] = results.map((res, idx) => ({
          lat: res.location ? res.location.lat() : locations[idx].lat,
          lng: res.location ? res.location.lng() : locations[idx].lng,
          elevation: res.elevation,
          resolution: res.resolution
        }));

        if (!samples.length) {
          onElevationUpdate({
            status: 'unavailable',
            sourceLabel,
            minMeters: null,
            meanMeters: null,
            maxMeters: null,
            resolutionMeters: null,
            samples: [],
            errorMessage: 'No elevation samples returned.'
          });
          return;
        }

        const values = samples.map((s) => s.elevation);
        const minMeters = Math.min(...values);
        const maxMeters = Math.max(...values);
        const meanMeters = values.reduce((acc, v) => acc + v, 0) / values.length;
        const resolutionMeters = samples[0]?.resolution ?? null;

        onElevationUpdate({
          status: 'ready',
          sourceLabel,
          minMeters,
          meanMeters,
          maxMeters,
          resolutionMeters,
          samples
        });
      })
      .catch(() => {
        if (!cancelled) {
          onElevationUpdate({
            status: 'error',
            sourceLabel,
            minMeters: null,
            meanMeters: null,
            maxMeters: null,
            resolutionMeters: null,
            samples: [],
            errorMessage: 'Elevation API unavailable for the active API key.'
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    elevationLibrary,
    drawnPolygons,
    selectedDistrictId,
    elevationSampleNonce,
    onElevationUpdate
  ]);

  return null;
};

export function App() {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
  const hasApiKey = Boolean(apiKey && apiKey !== 'your_google_maps_api_key_here');

  const [basemap, setBasemap] = useState<BasemapType>('roadmap');
  const [deckMode, setDeckMode] = useState<DeckGlLayerMode>('scatterplot');
  const [showGeoJson, setShowGeoJson] = useState<boolean>(true);
  const [drawMode, setDrawMode] = useState<TerraDrawToolMode>('static');
  const [clearDrawSignal, setClearDrawSignal] = useState<number>(0);

  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [drawnPolygons, setDrawnPolygons] = useState<[number, number][][]>([]);
  const [fitBoundsTarget, setFitBoundsTarget] =
    useState<google.maps.LatLngBoundsLiteral | null>(null);
  const [panTarget, setPanTarget] = useState<google.maps.LatLngLiteral | null>(null);

  const [elevationSampleNonce, setElevationSampleNonce] = useState<number>(0);
  const [elevationSummary, setElevationSummary] = useState<ElevationSummary>({
    status: 'idle',
    sourceLabel: 'NYC Mid-Harbor Transect',
    minMeters: null,
    meanMeters: null,
    maxMeters: null,
    resolutionMeters: null,
    samples: []
  });

  const [civicHubs, setCivicHubs] = useState<CivicHubPlace[]>([]);
  const [civicHubsLoading, setCivicHubsLoading] = useState<boolean>(hasApiKey);
  const [civicHubsError, setCivicHubsError] = useState<string | null>(null);
  const [selectedCivicHub, setSelectedCivicHub] = useState<CivicHubPlace | null>(null);
  const [autocompletePlace, setAutocompletePlace] = useState<CivicHubPlace | null>(null);

  const [hoveredSensor, setHoveredSensor] = useState<SensorPoint | null>(null);
  const [webglAvailable, setWebglAvailable] = useState<boolean>(true);

  const handleCivicHubsLoaded = useCallback((hubs: CivicHubPlace[]) => {
    setCivicHubs(hubs);
    setCivicHubsLoading(false);
  }, []);

  const handleCivicHubsError = useCallback((message: string | null) => {
    setCivicHubsError(message);
    if (message) {
      setCivicHubsLoading(false);
    }
  }, []);

  const handleSelectDistrict = useCallback((districtId: string) => {
    const feature = NYC_DISTRICTS_GEOJSON.features.find(
      (f) => f.properties.districtId === districtId
    );
    if (!feature) return;

    setSelectedDistrictId(districtId);
    setDrawnPolygons([]);
    setClearDrawSignal((prev) => prev + 1);
    setDrawMode('static');
    setFitBoundsTarget(getBoundsForRing(feature.geometry.coordinates[0]));
  }, []);

  const handleResetCitywide = useCallback(() => {
    setSelectedDistrictId(null);
    setDrawnPolygons([]);
    setClearDrawSignal((prev) => prev + 1);
    setDrawMode('static');
    setFitBoundsTarget({
      north: 40.832,
      south: 40.675,
      east: -73.88,
      west: -74.025
    });
  }, []);

  const handleClearTerraDraw = useCallback(() => {
    setDrawnPolygons([]);
    setDrawMode('static');
    setClearDrawSignal((prev) => prev + 1);
  }, []);

  const handlePolygonsChange = useCallback((rings: [number, number][][]) => {
    setDrawnPolygons(rings);
    if (rings.length > 0) {
      setSelectedDistrictId(null);
    }
  }, []);

  const handleSelectCivicHub = useCallback((hub: CivicHubPlace) => {
    setSelectedCivicHub(hub);
    setPanTarget({ ...hub.location });
  }, []);

  const handleAutocompleteSelect = useCallback((place: CivicHubPlace) => {
    setAutocompletePlace(place);
    setSelectedCivicHub(place);
  }, []);

  // Compute filtered sensors and KPI summary reactively
  const { activeSensorIds, analytics } = useMemo(() => {
    let scopeType: ZoneAnalyticsSummary['scopeType'] = 'citywide';
    let scopeLabel = 'New York City Metro Grid';
    let areaKm2 = TOTAL_NYC_DISTRICT_AREA_KM2;
    let filtered: SensorPoint[] = NYC_SENSORS;

    if (drawnPolygons.length > 0) {
      scopeType = 'terradraw';
      scopeLabel = `Custom Study Zone (${drawnPolygons.length} polygon${drawnPolygons.length > 1 ? 's' : ''})`;
      areaKm2 = drawnPolygons.reduce((sum, ring) => sum + computePolygonAreaKm2(ring), 0);
      filtered = NYC_SENSORS.filter((sensor) =>
        drawnPolygons.some((ring) => isPointInPolygon(sensor.lng, sensor.lat, [ring]))
      );
    } else if (selectedDistrictId) {
      const dist = NYC_DISTRICTS_GEOJSON.features.find(
        (d) => d.properties.districtId === selectedDistrictId
      );
      if (dist) {
        scopeType = 'district';
        scopeLabel = dist.properties.name;
        areaKm2 = computePolygonAreaKm2(dist.geometry.coordinates[0]);
        filtered = NYC_SENSORS.filter((sensor) =>
          isPointInPolygon(sensor.lng, sensor.lat, dist.geometry.coordinates)
        );
      }
    }

    const idMap: Record<string, true> | null =
      scopeType === 'citywide'
        ? null
        : filtered.reduce<Record<string, true>>((acc, s) => {
            acc[s.id] = true;
            return acc;
          }, {});

    const sectorBreakdown: Record<SensorSector, number> = {
      power: 0,
      transit: 0,
      telecom: 0,
      water: 0
    };

    let sumLoad = 0;
    let peakLoad = 0;
    let criticalCount = 0;

    for (const s of filtered) {
      sumLoad += s.capacityLoad;
      if (s.capacityLoad > peakLoad) peakLoad = s.capacityLoad;
      if (s.capacityLoad >= 84) criticalCount++;
      sectorBreakdown[s.sector]++;
    }

    const avgCapacityLoad = filtered.length ? sumLoad / filtered.length : 0;

    const summary: ZoneAnalyticsSummary = {
      scopeLabel,
      scopeType,
      sensorCount: filtered.length,
      totalSensors: NYC_SENSORS.length,
      avgCapacityLoad,
      peakCapacityLoad: peakLoad,
      criticalCount,
      areaKm2,
      sectorBreakdown
    };

    return { activeSensorIds: idMap, analytics: summary };
  }, [drawnPolygons, selectedDistrictId]);

  const workbenchContent = (
    <div className="workbench-shell">
      <WorkbenchHeader
        hasApiKey={hasApiKey}
        basemap={basemap}
        onBasemapChange={setBasemap}
        deckMode={deckMode}
        onDeckModeChange={setDeckMode}
        showGeoJson={showGeoJson}
        onToggleGeoJson={() => setShowGeoJson((prev) => !prev)}
        onAutocompleteSelect={handleAutocompleteSelect}
      />

      <div className="workbench-body">
        <AnalyticsSidebar
          analytics={analytics}
          elevation={elevationSummary}
          districts={NYC_DISTRICTS_GEOJSON.features}
          selectedDistrictId={selectedDistrictId}
          civicHubs={civicHubs}
          civicHubsLoading={civicHubsLoading}
          civicHubsError={civicHubsError}
          selectedCivicHubId={selectedCivicHub?.id ?? null}
          hasApiKey={hasApiKey}
          onSelectDistrict={handleSelectDistrict}
          onResetCitywide={handleResetCitywide}
          onSampleElevation={() => setElevationSampleNonce((n) => n + 1)}
          onSelectCivicHub={handleSelectCivicHub}
        />

        <main className="map-pane">
          <div className="map-canvas-container" data-testid="map-canvas">
            {hasApiKey ? (
              <GoogleMap
                defaultCenter={NYC_CENTER}
                defaultZoom={INITIAL_ZOOM}
                mapId="DEMO_MAP_ID"
                mapTypeId={basemap}
                internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
                gestureHandling="greedy"
                mapTypeControl={false}
                streetViewControl={false}
                fullscreenControl={false}
                style={{ width: '100%', height: '100%' }}
              >
                <MapServicesBridge
                  basemap={basemap}
                  selectedDistrictId={selectedDistrictId}
                  drawnPolygons={drawnPolygons}
                  elevationSampleNonce={elevationSampleNonce}
                  fitBoundsTarget={fitBoundsTarget}
                  panTarget={panTarget}
                  onCivicHubsLoaded={handleCivicHubsLoaded}
                  onCivicHubsError={handleCivicHubsError}
                  onElevationUpdate={setElevationSummary}
                />

                <GeoJsonDistrictLayer
                  visible={showGeoJson}
                  selectedDistrictId={selectedDistrictId}
                  onSelectDistrict={handleSelectDistrict}
                />

                <DeckGlSensorsOverlay
                  allSensors={NYC_SENSORS}
                  activeSensorIds={activeSensorIds}
                  mode={deckMode}
                  isDrawingMode={drawMode !== 'static'}
                  onHoverSensor={setHoveredSensor}
                  onWebGLStatusChange={setWebglAvailable}
                />

                <TerraDrawController
                  activeMode={drawMode}
                  clearSignal={clearDrawSignal}
                  onPolygonsChange={handlePolygonsChange}
                  onModeAutoSwitch={setDrawMode}
                />

                {civicHubs.map((hub) => (
                  <AdvancedMarker
                    key={hub.id}
                    position={hub.location}
                    title={hub.displayName}
                    onClick={() => handleSelectCivicHub(hub)}
                  >
                    <Pin
                      background={selectedCivicHub?.id === hub.id ? '#38bdf8' : '#0f172a'}
                      borderColor="#38bdf8"
                      glyphColor={selectedCivicHub?.id === hub.id ? '#0f172a' : '#f8fafc'}
                    />
                  </AdvancedMarker>
                ))}

                {autocompletePlace && (
                  <AdvancedMarker
                    position={autocompletePlace.location}
                    title={autocompletePlace.displayName}
                    onClick={() => setSelectedCivicHub(autocompletePlace)}
                  >
                    <Pin background="#10b981" borderColor="#ecfdf5" glyphColor="#064e3b" />
                  </AdvancedMarker>
                )}

                {selectedCivicHub && (
                  <InfoWindow
                    position={selectedCivicHub.location}
                    onCloseClick={() => setSelectedCivicHub(null)}
                  >
                    <div style={{ color: '#0f172a', maxWidth: 230, fontFamily: 'Inter, sans-serif' }}>
                      <strong style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
                        {selectedCivicHub.displayName}
                      </strong>
                      <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.4 }}>
                        {selectedCivicHub.formattedAddress}
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            ) : (
              <div className="api-key-overlay">
                <div className="api-key-card">
                  <h2>Google Maps API Key Required</h2>
                  <p>
                    Add your Maps JavaScript API key to <code>.env.local</code> as{' '}
                    <code>VITE_GOOGLE_MAPS_API_KEY</code> to launch the live NYC map, GeoJSON
                    district layer, deck.gl WebGL sensor overlay, Terra Draw study-zone tool,
                    Places API (New), and Elevation API profiler.
                  </p>
                  <p>
                    Need a free prototyping key with zero billing setup?{' '}
                    <a
                        href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Generate a free Maps Demo Key
                    </a>{' '}
                    and copy <code>.env.example</code> to <code>.env.local</code>.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Floating Terra Draw Polygon Toolbar */}
          <div
            className="terradraw-toolbar"
            role="toolbar"
            aria-label="Terra Draw study zone tools"
            data-testid="terradraw-toolbar"
          >
            <button
              type="button"
              data-testid="terradraw-polygon-btn"
              className={`draw-btn ${drawMode === 'polygon' ? 'active' : ''}`}
              aria-pressed={drawMode === 'polygon'}
              disabled={!hasApiKey}
              onClick={() => setDrawMode((m) => (m === 'polygon' ? 'static' : 'polygon'))}
            >
              <PenTool size={14} />
              <span>Draw Polygon</span>
            </button>

            <button
              type="button"
              data-testid="terradraw-select-btn"
              className={`draw-btn ${drawMode === 'select' ? 'active' : ''}`}
              aria-pressed={drawMode === 'select'}
              disabled={!hasApiKey}
              onClick={() => setDrawMode((m) => (m === 'select' ? 'static' : 'select'))}
            >
              <MousePointer size={14} />
              <span>Select / Edit</span>
            </button>

            <button
              type="button"
              data-testid="terradraw-clear-btn"
              className="draw-btn danger"
              disabled={!hasApiKey && drawnPolygons.length === 0}
              onClick={handleClearTerraDraw}
            >
              <Trash2 size={14} />
              <span>Clear Zone</span>
            </button>
          </div>

          {/* Hover Sensor Readout */}
          {hoveredSensor && (
            <div className="sensor-hover-card" role="status">
              <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: 4 }}>
                {hoveredSensor.id}
              </div>
              <div style={{ color: '#cbd5e1', fontSize: 11.5 }}>
                Sector: <strong style={{ textTransform: 'capitalize' }}>{hoveredSensor.sector}</strong>
              </div>
              <div style={{ color: '#cbd5e1', fontSize: 11.5 }}>
                Load: <strong>{hoveredSensor.capacityLoad.toFixed(1)}%</strong> (
                {hoveredSensor.status})
              </div>
            </div>
          )}

          {/* Floating Capacity & Layer Legend */}
          <div className="map-legend">
            <div className="legend-title">District & Sensor Load</div>
            <div className="legend-row">
              <span className="legend-item">
                <span className="swatch" style={{ background: getDistrictFillColor(55) }} />
                &lt;66% Optimal
              </span>
              <span className="legend-item">
                <span className="swatch" style={{ background: getDistrictFillColor(74) }} />
                66–81% Elevated
              </span>
              <span className="legend-item">
                <span className="swatch" style={{ background: getDistrictFillColor(90) }} />
                &ge;82% Critical
              </span>
            </div>
            {!webglAvailable && (
              <div className="webgl-fallback-pill">
                <AlertTriangle size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                WebGL2 unavailable — deck.gl layer safely bypassed
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );

  if (!hasApiKey) {
    return workbenchContent;
  }

  return (
    <APIProvider
      apiKey={apiKey}
      libraries={['places', 'marker', 'elevation']}
      language="en"
      region="US"
    >
      {workbenchContent}
    </APIProvider>
  );
}

export default App;
