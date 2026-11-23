<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { MarkerClusterer, SuperClusterAlgorithm } from '@googlemaps/markerclusterer';
	import { loadMapsLibraries, type LoadedMapsLibraries } from '$lib/maps/loader';
	import {
		createBranchMarkerElement,
		createClusterMarkerElement,
		createInfoWindowContent,
		createOriginMarkerElement
	} from '$lib/maps/markers';
	import { NYC_CENTER, type BranchLocation, type OriginLocation } from '$lib/types';

	interface Props {
		apiKey: string;
		origin: OriginLocation;
		branches: BranchLocation[];
		selectedBranchId: string | null;
		fastestBranchId: string | null;
		activeRouteInstance: google.maps.routes.Route | null;
		onLibrariesReady: (libs: LoadedMapsLibraries) => void;
		onMapError: (message: string) => void;
		onSelectBranch: (branch: BranchLocation) => void;
	}

	let {
		apiKey,
		origin,
		branches,
		selectedBranchId,
		fastestBranchId,
		activeRouteInstance,
		onLibrariesReady,
		onMapError,
		onSelectBranch
	}: Props = $props();

	let mapContainerEl: HTMLDivElement | null = $state(null);
	let mapInstance: google.maps.Map | null = $state(null);
	let loadedLibs: LoadedMapsLibraries | null = $state(null);
	let clusterer: MarkerClusterer | null = null;
	let originMarker: google.maps.marker.AdvancedMarkerElement | null = null;
	let infoWindow: google.maps.InfoWindow | null = null;
	let branchMarkers = new Map<string, google.maps.marker.AdvancedMarkerElement>();
	let routePolylines: google.maps.Polyline[] = [];

	onMount(async () => {
		if (!apiKey || !mapContainerEl) {
			return;
		}

		try {
			const libs = await loadMapsLibraries(apiKey);
			loadedLibs = libs;

			const map = new libs.maps.Map(mapContainerEl, {
				center: NYC_CENTER,
				zoom: 12,
				mapId: 'DEMO_MAP_ID',
				internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
				mapTypeControl: false,
				streetViewControl: false,
				fullscreenControl: true
			});

			infoWindow = new libs.maps.InfoWindow({
				maxWidth: 280
			});

			const { AdvancedMarkerElement } = libs.marker;

			clusterer = new MarkerClusterer({
				map,
				markers: [],
				algorithm: new SuperClusterAlgorithm({
					maxZoom: 14,
					radius: 65
				}),
				renderer: {
					render: ({ count, position }) =>
						new AdvancedMarkerElement({
							position,
							content: createClusterMarkerElement(count),
							zIndex: 1000 + count
						})
				},
				onClusterClick: (_event, cluster, targetMap) => {
					if (cluster.bounds) {
						targetMap.fitBounds(cluster.bounds, 56);
					} else {
						targetMap.panTo(cluster.position);
						targetMap.setZoom((targetMap.getZoom() ?? 12) + 2);
					}
				}
			});

			mapInstance = map;
			onLibrariesReady(libs);
		} catch (error) {
			const msg =
				error instanceof Error
					? error.message
					: 'Failed to initialize Google Maps JavaScript API.';
			onMapError(msg);
		}
	});

	// Sync origin marker
	$effect(() => {
		if (!mapInstance || !loadedLibs) return;
		const { AdvancedMarkerElement } = loadedLibs.marker;

		if (originMarker) {
			originMarker.map = null;
		}

		const pin = new AdvancedMarkerElement({
			map: mapInstance,
			position: { lat: origin.lat, lng: origin.lng },
			title: `Origin: ${origin.label}`,
			zIndex: 900
		});
		pin.append(createOriginMarkerElement(origin.label));
		originMarker = pin;
	});

	// Sync filtered branch markers & MarkerClusterer
	$effect(() => {
		if (!mapInstance || !loadedLibs || !clusterer) return;
		const { AdvancedMarkerElement } = loadedLibs.marker;

		clusterer.clearMarkers();
		for (const marker of branchMarkers.values()) {
			marker.map = null;
		}
		branchMarkers.clear();

		const nextMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

		for (const branch of branches) {
			const isSelected = branch.id === selectedBranchId;
			const isFastest = branch.id === fastestBranchId;

			const marker = new AdvancedMarkerElement({
				position: { lat: branch.lat, lng: branch.lng },
				title: branch.name,
				zIndex: isSelected ? 800 : isFastest ? 600 : 200
			});
			marker.append(createBranchMarkerElement(branch, isSelected, isFastest));

			// Listen to plain 'click' on AdvancedMarkerElement for weekly channel compatibility
			marker.addListener('click', () => {
				onSelectBranch(branch);
			});

			branchMarkers.set(branch.id, marker);
			nextMarkers.push(marker);
		}

		clusterer.addMarkers(nextMarkers);
	});

	// Open InfoWindow when a branch is selected
	$effect(() => {
		if (!mapInstance || !infoWindow) return;

		if (!selectedBranchId) {
			infoWindow.close();
			return;
		}

		const branch = branches.find((b) => b.id === selectedBranchId);
		const marker = branchMarkers.get(selectedBranchId);
		if (!branch || !marker) {
			infoWindow.close();
			return;
		}

		infoWindow.setContent(
			createInfoWindowContent(branch, branch.id === fastestBranchId)
		);
		infoWindow.open({
			map: mapInstance,
			anchor: marker
		});
	});

	// Draw live route polylines via Route.createPolylines()
	$effect(() => {
		for (const poly of routePolylines) {
			poly.setMap(null);
		}
		routePolylines = [];

		if (!mapInstance || !loadedLibs || !activeRouteInstance) return;

		const created = activeRouteInstance.createPolylines({
			polylineOptions: {
				strokeColor: '#1d4ed8',
				strokeWeight: 5,
				strokeOpacity: 0.9
			}
		});

		for (const poly of created) {
			poly.setMap(mapInstance);
		}
		routePolylines = created;

		const bounds = new loadedLibs.core.LatLngBounds();
		bounds.extend({ lat: origin.lat, lng: origin.lng });
		if (activeRouteInstance.path && activeRouteInstance.path.length > 0) {
			for (const point of activeRouteInstance.path) {
				bounds.extend({ lat: point.lat, lng: point.lng });
			}
		}
		const selected = branches.find((b) => b.id === selectedBranchId);
		if (selected) {
			bounds.extend({ lat: selected.lat, lng: selected.lng });
		}
		mapInstance.fitBounds(bounds, { top: 64, right: 64, bottom: 64, left: 64 });
	});

	onDestroy(() => {
		for (const poly of routePolylines) {
			poly.setMap(null);
		}
		if (clusterer) {
			clusterer.clearMarkers();
		}
		if (originMarker) {
			originMarker.map = null;
		}
		for (const marker of branchMarkers.values()) {
			marker.map = null;
		}
		if (infoWindow) {
			infoWindow.close();
		}
	});
