'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import {
  computeDispatchRoute,
  enrichWithRouteMatrix,
  fetchNearbyProviders,
  reverseGeocodeDriverLocation,
  searchProvidersByText,
} from '@/lib/dispatch-client';
import {
  DEFAULT_RADIUS_KM,
  SEATTLE_CENTER,
  type ComputedDispatchRoute,
  type FilterCategory,
  type LatLngLiteral,
  type RadiusKm,
  type ServiceProvider,
} from '@/lib/types';
import { DispatchMap } from './DispatchMap';
import { DispatchSidebar } from './DispatchSidebar';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';

interface DispatchWorkspaceProps {
  apiKey: string;
}

export function DispatchWorkspace({ apiKey }: DispatchWorkspaceProps) {
  const [driverLocation, setDriverLocation] =
    useState<LatLngLiteral>(SEATTLE_CENTER);
  const [driverAddress, setDriverAddress] = useState<string>(
    'Downtown Seattle, WA'
  );
  const [radiusKm, setRadiusKm] = useState<RadiusKm>(DEFAULT_RADIUS_KM);
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all');
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    null
  );
  const [infoWindowOpen, setInfoWindowOpen] = useState<boolean>(false);
  const [activeRoute, setActiveRoute] = useState<ComputedDispatchRoute | null>(
    null
  );
  const [loadingProviders, setLoadingProviders] = useState<boolean>(false);
  const [loadingRoute, setLoadingRoute] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [textQuery, setTextQuery] = useState<string>('');

  const mapCenterRef = useRef<LatLngLiteral>(SEATTLE_CENTER);
  const searchRequestSeq = useRef<number>(0);

  const loadProvidersForOrigin = useCallback(
    async (origin: LatLngLiteral, radius: RadiusKm) => {
      const seq = ++searchRequestSeq.current;
      setLoadingProviders(true);
      setErrorMessage(null);

      try {
        const nearby = await fetchNearbyProviders(origin, radius);
        if (seq !== searchRequestSeq.current) return;
        setProviders(nearby);

        const ranked = await enrichWithRouteMatrix(origin, nearby);
        if (seq !== searchRequestSeq.current) return;
        setProviders(ranked);
      } catch (err) {
        if (seq !== searchRequestSeq.current) return;
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Unable to discover nearby EV stations and auto repair providers.'
        );
      } finally {
        if (seq === searchRequestSeq.current) {
          setLoadingProviders(false);
        }
      }
    },
    []
  );

  const updateDriverLocation = useCallback(
    async (newLoc: LatLngLiteral, presetAddress?: string) => {
      setDriverLocation(newLoc);
      setActiveRoute(null);
      setSelectedProviderId(null);
      setInfoWindowOpen(false);

      if (presetAddress) {
        setDriverAddress(presetAddress);
      } else {
        setDriverAddress('Locating address…');
        void reverseGeocodeDriverLocation(newLoc)
          .then((res) => {
            setDriverAddress(res.shortLabel || res.formattedAddress);
          })
          .catch(() => {
            setDriverAddress(
              `${newLoc.lat.toFixed(4)}, ${newLoc.lng.toFixed(4)}`
            );
          });
      }

      await loadProvidersForOrigin(newLoc, radiusKm);
    },
    [loadProvidersForOrigin, radiusKm]
  );

  useEffect(() => {
    if (!apiKey) return;
    void reverseGeocodeDriverLocation(SEATTLE_CENTER)
      .then((res) => {
        setDriverAddress(res.shortLabel || res.formattedAddress);
      })
      .catch(() => {
        setDriverAddress('Downtown Seattle, WA');
      });
    void loadProvidersForOrigin(SEATTLE_CENTER, DEFAULT_RADIUS_KM);
  }, [apiKey, loadProvidersForOrigin]);

  const handleRadiusChange = (nextRadius: RadiusKm) => {
    setRadiusKm(nextRadius);
    setActiveRoute(null);
    void loadProvidersForOrigin(driverLocation, nextRadius);
  };

  const handleSelectProvider = useCallback(
    async (provider: ServiceProvider) => {
      setSelectedProviderId(provider.id);
      setInfoWindowOpen(true);
      setLoadingRoute(true);
      setErrorMessage(null);

      try {
        const route = await computeDispatchRoute(driverLocation, provider);
        setActiveRoute(route);
      } catch (err) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Unable to calculate dispatch route.'
        );
      } finally {
        setLoadingRoute(false);
      }
    },
    [driverLocation]
  );

  const handleTextSearchSubmit = useCallback(async () => {
    const trimmed = textQuery.trim();
    if (!trimmed) {
      await loadProvidersForOrigin(driverLocation, radiusKm);
      return;
    }

    const seq = ++searchRequestSeq.current;
    setLoadingProviders(true);
    setErrorMessage(null);
    setActiveRoute(null);

    try {
      const results = await searchProvidersByText(
        trimmed,
        driverLocation,
        radiusKm
      );
      if (seq !== searchRequestSeq.current) return;
      setProviders(results);

      const ranked = await enrichWithRouteMatrix(driverLocation, results);
      if (seq !== searchRequestSeq.current) return;
      setProviders(ranked);
    } catch (err) {
      if (seq !== searchRequestSeq.current) return;
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to execute text search.'
      );
    } finally {
      if (seq === searchRequestSeq.current) {
        setLoadingProviders(false);
      }
    }
  }, [driverLocation, loadProvidersForOrigin, radiusKm, textQuery]);

  const filteredProviders = useMemo(() => {
    if (categoryFilter === 'all') return providers;
    return providers.filter((p) => p.category === categoryFilter);
  }, [providers, categoryFilter]);

  const selectedProvider = useMemo(
    () =>
      filteredProviders.find((p) => p.id === selectedProviderId) ??
      providers.find((p) => p.id === selectedProviderId) ??
      null,
    [filteredProviders, providers, selectedProviderId]
  );

  const handleMapCenterCapture = useCallback((center: LatLngLiteral) => {
    mapCenterRef.current = center;
  }, []);

  if (!apiKey) {
    return (
      <div className="dispatch-shell">
        <header className="dispatch-header">
          <div className="brand-group">
            <span className="brand-icon" aria-hidden="true">
              ⚡
            </span>
            <div className="brand-text">
              <h1>Seattle EV &amp; Roadside Dispatch</h1>
              <p>On-Demand Charging &amp; Auto Repair</p>
            </div>
          </div>
        </header>
        <div className="missing-key-panel">
          <div className="missing-key-card">
            <h2>Google Maps Platform API Key Required</h2>
            <p>
              Set <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in{' '}
              <code>.env.local</code> and restart the Next.js server to load the
              interactive Seattle dispatch map, Places API (New), Routes API,
              and Geocoding API.
            </p>
            <p>
              For zero-billing prototyping, obtain a free Maps Demo Key at{' '}
              <a
                href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
                target="_blank"
                rel="noopener noreferrer"
              >
                mapsplatform.google.com/maps-demo-key
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <APIProvider
      apiKey={apiKey}
      language="en"
      region="US"
      libraries={['places', 'routes', 'geocoding', 'marker', 'geometry']}
    >
      <div className="dispatch-shell">
        <header className="dispatch-header">
          <div className="brand-group">
            <span className="brand-icon" aria-hidden="true">
              ⚡
            </span>
            <div className="brand-text">
              <h1>Seattle EV &amp; Roadside Dispatch</h1>
              <p>On-Demand Charging &amp; Auto Repair</p>
            </div>
          </div>

          <div className="header-location-group">
            <PlaceAutocompleteInput
              onPlaceSelect={(sel) => {
                void updateDriverLocation(sel.location, sel.shortLabel);
              }}
            />
            <div
              id="driver-address-badge"
              className="address-pill"
              title={driverAddress}
            >
              <span className="address-pill-dot" aria-hidden="true" />
              <span>{driverAddress}</span>
            </div>
          </div>

          <div className="header-controls-group">
            <button
              id="use-map-center-btn"
              type="button"
              className="btn-outline-light"
              onClick={() => {
                void updateDriverLocation(mapCenterRef.current);
              }}
            >
              Pin Map Center
            </button>

            <div
              className="segmented-group"
              role="group"
              aria-label="Category filter"
            >
              <button
                id="category-filter-all"
                type="button"
                className={`seg-btn${categoryFilter === 'all' ? ' active' : ''}`}
                onClick={() => setCategoryFilter('all')}
              >
                All
              </button>
              <button
                id="category-filter-ev"
                type="button"
                className={`seg-btn${
                  categoryFilter === 'ev' ? ' active-ev' : ''
                }`}
                onClick={() => setCategoryFilter('ev')}
              >
                EV Charging
              </button>
              <button
                id="category-filter-repair"
                type="button"
                className={`seg-btn${
                  categoryFilter === 'repair' ? ' active-repair' : ''
                }`}
                onClick={() => setCategoryFilter('repair')}
              >
                Auto Repair
              </button>
            </div>

            <div
              id="radius-select"
              className="segmented-group"
              role="group"
              aria-label="Search radius"
            >
              {([5, 10, 15] as RadiusKm[]).map((km) => (
                <button
                  key={km}
                  id={`radius-${km}km`}
                  type="button"
                  className={`seg-btn${radiusKm === km ? ' active' : ''}`}
                  onClick={() => handleRadiusChange(km)}
                >
                  {km} km
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="dispatch-main">
          <DispatchSidebar
            providers={filteredProviders}
            selectedProviderId={selectedProviderId}
            radiusKm={radiusKm}
            loadingProviders={loadingProviders}
            loadingRoute={loadingRoute}
            activeRoute={activeRoute}
            errorMessage={errorMessage}
            textQuery={textQuery}
            onTextQueryChange={setTextQuery}
            onTextSearchSubmit={() => void handleTextSearchSubmit()}
            onSelectProvider={(p) => void handleSelectProvider(p)}
            onClearRoute={() => {
              setActiveRoute(null);
              setInfoWindowOpen(false);
            }}
          />

          <DispatchMap
            driverLocation={driverLocation}
            driverAddress={driverAddress}
            radiusKm={radiusKm}
            providers={filteredProviders}
            selectedProvider={selectedProvider}
            activeRoute={activeRoute}
            infoWindowOpen={infoWindowOpen}
            onDriverLocationChange={(loc) => void updateDriverLocation(loc)}
            onSelectProvider={(p) => void handleSelectProvider(p)}
            onCloseInfoWindow={() => setInfoWindowOpen(false)}
            onMapCenterCapture={handleMapCenterCapture}
          />
        </main>
      </div>
    </APIProvider>
  );
}
