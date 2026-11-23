import { useCallback, useEffect, useRef, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  Layers,
  MapPin,
  RotateCcw,
  Satellite,
  SlidersHorizontal,
} from 'lucide-react';
import { EnvironmentalMap } from './components/EnvironmentalMap';
import { EnvironmentalSidebar } from './components/EnvironmentalSidebar';
import { PlacesSearchInput } from './components/PlacesSearchInput';
import { fetchAllEnvironmentalData } from './services/environmentalApi';
import type {
  EnvironmentalSnapshot,
  InspectedLocation,
  MapTypeOption,
  UnitsSystem,
} from './types/environmental';

const API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
const SEED_SEARCH_QUERY = 'Phoenix City Hall, Phoenix, AZ';
const PHOENIX_SEED_COORDS = { lat: 33.4484, lng: -112.074 };

const INITIAL_SEED_LOCATION: InspectedLocation = {
  name: 'Downtown Phoenix',
  formattedAddress: 'Phoenix, AZ (Resolving Phoenix City Hall...)',
  coords: PHOENIX_SEED_COORDS,
  source: 'seed',
};

const LOADING_SNAPSHOT: EnvironmentalSnapshot = {
  weatherCurrent: { status: 'loading' },
  weatherForecast: { status: 'loading' },
  airQuality: { status: 'loading' },
  pollen: { status: 'loading' },
  solar: { status: 'loading' },
};

const IDLE_SNAPSHOT: EnvironmentalSnapshot = {
  weatherCurrent: { status: 'idle' },
  weatherForecast: { status: 'idle' },
  airQuality: { status: 'idle' },
  pollen: { status: 'idle' },
  solar: { status: 'idle' },
};

