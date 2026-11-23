<script setup lang="ts">
import { ref, watch } from 'vue';
import { CATEGORY_META, DISCOVERY_CATEGORIES } from '../constants/london';
import type {
  CommunitySpot,
  DiscoveredPlace,
  DiscoveryCategory,
  ReverseGeocodeResult,
} from '../types/neighborhood';

const props = defineProps<{
  selectedPlace: DiscoveredPlace | null;
  detailsLoading: boolean;
  isCompared: boolean;
  compareDisabled: boolean;
  reverseGeocodeResult: ReverseGeocodeResult | null;
  reverseGeocodeLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'close-place'): void;
  (e: 'close-reverse-geocode'): void;
  (e: 'toggle-compare', place: DiscoveredPlace): void;
  (e: 'save-community-spot', spot: Omit<CommunitySpot, 'id' | 'createdAt'>): void;
}>();

const spotName = ref('');
const spotCategory = ref<DiscoveryCategory>('cafe');
const spotNote = ref('');

watch(
  () => props.reverseGeocodeResult,
  (next) => {
    if (next) {
      spotName.value = '';
      spotNote.value = '';
    }
  }
);

function handleSaveSpot() {
  if (!props.reverseGeocodeResult) return;
  const trimmedName = spotName.value.trim();
  if (!trimmedName) return;

  emit('save-community-spot', {
    name: trimmedName,
    category: spotCategory.value,
    note: spotNote.value.trim() || 'Community-recommended neighborhood spot',
    lat: props.reverseGeocodeResult.lat,
    lng: props.reverseGeocodeResult.lng,
    formattedAddress: props.reverseGeocodeResult.formattedAddress,
    placeId: props.reverseGeocodeResult.placeId,
  });
  spotName.value = '';
  spotNote.value = '';
}
</script>