</script>

<div class="map-stage">
	<div
		bind:this={mapContainerEl}
		class="map-container"
		data-testid="map-container"
		aria-label="Interactive New York City store, kiosk, and ATM map"
	></div>

	{#if !apiKey}
		<div class="missing-key-overlay">
			<div class="missing-key-card">
				<h2>Google Maps API Key Required</h2>
				<p>
					Set <code>PUBLIC_GOOGLE_MAPS_API_KEY</code> in your local <code>.env</code> file
					(see <code>.env.example</code>) and restart the server to load live NYC Places,
					Advanced Markers, Clustering, and Routes.
				</p>
				<p>
					Need a key for prototyping? Get a free zero-billing
					<a
						href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
						target="_blank"
						rel="noopener noreferrer"
					>
						Maps Demo Key
					</a>.
				</p>
			</div>
		</div>
	{/if}

	<div class="map-legend" data-testid="map-legend">
		<div class="legend-title">NYC Network Legend</div>
		<div class="legend-items">
			<div class="legend-item">
				<span class="legend-dot flagship"></span>
				<span>Flagship Store</span>
			</div>
			<div class="legend-item">
				<span class="legend-dot kiosk"></span>
				<span>Express Kiosk</span>
			</div>
			<div class="legend-item">
				<span class="legend-dot atm"></span>
				<span>24/7 ATM</span>
			</div>
			<div class="legend-item">
				<span class="legend-dot origin"></span>
				<span>Starting Origin</span>
			</div>
		</div>
		<div class="legend-hint">Zoom in or click any cluster to expand individual branch pins.</div>
	</div>
</div>