function PhoenixSeedResolver({
  onSeedResolved,
}: {
  onSeedResolved: (location: InspectedLocation) => void;
}) {
  const placesLib = useMapsLibrary('places');
  const resolvedOnceRef = useRef(false);

  useEffect(() => {
    const fallbackTimer = window.setTimeout(() => {
      if (!resolvedOnceRef.current) {
        resolvedOnceRef.current = true;
        onSeedResolved(INITIAL_SEED_LOCATION);
      }
    }, 2500);

    return () => window.clearTimeout(fallbackTimer);
  }, [onSeedResolved]);

  useEffect(() => {
    if (!placesLib || resolvedOnceRef.current) return;
    resolvedOnceRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        const { places } = await placesLib.Place.searchByText({
          textQuery: SEED_SEARCH_QUERY,
          fields: ['id', 'displayName', 'formattedAddress', 'location'],
          locationBias: PHOENIX_SEED_COORDS,
          maxResultCount: 1,
        });
        const top = places?.[0];
        if (!cancelled && top?.location) {
          onSeedResolved({
            name: top.displayName || 'Phoenix City Hall',
            formattedAddress:
              top.formattedAddress || '200 W Washington St, Phoenix, AZ',
            coords: {
              lat: top.location.lat(),
              lng: top.location.lng(),
            },
            placeId: top.id,
            source: 'seed',
          });
          return;
        }
      } catch {
        // Fall through to initial coordinate-based Phoenix seed
      }
      if (!cancelled) {
        onSeedResolved(INITIAL_SEED_LOCATION);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [placesLib, onSeedResolved]);

  return null;
}

export function App() {
  const [seedLocation, setSeedLocation] =
    useState<InspectedLocation>(INITIAL_SEED_LOCATION);
  const [activeLocation, setActiveLocation] =
    useState<InspectedLocation>(INITIAL_SEED_LOCATION);
  const [seedReady, setSeedReady] = useState<boolean>(!API_KEY);
  const [units, setUnits] = useState<UnitsSystem>('IMPERIAL');
  const [showAqiOverlay, setShowAqiOverlay] = useState<boolean>(false);
  const [mapType, setMapType] = useState<MapTypeOption>('roadmap');
  const [snapshot, setSnapshot] = useState<EnvironmentalSnapshot>(
    API_KEY ? LOADING_SNAPSHOT : IDLE_SNAPSHOT
  );

  const hasUserInteractedRef = useRef(false);

  const handleSeedResolved = useCallback((resolved: InspectedLocation) => {
    setSeedLocation(resolved);
    setSeedReady(true);
    if (!hasUserInteractedRef.current) {
      setActiveLocation(resolved);
    }
  }, []);

  const handlePlaceSelected = useCallback((location: InspectedLocation) => {
    hasUserInteractedRef.current = true;
    setSeedReady(true);
    setActiveLocation(location);
  }, []);

  const handleInspectCoordinates = useCallback((location: InspectedLocation) => {
    hasUserInteractedRef.current = true;
    setSeedReady(true);
    setActiveLocation(location);
  }, []);

  const handleResetPhoenix = useCallback(() => {
    hasUserInteractedRef.current = false;
    setSeedReady(true);
    setActiveLocation({ ...seedLocation, source: 'seed' });
  }, [seedLocation]);

  useEffect(() => {
    if (!API_KEY) {
      setSnapshot(IDLE_SNAPSHOT);
      return;
    }
    if (!seedReady) {
      return;
    }

    const controller = new AbortController();
    setSnapshot(LOADING_SNAPSHOT);

    fetchAllEnvironmentalData(
      activeLocation.coords,
      units,
      API_KEY,
      controller.signal
    )
      .then((nextSnapshot) => {
        if (!controller.signal.aborted) {
          setSnapshot(nextSnapshot);
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      });

    return () => {
      controller.abort();
    };
  }, [activeLocation.coords.lat, activeLocation.coords.lng, units, seedReady]);

  const solarBoundingBox =
    snapshot.solar.status === 'ok'
      ? (snapshot.solar.data.boundingBox ?? null)
      : null;

  const dashboardShell = (
    <div className="dashboard-app">
      <header className="top-header">
        <div className="brand-group">
          <div className="brand-mark" aria-hidden="true">
            E
          </div>
          <div className="brand-copy">
            <h1 className="brand-title">EnviroScope Phoenix</h1>
            <span className="brand-subtitle">
              Weather · Air Quality · Pollen · Solar
            </span>
          </div>
        </div>

        <div className="header-search-wrap">
          {API_KEY ? (
            <PlacesSearchInput onPlaceSelected={handlePlaceSelected} />
          ) : (
            <div
              data-testid="places-autocomplete-container"
              className="places-autocomplete-container places-placeholder-disabled"
            >
              Configure VITE_GOOGLE_MAPS_API_KEY to enable Places Autocomplete
            </div>
          )}
        </div>

        <div className="header-controls">
          <div
            data-testid="active-location-badge"
            className="active-location-badge"
            title={activeLocation.formattedAddress}
          >
            <MapPin size={14} />
            <span className="badge-name">{activeLocation.name}</span>
            <span className="badge-coords">
              {activeLocation.coords.lat.toFixed(4)},{' '}
              {activeLocation.coords.lng.toFixed(4)}
            </span>
          </div>

          <button
            type="button"
            data-testid="reset-phoenix-btn"
            className="toolbar-btn"
            onClick={handleResetPhoenix}
            title="Reset to Phoenix City Hall"
          >
            <RotateCcw size={14} />
            <span>Phoenix</span>
          </button>

          <button
            type="button"
            data-testid="units-toggle-btn"
            className="toolbar-btn"
            onClick={() =>
              setUnits((prev) => (prev === 'IMPERIAL' ? 'METRIC' : 'IMPERIAL'))
            }
            aria-pressed={units === 'METRIC'}
            title="Toggle Imperial (°F, mph, sq ft) / Metric (°C, km/h, m²)"
          >
            <SlidersHorizontal size={14} />
            <span>{units === 'IMPERIAL' ? '°F / Imperial' : '°C / Metric'}</span>
          </button>

          <button
            type="button"
            data-testid="aqi-layer-toggle"
            className={`toolbar-btn ${showAqiOverlay ? 'active' : ''}`}
            onClick={() => setShowAqiOverlay((prev) => !prev)}
            aria-pressed={showAqiOverlay}
            title="Toggle US AQI Heatmap Tile Overlay"
          >
            <Layers size={14} />
            <span>AQI Layer</span>
          </button>

          <button
            type="button"
            data-testid="map-type-toggle"
            className={`toolbar-btn ${mapType === 'hybrid' ? 'active' : ''}`}
            onClick={() =>
              setMapType((prev) => (prev === 'roadmap' ? 'hybrid' : 'roadmap'))
            }
            aria-pressed={mapType === 'hybrid'}
            title="Switch between Roadmap and Satellite Hybrid view"
          >
            <Satellite size={14} />
            <span>{mapType === 'roadmap' ? 'Satellite' : 'Roadmap'}</span>
          </button>
        </div>
      </header>

      <main className="workspace-grid">
        <EnvironmentalSidebar
          activeLocation={activeLocation}
          units={units}
          snapshot={snapshot}
          hasApiKey={Boolean(API_KEY)}
        />

        <section className="map-stage" aria-label="Interactive Environmental Map">
          {API_KEY ? (
            <EnvironmentalMap
              apiKey={API_KEY}
              activeLocation={activeLocation}
              mapType={mapType}
              showAqiOverlay={showAqiOverlay}
              solarBoundingBox={solarBoundingBox}
              onInspectCoordinates={handleInspectCoordinates}
            />
          ) : (
            <div data-testid="map-container" className="map-container map-missing-key">
              <div className="missing-key-panel">
                <h2>Google Maps Platform API Key Not Configured</h2>
                <p>
                  Copy <code>.env.example</code> to <code>.env.local</code> and
                  set <code>VITE_GOOGLE_MAPS_API_KEY</code> to launch the
                  interactive Phoenix map and live environmental telemetry.
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );

  if (!API_KEY) {
    return dashboardShell;
  }

  return (
    <APIProvider
      apiKey={API_KEY}
      libraries={['maps', 'marker', 'places', 'geocoding']}
      language="en"
      region="US"
    >
      <PhoenixSeedResolver onSeedResolved={handleSeedResolved} />
      {dashboardShell}
    </APIProvider>
  );
}

export default App;
