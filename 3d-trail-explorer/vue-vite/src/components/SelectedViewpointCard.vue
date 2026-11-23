<script setup lang="ts">
import type { SelectedPlaceDetails } from '../types/explorer';

defineProps<{
  place: SelectedPlaceDetails | null;
  loading: boolean;
  error: string | null;
  fallbackTitle: string;
  fallbackSubtitle: string;
}>();
</script>

<template>
  <section class="panel-card" data-testid="selected-viewpoint-card" aria-label="Active Viewpoint Details">
    <div class="card-top">
      <span class="eyebrow">{{ place?.sourceLabel ?? 'Live Places & Elevation' }}</span>
      <span v-if="loading" class="status-pill loading">Fetching…</span>
      <span v-else-if="place?.elevationMeters !== null && place?.elevationMeters !== undefined" class="status-pill elev">
        {{ Math.round(place.elevationMeters) }} m ({{ Math.round(place.elevationFeet ?? 0) }} ft)
      </span>
    </div>

    <template v-if="place">
      <h3 class="place-title">{{ place.displayName }}</h3>
      <p class="place-address">{{ place.formattedAddress }}</p>

      <div class="meta-row">
        <span v-if="place.rating !== null" class="rating-chip">
          ★ {{ place.rating.toFixed(1) }}
          <span v-if="place.userRatingCount !== null" class="rating-count">
            ({{ place.userRatingCount.toLocaleString() }})
          </span>
        </span>
        <span class="coords-chip">
          {{ place.lat.toFixed(4) }}, {{ place.lng.toFixed(4) }}
        </span>
        <a
          v-if="place.googleMapsURI"
          class="maps-link"
          :href="place.googleMapsURI"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in Google Maps ↗
        </a>
      </div>
    </template>

    <template v-else>
      <h3 class="place-title">{{ fallbackTitle }}</h3>
      <p class="place-address">{{ fallbackSubtitle }}</p>
      <p v-if="error" class="error-note">{{ error }}</p>
    </template>
  </section>
</template>

<style scoped>
.panel-card {
  background: rgba(15, 23, 42, 0.86);
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 14px;
  padding: 12px 14px;
  backdrop-filter: blur(16px);
  box-shadow: 0 12px 28px rgba(2, 6, 23, 0.45);
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #38bdf8;
}

.status-pill {
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  font-variant-numeric: tabular-nums;
}

.status-pill.elev {
  background: rgba(56, 189, 248, 0.16);
  border: 1px solid rgba(56, 189, 248, 0.4);
  color: #bae6fd;
}

.status-pill.loading {
  background: rgba(148, 163, 184, 0.16);
  color: #cbd5e1;
}

.place-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1.25;
}

.place-address {
  margin: 4px 0 8px;
  font-size: 11.5px;
  color: #94a3b8;
  line-height: 1.35;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.rating-chip,
.coords-chip {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 7px;
  border-radius: 6px;
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.18);
  color: #fde68a;
}

.rating-count {
  color: #94a3b8;
  font-weight: 500;
}

.coords-chip {
  color: #cbd5e1;
  font-variant-numeric: tabular-nums;
}

.maps-link {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  color: #7dd3fc;
  text-decoration: none;
}

.maps-link:hover {
  text-decoration: underline;
}

.error-note {
  margin: 4px 0 0;
  font-size: 11px;
  color: #fca5a5;
}
</style>
