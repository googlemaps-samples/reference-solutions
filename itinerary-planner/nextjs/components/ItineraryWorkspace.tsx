'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import {
  ArrowDown,
  ArrowUp,
  Compass,
  ExternalLink,
  Eye,
  Hotel,
  MapPin,
  Plus,
  Route as RouteIcon,
  Sparkles,
  Trash2,
  Utensils,
} from 'lucide-react';
import { DestinationSearch } from '@/components/DestinationSearch';
import { StreetViewPanel } from '@/components/StreetViewPanel';
import { TimeZoneHub } from '@/components/TimeZoneHub';
import { TripMap } from '@/components/TripMap';
import {
  buildDiscoveryTextQuery,
  DAY_COLORS,
  DESTINATION_PRESETS,
  formatDistance,
  formatPriceLevel,
} from '@/lib/formatters';
import {
  ComputedRouteData,
  DayNumber,
  DestinationState,
  DiscoveryCategory,
  PlaceItem,
  TimeZoneInfo,
  TravelMode,
} from '@/types/itinerary';

interface ItineraryWorkspaceProps {
  apiKey: string;
}

const INITIAL_DESTINATION: DestinationState = {
  name: 'Tokyo',
  formattedAddress: 'Tokyo, Japan',
  center: { lat: 35.6812, lng: 139.7671 },
  zoom: 12,
};

const EMPTY_DISCOVERY: Record<DiscoveryCategory, PlaceItem[]> = {
  attractions: [],
  restaurants: [],
  hotels: [],
};

const EMPTY_ITINERARY: Record<DayNumber, PlaceItem[]> = {
  1: [],
  2: [],
};

const EMPTY_ROUTES: Record<DayNumber, ComputedRouteData | null> = {
  1: null,
  2: null,
};

