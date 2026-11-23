<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { MarkerClusterer, type Cluster, type ClusterStats } from '@googlemaps/markerclusterer';
	import { TerraDraw, TerraDrawPolygonMode, TerraDrawSelectMode } from 'terra-draw';
	import { TerraDrawGoogleMapsAdapter } from 'terra-draw-google-maps-adapter';
	import { formatPriceCompact } from '$lib/data/properties';
	import {
		DEFAULT_MAP_ID,
		GMP_USAGE_ATTRIBUTION_IDS,
		isApiKeyConfigured,
		loadGmpLibraries
	} from '$lib/maps/loader';
	import type { CommuteResult, LatLngLiteral, NearbyAmenity, PropertyListing } from '$lib/types';

	interface Props {
		allProperties: PropertyListing[];
		properties: PropertyListing[];
		selectedProperty: PropertyListing | null;
		hoveredPropertyId: string | null;
		focusedAmenity: NearbyAmenity | null;
		commuteResult: CommuteResult | null;
		focusLocation: {
			label: string;
			location: LatLngLiteral;
			viewport?: google.maps.LatLngBounds | null;
		} | null;
		hasDrawnArea: boolean;
		onSelectProperty: (property: PropertyListing) => void;
		onHoverProperty: (id: string | null) => void;
		onPolygonFilterChange: (matchingIds: Set<string> | null) => void;
	}

	let {
		allProperties,
		properties,
		selectedProperty,
		hoveredPropertyId,
		focusedAmenity,
		commuteResult,
		focusLocation,
		hasDrawnArea,
		onSelectProperty,
		onHoverProperty,
		onPolygonFilterChange
	}: Props = $props();

	let mapEl: HTMLDivElement | undefined = $state();
	let mapReady = $state(false);
	let mapError = $state<string | null>(null);
	let keyConfigured = $state(true);

	let isDrawing = $state(false);
	let terraDrawReady = $state(false);
	let mapTypeId = $state<'roadmap' | 'satellite'>('roadmap');

	let map: google.maps.Map | null = null;
	let mapsLib: google.maps.MapsLibrary | null = null;
	let markerLib: google.maps.MarkerLibrary | null = null;
	let geometryLib: google.maps.GeometryLibrary | null = null;

	let clusterer: MarkerClusterer | null = null;
	const propertyMarkers = new Map<
		string,
		{ marker: google.maps.marker.AdvancedMarkerElement; pill: HTMLButtonElement }
	>();
	let parcelPolygon: google.maps.Polygon | null = null;
	let amenityMarker: google.maps.marker.AdvancedMarkerElement | null = null;
	let workplaceMarker: google.maps.marker.AdvancedMarkerElement | null = null;
	let commutePolyline: google.maps.Polyline | null = null;
	let terraDraw: TerraDraw | null = null;

	let lastFilteredKey = '';
	let lastSelectedId = '';

	function syncMarkerStyles() {
		for (const [id, entry] of propertyMarkers.entries()) {
			const isSelected = selectedProperty?.id === id;
			const isHovered = hoveredPropertyId === id;
			entry.pill.classList.toggle('is-selected', isSelected);
			entry.pill.classList.toggle('is-hovered', isHovered);
			entry.marker.zIndex = isSelected ? 900 : isHovered ? 850 : 10;
		}
	}

	function rebuildMarkers(visibleProperties: PropertyListing[]) {
		if (!map || !markerLib) return;

		if (!clusterer) {
			const mLib = markerLib;
			clusterer = new MarkerClusterer({
				map,
				markers: [],
				renderer: {
					render({ count, position }: Cluster, _stats: ClusterStats) {
						const el = document.createElement('div');
						el.className = 'cluster-pill';
						el.textContent = `${count} homes`;
						const adv = new mLib.AdvancedMarkerElement({
							position,
							zIndex: 1000 + count
						});
						adv.append(el);
						return adv;
					}
				}
			});
		}

		clusterer.clearMarkers();
		for (const entry of propertyMarkers.values()) {
			entry.marker.map = null;
		}
		propertyMarkers.clear();

		const nextMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

		for (const prop of visibleProperties) {
			const pill = document.createElement('button');
			pill.type = 'button';
			pill.className = 'price-pill';
			pill.dataset.propertyId = prop.id;
			pill.textContent = formatPriceCompact(prop.price);
			pill.setAttribute('aria-label', `${prop.address} ${formatPriceCompact(prop.price)}`);

			pill.addEventListener('mouseenter', () => onHoverProperty(prop.id));
			pill.addEventListener('mouseleave', () => onHoverProperty(null));

			const advMarker = new markerLib.AdvancedMarkerElement({
				position: { lat: prop.lat, lng: prop.lng },
				title: `${prop.address} - ${formatPriceCompact(prop.price)}`
			});
			advMarker.append(pill);

			advMarker.addListener('click', () => {
				onSelectProperty(prop);
			});

			propertyMarkers.set(prop.id, { marker: advMarker, pill });
			nextMarkers.push(advMarker);
		}

		clusterer.addMarkers(nextMarkers);
		syncMarkerStyles();
	}

	function renderParcelOutline(target: PropertyListing | null) {
		if (parcelPolygon) {
			parcelPolygon.setMap(null);
			parcelPolygon = null;
		}
		if (!map || !mapsLib || !target) return;

		parcelPolygon = new mapsLib.Polygon({
			paths: target.parcel.polygon,
			strokeColor: '#2563eb',
			strokeOpacity: 0.95,
			strokeWeight: 3,
			fillColor: '#3b82f6',
			fillOpacity: 0.24,
			clickable: false,
			zIndex: 50,
			map
		});

		map.panTo({ lat: target.lat, lng: target.lng });
		const currentZoom = map.getZoom() ?? 13;
		if (currentZoom < 16) {
			map.setZoom(16);
		}
	}

	function initTerraDraw() {
		if (!map || !mapsLib || terraDraw) return;

		const adapter = new TerraDrawGoogleMapsAdapter({
			lib: google.maps,
			map,
			isolatedData: true,
			coordinatePrecision: 9
		});

		const draw = new TerraDraw({
			adapter,
			modes: [
				new TerraDrawPolygonMode({
					styles: {
						fillColor: '#0284c7',
						fillOpacity: 0.16,
						outlineColor: '#0284c7',
						outlineWidth: 2.5,
						closingPointColor: '#0f172a',
						closingPointWidth: 5,
						closingPointOutlineColor: '#ffffff',
						closingPointOutlineWidth: 2
					}
				}),
				new TerraDrawSelectMode({
					flags: {
						polygon: {
							feature: {
								draggable: false,
								coordinates: {
									midpoints: false,
									draggable: false,
									deletable: false
								}
							}
						}
					}
				})
			]
		});

		draw.on('ready', () => {
			terraDrawReady = true;
		});

		draw.on('finish', (featureId) => {
			isDrawing = false;
			try {
				draw.setMode('select');
			} catch {
				// Mode transition best-effort
			}

			const feature = draw.getSnapshotFeature(featureId);
			if (!feature || feature.geometry.type !== 'Polygon' || !mapsLib || !geometryLib) {
				return;
			}

			const outerRing = feature.geometry.coordinates[0] || [];
			if (outerRing.length < 3) return;

			const gPoly = new mapsLib.Polygon({
				paths: outerRing.map(([lng, lat]) => ({ lat, lng }))
			});

			const matchedIds = new Set<string>();
			for (const prop of allProperties) {
				const pt = new google.maps.LatLng(prop.lat, prop.lng);
				if (geometryLib.poly.containsLocation(pt, gPoly)) {
					matchedIds.add(prop.id);
				}
			}

			onPolygonFilterChange(matchedIds);
		});

		draw.start();
		terraDraw = draw;
	}

	function toggleDrawArea() {
		if (!terraDraw || !terraDrawReady) return;
		if (isDrawing) {
			isDrawing = false;
			terraDraw.setMode('select');
			return;
		}
		terraDraw.clear();
		onPolygonFilterChange(null);
		terraDraw.setMode('polygon');
		isDrawing = true;
	}

	function clearDrawnArea() {
		isDrawing = false;
		if (terraDraw) {
			terraDraw.clear();
			if (terraDrawReady) {
				terraDraw.setMode('select');
			}
		}
		onPolygonFilterChange(null);
	}

	function toggleMapType() {
		const nextType = mapTypeId === 'roadmap' ? 'satellite' : 'roadmap';
		mapTypeId = nextType;
		if (map) {
			map.setMapTypeId(nextType === 'satellite' ? 'hybrid' : 'roadmap');
		}
	}

	onMount(() => {
		let cancelled = false;

		async function setupMap() {
			if (!isApiKeyConfigured()) {
				keyConfigured = false;
				return;
			}
			if (!mapEl) return;

			try {
				const libs = await loadGmpLibraries();
				if (cancelled || !mapEl) return;

				mapsLib = libs.maps;
				markerLib = libs.marker;
				geometryLib = libs.geometry;

				map = new libs.maps.Map(mapEl, {
					center: { lat: 37.7749, lng: -122.4194 },
					zoom: 13,
					mapId: DEFAULT_MAP_ID,
					internalUsageAttributionIds: [...GMP_USAGE_ATTRIBUTION_IDS],
					mapTypeControl: false,
					streetViewControl: false,
					fullscreenControl: true,
					clickableIcons: false
				});

				mapReady = true;
				rebuildMarkers(properties);
				if (selectedProperty) {
					renderParcelOutline(selectedProperty);
				}

				google.maps.event.addListenerOnce(map, 'idle', () => {
					if (!cancelled) {
						initTerraDraw();
					}
				});
			} catch (err) {
				mapError =
					err instanceof Error ? err.message : 'Unable to initialize Google Map.';
			}
		}

		setupMap();

		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		if (!mapReady) return;
		const key = properties.map((p) => p.id).join(',');
		if (key !== lastFilteredKey) {
			lastFilteredKey = key;
			rebuildMarkers(properties);
		}
	});

	$effect(() => {
		if (!mapReady) return;
		// Track both hoveredPropertyId and selectedProperty for marker pill styling
		void hoveredPropertyId;
		void selectedProperty;
		syncMarkerStyles();
	});

	$effect(() => {
		if (!mapReady) return;
		const nextId = selectedProperty?.id || '';
		if (nextId !== lastSelectedId) {
			lastSelectedId = nextId;
			renderParcelOutline(selectedProperty);
		}
	});

	$effect(() => {
		if (!mapReady || !map || !markerLib) return;
		if (amenityMarker) {
			amenityMarker.map = null;
			amenityMarker = null;
		}
		if (focusedAmenity) {
			const badge = document.createElement('div');
			badge.className = 'amenity-map-pin';
			badge.textContent = focusedAmenity.name;
			amenityMarker = new markerLib.AdvancedMarkerElement({
				map,
				position: { lat: focusedAmenity.lat, lng: focusedAmenity.lng },
				title: focusedAmenity.name,
				zIndex: 950
			});
			amenityMarker.append(badge);
			map.panTo({ lat: focusedAmenity.lat, lng: focusedAmenity.lng });
		}
	});

	$effect(() => {
		if (!mapReady || !map || !mapsLib || !markerLib) return;

		if (commutePolyline) {
			commutePolyline.setMap(null);
			commutePolyline = null;
		}
		if (workplaceMarker) {
			workplaceMarker.map = null;
			workplaceMarker = null;
		}

		if (!commuteResult) return;

		const wpEl = document.createElement('div');
		wpEl.className = 'workplace-map-pin';
		wpEl.textContent = `Work · ${commuteResult.driving?.durationText || ''}`;

		workplaceMarker = new markerLib.AdvancedMarkerElement({
			map,
			position: commuteResult.destinationLocation,
			title: commuteResult.destinationLabel,
			zIndex: 960
		});
		workplaceMarker.append(wpEl);

		let decodedPath: google.maps.LatLng[] | LatLngLiteral[] | null = null;
		if (commuteResult.encodedPolyline && geometryLib) {
			decodedPath = geometryLib.encoding.decodePath(commuteResult.encodedPolyline);
		} else if (commuteResult.path?.length) {
			decodedPath = commuteResult.path;
		}

		if (decodedPath && decodedPath.length > 1) {
			commutePolyline = new mapsLib.Polyline({
				path: decodedPath,
				strokeColor: '#0284c7',
				strokeOpacity: 0.9,
				strokeWeight: 5,
				map
			});

			const bounds = new google.maps.LatLngBounds();
			for (const pt of decodedPath) {
				bounds.extend(pt);
			}
			map.fitBounds(bounds, 72);
		}
	});

	$effect(() => {
		if (!mapReady || !map || !focusLocation) return;
		if (focusLocation.viewport) {
			map.fitBounds(focusLocation.viewport);
		} else {
			map.panTo(focusLocation.location);
			map.setZoom(14);
		}
	});

	onDestroy(() => {
		if (terraDraw) {
			try {
				terraDraw.stop();
			} catch {
				// Ignore teardown errors
			}
			terraDraw = null;
		}
		if (clusterer) {
			clusterer.clearMarkers();
			clusterer = null;
		}
		for (const entry of propertyMarkers.values()) {
			entry.marker.map = null;
		}
		propertyMarkers.clear();
		if (parcelPolygon) parcelPolygon.setMap(null);
		if (commutePolyline) commutePolyline.setMap(null);
		if (amenityMarker) amenityMarker.map = null;
		if (workplaceMarker) workplaceMarker.map = null;
		map = null;
	});
