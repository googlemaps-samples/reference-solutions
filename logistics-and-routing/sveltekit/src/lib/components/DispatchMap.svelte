<script lang="ts">
	import { untrack } from 'svelte';
	import type {
		DispatchRouteResult,
		FleetVehicle,
		LogisticsHub,
		SnapAnalysis
	} from '$lib/types/logistics';
	import type { LoadedGmpLibraries } from '$lib/maps/loader';
	import { GMP_ATTRIBUTION_ID } from '$lib/maps/loader';
	import { DALLAS_CENTER } from '$lib/data/dallasFleet';

	interface Props {
		libs: LoadedGmpLibraries | null;
		apiKeyConfigured: boolean;
		mapError: string | null;
		vehicles: FleetVehicle[];
		selectedVehicle: FleetVehicle | null;
		snapAnalysis: SnapAnalysis | null;
		showRoadSnapped: boolean;
		depot: LogisticsHub;
		hubs: LogisticsHub[];
		selectedHubIds: string[];
		dispatchResult: DispatchRouteResult | null;
		trafficEnabled: boolean;
		onSelectVehicle: (vehicleId: string) => void;
	}

	let {
		libs,
		apiKeyConfigured,
		mapError,
		vehicles,
		selectedVehicle,
		snapAnalysis,
		showRoadSnapped,
		depot,
		hubs,
		selectedHubIds,
		dispatchResult,
		trafficEnabled,
		onSelectVehicle
	}: Props = $props();

	let mapElement: HTMLDivElement | undefined = $state();
	let mapInstance: google.maps.Map | null = $state(null);
	let infoWindow: google.maps.InfoWindow | null = null;
	let trafficLayer: google.maps.TrafficLayer | null = null;

	let vehicleMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
	let hubMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
	let rawPolyline: google.maps.Polyline | null = null;
	let snappedPolyline: google.maps.Polyline | null = null;
	let dispatchPolyline: google.maps.Polyline | null = null;

	function buildVehicleBadgeElement(vehicle: FleetVehicle, isSelected: boolean): HTMLElement {
		const wrapper = document.createElement('div');
		wrapper.className = `fleet-pin fleet-pin-${vehicle.status}${isSelected ? ' selected' : ''}`;
		wrapper.style.display = 'inline-flex';
		wrapper.style.alignItems = 'center';
		wrapper.style.gap = '6px';
		wrapper.style.padding = '4px 8px';
		wrapper.style.borderRadius = '999px';
		wrapper.style.fontFamily = 'Inter, sans-serif';
		wrapper.style.fontSize = '11px';
		wrapper.style.fontWeight = '700';
		wrapper.style.color = '#ffffff';
		wrapper.style.boxShadow = isSelected
			? '0 0 0 3px rgba(37, 99, 235, 0.45), 0 4px 10px rgba(0,0,0,0.28)'
			: '0 2px 6px rgba(0,0,0,0.25)';
		wrapper.style.border = '2px solid #ffffff';
		wrapper.style.cursor = 'pointer';

		if (vehicle.status === 'en-route') {
			wrapper.style.background = '#059669';
		} else if (vehicle.status === 'delayed') {
			wrapper.style.background = '#d97706';
		} else {
			wrapper.style.background = '#475569';
		}

		const idText = document.createElement('span');
		idText.textContent = vehicle.id;
		const speedText = document.createElement('span');
		speedText.textContent = `${vehicle.speedMph}mph`;
		speedText.style.opacity = '0.9';
		speedText.style.fontWeight = '500';

		wrapper.appendChild(idText);
		wrapper.appendChild(speedText);
		return wrapper;
	}

	function buildVehicleInfoContent(vehicle: FleetVehicle): HTMLElement {
		const card = document.createElement('div');
		card.style.fontFamily = 'Inter, sans-serif';
		card.style.minWidth = '200px';
		card.style.padding = '2px 4px';

		const title = document.createElement('div');
		title.textContent = vehicle.callsign;
		title.style.fontWeight = '700';
		title.style.fontSize = '13px';
		title.style.marginBottom = '4px';
		title.style.color = '#0f172a';

		const meta = document.createElement('div');
		meta.textContent = `${vehicle.driver} · ${vehicle.vehicleType}`;
		meta.style.fontSize = '12px';
		meta.style.color = '#475569';
		meta.style.marginBottom = '6px';

		const telemetry = document.createElement('div');
		telemetry.textContent = `Speed: ${vehicle.speedMph} mph · Next: ${vehicle.nextStop}`;
		telemetry.style.fontSize = '12px';
		telemetry.style.color = '#0f172a';
		telemetry.style.marginBottom = '2px';

		const eta = document.createElement('div');
		eta.textContent = `ETA: ${vehicle.etaLabel} (${vehicle.corridor})`;
		eta.style.fontSize = '12px';
		eta.style.fontWeight = '600';
		eta.style.color = vehicle.status === 'delayed' ? '#b45309' : '#047857';

		card.appendChild(title);
		card.appendChild(meta);
		card.appendChild(telemetry);
		card.appendChild(eta);
		return card;
	}

	// Initialize Google Map once libs & container are ready
	$effect(() => {
		if (!libs || !mapElement) return;
		if (untrack(() => mapInstance)) return;

		const map = new libs.maps.Map(mapElement, {
			center: DALLAS_CENTER,
			zoom: 12,
			mapId: 'DEMO_MAP_ID',
			clickableIcons: false,
			mapTypeControl: false,
			streetViewControl: false,
			fullscreenControl: true,
			internalUsageAttributionIds: [GMP_ATTRIBUTION_ID]
		});

		infoWindow = new libs.maps.InfoWindow();
		trafficLayer = new libs.maps.TrafficLayer();
		mapInstance = map;

		return () => {
			trafficLayer?.setMap(null);
			infoWindow?.close();
			mapInstance = null;
		};
	});

	// Sync TrafficLayer
	$effect(() => {
		if (!trafficLayer || !mapInstance) return;
		trafficLayer.setMap(trafficEnabled ? mapInstance : null);
	});

	// Sync fleet vehicle AdvancedMarkerElements
	$effect(() => {
		if (!libs || !mapInstance) return;
		const { AdvancedMarkerElement } = libs.marker;

		for (const marker of vehicleMarkers) {
			marker.map = null;
		}
		vehicleMarkers = [];

		for (const vehicle of vehicles) {
			const isSelected = selectedVehicle?.id === vehicle.id;
			const marker = new AdvancedMarkerElement({
				map: mapInstance,
				position: vehicle.position,
				title: `${vehicle.id} (${vehicle.status})`,
				zIndex: isSelected ? 50 : 20
			});
			marker.append(buildVehicleBadgeElement(vehicle, isSelected));
			marker.addListener('click', () => {
				onSelectVehicle(vehicle.id);
				if (infoWindow && mapInstance) {
					infoWindow.setContent(buildVehicleInfoContent(vehicle));
					infoWindow.open({ anchor: marker, map: mapInstance });
				}
			});
			vehicleMarkers.push(marker);
		}
	});

	// Sync depot and Dallas hub AdvancedMarkerElements
	$effect(() => {
		if (!libs || !mapInstance) return;
		const { AdvancedMarkerElement, PinElement } = libs.marker;

		for (const marker of hubMarkers) {
			marker.map = null;
		}
		hubMarkers = [];

		const depotPin = new PinElement({
			background: '#312e81',
			borderColor: '#ffffff',
			glyphColor: '#ffffff',
			glyphText: 'D',
			scale: 1.15
		});
		const depotMarker = new AdvancedMarkerElement({
			map: mapInstance,
			position: depot.location,
			title: depot.name,
			zIndex: 40
		});
		depotMarker.append(depotPin);
		depotMarker.addListener('click', () => {
			if (!infoWindow || !mapInstance) return;
			const el = document.createElement('div');
			const title = document.createElement('strong');
			title.textContent = depot.name;
			const addr = document.createElement('div');
			addr.textContent = depot.address;
			addr.style.fontSize = '12px';
			addr.style.color = '#475569';
			el.appendChild(title);
			el.appendChild(addr);
			infoWindow.setContent(el);
			infoWindow.open({ anchor: depotMarker, map: mapInstance });
		});
		hubMarkers.push(depotMarker);

		hubs.forEach((hub, index) => {
			const isSelected = selectedHubIds.includes(hub.id);
			const orderIdx = dispatchResult?.orderedHubs.findIndex((h) => h.id === hub.id) ?? -1;
			const label = orderIdx >= 0 ? String(orderIdx + 1) : String(index + 1);

			const pin = new PinElement({
				background: isSelected ? '#4f46e5' : '#94a3b8',
				borderColor: '#ffffff',
				glyphColor: '#ffffff',
				glyphText: label,
				scale: isSelected ? 1.05 : 0.9
			});
			const marker = new AdvancedMarkerElement({
				map: mapInstance,
				position: hub.location,
				title: hub.name,
				zIndex: isSelected ? 35 : 15
			});
			marker.append(pin);
			marker.addListener('click', () => {
				if (!infoWindow || !mapInstance) return;
				const el = document.createElement('div');
				const title = document.createElement('strong');
				title.textContent = hub.name;
				const addr = document.createElement('div');
				addr.textContent = hub.address;
				addr.style.fontSize = '12px';
				addr.style.color = '#475569';
				el.appendChild(title);
				el.appendChild(addr);
				infoWindow.setContent(el);
				infoWindow.open({ anchor: marker, map: mapInstance });
			});
			hubMarkers.push(marker);
		});
	});

	// Sync Raw GPS vs Road-Snapped Polylines
	$effect(() => {
		if (!libs || !mapInstance) return;

		rawPolyline?.setMap(null);
		snappedPolyline?.setMap(null);
		rawPolyline = null;
		snappedPolyline = null;

		if (!selectedVehicle) return;

		rawPolyline = new libs.maps.Polyline({
			map: mapInstance,
			path: selectedVehicle.rawGpsTrace,
			strokeColor: '#ef4444',
			strokeOpacity: 0,
			strokeWeight: 3,
			zIndex: 30,
			icons: [
				{
					icon: {
						path: 'M 0,-1 0,1',
						strokeOpacity: 0.95,
						strokeColor: '#ef4444',
						scale: 3
					},
					offset: '0',
					repeat: '12px'
				}
			]
		});

		if (showRoadSnapped && snapAnalysis && snapAnalysis.snappedPoints.length > 0) {
			snappedPolyline = new libs.maps.Polyline({
				map: mapInstance,
				path: snapAnalysis.snappedPoints.map((p) => p.location),
				strokeColor: '#0284c7',
				strokeOpacity: 0.92,
				strokeWeight: 5,
				zIndex: 35
			});
		}
	});

	// Sync Multi-Stop Dispatch Route Polyline & fit bounds
	$effect(() => {
		if (!libs || !mapInstance) return;

		dispatchPolyline?.setMap(null);
		dispatchPolyline = null;

		if (!dispatchResult || dispatchResult.path.length === 0) return;

		dispatchPolyline = new libs.maps.Polyline({
			map: mapInstance,
			path: dispatchResult.path,
			strokeColor: '#4f46e5',
			strokeOpacity: 0.88,
			strokeWeight: 5,
			zIndex: 25
		});

		const bounds = new libs.core.LatLngBounds();
		for (const pt of dispatchResult.path) {
			bounds.extend(pt);
		}
		mapInstance.fitBounds(bounds, 48);
	});