<template>
  <section
    v-if="selectedPlace"
    id="place-details-drawer"
    data-testid="place-details-drawer"
    class="drawer"
    aria-label="Place details"
  >
    <div class="drawer-header">
      <div class="drawer-title-wrap">
        <span
          class="drawer-badge"
          :style="{
            backgroundColor: `${CATEGORY_META[selectedPlace.category].background}18`,
            color: CATEGORY_META[selectedPlace.category].background,
          }"
        >
          {{
            selectedPlace.primaryTypeDisplayName ||
            CATEGORY_META[selectedPlace.category].label
          }}
        </span>
        <h2 class="drawer-title">{{ selectedPlace.displayName }}</h2>
      </div>
      <button
        type="button"
        class="close-btn"
        aria-label="Close place details"
        @click="emit('close-place')"
      >
        ✕
      </button>
    </div>

    <div class="drawer-body">
      <img
        v-if="selectedPlace.photoUrl"
        :src="selectedPlace.photoUrl"
        :alt="selectedPlace.displayName"
        class="place-photo"
      />

      <div class="metrics-strip">
        <div class="metric-item">
          <span class="metric-label">Rating</span>
          <span class="metric-value">
            {{
              selectedPlace.rating !== null
                ? `★ ${selectedPlace.rating.toFixed(1)} (${(selectedPlace.userRatingCount ?? 0).toLocaleString()})`
                : 'N/A'
            }}
          </span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Price Level</span>
          <span class="metric-value">{{ selectedPlace.priceLevel ?? 'N/A' }}</span>
        </div>
      </div>

      <button
        id="drawer-compare-button"
        data-testid="drawer-compare-button"
        type="button"
        class="drawer-compare-btn"
        :class="{ active: isCompared }"
        :disabled="!isCompared && compareDisabled"
        @click="emit('toggle-compare', selectedPlace)"
      >
        {{ isCompared ? 'Remove from Comparison' : '+ Add to Side-by-Side Comparison' }}
      </button>

      <div class="info-block">
        <h3>Address &amp; Contact</h3>
        <p>{{ selectedPlace.formattedAddress }}</p>
        <p v-if="selectedPlace.internationalPhoneNumber">
          Tel: {{ selectedPlace.internationalPhoneNumber }}
        </p>
        <div class="link-row">
          <a
            v-if="selectedPlace.websiteURI"
            :href="selectedPlace.websiteURI"
            target="_blank"
            rel="noopener noreferrer"
          >
            Official Website
          </a>
          <a
            v-if="selectedPlace.googleMapsURI"
            :href="selectedPlace.googleMapsURI"
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Google Maps
          </a>
        </div>
      </div>

      <div class="info-block">
        <h3>Opening Hours</h3>
        <p v-if="detailsLoading && selectedPlace.weekdayDescriptions.length === 0" class="muted">
          Fetching live hours...
        </p>
        <ul
          v-else-if="selectedPlace.weekdayDescriptions.length > 0"
          class="hours-list"
        >
          <li
            v-for="line in selectedPlace.weekdayDescriptions"
            :key="line"
          >
            {{ line }}
          </li>
        </ul>
        <p v-else class="muted">Opening hours not listed for this place.</p>
      </div>

      <div class="info-block">
        <h3>Customer Reviews</h3>
        <p v-if="detailsLoading" class="muted">Loading live customer reviews...</p>
        <div v-else-if="selectedPlace.reviews.length > 0" class="reviews-list">
          <article
            v-for="(review, idx) in selectedPlace.reviews"
            :key="idx"
            class="review-card"
          >
            <div class="review-top">
              <strong>{{ review.authorName }}</strong>
              <span v-if="review.rating !== null" class="review-stars">
                ★ {{ review.rating }}
              </span>
            </div>
            <span v-if="review.relativePublishTime" class="review-time">
              {{ review.relativePublishTime }}
            </span>
            <p class="review-text">{{ review.text || 'Rated without written comment.' }}</p>
          </article>
        </div>
        <p v-else class="muted">No customer reviews returned for this place.</p>
      </div>
    </div>
  </section>

  <section
    v-else-if="reverseGeocodeResult || reverseGeocodeLoading"
    id="reverse-geocode-inspector"
    data-testid="reverse-geocode-inspector"
    class="drawer"
    aria-label="Reverse geocode inspector and community spot pin"
  >
    <div class="drawer-header">
      <div class="drawer-title-wrap">
        <span class="drawer-badge reverse-badge">Map Click · Reverse Geocode</span>
        <h2 class="drawer-title">
          {{
            reverseGeocodeLoading
              ? 'Resolving address...'
              : reverseGeocodeResult?.neighborhoodName || 'Pinned Location'
          }}
        </h2>
      </div>
      <button
        type="button"
        class="close-btn"
        aria-label="Close reverse geocode inspector"
        @click="emit('close-reverse-geocode')"
      >
        ✕
      </button>
    </div>

    <div v-if="reverseGeocodeResult" class="drawer-body">
      <div class="info-block">
        <h3>Human-Readable Address</h3>
        <p class="address-highlight">{{ reverseGeocodeResult.formattedAddress }}</p>
        <p class="coords-mono">
          Coordinates: {{ reverseGeocodeResult.lat.toFixed(6) }},
          {{ reverseGeocodeResult.lng.toFixed(6) }}
        </p>
        <p v-if="reverseGeocodeResult.placeId" class="meta-line">
          Place ID: <code>{{ reverseGeocodeResult.placeId }}</code>
        </p>
        <p v-if="reverseGeocodeResult.plusCode" class="meta-line">
          Plus Code: {{ reverseGeocodeResult.plusCode }}
        </p>
      </div>

      <form class="spot-form" @submit.prevent="handleSaveSpot">
        <h3>Pin New Community Spot</h3>
        <label class="form-label" for="community-spot-name-input">
          Spot Name
          <input
            id="community-spot-name-input"
            v-model="spotName"
            data-testid="community-spot-name-input"
            type="text"
            required
            placeholder="e.g., Hidden Courtyard Espresso"
            class="form-input"
          />
        </label>

        <label class="form-label" for="community-spot-category-select">
          Category
          <select
            id="community-spot-category-select"
            v-model="spotCategory"
            class="form-input"
          >
            <option
              v-for="cat in DISCOVERY_CATEGORIES"
              :key="cat"
              :value="cat"
            >
              {{ CATEGORY_META[cat].label }}
            </option>
          </select>
        </label>

        <label class="form-label" for="community-spot-note-input">
          Community Note
          <textarea
            id="community-spot-note-input"
            v-model="spotNote"
            data-testid="community-spot-note-input"
            rows="3"
            placeholder="Share a quick tip about seating, quiet corners, or local favorites..."
            class="form-textarea"
          ></textarea>
        </label>

        <button
          id="save-community-spot-button"
          data-testid="save-community-spot-button"
          type="submit"
          class="save-spot-btn"
          :disabled="!spotName.trim()"
        >
          Pin Community Spot on Map
        </button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.drawer {
  position: fixed;
  top: 76px;
  right: 14px;
  width: 370px;
  max-width: calc(100vw - 28px);
  max-height: calc(100vh - 96px);
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 35;
}

