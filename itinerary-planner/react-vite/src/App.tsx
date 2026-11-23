import { useCallback, useEffect, useRef, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { DestinationHeader } from './components/DestinationHeader';
import { DiscoveryPanel } from './components/DiscoveryPanel';
import { ItineraryPanel } from './components/ItineraryPanel';
import { MapWorkspace } from './components/MapWorkspace';
import { StreetViewPanel } from './components/StreetViewPanel';
import { DESTINATION_PRESETS } from './constants/destinations';
import {
  resolveDestinationContext,
  searchDiscoveryPlaces,
} from './services/placesService';
import { computeDayItineraryRoute } from './services/routesService';
import { fetchDestinationTimeZone } from './services/timezoneService';
import type {
  DiscoveryCategory,
  ItineraryDay,
  LatLngPoint,
  PlaceItem,
  RouteSummaryState,
  TimeZoneState,
  TravelModeOption,
} from './types/itinerary';

const DEFAULT_PRESET = DESTINATION_PRESETS[0];

const INITIAL_TIMEZONE: TimeZoneState = {
  timeZoneId: 'Asia/Tokyo',
  timeZoneName: 'Japan Standard Time',
  rawOffsetSeconds: 32400,
  dstOffsetSeconds: 0,
  totalOffsetSeconds: 32400,
  utcOffsetLabel: 'UTC+09:00',
  source: 'loading',
};

const INITIAL_ROUTE_SUMMARY: RouteSummaryState = {
  totalDistanceMeters: 0,
  totalDurationMillis: 0,
  legs: [],
  isComputing: false,
  isOptimized: false,
  note: null,
  error: null,
};

function dedupePlaces(items: PlaceItem[]): PlaceItem[] {
  const seen: Record<string, boolean> = {};
  const result: PlaceItem[] = [];
  for (const item of items) {
    if (!seen[item.id]) {
      seen[item.id] = true;
      result.push(item);
    }
  }
  return result;
}

function ItineraryPlannerWorkspace() {
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');

  const [destinationId, setDestinationId] = useState<string>(DEFAULT_PRESET.id);
  const [destinationLabel, setDestinationLabel] = useState<string>(
    DEFAULT_PRESET.label,
  );
  const [mapCenter, setMapCenter] = useState<LatLngPoint>(
    DEFAULT_PRESET.center,
  );
  const [mapZoom, setMapZoom] = useState<number>(DEFAULT_PRESET.zoom);

  const [timezone, setTimezone] = useState<TimeZoneState>(INITIAL_TIMEZONE);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const [activeDay, setActiveDay] = useState<ItineraryDay>(1);
  const [day1Stops, setDay1Stops] = useState<PlaceItem[]>([]);
  const [day2Stops, setDay2Stops] = useState<PlaceItem[]>([]);
  const [travelMode, setTravelMode] = useState<TravelModeOption>('DRIVING');

  const [computedRoutes, setComputedRoutes] = useState<
    google.maps.routes.Route[]
  >([]);
  const [routeSummary, setRouteSummary] = useState<RouteSummaryState>(
    INITIAL_ROUTE_SUMMARY,
  );

  const [activeCategory, setActiveCategory] =
    useState<DiscoveryCategory>('attractions');
  const [discoveryByCategory, setDiscoveryByCategory] = useState<
    Partial<Record<DiscoveryCategory, PlaceItem[]>>
  >({});
  const [discoveryLoading, setDiscoveryLoading] = useState<boolean>(true);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [infoWindowOpen, setInfoWindowOpen] = useState<boolean>(false);

  const destinationSeqRef = useRef<number>(0);
  const routeSeqRef = useRef<number>(0);
  const skipNextAutoComputeKeyRef = useRef<string | null>(null);
  const initializedRef = useRef<boolean>(false);

  // Live 1-second destination clock ticker
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const loadDestination = useCallback(
    async (
      id: string,
      label: string,
      cityQuery: string,
      center: LatLngPoint,
      zoom: number,
      seedStop?: PlaceItem,
    ) => {
      if (!placesLib) return;

      const seq = ++destinationSeqRef.current;
      setDestinationId(id);
      setDestinationLabel(label);
      setMapCenter(center);
      setMapZoom(zoom);
      setActiveCategory('attractions');
      setDiscoveryByCategory({});
      setDiscoveryLoading(true);
      setDiscoveryError(null);
      setInfoWindowOpen(false);
      setTimezone((prev) => ({ ...prev, source: 'loading' }));

      try {
        const [contextResult, attractions, hotels] = await Promise.all([
          resolveDestinationContext(placesLib, cityQuery).catch(() => null),
          searchDiscoveryPlaces(placesLib, 'attractions', label, center),
          searchDiscoveryPlaces(placesLib, 'hotels', label, center).catch(
            () => [],
          ),
        ]);

        if (seq !== destinationSeqRef.current) return;

        const effectiveCenter = contextResult?.center ?? center;
        const tzState = await fetchDestinationTimeZone(
          effectiveCenter,
          seedStop?.utcOffsetMinutes ?? contextResult?.utcOffsetMinutes ?? null,
        );

        if (seq !== destinationSeqRef.current) return;

        setTimezone(tzState);
        setDiscoveryByCategory({
          attractions,
          hotels,
        });
        setDiscoveryLoading(false);

        const initialDay1 = dedupePlaces(
          seedStop ? [seedStop, ...attractions.slice(0, 2)] : attractions.slice(0, 3),
        );
        const day1Ids = new Set(initialDay1.map((s) => s.id));
        const remainingAttractions = attractions.filter(
          (a) => !day1Ids.has(a.id),
        );
        const initialDay2 = dedupePlaces([
          ...remainingAttractions.slice(0, 2),
          ...(hotels.length > 0 ? [hotels[0]] : []),
        ]);

        setDay1Stops(initialDay1);
        setDay2Stops(initialDay2);
        setActiveDay(1);
        setSelectedPlace(seedStop ?? initialDay1[0] ?? attractions[0] ?? null);
      } catch (err) {
        if (seq !== destinationSeqRef.current) return;
        setDiscoveryLoading(false);
        setDiscoveryError(
          err instanceof Error
            ? `Unable to load places: ${err.message}`
            : 'Unable to load places for this destination.',
        );
      }
    },
    [placesLib],
  );

  // Pre-seed Tokyo on initial Places library load
  useEffect(() => {
    if (!placesLib || initializedRef.current) return;
    initializedRef.current = true;
    void loadDestination(
      DEFAULT_PRESET.id,
      DEFAULT_PRESET.label,
      DEFAULT_PRESET.cityQuery,
      DEFAULT_PRESET.center,
      DEFAULT_PRESET.zoom,
    );
  }, [placesLib, loadDestination]);

  // Fetch category results when switching between Attractions / Restaurants / Hotels
  const handleSelectCategory = useCallback(
    async (category: DiscoveryCategory) => {
      setActiveCategory(category);
      if (discoveryByCategory[category]) {
        setDiscoveryError(null);
        return;
      }
      if (!placesLib) return;

      const seq = destinationSeqRef.current;
      setDiscoveryLoading(true);
      setDiscoveryError(null);
      try {
        const items = await searchDiscoveryPlaces(
          placesLib,
          category,
          destinationLabel,
          mapCenter,
        );
        if (seq !== destinationSeqRef.current) return;
        setDiscoveryByCategory((prev) => ({
          ...prev,
          [category]: items,
        }));
      } catch (err) {
        if (seq !== destinationSeqRef.current) return;
        setDiscoveryError(
          err instanceof Error
            ? `Failed to search ${category}: ${err.message}`
            : `Failed to search ${category}.`,
        );
      } finally {
        if (seq === destinationSeqRef.current) {
          setDiscoveryLoading(false);
        }
      }
    },
    [discoveryByCategory, placesLib, destinationLabel, mapCenter],
  );

  const activeStops = activeDay === 1 ? day1Stops : day2Stops;
  const otherDayStops = activeDay === 1 ? day2Stops : day1Stops;
  const activeRouteKey = `${activeDay}:${travelMode}:${activeStops
    .map((s) => s.id)
    .join(',')}`;

  // Automatically compute multi-stop route polyline & metrics whenever active day stops or travel mode change
  useEffect(() => {
    if (!routesLib) return;

    if (skipNextAutoComputeKeyRef.current === activeRouteKey) {
      skipNextAutoComputeKeyRef.current = null;
      return;
    }

    const seq = ++routeSeqRef.current;

    if (activeStops.length < 2) {
      setComputedRoutes([]);
      setRouteSummary({
        totalDistanceMeters: 0,
        totalDurationMillis: 0,
        legs: [],
        isComputing: false,
        isOptimized: false,
        note:
          activeStops.length === 1
            ? 'Add at least 1 more stop to draw a multi-stop route.'
            : 'Add stops to Day ' + activeDay + ' to compute a route.',
        error: null,
      });
      return;
    }

    setRouteSummary((prev) => ({
      ...prev,
      isComputing: true,
      error: null,
    }));

    computeDayItineraryRoute(routesLib, activeStops, travelMode, false)
      .then((result) => {
        if (seq !== routeSeqRef.current) return;
        setComputedRoutes(result.routes);
        setRouteSummary(result.summary);
      })
      .catch((err) => {
        if (seq !== routeSeqRef.current) return;
        setComputedRoutes([]);
        setRouteSummary({
          totalDistanceMeters: 0,
          totalDurationMillis: 0,
          legs: [],
          isComputing: false,
          isOptimized: false,
          note: null,
          error:
            err instanceof Error
              ? err.message
              : 'Unable to compute route for the selected stops.',
        });
      });
  }, [routesLib, activeRouteKey, activeDay, activeStops, travelMode]);

  const handleOptimizeRoute = useCallback(async () => {
    if (!routesLib || activeStops.length < 3 || travelMode === 'TRANSIT') {
      return;
    }

    const seq = ++routeSeqRef.current;
    setRouteSummary((prev) => ({
      ...prev,
      isComputing: true,
      error: null,
    }));

    try {
      const result = await computeDayItineraryRoute(
        routesLib,
        activeStops,
        travelMode,
        true,
      );
      if (seq !== routeSeqRef.current) return;

      if (result.reorderedStops) {
        const nextKey = `${activeDay}:${travelMode}:${result.reorderedStops
          .map((s) => s.id)
          .join(',')}`;
        skipNextAutoComputeKeyRef.current = nextKey;

        if (activeDay === 1) {
          setDay1Stops(result.reorderedStops);
        } else {
          setDay2Stops(result.reorderedStops);
        }
      }

      setComputedRoutes(result.routes);
      setRouteSummary(result.summary);
    } catch (err) {
      if (seq !== routeSeqRef.current) return;
      setRouteSummary((prev) => ({
        ...prev,
        isComputing: false,
        error:
          err instanceof Error
            ? err.message
            : 'Unable to optimize route order.',
      }));
    }
  }, [routesLib, activeStops, travelMode, activeDay]);

  const handleSelectPreset = useCallback(
    (presetId: string) => {
      const preset = DESTINATION_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      void loadDestination(
        preset.id,
        preset.label,
        preset.cityQuery,
        preset.center,
        preset.zoom,
      );
    },
    [loadDestination],
  );

  const handleAutocompleteSelect = useCallback(
    (place: PlaceItem) => {
      void loadDestination(
        'custom',
        place.displayName,
        place.formattedAddress || place.displayName,
        place.location,
        13,
        place,
      );
    },
    [loadDestination],
  );

  const handleAddToDay = useCallback(
    (place: PlaceItem, day: ItineraryDay) => {
      if (day === 1) {
        setDay1Stops((prev) =>
          prev.some((s) => s.id === place.id) ? prev : [...prev, place],
        );
      } else {
        setDay2Stops((prev) =>
          prev.some((s) => s.id === place.id) ? prev : [...prev, place],
        );
      }
      setActiveDay(day);
      setSelectedPlace(place);
    },
    [],
  );

  const handleMoveStop = useCallback(
    (day: ItineraryDay, index: number, direction: -1 | 1) => {
      const updater = (prev: PlaceItem[]) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= prev.length) return prev;
        const copy = [...prev];
        const [moved] = copy.splice(index, 1);
        copy.splice(targetIndex, 0, moved);
        return copy;
      };
      if (day === 1) {
        setDay1Stops(updater);
      } else {
        setDay2Stops(updater);
      }
    },
    [],
  );

  const handleRemoveStop = useCallback((day: ItineraryDay, stopId: string) => {
    const updater = (prev: PlaceItem[]) => prev.filter((s) => s.id !== stopId);
    if (day === 1) {
      setDay1Stops(updater);
    } else {
      setDay2Stops(updater);
    }
  }, []);

  const handleInspectPlace = useCallback(
    (place: PlaceItem, openInfo = false) => {
      setSelectedPlace(place);
      setInfoWindowOpen(openInfo);
    },
    [],
  );

  const activeResults = discoveryByCategory[activeCategory] ?? [];

  return (
    <div className="app-shell">
      <DestinationHeader
        destinationId={destinationId}
        destinationLabel={destinationLabel}
        timezone={timezone}
        nowMs={nowMs}
        onSelectPreset={handleSelectPreset}
        onAutocompleteSelect={handleAutocompleteSelect}
      />

      <main className="workspace-body">
        <aside className="left-sidebar">
          <ItineraryPanel
            activeDay={activeDay}
            day1Stops={day1Stops}
            day2Stops={day2Stops}
            travelMode={travelMode}
            routeSummary={routeSummary}
            selectedPlaceId={selectedPlace?.id ?? null}
            onSelectDay={setActiveDay}
            onChangeTravelMode={setTravelMode}
            onOptimizeRoute={handleOptimizeRoute}
            onMoveStop={handleMoveStop}
            onRemoveStop={handleRemoveStop}
            onInspectPlace={(place) => handleInspectPlace(place, true)}
          />

          <DiscoveryPanel
            destinationLabel={destinationLabel}
            activeCategory={activeCategory}
            results={activeResults}
            isLoading={discoveryLoading}
            error={discoveryError}
            day1Ids={day1Stops.map((s) => s.id)}
            day2Ids={day2Stops.map((s) => s.id)}
            selectedPlaceId={selectedPlace?.id ?? null}
            onSelectCategory={handleSelectCategory}
            onAddToDay={handleAddToDay}
            onInspectPlace={(place) => handleInspectPlace(place, true)}
          />
        </aside>

        <section className="right-workspace" aria-label="Interactive map and Street View">
          <MapWorkspace
            center={mapCenter}
            zoom={mapZoom}
            activeDay={activeDay}
            activeStops={activeStops}
            otherDayStops={otherDayStops}
            routes={computedRoutes}
            selectedPlace={selectedPlace}
            infoWindowOpen={infoWindowOpen}
            onSelectPlace={handleInspectPlace}
            onCloseInfoWindow={() => setInfoWindowOpen(false)}
          />

          <StreetViewPanel inspectedPlace={selectedPlace} />
        </section>
      </main>
    </div>
  );
}

export function App() {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
  const isMissingKey =
    !apiKey || apiKey === 'your_google_maps_api_key_here';

  if (isMissingKey) {
    return (
      <div className="setup-screen">
        <div className="setup-card">
          <h1>Google Maps API Key Required</h1>
          <p>
            Configure <code>VITE_GOOGLE_MAPS_API_KEY</code> in{' '}
            <code>.env.local</code> to run the Multi-Day Trip Itinerary Planner,
            Hotels &amp; Time Zone Hub.
          </p>
          <p>
            For free zero-billing prototyping, generate a{' '}
            <a
              href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
              target="_blank"
              rel="noopener noreferrer"
            >
              Maps Demo Key
            </a>{' '}
            and add it to <code>.env.local</code>:
          </p>
          <pre>VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here</pre>
          <p>Then restart the dev/preview server.</p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider
      apiKey={apiKey}
      language="en"
      region="US"
      libraries={['places', 'routes', 'marker', 'streetView', 'geometry', 'core']}
    >
      <ItineraryPlannerWorkspace />
    </APIProvider>
  );
}

export default App;
