<script setup lang="ts">
import { CATEGORY_META, DISCOVERY_CATEGORIES } from '../constants/london';
import { getTodayHoursLabel } from '../services/googleMaps';
import type {
  CommunitySpot,
  DiscoveredPlace,
  PlaceCategory,
} from '../types/neighborhood';

const props = defineProps<{
  places: DiscoveredPlace[];
  selectedCategory: PlaceCategory;
  selectedPlaceId: string | null;
  compareIds: string[];
  activeAreaLabel: string;
  isLoading: boolean;
  errorMessage: string | null;
  communitySpots: CommunitySpot[];
}>();

const emit = defineEmits<{
  (e: 'change-category', category: PlaceCategory): void;
  (e: 'select-place', place: DiscoveredPlace): void;
  (e: 'toggle-compare', place: DiscoveredPlace): void;
  (e: 'open-pin-spot'): void;
  (e: 'focus-community-spot', spot: CommunitySpot): void;
  (e: 'remove-community-spot', spotId: string): void;
}>();

function isCompared(placeId: string): boolean {
  return props.compareIds.includes(placeId);
}

function getCategoryStyle(category: DiscoveredPlace['category']) {
  return CATEGORY_META[category];
}
</script>

<template>
  <aside class="sidebar" aria-label="Neighborhood Directory">
    <div class="sidebar-top">
      <div class="status-row">
        <div>
          <span class="area-kicker">5 km discovery radius</span>
          <h2 class="area-title">{{ activeAreaLabel }}</h2>
        </div>
        <button
          id="pin-community-spot-button"
          data-testid="pin-community-spot-button"
          type="button"
          class="pin-btn"
          @click="emit('open-pin-spot')"
        >
          + Pin Spot
        </button>
      </div>

      <div class="filter-chips" role="tablist" aria-label="Filter by place category">
        <button
          id="category-filter-all"
          data-testid="category-filter-all"
          type="button"
          class="filter-chip"
          :class="{ active: selectedCategory === 'all' }"
          @click="emit('change-category', 'all')"
        >
          All
        </button>
        <button
          v-for="cat in DISCOVERY_CATEGORIES"
          :id="`category-filter-${cat}`"
          :key="cat"
          :data-testid="`category-filter-${cat}`"
          type="button"
          class="filter-chip"
          :class="{ active: selectedCategory === cat }"
          @click="emit('change-category', cat)"
        >
          <span
            class="cat-dot"
            :style="{ backgroundColor: CATEGORY_META[cat].background }"
            aria-hidden="true"
          ></span>
          {{ CATEGORY_META[cat].pluralLabel }}
        </button>
      </div>

      <div class="count-bar">
        <span v-if="isLoading" class="loading-pill">Loading live Places...</span>
        <span v-else class="count-text">
          Showing <strong>{{ places.length }}</strong> live places
        </span>
      </div>

      <div v-if="errorMessage" class="error-banner" role="alert">
        {{ errorMessage }}
      </div>
    </div>

    <div id="places-results-list" data-testid="places-results-list" class="results-list">
      <div v-if="!isLoading && places.length === 0 && !errorMessage" class="empty-state">
        No matching places found within 5km. Try switching categories or searching another London neighborhood.
      </div>

      <article
        v-for="place in places"
        :key="place.id"
        class="place-card"
        :class="{ selected: place.id === selectedPlaceId }"
      >
        <div class="card-header">
          <span
            class="category-badge"
            :style="{
              backgroundColor: `${getCategoryStyle(place.category).background}18`,
              color: getCategoryStyle(place.category).background,
            }"
          >
            {{ place.primaryTypeDisplayName || getCategoryStyle(place.category).label }}
          </span>
          <span v-if="place.priceLevel" class="price-badge">
            {{ place.priceLevel }}
          </span>
        </div>

        <h3 class="place-name" @click="emit('select-place', place)">
          {{ place.displayName }}
        </h3>

        <div class="rating-row">
          <template v-if="place.rating !== null">
            <span class="star">★</span>
            <span class="rating-val">{{ place.rating.toFixed(1) }}</span>
            <span class="review-count">
              ({{ (place.userRatingCount ?? 0).toLocaleString() }} reviews)
            </span>
          </template>
          <span v-else class="review-count">No rating yet</span>
        </div>

        <p class="place-address">{{ place.formattedAddress }}</p>
        <p class="place-hours">{{ getTodayHoursLabel(place.weekdayDescriptions) }}</p>

        <div class="card-actions">
          <button
            type="button"
            class="action-btn action-inspect"
            @click="emit('select-place', place)"
          >
            Inspect Details
          </button>
          <button
            type="button"
            class="action-btn action-compare"
            :class="{ active: isCompared(place.id) }"
            :disabled="!isCompared(place.id) && compareIds.length >= 3"
            @click="emit('toggle-compare', place)"
          >
            {{ isCompared(place.id) ? 'Comparing ✓' : '+ Compare' }}
          </button>
        </div>
      </article>

      <section v-if="communitySpots.length > 0" class="community-section">
        <h3 class="community-heading">
          Community Spots ({{ communitySpots.length }})
        </h3>
        <div
          v-for="spot in communitySpots"
          :key="spot.id"
          class="community-card"
        >
          <div class="community-card-top">
            <span class="community-badge">★ {{ CATEGORY_META[spot.category].label }}</span>
            <button
              type="button"
              class="remove-spot-btn"
              aria-label="Remove community spot"
              @click="emit('remove-community-spot', spot.id)"
            >
              Remove
            </button>
          </div>
          <button
            type="button"
            class="community-name-btn"
            @click="emit('focus-community-spot', spot)"
          >
            {{ spot.name }}
          </button>
          <p class="community-note">{{ spot.note }}</p>
          <p class="community-coords">
            {{ spot.formattedAddress }} ({{ spot.lat.toFixed(4) }}, {{ spot.lng.toFixed(4) }})
          </p>
        </div>
      </section>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 400px;
  min-width: 340px;
  max-width: 420px;
  height: calc(100vh - 64px);
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 20;
}

