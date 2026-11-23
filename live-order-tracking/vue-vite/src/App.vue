<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  CHICAGO_DELIVERY_ZONE_POLYGON,
  CHICAGO_TAX_RATE,
  DEMO_MAP_ID,
  GMP_USAGE_ATTRIBUTION_ID,
  KITCHEN_HUB,
  PRESET_OUT_OF_ZONE_ADDRESS,
  SAMPLE_CART_ITEMS,
  SEED_IN_ZONE_ADDRESS,
  type LatLngPoint,
} from './config/delivery';
import {
  buildStaticReceiptMapUrl,
  computeDeliveryRoute,
  evaluateZoneEligibility,
  initGoogleMaps,
  validateDeliveryAddress,
  type LoadedGoogleMapsLibraries,
} from './services/mapsService';
import type {
  CourierState,
  RouteComputationResult,
  ValidatedAddressResult,
  ZoneEligibilityResult,
} from './types/delivery';
import {
  buildPolylineProfile,
  interpolateAlongProfile,
  type PolylineProfile,
} from './utils/polylineAnimation';

const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
const hasApiKey = computed(
  () => Boolean(apiKey) && apiKey !== 'your_google_maps_api_key_here',
);

const mapContainerRef = ref<HTMLDivElement | null>(null);
const autocompleteElRef = ref<google.maps.places.PlaceAutocompleteElement | null>(null);

const addressInput = ref<string>(SEED_IN_ZONE_ADDRESS);
const activePreset = ref<'in-zone' | 'out-of-zone' | 'custom'>('in-zone');
const isLoading = ref<boolean>(false);
const initError = ref<string | null>(null);
const pipelineError = ref<string | null>(null);
const staticMapLoadError = ref<boolean>(false);
const orderId = ref<string>('FM-4829');

const validationResult = ref<ValidatedAddressResult | null>(null);
const routeResult = ref<RouteComputationResult | null>(null);
const zoneEligibility = ref<ZoneEligibilityResult | null>(null);
const staticMapUrl = ref<string>('');

const courierState = ref<CourierState>({
  status: 'idle',
  progress: 0,
  remainingSeconds: 0,
  distanceRemainingKm: 0,
  currentStepText: 'Awaiting route dispatch',
});

let libs: LoadedGoogleMapsLibraries | null = null;
let mapInstance: google.maps.Map | null = null;
let deliveryPolygon: google.maps.Polygon | null = null;
let routePolyline: google.maps.Polyline | null = null;
let kitchenMarker: google.maps.marker.AdvancedMarkerElement | null = null;
let customerMarker: google.maps.marker.AdvancedMarkerElement | null = null;
let courierMarker: google.maps.marker.AdvancedMarkerElement | null = null;

let polylineProfile: PolylineProfile = {
  points: [],
  cumulativeDistances: [],
  totalDistance: 0,
};
let rafId: number | null = null;
let lastFrameTime = 0;
const SIMULATION_DURATION_MS = 22000;

const subtotal = computed(() =>
  SAMPLE_CART_ITEMS.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
);

const activeDeliveryFee = computed(() =>
  zoneEligibility.value?.isEligible ? zoneEligibility.value.deliveryFee : 0,
);

const estimatedTax = computed(() => subtotal.value * CHICAGO_TAX_RATE);

const grandTotal = computed(
  () => subtotal.value + activeDeliveryFee.value + estimatedTax.value,
);

const canDispatchOrder = computed(
  () =>
    Boolean(validationResult.value?.deliverable) &&
    Boolean(zoneEligibility.value?.isEligible) &&
    Boolean(routeResult.value) &&
    !isLoading.value,
);

