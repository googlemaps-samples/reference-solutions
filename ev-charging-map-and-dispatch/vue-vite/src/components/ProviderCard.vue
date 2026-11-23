<script setup lang="ts">
import type { ProviderOption } from '../types/dispatch';

defineProps<{
  provider: ProviderOption;
  index: number;
  selected: boolean;
  routingLoading: boolean;
}>();

const emit = defineEmits<{
  select: [provider: ProviderOption];
  route: [provider: ProviderOption];
}>();
</script>

<template>
  <article
    :id="`provider-card-${index}`"
    class="provider-card"
    :class="{
      'is-selected': selected,
      'is-ev': provider.category === 'ev',
      'is-repair': provider.category === 'repair',
    }"
    @click="emit('select', provider)"
  >
    <div class="card-top-row">
      <div class="card-badges">
        <span
          class="category-badge"
          :class="provider.category === 'ev' ? 'badge-ev' : 'badge-repair'"
        >
          {{ provider.category === 'ev' ? 'EV Fast Charging' : 'Auto Repair' }}
        </span>
        <span v-if="index === 0" class="fastest-badge">Fastest ETA</span>
      </div>

      <div class="eta-pill" :title="provider.distanceText ?? undefined">
        <strong>{{ provider.etaText ?? '—' }}</strong>
        <span class="eta-sep">·</span>
        <span>{{ provider.distanceText ?? '—' }}</span>
      </div>
    </div>

    <h3 class="provider-name">{{ provider.name }}</h3>
    <p class="provider-address">{{ provider.address }}</p>

    <div class="provider-meta-row">
      <div v-if="provider.rating !== null" class="rating-chip">
        <span class="star-icon" aria-hidden="true">★</span>
        <strong>{{ provider.rating.toFixed(1) }}</strong>
        <span v-if="provider.userRatingCount !== null" class="rating-count">
          ({{ provider.userRatingCount.toLocaleString() }})
        </span>
      </div>
      <div v-else class="rating-chip muted">No ratings yet</div>

      <span
        class="status-badge"
        :class="{
          'status-open': provider.openingStatus.isOpen === true,
          'status-closed': provider.openingStatus.isOpen === false,
          'status-neutral': provider.openingStatus.isOpen === null,
        }"
      >
        {{ provider.openingStatus.badgeText }}
      </span>
    </div>

    <div v-if="provider.evSummary" class="ev-details-box">
      <div class="ev-summary-header">
        <span class="ev-ports-pill">
          <template v-if="provider.evSummary.totalAvailable !== null">
            {{ provider.evSummary.totalAvailable }}/{{
              provider.evSummary.totalConnectors
            }}
            ports available
          </template>
          <template v-else>
            {{ provider.evSummary.totalConnectors }} charging ports
          </template>
        </span>
        <span v-if="provider.evSummary.maxChargeRateKw > 0" class="ev-kw-pill">
          Up to {{ provider.evSummary.maxChargeRateKw }} kW
          {{ provider.evSummary.isFastCharger ? 'DC Fast' : '' }}
        </span>
      </div>
      <div v-if="provider.evSummary.connectors.length > 0" class="connector-tags">
        <span
          v-for="(conn, cIdx) in provider.evSummary.connectors"
          :key="`${provider.id}-conn-${cIdx}`"
          class="connector-tag"
        >
          {{ conn.typeLabel }} · {{ conn.maxChargeRateKw }} kW (×{{ conn.count }})
        </span>
      </div>
    </div>

    <p v-else-if="provider.openingStatus.todayHoursText" class="hours-line">
      {{ provider.openingStatus.todayHoursText }}
    </p>

    <div class="card-actions-row">
      <div class="card-links">
        <a
          v-if="provider.phoneNumber"
          :href="`tel:${provider.phoneNumber}`"
          class="meta-link"
          @click.stop
        >
          {{ provider.phoneNumber }}
        </a>
        <a
          v-if="provider.googleMapsUri"
          :href="provider.googleMapsUri"
          target="_blank"
          rel="noopener noreferrer"
          class="meta-link"
          @click.stop
        >
          Google Maps ↗
        </a>
      </div>

      <button
        :id="index === 0 ? 'dispatch-route-btn' : undefined"
        type="button"
        class="dispatch-route-btn"
        :class="{ 'is-active': selected }"
        :disabled="routingLoading"
        @click.stop="emit('route', provider)"
      >
        {{ selected ? 'Active Route' : 'Route Here' }}
      </button>
    </div>
  </article>
</template>
