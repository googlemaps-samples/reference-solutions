'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  Activity,
  Building2,
  Compass,
  Eraser,
  Layers,
  MapPin,
  Mountain,
  MousePointerClick,
  Pentagon,
  RefreshCw,
  Satellite,
  X,
} from 'lucide-react';
import {
  DEFAULT_ELEVATION_TRANSECT,
  NYC_DISTRICTS_GEOJSON,
  NYC_INITIAL_CENTER,
  NYC_INITIAL_ZOOM,
  NYC_SENSOR_POINTS,
  SEED_SEARCH_QUERY,
  type DistrictProperties,
  type SensorPoint,
} from '@/lib/nyc-spatial-data';
import {
  computePolygonAreaKm2,
  getPolygonSampleLocations,
  isPointInRing,
  type GeoBounds,
  type LatLngPoint,
} from '@/lib/geometry';
import {
  DeckGlOverlay,
  type DeckLayerMode,
} from '@/components/DeckGlOverlay';
import { DistrictGeoJsonLayer } from '@/components/DistrictGeoJsonLayer';
import {
  PlaceSearchBox,
  type SelectedPlaceJump,
} from '@/components/PlaceSearchBox';
import {
  TerraDrawController,
  type DrawToolMode,
} from '@/components/TerraDrawController';
import type { PlaceSearchResultItem } from '@/app/api/places/search/route';
import type { ElevationSampleResult } from '@/app/api/elevation/route';

type BasemapType = 'roadmap' | 'satellite' | 'hybrid' | 'terrain';

interface ElevationSummary {
  minMeters: number;
  meanMeters: number;
  maxMeters: number;
  resolutionMeters: number;
  samples: ElevationSampleResult[];
  scopeLabel: string;
}

interface GisWorkbenchProps {
  apiKey: string;
}

const ALL_DISTRICTS: DistrictProperties[] = NYC_DISTRICTS_GEOJSON.features.map(
  (f) => f.properties
);

const TOTAL_CITY_AREA_KM2 = Number(
  ALL_DISTRICTS.reduce((sum, d) => sum + d.areaKm2, 0).toFixed(2)
);

/**
 * Synchronizes basemap type and programmatic fitBounds calls with the Map instance.
 */
const MapControllerSync: React.FC<{
  basemap: BasemapType;
  targetBounds: GeoBounds | null;
  targetCenter: LatLngPoint | null;
}> = ({ basemap, targetBounds, targetCenter }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.setMapTypeId(basemap);
  }, [map, basemap]);

  useEffect(() => {
    if (!map || !targetBounds) return;
    map.fitBounds(targetBounds, { top: 48, right: 48, bottom: 48, left: 48 });
  }, [map, targetBounds]);

  useEffect(() => {
    if (!map || !targetCenter) return;
    map.panTo(targetCenter);
    const currentZoom = map.getZoom() ?? NYC_INITIAL_ZOOM;
    if (currentZoom < 14) {
      map.setZoom(14);
    }
  }, [map, targetCenter]);

  return null;
};