const topStatusBadge = computed(() => {
  if (!hasApiKey.value) {
    return { text: 'API Key Required', tone: 'is-warn' };
  }
  if (initError.value) {
    return { text: 'Map Init Error', tone: 'is-error' };
  }
  if (isLoading.value) {
    return { text: 'Validating & Routing...', tone: 'is-warn' };
  }
  if (!validationResult.value || !zoneEligibility.value) {
    return { text: 'Ready for Checkout', tone: 'is-warn' };
  }
  if (!validationResult.value.deliverable || !zoneEligibility.value.isEligible) {
    return { text: 'Outside Delivery Zone', tone: 'is-error' };
  }
  if (courierState.value.status === 'delivered') {
    return { text: 'Delivered • Completed', tone: 'is-ok' };
  }
  if (courierState.value.status === 'en-route') {
    const pct = Math.round(courierState.value.progress * 100);
    return { text: `Courier En Route • ${pct}%`, tone: 'is-ok' };
  }
  if (courierState.value.status === 'paused') {
    return { text: 'Courier Paused', tone: 'is-warn' };
  }
  return { text: 'Zone Eligible • Ready', tone: 'is-ok' };
});

const etaMinutesText = computed(() => {
  if (!routeResult.value) return '—';
  const mins = Math.max(1, Math.round(routeResult.value.durationSeconds / 60));
  return `${mins} min`;
});

const distanceKmText = computed(() => {
  if (!routeResult.value) return '—';
  return `${(routeResult.value.distanceMeters / 1000).toFixed(2)} km`;
});

const simulationToggleLabel = computed(() => {
  if (courierState.value.status === 'en-route') return 'Pause Courier';
  if (courierState.value.status === 'paused') return 'Resume Courier';
  if (courierState.value.status === 'delivered') return 'Replay Courier';
  return 'Start Courier';
});

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function createCourierMarkerElement(): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'courier-marker-badge';
  wrapper.setAttribute('aria-label', 'Live delivery courier');

  const dot = document.createElement('span');
  dot.className = 'courier-marker-pulse';

  const label = document.createElement('span');
  label.textContent = 'COURIER';

  wrapper.appendChild(dot);
  wrapper.appendChild(label);
  return wrapper;
}

function stopAnimation(): void {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  lastFrameTime = 0;
}

function updateCourierPositionAtProgress(progress: number): void {
  const pos = interpolateAlongProfile(polylineProfile, progress);
  if (pos && courierMarker) {
    courierMarker.position = pos;
  }

  const route = routeResult.value;
  if (!route) return;

  const remainingFraction = Math.max(0, 1 - progress);
  const remainingSeconds = Math.round(route.durationSeconds * remainingFraction);
  const distanceRemainingKm = Number(
    ((route.distanceMeters / 1000) * remainingFraction).toFixed(2),
  );

  let currentStepText = 'Arriving at customer drop-off';
  if (progress < 1 && route.steps.length > 0) {
    const stepIdx = Math.min(
      route.steps.length - 1,
      Math.floor(progress * route.steps.length),
    );
    currentStepText = route.steps[stepIdx].instruction;
  }

  courierState.value = {
    status: progress >= 1 ? 'delivered' : courierState.value.status,
    progress,
    remainingSeconds,
    distanceRemainingKm,
    currentStepText,
  };
}

function tickAnimation(timestamp: number): void {
  if (courierState.value.status !== 'en-route') {
    rafId = null;
    return;
  }

  if (lastFrameTime === 0) {
    lastFrameTime = timestamp;
  }
  const delta = timestamp - lastFrameTime;
  lastFrameTime = timestamp;

  const nextProgress = Math.min(
    1,
    courierState.value.progress + delta / SIMULATION_DURATION_MS,
  );
  updateCourierPositionAtProgress(nextProgress);

  if (nextProgress < 1) {
    rafId = requestAnimationFrame(tickAnimation);
  } else {
    rafId = null;
    lastFrameTime = 0;
  }
}

function startCourierSimulation(resetToStart: boolean): void {
  if (!canDispatchOrder.value || polylineProfile.points.length < 2) return;
  stopAnimation();

  const initialProgress = resetToStart ? 0 : courierState.value.progress >= 1 ? 0 : courierState.value.progress;
  courierState.value = {
    ...courierState.value,
    status: 'en-route',
    progress: initialProgress,
  };
  updateCourierPositionAtProgress(initialProgress);
  lastFrameTime = 0;
  rafId = requestAnimationFrame(tickAnimation);
}

