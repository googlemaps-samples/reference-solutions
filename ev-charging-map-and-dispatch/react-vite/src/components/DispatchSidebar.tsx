import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Navigation,
  Phone,
  RefreshCw,
  Route as RouteIcon,
  Star,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import type {
  ActiveDispatchRoute,
  DispatchProvider,
  RadiusKm,
} from '../types/dispatch';
import { formatManeuverLabel } from '../utils/formatters';

interface DispatchSidebarProps {
  providers: DispatchProvider[];
  selectedProviderId: string | null;
  activeRoute: ActiveDispatchRoute | null;
  isDiscovering: boolean;
  isComputingRoute: boolean;
  usedLiveMatrix: boolean;
  radiusKm: RadiusKm;
  errorMessage: string | null;
  onSelectProvider: (provider: DispatchProvider) => void;
  onDispatchRoute: (provider: DispatchProvider) => void;
  onClearRoute: () => void;
  onRefresh: () => void;
}

export function DispatchSidebar({
  providers,
  selectedProviderId,
  activeRoute,
  isDiscovering,
  isComputingRoute,
  usedLiveMatrix,
  radiusKm,
  errorMessage,
  onSelectProvider,
  onDispatchRoute,
  onClearRoute,
  onRefresh,
}: DispatchSidebarProps) {
  const [stepsExpanded, setStepsExpanded] = useState(true);

  return (
    <aside className="dispatch-sidebar" aria-label="Nearby EV stations and mechanics">
      <div className="sidebar-status-bar">
        <div className="sidebar-count-group">
          <span className="provider-count">
            {isDiscovering
              ? 'Scanning Seattle...'
              : `${providers.length} ${providers.length === 1 ? 'option' : 'options'} within ${radiusKm} km`}
          </span>
          <span className="sort-badge">
            {usedLiveMatrix ? 'Ranked by Live Driving ETA' : 'Ranked by Distance'}
          </span>
        </div>
        <button
          type="button"
          className="icon-refresh-btn"
          onClick={onRefresh}
          disabled={isDiscovering}
          title="Refresh nearby stations & mechanics"
          aria-label="Refresh nearby providers"
        >
          <RefreshCw size={15} className={isDiscovering ? 'spin' : ''} />
        </button>
      </div>

      {errorMessage && (
        <div className="sidebar-alert" role="alert">
          {errorMessage}
        </div>
      )}

      {activeRoute && (
        <section
          id="route-summary-panel"
          data-testid="route-summary-panel"
          className="route-summary-card"
          aria-label="Active dispatch route summary"
        >
          <div className="route-summary-header">
            <div className="route-summary-title-wrap">
              <span
                className={`category-chip ${
                  activeRoute.providerCategory === 'ev_charging' ? 'ev' : 'repair'
                }`}
              >
                {activeRoute.providerCategory === 'ev_charging'
                  ? 'EV Dispatch'
                  : 'Service Dispatch'}
              </span>
              <h2 className="route-destination-name">{activeRoute.providerName}</h2>
            </div>
            <button
              id="clear-route-btn"
              data-testid="clear-route-btn"
              type="button"
              className="btn-clear-route"
              onClick={onClearRoute}
              title="Clear active route"
            >
              <X size={15} />
              <span>Clear</span>
            </button>
          </div>

          <div className="route-metrics-row">
            <div className="route-metric">
              <Clock size={15} />
              <span>{activeRoute.durationText}</span>
            </div>
            <div className="route-metric">
              <RouteIcon size={15} />
              <span>{activeRoute.distanceText}</span>
            </div>
          </div>

          {activeRoute.steps.length > 0 && (
            <div className="steps-wrapper">
              <button
                type="button"
                className="steps-toggle-btn"
                onClick={() => setStepsExpanded((prev) => !prev)}
                aria-expanded={stepsExpanded}
              >
                <span>
                  Turn-by-Turn Directions ({activeRoute.steps.length} steps)
                </span>
                {stepsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {stepsExpanded && (
                <ol
                  id="turn-by-turn-steps"
                  data-testid="turn-by-turn-steps"
                  className="turn-by-turn-list"
                >
                  {activeRoute.steps.map((step, index) => (
                    <li key={`${index}-${step.instruction}`} className="turn-step-item">
                      <span className="step-index">{index + 1}</span>
                      <div className="step-body">
                        <p className="step-instruction">{step.instruction}</p>
                        <p className="step-meta">
                          {step.maneuver
                            ? `${formatManeuverLabel(step.maneuver)} • `
                            : ''}
                          {step.distanceText} • {step.durationText}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </section>
      )}

      <div
        id="provider-list"
        data-testid="provider-list"
        className="provider-list"
      >
        {isDiscovering && providers.length === 0 ? (
          <div className="loading-skeletons" aria-busy="true">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="skeleton-card">
                <div className="skeleton-line wide" />
                <div className="skeleton-line medium" />
                <div className="skeleton-line short" />
              </div>
            ))}
          </div>
        ) : providers.length === 0 ? (
          <div className="empty-state">
            <p className="empty-title">No stations or repair providers found</p>
            <p className="empty-subtitle">
              Try expanding the search radius to 15 km or dragging your breakdown
              pin closer to downtown Seattle.
            </p>
          </div>
        ) : (
          providers.map((provider, index) => {
            const isSelected = selectedProviderId === provider.id;
            const isRouted = activeRoute?.providerId === provider.id;

            return (
              <article
                key={provider.id}
                id={`provider-card-${index}`}
                data-testid={`provider-card-${index}`}
                className={`provider-card ${isSelected ? 'selected' : ''} ${
                  isRouted ? 'routed' : ''
                }`}
                onClick={() => onSelectProvider(provider)}
              >
                <div className="card-top-row">
                  <div className="card-badges">
                    <span className="rank-badge">#{index + 1}</span>
                    <span
                      className={`category-chip ${
                        provider.category === 'ev_charging' ? 'ev' : 'repair'
                      }`}
                    >
                      {provider.category === 'ev_charging' ? (
                        <>
                          <Zap size={12} />
                          <span>EV Charging</span>
                        </>
                      ) : (
                        <>
                          <Wrench size={12} />
                          <span>Auto Repair</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="eta-pill" title="Driving ETA and distance">
                    <Clock size={13} />
                    <span>
                      {provider.durationText ?? '—'} •{' '}
                      {provider.distanceText ?? '—'}
                    </span>
                  </div>
                </div>

                <h3 className="provider-name">{provider.name}</h3>
                <p className="provider-address">{provider.address}</p>

                <div className="provider-meta-row">
                  {provider.rating !== null ? (
                    <span className="rating-badge">
                      <Star size={13} fill="currentColor" />
                      <span>{provider.rating.toFixed(1)}</span>
                      {provider.userRatingCount !== null && (
                        <span className="rating-count">
                          ({provider.userRatingCount.toLocaleString()})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="rating-muted">New / Unrated</span>
                  )}

                  <span
                    className={`status-badge status-${provider.openingStatus.state}`}
                    title={provider.openingStatus.todayHours ?? undefined}
                  >
                    {provider.openingStatus.label}
                  </span>
                </div>

                {provider.category === 'ev_charging' &&
                  (provider.evTotalConnectors !== null ||
                    provider.evConnectors.length > 0) && (
                    <div className="ev-specs-row">
                      {provider.evAvailableConnectors !== null &&
                      provider.evTotalConnectors !== null ? (
                        <span className="ev-avail-badge">
                          {provider.evAvailableConnectors}/
                          {provider.evTotalConnectors} connectors available
                        </span>
                      ) : provider.evTotalConnectors !== null ? (
                        <span className="ev-avail-badge neutral">
                          {provider.evTotalConnectors} connectors
                        </span>
                      ) : null}

                      {provider.evMaxKw !== null && (
                        <span className="ev-kw-badge">
                          Up to {Math.round(provider.evMaxKw)} kW
                        </span>
                      )}

                      {provider.evConnectors.slice(0, 3).map((conn, idx) => (
                        <span
                          key={`${conn.type}-${idx}`}
                          className="connector-tag"
                        >
                          {conn.label}
                          {conn.count > 0 ? ` ×${conn.count}` : ''}
                        </span>
                      ))}
                    </div>
                  )}

                <div className="card-actions-row">
                  <button
                    type="button"
                    data-testid="dispatch-route-btn"
                    className={`btn-dispatch ${isRouted ? 'active' : ''}`}
                    disabled={isComputingRoute}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDispatchRoute(provider);
                    }}
                  >
                    <Navigation size={14} />
                    <span>
                      {isComputingRoute && isSelected
                        ? 'Computing...'
                        : isRouted
                          ? 'Active Route'
                          : 'Route Here'}
                    </span>
                  </button>

                  <div className="secondary-links">
                    {provider.phoneNumber && (
                      <a
                        href={`tel:${provider.phoneNumber}`}
                        className="icon-link-btn"
                        title={`Call ${provider.phoneNumber}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone size={14} />
                      </a>
                    )}
                    {provider.googleMapsUri && (
                      <a
                        href={provider.googleMapsUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="icon-link-btn"
                        title="Open in Google Maps"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </aside>
  );
}