export function ItineraryWorkspace({ apiKey }: ItineraryWorkspaceProps) {
  const hasApiKey = Boolean(apiKey && apiKey.trim().length > 0);

  const [destination, setDestination] = useState<DestinationState>(INITIAL_DESTINATION);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('tokyo');
  const [timeZoneInfo, setTimeZoneInfo] = useState<TimeZoneInfo | null>(null);
  const [timeZoneLoading, setTimeZoneLoading] = useState<boolean>(false);

  const [activeCategory, setActiveCategory] = useState<DiscoveryCategory>('attractions');
  const [discoveryByCategory, setDiscoveryByCategory] =
    useState<Record<DiscoveryCategory, PlaceItem[]>>(EMPTY_DISCOVERY);
  const [discoveryLoading, setDiscoveryLoading] = useState<boolean>(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  const [activeDay, setActiveDay] = useState<DayNumber>(1);
  const [itinerary, setItinerary] = useState<Record<DayNumber, PlaceItem[]>>(EMPTY_ITINERARY);
  const [travelMode, setTravelMode] = useState<TravelMode>('DRIVE');
  const [routeByDay, setRouteByDay] = useState<Record<DayNumber, ComputedRouteData | null>>(EMPTY_ROUTES);
  const [routeLoading, setRouteLoading] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const [selectedPlace, setSelectedPlace] = useState<PlaceItem | null>(null);
  const [expandedHoursId, setExpandedHoursId] = useState<string | null>(null);

  // Track whether the current destination needs initial Day 1 / Day 2 seeding from live Places results
  const needsSeedRef = useRef<boolean>(true);
  const destinationKeyRef = useRef<string>('Tokyo:35.6812,139.7671');
  const timeZoneResolvedRef = useRef<boolean>(false);

  const fetchTimeZoneForDestination = useCallback(
    async (dest: DestinationState) => {
      if (!hasApiKey) return;
      timeZoneResolvedRef.current = false;
      setTimeZoneLoading(true);
      try {
        const res = await fetch(
          `/api/timezone?lat=${encodeURIComponent(dest.center.lat)}&lng=${encodeURIComponent(dest.center.lng)}`
        );
        if (res.ok) {
          const data = (await res.json()) as TimeZoneInfo & { available?: boolean };
          if (data.available !== false && data.timeZoneId) {
            timeZoneResolvedRef.current = true;
            setTimeZoneInfo(data);
            return;
          }
        }
      } catch {
        // Fallback below if Time Zone API call fails
      } finally {
        setTimeZoneLoading(false);
      }

      if (typeof dest.utcOffsetMinutes === 'number') {
        timeZoneResolvedRef.current = true;
        setTimeZoneInfo({
          timeZoneId: 'UTC_OFFSET',
          timeZoneName: `${dest.name} Local Time`,
          rawOffset: dest.utcOffsetMinutes * 60,
          dstOffset: 0,
          source: 'place-fallback',
        });
      }
    },
    [hasApiKey]
  );

  const fetchDiscoveryCategory = useCallback(
    async (
      dest: DestinationState,
      category: DiscoveryCategory,
      seedIfNeeded: boolean
    ) => {
      if (!hasApiKey) return;
      const currentDestKey = `${dest.name}:${dest.center.lat},${dest.center.lng}`;
      setDiscoveryLoading(true);
      setDiscoveryError(null);

      try {
        let places: PlaceItem[] = [];

        if (category === 'attractions') {
          const res = await fetch('/api/places/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              textQuery: buildDiscoveryTextQuery(dest.name, 'attractions'),
              locationBias: {
                lat: dest.center.lat,
                lng: dest.center.lng,
                radiusMeters: 15000,
              },
              maxResultCount: 10,
            }),
          });
          const data = (await res.json()) as { places?: PlaceItem[]; error?: string };
          if (!res.ok) {
            throw new Error(data.error || 'Failed to load attractions.');
          }
          places = (data.places || []).map((p) => ({ ...p, category: 'attractions' }));
        } else {
          const includedTypes =
            category === 'restaurants' ? ['restaurant'] : ['lodging'];
          const nearbyRes = await fetch('/api/places/nearby', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lat: dest.center.lat,
              lng: dest.center.lng,
              radiusMeters: 8000,
              includedTypes,
              maxResultCount: 10,
              rankPreference: 'POPULARITY',
            }),
          });
          const nearbyData = (await nearbyRes.json()) as {
            places?: PlaceItem[];
            error?: string;
          };

          if (nearbyRes.ok && Array.isArray(nearbyData.places) && nearbyData.places.length > 0) {
            places = nearbyData.places.map((p) => ({ ...p, category }));
          } else {
            // Fallback to Text Search if Nearby Search returns sparse results
            const textRes = await fetch('/api/places/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                textQuery: buildDiscoveryTextQuery(dest.name, category),
                locationBias: {
                  lat: dest.center.lat,
                  lng: dest.center.lng,
                  radiusMeters: 15000,
                },
                maxResultCount: 10,
              }),
            });
            const textData = (await textRes.json()) as {
              places?: PlaceItem[];
              error?: string;
            };
            if (!textRes.ok) {
              throw new Error(textData.error || nearbyData.error || 'Failed to load places.');
            }
            places = (textData.places || []).map((p) => ({ ...p, category }));
          }
        }

        if (destinationKeyRef.current !== currentDestKey) return;

        setDiscoveryByCategory((prev) => ({
          ...prev,
          [category]: places,
        }));

        if (seedIfNeeded && needsSeedRef.current && places.length > 0) {
          needsSeedRef.current = false;
          const day1Stops = places.slice(0, 3);
          const day2Stops = places.slice(3, 6);
          setItinerary({
            1: day1Stops,
            2: day2Stops,
          });
          setSelectedPlace(day1Stops[0] || places[0]);

          if (!timeZoneResolvedRef.current && places[0]?.id) {
            void fetch(
              `/api/places/details?placeId=${encodeURIComponent(places[0].id)}`
            )
              .then((r) => (r.ok ? r.json() : null))
              .then((details: { place?: PlaceItem | null } | null) => {
                if (
                  !timeZoneResolvedRef.current &&
                  destinationKeyRef.current === currentDestKey &&
                  typeof details?.place?.utcOffsetMinutes === 'number'
                ) {
                  timeZoneResolvedRef.current = true;
                  setTimeZoneInfo({
                    timeZoneId: 'UTC_OFFSET',
                    timeZoneName: `${dest.name} Local Time`,
                    rawOffset: details.place.utcOffsetMinutes * 60,
                    dstOffset: 0,
                    source: 'place-fallback',
                  });
                }
              })
              .catch(() => {
                // Ignore fallback errors
              });
          }
        }
      } catch (err) {
        if (destinationKeyRef.current !== currentDestKey) return;
        setDiscoveryError(
          err instanceof Error ? err.message : 'Unable to fetch places right now.'
        );
      } finally {
        if (destinationKeyRef.current === currentDestKey) {
          setDiscoveryLoading(false);
        }
      }
    },
    [hasApiKey]
  );

  // Trigger initial load and destination changes
  useEffect(() => {
    const destKey = `${destination.name}:${destination.center.lat},${destination.center.lng}`;
    destinationKeyRef.current = destKey;
    needsSeedRef.current = true;
    setDiscoveryByCategory(EMPTY_DISCOVERY);
    setItinerary(EMPTY_ITINERARY);
    setRouteByDay(EMPTY_ROUTES);
    setSelectedPlace(null);
    setActiveCategory('attractions');
    setActiveDay(1);

    void fetchTimeZoneForDestination(destination);
    void fetchDiscoveryCategory(destination, 'attractions', true);
  }, [destination, fetchTimeZoneForDestination, fetchDiscoveryCategory]);

  // Fetch category results on tab switch if not yet loaded
  const handleSelectCategory = (category: DiscoveryCategory) => {
    setActiveCategory(category);
    if (discoveryByCategory[category].length === 0) {
      void fetchDiscoveryCategory(destination, category, false);
    }
  };

  // Compute route for active day whenever stops or travelMode change
  const activeStops = itinerary[activeDay];

  const computeRouteForStops = useCallback(
    async (stops: PlaceItem[], day: DayNumber, mode: TravelMode, optimize: boolean) => {
      if (!hasApiKey || stops.length < 2) {
        setRouteByDay((prev) => ({ ...prev, [day]: null }));
        setRouteError(null);
        return;
      }

      setRouteLoading(true);
      setRouteError(null);

      try {
        const res = await fetch('/api/routes/compute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            waypoints: stops.map((s) => s.location),
            travelMode: mode,
            optimizeWaypointOrder: optimize,
          }),
        });
        const data = (await res.json()) as {
          route?: ComputedRouteData;
          error?: string;
        };

        if (!res.ok || !data.route) {
          throw new Error(data.error || 'Could not compute route for these stops.');
        }

        const computedRoute = data.route;

        // If waypoint optimization was requested, reorder intermediate stops and re-sync route
        if (
          optimize &&
          Array.isArray(computedRoute.optimizedIntermediateWaypointIndex) &&
          computedRoute.optimizedIntermediateWaypointIndex.length === stops.length - 2
        ) {
          const origin = stops[0];
          const destStop = stops[stops.length - 1];
          const intermediates = stops.slice(1, -1);
          const reorderedIntermediates = computedRoute.optimizedIntermediateWaypointIndex.map(
            (idx) => intermediates[idx]
          );
          const reorderedStops = [origin, ...reorderedIntermediates, destStop];

          setItinerary((prev) => ({
            ...prev,
            [day]: reorderedStops,
          }));
        }

        setRouteByDay((prev) => ({
          ...prev,
          [day]: computedRoute,
        }));
      } catch (err) {
        setRouteByDay((prev) => ({ ...prev, [day]: null }));
        setRouteError(
          err instanceof Error ? err.message : 'Route computation failed.'
        );
      } finally {
        setRouteLoading(false);
      }
    },
    [hasApiKey]
  );

  useEffect(() => {
    void computeRouteForStops(activeStops, activeDay, travelMode, false);
  }, [activeStops, activeDay, travelMode, computeRouteForStops]);

  const handleSelectDestination = (nextDest: DestinationState) => {
    setSelectedPresetId('');
    setDestination(nextDest);
  };

  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = DESTINATION_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    setDestination({
      name: preset.city,
      formattedAddress: preset.label,
      center: preset.center,
      zoom: preset.zoom,
    });
  };

  const handleAddStop = (place: PlaceItem, day: DayNumber) => {
    setItinerary((prev) => {
      const existing = prev[day];
      if (existing.some((item) => item.id === place.id)) {
        return prev;
      }
      return {
        ...prev,
        [day]: [...existing, place],
      };
    });
    setActiveDay(day);
    setSelectedPlace(place);
  };

  const handleRemoveStop = (placeId: string, day: DayNumber) => {
    setItinerary((prev) => ({
      ...prev,
      [day]: prev[day].filter((item) => item.id !== placeId),
    }));
  };

  const handleMoveStop = (index: number, direction: -1 | 1, day: DayNumber) => {
    setItinerary((prev) => {
      const list = [...prev[day]];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= list.length) return prev;
      const [moved] = list.splice(index, 1);
      list.splice(targetIndex, 0, moved);
      return { ...prev, [day]: list };
    });
  };

  const currentDiscoveryResults = discoveryByCategory[activeCategory];
  const activeRoute = routeByDay[activeDay];
  const dayColor = DAY_COLORS[activeDay];
  const canOptimize =
    hasApiKey &&
    activeStops.length >= 3 &&
    travelMode !== 'TRANSIT' &&
    !routeLoading;

  const content = (
    <div className="app-shell">
      <header className="top-header">
        <div className="brand-group">
          <div className="brand-badge" aria-hidden="true">
            <Compass size={18} />
          </div>
          <div>
            <h1 className="brand-title">
              Multi-Day Trip Itinerary Planner, Hotels &amp; Time Zone Hub
            </h1>
            <p className="brand-subtitle">
              Exploring {destination.formattedAddress} · Places (New) · Routes v2 · Street View
            </p>
          </div>
        </div>

        <div className="header-controls">
          <DestinationSearch
            hasApiKey={hasApiKey}
            onSelectDestination={handleSelectDestination}
          />

          <select
            data-testid="destination-quick-select"
            className="quick-select"
            aria-label="Quick destination selector"
            value={selectedPresetId}
            onChange={(e) => handlePresetChange(e.target.value)}
          >
            {!selectedPresetId && (
              <option value="">{destination.name} (Custom)</option>
            )}
            {DESTINATION_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>

          <TimeZoneHub
            destinationName={destination.name}
            timeZoneInfo={timeZoneInfo}
            loading={timeZoneLoading}
          />
        </div>
      </header>

      <main className="workspace-split">
        <aside className="left-sidebar" aria-label="Itinerary and place discovery">
          {/* Multi-Day Itinerary Builder */}
          <section className="sidebar-section">
            <div className="section-header-row">
              <h2 className="section-title">
                <RouteIcon size={15} />
                Multi-Day Itinerary
              </h2>
              <span className="destination-chip">{destination.name}</span>
            </div>

            <div data-testid="itinerary-day-tabs" className="day-tabs" role="tablist">
              {([1, 2] as DayNumber[]).map((day) => {
                const style = DAY_COLORS[day];
                const isActive = activeDay === day;
                return (
                  <button
                    key={day}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`day-tab-btn ${isActive ? `active-day-${day}` : ''}`}
                    onClick={() => setActiveDay(day)}
                  >
                    <span>
                      <span
                        className="day-dot"
                        style={{ background: style.hex }}
                      />
                      {style.label}
                    </span>
                    <span className="day-count-pill">{itinerary[day].length} stops</span>
                  </button>
                );
              })}
            </div>

            <div className="route-controls">
              <select
                data-testid="travel-mode-select"
                className="travel-select"
                aria-label="Travel mode"
                value={travelMode}
                onChange={(e) => setTravelMode(e.target.value as TravelMode)}
              >
                <option value="DRIVE">Drive (Traffic-aware)</option>
                <option value="WALK">Walk</option>
                <option value="TRANSIT">Public Transit</option>
              </select>

              <button
                type="button"
                data-testid="optimize-route-btn"
                className={`optimize-btn ${activeDay === 2 ? 'day-2' : ''}`}
                disabled={!canOptimize}
                title={
                  travelMode === 'TRANSIT'
                    ? 'Waypoint order optimization is available for Drive and Walk modes'
                    : activeStops.length < 3
                      ? 'Add at least 3 stops to optimize intermediate order'
                      : 'Optimize intermediate stop order using Routes API'
                }
                onClick={() =>
                  void computeRouteForStops(activeStops, activeDay, travelMode, true)
                }
              >
                <Sparkles size={13} />
                Optimize Order
              </button>
            </div>

            <div data-testid="route-summary-bar" className="route-summary-bar">
              {routeLoading ? (
                <span>Computing {dayColor.label} route…</span>
              ) : activeRoute ? (
                <>
                  <div className="route-summary-metrics">
                    <span>{formatDistance(activeRoute.distanceMeters)}</span>
                    <span>•</span>
                    <span>{activeRoute.durationText}</span>
                  </div>
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    {activeStops.length} stops ({travelMode.toLowerCase()})
                  </span>
                </>
              ) : (
                <span>
                  {activeStops.length < 2
                    ? `Add ${2 - activeStops.length} more stop${2 - activeStops.length === 1 ? '' : 's'} to compute ${dayColor.label} route`
                    : routeError || 'Route preview unavailable'}
                </span>
              )}
            </div>

            {routeError && activeStops.length >= 2 && (
              <div className="error-inline">{routeError}</div>
            )}

            <div data-testid="itinerary-stops-list" className="stops-list">
              {activeStops.length === 0 ? (
                <div className="empty-state">
                  No stops in {dayColor.label} yet. Add attractions, restaurants, or
                  hotels from Place Discovery below.
                </div>
              ) : (
                activeStops.map((stop, idx) => {
                  const leg = activeRoute?.legs?.[idx];
                  const isSelected = selectedPlace?.id === stop.id;
                  return (
                    <div
                      key={`${activeDay}-${stop.id}`}
                      className={`stop-card ${isSelected ? 'selected' : ''}`}
                    >
                      <div
                        className="stop-number"
                        style={{ background: dayColor.hex }}
                        aria-hidden="true"
                      >
                        {idx + 1}
                      </div>
                      <div className="stop-body">
                        <p className="stop-name">{stop.displayName}</p>
                        <div className="stop-meta">
                          {stop.primaryTypeDisplayName || 'Stop'}
                          {stop.rating !== undefined ? ` · ★ ${stop.rating.toFixed(1)}` : ''}
                        </div>
                        {leg && idx < activeStops.length - 1 && (
                          <span className="stop-leg-chip">
                            Next leg: {formatDistance(leg.distanceMeters)} · {leg.durationText}
                          </span>
                        )}
                      </div>
                      <div className="stop-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          title="Inspect Street View"
                          aria-label={`Inspect Street View for ${stop.displayName}`}
                          onClick={() => setSelectedPlace(stop)}
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          title="Move stop up"
                          aria-label={`Move ${stop.displayName} up`}
                          disabled={idx === 0}
                          onClick={() => handleMoveStop(idx, -1, activeDay)}
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          title="Move stop down"
                          aria-label={`Move ${stop.displayName} down`}
                          disabled={idx === activeStops.length - 1}
                          onClick={() => handleMoveStop(idx, 1, activeDay)}
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          title="Remove stop"
                          aria-label={`Remove ${stop.displayName}`}
                          onClick={() => handleRemoveStop(stop.id, activeDay)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Live Places API (New) Discovery */}
          <section className="sidebar-section">
            <div className="section-header-row">
              <h2 className="section-title">
                <MapPin size={15} />
                Discover {destination.name}
              </h2>
              <span style={{ fontSize: 11, color: '#64748b' }}>Places API (New)</span>
            </div>

            <div
              data-testid="discovery-category-tabs"
              className="category-tabs"
              role="tablist"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeCategory === 'attractions'}
                className={`category-tab-btn ${activeCategory === 'attractions' ? 'active' : ''}`}
                onClick={() => handleSelectCategory('attractions')}
              >
                <Compass size={13} />
                Attractions
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeCategory === 'restaurants'}
                className={`category-tab-btn ${activeCategory === 'restaurants' ? 'active' : ''}`}
                onClick={() => handleSelectCategory('restaurants')}
              >
                <Utensils size={13} />
                Restaurants
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeCategory === 'hotels'}
                className={`category-tab-btn ${activeCategory === 'hotels' ? 'active' : ''}`}
                onClick={() => handleSelectCategory('hotels')}
              >
                <Hotel size={13} />
                Hotels
              </button>
            </div>

            {discoveryError && <div className="error-inline">{discoveryError}</div>}

            <div data-testid="discovery-results-list" className="discovery-list">
              {!hasApiKey ? (
                <div className="empty-state">
                  Configure <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to load live{' '}
                  {activeCategory} in {destination.name}.
                </div>
              ) : discoveryLoading && currentDiscoveryResults.length === 0 ? (
                <div className="empty-state">
                  Searching top {activeCategory} in {destination.name}…
                </div>
              ) : currentDiscoveryResults.length === 0 ? (
                <div className="empty-state">
                  No {activeCategory} found for {destination.name}. Try another category
                  or destination.
                </div>
              ) : (
                currentDiscoveryResults.map((place) => {
                  const firstPhotoName = place.photos?.[0]?.name;
                  const priceLabel = formatPriceLevel(place.priceLevel);
                  const weekdays = place.regularOpeningHours?.weekdayDescriptions || [];
                  const isHoursExpanded = expandedHoursId === place.id;
                  const isSelected = selectedPlace?.id === place.id;
                  const inDay1 = itinerary[1].some((s) => s.id === place.id);
                  const inDay2 = itinerary[2].some((s) => s.id === place.id);

                  return (
                    <article
                      key={place.id}
                      className={`place-card ${isSelected ? 'selected' : ''}`}
                    >
                      <div className="place-photo-wrap">
                        {firstPhotoName ? (
                          <img
                            src={`/api/places/photo?name=${encodeURIComponent(firstPhotoName)}&maxWidthPx=520`}
                            alt={place.displayName}
                            className="place-photo"
                            loading="lazy"
                          />
                        ) : (
                          <div className="place-photo-placeholder">
                            No photo available
                          </div>
                        )}
                        {(place.primaryTypeDisplayName || priceLabel) && (
                          <span className="place-type-badge">
                            {[place.primaryTypeDisplayName, priceLabel]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        )}
                      </div>

                      <div className="place-card-content">
                        <div className="place-title-row">
                          <h3 className="place-title">{place.displayName}</h3>
                          {place.rating !== undefined && (
                            <span className="rating-pill">
                              ★ {place.rating.toFixed(1)}
                              {place.userRatingCount !== undefined
                                ? ` (${place.userRatingCount.toLocaleString()})`
                                : ''}
                            </span>
                          )}
                        </div>

                        <p className="place-address">{place.formattedAddress}</p>

                        {place.regularOpeningHours && (
                          <div className="hours-box">
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 6,
                              }}
                            >
                              <span>
                                {place.regularOpeningHours.openNow !== undefined && (
                                  <span
                                    className={`open-status ${
                                      place.regularOpeningHours.openNow
                                        ? 'open'
                                        : 'closed'
                                    }`}
                                  >
                                    {place.regularOpeningHours.openNow
                                      ? 'Open now'
                                      : 'Closed'}
                                  </span>
                                )}
                                {weekdays[0] ? weekdays[0] : 'Opening hours available'}
                              </span>
                              {weekdays.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedHoursId(isHoursExpanded ? null : place.id)
                                  }
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#1d4ed8',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    padding: 0,
                                  }}
                                >
                                  {isHoursExpanded ? 'Hide' : 'Hours'}
                                </button>
                              )}
                            </div>
                            {isHoursExpanded && weekdays.length > 0 && (
                              <ul
                                style={{
                                  margin: '6px 0 0 0',
                                  paddingLeft: 16,
                                  lineHeight: 1.4,
                                }}
                              >
                                {weekdays.map((line) => (
                                  <li key={line}>{line}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}

                        <div className="place-actions-row">
                          <button
                            type="button"
                            className="action-btn day1"
                            disabled={inDay1}
                            onClick={() => handleAddStop(place, 1)}
                          >
                            <Plus size={12} />
                            {inDay1 ? 'In Day 1' : 'Day 1'}
                          </button>
                          <button
                            type="button"
                            className="action-btn day2"
                            disabled={inDay2}
                            onClick={() => handleAddStop(place, 2)}
                          >
                            <Plus size={12} />
                            {inDay2 ? 'In Day 2' : 'Day 2'}
                          </button>
                          <button
                            type="button"
                            className="action-btn street"
                            onClick={() => setSelectedPlace(place)}
                          >
                            <Eye size={12} />
                            Street View
                          </button>
                          {place.googleMapsUri && (
                            <a
                              href={place.googleMapsUri}
                              target="_blank"
                              rel="noreferrer"
                              className="action-btn"
                              title="Open in Google Maps"
                            >
                              <ExternalLink size={11} />
                              Maps
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </aside>

        <section className="right-workspace" aria-label="Interactive map and Street View">
          <TripMap
            hasApiKey={hasApiKey}
            destination={destination}
            activeDay={activeDay}
            activeStops={activeStops}
            discoveryPlaces={currentDiscoveryResults}
            routeData={activeRoute}
            selectedPlace={selectedPlace}
            onSelectPlace={setSelectedPlace}
            onAddStop={handleAddStop}
          />

          <StreetViewPanel
            selectedPlace={selectedPlace}
            hasApiKey={hasApiKey}
          />
        </section>
      </main>
    </div>
  );

  if (!hasApiKey) {
    return content;
  }

  return (
    <APIProvider
      apiKey={apiKey}
      libraries={['maps', 'marker', 'places', 'routes', 'streetView', 'geometry', 'core']}
      language="en"
      region="US"
    >
      {content}
    </APIProvider>
  );
}
