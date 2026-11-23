<script setup lang="ts">
import type { ClinicVenueData, MapViewMode } from '../types/storefront';

defineProps<{
  venue: ClinicVenueData | null;
  showCoverage: boolean;
  viewMode: MapViewMode;
}>();

const emit = defineEmits<{
  (e: 'toggle-coverage'): void;
  (e: 'toggle-street-view'): void;
  (e: 'set-view-mode', mode: MapViewMode): void;
}>();
</script>

<template>
  <header class="clinic-header" data-testid="clinic-header">
    <div class="clinic-brand">
      <div class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M7 4c-2.2 0-4 1.9-4 4.4 0 2.1.9 3.7 1.4 5.7.5 1.8.8 5.9 2.3 5.9 1.2 0 1.6-2.5 2.3-4.2.5-1.2 1.2-1.8 3-1.8s2.5.6 3 1.8c.7 1.7 1.1 4.2 2.3 4.2 1.5 0 1.8-4.1 2.3-5.9.5-2 1.4-3.6 1.4-5.7C21 5.9 19.2 4 17 4c-1.7 0-2.9.8-5 .8S8.7 4 7 4Z" />
        </svg>
      </div>
      <div class="brand-copy">
        <div class="brand-title-row">
          <h1 class="brand-title">
            {{ venue?.displayName ?? '450 Sutter Dental Studio' }}
          </h1>
          <span
            v-if="venue"
            class="status-pill"
            :class="{
              'status-open': venue.openStatus.isOpen === true,
              'status-closed': venue.openStatus.isOpen === false,
            }"
          >
            <span class="status-dot" />
            {{ venue.openStatus.label }}
          </span>
        </div>
        <p class="brand-subtitle">
          <span>{{ venue?.formattedAddress ?? '450 Sutter St, San Francisco, CA 94108' }}</span>
          <template v-if="venue?.nationalPhoneNumber">
            <span class="sep" aria-hidden="true">·</span>
            <a :href="`tel:${venue.nationalPhoneNumber}`" class="header-phone">
              {{ venue.nationalPhoneNumber }}
            </a>
          </template>
        </p>
      </div>
    </div>

    <div class="header-actions">
      <button
        type="button"
        class="action-pill"
        :class="{ active: showCoverage }"
        data-testid="coverage-overlay-toggle"
        :aria-pressed="showCoverage"
        @click="emit('toggle-coverage')"
      >
        <span class="coverage-swatch" />
        <span>3.5 km Home Visit Zone</span>
      </button>

      <div class="view-switcher" role="group" aria-label="Map and Street View mode">
        <button
          type="button"
          class="switch-btn"
          :class="{ active: viewMode === 'map' }"
          @click="emit('set-view-mode', 'map')"
        >
          Map
        </button>
        <button
          type="button"
          class="switch-btn"
          :class="{ active: viewMode === 'split' || viewMode === 'streetview' }"
          data-testid="street-view-toggle"
          :aria-pressed="viewMode !== 'map'"
          @click="emit('toggle-street-view')"
        >
          Street View
        </button>
        <button
          v-if="viewMode !== 'map'"
          type="button"
          class="switch-btn"
          :class="{ active: viewMode === 'streetview' }"
          @click="emit('set-view-mode', viewMode === 'streetview' ? 'split' : 'streetview')"
        >
          {{ viewMode === 'streetview' ? 'Split' : 'Expand' }}
        </button>
      </div>
    </div>
  </header>
</template>
