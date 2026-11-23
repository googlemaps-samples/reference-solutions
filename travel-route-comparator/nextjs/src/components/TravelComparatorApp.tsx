'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import {
  AlertTriangle,
  ArrowUpDown,
  Bike,
  Car,
  Clock,
  Footprints,
  Fuel,
  Leaf,
  Mountain,
  Navigation,
  Route as RouteIcon,
  ShieldAlert,
  TrainFront,
} from 'lucide-react';
import ElevationProfileChart from '@/components/ElevationProfileChart';
import PlacePicker from '@/components/PlacePicker';
import RouteMap from '@/components/RouteMap';
import {
  buildElevationSummary,
  decodePolyline,
  downsamplePath,
  type RawElevationResult,
} from '@/lib/polyline';
import type {
  ComputedRoute,
  ElevationProfileSummary,
  PlaceEndpoint,
  RouteComputeResult,
  RouteModifiersState,
  TravelMode,
} from '@/types/travel';

const SEED_ORIGIN_QUERY = 'Denver Union Station, Denver, CO';
const SEED_DESTINATION_QUERY = 'Chautauqua Park, Boulder, CO';

const MODE_CONFIG: Array<{
  mode: TravelMode;
  label: string;
  buttonId: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { mode: 'DRIVE', label: 'Driving', buttonId: 'mode-drive-btn', icon: Car },
  { mode: 'BICYCLE', label: 'Cycling', buttonId: 'mode-bicycle-btn', icon: Bike },
  { mode: 'WALK', label: 'Walking', buttonId: 'mode-walk-btn', icon: Footprints },
  { mode: 'TRANSIT', label: 'Transit', buttonId: 'mode-transit-btn', icon: TrainFront },
];

const INITIAL_ROUTES_BY_MODE: Record<TravelMode, RouteComputeResult> = {
  DRIVE: { travelMode: 'DRIVE', routes: [] },
  BICYCLE: { travelMode: 'BICYCLE', routes: [] },
  WALK: { travelMode: 'WALK', routes: [] },
  TRANSIT: { travelMode: 'TRANSIT', routes: [] },
};

interface TravelComparatorAppProps {
  apiKey: string;
}

function getRouteTitle(route: ComputedRoute): string {
  if (route.routeLabels.includes('FUEL_EFFICIENT')) {
    return route.routeLabels.includes('DEFAULT_ROUTE')
      ? 'Recommended & Eco-Friendly'
      : 'Eco-Friendly Route';
  }
  if (route.routeLabels.includes('DEFAULT_ROUTE')) {
    return 'Recommended Route';
  }
  return `Alternative Route ${route.index}`;
}