export const GisWorkbench: React.FC<GisWorkbenchProps> = ({ apiKey }) => {
  const hasApiKey = Boolean(
    apiKey && apiKey.trim().length > 0 && apiKey !== 'your_google_maps_api_key_here'
  );

  const [basemap, setBasemap] = useState<BasemapType>('roadmap');
  const [deckMode, setDeckMode] = useState<DeckLayerMode>('scatterplot');
  const [showDeckGl, setShowDeckGl] = useState<boolean>(true);
  const [showGeoJson, setShowGeoJson] = useState<boolean>(true);
  const [webglAvailable, setWebglAvailable] = useState<boolean>(true);

  const [drawMode, setDrawMode] = useState<DrawToolMode>('static');
  const [terraDrawReady, setTerraDrawReady] = useState<boolean>(false);
  const [clearDrawTrigger, setClearDrawTrigger] = useState<number>(0);

  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(
    null
  );
  const [customPolygonRing, setCustomPolygonRing] = useState<
    [number, number][] | null
  >(null);
  const [fitBoundsTarget, setFitBoundsTarget] = useState<GeoBounds | null>(null);
  const [panCenterTarget, setPanCenterTarget] = useState<LatLngPoint | null>(
    null
  );

  const [civicPlaces, setCivicPlaces] = useState<PlaceSearchResultItem[]>([]);
  const [placesLoading, setPlacesLoading] = useState<boolean>(false);
  const [placesStatusMessage, setPlacesStatusMessage] = useState<string | null>(
    null
  );
  const [activePlaceMarker, setActivePlaceMarker] =
    useState<PlaceSearchResultItem | null>(null);
  const [jumpedPlace, setJumpedPlace] = useState<SelectedPlaceJump | null>(null);

  const [elevationSummary, setElevationSummary] =
    useState<ElevationSummary | null>(null);
  const [elevationLoading, setElevationLoading] = useState<boolean>(false);
  const [elevationMessage, setElevationMessage] = useState<string | null>(null);

  const selectedDistrict = useMemo(
    () => ALL_DISTRICTS.find((d) => d.id === selectedDistrictId) ?? null,
    [selectedDistrictId]
  );

  // Filter 2,400 infrastructure sensor points based on active scope
  const { filteredSensors, highlightedIds, scopeLabel, activeAreaKm2 } =
    useMemo(() => {
      if (customPolygonRing && customPolygonRing.length >= 4) {
        const inside: SensorPoint[] = [];
        const idMap: Record<string, true> = {};
        for (const sensor of NYC_SENSOR_POINTS) {
          if (isPointInRing(sensor.position, customPolygonRing)) {
            inside.push(sensor);
            idMap[sensor.id] = true;
          }
        }
        return {
          filteredSensors: inside,
          highlightedIds: idMap,
          scopeLabel: 'Custom Terra Draw Study Zone',
          activeAreaKm2: Number(
            computePolygonAreaKm2(customPolygonRing).toFixed(2)
          ),
        };
      }

      if (selectedDistrict) {
        const inside: SensorPoint[] = [];
        const idMap: Record<string, true> = {};
        for (const sensor of NYC_SENSOR_POINTS) {
          if (sensor.districtId === selectedDistrict.id) {
            inside.push(sensor);
            idMap[sensor.id] = true;
          }
        }
        return {
          filteredSensors: inside,
          highlightedIds: idMap,
          scopeLabel: `District: ${selectedDistrict.name}`,
          activeAreaKm2: selectedDistrict.areaKm2,
        };
      }

      return {
        filteredSensors: NYC_SENSOR_POINTS,
        highlightedIds: null,
        scopeLabel: 'Citywide NYC Grid',
        activeAreaKm2: TOTAL_CITY_AREA_KM2,
      };
    }, [customPolygonRing, selectedDistrict]);

  // Compute summary metrics for the Zone Analytics KPI card
  const zoneMetrics = useMemo(() => {
    const count = filteredSensors.length;
    if (count === 0) {
      return {
        sensorCount: 0,
        avgLoadPct: 0,
        peakLoadPct: 0,
        totalThroughputMw: 0,
      };
    }

    let loadSum = 0;
    let peakLoad = 0;
    let throughputKwSum = 0;

    for (const s of filteredSensors) {
      loadSum += s.loadPct;
      if (s.loadPct > peakLoad) peakLoad = s.loadPct;
      throughputKwSum += s.throughputKw;
    }

    return {
      sensorCount: count,
      avgLoadPct: Number((loadSum / count).toFixed(1)),
      peakLoadPct: peakLoad,
      totalThroughputMw: Number((throughputKwSum / 1000).toFixed(1)),
    };
  }, [filteredSensors]);

  // Fetch terrain elevation via server-side /api/elevation BFF route
  const fetchElevationProfile = useCallback(
    async (locations: LatLngPoint[], label: string) => {
      if (!hasApiKey) {
        setElevationMessage(
          'Configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to query Elevation API.'
        );
        return;
      }

      setElevationLoading(true);
      setElevationMessage(null);

      try {
        const res = await fetch('/api/elevation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locations }),
        });

        const data = (await res.json()) as {
          status?: string;
          error?: string;
          results?: ElevationSampleResult[];
        };

        if (!res.ok || !data.results || data.results.length === 0) {
          setElevationMessage(
            data.error || `Elevation status: ${data.status ?? res.status}`
          );
          setElevationLoading(false);
          return;
        }

        const elevations = data.results.map((r) => r.elevation);
        const minMeters = Number(Math.min(...elevations).toFixed(2));
        const maxMeters = Number(Math.max(...elevations).toFixed(2));
        const meanMeters = Number(
          (
            elevations.reduce((acc, val) => acc + val, 0) / elevations.length
          ).toFixed(2)
        );
        const resolutions = data.results
          .map((r) => r.resolution)
          .filter((r) => r > 0);
        const resolutionMeters =
          resolutions.length > 0
            ? Number(
                (
                  resolutions.reduce((acc, val) => acc + val, 0) /
                  resolutions.length
                ).toFixed(1)
              )
            : 0;

        setElevationSummary({
          minMeters,
          meanMeters,
          maxMeters,
          resolutionMeters,
          samples: data.results,
          scopeLabel: label,
        });
      } catch {
        setElevationMessage('Unable to fetch elevation profile right now.');
      } finally {
        setElevationLoading(false);
      }
    },
    [hasApiKey]
  );

  // Trigger seed Places API (New) search + initial NYC elevation profile on load
  useEffect(() => {
    if (!hasApiKey) return;

    let cancelled = false;
    setPlacesLoading(true);

    fetch('/api/places/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        textQuery: SEED_SEARCH_QUERY,
        maxResultCount: 6,
      }),
    })
      .then(async (res) => {
        const data = (await res.json()) as {
          places?: PlaceSearchResultItem[];
          error?: string;
        };
        if (cancelled) return;
        if (res.ok && Array.isArray(data.places)) {
          setCivicPlaces(data.places);
          setPlacesStatusMessage(null);
        } else {
          setPlacesStatusMessage(
            data.error || 'Live civic hubs unavailable for this API key.'
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPlacesStatusMessage('Failed to load live NYC civic reference hubs.');
        }
      })
      .finally(() => {
        if (!cancelled) setPlacesLoading(false);
      });

    void fetchElevationProfile(
      DEFAULT_ELEVATION_TRANSECT,
      'Citywide NYC Transect'
    );

    return () => {
      cancelled = true;
    };
  }, [hasApiKey, fetchElevationProfile]);

  const handleSelectDistrict = useCallback(
    (district: DistrictProperties) => {
      setSelectedDistrictId(district.id);
      setCustomPolygonRing(null);
      setFitBoundsTarget({ ...district.bounds });

      const feature = NYC_DISTRICTS_GEOJSON.features.find(
        (f) => f.properties.id === district.id
      );
      if (feature) {
        const samplePts = getPolygonSampleLocations(
          feature.geometry.coordinates[0],
          9
        );
        void fetchElevationProfile(samplePts, district.name);
      }
    },
    [fetchElevationProfile]
  );

  const handleTerraPolygonChange = useCallback(
    (ring: [number, number][] | null) => {
      setCustomPolygonRing(ring);
      if (ring && ring.length >= 4) {
        setSelectedDistrictId(null);
        const samplePts = getPolygonSampleLocations(ring, 10);
        void fetchElevationProfile(samplePts, 'Custom Terra Draw Zone');
      }
    },
    [fetchElevationProfile]
  );

  const handleClearActiveScope = useCallback(() => {
    setSelectedDistrictId(null);
    setCustomPolygonRing(null);
    setClearDrawTrigger((n) => n + 1);
    setDrawMode('static');
    setFitBoundsTarget({
      north: 40.796,
      south: 40.68,
      east: -73.904,
      west: -74.018,
    });
    void fetchElevationProfile(
      DEFAULT_ELEVATION_TRANSECT,
      'Citywide NYC Transect'
    );
  }, [fetchElevationProfile]);

  const handleManualElevationSample = useCallback(() => {
    if (customPolygonRing && customPolygonRing.length >= 4) {
      void fetchElevationProfile(
        getPolygonSampleLocations(customPolygonRing, 10),
        'Custom Terra Draw Zone'
      );
      return;
    }

    if (selectedDistrict) {
      const feature = NYC_DISTRICTS_GEOJSON.features.find(
        (f) => f.properties.id === selectedDistrict.id
      );
      if (feature) {
        void fetchElevationProfile(
          getPolygonSampleLocations(feature.geometry.coordinates[0], 9),
          selectedDistrict.name
        );
        return;
      }
    }

    void fetchElevationProfile(
      DEFAULT_ELEVATION_TRANSECT,
      'Citywide NYC Transect'
    );
  }, [customPolygonRing, selectedDistrict, fetchElevationProfile]);

  const handlePlaceJump = useCallback((place: SelectedPlaceJump) => {
    setJumpedPlace(place);
    setActivePlaceMarker({
      id: place.id,
      displayName: place.displayName,
      formattedAddress: place.formattedAddress,
      location: place.location,
      types: ['transit_station'],
    });
  }, []);

  const handleSelectCivicPlace = useCallback((place: PlaceSearchResultItem) => {
    setActivePlaceMarker(place);
    setPanCenterTarget({ ...place.location });
  }, []);

  const workbenchContent = (
    <div className="workbench-shell">
      {/* Top Workbench Header */}
      <header className="workbench-header" data-testid="workbench-header">
        <div className="brand-group">
          <div className="brand-badge" aria-hidden="true">
            <Compass size={18} />
          </div>
          <div>
            <h1 className="brand-title">NYC Spatial Intelligence</h1>
            <p className="brand-subtitle">
              Enterprise Web GIS &amp; Grid Capacity Workbench
            </p>
          </div>
        </div>

        <div className="header-controls">
          {hasApiKey ? <PlaceSearchBox onPlaceSelect={handlePlaceJump} /> : null}

          <div
            className="segmented-group"
            role="group"
            aria-label="Basemap switcher"
            data-testid="basemap-switcher"
          >
            {(
              [
                { id: 'roadmap', label: 'Roadmap' },
                { id: 'satellite', label: 'Satellite' },
                { id: 'hybrid', label: 'Hybrid' },
                { id: 'terrain', label: 'Terrain' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                data-testid={`basemap-btn-${item.id}`}
                className={`seg-btn ${basemap === item.id ? 'active' : ''}`}
                onClick={() => setBasemap(item.id)}
              >
                {item.id === 'satellite' ? (
                  <Satellite size={13} />
                ) : item.id === 'terrain' ? (
                  <Mountain size={13} />
                ) : null}
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div
            className="segmented-group"
            role="group"
            aria-label="Spatial layer controls"
            data-testid="deckgl-layer-controls"
          >
            <button
              type="button"
              data-testid="deckgl-mode-scatterplot"
              className={`seg-btn ${
                showDeckGl && deckMode === 'scatterplot' ? 'active' : ''
              }`}
              onClick={() => {
                setShowDeckGl(true);
                setDeckMode('scatterplot');
              }}
            >
              Scatterplot
            </button>
            <button
              type="button"
              data-testid="deckgl-mode-hexagon"
              className={`seg-btn ${
                showDeckGl && deckMode === 'hexagon' ? 'active' : ''
              }`}
              onClick={() => {
                setShowDeckGl(true);
                setDeckMode('hexagon');
              }}
            >
              Hexagon
            </button>
            <button
              type="button"
              data-testid="toggle-geojson-btn"
              className={`seg-btn ${showGeoJson ? 'active' : ''}`}
              onClick={() => setShowGeoJson((prev) => !prev)}
            >
              <Layers size={13} />
              <span>Districts</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Split-Screen Body */}
      <div className="workbench-body">
        {/* Left Analytical Sidebar */}
        <aside className="analytics-sidebar" aria-label="GIS Spatial Analytics">
          {/* 1. Zone Analytics KPI Card */}
          <section
            className="panel-card"
            data-testid="zone-analytics-panel"
            aria-labelledby="zone-analytics-heading"
          >
            <div className="panel-header">
              <div className="panel-title-row">
                <Activity size={16} className="accent-icon" />
                <h2 id="zone-analytics-heading">Zone Analytics</h2>
              </div>
              {(selectedDistrict || customPolygonRing) && (
                <button
                  type="button"
                  className="ghost-clear-btn"
                  onClick={handleClearActiveScope}
                >
                  <X size={13} />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <div className="scope-pill">{scopeLabel}</div>

            <div className="kpi-grid">
              <div className="kpi-box">
                <span className="kpi-label">Active Sensors</span>
                <strong className="kpi-value" data-testid="kpi-sensor-count">
                  {zoneMetrics.sensorCount.toLocaleString()}
                </strong>
              </div>
              <div className="kpi-box">
                <span className="kpi-label">Avg Capacity Load</span>
                <strong className="kpi-value" data-testid="kpi-avg-load">
                  {zoneMetrics.avgLoadPct}%
                </strong>
              </div>
              <div className="kpi-box">
                <span className="kpi-label">Peak Load</span>
                <strong className="kpi-value" data-testid="kpi-peak-load">
                  {zoneMetrics.peakLoadPct}%
                </strong>
              </div>
              <div className="kpi-box">
                <span className="kpi-label">Zone Area</span>
                <strong className="kpi-value" data-testid="kpi-area-km2">
                  {activeAreaKm2} km²
                </strong>
              </div>
            </div>

            <div className="kpi-footer-meta">
              <span>Throughput: {zoneMetrics.totalThroughputMw} MW</span>
              <span>
                Renderer:{' '}
                {webglAvailable
                  ? `deck.gl ${deckMode}`
                  : '2D GeoJSON Fallback'}
              </span>
            </div>
          </section>

          {/* 2. Terrain Elevation Inspector */}
          <section
            className="panel-card"
            data-testid="elevation-inspector-card"
            aria-labelledby="elevation-heading"
          >
            <div className="panel-header">
              <div className="panel-title-row">
                <Mountain size={16} className="accent-icon" />
                <h2 id="elevation-heading">Terrain Elevation Profile</h2>
              </div>
              <button
                type="button"
                data-testid="sample-elevation-btn"
                className="action-chip-btn"
                onClick={handleManualElevationSample}
                disabled={elevationLoading}
              >
                <RefreshCw
                  size={12}
                  className={elevationLoading ? 'spin-icon' : ''}
                />
                <span>{elevationLoading ? 'Sampling...' : 'Sample'}</span>
              </button>
            </div>

            {elevationSummary ? (
              <>
                <p className="muted-caption">
                  Scope: {elevationSummary.scopeLabel} ({elevationSummary.samples.length}{' '}
                  points)
                </p>
                <div className="elevation-stats-row">
                  <div className="elev-stat">
                    <span>Min</span>
                    <strong>{elevationSummary.minMeters} m</strong>
                  </div>
                  <div className="elev-stat">
                    <span>Mean</span>
                    <strong>{elevationSummary.meanMeters} m</strong>
                  </div>
                  <div className="elev-stat">
                    <span>Max</span>
                    <strong>{elevationSummary.maxMeters} m</strong>
                  </div>
                  <div className="elev-stat">
                    <span>Res</span>
                    <strong>{elevationSummary.resolutionMeters} m</strong>
                  </div>
                </div>
                <div className="elevation-bars" aria-hidden="true">
                  {elevationSummary.samples.map((sample, idx) => {
                    const span = Math.max(
                      1,
                      elevationSummary.maxMeters - elevationSummary.minMeters
                    );
                    const pct = Math.max(
                      14,
                      Math.round(
                        ((sample.elevation - elevationSummary.minMeters) / span) *
                          100
                      )
                    );
                    return (
                      <div
                        key={`${sample.location.lat}-${sample.location.lng}-${idx}`}
                        className="elev-bar"
                        style={{ height: `${pct}%` }}
                        title={`${sample.elevation.toFixed(1)} m`}
                      />
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="muted-caption">
                {elevationMessage ||
                  (elevationLoading
                    ? 'Querying Google Elevation API...'
                    : 'Draw a polygon or click Sample to profile terrain elevation.')}
              </p>
            )}
          </section>

          {/* 3. NYC District Capacity Directory */}
          <section
            className="panel-card"
            data-testid="district-selector-list"
            aria-labelledby="district-directory-heading"
          >
            <div className="panel-header">
              <div className="panel-title-row">
                <Layers size={16} className="accent-icon" />
                <h2 id="district-directory-heading">
                  NYC District Capacity Directory
                </h2>
              </div>
              <span className="count-badge">{ALL_DISTRICTS.length}</span>
            </div>

            <div className="district-list">
              {ALL_DISTRICTS.map((district) => {
                const isSelected = selectedDistrictId === district.id;
                const statusClass = district.status.toLowerCase();
                return (
                  <button
                    key={district.id}
                    type="button"
                    data-testid={`district-item-${district.id}`}
                    className={`district-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectDistrict(district)}
                  >
                    <div className="district-item-top">
                      <span className="district-name">{district.name}</span>
                      <span className={`status-badge ${statusClass}`}>
                        {district.capacityLoadPct}%
                      </span>
                    </div>
                    <div className="district-item-meta">
                      <span>{district.borough}</span>
                      <span>{district.sensorCount} sensors</span>
                      <span>{district.gridCapacityMw} MW</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 4. Live NYC Civic Reference Hubs */}
          <section
            className="panel-card"
            data-testid="live-places-panel"
            aria-labelledby="civic-hubs-heading"
          >
            <div className="panel-header">
              <div className="panel-title-row">
                <Building2 size={16} className="accent-icon" />
                <h2 id="civic-hubs-heading">Live NYC Civic Reference Hubs</h2>
              </div>
              <span className="count-badge">{civicPlaces.length}</span>
            </div>

            {placesLoading ? (
              <p className="muted-caption">
                Fetching live transit anchors via Places API (New)...
              </p>
            ) : civicPlaces.length > 0 ? (
              <div className="places-list">
                {civicPlaces.map((place) => {
                  const isFocused = activePlaceMarker?.id === place.id;
                  return (
                    <button
                      key={place.id}
                      type="button"
                      className={`place-item ${isFocused ? 'selected' : ''}`}
                      onClick={() => handleSelectCivicPlace(place)}
                    >
                      <div className="place-item-title">
                        <MapPin size={13} />
                        <span>{place.displayName}</span>
                      </div>
                      <p className="place-item-address">
                        {place.formattedAddress}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="muted-caption">
                {placesStatusMessage ||
                  'Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local to load live NYC civic hubs.'}
              </p>
            )}
          </section>
        </aside>

        {/* Right Main Map Canvas */}
        <main className="map-pane" data-testid="map-canvas">
          {/* Floating Terra Draw Toolbar */}
          <div
            className="terradraw-toolbar"
            data-testid="terradraw-toolbar"
            role="toolbar"
            aria-label="Terra Draw study zone tools"
          >
            <button
              type="button"
              data-testid="terradraw-polygon-btn"
              className={`draw-tool-btn ${
                drawMode === 'polygon' ? 'active' : ''
              }`}
              onClick={() =>
                setDrawMode((m) => (m === 'polygon' ? 'static' : 'polygon'))
              }
              title="Draw a custom study-zone polygon on the map"
            >
              <Pentagon size={14} />
              <span>Draw Polygon</span>
            </button>
            <button
              type="button"
              data-testid="terradraw-select-btn"
              className={`draw-tool-btn ${
                drawMode === 'select' ? 'active' : ''
              }`}
              onClick={() =>
                setDrawMode((m) => (m === 'select' ? 'static' : 'select'))
              }
              title="Select and edit custom study-zone vertices"
            >
              <MousePointerClick size={14} />
              <span>Select / Edit</span>
            </button>
            <button
              type="button"
              data-testid="terradraw-clear-btn"
              className="draw-tool-btn danger"
              onClick={() => {
                setClearDrawTrigger((n) => n + 1);
                setDrawMode('static');
                setCustomPolygonRing(null);
                if (!selectedDistrict) {
                  void fetchElevationProfile(
                    DEFAULT_ELEVATION_TRANSECT,
                    'Citywide NYC Transect'
                  );
                }
              }}
              title="Clear drawn study zone"
            >
              <Eraser size={14} />
              <span>Clear Zone</span>
            </button>
            {terraDrawReady && drawMode === 'polygon' && (
              <span className="draw-hint-pill">
                Click vertices to draw, double-click to finish
              </span>
            )}
          </div>

          {hasApiKey ? (
            <GoogleMap
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
              defaultCenter={NYC_INITIAL_CENTER}
              defaultZoom={NYC_INITIAL_ZOOM}
              mapTypeId={basemap}
              gestureHandling="greedy"
              mapTypeControl={false}
              streetViewControl={false}
              fullscreenControl={false}
              style={{ width: '100%', height: '100%', minHeight: '560px' }}
            >
              <MapControllerSync
                basemap={basemap}
                targetBounds={fitBoundsTarget}
                targetCenter={panCenterTarget}
              />

              <DistrictGeoJsonLayer
                visible={showGeoJson}
                selectedDistrictId={selectedDistrictId}
                onSelectDistrict={handleSelectDistrict}
              />

              <DeckGlOverlay
                points={NYC_SENSOR_POINTS}
                highlightedIds={highlightedIds}
                mode={deckMode}
                visible={showDeckGl}
                onWebglAvailabilityChange={setWebglAvailable}
              />

              <TerraDrawController
                activeMode={drawMode}
                clearTrigger={clearDrawTrigger}
                onPolygonChange={handleTerraPolygonChange}
                onReadyChange={setTerraDrawReady}
              />

              {/* Civic Reference Hubs rendered via AdvancedMarkerElement */}
              {civicPlaces.map((place) => (
                <AdvancedMarker
                  key={place.id}
                  position={place.location}
                  title={place.displayName}
                  onClick={() => setActivePlaceMarker(place)}
                >
                  <Pin
                    background="#0284c7"
                    borderColor="#ffffff"
                    glyphColor="#ffffff"
                  />
                </AdvancedMarker>
              ))}

              {jumpedPlace && (
                <AdvancedMarker
                  key={`jump-${jumpedPlace.id}`}
                  position={jumpedPlace.location}
                  title={jumpedPlace.displayName}
                  onClick={() =>
                    setActivePlaceMarker({
                      id: jumpedPlace.id,
                      displayName: jumpedPlace.displayName,
                      formattedAddress: jumpedPlace.formattedAddress,
                      location: jumpedPlace.location,
                      types: ['search_result'],
                    })
                  }
                >
                  <Pin
                    background="#7c3aed"
                    borderColor="#ffffff"
                    glyphColor="#ffffff"
                  />
                </AdvancedMarker>
              )}

              {activePlaceMarker && (
                <InfoWindow
                  position={activePlaceMarker.location}
                  onCloseClick={() => setActivePlaceMarker(null)}
                >
                  <div className="map-infowindow">
                    <strong>{activePlaceMarker.displayName}</strong>
                    <p>{activePlaceMarker.formattedAddress}</p>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          ) : (
            <div className="missing-key-overlay">
              <div className="missing-key-card">
                <h2>Google Maps API Key Required</h2>
                <p>
                  Copy <code>.env.example</code> to <code>.env.local</code> and
                  set <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to render the
                  live New York City spatial workbench.
                </p>
                <a
                    href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
                  target="_blank"
                  rel="noreferrer"
                  className="demo-key-link"
                >
                  Get a Free Maps Demo Key
                </a>
              </div>
            </div>
          )}

          {/* Floating Bottom-Left Capacity Legend */}
          <div className="capacity-legend" aria-label="Capacity load legend">
            <span className="legend-title">Capacity Load</span>
            <div className="legend-items">
              <span className="legend-item">
                <i className="dot optimal" /> Optimal (&lt;65%)
              </span>
              <span className="legend-item">
                <i className="dot elevated" /> Elevated (65–79%)
              </span>
              <span className="legend-item">
                <i className="dot critical" /> Critical (80%+)
              </span>
              <span className="legend-item">
                <i className="dot hub" /> Civic Hub
              </span>
            </div>
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
      libraries={['core', 'maps', 'marker', 'places', 'elevation']}
    >
      {workbenchContent}
    </APIProvider>
  );
};