</script>

<main class="map-stage">
	<div bind:this={mapElement} data-testid="map-container" class="map-canvas"></div>

	{#if !apiKeyConfigured}
		<div class="setup-overlay">
			<div class="setup-card">
				<h3>Google Maps API Key Required</h3>
				<p>
					Set <code>PUBLIC_GOOGLE_MAPS_API_KEY</code> in your <code>.env</code> file to activate the
					live Dallas logistics map, Roads API snapping, and Routes API dispatch matrix.
				</p>
				<a
					href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
					target="_blank"
					rel="noopener noreferrer"
				>
					Get a Free Maps Demo Key &rarr;
				</a>
			</div>
		</div>
	{:else if mapError}
		<div class="setup-overlay">
			<div class="setup-card">
				<h3>Map Initialization Notice</h3>
				<p>{mapError}</p>
			</div>
		</div>
	{/if}

	<div class="map-legend" aria-label="Map symbology legend">
		<div class="legend-item">
			<span class="swatch en-route"></span> En Route
		</div>
		<div class="legend-item">
			<span class="swatch delayed"></span> Delayed
		</div>
		<div class="legend-item">
			<span class="swatch idle"></span> Idle
		</div>
		<div class="legend-item">
			<span class="line raw"></span> Raw GPS
		</div>
		<div class="legend-item">
			<span class="line snapped"></span> Road-Snapped
		</div>
		<div class="legend-item">
			<span class="line corridor"></span> Dispatch Corridor
		</div>
	</div>
</main>

<style>
	.map-stage {
		position: relative;
		flex: 1;
		min-width: 0;
		min-height: 520px;
		height: calc(100vh - 56px);
		background: #e2e8f0;
	}

	.map-canvas {
		width: 100%;
		height: 100%;
		min-height: 520px;
	}

	.setup-overlay {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		background: rgba(15, 23, 42, 0.55);
		backdrop-filter: blur(4px);
		padding: 20px;
		z-index: 15;
	}

	.setup-card {
		max-width: 440px;
		background: #ffffff;
		border-radius: 14px;
		padding: 22px;
		box-shadow: var(--shadow-md);
		border: 1px solid var(--border-subtle);
	}

	.setup-card h3 {
		margin: 0 0 8px;
		font-size: 1rem;
		color: var(--text-primary);
	}

	.setup-card p {
		margin: 0 0 14px;
		font-size: 0.85rem;
		line-height: 1.5;
		color: var(--text-secondary);
	}

	.setup-card code {
		font-family: var(--font-mono);
		background: var(--bg-surface-muted);
		padding: 2px 5px;
		border-radius: 4px;
		font-size: 0.8rem;
	}

	.setup-card a {
		display: inline-block;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--accent-blue);
		text-decoration: none;
	}

	.map-legend {
		position: absolute;
		left: 14px;
		bottom: 18px;
		display: flex;
		flex-wrap: wrap;
		gap: 10px 14px;
		padding: 8px 12px;
		border-radius: 10px;
		background: rgba(255, 255, 255, 0.94);
		border: 1px solid var(--border-subtle);
		box-shadow: var(--shadow-sm);
		font-size: 0.74rem;
		font-weight: 600;
		color: var(--text-primary);
		z-index: 10;
	}

	.legend-item {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.swatch {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}
	.swatch.en-route {
		background: #059669;
	}
	.swatch.delayed {
		background: #d97706;
	}
	.swatch.idle {
		background: #475569;
	}

	.line {
		width: 18px;
		height: 3px;
		border-radius: 2px;
	}
	.line.raw {
		border-top: 3px dashed #ef4444;
		height: 0;
	}
	.line.snapped {
		background: #0284c7;
	}
	.line.corridor {
		background: #4f46e5;
	}

	@media (max-width: 900px) {
		.map-stage {
			height: 540px;
			min-height: 540px;
		}
	}
</style>