function toggleCourierSimulation(): void {
  if (!canDispatchOrder.value) return;
  if (courierState.value.status === 'en-route') {
    stopAnimation();
    courierState.value = {
      ...courierState.value,
      status: 'paused',
    };
  } else if (courierState.value.status === 'paused') {
    startCourierSimulation(false);
  } else {
    startCourierSimulation(true);
  }
}

function handlePlaceOrder(): void {
  if (!canDispatchOrder.value) return;
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  orderId.value = `FM-${randomDigits}`;
  startCourierSimulation(true);
}

function clearRouteVisuals(): void {
  stopAnimation();
  if (routePolyline) {
    routePolyline.setMap(null);
    routePolyline = null;
  }
  if (customerMarker) {
    customerMarker.map = null;
    customerMarker = null;
  }
  if (courierMarker) {
    courierMarker.map = null;
    courierMarker = null;
  }
}

function renderMapRouteAndMarkers(
  destination: LatLngPoint,
  formattedAddress: string,
  route: RouteComputationResult,
  isEligible: boolean,
): void {
  if (!libs || !mapInstance) return;
  clearRouteVisuals();

  const { Polyline } = libs.maps;
  const { AdvancedMarkerElement, PinElement } = libs.marker;
  const { LatLngBounds } = libs.core;

  routePolyline = new Polyline({
    path: route.pathPoints,
    strokeColor: isEligible ? '#2563eb' : '#dc2626',
    strokeOpacity: isEligible ? 0.9 : 0.65,
    strokeWeight: 5,
    map: mapInstance,
  });

  const customerPin = new PinElement({
    background: isEligible ? '#059669' : '#dc2626',
    borderColor: '#ffffff',
    glyphColor: '#ffffff',
    glyphText: 'D',
    scale: 1.15,
  });

  customerMarker = new AdvancedMarkerElement({
    map: mapInstance,
    position: destination,
    title: formattedAddress,
    zIndex: 20,
  });
  customerMarker.append(customerPin);

  polylineProfile = buildPolylineProfile(route.pathPoints);

  if (isEligible && polylineProfile.points.length >= 2) {
    courierMarker = new AdvancedMarkerElement({
      map: mapInstance,
      position: polylineProfile.points[0],
      title: 'Live Courier',
      zIndex: 50,
    });
    courierMarker.append(createCourierMarkerElement());
  }

  const bounds = new LatLngBounds();
  bounds.extend(KITCHEN_HUB.position);
  bounds.extend(destination);
  for (const pt of route.pathPoints) {
    bounds.extend(pt);
  }
  mapInstance.fitBounds(bounds, { top: 64, right: 64, bottom: 64, left: 64 });
}

async function runCheckoutPipeline(
  addressText: string,
  fallbackLocation?: LatLngPoint | null,
  fallbackPlaceId?: string | null,
): Promise<void> {
  if (!libs || !deliveryPolygon) return;

  isLoading.value = true;
  pipelineError.value = null;
  staticMapLoadError.value = false;

  try {
    const validated = await validateDeliveryAddress(
      libs,
      addressText,
      fallbackLocation,
      fallbackPlaceId,
    );
    validationResult.value = validated;

    const route = await computeDeliveryRoute(
      libs,
      KITCHEN_HUB.position,
      validated.location,
    );
    routeResult.value = route;

    const eligibility = evaluateZoneEligibility(
      libs,
      validated.location,
      deliveryPolygon,
      route.distanceMeters,
    );
    zoneEligibility.value = eligibility;

    staticMapUrl.value = buildStaticReceiptMapUrl(
      apiKey,
      KITCHEN_HUB.position,
      validated.location,
      route.encodedPolyline,
    );

    renderMapRouteAndMarkers(
      validated.location,
      validated.formattedAddress,
      route,
      eligibility.isEligible && validated.deliverable,
    );

    isLoading.value = false;

    if (eligibility.isEligible && validated.deliverable) {
      startCourierSimulation(true);
    } else {
      stopAnimation();
      courierState.value = {
        status: 'idle',
        progress: 0,
        remainingSeconds: route.durationSeconds,
        distanceRemainingKm: Number((route.distanceMeters / 1000).toFixed(2)),
        currentStepText: 'Dispatch unavailable — drop-off outside delivery zone',
      };
    }
  } catch (err) {
    pipelineError.value =
      err instanceof Error ? err.message : 'Unable to validate address and compute route.';
  } finally {
    isLoading.value = false;
  }
}

