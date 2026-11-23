<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRideshareMap } from './composables/useRideshareMap';
import type { EmissionType } from './types/rideshare';
import { formatDistanceMiles } from './utils/fares';

const mapContainer = ref<HTMLElement | null>(null);
const pickupAutocompleteHost = ref<HTMLElement | null>(null);
const dropoffAutocompleteHost = ref<HTMLElement | null>(null);

const {
  isInitializing,
  isRouting,
  errorMessage,
  pickupPlace,
  dropoffPlace,
  emissionType,
  selectedRouteKind,
  selectedTierId,
  fastestRoute,
  ecoRoute,
  ecoSummary,
  fareTiers,
  activeDriver,
  telemetry,
  init,
  swapLocations,
  setEmissionType,
  selectRouteKind,
  selectFareTier,
  dispatchClosestDriver,
  toggleSimulation,
} = useRideshareMap(mapContainer, pickupAutocompleteHost, dropoffAutocompleteHost);

onMounted(() => {
  void init();
});

const formattedRemainingEta = computed(() => {
  const sec = telemetry.value.remainingSeconds;
  if (telemetry.value.phase === 'arrived') return 'Arrived';
  if (sec <= 0) return '0s';
  if (sec < 60) return `${sec}s`;
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`;
});

const formattedRemainingDistance = computed(() => {
  return formatDistanceMiles(telemetry.value.remainingMeters);
});

const headerTripSummary = computed(() => {
  if (!pickupPlace.value || !dropoffPlace.value) {
    return 'Los Angeles Metro · Loading route...';
  }
  return `${pickupPlace.value.displayName} → ${dropoffPlace.value.displayName}`;
});

function onEmissionChange(event: Event): void {
  const target = event.target as HTMLSelectElement;
  void setEmissionType(target.value as EmissionType);
}
</script>

<template>
  <div class="app-shell">
    <!-- Top Header (56px) -->
    <header class="app-header">
      <div class="brand-group">
        <div class="brand-mark" aria-hidden="true">MP</div>
        <div class="brand-title-wrap">
          <h1 class="brand-title">MetroPulse LA Dispatch</h1>
          <span class="brand-subtitle">
            Rideshare Booking · Eco-Route Fare Estimator · Live Driver Tracking
          </span>
        </div>
      </div>

      <div class="header-trip-pill" :title="headerTripSummary">
        <span>{{ headerTripSummary }}</span>
      </div>

      <div class="header-status-badge">
        <span
          class="status-dot"
          :class="{ paused: !telemetry.isRunning && telemetry.phase !== 'arrived' }"
        ></span>
        <span>{{ telemetry.statusLabel }}</span>
      </div>
    </header>

    <!-- Main Split-Screen Workspace -->
    <main class="workspace">
      <!-- Left Scrollable Sidebar -->
      <aside class="control-sidebar">
        <div v-if="errorMessage" class="alert-banner" role="alert">
          {{ errorMessage }}
        </div>

        <div v-if="isInitializing || isRouting" class="loading-banner">
          {{
            isInitializing
              ? 'Loading Los Angeles map, Places API (New), and Routes API...'
              : 'Recomputing traffic-aware & eco-friendly routes...'
          }}
        </div>

        <!-- 1. Trip Planner -->
        <section class="section-card" aria-label="Trip Planner">
          <div class="section-header">
            <h2 class="section-title">1. Trip Planner</h2>
            <span class="section-chip">Places API (New)</span>
          </div>

          <div class="trip-inputs-stack">
            <div class="location-field">
              <div class="location-label-row">
                <span>
                  <span class="dot-indicator dot-pickup"></span>Pickup Location
                </span>
              </div>
              <div
                ref="pickupAutocompleteHost"
                class="autocomplete-host"
                data-testid="pickup-autocomplete"
              ></div>
              <span v-if="pickupPlace" class="resolved-caption">
                {{ pickupPlace.formattedAddress }}
              </span>
            </div>

            <div class="swap-row">
              <button
                type="button"
                class="swap-btn"
                data-testid="swap-locations-btn"
                :disabled="!pickupPlace || !dropoffPlace || isRouting"
                @click="swapLocations"
              >
                ⇅ Swap Pickup &amp; Drop-off
              </button>
            </div>

            <div class="location-field">
              <div class="location-label-row">
                <span>
                  <span class="dot-indicator dot-dropoff"></span>Drop-off Location
                </span>
              </div>
              <div
                ref="dropoffAutocompleteHost"
                class="autocomplete-host"
                data-testid="dropoff-autocomplete"
              ></div>
              <span v-if="dropoffPlace" class="resolved-caption">
                {{ dropoffPlace.formattedAddress }}
              </span>
            </div>
          </div>
        </section>

        <!-- 2. Fastest vs. Eco-Friendly Route Comparison -->
        <section class="section-card" aria-label="Route Comparison">
          <div class="section-header">
            <h2 class="section-title">2. Route Comparison</h2>
            <select
              aria-label="Vehicle Emission Type"
              class="emission-select"
              data-testid="emission-type-select"
              :value="emissionType"
              @change="onEmissionChange"
            >
              <option value="HYBRID">Hybrid</option>
              <option value="ELECTRIC">Electric (EV)</option>
              <option value="GASOLINE">Gasoline</option>
            </select>
          </div>

          <div class="route-cards-grid">
            <button
              type="button"
              class="route-card"
              :class="{ 'active-fastest': selectedRouteKind === 'fastest' }"
              data-testid="route-option-fastest"
              @click="selectRouteKind('fastest')"
            >
              <span class="route-card-tag fastest">Fastest · Traffic-Aware</span>
              <span class="route-card-duration">
                {{ fastestRoute?.durationText ?? '--' }}
              </span>
              <span class="route-card-meta">
                {{ fastestRoute?.distanceText ?? '--' }}
                <template v-if="ecoSummary?.fastestFuelLiters != null">
                  · {{ ecoSummary.fastestFuelLiters.toFixed(2) }} L eq
                </template>
              </span>
            </button>

            <button
              type="button"
              class="route-card"
              :class="{ 'active-eco': selectedRouteKind === 'eco' }"
              data-testid="route-option-eco"
              @click="selectRouteKind('eco')"
            >
              <span class="route-card-tag eco">Eco-Friendly · Fuel-Eff.</span>
              <span class="route-card-duration">
                {{ ecoRoute?.durationText ?? fastestRoute?.durationText ?? '--' }}
              </span>
              <span class="route-card-meta">
                {{ ecoRoute?.distanceText ?? fastestRoute?.distanceText ?? '--' }}
                <template v-if="ecoSummary?.ecoFuelLiters != null">
                  · {{ ecoSummary.ecoFuelLiters.toFixed(2) }} L eq
                </template>
              </span>
            </button>
          </div>

          <div
            v-if="ecoSummary"
            class="eco-savings-banner"
            data-testid="eco-savings-banner"
          >
            <span class="eco-savings-headline">{{ ecoSummary.headline }}</span>
            <span class="eco-savings-detail">{{ ecoSummary.detail }}</span>
          </div>
        </section>

        <!-- 3. Transparent Fare Estimator -->
        <section class="section-card" aria-label="Fare Estimates">
          <div class="section-header">
            <h2 class="section-title">3. Transparent Fare Tiers</h2>
            <span class="section-chip">Live Distance &amp; Time</span>
          </div>

          <div class="fare-list">
            <button
              v-for="tier in fareTiers"
              :key="tier.id"
              type="button"
              class="fare-card"
              :class="{
                selected: selectedTierId === tier.id,
                'green-tier': tier.id === 'green',
              }"
              :data-testid="`fare-tier-${tier.id}`"
              @click="selectFareTier(tier.id)"
            >
              <div class="fare-top-row">
                <div class="fare-name-group">
                  <span class="fare-name">{{ tier.name }}</span>
                  <span
                    class="fare-badge"
                    :class="{ green: tier.id === 'green' }"
                  >
                    {{ tier.badge }}
                  </span>
                </div>
                <span class="fare-price">${{ tier.totalFare.toFixed(2) }}</span>
              </div>
              <div class="fare-sub">
                {{ tier.subtitle }} · {{ tier.vehicleExamples }}
              </div>
              <div class="fare-breakdown">
                <span>Base ${{ tier.baseFare.toFixed(2) }}</span>
                <span>
                  {{ tier.distanceMiles.toFixed(1) }} mi (${{
                    tier.distanceFare.toFixed(2)
                  }})
                </span>
                <span>
                  {{ Math.round(tier.durationMinutes) }} min (${{
                    tier.timeFare.toFixed(2)
                  }})
                </span>
                <span>Fee ${{ tier.bookingFee.toFixed(2) }}</span>
                <span v-if="tier.ecoDiscount > 0">
                  Eco -${{ tier.ecoDiscount.toFixed(2) }}
                </span>
              </div>
            </button>
          </div>
        </section>

        <!-- 4. Live Driver Dispatch & ETA Tracker -->
        <section class="section-card" aria-label="Live Driver Dispatch">
          <div class="section-header">
            <h2 class="section-title">4. Live Driver Dispatch</h2>
            <span class="section-chip">RouteMatrix Closest</span>
          </div>

          <div class="driver-summary-box">
            <div class="driver-row">
              <span class="driver-name">{{ activeDriver.name }}</span>
              <span class="driver-rating">★ {{ activeDriver.rating.toFixed(2) }}</span>
            </div>
            <div class="driver-vehicle">
              {{ activeDriver.vehicleColor }} {{ activeDriver.vehicleModel }} ·
              Plate <strong>{{ activeDriver.licensePlate }}</strong>
            </div>
            <div class="driver-vehicle">
              Pickup dispatch ETA: <strong>{{ activeDriver.etaText }}</strong> ({{
                activeDriver.distanceText
              }}
              away)
            </div>

            <div class="driver-eta-banner" data-testid="driver-live-eta">
              <div class="driver-eta-top">
                <span>{{ telemetry.statusLabel }}</span>
                <span>{{ formattedRemainingEta }}</span>
              </div>
              <div class="driver-eta-metrics">
                <span>Remaining: {{ formattedRemainingDistance }}</span>
                <span>{{ telemetry.progressPercent }}% complete</span>
              </div>
              <div class="progress-track">
                <div
                  class="progress-fill"
                  :style="{ width: `${telemetry.progressPercent}%` }"
                ></div>
              </div>
            </div>
          </div>

          <div class="dispatch-actions">
            <button
              type="button"
              class="btn-primary"
              data-testid="dispatch-driver-btn"
              :disabled="isInitializing || isRouting || !fastestRoute"
              @click="dispatchClosestDriver"
            >
              Dispatch / Restart Simulation
            </button>
            <button
              type="button"
              class="btn-secondary"
              data-testid="toggle-simulation-btn"
              :disabled="isInitializing || !fastestRoute"
              @click="toggleSimulation"
            >
              {{ telemetry.isRunning ? 'Pause' : 'Resume' }}
            </button>
          </div>
        </section>
      </aside>

      <!-- Right Interactive Google Map -->
      <section class="map-stage" aria-label="Interactive Los Angeles Map">
        <div
          ref="mapContainer"
          class="map-canvas"
          data-testid="rideshare-map"
        ></div>

        <div class="map-route-legend" data-testid="map-route-legend">
          <div class="legend-title">Map Legend</div>
          <div class="legend-row">
            <span class="legend-line fastest"></span>
            <span>Fastest Route (TRAFFIC_AWARE_OPTIMAL)</span>
          </div>
          <div class="legend-row">
            <span class="legend-line eco"></span>
            <span>Eco-Friendly Route (FUEL_EFFICIENT)</span>
          </div>
          <div class="legend-row">
            <span class="legend-line approach"></span>
            <span>Driver Approach to Pickup</span>
          </div>
          <div class="legend-row">
            <span class="legend-dot" style="background: #2563eb"></span>
            <span>Pickup (A) · Drop-off (B, Red)</span>
          </div>
          <div class="legend-row">
            <span class="legend-dot" style="background: #0f172a"></span>
            <span>Live Driver (Heading-Aligned)</span>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
