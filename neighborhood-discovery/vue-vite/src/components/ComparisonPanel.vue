<script setup lang="ts">
import { CATEGORY_META } from '../constants/london';
import { getTodayHoursLabel } from '../services/googleMaps';
import type { DiscoveredPlace } from '../types/neighborhood';

defineProps<{
  places: DiscoveredPlace[];
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'remove-place', placeId: string): void;
  (e: 'inspect-place', place: DiscoveredPlace): void;
}>();
</script>

<template>
  <section
    v-if="isOpen"
    id="comparison-panel"
    data-testid="comparison-panel"
    class="comparison-panel"
    aria-label="Side-by-side place comparison"
  >
    <div class="panel-header">
      <div>
        <h2 class="panel-title">Side-by-Side Comparison ({{ places.length }}/3)</h2>
        <p class="panel-subtitle">
          Compare live ratings, price levels, opening hours, and addresses across up to 3 places.
        </p>
      </div>
      <button
        type="button"
        class="panel-close-btn"
        aria-label="Close comparison panel"
        @click="emit('close')"
      >
        Hide Comparison
      </button>
    </div>

    <div v-if="places.length === 0" class="panel-empty">
      Select "+ Compare" on any place card in the directory or details drawer to compare up to 3 places side-by-side.
    </div>

    <div v-else class="compare-grid">
      <article
        v-for="place in places"
        :key="place.id"
        class="compare-card"
      >
        <div class="compare-card-top">
          <span
            class="cat-pill"
            :style="{
              backgroundColor: `${CATEGORY_META[place.category].background}18`,
              color: CATEGORY_META[place.category].background,
            }"
          >
            {{ place.primaryTypeDisplayName || CATEGORY_META[place.category].label }}
          </span>
          <button
            type="button"
            class="remove-link"
            @click="emit('remove-place', place.id)"
          >
            Remove
          </button>
        </div>

        <h3 class="compare-name">{{ place.displayName }}</h3>

        <dl class="compare-specs">
          <div class="spec-row">
            <dt>Rating</dt>
            <dd>
              {{
                place.rating !== null
                  ? `★ ${place.rating.toFixed(1)} (${(place.userRatingCount ?? 0).toLocaleString()})`
                  : 'N/A'
              }}
            </dd>
          </div>
          <div class="spec-row">
            <dt>Price</dt>
            <dd>{{ place.priceLevel ?? 'N/A' }}</dd>
          </div>
          <div class="spec-row">
            <dt>Today</dt>
            <dd>{{ getTodayHoursLabel(place.weekdayDescriptions) }}</dd>
          </div>
          <div class="spec-row">
            <dt>Address</dt>
            <dd>{{ place.formattedAddress }}</dd>
          </div>
        </dl>

        <div class="compare-footer">
          <button
            type="button"
            class="inspect-mini-btn"
            @click="emit('inspect-place', place)"
          >
            Inspect Full Details &amp; Reviews
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.comparison-panel {
  position: fixed;
  left: 400px;
  right: 0;
  bottom: 0;
  background: #ffffff;
  border-top: 2px solid #0f766e;
  box-shadow: 0 -10px 30px rgba(15, 23, 42, 0.14);
  padding: 12px 18px 16px;
  z-index: 32;
  max-height: 46vh;
  overflow-y: auto;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.panel-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.panel-subtitle {
  margin: 2px 0 0;
  font-size: 12px;
  color: #64748b;
}

.panel-close-btn {
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #0f172a;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.panel-empty {
  padding: 16px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  font-size: 13px;
  color: #475569;
  text-align: center;
}

.compare-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(220px, 1fr));
  gap: 12px;
}

.compare-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.compare-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cat-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
}

.remove-link {
  border: none;
  background: transparent;
  color: #dc2626;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.compare-name {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.compare-specs {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.spec-row {
  display: grid;
  grid-template-columns: 58px 1fr;
  gap: 6px;
}

.spec-row dt {
  color: #64748b;
  font-weight: 600;
}

.spec-row dd {
  margin: 0;
  color: #1e293b;
}

.compare-footer {
  margin-top: auto;
  padding-top: 6px;
}

.inspect-mini-btn {
  width: 100%;
  height: 30px;
  border-radius: 8px;
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

@media (max-width: 900px) {
  .comparison-panel {
    left: 0;
  }

  .compare-grid {
    grid-template-columns: 1fr;
  }
}
</style>
