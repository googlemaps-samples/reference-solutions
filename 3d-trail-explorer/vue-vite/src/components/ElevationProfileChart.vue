<script setup lang="ts">
import { computed } from 'vue';
import type { ElevationSamplePoint, TrailMetrics } from '../types/explorer';

const props = defineProps<{
  samples: ElevationSamplePoint[];
  metrics: TrailMetrics | null;
  loading: boolean;
  error: string | null;
  activeSampleIndex: number | null;
}>();

const emit = defineEmits<{
  (e: 'hover-sample', index: number | null): void;
  (e: 'select-sample', sample: ElevationSamplePoint): void;
}>();

const SVG_WIDTH = 320;
const SVG_HEIGHT = 112;
const PAD_LEFT = 34;
const PAD_RIGHT = 10;
const PAD_TOP = 10;
const PAD_BOTTOM = 20;

const plotWidth = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;
const plotHeight = SVG_HEIGHT - PAD_TOP - PAD_BOTTOM;

const minElev = computed(() => {
  if (!props.samples.length) return 1850;
  const rawMin = Math.min(...props.samples.map((s) => s.elevationMeters));
  return Math.floor((rawMin - 15) / 10) * 10;
});

const maxElev = computed(() => {
  if (!props.samples.length) return 2100;
  const rawMax = Math.max(...props.samples.map((s) => s.elevationMeters));
  return Math.ceil((rawMax + 15) / 10) * 10;
});

const chartPoints = computed(() => {
  const list = props.samples;
  if (!list.length) return [];
  const totalDist = list[list.length - 1].distanceKm || 1;
  const span = Math.max(1, maxElev.value - minElev.value);

  return list.map((sample) => {
    const x = PAD_LEFT + (sample.distanceKm / totalDist) * plotWidth;
    const y = PAD_TOP + (1 - (sample.elevationMeters - minElev.value) / span) * plotHeight;
    return { x, y, sample };
  });
});

