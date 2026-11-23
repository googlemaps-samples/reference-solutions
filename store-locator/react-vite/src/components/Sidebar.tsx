import React from 'react';
import {
  BRANCH_TYPE_META,
  SERVICE_META,
  type ActiveRouteInfo,
  type BranchLocation,
  type BranchMatrixMetrics,
  type BranchType,
  type OriginPoint,
  type ServiceTag,
  type TravelModeOption,
} from '../types/locator';
import { BranchTypeIcon, RouteBoltIcon } from './Icons';

interface SidebarProps {
  branches: BranchLocation[];
  totalCount: number;
  metricsById: Record<string, BranchMatrixMetrics>;
  fastestBranchId: string | null;
  selectedBranchId: string | null;
  onSelectBranch: (branchId: string) => void;
  selectedTypeFilter: BranchType | 'all';
  onTypeFilterChange: (filter: BranchType | 'all') => void;
  selectedServices: ServiceTag[];
  onToggleService: (service: ServiceTag) => void;
  onResetFilters: () => void;
  activeRoute: ActiveRouteInfo | null;
  onClearRoute: () => void;
  onRouteToFastest: () => void;
  origin: OriginPoint;
  travelMode: TravelModeOption;
  branchesLoading: boolean;
  branchesError: string | null;
  matrixLoading: boolean;
  routeError: string | null;
  hasApiKey: boolean;
}

const SERVICE_KEYS: ServiceTag[] = ['pickup', 'coffee', 'cash', 'open24'];

