<script setup lang="ts">
import { computed, ref } from 'vue';
import type {
  ElevationSamplePoint,
  ElevationStats,
  TravelModeKey,
} from '../types/routing';
import { formatFeet, formatMeters } from '../utils/formatters';

const props = defineProps<{
  stats: ElevationStats | null;
  loading: boolean;
  error: string | null;
  activeMode: TravelModeKey;
  routeLabel: string;
  hoveredSample: ElevationSamplePoint | null;
}>();

const emit = defineEmits<{
  (e: 'hover-sample', sample: ElevationSamplePoint | null): void;
  (e: 'request-elevation'): void;
}>();

const svgRef = ref<SVGSVGElement | null>(null);

const SVG_WIDTH = 820;
const SVG_HEIGHT = 122;
const PAD_LEFT = 46;
const PAD_RIGHT = 14;
const PAD_TOP = 12;
const PAD_BOTTOM = 22;

const plotWidth = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;
const plotHeight = SVG_HEIGHT - PAD_TOP - PAD_BOTTOM;

const isActiveTrailMode = computed(
  () => props.activeMode === 'BICYCLING' || props.activeMode === 'WALKING',
);

const chartPoints = computed(() => {
  const samples = props.stats?.samples ?? [];
  if (samples.length < 2 || !props.stats) return [];

  const minM = props.stats.minMeters;
  const maxM = props.stats.maxMeters;
  const span = Math.max(8, maxM - minM);
  const paddedMin = minM - span * 0.08;
  const paddedMax = maxM + span * 0.08;
  const paddedSpan = paddedMax - paddedMin;

  return samples.map((sample, idx) => {
    const x = PAD_LEFT + (idx / (samples.length - 1)) * plotWidth;
    const norm = (sample.elevationMeters - paddedMin) / paddedSpan;
    const y = PAD_TOP + plotHeight - norm * plotHeight;
    return { x, y, sample };
  });
});

const linePath = computed(() => {
  if (!chartPoints.value.length) return '';
  return chartPoints.value
    .map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
    .join(' ');
});

const areaPath = computed(() => {
  const pts = chartPoints.value;
  if (!pts.length) return '';
  const baseY = PAD_TOP + plotHeight;
  const first = pts[0];
  const last = pts[pts.length - 1];
  return `${linePath.value} L${last.x.toFixed(1)},${baseY.toFixed(1)} L${first.x.toFixed(1)},${baseY.toFixed(1)} Z`;
});

const yTicks = computed(() => {
  if (!props.stats) return [];
  const minM = props.stats.minMeters;
  const maxM = props.stats.maxMeters;
  const midM = (minM + maxM) / 2;
  const span = Math.max(8, maxM - minM);
  const paddedMin = minM - span * 0.08;
  const paddedMax = maxM + span * 0.08;
  const paddedSpan = paddedMax - paddedMin;

  const toY = (m: number) =>
    PAD_TOP + plotHeight - ((m - paddedMin) / paddedSpan) * plotHeight;

  return [
    { label: formatFeet(maxM), y: toY(maxM) },
    { label: formatFeet(midM), y: toY(midM) },
    { label: formatFeet(minM), y: toY(minM) },
  ];
});

const xTicks = computed(() => {
  const samples = props.stats?.samples ?? [];
  if (samples.length < 2) return [];
  const totalMi = samples[samples.length - 1].distanceMiles;
  const fractions = [0, 0.25, 0.5, 0.75, 1];
  return fractions.map((f) => ({
    x: PAD_LEFT + f * plotWidth,
    label: `${(totalMi * f).toFixed(1)} mi`,
  }));
});

const activePointCoords = computed(() => {
  if (!props.hoveredSample || !chartPoints.value.length) return null;
  return (
    chartPoints.value.find((p) => p.sample.index === props.hoveredSample?.index) ??
    null
  );
});

function formatGrade(grade: number): string {
  const sign = grade > 0.05 ? '+' : '';
  return `${sign}${grade.toFixed(1)}%`;
}

