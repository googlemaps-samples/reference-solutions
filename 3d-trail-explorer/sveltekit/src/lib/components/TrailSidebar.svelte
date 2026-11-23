<script lang="ts">
  import type { ActiveViewpoint, TourChapter } from '$lib/trailData';
  import type { ElevationSample, TrailMetrics } from '$lib/elevationUtils';
  import ElevationProfileChart from './ElevationProfileChart.svelte';

  interface Props {
    chapters: TourChapter[];
    activeChapterId: string;
    isAutoPlaying: boolean;
    activeViewpoint: ActiveViewpoint;
    elevationSamples: ElevationSample[];
    trailMetrics: TrailMetrics;
    elevationLoading: boolean;
    elevationError: string | null;
    activeSampleIndex: number | null;
    onSelectChapter: (chapter: TourChapter) => void;
    onToggleAutoPlay: () => void;
    onSelectElevationSample: (sample: ElevationSample, index: number) => void;
  }

  let {
    chapters,
    activeChapterId,
    isAutoPlaying,
    activeViewpoint,
    elevationSamples,
    trailMetrics,
    elevationLoading,
    elevationError,
    activeSampleIndex,
    onSelectChapter,
    onToggleAutoPlay,
    onSelectElevationSample
  }: Props = $props();

  let mobileCollapsed = $state(false);
</script>

<aside class="explorer-sidebar" class:collapsed={mobileCollapsed}>
  <button
    type="button"
    class="mobile-drawer-toggle"
    onclick={() => (mobileCollapsed = !mobileCollapsed)}
  >
    {mobileCollapsed ? 'Expand Trail Controls & Elevation' : 'Collapse Panel'}
  </button>

  <section class="panel-card" data-testid="chapter-tour-panel">
    <div class="panel-header">
      <h2 class="panel-title">Guided 3D Camera Tour</h2>
      <button
        type="button"
        class="autoplay-btn"
        class:active={isAutoPlaying}
        data-testid="tour-autoplay-toggle"
        onclick={onToggleAutoPlay}
      >
        <span>{isAutoPlaying ? 'Pause Tour' : 'Auto-Play'}</span>
      </button>
    </div>

    <div class="chapter-list">
      {#each chapters as chapter (chapter.id)}
        <button
          type="button"
          class="chapter-btn"
          class:active={activeChapterId === chapter.id}
          data-testid={chapter.testId}
          onclick={() => onSelectChapter(chapter)}
        >
          <span class="chapter-btn-title">{chapter.title}</span>
          <span class="chapter-btn-meta">
            {chapter.camera.tilt}&deg; / {chapter.camera.range}m
          </span>
        </button>
      {/each}
    </div>
  </section>

  <section class="panel-card" data-testid="selected-viewpoint-card">
    <div class="viewpoint-card-header">
      <h3 class="viewpoint-name">{activeViewpoint.name}</h3>
      <span class="viewpoint-badge">
        {activeViewpoint.source === 'place' ? 'Places API' : 'Trail Chapter'}
      </span>
    </div>

    <p class="viewpoint-desc">{activeViewpoint.description}</p>

    {#if activeViewpoint.formattedAddress}
      <p class="viewpoint-desc" style="color: #94a3b8; font-size: 0.72rem;">
        {activeViewpoint.formattedAddress}
      </p>
    {/if}

    <div class="viewpoint-stats">
      <div class="stat-pill">
        <span class="stat-pill-label">Elevation</span>
        <span class="stat-pill-value">
          {activeViewpoint.elevationMeters != null
            ? `${Math.round(activeViewpoint.elevationMeters)} m ASL`
            : 'Sampling...'}
        </span>
      </div>
      <div class="stat-pill">
        <span class="stat-pill-label">Coordinates</span>
        <span class="stat-pill-value">
          {activeViewpoint.location.lat.toFixed(4)}, {activeViewpoint.location.lng.toFixed(4)}
        </span>
      </div>
      {#if activeViewpoint.rating != null}
        <div class="stat-pill">
          <span class="stat-pill-label">Google Rating</span>
          <span class="stat-pill-value">
            {activeViewpoint.rating.toFixed(1)} &#9733; ({activeViewpoint.userRatingCount ?? 0})
          </span>
        </div>
      {/if}
    </div>

    {#if activeViewpoint.googleMapsUri}
      <a
        href={activeViewpoint.googleMapsUri}
        target="_blank"
        rel="noopener noreferrer"
        class="maps-external-link"
      >
        Open in Google Maps &nearr;
      </a>
    {/if}
  </section>

  <ElevationProfileChart
    samples={elevationSamples}
    metrics={trailMetrics}
    loading={elevationLoading}
    errorMessage={elevationError}
    {activeSampleIndex}
    onSelectSample={onSelectElevationSample}
  />
</aside>
