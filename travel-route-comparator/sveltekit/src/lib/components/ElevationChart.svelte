<script lang="ts">
	import type { ElevationProfileSummary, ElevationSamplePoint } from '$lib/types';

	interface Props {
		profile: ElevationProfileSummary | null;
		loading: boolean;
		error: string | null;
		accentColor?: string;
		onHover?: (sample: ElevationSamplePoint | null) => void;
	}

	let {
		profile,
		loading,
		error,
		accentColor = '#059669',
		onHover
	}: Props = $props();

	let hoveredSample = $state<ElevationSamplePoint | null>(null);

	const SVG_WIDTH = 760;
	const SVG_HEIGHT = 128;
	const PAD_LEFT = 46;
	const PAD_RIGHT = 14;
	const PAD_TOP = 12;
	const PAD_BOTTOM = 22;

	const plotWidth = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;
	const plotHeight = SVG_HEIGHT - PAD_TOP - PAD_BOTTOM;

	const chartGeometry = $derived.by(() => {
		if (!profile || profile.samples.length < 2) return null;
		const samples = profile.samples;
		const minElev = profile.minElevationMeters;
		const maxElev = profile.maxElevationMeters;
		const span = Math.max(10, maxElev - minElev);
		const paddedMin = minElev - span * 0.08;
		const paddedMax = maxElev + span * 0.08;
		const paddedSpan = Math.max(10, paddedMax - paddedMin);
		const maxDist = Math.max(1, profile.totalDistanceMeters);

		const coords = samples.map((sample) => {
			const x = PAD_LEFT + (sample.distanceMeters / maxDist) * plotWidth;
			const y = PAD_TOP + (1 - (sample.elevationMeters - paddedMin) / paddedSpan) * plotHeight;
			return { x, y, sample };
		});

		const linePath = coords
			.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
			.join(' ');

		const baselineY = PAD_TOP + plotHeight;
		const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${baselineY.toFixed(1)} L ${coords[0].x.toFixed(1)} ${baselineY.toFixed(1)} Z`;

		const ticks = [0, 0.5, 1].map((t) => {
			const elevMeters = paddedMin + (1 - t) * paddedSpan;
			const y = PAD_TOP + t * plotHeight;
			return {
				y,
				label: `${Math.round(elevMeters)}m`
			};
		});

		return {
			coords,
			linePath,
			areaPath,
			ticks,
			maxDist
		};
	});

	function formatFeet(meters: number): string {
		return `${Math.round(meters * 3.28084).toLocaleString()} ft`;
	}

	function handlePointerMove(event: PointerEvent) {
		if (!chartGeometry || !profile) return;
		const svg = event.currentTarget as SVGSVGElement;
		const rect = svg.getBoundingClientRect();
		if (rect.width <= 0) return;

		const relX = ((event.clientX - rect.left) / rect.width) * SVG_WIDTH;
		const clampedX = Math.max(PAD_LEFT, Math.min(SVG_WIDTH - PAD_RIGHT, relX));
		const ratio = (clampedX - PAD_LEFT) / plotWidth;
		const targetDist = ratio * chartGeometry.maxDist;

		let closest = chartGeometry.coords[0];
		let bestDiff = Math.abs(closest.sample.distanceMeters - targetDist);
		for (const pt of chartGeometry.coords) {
			const diff = Math.abs(pt.sample.distanceMeters - targetDist);
			if (diff < bestDiff) {
				bestDiff = diff;
				closest = pt;
			}
		}

		hoveredSample = closest.sample;
		onHover?.(closest.sample);
	}

	function handlePointerLeave() {
		hoveredSample = null;
		onHover?.(null);
	}

	const hoveredCoord = $derived.by(() => {
		if (!hoveredSample || !chartGeometry) return null;
		return chartGeometry.coords[hoveredSample.index] ?? null;
	});
</script>

<div class="chart-root">
	{#if loading}
		<div class="elevation-empty">
			<span>Sampling 64 elevation points along active route via Elevation API…</span>
		</div>
	{:else if error}
		<div class="error-message">{error}</div>
	{:else if chartGeometry && profile}
		<svg
			id="elevation-profile-chart"
			data-testid="elevation-profile-chart"
			viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
			preserveAspectRatio="none"
			role="img"
			aria-label="Route elevation and slope profile chart"
			onpointermove={handlePointerMove}
			onpointerleave={handlePointerLeave}
		>
			<defs>
				<linearGradient id="elevFillGrad" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stop-color={accentColor} stop-opacity="0.34" />
					<stop offset="100%" stop-color={accentColor} stop-opacity="0.03" />
				</linearGradient>
			</defs>

			{#each chartGeometry.ticks as tick}
				<line
					x1={PAD_LEFT}
					y1={tick.y}
					x2={SVG_WIDTH - PAD_RIGHT}
					y2={tick.y}
					stroke="#e2e8f0"
					stroke-dasharray="3 3"
					stroke-width="1"
				/>
				<text
					x={PAD_LEFT - 6}
					y={tick.y + 3}
					text-anchor="end"
					font-size="10"
					fill="#64748b"
					font-family="JetBrains Mono, monospace"
				>
					{tick.label}
				</text>
			{/each}

			<path d={chartGeometry.areaPath} fill="url(#elevFillGrad)" />
			<path
				d={chartGeometry.linePath}
				fill="none"
				stroke={accentColor}
				stroke-width="2.5"
				stroke-linejoin="round"
				stroke-linecap="round"
			/>

			<text
				x={PAD_LEFT}
				y={SVG_HEIGHT - 5}
				font-size="10"
				fill="#64748b"
				font-family="JetBrains Mono, monospace"
			>
				0 mi
			</text>
			<text
				x={PAD_LEFT + plotWidth / 2}
				y={SVG_HEIGHT - 5}
				text-anchor="middle"
				font-size="10"
				fill="#64748b"
				font-family="JetBrains Mono, monospace"
			>
				{((profile.totalDistanceMeters / 1609.344) * 0.5).toFixed(1)} mi
			</text>
			<text
				x={SVG_WIDTH - PAD_RIGHT}
				y={SVG_HEIGHT - 5}
				text-anchor="end"
				font-size="10"
				fill="#64748b"
				font-family="JetBrains Mono, monospace"
			>
				{(profile.totalDistanceMeters / 1609.344).toFixed(1)} mi
			</text>

			{#if hoveredCoord}
				<line
					x1={hoveredCoord.x}
					y1={PAD_TOP}
					x2={hoveredCoord.x}
					y2={PAD_TOP + plotHeight}
					stroke="#0f172a"
					stroke-width="1.2"
					stroke-dasharray="3 2"
				/>
				<circle
					cx={hoveredCoord.x}
					cy={hoveredCoord.y}
					r="5"
					fill="#0ea5e9"
					stroke="#ffffff"
					stroke-width="2"
				/>
			{/if}
		</svg>

		<div id="elevation-hover-readout" class="hover-bar" data-testid="elevation-hover-readout">
			{#if hoveredSample}
				<span>
					<strong>{(hoveredSample.distanceMeters / 1609.344).toFixed(2)} mi</strong>
					({(hoveredSample.distanceMeters / 1000).toFixed(2)} km)
				</span>
				<span>
					Elev: <strong>{Math.round(hoveredSample.elevationMeters)} m</strong>
					({formatFeet(hoveredSample.elevationMeters)})
				</span>
				<span>
					Grade:
					<strong class={hoveredSample.slopePercent >= 0 ? 'grade-up' : 'grade-down'}>
						{hoveredSample.slopePercent >= 0 ? '+' : ''}{hoveredSample.slopePercent.toFixed(1)}%
					</strong>
				</span>
			{:else}
				<span class="hint">Hover along the elevation chart to inspect grade % and scrub the map marker.</span>
			{/if}
		</div>
	{:else}
		<div class="elevation-empty">
			<span>Select a route to inspect its elevation and slope profile.</span>
		</div>
	{/if}
</div>

<style>
	.chart-root {
		display: flex;
		flex-direction: column;
		height: 100%;
		gap: 4px;
	}

	svg {
		width: 100%;
		height: 112px;
		display: block;
		cursor: crosshair;
		user-select: none;
		touch-action: none;
	}

	.hover-bar {
		display: flex;
		align-items: center;
		gap: 14px;
		font-size: 11px;
		color: #334155;
		min-height: 20px;
	}

	.hover-bar strong {
		font-family: 'JetBrains Mono', monospace;
		color: #0f172a;
	}

	.grade-up {
		color: #b45309 !important;
	}

	.grade-down {
		color: #047857 !important;
	}

	.hint {
		color: #64748b;
	}
</style>
