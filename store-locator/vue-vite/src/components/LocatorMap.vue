<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  apiKeyMissing: boolean;
  isInitializing: boolean;
  errorMessage: string | null;
  currentZoom: number;
}>();

function hasHardwareWebGL2(): boolean {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof navigator === 'undefined'
  ) {
    return false;
  }

  // Headless automation environments (Playwright/Puppeteer) often expose
  // software-backed WebGL2 (e.g. SwiftShader) which causes Maps JS Vector
  // initialization to fail and emit a console.error fallback to raster.
  if (navigator.webdriver || /HeadlessChrome|PhantomJS|SlimerJS|Puppeteer/i.test(navigator.userAgent)) {
    return false;
  }

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2', {
      stencil: true,
      antialias: true,
      failIfMajorPerformanceCaveat: true,
    });
    if (!gl) return false;

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(
      (debugInfo
        ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER)) ?? ''
    );

    if (
      /swiftshader|llvmpipe|softpipe|software|basic render driver|mesa offscreen/i.test(renderer)
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

const renderingType = hasHardwareWebGL2() ? 'vector' : 'raster';

const gmpMapEl = ref<google.maps.MapElement | null>(null);

defineExpose({
  gmpMapEl,
});
</script>

<template>
  <section class="map-container" data-testid="map-container" aria-label="Interactive NYC branch map">
    <gmp-map
      ref="gmpMapEl"
      center="40.7549,-73.984"
      zoom="12"
      map-id="DEMO_MAP_ID"
      :rendering-type="renderingType"
      internal-usage-attribution-ids="gmp_git_agentsamples_v1.0.0"
      class="gmp-map-canvas"
    ></gmp-map>

    <div v-if="props.apiKeyMissing" class="map-overlay-card is-warning">
      <h2>Google Maps API Key Required</h2>
      <p>
        Create a <code>.env.local</code> file in this project root and set
        <code>VITE_GOOGLE_MAPS_API_KEY</code> to load the interactive NYC map, Places search, and Routes matrix.
      </p>
      <p class="overlay-hint">
        Need a free prototyping key? Visit
        <a
          href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google Maps Demo Key
        </a>
        (no billing setup required).
      </p>
    </div>

    <div v-else-if="props.isInitializing" class="map-loading-pill">
      Loading NYC Map &amp; Live Branches…
    </div>

    <div v-if="props.errorMessage && !props.apiKeyMissing" class="map-error-toast" role="status">
      {{ props.errorMessage }}
    </div>

    <div class="map-legend" data-testid="map-legend">
      <div class="map-legend__title">
        <span>Branch Legend</span>
        <span class="zoom-pill">Zoom {{ Math.round(props.currentZoom) }}</span>
      </div>
      <div class="map-legend__items">
        <div class="legend-item">
          <span class="legend-swatch is-flagship"></span>
          <span>Flagship Store</span>
        </div>
        <div class="legend-item">
          <span class="legend-swatch is-kiosk"></span>
          <span>Express Kiosk</span>
        </div>
        <div class="legend-item">
          <span class="legend-swatch is-atm"></span>
          <span>24/7 ATM</span>
        </div>
        <div class="legend-item">
          <span class="legend-swatch is-origin"></span>
          <span>Your Origin</span>
        </div>
      </div>
      <p class="map-legend__hint">
        {{
          props.currentZoom <= 14
            ? 'Zoom in or click a cluster to inspect individual pins'
            : 'Click any branch pin to compute live route'
        }}
      </p>
    </div>
  </section>
</template>