</script>

<div class="map-pane">
	<div class="map-controls-overlay">
		<button
			type="button"
			id="draw-area-btn"
			data-testid="draw-area-btn"
			class="map-tool-btn"
			class:active={isDrawing}
			disabled={!terraDrawReady}
			onclick={toggleDrawArea}
		>
			{isDrawing ? 'Click vertices · Double-click to close' : 'Draw Search Area'}
		</button>

		<button
			type="button"
			id="clear-area-btn"
			data-testid="clear-area-btn"
			class="map-tool-btn secondary"
			disabled={!hasDrawnArea && !isDrawing}
			onclick={clearDrawnArea}
		>
			Clear Area
		</button>

		<button
			type="button"
			id="map-type-toggle"
			data-testid="map-type-toggle"
			class="map-tool-btn"
			onclick={toggleMapType}
		>
			{mapTypeId === 'roadmap' ? 'Satellite' : 'Roadmap'}
		</button>
	</div>

	<div
		class="map-canvas"
		id="map-container"
		data-testid="map-container"
		bind:this={mapEl}
	></div>

	{#if !keyConfigured}
		<div class="map-key-banner" role="status">
			<h3>Google Maps API Key Required for Live Map</h3>
			<p>
				Copy <code>.env.example</code> to <code>.env</code> and set
				<code>PUBLIC_GOOGLE_MAPS_API_KEY</code> using a free zero-billing
				<a
					href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
					target="_blank"
					rel="noopener noreferrer"
				>
					Maps Demo Key
				</a>
				to unlock interactive vector maps, parcel polygons, Street View, Places nearby discovery, and Routes Matrix ETAs.
			</p>
		</div>
	{:else if mapError}
		<div class="map-key-banner" role="alert">
			<h3>Map Initialization Notice</h3>
			<p>{mapError}</p>
		</div>
	{/if}

	<div class="map-legend">
		<span class="legend-item"><i class="swatch parcel"></i> Parcel Lot Outline</span>
		<span class="legend-item"><i class="swatch draw"></i> Terra Draw Area</span>
		<span class="legend-item"><i class="swatch route"></i> Commute Route</span>
	</div>
</div>