export default function TravelComparatorApp({ apiKey }: TravelComparatorAppProps) {
  const [origin, setOrigin] = useState<PlaceEndpoint | null>(null);
  const [destination, setDestination] = useState<PlaceEndpoint | null>(null);
  const [isResolvingSeed, setIsResolvingSeed] = useState(true);
  const [seedError, setSeedError] = useState<string | null>(null);

  const [activeMode, setActiveMode] = useState<TravelMode>('BICYCLE');
  const [modifiers, setModifiers] = useState<RouteModifiersState>({
    avoidTolls: false,
    avoidHighways: false,
    ecoFriendly: false,
  });

  const [routesByMode, setRoutesByMode] = useState<Record<TravelMode, RouteComputeResult>>(
    INITIAL_ROUTES_BY_MODE
  );
  const [selectedRouteIndexByMode, setSelectedRouteIndexByMode] = useState<
    Record<TravelMode, number>
  >({
    DRIVE: 0,
    BICYCLE: 0,
    WALK: 0,
    TRANSIT: 0,
  });
  const [loadingModes, setLoadingModes] = useState<Record<TravelMode, boolean>>({
    DRIVE: false,
    BICYCLE: false,
    WALK: false,
    TRANSIT: false,
  });

  const [elevationProfile, setElevationProfile] =
    useState<ElevationProfileSummary | null>(null);
  const [isElevationLoading, setIsElevationLoading] = useState(false);
  const [elevationError, setElevationError] = useState<string | null>(null);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  const routesRequestSeqRef = useRef(0);
  const driveRequestSeqRef = useRef(0);
  const elevationRequestSeqRef = useRef(0);

  // 1. Resolve seeded endpoints on mount via /api/places/search
  useEffect(() => {
    if (!apiKey) {
      setIsResolvingSeed(false);
      return;
    }

    let cancelled = false;
    async function resolveSeeds() {
      setIsResolvingSeed(true);
      setSeedError(null);
      try {
        const [origRes, destRes] = await Promise.all([
          fetch('/api/places/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ textQuery: SEED_ORIGIN_QUERY }),
          }),
          fetch('/api/places/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ textQuery: SEED_DESTINATION_QUERY }),
          }),
        ]);

        const origJson = (await origRes.json()) as {
          places?: PlaceEndpoint[];
          error?: string;
        };
        const destJson = (await destRes.json()) as {
          places?: PlaceEndpoint[];
          error?: string;
        };

        if (cancelled) return;

        if (!origRes.ok || !origJson.places?.length) {
          throw new Error(origJson.error || 'Unable to resolve Denver Union Station.');
        }
        if (!destRes.ok || !destJson.places?.length) {
          throw new Error(destJson.error || 'Unable to resolve Chautauqua Park, Boulder.');
        }

        setOrigin(origJson.places[0]);
        setDestination(destJson.places[0]);
      } catch (err) {
        if (!cancelled) {
          setSeedError(
            err instanceof Error
              ? err.message
              : 'Failed to resolve seeded Denver–Boulder locations.'
          );
        }
      } finally {
        if (!cancelled) setIsResolvingSeed(false);
      }
    }

    resolveSeeds();
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  const fetchModeRoutes = useCallback(
    async (
      mode: TravelMode,
      orig: PlaceEndpoint,
      dest: PlaceEndpoint,
      mods: RouteModifiersState
    ): Promise<RouteComputeResult> => {
      try {
        const res = await fetch('/api/routes/compute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: orig.location,
            destination: dest.location,
            travelMode: mode,
            avoidTolls: mods.avoidTolls,
            avoidHighways: mods.avoidHighways,
            ecoFriendly: mods.ecoFriendly,
          }),
        });
        const data = (await res.json()) as RouteComputeResult;
        if (!res.ok) {
          return {
            travelMode: mode,
            routes: [],
            error: data.error || `Unable to compute ${mode} routes.`,
          };
        }
        return data;
      } catch (err) {
        return {
          travelMode: mode,
          routes: [],
          error:
            err instanceof Error ? err.message : `Failed to fetch ${mode} routes.`,
        };
      }
    },
    []
  );

  // 2. Compute all 4 travel modes whenever origin or destination changes
  useEffect(() => {
    if (!origin || !destination || !apiKey) return;

    const seq = ++routesRequestSeqRef.current;
    const currentMods = modifiers;

    setLoadingModes({
      DRIVE: true,
      BICYCLE: true,
      WALK: true,
      TRANSIT: true,
    });

    const modes: TravelMode[] = ['DRIVE', 'BICYCLE', 'WALK', 'TRANSIT'];
    modes.forEach(async (mode) => {
      const result = await fetchModeRoutes(mode, origin, destination, currentMods);
      if (routesRequestSeqRef.current !== seq) return;

      setRoutesByMode((prev) => ({
        ...prev,
        [mode]: result,
      }));
      setSelectedRouteIndexByMode((prev) => ({
        ...prev,
        [mode]: 0,
      }));
      setLoadingModes((prev) => ({
        ...prev,
        [mode]: false,
      }));
    });
    // Intentionally re-run all modes on origin/destination change; modifiers only recompute DRIVE below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, apiKey, fetchModeRoutes]);

  // 3. Recompute DRIVE routes immediately whenever route modifiers change
  const modifiersInitializedRef = useRef(false);
  useEffect(() => {
    if (!modifiersInitializedRef.current) {
      modifiersInitializedRef.current = true;
      return;
    }
    if (!origin || !destination || !apiKey) return;

    const seq = ++driveRequestSeqRef.current;
    setLoadingModes((prev) => ({ ...prev, DRIVE: true }));

    fetchModeRoutes('DRIVE', origin, destination, modifiers).then((result) => {
      if (driveRequestSeqRef.current !== seq) return;

      let preferredIdx = 0;
      if (modifiers.ecoFriendly && result.routes.length > 0) {
        const ecoRoute = result.routes.find((r) =>
          r.routeLabels.includes('FUEL_EFFICIENT')
        );
        if (ecoRoute) preferredIdx = ecoRoute.index;
      }

      setRoutesByMode((prev) => ({
        ...prev,
        DRIVE: result,
      }));
      setSelectedRouteIndexByMode((prev) => ({
        ...prev,
        DRIVE: preferredIdx,
      }));
      setLoadingModes((prev) => ({ ...prev, DRIVE: false }));
    });
  }, [modifiers, origin, destination, apiKey, fetchModeRoutes]);

  const activeResult = routesByMode[activeMode];
  const activeRoutes = activeResult.routes;
  const selectedRouteIndex = selectedRouteIndexByMode[activeMode] ?? 0;

  const activeRoute = useMemo(() => {
    if (!activeRoutes.length) return null;
    return (
      activeRoutes.find((r) => r.index === selectedRouteIndex) || activeRoutes[0]
    );
  }, [activeRoutes, selectedRouteIndex]);

  // 4. Query Elevation API for the active route polyline (with client-side ElevationService fallback)
  useEffect(() => {
    if (!activeRoute?.encodedPolyline || !apiKey) {
      setElevationProfile(null);
      setElevationError(null);
      setHoveredPointIndex(null);
      return;
    }

    const seq = ++elevationRequestSeqRef.current;
    setIsElevationLoading(true);
    setElevationError(null);
    setHoveredPointIndex(null);

    async function loadElevation(encodedPolyline: string) {
      try {
        const res = await fetch('/api/elevation/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ encodedPolyline, samples: 64 }),
        });

        if (res.ok) {
          const summary = (await res.json()) as ElevationProfileSummary;
          if (elevationRequestSeqRef.current === seq) {
            setElevationProfile(summary);
            setIsElevationLoading(false);
          }
          return;
        }

        // Fallback to Maps JS ElevationService if BFF REST Elevation is restricted
        const elevLib = (await google.maps.importLibrary(
          'elevation'
        )) as google.maps.ElevationLibrary;
        const service = new elevLib.ElevationService();
        const decoded = downsamplePath(decodePolyline(encodedPolyline), 180);
        const sdkRes = await service.getElevationAlongPath({
          path: decoded,
          samples: 64,
        });

        const rawResults: RawElevationResult[] = sdkRes.results.map((r) => ({
          elevation: r.elevation,
          location: {
            lat: r.location ? r.location.lat() : 0,
            lng: r.location ? r.location.lng() : 0,
          },
          resolution: r.resolution,
        }));

        const summary = buildElevationSummary(rawResults, 'sdk');
        if (elevationRequestSeqRef.current === seq) {
          setElevationProfile(summary);
          setIsElevationLoading(false);
        }
      } catch (err) {
        if (elevationRequestSeqRef.current === seq) {
          setElevationProfile(null);
          setElevationError(
            err instanceof Error
              ? err.message
              : 'Elevation API data unavailable for this route.'
          );
          setIsElevationLoading(false);
        }
      }
    }

    loadElevation(activeRoute.encodedPolyline);
  }, [activeRoute?.encodedPolyline, apiKey]);

  const handleSwapEndpoints = useCallback(() => {
    if (!origin || !destination) return;
    const prevOrigin = origin;
    const prevDest = destination;
    setOrigin(prevDest);
    setDestination(prevOrigin);
  }, [origin, destination]);

  const handleSelectRoute = useCallback(
    (index: number) => {
      setSelectedRouteIndexByMode((prev) => ({
        ...prev,
        [activeMode]: index,
      }));
    },
    [activeMode]
  );

  const toggleModifier = useCallback((key: keyof RouteModifiersState) => {
    setModifiers((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const showTrailBetaAdvisory = activeMode === 'BICYCLE' || activeMode === 'WALK';

  if (!apiKey) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f7f6] p-6">
        <div className="max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-2.5 text-teal-700">
            <RouteIcon className="h-6 w-6" />
            <h1 className="text-lg font-bold text-slate-900">
              Google Maps Platform API Key Required
            </h1>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-slate-600">
            Set <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">.env.local</code> and restart the Next.js server to launch the Denver–Boulder Route Comparator.
          </p>
          <a
            href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
          >
            Get a Free Maps Demo Key
          </a>
        </div>
      </div>
    );
  }

  return (
    <APIProvider
      apiKey={apiKey}
      libraries={['core', 'maps', 'marker', 'places', 'routes', 'elevation']}
      region="US"
      language="en"
    >
      <div className="flex min-h-screen flex-col bg-[#f4f7f6] text-slate-900 lg:h-screen lg:overflow-hidden">
        {/* Top 64px Header Bar */}
        <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white shadow-xs">
              <Mountain className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-slate-900 sm:text-base">
                  Front Range Route Comparator
                </h1>
                <span className="hidden rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800 sm:inline-flex">
                  Denver ⇄ Boulder Corridor
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Multi-Modal Routes API v2 &amp; Elevation Slope Telemetry
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeRoute && (
              <div className="flex items-center gap-2 text-xs tabular-nums">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-800">
                  <Clock className="h-3.5 w-3.5 text-teal-700" />
                  {activeRoute.durationText}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-800">
                  <Navigation className="h-3.5 w-3.5 text-teal-700" />
                  {activeRoute.distanceText}
                </span>
                {elevationProfile && (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800 border border-emerald-200">
                    +{Math.round(elevationProfile.totalGainMeters * 3.28084).toLocaleString()} ft gain
                  </span>
                )}
              </div>
            )}

            {showTrailBetaAdvisory && (
              <div
                role="status"
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-900"
              >
                <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span>
                  Beta {activeMode === 'BICYCLE' ? 'Cycling' : 'Walking'} Paths — verify trail conditions &amp; signage
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Split-Screen Workspace */}
        <main className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
          {/* Left 410px Scrollable Sidebar */}
          <aside className="sidebar-scroll flex w-full shrink-0 flex-col gap-4 border-b border-slate-200 bg-white p-4 lg:w-[410px] lg:overflow-y-auto lg:border-b-0 lg:border-r">
            {seedError && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <span>{seedError}</span>
              </div>
            )}

            {/* Origin & Destination Places Autocomplete Pickers */}
            <section className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/50 p-3">
              <PlacePicker
                id="origin-autocomplete-input"
                label="Origin"
                badgeLetter="A"
                badgeColorClass="bg-teal-700"
                placeholder="Search Denver / Front Range origin..."
                selectedPlace={origin}
                isResolvingSeed={isResolvingSeed}
                onPlaceSelected={setOrigin}
              />

              <div className="flex justify-end">
                <button
                  id="swap-locations-btn"
                  data-testid="swap-locations-btn"
                  type="button"
                  onClick={handleSwapEndpoints}
                  disabled={!origin || !destination}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-teal-300 hover:text-teal-700 disabled:opacity-50"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  Swap A / B
                </button>
              </div>

              <PlacePicker
                id="destination-autocomplete-input"
                label="Destination"
                badgeLetter="B"
                badgeColorClass="bg-red-600"
                placeholder="Search Boulder / Front Range destination..."
                selectedPlace={destination}
                isResolvingSeed={isResolvingSeed}
                onPlaceSelected={setDestination}
              />
            </section>

            {/* 4-Mode Selector Bar */}
            <section aria-label="Travel mode selector" className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Travel Mode Comparison
                </h2>
                <span className="text-[11px] text-slate-400">Live Routes API v2</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {MODE_CONFIG.map(({ mode, label, buttonId, icon: Icon }) => {
                  const isActive = activeMode === mode;
                  const modeResult = routesByMode[mode];
                  const primaryRoute = modeResult.routes[0];
                  const isModeLoading = loadingModes[mode];

                  return (
                    <button
                      key={mode}
                      id={buttonId}
                      data-testid={buttonId}
                      type="button"
                      onClick={() => setActiveMode(mode)}
                      className={`flex flex-col items-center justify-center rounded-xl border px-1.5 py-2 text-center transition ${
                        isActive
                          ? 'border-teal-700 bg-teal-700 text-white shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50/40'
                      }`}
                    >
                      <Icon className="mb-1 h-4 w-4" />
                      <span className="text-[11px] font-semibold leading-tight">
                        {label}
                      </span>
                      <span
                        className={`mt-0.5 text-[10px] tabular-nums ${
                          isActive ? 'text-teal-100' : 'text-slate-500'
                        }`}
                      >
                        {isModeLoading
                          ? '...'
                          : primaryRoute
                            ? primaryRoute.durationText
                            : 'N/A'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Route Modifier Toggles */}
            <section
              aria-label="Route modifiers"
              className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Driving Route Modifiers
                </h2>
                {activeMode !== 'DRIVE' && (
                  <span className="text-[10px] font-medium text-slate-500">
                    Updates Driving ETA live
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  id="avoid-tolls-toggle"
                  data-testid="avoid-tolls-toggle"
                  type="button"
                  aria-pressed={modifiers.avoidTolls}
                  onClick={() => toggleModifier('avoidTolls')}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                    modifiers.avoidTolls
                      ? 'border-teal-700 bg-teal-50 text-teal-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      modifiers.avoidTolls ? 'bg-teal-700' : 'bg-slate-300'
                    }`}
                  />
                  Avoid Tolls
                </button>

                <button
                  id="avoid-highways-toggle"
                  data-testid="avoid-highways-toggle"
                  type="button"
                  aria-pressed={modifiers.avoidHighways}
                  onClick={() => toggleModifier('avoidHighways')}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                    modifiers.avoidHighways
                      ? 'border-teal-700 bg-teal-50 text-teal-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      modifiers.avoidHighways ? 'bg-teal-700' : 'bg-slate-300'
                    }`}
                  />
                  Avoid Highways
                </button>

                <button
                  id="eco-friendly-toggle"
                  data-testid="eco-friendly-toggle"
                  type="button"
                  aria-pressed={modifiers.ecoFriendly}
                  onClick={() => toggleModifier('ecoFriendly')}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                    modifiers.ecoFriendly
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Leaf
                    className={`h-3.5 w-3.5 ${
                      modifiers.ecoFriendly ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  />
                  Eco-Friendly
                </button>
              </div>
            </section>

            {/* Comparative Route Cards */}
            <section className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Available Routes ({activeRoutes.length})
                </h2>
                {loadingModes[activeMode] && (
                  <span className="text-[11px] font-medium text-teal-700">
                    Computing...
                  </span>
                )}
              </div>

              {activeResult.error && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  {activeResult.error}
                </div>
              )}

              {!loadingModes[activeMode] &&
                !activeResult.error &&
                activeRoutes.length === 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
                    No {activeMode.toLowerCase()} routes returned for this origin and destination.
                  </div>
                )}

              <div
                id="route-cards-list"
                data-testid="route-cards-list"
                className="space-y-2"
              >
                {activeRoutes.map((route) => {
                  const isSelected = route.index === selectedRouteIndex;
                  const isEco = route.routeLabels.includes('FUEL_EFFICIENT');
                  return (
                    <button
                      key={route.index}
                      id={`route-card-${route.index}`}
                      data-testid={`route-card-${route.index}`}
                      type="button"
                      onClick={() => handleSelectRoute(route.index)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        isSelected
                          ? 'border-slate-900 bg-slate-50 shadow-xs ring-1 ring-slate-900/10'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white shadow-xs"
                            style={{ backgroundColor: route.color }}
                          />
                          <span className="text-xs font-bold text-slate-900">
                            {getRouteTitle(route)}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-slate-900 tabular-nums">
                          {route.durationText}
                        </span>
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-600 tabular-nums">
                        <span className="font-medium text-slate-800">
                          {route.distanceText}
                        </span>

                        {isEco && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                            <Leaf className="h-3 w-3" />
                            Eco
                          </span>
                        )}

                        {route.tollEstimateText && (
                          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                            Est. Toll: {route.tollEstimateText}
                          </span>
                        )}

                        {route.fuelConsumptionLiters !== null && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                            <Fuel className="h-3 w-3 text-slate-500" />
                            {route.fuelConsumptionLiters} L fuel
                          </span>
                        )}
                      </div>

                      {route.warnings.length > 0 && (
                        <p className="mt-1.5 line-clamp-2 text-[11px] text-amber-800">
                          {route.warnings[0]}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          </aside>

          {/* Right Flex-1 Map + Elevation Profile Panel */}
          <div className="flex flex-1 flex-col lg:min-h-0">
            <RouteMap
              origin={origin}
              destination={destination}
              activeMode={activeMode}
              routes={activeRoutes}
              selectedRouteIndex={selectedRouteIndex}
              elevationPoints={elevationProfile?.points || []}
              hoveredPointIndex={hoveredPointIndex}
              onSelectRoute={handleSelectRoute}
              onHoverPointIndex={setHoveredPointIndex}
            />

            <ElevationProfileChart
              profile={elevationProfile}
              isLoading={isElevationLoading}
              error={elevationError}
              activeMode={activeMode}
              hoveredIndex={hoveredPointIndex}
              onHoverIndex={setHoveredPointIndex}
            />
          </div>
        </main>
      </div>
    </APIProvider>
  );
}
