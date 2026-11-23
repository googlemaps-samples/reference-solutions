<script setup lang="ts">
import type { PropertyListing } from '../types/realEstate';
import { PROPERTY_TYPE_LABELS, formatPrice } from '../data/properties';

defineProps<{
  property: PropertyListing;
  selected: boolean;
  hovered: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', id: string): void;
  (e: 'hover', id: string | null): void;
}>();
</script>

<template>
  <article
    class="property-card"
    :class="{ 'is-selected': selected, 'is-hovered': hovered }"
    data-testid="property-card"
    :data-property-id="property.id"
    tabindex="0"
    @click="emit('select', property.id)"
    @keydown.enter.prevent="emit('select', property.id)"
    @mouseenter="emit('hover', property.id)"
    @mouseleave="emit('hover', null)"
  >
    <div
      class="card-parcel-header"
      :style="{ '--card-accent': property.accentColor }"
    >
      <div class="card-badge-row">
        <span class="neighborhood-pill">{{ property.neighborhood }}</span>
        <span class="type-pill">{{ PROPERTY_TYPE_LABELS[property.propertyType] }}</span>
      </div>
      <div class="card-apn-row">
        <span class="apn-chip">APN {{ property.apn }}</span>
        <span class="dom-chip">{{ property.daysOnMarket }}d on market</span>
      </div>
    </div>

    <div class="card-body">
      <div class="card-price-row">
        <strong class="card-price">{{ formatPrice(property.price) }}</strong>
        <span class="card-lot-tag">{{ property.lotSqFt.toLocaleString() }} sq ft lot</span>
      </div>

      <h3 class="card-title">{{ property.title }}</h3>
      <p class="card-address">{{ property.address }}</p>

      <div class="card-stats">
        <span><strong>{{ property.beds }}</strong> bd</span>
        <span class="stat-dot" aria-hidden="true">·</span>
        <span><strong>{{ property.baths }}</strong> ba</span>
        <span class="stat-dot" aria-hidden="true">·</span>
        <span><strong>{{ property.sqft.toLocaleString() }}</strong> sq ft</span>
        <span class="stat-dot" aria-hidden="true">·</span>
        <span>Built {{ property.yearBuilt }}</span>
      </div>

      <div class="card-highlights">
        <span
          v-for="tag in property.highlights.slice(0, 3)"
          :key="tag"
          class="highlight-chip"
        >
          {{ tag }}
        </span>
      </div>
    </div>
  </article>
</template>