async function handlePlaceSelect(event: Event): Promise<void> {
  const selectEvent = event as google.maps.places.PlacePredictionSelectEvent;
  const prediction = selectEvent.placePrediction;
  if (!prediction) return;

  const place = prediction.toPlace();
  await place.fetchFields({
    fields: ['displayName', 'formattedAddress', 'location', 'id'],
  });

  const formatted = place.formattedAddress || place.displayName || addressInput.value;
  addressInput.value = formatted;
  activePreset.value = 'custom';

  const loc = place.location
    ? { lat: place.location.lat(), lng: place.location.lng() }
    : null;

  await runCheckoutPipeline(formatted, loc, place.id ?? null);
}

function handlePlaceError(): void {
  pipelineError.value =
    'Places Autocomplete could not reach Google Maps Platform. Verify your API key and Places API (New) enablement.';
}

async function selectPreset(preset: 'in-zone' | 'out-of-zone'): Promise<void> {
  activePreset.value = preset;
  const targetAddress =
    preset === 'in-zone' ? SEED_IN_ZONE_ADDRESS : PRESET_OUT_OF_ZONE_ADDRESS;
  addressInput.value = targetAddress;
  if (autocompleteElRef.value) {
    autocompleteElRef.value.value = targetAddress;
  }
  await runCheckoutPipeline(targetAddress);
}

async function validateCurrentInput(): Promise<void> {
  const rawValue = autocompleteElRef.value?.value?.trim() || addressInput.value.trim();
  addressInput.value = rawValue;
  activePreset.value =
    rawValue === SEED_IN_ZONE_ADDRESS
      ? 'in-zone'
      : rawValue === PRESET_OUT_OF_ZONE_ADDRESS
        ? 'out-of-zone'
        : 'custom';
  await runCheckoutPipeline(rawValue);
}

