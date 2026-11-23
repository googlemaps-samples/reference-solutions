'use client';

import { BRANCH_TYPE_META, SERVICE_META } from '@/lib/classify';
import type {
  Branch,
  BranchType,
  ComputedRoute,
  OriginLocation,
  RouteMatrixMetric,
  ServiceTag,
  TravelMode,
} from '@/types/locator';

interface SidebarProps {
  branches: Branch[];
  totalCount: number;
  selectedType: BranchType | 'all';
  onSelectType: (type: BranchType | 'all') => void;
  selectedServices: ServiceTag[];
  onToggleService: (service: ServiceTag) => void;
  selectedBranchId: string | null;
  fastestBranchId: string | null;
  onSelectBranch: (branchId: string) => void;
  metricsByBranchId: Record<string, RouteMatrixMetric>;
  activeRoute: ComputedRoute | null;
  origin: OriginLocation;
  travelMode: TravelMode;
  isLoadingPlaces: boolean;
  isLoadingMatrix: boolean;
  errorMessage: string | null;
  hasApiKey: boolean;
}

const SERVICE_LIST: ServiceTag[] = ['pickup', 'coffee', 'cash', 'open24'];

export function Sidebar({
  branches,
  totalCount,
  selectedType,
  onSelectType,
  selectedServices,
  onToggleService,
  selectedBranchId,
  fastestBranchId,
  onSelectBranch,
  metricsByBranchId,
  activeRoute,
  origin,
  travelMode,
  isLoadingPlaces,
  isLoadingMatrix,
  errorMessage,
  hasApiKey,
}: SidebarProps) {
  const selectedBranch =
    branches.find((b) => b.id === selectedBranchId) ?? null;

  const travelModeLabel =
    travelMode === 'DRIVE'
      ? 'Driving'
      : travelMode === 'WALK'
        ? 'Walking'
        : 'Transit';

  return (
    <aside className="sidebar-panel" aria-label="Branch locator sidebar">
      <div className="sidebar-filters">
        <div className="filter-header-row">
          <span className="filter-section-title">Branch Format</span>
          <span className="results-count-pill">
            {branches.length} of {totalCount} locations
          </span>
        </div>

        <div className="chip-row">
          <button
            type="button"
            data-testid="filter-type-all"
            className={`filter-chip ${selectedType === 'all' ? 'active' : ''}`}
            onClick={() => onSelectType('all')}
          >
            All Branches
          </button>
          <button
            type="button"
            data-testid="filter-type-flagship"
            className={`filter-chip ${
              selectedType === 'flagship' ? 'active-flagship' : ''
            }`}
            onClick={() => onSelectType('flagship')}
          >
            Flagship Store
          </button>
          <button
            type="button"
            data-testid="filter-type-kiosk"
            className={`filter-chip ${
              selectedType === 'kiosk' ? 'active-kiosk' : ''
            }`}
            onClick={() => onSelectType('kiosk')}
          >
            Express Kiosk
          </button>
          <button
            type="button"
            data-testid="filter-type-atm"
            className={`filter-chip ${
              selectedType === 'atm' ? 'active-atm' : ''
            }`}
            onClick={() => onSelectType('atm')}
          >
            24/7 ATM
          </button>
        </div>

        <div className="filter-header-row">
          <span className="filter-section-title">
            Product &amp; Service Availability
          </span>
        </div>

        <div className="chip-row">
          {SERVICE_LIST.map((service) => {
            const meta = SERVICE_META[service];
            const isActive = selectedServices.includes(service);
            return (
              <button
                key={service}
                type="button"
                data-testid={meta.testId}
                className={`service-chip ${isActive ? 'active' : ''}`}
                onClick={() => onToggleService(service)}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {!hasApiKey && (
        <div className="status-banner info">
          Add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in{' '}
          <code>.env.local</code> to load live NYC places, route matrix ETAs,
          and interactive map clustering.
        </div>
      )}

      {errorMessage && (
        <div className="status-banner error" role="alert">
          {errorMessage}
        </div>
      )}

      {selectedBranch && activeRoute && activeRoute.branchId === selectedBranch.id && (
        <div className="route-summary-banner" data-testid="route-summary-banner">
          <div className="route-banner-top">
            <span className="route-banner-kicker">
              Active {travelModeLabel} Route
            </span>
            <span className="route-banner-metrics">
              {activeRoute.durationText} · {activeRoute.distanceText}
            </span>
          </div>
          <div className="route-banner-dest">{selectedBranch.name}</div>
          <div className="route-banner-sub">From {origin.label}</div>
        </div>
      )}

      <div className="branch-list" data-testid="branch-list">
        {isLoadingPlaces && branches.length === 0 ? (
          <>
            <div className="skeleton-card" />
            <div className="skeleton-card" />
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </>
        ) : branches.length === 0 ? (
          <div className="empty-state">
            {hasApiKey
              ? 'No branches match your active type and service filters. Try clearing one of the filters.'
              : 'Live NYC branches will appear here once NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is configured.'}
          </div>
        ) : (
          branches.map((branch) => {
            const typeMeta = BRANCH_TYPE_META[branch.branchType];
            const metric = metricsByBranchId[branch.id];
            const isSelected = branch.id === selectedBranchId;
            const isFastest = branch.id === fastestBranchId;
            const firstHoursLine = branch.weekdayDescriptions[0];

            return (
              <button
                key={branch.id}
                type="button"
                data-testid="branch-card"
                className={`branch-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectBranch(branch.id)}
              >
                <div className="branch-card-top">
                  <div className="branch-badges">
                    <span
                      className="type-badge"
                      style={{
                        color: typeMeta.color,
                        backgroundColor: typeMeta.bgSoft,
                        borderColor: typeMeta.borderSoft,
                      }}
                    >
                      {typeMeta.label}
                    </span>
                    {isFastest && (
                      <span
                        className="fastest-branch-badge"
                        data-testid="fastest-branch-badge"
                      >
                        Fastest Nearby
                      </span>
                    )}
                  </div>

                  <div className="branch-metrics-col">
                    <div className="branch-eta" data-testid="branch-eta">
                      {metric
                        ? metric.durationText
                        : isLoadingMatrix
                          ? 'Calculating...'
                          : '--'}
                    </div>
                    <div
                      className="branch-distance"
                      data-testid="branch-distance"
                    >
                      {metric ? metric.distanceText : ''}
                    </div>
                  </div>
                </div>

                <h3 className="branch-name">{branch.name}</h3>
                <p className="branch-address">{branch.address}</p>

                <div className="branch-meta-line">
                  {typeof branch.rating === 'number' && (
                    <span className="rating-pill">
                      ★ {branch.rating.toFixed(1)}
                      {typeof branch.userRatingCount === 'number'
                        ? ` (${branch.userRatingCount.toLocaleString()})`
                        : ''}
                    </span>
                  )}
                  {firstHoursLine && (
                    <span className="branch-hours">{firstHoursLine}</span>
                  )}
                </div>

                <div className="branch-service-tags">
                  {branch.services.map((svc) => (
                    <span key={svc} className="service-pill">
                      {SERVICE_META[svc].label}
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
}