function handlePointerMove(event: PointerEvent): void {
  const svg = svgRef.value;
  const pts = chartPoints.value;
  if (!svg || !pts.length) return;

  const rect = svg.getBoundingClientRect();
  if (rect.width <= 0) return;

  const relX = ((event.clientX - rect.left) / rect.width) * SVG_WIDTH;
  const clamped = Math.max(PAD_LEFT, Math.min(PAD_LEFT + plotWidth, relX));
  const ratio = (clamped - PAD_LEFT) / plotWidth;
  const idx = Math.round(ratio * (pts.length - 1));
  const target = pts[idx]?.sample ?? null;
  emit('hover-sample', target);
}

function handlePointerLeave(): void {
  emit('hover-sample', null);
}
</script>

<template>
  <section class="elevation-panel" aria-label="Elevation and slope profile">
    <div class="elevation-header">
      <div class="elevation-title-group">
        <span class="elevation-eyebrow">Elevation &amp; Slope Profile</span>
        <span v-if="routeLabel" class="elevation-route-tag">{{ routeLabel }}</span>
      </div>

      <div v-if="stats && stats.samples.length > 0" class="elevation-kpis">
        <div class="kpi-chip gain">
          <span class="kpi-label">Gain</span>
          <span class="kpi-val">+{{ formatFeet(stats.gainMeters) }}</span>
          <span class="kpi-sub">(+{{ formatMeters(stats.gainMeters) }})</span>
        </div>
        <div class="kpi-chip">
          <span class="kpi-label">Range</span>
          <span class="kpi-val">
            {{ formatFeet(stats.minMeters) }} – {{ formatFeet(stats.maxMeters) }}
          </span>
        </div>
        <div class="kpi-chip">
          <span class="kpi-label">Max Grade</span>
          <span class="kpi-val">{{ stats.maxGradePercent.toFixed(1) }}%</span>
        </div>
      </div>

      <div id="elevation-hover-readout" class="hover-readout">
        <template v-if="hoveredSample">
          <span class="readout-pill">
            {{ hoveredSample.distanceMiles.toFixed(2) }} mi
          </span>
          <span class="readout-elev">
            {{ Math.round(hoveredSample.elevationFeet).toLocaleString() }} ft
            ({{ Math.round(hoveredSample.elevationMeters).toLocaleString() }} m)
          </span>
          <span
            class="readout-grade"
            :class="{
              uphill: hoveredSample.gradePercent > 1.5,
              downhill: hoveredSample.gradePercent < -1.5,
            }"
          >
            {{ formatGrade(hoveredSample.gradePercent) }} slope
          </span>
        </template>
        <template v-else-if="stats && stats.samples.length > 0">
          <span class="readout-hint">Hover profile to scrub route marker</span>
        </template>
      </div>
    </div>

    <div class="elevation-body">
      <div v-if="loading" class="elevation-state">
        <span class="spinner" aria-hidden="true"></span>
        <span>Sampling 64 elevation points via Google Maps Elevation API…</span>
      </div>

      <div v-else-if="error" class="elevation-state error">
        <span>{{ error }}</span>
      </div>

      <div
        v-else-if="stats && stats.samples.length > 1"
        class="chart-container"
      >
        <svg
          id="elevation-profile-chart"
          ref="svgRef"
          class="elevation-svg"
          :viewBox="`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`"
          preserveAspectRatio="none"
          role="img"
          aria-label="Interactive route elevation and slope profile chart"
          @pointermove="handlePointerMove"
          @pointerleave="handlePointerLeave"
        >
          <defs>
            <linearGradient id="elevAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#0f766e" stop-opacity="0.34" />
              <stop offset="100%" stop-color="#0f766e" stop-opacity="0.03" />
            </linearGradient>
          </defs>

          <!-- Horizontal altitude reference lines -->
          <g v-for="tick in yTicks" :key="tick.label">
            <line
              :x1="PAD_LEFT"
              :y1="tick.y"
              :x2="SVG_WIDTH - PAD_RIGHT"
              :y2="tick.y"
              stroke="#e2e8f0"
              stroke-dasharray="3 3"
              stroke-width="1"
            />
            <text
              :x="PAD_LEFT - 6"
              :y="tick.y + 3"
              text-anchor="end"
              class="axis-label"
            >
              {{ tick.label }}
            </text>
          </g>

          <!-- Distance axis labels -->
          <g v-for="xt in xTicks" :key="xt.label">
            <text
              :x="xt.x"
              :y="SVG_HEIGHT - 5"
              text-anchor="middle"
              class="axis-label"
            >
              {{ xt.label }}
            </text>
          </g>

          <!-- Area fill and profile line -->
          <path :d="areaPath" fill="url(#elevAreaGrad)" />
          <path
            :d="linePath"
            fill="none"
            stroke="#0f766e"
            stroke-width="2.4"
            stroke-linejoin="round"
            stroke-linecap="round"
          />

          <!-- Synchronized hover crosshair -->
          <g v-if="activePointCoords">
            <line
              :x1="activePointCoords.x"
              :y1="PAD_TOP"
              :x2="activePointCoords.x"
              :y2="PAD_TOP + plotHeight"
              stroke="#0f172a"
              stroke-width="1.2"
              stroke-dasharray="3 2"
            />
            <circle
              :cx="activePointCoords.x"
              :cy="activePointCoords.y"
              r="5.5"
              fill="#f59e0b"
              stroke="#ffffff"
              stroke-width="2"
            />
          </g>
        </svg>
      </div>

      <div v-else class="elevation-state">
        <span>
          {{
            isActiveTrailMode
              ? 'Select a route to inspect its elevation profile.'
              : 'Elevation profiles run automatically for Cycling and Walking routes.'
          }}
        </span>
        <button
          v-if="!isActiveTrailMode"
          type="button"
          class="sample-btn"
          @click="emit('request-elevation')"
        >
          Sample Current Route Elevation
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.elevation-panel {
  height: 210px;
  min-height: 210px;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  padding: 10px 18px 10px;
  gap: 6px;
}