onMounted(async () => {
  if (!hasApiKey.value || !mapContainerRef.value) {
    return;
  }

  try {
    libs = await initGoogleMaps(apiKey);
    const { Map, Polygon } = libs.maps;
    const { AdvancedMarkerElement, PinElement } = libs.marker;

    mapInstance = new Map(mapContainerRef.value, {
      center: KITCHEN_HUB.position,
      zoom: 13,
      mapId: DEMO_MAP_ID,
      internalUsageAttributionIds: [GMP_USAGE_ATTRIBUTION_ID],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    deliveryPolygon = new Polygon({
      paths: CHICAGO_DELIVERY_ZONE_POLYGON,
      strokeColor: '#059669',
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillColor: '#10b981',
      fillOpacity: 0.12,
      map: mapInstance,
    });

    const kitchenPin = new PinElement({
      background: '#0f172a',
      borderColor: '#f59e0b',
      glyphColor: '#fbbf24',
      glyphText: 'K',
      scale: 1.15,
    });
    kitchenMarker = new AdvancedMarkerElement({
      map: mapInstance,
      position: KITCHEN_HUB.position,
      title: `${KITCHEN_HUB.name} — ${KITCHEN_HUB.address}`,
      zIndex: 15,
    });
    kitchenMarker.append(kitchenPin);

    await customElements.whenDefined('gmp-place-autocomplete');
    const acEl = autocompleteElRef.value;
    if (acEl) {
      acEl.includedRegionCodes = ['us'];
      acEl.locationBias = {
        center: KITCHEN_HUB.position,
        radius: 15000,
      };
      acEl.origin = KITCHEN_HUB.position;
      acEl.value = SEED_IN_ZONE_ADDRESS;
      acEl.addEventListener('gmp-select', handlePlaceSelect as EventListener);
      acEl.addEventListener('gmp-error', handlePlaceError);
    }

    await runCheckoutPipeline(SEED_IN_ZONE_ADDRESS);
  } catch (err) {
    initError.value =
      err instanceof Error ? err.message : 'Failed to initialize Google Maps Platform.';
  }
});

onBeforeUnmount(() => {
  stopAnimation();
  const acEl = autocompleteElRef.value;
  if (acEl) {
    acEl.removeEventListener('gmp-select', handlePlaceSelect as EventListener);
    acEl.removeEventListener('gmp-error', handlePlaceError);
  }
  clearRouteVisuals();
  if (deliveryPolygon) {
    deliveryPolygon.setMap(null);
    deliveryPolygon = null;
  }
  if (kitchenMarker) {
    kitchenMarker.map = null;
    kitchenMarker = null;
  }
});
</script>

<template>
  <div class="app-shell">
    <!-- Top Bar -->
    <header class="top-bar">
      <div class="brand-group">
        <span class="brand-mark">FM</span>
        <div>
          <h1 class="brand-title">Fulton Market Fresh • Delivery & Live Tracker</h1>
          <p class="brand-subtitle">Chicago On-Demand Checkout, Zone Validation & Courier Telemetry</p>
        </div>
      </div>

      <div class="top-badges">
        <span class="hub-badge">Hub: {{ KITCHEN_HUB.address }}</span>
        <span class="status-pill" :class="topStatusBadge.tone">
          {{ topStatusBadge.text }}
        </span>
      </div>
    </header>

    <!-- Main Split Workspace -->
    <main class="workspace-grid">
      <!-- Left Checkout & Tracking Sidebar -->
      <aside class="sidebar-panel">
        <!-- Card 1: Address Autocomplete, Address Validation & Zone Check -->
        <section class="card">
          <div class="card-header">
            <h2 class="card-title">1. Checkout Address & Zone Check</h2>
            <span class="step-tag">Places + Validation</span>
          </div>

          <label class="field-label" for="checkout-address-autocomplete">
            Delivery Address (Chicago, IL)
          </label>
          <div class="autocomplete-wrap">
            <gmp-place-autocomplete
              id="checkout-address-autocomplete"
              ref="autocompleteElRef"
              data-testid="checkout-address-autocomplete"
              class="gmp-autocomplete-input"
              internal-usage-attribution-ids="gmp_git_agentsamples_v1.0.0"
              placeholder="Search Chicago delivery address..."
            ></gmp-place-autocomplete>
          </div>

          <div class="preset-row">
            <button
              id="preset-address-in-zone-btn"
              data-testid="preset-address-in-zone-btn"
              type="button"
              class="btn"
              :class="{ 'btn-preset-active': activePreset === 'in-zone' }"
              :disabled="!hasApiKey || isLoading"
              @click="selectPreset('in-zone')"
            >
              In-Zone: 401 N Michigan
            </button>
            <button
              id="preset-address-out-of-zone-btn"
              data-testid="preset-address-out-of-zone-btn"
              type="button"
              class="btn"
              :class="{ 'btn-preset-active': activePreset === 'out-of-zone' }"
              :disabled="!hasApiKey || isLoading"
              @click="selectPreset('out-of-zone')"
            >
              Out-of-Zone: 5500 N Sheridan
            </button>
          </div>

          <button
            id="validate-address-btn"
            data-testid="validate-address-btn"
            type="button"
            class="btn btn-primary"
            :disabled="!hasApiKey || isLoading"
            @click="validateCurrentInput"
          >
            {{ isLoading ? 'Validating & Computing Route...' : 'Verify Address & Check Delivery Zone' }}
          </button>

          <div v-if="pipelineError" class="status-box is-invalid">
            <div class="status-headline">Validation / Routing Error</div>
            <p class="status-subtext">{{ pipelineError }}</p>
          </div>

          <!-- Address Validation API Results -->
          <div
            v-if="validationResult"
            id="validation-status-panel"
            data-testid="validation-status-panel"
            class="status-box"
            :class="
              validationResult.deliverable
                ? validationResult.verdict.hasUnconfirmedComponents
                  ? 'is-warn'
                  : 'is-valid'
                : 'is-invalid'
            "
          >
            <div class="status-headline">
              <span>
                {{
                  validationResult.deliverable
                    ? 'Address Confirmed Deliverable'
                    : 'Address Deliverability Warning'
                }}
              </span>
              <span>
                {{ validationResult.source === 'address-validation' ? 'Address Validation API' : 'Geocoder Fallback' }}
              </span>
            </div>
            <p class="status-subtext">
              <strong>{{ validationResult.formattedAddress }}</strong><br />
              {{ validationResult.deliverabilityReason }}
            </p>

            <div class="verdict-grid">
              <div class="verdict-chip">
                <span class="verdict-chip-label">Validation Granularity</span>
                <span class="verdict-chip-val">{{ validationResult.verdict.validationGranularity }}</span>
              </div>
              <div class="verdict-chip">
                <span class="verdict-chip-label">Geocode Granularity</span>
                <span class="verdict-chip-val">{{ validationResult.verdict.geocodeGranularity }}</span>
              </div>
              <div class="verdict-chip">
                <span class="verdict-chip-label">Address Complete</span>
                <span class="verdict-chip-val">{{ validationResult.verdict.addressComplete ? 'Yes' : 'No' }}</span>
              </div>
              <div class="verdict-chip">
                <span class="verdict-chip-label">Unconfirmed / Inferred</span>
                <span class="verdict-chip-val">
                  {{ validationResult.verdict.hasUnconfirmedComponents ? 'Unconfirmed' : 'Confirmed' }}
                  /
                  {{ validationResult.verdict.hasInferredComponents ? 'Inferred' : 'Exact' }}
                </span>
              </div>
              <div v-if="validationResult.metadata" class="verdict-chip">
                <span class="verdict-chip-label">Property Type</span>
                <span class="verdict-chip-val">
                  {{
                    validationResult.metadata.poBox
                      ? 'PO Box'
                      : validationResult.metadata.business
                        ? 'Commercial'
                        : validationResult.metadata.residential
                          ? 'Residential'
                          : 'Mixed'
                  }}
                </span>
              </div>
              <div v-if="validationResult.uspsData" class="verdict-chip">
                <span class="verdict-chip-label">USPS CASS / DPV</span>
                <span class="verdict-chip-val">
                  DPV {{ validationResult.uspsData.dpvConfirmation ?? 'N/A' }}
                  <template v-if="validationResult.uspsData.carrierRoute">
                    • {{ validationResult.uspsData.carrierRoute }}
                  </template>
                </span>
              </div>
            </div>
          </div>

          <!-- Polygon + 8km Eligibility Badge -->
          <div
            v-if="zoneEligibility"
            id="zone-eligibility-badge"
            data-testid="zone-eligibility-badge"
            class="zone-badge"
            :class="zoneEligibility.isEligible ? 'is-eligible' : 'is-ineligible'"
          >
            <div>
              {{ zoneEligibility.isEligible ? 'Eligible for Local Delivery' : 'Not Eligible for Delivery' }}
            </div>
            <div class="zone-checks-row">
              <span>Polygon: {{ zoneEligibility.insidePolygon ? 'Inside Zone' : 'Outside Zone' }}</span>
              <span>Road Cap (8 km): {{ zoneEligibility.withinDistanceLimit ? 'Within Limit' : 'Exceeded' }}</span>
            </div>
            <div style="font-weight: 500; font-size: 11px;">
              {{ zoneEligibility.reason }}
            </div>
          </div>
        </section>

        <!-- Card 2: Tiered Delivery Fee, ETA & Live Courier Dispatch -->
        <section class="card">
          <div class="card-header">
            <h2 class="card-title">2. Fee, Traffic ETA & Live Courier</h2>
            <span class="step-tag">Routes API</span>
          </div>

          <div
            id="delivery-fee-eta-summary"
            data-testid="delivery-fee-eta-summary"
          >
            <div class="metrics-row">
              <div class="metric-box">
                <span class="metric-label">Road Distance</span>
                <span class="metric-value">{{ distanceKmText }}</span>
              </div>
              <div class="metric-box">
                <span class="metric-label">Traffic ETA</span>
                <span class="metric-value">{{ etaMinutesText }}</span>
              </div>
              <div class="metric-box">
                <span class="metric-label">Delivery Fee</span>
                <span class="metric-value">
                  {{ zoneEligibility?.isEligible ? formatCurrency(zoneEligibility.deliveryFee) : 'N/A' }}
                </span>
              </div>
            </div>

            <p class="tier-caption">
              {{ zoneEligibility?.tierLabel ?? 'Tiers: $2.99 (≤3 km) • $4.99 (≤5.5 km) • $6.99 (≤8 km)' }}
            </p>
          </div>

          <div class="action-row">
            <button
              id="place-order-btn"
              data-testid="place-order-btn"
              type="button"
              class="btn btn-emerald"
              :disabled="!canDispatchOrder"
              @click="handlePlaceOrder"
            >
              Place & Dispatch Order
            </button>
            <button
              id="courier-simulation-toggle-btn"
              data-testid="courier-simulation-toggle-btn"
              type="button"
              class="btn btn-secondary"
              :disabled="!canDispatchOrder"
              @click="toggleCourierSimulation"
            >
              {{ simulationToggleLabel }}
            </button>
          </div>

          <div
            id="courier-progress-panel"
            data-testid="courier-progress-panel"
            class="courier-panel"
          >
            <div class="progress-header">
              <span>Courier Telemetry ({{ orderId }})</span>
              <span>{{ Math.round(courierState.progress * 100) }}%</span>
            </div>
            <div class="progress-track">
              <div
                class="progress-fill"
                :style="{ width: `${Math.round(courierState.progress * 100)}%` }"
              ></div>
            </div>
            <div class="courier-meta">
              <span>Remaining: {{ courierState.distanceRemainingKm.toFixed(2) }} km</span>
              <span>
                ETA:
                {{
                  courierState.status === 'delivered'
                    ? 'Arrived'
                    : `${Math.max(1, Math.ceil(courierState.remainingSeconds / 60))} min`
                }}
              </span>
            </div>
            <div class="courier-instruction">
              Next step: {{ courierState.currentStepText }}
            </div>
          </div>
        </section>

        <!-- Card 3: Itemized Order Receipt & Maps Static API Image -->
        <section
          id="order-receipt-card"
          data-testid="order-receipt-card"
          class="card"
        >
          <div class="card-header">
            <h2 class="card-title">3. Order Receipt & Route Summary</h2>
            <span class="step-tag">Maps Static API</span>
          </div>

          <ul class="receipt-items">
            <li v-for="item in SAMPLE_CART_ITEMS" :key="item.id" class="receipt-item">
              <span>
                {{ item.quantity }}× {{ item.name }}
                <span class="receipt-item-cat">{{ item.category }}</span>
              </span>
              <strong>{{ formatCurrency(item.unitPrice * item.quantity) }}</strong>
            </li>
          </ul>

          <div class="receipt-totals">
            <div class="receipt-line">
              <span>Subtotal</span>
              <span>{{ formatCurrency(subtotal) }}</span>
            </div>
            <div class="receipt-line">
              <span>Tiered Delivery Fee</span>
              <span>
                {{ zoneEligibility?.isEligible ? formatCurrency(activeDeliveryFee) : 'Ineligible' }}
              </span>
            </div>
            <div class="receipt-line">
              <span>Chicago Tax (10.25%)</span>
              <span>{{ formatCurrency(estimatedTax) }}</span>
            </div>
            <div class="receipt-line is-total">
              <span>Total</span>
              <span>{{ formatCurrency(grandTotal) }}</span>
            </div>
          </div>

          <div v-if="staticMapUrl && !staticMapLoadError" class="static-map-frame">
            <img
              id="static-receipt-map-img"
              data-testid="static-receipt-map-img"
              class="static-map-img"
              :src="staticMapUrl"
              alt="Static route summary map from Fulton Market Kitchen Hub to customer delivery address"
              @error="staticMapLoadError = true"
            />
            <div class="static-map-caption">
              Receipt route snapshot ({{ KITCHEN_HUB.name }} → {{ validationResult?.formattedAddress ?? addressInput }})
            </div>
          </div>

          <div v-else class="status-box is-warn" style="margin-top: 0;">
            <div class="status-headline">Static Map Preview Unavailable</div>
            <p class="status-subtext">
              Enable Maps Static API on your Google Cloud API key to display the receipt route snapshot image.
            </p>
          </div>
        </section>
      </aside>

      <!-- Right Interactive Live Tracking Map -->
      <section class="map-panel">
        <div
          id="live-tracking-map"
          ref="mapContainerRef"
          data-testid="live-tracking-map"
          class="live-tracking-map"
        ></div>

        <div v-if="!hasApiKey" class="setup-banner">
          <h2>Google Maps Platform API Key Required</h2>
          <p>
            Configure <code>VITE_GOOGLE_MAPS_API_KEY</code> in <code>.env.local</code> to load the interactive Chicago delivery map, Places Autocomplete, Address Validation, Routes API, and Maps Static API.
          </p>
          <ol>
            <li>Copy <code>.env.example</code> to <code>.env.local</code>.</li>
            <li>
              Generate a free Maps Demo Key at
              <a
                href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
                target="_blank"
                rel="noopener noreferrer"
              >
                mapsplatform.google.com/maps-demo-key
              </a>
              or use your Google Cloud key.
            </li>
            <li>Restart the dev/preview server.</li>
          </ol>
        </div>

        <div v-else-if="initError" class="setup-banner">
          <h2>Unable to Initialize Maps JavaScript API</h2>
          <p>{{ initError }}</p>
        </div>

        <div v-if="hasApiKey && !initError" class="map-overlay-card">
          <p class="map-overlay-title">Live Delivery Status</p>
          <p class="map-overlay-eta">
            {{
              zoneEligibility?.isEligible
                ? `ETA ${etaMinutesText} • ${distanceKmText}`
                : 'Outside Zone'
            }}
          </p>
          <p class="map-overlay-sub">
            {{
              zoneEligibility?.isEligible
                ? `Fee: ${formatCurrency(zoneEligibility.deliveryFee)} (${Math.round(courierState.progress * 100)}% complete)`
                : zoneEligibility?.reason ?? 'Enter an eligible Chicago address'
            }}
          </p>
        </div>

        <div class="map-legend">
          <span class="legend-item">
            <span class="legend-swatch" style="background: #0f172a;"></span>
            Kitchen (K)
          </span>
          <span class="legend-item">
            <span class="legend-swatch" style="background: #059669;"></span>
            Drop-off (D)
          </span>
          <span class="legend-item">
            <span class="legend-swatch" style="background: #2563eb;"></span>
            Courier & Route
          </span>
          <span class="legend-item">
            <span class="legend-swatch" style="background: rgba(16, 185, 129, 0.45); border: 1px solid #059669;"></span>
            8 km Zone Polygon
          </span>
        </div>
      </section>
    </main>
  </div>
</template>
