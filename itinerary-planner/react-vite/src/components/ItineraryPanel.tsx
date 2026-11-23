import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Eye,
  Navigation,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { DAY_COLORS } from '../constants/destinations';
import type {
  ItineraryDay,
  PlaceItem,
  RouteSummaryState,
  TravelModeOption,
} from '../types/itinerary';
import { formatDistance, formatDuration } from '../utils/formatters';

interface ItineraryPanelProps {
  activeDay: ItineraryDay;
  day1Stops: PlaceItem[];
  day2Stops: PlaceItem[];
  travelMode: TravelModeOption;
  routeSummary: RouteSummaryState;
  selectedPlaceId: string | null;
  onSelectDay: (day: ItineraryDay) => void;
  onChangeTravelMode: (mode: TravelModeOption) => void;
  onOptimizeRoute: () => void;
  onMoveStop: (day: ItineraryDay, index: number, direction: -1 | 1) => void;
  onRemoveStop: (day: ItineraryDay, stopId: string) => void;
  onInspectPlace: (place: PlaceItem) => void;
}

export function ItineraryPanel({
  activeDay,
  day1Stops,
  day2Stops,
  travelMode,
  routeSummary,
  selectedPlaceId,
  onSelectDay,
  onChangeTravelMode,
  onOptimizeRoute,
  onMoveStop,
  onRemoveStop,
  onInspectPlace,
}: ItineraryPanelProps) {
  const activeStops = activeDay === 1 ? day1Stops : day2Stops;
  const dayStyle = DAY_COLORS[activeDay];
  const canOptimize =
    activeStops.length >= 3 &&
    travelMode !== 'TRANSIT' &&
    !routeSummary.isComputing;

  return (
    <section className="sidebar-section" aria-label="Multi-day itinerary">
      <div className="section-header-row">
        <h2 className="section-title">
          <Calendar size={14} /> Multi-Day Itinerary
        </h2>
      </div>

      <div data-testid="itinerary-day-tabs" className="day-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeDay === 1}
          className={`day-tab ${activeDay === 1 ? 'active-day1' : ''}`}
          onClick={() => onSelectDay(1)}
        >
          <span>
            <span
              className="day-tab-dot"
              style={{ backgroundColor: DAY_COLORS[1].hex }}
            />
            Day 1
          </span>
          <span className="day-tab-count">{day1Stops.length} stops</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeDay === 2}
          className={`day-tab ${activeDay === 2 ? 'active-day2' : ''}`}
          onClick={() => onSelectDay(2)}
        >
          <span>
            <span
              className="day-tab-dot"
              style={{ backgroundColor: DAY_COLORS[2].hex }}
            />
            Day 2
          </span>
          <span className="day-tab-count">{day2Stops.length} stops</span>
        </button>
      </div>

      <div className="route-controls-row">
        <select
          data-testid="travel-mode-select"
          className="travel-mode-select"
          aria-label="Travel mode"
          value={travelMode}
          onChange={(e) =>
            onChangeTravelMode(e.target.value as TravelModeOption)
          }
        >
          <option value="DRIVING">Drive</option>
          <option value="WALKING">Walk</option>
          <option value="TRANSIT">Transit</option>
        </select>

        <button
          type="button"
          data-testid="optimize-route-btn"
          className="optimize-btn"
          disabled={!canOptimize}
          onClick={onOptimizeRoute}
          title={
            travelMode === 'TRANSIT'
              ? 'Switch to Drive or Walk to optimize stop order'
              : activeStops.length < 3
                ? 'Add at least 3 stops to optimize intermediate order'
                : 'Optimize intermediate stops using Google Routes API'
          }
        >
          <Sparkles size={14} />
          {routeSummary.isComputing ? 'Calculating...' : 'Optimize Order'}
        </button>
      </div>

      <div data-testid="route-summary-bar" className="route-summary-bar">
        {activeStops.length >= 2 && !routeSummary.error ? (
          <>
            <div className="route-metrics-row">
              <span>
                <Navigation
                  size={12}
                  style={{ verticalAlign: '-1px', marginRight: 5 }}
                />
                {routeSummary.isComputing
                  ? 'Computing multi-stop route...'
                  : `${formatDistance(routeSummary.totalDistanceMeters)} · ${formatDuration(routeSummary.totalDurationMillis)}`}
              </span>
              <span>{activeStops.length} stops</span>
            </div>
            {routeSummary.note && (
              <div className="route-note">{routeSummary.note}</div>
            )}
          </>
        ) : (
          <div>
            {routeSummary.error ? (
              <span className="route-error">{routeSummary.error}</span>
            ) : (
              <span>
                {routeSummary.note ??
                  'Add at least 2 stops from Place Discovery to draw a multi-stop route.'}
              </span>
            )}
          </div>
        )}
      </div>

      <div data-testid="itinerary-stops-list" className="stops-list">
        {activeStops.length === 0 ? (
          <div className="empty-state">
            No stops added to Day {activeDay} yet. Use &ldquo;+ Day{' '}
            {activeDay}&rdquo; on any place below.
          </div>
        ) : (
          activeStops.map((stop, index) => {
            const leg = routeSummary.legs[index];
            const isSelected = selectedPlaceId === stop.id;
            return (
              <div
                key={`${activeDay}-${stop.id}`}
                className={`stop-card ${isSelected ? 'selected' : ''}`}
              >
                <div className="stop-card-main">
                  <span
                    className="stop-number-badge"
                    style={{ backgroundColor: dayStyle.hex }}
                  >
                    {index + 1}
                  </span>
                  <div className="stop-info">
                    <button
                      type="button"
                      className="stop-name-btn"
                      onClick={() => onInspectPlace(stop)}
                    >
                      {stop.displayName}
                    </button>
                    <div className="stop-meta">
                      {stop.primaryTypeDisplayName
                        ? `${stop.primaryTypeDisplayName} · `
                        : ''}
                      {stop.formattedAddress}
                    </div>
                  </div>
                  <div className="stop-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      title="Inspect Street View"
                      aria-label={`Inspect Street View for ${stop.displayName}`}
                      onClick={() => onInspectPlace(stop)}
                    >
                      <Eye size={13} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      disabled={index === 0}
                      title="Move stop up"
                      aria-label={`Move ${stop.displayName} up`}
                      onClick={() => onMoveStop(activeDay, index, -1)}
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      disabled={index === activeStops.length - 1}
                      title="Move stop down"
                      aria-label={`Move ${stop.displayName} down`}
                      onClick={() => onMoveStop(activeDay, index, 1)}
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      title="Remove stop"
                      aria-label={`Remove ${stop.displayName} from Day ${activeDay}`}
                      onClick={() => onRemoveStop(activeDay, stop.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {leg && index < activeStops.length - 1 && (
                  <div className="leg-connector">
                    <span>
                      Leg {index + 1}:{' '}
                      {leg.durationText ?? formatDuration(leg.durationMillis)} ·{' '}
                      {leg.distanceText ?? formatDistance(leg.distanceMeters)}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