.drawer-header {
  padding: 14px 16px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  background: #f8fafc;
}

.drawer-title-wrap {
  min-width: 0;
}

.drawer-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  margin-bottom: 4px;
}

.reverse-badge {
  background: #f5f3ff;
  color: #6d28d9;
}

.drawer-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.25;
}

.close-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #475569;
  cursor: pointer;
  flex-shrink: 0;
}

.drawer-body {
  padding: 14px 16px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.place-photo {
  width: 100%;
  height: 165px;
  object-fit: cover;
  border-radius: 10px;
}

.metrics-strip {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.metric-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 8px 10px;
}

.metric-label {
  display: block;
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
}

.metric-value {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.drawer-compare-btn {
  width: 100%;
  height: 38px;
  border-radius: 10px;
  border: 1px solid #0f766e;
  background: #f0fdfa;
  color: #0f766e;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.drawer-compare-btn.active {
  background: #0f766e;
  color: #ffffff;
}

.drawer-compare-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.info-block h3,
.spot-form h3 {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.info-block p {
  margin: 0 0 4px;
  font-size: 13px;
  color: #334155;
  line-height: 1.45;
}

.link-row {
  display: flex;
  gap: 12px;
  margin-top: 6px;
}

.link-row a {
  font-size: 12px;
  font-weight: 600;
  color: #1d4ed8;
  text-decoration: none;
}

.link-row a:hover {
  text-decoration: underline;
}

.hours-list {
  margin: 0;
  padding-left: 16px;
  font-size: 12px;
  color: #334155;
  line-height: 1.55;
}

.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.review-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px;
}

.review-top {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #0f172a;
}

.review-stars {
  color: #d97706;
  font-weight: 700;
}

.review-time {
  display: block;
  font-size: 11px;
  color: #64748b;
  margin: 2px 0 4px;
}

.review-text {
  margin: 0;
  font-size: 12px;
  color: #334155;
  line-height: 1.45;
}

.muted {
  color: #64748b !important;
  font-size: 12px !important;
}

.address-highlight {
  font-weight: 600;
  color: #0f172a !important;
}

.coords-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px !important;
  color: #0f766e !important;
}

.meta-line {
  font-size: 11px !important;
  color: #64748b !important;
  word-break: break-all;
}

.spot-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px solid #e2e8f0;
}

.form-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
}

.form-input,
.form-textarea {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  font-size: 13px;
  font-family: inherit;
  color: #0f172a;
  background: #ffffff;
}

.save-spot-btn {
  height: 38px;
  border-radius: 8px;
  border: none;
  background: #6d28d9;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.save-spot-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
