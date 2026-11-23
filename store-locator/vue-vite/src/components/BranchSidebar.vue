<script setup lang="ts">
import type {
  ActiveRouteSummary,
  Branch,
  BranchType,
  OriginLocation,
  ServiceTag,
} from '../types/locator';
import {
  BRANCH_TYPE_LABELS,
  SERVICE_LABELS,
  formatTravelModeLabel,
} from '../utils/branchClassifier';

const props = defineProps<{
  origin: OriginLocation;
  activeTypeFilter: BranchType | 'all';
  activeServices: Set<ServiceTag>;
  typeCounts: Record<BranchType | 'all', number>;
  branches: Branch[];
  selectedBranchId: string | null;
  activeRouteSummary: ActiveRouteSummary | null;
  isSearchingBranches: boolean;
  isCalculatingMatrix: boolean;
}>();

const emit = defineEmits<{
  (e: 'set-type-filter', type: BranchType | 'all'): void;
  (e: 'toggle-service', service: ServiceTag): void;
  (e: 'reset-filters'): void;
  (e: 'select-branch', branchId: string): void;
}>();

const SERVICE_OPTIONS: Array<{ id: ServiceTag; testId: string; label: string }> = [
  { id: 'pickup', testId: 'filter-service-pickup', label: 'Click & Collect' },
  { id: 'coffee', testId: 'filter-service-coffee', label: 'Express Espresso' },
  { id: 'cash', testId: 'filter-service-cash', label: 'Cash Deposit' },
  { id: 'open24', testId: 'filter-service-open24', label: 'Open 24h' },
];
</script>

<template>
  <aside class="branch-sidebar" aria-label="NYC branch directory and filters">
    <div class="sidebar-filters">
      <div class="origin-context-row">
        <span class="origin-dot" aria-hidden="true"></span>
        <span class="origin-context-text">
          From <strong>{{ props.origin.label }}</strong>
        </span>
        <span v-if="props.isCalculatingMatrix" class="matrix-status-pill">
          Updating ETAs…
        </span>
      </div>

      <div class="filter-group">
        <div class="filter-label">Branch Type</div>
        <div class="chip-row">
          <button
            type="button"
            class="filter-chip"
            :class="{ 'is-active': props.activeTypeFilter === 'all' }"
            data-testid="filter-type-all"
            @click="emit('set-type-filter', 'all')"
          >
            All ({{ props.typeCounts.all }})
          </button>
          <button
            type="button"
            class="filter-chip is-flagship"
            :class="{ 'is-active': props.activeTypeFilter === 'flagship' }"
            data-testid="filter-type-flagship"
            @click="emit('set-type-filter', 'flagship')"
          >
            Flagship Store ({{ props.typeCounts.flagship }})
          </button>
          <button
            type="button"
            class="filter-chip is-kiosk"
            :class="{ 'is-active': props.activeTypeFilter === 'kiosk' }"
            data-testid="filter-type-kiosk"
            @click="emit('set-type-filter', 'kiosk')"
          >
            Express Kiosk ({{ props.typeCounts.kiosk }})
          </button>
          <button
            type="button"
            class="filter-chip is-atm"
            :class="{ 'is-active': props.activeTypeFilter === 'atm' }"
            data-testid="filter-type-atm"
            @click="emit('set-type-filter', 'atm')"
          >
            24/7 ATM ({{ props.typeCounts.atm }})
          </button>
        </div>
      </div>

      <div class="filter-group">
        <div class="filter-label">Product &amp; Service Availability</div>
        <div class="chip-row">
          <button
            v-for="svc in SERVICE_OPTIONS"
            :key="svc.id"
            type="button"
            class="service-chip"
            :class="{ 'is-active': props.activeServices.has(svc.id) }"
            :data-testid="svc.testId"
            @click="emit('toggle-service', svc.id)"
          >
            {{ svc.label }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="props.activeRouteSummary"
      class="route-summary-banner"
      data-testid="route-summary-banner"
    >
      <div class="route-summary-top">
        <span class="route-summary-eyebrow">
          Active {{ formatTravelModeLabel(props.activeRouteSummary.travelMode) }} Route
        </span>
        <span v-if="props.activeRouteSummary.isFastest" class="route-summary-fast">
          Fastest Nearby
        </span>
      </div>
      <div class="route-summary-main">
        <strong class="route-summary-name">{{ props.activeRouteSummary.branchName }}</strong>
        <div class="route-summary-metrics">
          <span>{{ props.activeRouteSummary.etaText }}</span>
          <span aria-hidden="true">•</span>
          <span>{{ props.activeRouteSummary.distanceText }}</span>
        </div>
      </div>
    </div>

    <div class="branch-list-header">
      <span>{{ props.branches.length }} matching NYC locations</span>
      <button
        v-if="props.activeTypeFilter !== 'all' || props.activeServices.size > 0"
        type="button"
        class="reset-filters-link"
        @click="emit('reset-filters')"
      >
        Reset filters
      </button>
    </div>

    <div class="branch-list" data-testid="branch-list">
      <div v-if="props.isSearchingBranches" class="sidebar-empty-state">
        Discovering live NYC stores, kiosks &amp; ATMs via Places API (New)…
      </div>

      <div v-else-if="props.branches.length === 0" class="sidebar-empty-state">
        <p>No branches match the selected filters.</p>
        <button type="button" class="reset-btn" @click="emit('reset-filters')">
          Show all branches
        </button>
      </div>

      <button
        v-for="branch in props.branches"
        :key="branch.id"
        type="button"
        class="branch-card"
        :class="{ 'is-selected': branch.id === props.selectedBranchId }"
        data-testid="branch-card"
        @click="emit('select-branch', branch.id)"
      >
        <div class="branch-card__top">
          <div class="branch-card__badges">
            <span class="type-badge" :class="`is-${branch.branchType}`">
              {{ BRANCH_TYPE_LABELS[branch.branchType] }}
            </span>
            <span
              v-if="branch.isFastest"
              class="fastest-branch-badge"
              data-testid="fastest-branch-badge"
            >
              Fastest Nearby
            </span>
          </div>

          <div class="branch-card__metrics">
            <span class="branch-eta" data-testid="branch-eta">
              {{ branch.etaText ?? '—' }}
            </span>
            <span class="branch-distance" data-testid="branch-distance">
              {{ branch.distanceText ?? '—' }}
            </span>
          </div>
        </div>

        <h3 class="branch-card__title">{{ branch.name }}</h3>
        <p class="branch-card__address">{{ branch.address }}</p>

        <div class="branch-card__meta">
          <span v-if="branch.rating !== null" class="branch-rating">
            ★ {{ branch.rating.toFixed(1) }}
            <template v-if="branch.userRatingCount !== null">
              ({{ branch.userRatingCount.toLocaleString() }})
            </template>
          </span>
          <span v-if="branch.todayHours" class="branch-hours">
            {{ branch.todayHours }}
          </span>
        </div>

        <div class="branch-card__services">
          <span
            v-for="svc in branch.services"
            :key="svc"
            class="service-tag"
          >
            {{ SERVICE_LABELS[svc] }}
          </span>
        </div>
      </button>
    </div>
  </aside>
</template>
