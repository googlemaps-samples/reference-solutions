<script setup lang="ts">
import { ref } from 'vue';
import type { DayId, DiscoveredPlace, DiscoveryCategory } from '../types/itinerary';

defineProps<{
  activeCategory: DiscoveryCategory;
  places: DiscoveredPlace[];
  loading: boolean;
  errorMessage: string | null;
  selectedPlaceId: string | null;
  day1PlaceIds: Set<string>;
  day2PlaceIds: Set<string>;
}>();

const emit = defineEmits<{
  (e: 'change-category', category: DiscoveryCategory): void;
  (e: 'add-to-day', place: DiscoveredPlace, day: DayId): void;
  (e: 'inspect-street-view', place: DiscoveredPlace): void;
}>();

const expandedHours = ref<Record<string, boolean>>({});

const categories: { id: DiscoveryCategory; label: string }[] = [
  { id: 'attractions', label: 'Attractions' },
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'hotels', label: 'Hotels' },
];

function toggleHours(placeId: string) {
  expandedHours.value[placeId] = !expandedHours.value[placeId];
}

function getTodayHoursSummary(descriptions: string[]): string | null {
  if (!descriptions || descriptions.length === 0) return null;
  // JavaScript getDay(): 0=Sun..6=Sat; Places weekdayDescriptions usually Mon..Sun (0=Mon..6=Sun)
  const jsDay = new Date().getDay();
  const googleIdx = jsDay === 0 ? 6 : jsDay - 1;
  return descriptions[googleIdx] ?? descriptions[0];
}
</script>

<template>
  <section class="discovery-section">
    <div class="discovery-header">
      <h2 class="section-title">Discover Places</h2>
      <div class="category-tabs" data-testid="discovery-category-tabs" role="tablist" aria-label="Place categories">
        <button
          v-for="cat in categories"
          :key="cat.id"
          type="button"
          role="tab"
          :aria-selected="activeCategory === cat.id"
          class="category-tab"
          :class="{ active: activeCategory === cat.id }"
          @click="emit('change-category', cat.id)"
        >
          {{ cat.label }}
        </button>
      </div>
    </div>

    <div v-if="errorMessage" class="discovery-error" role="alert">
      {{ errorMessage }}
    </div>

    <div v-else-if="loading" class="discovery-loading">
      Loading live Places API (New) results...
    </div>

    <div v-else class="discovery-list" data-testid="discovery-results-list">
      <div v-if="places.length === 0" class="discovery-empty">
        No places found for this category. Try another category or search destination.
      </div>

      <article
        v-for="place in places"
        :key="place.id"
        class="place-card"
        :class="{ selected: selectedPlaceId === place.id }"
      >
        <div class="place-card-top">
          <div class="place-thumb-wrap">
            <img
              v-if="place.photoUrl"
              :src="place.photoUrl"
              :alt="place.displayName"
              class="place-thumb"
              loading="lazy"
            />
            <div v-else class="place-thumb-placeholder" aria-hidden="true">
              {{ place.displayName.slice(0, 1) }}
            </div>
          </div>

          <div class="place-info">
            <div class="place-title-row">
              <h3 class="place-name">{{ place.displayName }}</h3>
              <span v-if="place.rating !== null" class="place-rating">
                &#9733; {{ place.rating.toFixed(1) }}
                <span v-if="place.userRatingCount" class="rating-count">
                  ({{ place.userRatingCount.toLocaleString() }})
                </span>
              </span>
            </div>

            <div class="place-type" v-if="place.primaryTypeDisplayName">
              {{ place.primaryTypeDisplayName }}
            </div>

            <div class="place-address" v-if="place.formattedAddress">
              {{ place.formattedAddress }}
            </div>
          </div>
        </div>

        <div v-if="place.weekdayDescriptions.length > 0" class="hours-box">
          <button type="button" class="hours-toggle" @click="toggleHours(place.id)">
            <span>{{ getTodayHoursSummary(place.weekdayDescriptions) }}</span>
            <span class="hours-chevron">{{ expandedHours[place.id] ? 'Hide hours' : 'All hours' }}</span>
          </button>
          <ul v-if="expandedHours[place.id]" class="hours-list">
            <li v-for="line in place.weekdayDescriptions" :key="line">{{ line }}</li>
          </ul>
        </div>

        <div class="place-actions">
          <button
            type="button"
            class="action-btn day1"
            :disabled="day1PlaceIds.has(place.id)"
            @click="emit('add-to-day', place, 1)"
          >
            {{ day1PlaceIds.has(place.id) ? 'In Day 1' : '+ Day 1' }}
          </button>
          <button
            type="button"
            class="action-btn day2"
            :disabled="day2PlaceIds.has(place.id)"
            @click="emit('add-to-day', place, 2)"
          >
            {{ day2PlaceIds.has(place.id) ? 'In Day 2' : '+ Day 2' }}
          </button>
          <button
            type="button"
            class="action-btn streetview"
            @click="emit('inspect-street-view', place)"
          >
            Street View
          </button>
        </div>

        <div v-if="place.photoAttributions.length > 0 || place.googleMapsURI" class="place-attribution">
          <span v-if="place.photoAttributions.length > 0">
            Photo: {{ place.photoAttributions[0] }}
          </span>
          <a
            v-if="place.googleMapsURI"
            :href="place.googleMapsURI"
            target="_blank"
            rel="noopener noreferrer"
            class="maps-link"
          >
            View on Google Maps
          </a>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.discovery-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px 20px;
  flex: 1;
}