.sidebar-top {
  padding: 14px 16px 10px;
  border-bottom: 1px solid #f1f5f9;
  background: #ffffff;
}

.status-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.area-kicker {
  display: block;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #0f766e;
}

.area-title {
  margin: 2px 0 0;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.pin-btn {
  height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid #7c3aed;
  background: #f5f3ff;
  color: #6d28d9;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.pin-btn:hover {
  background: #ede9fe;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.filter-chip {
  height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #334155;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.filter-chip.active {
  background: #0f172a;
  border-color: #0f172a;
  color: #ffffff;
}

.cat-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.count-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #475569;
}

.loading-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 600;
}

.error-banner {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  font-size: 12px;
  line-height: 1.4;
}

.results-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #f8fafc;
}

.empty-state {
  padding: 24px 16px;
  text-align: center;
  color: #64748b;
  font-size: 13px;
  background: #ffffff;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
}

.place-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.place-card:hover {
  border-color: #94a3b8;
}

.place-card.selected {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.14);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.category-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
}

.price-badge {
  font-size: 12px;
  font-weight: 700;
  color: #0f766e;
}

.place-name {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  cursor: pointer;
}

.place-name:hover {
  color: #1d4ed8;
}

.rating-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  margin-bottom: 6px;
}

.star {
  color: #f59e0b;
}

.rating-val {
  font-weight: 700;
  color: #0f172a;
}

.review-count {
  color: #64748b;
}

.place-address {
  margin: 0 0 4px;
  font-size: 12px;
  color: #475569;
  line-height: 1.35;
}

.place-hours {
  margin: 0 0 10px;
  font-size: 12px;
  color: #0f766e;
  font-weight: 500;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  height: 32px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #0f172a;
}

.action-inspect {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}

.action-inspect:hover {
  background: #dbeafe;
}

.action-compare.active {
  background: #0f766e;
  border-color: #0f766e;
  color: #ffffff;
}

.action-compare:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.community-section {
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.community-heading {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #5b21b6;
}

.community-card {
  background: #faf5ff;
  border: 1px solid #ddd6fe;
  border-radius: 10px;
  padding: 10px;
}

.community-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.community-badge {
  font-size: 11px;
  font-weight: 700;
  color: #6d28d9;
}

.remove-spot-btn {
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 11px;
  cursor: pointer;
}

.community-name-btn {
  border: none;
  background: transparent;
  padding: 0;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  cursor: pointer;
  text-align: left;
}

.community-note {
  margin: 4px 0;
  font-size: 12px;
  color: #334155;
}

.community-coords {
  margin: 0;
  font-size: 11px;
  color: #64748b;
}

@media (max-width: 900px) {
  .sidebar {
    width: 100%;
    max-width: 100%;
    height: 360px;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }
}
</style>
