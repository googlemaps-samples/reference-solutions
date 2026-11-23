'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { DEFAULT_ORIGIN, NYC_CENTER } from '@/lib/classify';
import { HeaderBar } from '@/components/HeaderBar';
import { LocatorMap } from '@/components/LocatorMap';
import { Sidebar } from '@/components/Sidebar';
import type {
  AutocompleteSuggestionItem,
  Branch,
  BranchType,
  ComputedRoute,
  LatLngLiteral,
  OriginLocation,
  RouteMatrixMetric,
  ServiceTag,
  TravelMode,
} from '@/types/locator';

interface StoreLocatorAppProps {
  apiKey: string;
}

const LIBRARIES: string[] = [
  'core',
  'maps',
  'marker',
  'places',
  'routes',
  'geocoding',
  'geometry',
];

function createSessionToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 32);
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
}

export function StoreLocatorApp({ apiKey }: StoreLocatorAppProps) {
  const effectiveApiKey = apiKey.trim();
  const hasApiKey = effectiveApiKey.length > 0;

  const [branches, setBranches] = useState<Branch[]>([]);
  const [origin, setOrigin] = useState<OriginLocation>(DEFAULT_ORIGIN);
  const [searchQuery, setSearchQuery] = useState<string>(DEFAULT_ORIGIN.label);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestionItem[]>([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);

  const [travelMode, setTravelMode] = useState<TravelMode>('DRIVE');
  const [selectedType, setSelectedType] = useState<BranchType | 'all'>('all');
  const [selectedServices, setSelectedServices] = useState<ServiceTag[]>([]);

  const [metricsByBranchId, setMetricsByBranchId] = useState<
    Record<string, RouteMatrixMetric>
  >({});
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [activeRoute, setActiveRoute] = useState<ComputedRoute | null>(null);

  const [isLoadingPlaces, setIsLoadingPlaces] = useState<boolean>(hasApiKey);
  const [isLoadingMatrix, setIsLoadingMatrix] = useState<boolean>(false);
  const [isComputingRoute, setIsComputingRoute] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sessionTokenRef = useRef<string>(createSessionToken());

  const fetchBranches = useCallback(
    async (center: LatLngLiteral = NYC_CENTER) => {
      if (!hasApiKey) return;
      setIsLoadingPlaces(true);
      setErrorMessage(null);
      try {
        const res = await fetch('/api/places/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ center, radiusMeters: 6500 }),
        });
        const data = (await res.json()) as {
          branches?: Branch[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load NYC branches.');
        }
        setBranches(data.branches ?? []);
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Unable to fetch NYC branches.'
        );
      } finally {
        setIsLoadingPlaces(false);
      }
    },
    [hasApiKey]
  );

  useEffect(() => {
    void fetchBranches(NYC_CENTER);
  }, [fetchBranches]);

  // Compute Route Matrix whenever branches, origin, or travelMode updates
  useEffect(() => {
    if (!hasApiKey || branches.length === 0) return;

    let cancelled = false;
    const computeMatrix = async () => {
      setIsLoadingMatrix(true);
      try {
        const res = await fetch('/api/routes/matrix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: origin.location,
            travelMode,
            destinations: branches.map((b) => ({
              branchId: b.id,
              location: b.location,
            })),
          }),
        });
        const data = (await res.json()) as {
          metrics?: RouteMatrixMetric[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error || 'Failed to compute route matrix.');
        }
        if (cancelled) return;

        const nextDict: Record<string, RouteMatrixMetric> = {};
        for (const metric of data.metrics ?? []) {
          nextDict[metric.branchId] = metric;
        }
        setMetricsByBranchId(nextDict);
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error
              ? err.message
              : 'Unable to calculate route matrix ETAs.'
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMatrix(false);
        }
      }
    };

    void computeMatrix();
    return () => {
      cancelled = true;
    };
  }, [hasApiKey, branches, origin.location, travelMode]);

  // Debounced Places API (New) Autocomplete suggestions
  useEffect(() => {
    if (!hasApiKey) {
      setSuggestions([]);
      return;
    }

    const trimmed = searchQuery.trim();
    if (trimmed.length < 2 || trimmed === origin.label) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearchingSuggestions(true);
      try {
        const res = await fetch('/api/places/autocomplete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: trimmed,
            sessionToken: sessionTokenRef.current,
          }),
        });
        const data = (await res.json()) as {
          suggestions?: AutocompleteSuggestionItem[];
        };
        if (!cancelled && res.ok) {
          setSuggestions(data.suggestions ?? []);
        }
      } catch {
        if (!cancelled) {
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setIsSearchingSuggestions(false);
        }
      }
    }, 240);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hasApiKey, searchQuery, origin.label]);

  const computeRouteToBranch = useCallback(
    async (
      targetBranch: Branch,
      fromOrigin: OriginLocation,
      mode: TravelMode
    ) => {
      if (!hasApiKey) return;
      setIsComputingRoute(true);
      setErrorMessage(null);
      try {
        const res = await fetch('/api/routes/compute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            branchId: targetBranch.id,
            origin: fromOrigin.location,
            destination: targetBranch.location,
            travelMode: mode,
          }),
        });
        const data = (await res.json()) as {
          route?: ComputedRoute;
          error?: string;
        };
        if (!res.ok || !data.route) {
          throw new Error(data.error || 'Could not compute route to branch.');
        }
        setActiveRoute(data.route);
      } catch (err) {
        setActiveRoute(null);
        setErrorMessage(
          err instanceof Error ? err.message : 'Route calculation failed.'
        );
      } finally {
        setIsComputingRoute(false);
      }
    },
    [hasApiKey]
  );

  // Filtered and ETA-ranked branches
  const filteredBranches = useMemo(() => {
    const matches = branches.filter((branch) => {
      if (selectedType !== 'all' && branch.branchType !== selectedType) {
        return false;
      }
      if (selectedServices.length > 0) {
        const hasAll = selectedServices.every((svc) =>
          branch.services.includes(svc)
        );
        if (!hasAll) return false;
      }
      return true;
    });

    return [...matches].sort((a, b) => {
      const durA =
        metricsByBranchId[a.id]?.durationSeconds ?? Number.MAX_SAFE_INTEGER;
      const durB =
        metricsByBranchId[b.id]?.durationSeconds ?? Number.MAX_SAFE_INTEGER;
      if (durA !== durB) return durA - durB;
      return a.name.localeCompare(b.name);
    });
  }, [branches, selectedType, selectedServices, metricsByBranchId]);

  const fastestBranchId = useMemo(() => {
    for (const branch of filteredBranches) {
      if (metricsByBranchId[branch.id]) {
        return branch.id;
      }
    }
    return filteredBranches[0]?.id ?? null;
  }, [filteredBranches, metricsByBranchId]);

  const handleSelectBranch = useCallback(
    (branchId: string) => {
      setSelectedBranchId(branchId);
      const target = branches.find((b) => b.id === branchId);
      if (target) {
        void computeRouteToBranch(target, origin, travelMode);
      }
    },
    [branches, origin, travelMode, computeRouteToBranch]
  );

  const handleRouteToFastest = useCallback(() => {
    const targetId = fastestBranchId ?? filteredBranches[0]?.id ?? null;
    if (!targetId) return;
    handleSelectBranch(targetId);
  }, [fastestBranchId, filteredBranches, handleSelectBranch]);

  const handleSelectSuggestion = useCallback(
    async (item: AutocompleteSuggestionItem) => {
      setSearchQuery(item.primaryText);
      setSuggestions([]);
      setErrorMessage(null);
      try {
        const params = new URLSearchParams({
          placeId: item.placeId,
          sessionToken: sessionTokenRef.current,
        });
        const res = await fetch(`/api/places/details?${params.toString()}`);
        const data = (await res.json()) as {
          place?: {
            id: string;
            name: string;
            formattedAddress: string;
            location: LatLngLiteral | null;
          };
          error?: string;
        };

        sessionTokenRef.current = createSessionToken();

        if (!res.ok || !data.place?.location) {
          throw new Error(
            data.error || 'Could not resolve coordinates for selected location.'
          );
        }

        const nextOrigin: OriginLocation = {
          label: data.place.name || item.primaryText,
          address: data.place.formattedAddress,
          location: data.place.location,
          placeId: data.place.id,
        };
        setOrigin(nextOrigin);
        setActiveRoute(null);
        setSelectedBranchId(null);
      } catch (err) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Unable to resolve selected place.'
        );
      }
    },
    []
  );

  const handleSubmitSearchText = useCallback(
    async (query: string) => {
      if (!hasApiKey || typeof google === 'undefined') return;
      setErrorMessage(null);
      try {
        const geocodingLib = (await google.maps.importLibrary(
          'geocoding'
        )) as google.maps.GeocodingLibrary;
        const geocoder = new geocodingLib.Geocoder();
        const response = await geocoder.geocode({
          address: `${query}, New York, NY`,
          region: 'US',
        });
        const first = response.results?.[0];
        if (!first?.geometry?.location) {
          setErrorMessage(`Could not locate "${query}" in New York City.`);
          return;
        }
        const loc = first.geometry.location.toJSON();
        const nextOrigin: OriginLocation = {
          label: query,
          address: first.formatted_address,
          location: loc,
          placeId: first.place_id,
        };
        setOrigin(nextOrigin);
        setSearchQuery(first.formatted_address || query);
        setActiveRoute(null);
        setSelectedBranchId(null);
      } catch {
        setErrorMessage(`Geocoding failed for "${query}".`);
      }
    },
    [hasApiKey]
  );

  const handleSelectPresetOrigin = useCallback((preset: OriginLocation) => {
    setOrigin(preset);
    setSearchQuery(preset.label);
    setSuggestions([]);
    setActiveRoute(null);
    setSelectedBranchId(null);
  }, []);

  const handleOriginFromWidget = useCallback((widgetOrigin: OriginLocation) => {
    setOrigin(widgetOrigin);
    setSearchQuery(widgetOrigin.label);
    setSuggestions([]);
    setActiveRoute(null);
    setSelectedBranchId(null);
  }, []);

  const handleTravelModeChange = useCallback(
    (nextMode: TravelMode) => {
      setTravelMode(nextMode);
      if (selectedBranchId) {
        const target = branches.find((b) => b.id === selectedBranchId);
        if (target) {
          void computeRouteToBranch(target, origin, nextMode);
        }
      }
    },
    [selectedBranchId, branches, origin, computeRouteToBranch]
  );

  const handleToggleService = useCallback((service: ServiceTag) => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((item) => item !== service)
        : [...prev, service]
    );
  }, []);

  const shellContent = (
    <div className="locator-shell">
      <HeaderBar
        origin={origin}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        suggestions={suggestions}
        isSearchingSuggestions={isSearchingSuggestions}
        onSelectSuggestion={(item) => void handleSelectSuggestion(item)}
        onSubmitSearchText={(q) => void handleSubmitSearchText(q)}
        onSelectPresetOrigin={handleSelectPresetOrigin}
        travelMode={travelMode}
        onTravelModeChange={handleTravelModeChange}
        onRouteToFastest={handleRouteToFastest}
        canRouteToFastest={filteredBranches.length > 0 && hasApiKey}
        isComputingRoute={isComputingRoute}
      />

      <main className="workspace-split">
        <Sidebar
          branches={filteredBranches}
          totalCount={branches.length}
          selectedType={selectedType}
          onSelectType={setSelectedType}
          selectedServices={selectedServices}
          onToggleService={handleToggleService}
          selectedBranchId={selectedBranchId}
          fastestBranchId={fastestBranchId}
          onSelectBranch={handleSelectBranch}
          metricsByBranchId={metricsByBranchId}
          activeRoute={activeRoute}
          origin={origin}
          travelMode={travelMode}
          isLoadingPlaces={isLoadingPlaces}
          isLoadingMatrix={isLoadingMatrix}
          errorMessage={errorMessage}
          hasApiKey={hasApiKey}
        />

        <LocatorMap
          hasApiKey={hasApiKey}
          branches={filteredBranches}
          selectedBranchId={selectedBranchId}
          fastestBranchId={fastestBranchId}
          onSelectBranch={handleSelectBranch}
          origin={origin}
          onOriginFromWidget={handleOriginFromWidget}
          activeRoute={activeRoute}
          metricsByBranchId={metricsByBranchId}
          onRefreshSearchArea={(center) => void fetchBranches(center)}
        />
      </main>
    </div>
  );

  if (!hasApiKey) {
    return shellContent;
  }

  return (
    <APIProvider
      apiKey={effectiveApiKey}
      libraries={LIBRARIES}
      language="en"
      region="US"
    >
      {shellContent}
    </APIProvider>
  );
}