export const Sidebar: React.FC<SidebarProps> = ({
  branches,
  totalCount,
  metricsById,
  fastestBranchId,
  selectedBranchId,
  onSelectBranch,
  selectedTypeFilter,
  onTypeFilterChange,
  selectedServices,
  onToggleService,
  onResetFilters,
  activeRoute,
  onClearRoute,
  onRouteToFastest,
  origin,
  travelMode,
  branchesLoading,
  branchesError,
  matrixLoading,
  routeError,
  hasApiKey,
}) => {
  const fastestBranch = fastestBranchId
    ? branches.find((b) => b.id === fastestBranchId) ?? null
    : null;
  const fastestMetrics = fastestBranchId
    ? metricsById[fastestBranchId]
    : undefined;

  return (
    <aside className="sidebar" aria-label="Branch directory and filters">
      <div className="sidebar-filters">
        <div className="filter-section">
          <div className="filter-section-header">
            <span className="filter-label">Branch Type</span>
            <span className="branch-count-pill">
              {branches.length} of {totalCount}
            </span>
          </div>
          <div className="filter-chip-row">
            <button
              type="button"
              data-testid="filter-type-all"
              className={`filter-chip ${selectedTypeFilter === 'all' ? 'active' : ''}`}
              onClick={() => onTypeFilterChange('all')}
            >
              All
            </button>
            <button
              type="button"
              data-testid="filter-type-flagship"
              className={`filter-chip ${selectedTypeFilter === 'flagship' ? 'active' : ''}`}
              onClick={() => onTypeFilterChange('flagship')}
            >
              <span
                className="chip-dot"
                style={{ backgroundColor: BRANCH_TYPE_META.flagship.color }}
              />
              Flagship Store
            </button>
            <button
              type="button"
              data-testid="filter-type-kiosk"
              className={`filter-chip ${selectedTypeFilter === 'kiosk' ? 'active' : ''}`}
              onClick={() => onTypeFilterChange('kiosk')}
            >
              <span
                className="chip-dot"
                style={{ backgroundColor: BRANCH_TYPE_META.kiosk.color }}
              />
              Express Kiosk
            </button>
            <button
              type="button"
              data-testid="filter-type-atm"
              className={`filter-chip ${selectedTypeFilter === 'atm' ? 'active' : ''}`}
              onClick={() => onTypeFilterChange('atm')}
            >
              <span
                className="chip-dot"
                style={{ backgroundColor: BRANCH_TYPE_META.atm.color }}
              />
              24/7 ATM
            </button>
          </div>
        </div>

        <div className="filter-section">
          <div className="filter-section-header">
            <span className="filter-label">Products &amp; Services</span>
            {(selectedTypeFilter !== 'all' || selectedServices.length > 0) && (
              <button
                type="button"
                className="reset-filters-link"
                onClick={onResetFilters}
              >
                Reset
              </button>
            )}
          </div>
          <div className="filter-chip-row">
            {SERVICE_KEYS.map((service) => {
              const active = selectedServices.includes(service);
              return (
                <button
                  key={service}
                  type="button"
                  data-testid={`filter-service-${service}`}
                  className={`service-chip ${active ? 'active' : ''}`}
                  onClick={() => onToggleService(service)}
                >
                  {SERVICE_META[service].label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="route-summary-banner" data-testid="route-summary-banner">
        {activeRoute ? (
          <div className="route-banner-content">
            <div className="route-banner-top">
              <span className="route-mode-tag">{activeRoute.travelMode}</span>
              <span className="route-metrics-strong">
                {activeRoute.durationText} · {activeRoute.distanceText}
              </span>
              <button
                type="button"
                className="clear-route-btn"
                onClick={onClearRoute}
              >
                Clear
              </button>
            </div>
            <div className="route-banner-sub">
              From <strong>{origin.label}</strong> to{' '}
              <strong>{activeRoute.branchName}</strong>
            </div>
            {routeError && (
              <div className="route-banner-error">{routeError}</div>
            )}
          </div>
        ) : fastestBranch ? (
          <div className="route-banner-content">
            <div className="route-banner-top">
              <span className="fastest-pill-mini">
                <RouteBoltIcon size={12} />
                Fastest ({travelMode})
              </span>
              <span className="route-metrics-strong">
                {fastestMetrics?.durationText ?? 'Calculating…'} ·{' '}
                {fastestMetrics?.distanceText ?? '—'}
              </span>
            </div>
            <div className="route-banner-sub route-banner-action-row">
              <span className="truncate-text">
                {fastestBranch.name} from {origin.label}
              </span>
              <button
                type="button"
                className="mini-route-btn"
                onClick={onRouteToFastest}
              >
                Show Route
              </button>
            </div>
          </div>
        ) : (
          <div className="route-banner-content">
            <div className="route-banner-sub">
              {hasApiKey
                ? 'Select any NYC branch below or click Route to Fastest to preview directions.'
                : 'Configure VITE_GOOGLE_MAPS_API_KEY in .env.local to load live NYC branches and Routes API ETAs.'}
            </div>
          </div>
        )}
      </div>

      <div className="branch-list" data-testid="branch-list">
        {!hasApiKey ? (
          <div className="empty-state-card">
            <h3>Google Maps API Key Required</h3>
            <p>
              Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to{' '}
              <code>.env.local</code> to load live NYC locations via Places API
              (New) and compute road ETAs with the Routes API.
            </p>
          </div>
        ) : branchesLoading ? (
          <div className="loading-list">
            {[0, 1, 2, 3].map((idx) => (
              <div key={idx} className="branch-card-skeleton" />
            ))}
          </div>
        ) : branchesError && branches.length === 0 ? (
          <div className="empty-state-card">
            <h3>Unable to Load Branches</h3>
            <p>{branchesError}</p>
          </div>
        ) : branches.length === 0 ? (
          <div className="empty-state-card">
            <h3>No Matching Locations</h3>
            <p>
              No NYC branches match your active type and service filters. Try
              clearing one or more filters.
            </p>
            <button
              type="button"
              className="reset-btn-primary"
              onClick={onResetFilters}
            >
              Show All Branches
            </button>
          </div>
        ) : (
          branches.map((branch) => {
            const meta = BRANCH_TYPE_META[branch.branchType];
            const metrics = metricsById[branch.id];
            const isSelected = branch.id === selectedBranchId;
            const isFastest = branch.id === fastestBranchId;

            return (
              <button
                key={branch.id}
                type="button"
                data-testid="branch-card"
                data-branch-id={branch.id}
                className={`branch-card ${isSelected ? 'selected' : ''} ${isFastest ? 'fastest' : ''}`}
                onClick={() => onSelectBranch(branch.id)}
              >
                <div className="branch-card-header">
                  <div className="branch-badges">
                    <span
                      className="type-badge"
                      style={{
                        color: meta.badgeTextColor,
                        backgroundColor: meta.bgColor,
                        borderColor: meta.borderColor,
                      }}
                    >
                      <BranchTypeIcon type={branch.branchType} size={13} />
                      {meta.label}
                    </span>
                    {isFastest && (
                      <span
                        className="fastest-badge"
                        data-testid="fastest-branch-badge"
                      >
                        <RouteBoltIcon size={11} />
                        Fastest Nearby
                      </span>
                    )}
                  </div>

                  <div className="branch-eta-block">
                    <span
                      className="branch-eta"
                      data-testid="branch-eta"
                    >
                      {matrixLoading && !metrics
                        ? '…'
                        : metrics?.durationText ?? '—'}
                    </span>
                    <span
                      className="branch-distance"
                      data-testid="branch-distance"
                    >
                      {metrics?.distanceText ?? '—'}
                    </span>
                  </div>
                </div>

                <h3 className="branch-name">{branch.name}</h3>
                <p className="branch-address">{branch.address}</p>

                <div className="branch-meta-row">
                  {branch.rating !== null && (
                    <span className="branch-rating">
                      ★ {branch.rating.toFixed(1)}
                      {branch.userRatingCount !== null && (
                        <span className="rating-count">
                          ({branch.userRatingCount.toLocaleString()})
                        </span>
                      )}
                    </span>
                  )}
                  <span className="branch-hours">{branch.todayHours}</span>
                </div>

                <div className="branch-services-row">
                  {branch.services.map((service) => (
                    <span key={service} className="service-pill">
                      {SERVICE_META[service].label}
                    </span>
                  ))}
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};
