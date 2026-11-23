'use client';

import { useState } from 'react';
import {
  formatDistance,
  formatDuration,
  formatManeuverLabel,
} from '@/lib/dispatch-client';
import type {
  ComputedDispatchRoute,
  RadiusKm,
  ServiceProvider,
} from '@/lib/types';

interface DispatchSidebarProps {
  providers: ServiceProvider[];
  selectedProviderId: string | null;
  radiusKm: RadiusKm;
  loadingProviders: boolean;
  loadingRoute: boolean;
  activeRoute: ComputedDispatchRoute | null;
  errorMessage: string | null;
  textQuery: string;
  onTextQueryChange: (value: string) => void;
  onTextSearchSubmit: () => void;
  onSelectProvider: (provider: ServiceProvider) => void;
  onClearRoute: () => void;
}

export function DispatchSidebar({
  providers,
  selectedProviderId,
  radiusKm,
  loadingProviders,
  loadingRoute,
  activeRoute,
  errorMessage,
  textQuery,
  onTextQueryChange,
  onTextSearchSubmit,
  onSelectProvider,
  onClearRoute,
}: DispatchSidebarProps) {
  const [stepsExpanded, setStepsExpanded] = useState(true);

  return (
    <aside className="dispatch-sidebar" aria-label="Nearby service providers">
      <div className="sidebar-status-bar">
        <span>
          <span className="sidebar-count">{providers.length}</span> providers
          within {radiusKm} km
        </span>
        <span>
          {loadingProviders ? 'Updating ETA matrix…' : 'Ranked by driving ETA'}
        </span>
      </div>

      <form
        className="sidebar-search-row"
        onSubmit={(e) => {
          e.preventDefault();
          onTextSearchSubmit();
        }}
      >
        <input
          type="text"
          className="sidebar-search-input"
          value={textQuery}
          onChange={(e) => onTextQueryChange(e.target.value)}
          placeholder="Filter or refine (e.g., CCS fast charger, tire shop)…"
          aria-label="Text search filter for Seattle services"
        />
        <button type="submit" className="sidebar-search-btn">
          Search
        </button>
      </form>

      {errorMessage ? (
        <div className="error-banner" role="alert">
          {errorMessage}
        </div>
      ) : null}

      {(activeRoute || loadingRoute) && (
        <section
          id="route-summary-panel"
          className="route-summary-panel"
          aria-label="Active dispatch route summary"
        >
          {loadingRoute ? (
            <div className="route-summary-title">
              Calculating live traffic route…
            </div>
          ) : activeRoute ? (
            <>
              <div className="route-summary-header">
                <h2 className="route-summary-title">
                  Dispatch Route → {activeRoute.destinationName}
                </h2>
              </div>
              <div className="route-summary-metrics">
                <span>{formatDuration(activeRoute.durationSeconds)} ETA</span>
                <span>•</span>
                <span>{formatDistance(activeRoute.distanceMeters)}</span>
                <span>•</span>
                <span>{activeRoute.steps.length} steps</span>
              </div>
              <div className="route-actions-row">
                <button
                  type="button"
                  className="steps-toggle-btn"
                  onClick={() => setStepsExpanded((prev) => !prev)}
                >
                  {stepsExpanded
                    ? 'Hide turn-by-turn steps'
                    : 'Show turn-by-turn steps'}
                </button>
                <button
                  id="clear-route-btn"
                  type="button"
                  className="clear-route-btn"
                  onClick={onClearRoute}
                >
                  Clear Route
                </button>
              </div>
              {stepsExpanded && activeRoute.steps.length > 0 ? (
                <ol id="turn-by-turn-steps" className="turn-by-turn-list">
                  {activeRoute.steps.map((step, idx) => (
                    <li key={idx} className="turn-step-item">
                      <span>
                        <strong>{idx + 1}.</strong> {step.instruction}
                        {step.maneuver &&
                        step.maneuver !== 'MANEUVER_UNSPECIFIED' ? (
                          <span style={{ color: '#64748b' }}>
                            {' '}
                            ({formatManeuverLabel(step.maneuver)})
                          </span>
                        ) : null}
                      </span>
                      <span className="turn-step-meta">
                        {formatDistance(step.distanceMeters)}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </>
          ) : null}
        </section>
      )}

      <div id="provider-list" className="provider-list">
        {providers.length === 0 && !loadingProviders ? (
          <div className="empty-state">
            No matching stations or repair shops found inside {radiusKm} km. Try
            expanding the search radius to 15 km or dragging the driver pin.
          </div>
        ) : (
          providers.map((provider, index) => {
            const isSelected = provider.id === selectedProviderId;
            const etaLabel = provider.durationSeconds
              ? `${formatDuration(provider.durationSeconds)} • ${formatDistance(
                  provider.distanceMeters
                )}`
              : `${formatDistance(provider.straightLineMeters)} away`;

            return (
              <article
                key={provider.id}
                id={`provider-card-${index}`}
                className={`provider-card${isSelected ? ' selected' : ''}`}
                onClick={() => onSelectProvider(provider)}
              >
                <div className="provider-card-top">
                  <h3 className="provider-name">{provider.name}</h3>
                  <span className="eta-badge">{etaLabel}</span>
                </div>

                <div className="provider-badges">
                  <span
                    className={`badge ${
                      provider.category === 'ev' ? 'badge-ev' : 'badge-repair'
                    }`}
                  >
                    {provider.category === 'ev'
                      ? '⚡ EV Fast Charging'
                      : '🔧 Auto Repair'}
                  </span>

                  {typeof provider.openNow === 'boolean' ? (
                    <span
                      className={`badge ${
                        provider.openNow ? 'badge-open' : 'badge-closed'
                      }`}
                    >
                      {provider.openNow ? 'Open Now' : 'Closed'}
                    </span>
                  ) : null}

                  {provider.category === 'ev' && provider.maxChargeRateKw ? (
                    <span className="badge badge-neutral">
                      Up to {provider.maxChargeRateKw} kW
                    </span>
                  ) : null}
                </div>

                <p className="provider-address">{provider.address}</p>

                {provider.category === 'ev' &&
                (provider.evConnectorCount || provider.evConnectors?.length) ? (
                  <p className="provider-ev-details">
                    {typeof provider.evAvailableCount === 'number' &&
                    provider.evConnectorCount
                      ? `${provider.evAvailableCount}/${provider.evConnectorCount} ports available`
                      : `${provider.evConnectorCount ?? 0} connectors`}
                    {provider.evConnectors?.length
                      ? ` • ${provider.evConnectors
                          .slice(0, 3)
                          .map((c) => `${c.label} (${c.count})`)
                          .join(', ')}`
                      : ''}
                  </p>
                ) : null}

                <div className="provider-footer">
                  <span className="rating-text">
                    {typeof provider.rating === 'number' ? (
                      <>
                        ★ {provider.rating.toFixed(1)}{' '}
                        <span className="rating-muted">
                          ({provider.userRatingCount ?? 0})
                        </span>
                      </>
                    ) : (
                      <span className="rating-muted">No ratings yet</span>
                    )}
                  </span>

                  <button
                    id={index === 0 ? 'dispatch-route-btn' : undefined}
                    data-testid="dispatch-route-btn"
                    type="button"
                    className={`dispatch-route-btn${
                      isSelected && activeRoute ? ' active' : ''
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectProvider(provider);
                    }}
                  >
                    {isSelected && activeRoute ? 'Active Route' : 'Route Here'}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </aside>
  );
}