.discovery-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
}

.category-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.category-tab {
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #334155;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.category-tab.active {
  background: #0f172a;
  border-color: #0f172a;
  color: #ffffff;
}

.discovery-loading,
.discovery-empty,
.discovery-error {
  padding: 16px;
  border-radius: 10px;
  font-size: 0.82rem;
  text-align: center;
}

.discovery-loading {
  background: #f8fafc;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.discovery-empty {
  background: #f8fafc;
  color: #64748b;
  border: 1px dashed #cbd5e1;
}

.discovery-error {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.discovery-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.place-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.place-card.selected {
  border-color: #0f766e;
  box-shadow: 0 2px 10px rgba(15, 118, 110, 0.12);
}

.place-card-top {
  display: flex;
  gap: 10px;
}

.place-thumb-wrap {
  width: 78px;
  height: 78px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: #e2e8f0;
}

.place-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.place-thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  font-weight: 700;
  color: #475569;
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
}

.place-info {
  flex: 1;
  min-width: 0;
}

.place-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
}

.place-name {
  margin: 0;
  font-size: 0.86rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.25;
}

.place-rating {
  font-size: 0.74rem;
  font-weight: 700;
  color: #b45309;
  white-space: nowrap;
}

.rating-count {
  font-weight: 400;
  color: #64748b;
}

.place-type {
  font-size: 0.73rem;
  font-weight: 600;
  color: #0f766e;
  margin-top: 2px;
}

.place-address {
  font-size: 0.73rem;
  color: #64748b;
  margin-top: 2px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hours-box {
  background: #f8fafc;
  border-radius: 8px;
  padding: 5px 8px;
  border: 1px solid #e2e8f0;
}

.hours-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: transparent;
  border: 0;
  padding: 0;
  font-size: 0.72rem;
  color: #334155;
  text-align: left;
  cursor: pointer;
}

.hours-chevron {
  font-weight: 600;
  color: #0f766e;
  flex-shrink: 0;
}

.hours-list {
  margin: 6px 0 0;
  padding-left: 14px;
  font-size: 0.7rem;
  color: #475569;
  line-height: 1.4;
}

.place-actions {
  display: grid;
  grid-template-columns: 1fr 1fr 1.1fr;
  gap: 6px;
}

.action-btn {
  padding: 6px 8px;
  border-radius: 7px;
  font-size: 0.74rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
}

.action-btn.day1 {
  background: #f0fdfa;
  color: #0f766e;
  border-color: #99f6e4;
}

.action-btn.day1:hover:not(:disabled) {
  background: #0f766e;
  color: #ffffff;
}

.action-btn.day2 {
  background: #fffbeb;
  color: #b45309;
  border-color: #fde68a;
}

.action-btn.day2:hover:not(:disabled) {
  background: #d97706;
  color: #ffffff;
}

.action-btn.streetview {
  background: #f1f5f9;
  color: #1e293b;
  border-color: #cbd5e1;
}

.action-btn.streetview:hover {
  background: #0f172a;
  color: #ffffff;
}

.action-btn:disabled {
  opacity: 0.55;
  cursor: default;
}

.place-attribution {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.68rem;
  color: #64748b;
}

.maps-link {
  color: #0f766e;
  text-decoration: none;
  font-weight: 600;
  margin-left: auto;
}

.maps-link:hover {
  text-decoration: underline;
}
</style>