.elevation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.elevation-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.elevation-eyebrow {
  font-size: 12.5px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: 0.01em;
}

.elevation-route-tag {
  font-size: 11px;
  font-weight: 600;
  color: #0f766e;
  background: #f0fdfa;
  border: 1px solid #99f6e4;
  padding: 2px 8px;
  border-radius: 9999px;
}

.elevation-kpis {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.kpi-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  padding: 2px 9px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
}

.kpi-chip.gain {
  background: #ecfdf5;
  border-color: #a7f3d0;
}

.kpi-label {
  color: #64748b;
  font-weight: 600;
}

.kpi-val {
  color: #0f172a;
  font-weight: 700;
}

.kpi-sub {
  color: #047857;
  font-size: 11px;
}

.hover-readout {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  min-height: 24px;
}

.readout-pill {
  background: #0f172a;
  color: #ffffff;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 6px;
}

.readout-elev {
  font-weight: 700;
  color: #0f172a;
}

.readout-grade {
  font-weight: 600;
  color: #475569;
  padding: 2px 7px;
  border-radius: 6px;
  background: #f1f5f9;
}

.readout-grade.uphill {
  color: #b45309;
  background: #fef3c7;
}

.readout-grade.downhill {
  color: #0369a1;
  background: #e0f2fe;
}

.readout-hint {
  color: #64748b;
  font-size: 11.5px;
}

.elevation-body {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
}

.chart-container {
  width: 100%;
  height: 100%;
  cursor: crosshair;
}

.elevation-svg {
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
}

.axis-label {
  fill: #64748b;
  font-size: 9.5px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.elevation-state {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #64748b;
  font-size: 12.5px;
  background: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
}

.elevation-state.error {
  color: #dc2626;
  background: #fef2f2;
  border-color: #fecaca;
}

.sample-btn {
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid #0f766e;
  background: #0f766e;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.sample-btn:hover {
  background: #115e59;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #cbd5e1;
  border-top-color: #0f766e;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 900px) {
  .elevation-panel {
    height: auto;
    min-height: 190px;
  }
}
</style>