const linePath = computed(() => {
  if (!chartPoints.value.length) return '';
  return chartPoints.value
    .map((pt, idx) => `${idx === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
    .join(' ');
});

const areaPath = computed(() => {
  const pts = chartPoints.value;
  if (!pts.length) return '';
  const baselineY = PAD_TOP + plotHeight;
  return `${linePath.value} L${pts[pts.length - 1].x.toFixed(1)},${baselineY} L${pts[0].x.toFixed(1)},${baselineY} Z`;
});

const activePoint = computed(() => {
  if (props.activeSampleIndex === null) return null;
  return chartPoints.value[props.activeSampleIndex] ?? null;
});

function handleSvgPointerMove(event: MouseEvent): void {
  const pts = chartPoints.value;
  if (!pts.length) return;
  const svg = event.currentTarget as SVGSVGElement;
  const rect = svg.getBoundingClientRect();
  if (!rect.width) return;

  const svgX = ((event.clientX - rect.left) / rect.width) * SVG_WIDTH;
  let nearestIdx = 0;
  let minDiff = Infinity;

  for (let i = 0; i < pts.length; i += 1) {
    const diff = Math.abs(pts[i].x - svgX);
    if (diff < minDiff) {
      minDiff = diff;
      nearestIdx = i;
    }
  }
  emit('hover-sample', nearestIdx);
}

function handleSvgClick(): void {
  if (activePoint.value) {
    emit('select-sample', activePoint.value.sample);
  }
}
</script>

<template>
  <section class="panel-card" data-testid="elevation-profile-panel" aria-label="Trail Elevation Profile">
    <div class="panel-header">
      <div>
        <span class="eyebrow">Elevation API Profile</span>
        <h2 class="panel-title">Trail Terrain &amp; Metrics</h2>
      </div>
      <span v-if="activePoint" class="probe-badge">
        {{ Math.round(activePoint.sample.elevationMeters) }} m @ {{ activePoint.sample.distanceKm.toFixed(2) }} km
      </span>
    </div>

    <div class="metrics-grid" data-testid="trail-metrics-summary">
      <div class="metric-cell">
        <span class="metric-label">Distance</span>
        <span class="metric-value">
          {{ metrics ? `${metrics.totalDistanceKm.toFixed(2)} km` : '—' }}
        </span>
      </div>
      <div class="metric-cell">
        <span class="metric-label">Min / Max</span>
        <span class="metric-value">
          {{
            metrics
              ? `${Math.round(metrics.minElevationMeters)}–${Math.round(metrics.maxElevationMeters)} m`
              : '—'
          }}
        </span>
      </div>
      <div class="metric-cell">
        <span class="metric-label">Ascent</span>
        <span class="metric-value ascent">
          {{ metrics ? `+${Math.round(metrics.totalAscentMeters)} m` : '—' }}
        </span>
      </div>
      <div class="metric-cell">
        <span class="metric-label">Descent</span>
        <span class="metric-value descent">
          {{ metrics ? `-${Math.round(metrics.totalDescentMeters)} m` : '—' }}
        </span>
      </div>
    </div>

    <div class="chart-wrap">
      <svg
        data-testid="elevation-profile-chart"
        :viewBox="`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`"
        class="elev-svg"
        role="img"
        aria-label="Interactive elevation profile along the Lake Tahoe trail. Click any point to focus the 3D camera."
        @mousemove="handleSvgPointerMove"
        @mouseleave="emit('hover-sample', null)"
        @click="handleSvgClick"
      >
        <defs>
          <linearGradient id="tahoeElevFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgb(255, 0, 0)" stop-opacity="0.45" />
            <stop offset="100%" stop-color="rgb(255, 0, 0)" stop-opacity="0.03" />
          </linearGradient>
        </defs>

        <!-- Grid lines -->
        <line
          :x1="PAD_LEFT"
          :y1="PAD_TOP"
          :x2="SVG_WIDTH - PAD_RIGHT"
          :y2="PAD_TOP"
          class="grid-line"
        />
        <line
          :x1="PAD_LEFT"
          :y1="PAD_TOP + plotHeight / 2"
          :x2="SVG_WIDTH - PAD_RIGHT"
          :y2="PAD_TOP + plotHeight / 2"
          class="grid-line"
        />
        <line
          :x1="PAD_LEFT"
          :y1="PAD_TOP + plotHeight"
          :x2="SVG_WIDTH - PAD_RIGHT"
          :y2="PAD_TOP + plotHeight"
          class="grid-line"
        />

        <!-- Y-Axis Labels -->
        <text :x="PAD_LEFT - 5" :y="PAD_TOP + 4" class="axis-label" text-anchor="end">
          {{ maxElev }}m
        </text>
        <text :x="PAD_LEFT - 5" :y="PAD_TOP + plotHeight + 3" class="axis-label" text-anchor="end">
          {{ minElev }}m
        </text>

        <!-- X-Axis Labels -->
        <text :x="PAD_LEFT" :y="SVG_HEIGHT - 4" class="axis-label" text-anchor="start">
          0 km
        </text>
        <text :x="SVG_WIDTH - PAD_RIGHT" :y="SVG_HEIGHT - 4" class="axis-label" text-anchor="end">
          {{ metrics ? `${metrics.totalDistanceKm.toFixed(1)} km` : 'Trail' }}
        </text>

        <template v-if="chartPoints.length">
          <path :d="areaPath" fill="url(#tahoeElevFill)" />
          <path :d="linePath" fill="none" stroke="rgb(255, 0, 0)" stroke-width="2.2" stroke-linejoin="round" />

          <g v-if="activePoint">
            <line
              :x1="activePoint.x"
              :y1="PAD_TOP"
              :x2="activePoint.x"
              :y2="PAD_TOP + plotHeight"
              class="scrub-line"
            />
            <circle
              :cx="activePoint.x"
              :cy="activePoint.y"
              r="4.5"
              fill="#ffffff"
              stroke="rgb(255, 0, 0)"
              stroke-width="2.5"
            />
          </g>
        </template>

        <text
          v-else
          :x="SVG_WIDTH / 2"
          :y="SVG_HEIGHT / 2"
          text-anchor="middle"
          class="empty-label"
        >
          {{ loading ? 'Sampling Elevation API…' : (error ?? 'Awaiting Elevation API data') }}
        </text>
      </svg>
    </div>
    <p class="chart-hint">Hover to inspect elevation · Click chart to fly 3D camera</p>
  </section>
</template>

<style scoped>
.panel-card {
  background: rgba(15, 23, 42, 0.86);
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 14px;
  padding: 12px 14px;
  backdrop-filter: blur(16px);
  box-shadow: 0 12px 28px rgba(2, 6, 23, 0.45);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.eyebrow {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #f87171;
}

.panel-title {
  margin: 2px 0 0;
  font-size: 14px;
  font-weight: 700;
  color: #f8fafc;
}

.probe-badge {
  font-size: 10.5px;
  font-weight: 700;
  color: #fecaca;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.45);
  padding: 2px 7px;
  border-radius: 999px;
  font-variant-numeric: tabular-nums;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  margin-bottom: 8px;
}

.metric-cell {
  background: rgba(30, 41, 59, 0.65);
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 8px;
  padding: 5px 6px;
}

.metric-label {
  display: block;
  font-size: 9.5px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.metric-value {
  display: block;
  font-size: 11.5px;
  font-weight: 700;
  color: #f8fafc;
  font-variant-numeric: tabular-nums;
  margin-top: 1px;
}

.metric-value.ascent {
  color: #4ade80;
}

.metric-value.descent {
  color: #38bdf8;
}

.chart-wrap {
  background: rgba(2, 6, 23, 0.55);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 10px;
  padding: 4px;
}

.elev-svg {
  display: block;
  width: 100%;
  height: auto;
  cursor: crosshair;
}

.grid-line {
  stroke: rgba(148, 163, 184, 0.16);
  stroke-dasharray: 3 3;
  stroke-width: 1;
}

.axis-label {
  fill: #94a3b8;
  font-size: 8.5px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.scrub-line {
  stroke: rgba(248, 250, 252, 0.55);
  stroke-width: 1;
  stroke-dasharray: 2 2;
}

.empty-label {
  fill: #94a3b8;
  font-size: 10px;
}

.chart-hint {
  margin: 6px 0 0;
  font-size: 10px;
  color: #94a3b8;
  text-align: center;
}
</style>
