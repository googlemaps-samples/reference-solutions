<script lang="ts">
  import type { ElevationSample, TrailMetrics } from '$lib/elevationUtils';

  interface Props {
    samples: ElevationSample[];
    metrics: TrailMetrics;
    loading: boolean;
    errorMessage: string | null;
    activeSampleIndex: number | null;
    onSelectSample: (sample: ElevationSample, index: number) => void;
  }

  let {
    samples,
    metrics,
    loading,
    errorMessage,
    activeSampleIndex,
    onSelectSample
  }: Props = $props();

  let hoverIndex = $state<number | null>(null);

  const SVG_W = 320;
  const SVG_H = 110;
  const PAD_X = 8;
  const PAD_Y = 12;

  let chartGeometry = $derived.by(() => {
    if (samples.length < 2) {
      return { linePath: '', areaPath: '', points: [] as Array<{ x: number; y: number }> };
    }

    const minElev = metrics.minElevationM;
    const maxElev = metrics.maxElevationM;
    const elevSpan = Math.max(10, maxElev - minElev);
    const totalDist = Math.max(0.01, metrics.totalDistanceKm);

    const points = samples.map((s) => {
      const x = PAD_X + (s.distanceKm / totalDist) * (SVG_W - PAD_X * 2);
      const normY = (s.elevation - minElev) / elevSpan;
      const y = SVG_H - PAD_Y - normY * (SVG_H - PAD_Y * 2);
      return { x, y };
    });

    const linePath = points
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
      .join(' ');

    const first = points[0];
    const last = points[points.length - 1];
    const areaPath = `${linePath} L ${last.x.toFixed(1)} ${SVG_H} L ${first.x.toFixed(1)} ${SVG_H} Z`;

    return { linePath, areaPath, points };
  });

  let focusedIndex = $derived(hoverIndex ?? activeSampleIndex);
  let focusedSample = $derived(
    focusedIndex !== null && samples[focusedIndex] ? samples[focusedIndex] : null
  );
  let focusedPoint = $derived(
    focusedIndex !== null && chartGeometry.points[focusedIndex]
      ? chartGeometry.points[focusedIndex]
      : null
  );

  function resolveSampleIndexFromPointer(event: MouseEvent): number | null {
    if (!samples.length) return null;
    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0) return null;
    const relX = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const idx = Math.round(relX * (samples.length - 1));
    return Math.min(samples.length - 1, Math.max(0, idx));
  }

  function handleMouseMove(event: MouseEvent) {
    hoverIndex = resolveSampleIndexFromPointer(event);
  }

  function handleClick(event: MouseEvent) {
    const idx = resolveSampleIndexFromPointer(event);
    if (idx !== null && samples[idx]) {
      onSelectSample(samples[idx], idx);
    }
  }
</script>

<section class="panel-card" data-testid="elevation-profile-panel">
  <div class="panel-header">
    <h2 class="panel-title">Elevation Profile</h2>
    {#if focusedSample}
      <span class="chapter-btn-meta">
        {Math.round(focusedSample.elevation)}m &bull; {focusedSample.distanceKm.toFixed(2)} km
      </span>
    {:else}
      <span class="chapter-btn-meta">Elevation API</span>
    {/if}
  </div>

  <div class="metrics-strip" data-testid="trail-metrics-summary">
    <div class="metric-box">
      <span class="metric-label">Dist</span>
      <span class="metric-val">{metrics.totalDistanceKm.toFixed(1)} km</span>
    </div>
    <div class="metric-box">
      <span class="metric-label">Peak</span>
      <span class="metric-val">{samples.length ? `${Math.round(metrics.maxElevationM)}m` : '--'}</span>
    </div>
    <div class="metric-box">
      <span class="metric-label">Gain</span>
      <span class="metric-val">{samples.length ? `+${Math.round(metrics.totalAscentM)}m` : '--'}</span>
    </div>
    <div class="metric-box">
      <span class="metric-label">Loss</span>
      <span class="metric-val">{samples.length ? `-${Math.round(metrics.totalDescentM)}m` : '--'}</span>
    </div>
  </div>

  <div class="elevation-chart-wrap" data-testid="elevation-profile-chart">
    {#if loading}
      <div
        style="height: 100%; display: grid; place-items: center; font-size: 0.75rem; color: #94a3b8;"
      >
        Sampling live terrain elevation...
      </div>
    {:else if samples.length >= 2}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <svg
        class="elevation-svg"
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        preserveAspectRatio="none"
        onmousemove={handleMouseMove}
        onmouseleave={() => (hoverIndex = null)}
        onclick={handleClick}
        aria-label="Interactive trail elevation profile chart"
      >
        <defs>
          <linearGradient id="tahoeElevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(239, 68, 68, 0.55)" />
            <stop offset="100%" stop-color="rgba(239, 68, 68, 0.04)" />
          </linearGradient>
        </defs>

        <line x1="0" y1={SVG_H * 0.33} x2={SVG_W} y2={SVG_H * 0.33} stroke="rgba(148,163,184,0.12)" />
        <line x1="0" y1={SVG_H * 0.66} x2={SVG_W} y2={SVG_H * 0.66} stroke="rgba(148,163,184,0.12)" />

        <path d={chartGeometry.areaPath} fill="url(#tahoeElevGrad)" />
        <path
          d={chartGeometry.linePath}
          fill="none"
          stroke="rgb(255, 0, 0)"
          stroke-width="2.2"
          stroke-linejoin="round"
        />

        {#if focusedPoint}
          <line
            x1={focusedPoint.x}
            y1="0"
            x2={focusedPoint.x}
            y2={SVG_H}
            stroke="rgba(56, 189, 248, 0.65)"
            stroke-dasharray="3 3"
          />
          <circle
            cx={focusedPoint.x}
            cy={focusedPoint.y}
            r="4.5"
            fill="#38bdf8"
            stroke="#0f172a"
            stroke-width="1.5"
          />
        {/if}
      </svg>
    {:else}
      <div
        style="height: 100%; display: grid; place-items: center; padding: 8px; text-align: center; font-size: 0.72rem; color: #94a3b8;"
      >
        {errorMessage || 'Add PUBLIC_GOOGLE_MAPS_API_KEY in .env to load live Elevation API samples.'}
      </div>
    {/if}
  </div>
</section>
