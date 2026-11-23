<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
	import { TerraDraw, TerraDrawPolygonMode, TerraDrawSelectMode } from 'terra-draw';
	import { TerraDrawGoogleMapsAdapter } from 'terra-draw-google-maps-adapter';
	import {
		AUSTIN_CENTER,
		AUSTIN_INITIAL_ZOOM,
		PRESEEDED_GEOFENCES,
		SEED_SEARCH_QUERY,
		WORKER_PRESETS
	} from '$lib/austinData';
	import type {
		AuditSite,
		GeofenceZone,
		LatLngPoint,
		ReverseGeocodeResult,
		RouteComputeResult
	} from '$lib/types';

	const apiKey = env.PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';

	let mapContainerEl = $state<HTMLDivElement | null>(null);
	let mapReady = $state(false);
	let apiKeyMissing = $state(false);
	let mapInitError = $state<string | null>(null);

	let selectedPresetId = $state<string>(WORKER_PRESETS[0].id);
	let workerPosition = $state<LatLngPoint>({ ...WORKER_PRESETS[0].position });
	let workerAddress = $state<string>('Resolving Austin street address...');
	let geocodeLoading = $state(false);

	let preseededZones = $state<GeofenceZone[]>(PRESEEDED_GEOFENCES);
	let drawnZones = $state<GeofenceZone[]>([]);
	let activeZone = $state<GeofenceZone | null>(null);
	let clockInRecord = $state<{ time: string; zoneName: string; address: string } | null>(null);

	let drawMode = $state<'select' | 'polygon'>('select');

	let searchQuery = $state<string>(SEED_SEARCH_QUERY);
	let searchLoading = $state(false);
	let searchError = $state<string | null>(null);
	let auditSites = $state<AuditSite[]>([]);
	let orderedSites = $state<AuditSite[]>([]);
	let routeResult = $state<RouteComputeResult | null>(null);
	let routeLoading = $state(false);
	let routeError = $state<string | null>(null);

	const allZones = $derived([...preseededZones, ...drawnZones]);
	const isInsideGeofence = $derived(activeZone !== null);

	// Imperative Google Maps & Terra Draw instances (kept outside Svelte reactivity)
	let map: google.maps.Map | null = null;
	let infoWindow: google.maps.InfoWindow | null = null;
	let terraDraw: TerraDraw | null = null;
	let workerMarker: google.maps.marker.AdvancedMarkerElement | null = null;
	let routePolyline: google.maps.Polyline | null = null;
	let stopMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
	const preseededPolygons = new Map<string, google.maps.Polygon>();
	const drawnPolygons = new Map<string, google.maps.Polygon>();

	let mapsLibRef: google.maps.MapsLibrary | null = null;
	let markerLibRef: google.maps.MarkerLibrary | null = null;
	let placesLibRef: google.maps.PlacesLibrary | null = null;
	let geocodingLibRef: google.maps.GeocodingLibrary | null = null;
	let geometryLibRef: google.maps.GeometryLibrary | null = null;

	function buildWorkerPinElement(inside: boolean): HTMLElement {
		const wrapper = document.createElement('div');
		wrapper.style.display = 'flex';
		wrapper.style.flexDirection = 'column';
		wrapper.style.alignItems = 'center';
		wrapper.style.transform = 'translateY(-4px)';

		const badge = document.createElement('div');
		badge.textContent = inside ? 'WORKER · IN ZONE' : 'WORKER · OUTSIDE';
		badge.style.padding = '3px 8px';
		badge.style.borderRadius = '9999px';
		badge.style.fontSize = '11px';
		badge.style.fontWeight = '700';
		badge.style.letterSpacing = '0.02em';
		badge.style.color = '#ffffff';
		badge.style.backgroundColor = inside ? '#059669' : '#d97706';
		badge.style.border = '2px solid #ffffff';
		badge.style.boxShadow = '0 2px 6px rgba(15, 23, 42, 0.35)';
		badge.style.whiteSpace = 'nowrap';

		const dot = document.createElement('div');
		dot.style.width = '14px';
		dot.style.height = '14px';
		dot.style.marginTop = '3px';
		dot.style.borderRadius = '9999px';
		dot.style.backgroundColor = inside ? '#10b981' : '#f59e0b';
		dot.style.border = '3px solid #ffffff';
		dot.style.boxShadow = '0 2px 6px rgba(15, 23, 42, 0.45)';

		wrapper.appendChild(badge);
		wrapper.appendChild(dot);
		return wrapper;
	}

	function buildInfoWindowContent(site: AuditSite, stopNumber: number): HTMLElement {
		const container = document.createElement('div');
		container.style.padding = '4px 2px';
		container.style.maxWidth = '240px';
		container.style.fontFamily = 'Inter, system-ui, sans-serif';

		const tag = document.createElement('div');
		tag.textContent = `Audit Stop #${stopNumber} · ${site.primaryType}`;
		tag.style.fontSize = '11px';
		tag.style.fontWeight = '700';
		tag.style.color = '#1d4ed8';
		tag.style.marginBottom = '4px';

		const title = document.createElement('div');
		title.textContent = site.displayName;
		title.style.fontSize = '14px';
		title.style.fontWeight = '700';
		title.style.color = '#0f172a';
		title.style.marginBottom = '4px';

		const addr = document.createElement('div');
		addr.textContent = site.formattedAddress;
		addr.style.fontSize = '12px';
		addr.style.color = '#475569';
		addr.style.lineHeight = '1.35';

		container.appendChild(tag);
		container.appendChild(title);
		container.appendChild(addr);
		return container;
	}

	function evaluateGeofenceStatus() {
		if (!geometryLibRef) return;

		const point = new google.maps.LatLng(workerPosition.lat, workerPosition.lng);
		let matched: GeofenceZone | null = null;

		for (const zone of preseededZones) {
			const poly = preseededPolygons.get(zone.id);
			if (poly && geometryLibRef.poly.containsLocation(point, poly)) {
				matched = zone;
				break;
			}
		}

		if (!matched) {
			for (const zone of drawnZones) {
				const poly = drawnPolygons.get(zone.id);
				if (poly && geometryLibRef.poly.containsLocation(point, poly)) {
					matched = zone;
					break;
				}
			}
		}

		activeZone = matched;

		// Update pre-seeded polygon emphasis
		for (const zone of preseededZones) {
			const poly = preseededPolygons.get(zone.id);
			if (poly) {
				const isMatched = matched?.id === zone.id;
				poly.setOptions({
					fillOpacity: isMatched ? 0.32 : 0.16,
					strokeWeight: isMatched ? 3 : 2
				});
			}
		}

		// Update worker marker appearance & position
		if (workerMarker) {
			workerMarker.position = workerPosition;
			workerMarker.replaceChildren(buildWorkerPinElement(matched !== null));
		}
	}

	function syncDrawnZonesFromTerraDraw() {
		if (!terraDraw || !mapsLibRef) return;

		const snapshot = terraDraw.getSnapshot();
		const completedPolygons = snapshot.filter(
			(feature) =>
				feature.geometry.type === 'Polygon' &&
				Array.isArray(feature.geometry.coordinates) &&
				feature.geometry.coordinates[0]?.length >= 4 &&
				!feature.properties?.currentlyDrawing
		);

		drawnPolygons.clear();
		const nextZones: GeofenceZone[] = [];

		completedPolygons.forEach((feature, index) => {
			if (feature.geometry.type !== 'Polygon') return;
			const ring = feature.geometry.coordinates[0] as number[][];
			const paths: LatLngPoint[] = ring.map(([lng, lat]: number[]) => ({ lat, lng }));
			const id = String(feature.id ?? `drawn-zone-${index + 1}`);

			const evalPolygon = new mapsLibRef!.Polygon({ paths });
			drawnPolygons.set(id, evalPolygon);

			nextZones.push({
				id,
				name: `Supervisor Custom Zone #${index + 1}`,
				source: 'supervisor-drawn',
				color: '#0f766e',
				paths
			});
		});

		drawnZones = nextZones;
		evaluateGeofenceStatus();
	}

	async function reverseGeocodeWorker(pos: LatLngPoint) {
		geocodeLoading = true;
		try {
			const res = await fetch(
				`/api/geocode/reverse?lat=${encodeURIComponent(pos.lat)}&lng=${encodeURIComponent(pos.lng)}`
			);
			if (res.ok) {
				const data = (await res.json()) as ReverseGeocodeResult;
				workerAddress = data.formattedAddress;
				return;
			}
			throw new Error(`Reverse geocode endpoint returned ${res.status}`);
		} catch {
			// Graceful fallback to Maps JS Geocoding library if server key is HTTP-referrer restricted
			if (geocodingLibRef) {
				try {
					const geocoder = new geocodingLibRef.Geocoder();
					const response = await geocoder.geocode({ location: pos });
					const formatted = response.results?.[0]?.formatted_address;
					workerAddress =
						formatted || `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)} (Austin, TX)`;
				} catch {
					workerAddress = `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)} (Austin, TX)`;
				}
			} else {
				workerAddress = `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)} (Austin, TX)`;
			}
		} finally {
			geocodeLoading = false;
		}
	}

	function clearStopMarkersAndRoute() {
		for (const marker of stopMarkers) {
			marker.map = null;
		}
		stopMarkers = [];
		if (routePolyline) {
			routePolyline.setMap(null);
			routePolyline = null;
		}
		infoWindow?.close();
	}

	function renderOrderedStopMarkers(sites: AuditSite[]) {
		if (!map || !markerLibRef || !mapsLibRef) return;

		for (const marker of stopMarkers) {
			marker.map = null;
		}
		stopMarkers = [];

		sites.forEach((site, index) => {
			const pin = new markerLibRef!.PinElement({
				glyphText: String(index + 1),
				background: '#1d4ed8',
				borderColor: '#ffffff',
				glyphColor: '#ffffff',
				scale: 1.05
			});

			const marker = new markerLibRef!.AdvancedMarkerElement({
				map,
				position: site.location,
				title: `#${index + 1} ${site.displayName}`,
				content: pin
			});

			marker.addListener('click', () => {
				if (!infoWindow || !map) return;
				infoWindow.setContent(buildInfoWindowContent(site, index + 1));
				infoWindow.open({ anchor: marker, map });
			});

			stopMarkers.push(marker);
		});
	}

	async function computeOptimizedRoute(sitesToRoute: AuditSite[]) {
		if (sitesToRoute.length === 0) {
			orderedSites = [];
			routeResult = null;
			clearStopMarkersAndRoute();
			return;
		}

		routeLoading = true;
		routeError = null;

		try {
			// Use worker's current position as origin & loop return so ALL audit sites
			// are evaluated as intermediate waypoints with optimizeWaypointOrder: true.
			const res = await fetch('/api/routes/compute', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					origin: workerPosition,
					destination: workerPosition,
					intermediates: sitesToRoute.map((s) => s.location)
				})
			});

			const payload = (await res.json()) as RouteComputeResult & { error?: string };
			if (!res.ok) {
				throw new Error(payload.error || `Routes API returned ${res.status}`);
			}

			routeResult = payload;

			const indices =
				payload.optimizedIntermediateWaypointIndex.length === sitesToRoute.length
					? payload.optimizedIntermediateWaypointIndex
					: sitesToRoute.map((_, idx) => idx);

			const reordered = indices.map((originalIdx) => sitesToRoute[originalIdx]).filter(Boolean);
			orderedSites = reordered;

			renderOrderedStopMarkers(reordered);

			if (map && mapsLibRef && geometryLibRef && payload.encodedPolyline) {
				if (routePolyline) {
					routePolyline.setMap(null);
				}
				const decodedPath = geometryLibRef.encoding.decodePath(payload.encodedPolyline);
				routePolyline = new mapsLibRef.Polyline({
					path: decodedPath,
					geodesic: true,
					strokeColor: '#1d4ed8',
					strokeOpacity: 0.88,
					strokeWeight: 5,
					map
				});
			}
		} catch (err) {
			routeError = err instanceof Error ? err.message : 'Unable to compute optimized route.';
			orderedSites = sitesToRoute;
			renderOrderedStopMarkers(sitesToRoute);
		} finally {
			routeLoading = false;
		}
	}

	async function searchAuditSites(queryText: string) {
		const trimmed = queryText.trim();
		if (!trimmed) return;

		searchLoading = true;
		searchError = null;

		try {
			const res = await fetch('/api/places/search', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					textQuery: trimmed,
					maxResultCount: 5
				})
			});

			const data = (await res.json()) as { places?: AuditSite[]; error?: string };
			if (!res.ok) {
				throw new Error(data.error || `Places search failed (${res.status})`);
			}

			const places = data.places ?? [];
			auditSites = places;
			await computeOptimizedRoute(places);
		} catch (err) {
			// Graceful fallback to Places JS SDK if server key is HTTP-referrer restricted
			if (placesLibRef) {
				try {
					const { places } = await placesLibRef.Place.searchByText({
						textQuery: trimmed,
						fields: ['id', 'displayName', 'formattedAddress', 'location', 'primaryTypeDisplayName'],
						locationBias: {
							center: AUSTIN_CENTER,
							radius: 15000
						},
						maxResultCount: 5
					});
					const mapped: AuditSite[] = (places ?? [])
						.filter((p) => p.location)
						.map((p, idx) => ({
							id: p.id || `site-${idx + 1}`,
							displayName: p.displayName || `Austin Site ${idx + 1}`,
							formattedAddress: p.formattedAddress || 'Austin, TX',
							primaryType: p.primaryTypeDisplayName || 'Retail Store',
							location: {
								lat: p.location!.lat(),
								lng: p.location!.lng()
							}
						}));
					auditSites = mapped;
					await computeOptimizedRoute(mapped);
					return;
				} catch (sdkErr) {
					searchError =
						sdkErr instanceof Error ? sdkErr.message : 'Failed to search Austin audit sites.';
				}
			} else {
				searchError =
					err instanceof Error ? err.message : 'Failed to search Austin audit sites.';
			}
		} finally {
			searchLoading = false;
		}
	}

	function handleWorkerPresetChange(event: Event) {
		const select = event.currentTarget as HTMLSelectElement;
		selectedPresetId = select.value;
		const preset = WORKER_PRESETS.find((p) => p.id === selectedPresetId);
		if (!preset) return;

		workerPosition = { ...preset.position };
		clockInRecord = null;
		evaluateGeofenceStatus();
		void reverseGeocodeWorker(workerPosition);
		if (map) {
			map.panTo(workerPosition);
		}
	}

	function handleClockIn() {
		if (!activeZone) return;
		clockInRecord = {
			time: new Date().toLocaleTimeString('en-US', {
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit'
			}),
			zoneName: activeZone.name,
			address: workerAddress
		};
	}

	function setTerraDrawMode(mode: 'select' | 'polygon') {
		drawMode = mode;
		if (terraDraw) {
			terraDraw.setMode(mode);
		}
	}

	function clearDrawnZones() {
		if (terraDraw) {
			terraDraw.clear();
			terraDraw.setMode('select');
		}
		drawMode = 'select';
		drawnPolygons.clear();
		drawnZones = [];
		evaluateGeofenceStatus();
	}

	function focusStop(site: AuditSite, index: number) {
		if (!map) return;
		map.panTo(site.location);
		map.setZoom(14);
		const marker = stopMarkers[index];
		if (marker && infoWindow) {
			infoWindow.setContent(buildInfoWindowContent(site, index + 1));
			infoWindow.open({ anchor: marker, map });
		}
	}

	function focusZone(zone: GeofenceZone) {
		if (!map || zone.paths.length === 0) return;
		const bounds = new google.maps.LatLngBounds();
		zone.paths.forEach((pt) => bounds.extend(pt));
		map.fitBounds(bounds, 48);
	}

	onMount(() => {
		let cancelled = false;

		async function initializeMapWorkspace() {
			if (!apiKey) {
				apiKeyMissing = true;
				workerAddress = 'Configure PUBLIC_GOOGLE_MAPS_API_KEY to enable live geocoding';
				return;
			}

			if (!mapContainerEl) return;

			try {
				setOptions({
					key: apiKey,
					v: 'weekly'
				});

				const [mapsLib, markerLib, placesLib, _routesLib, geocodingLib, geometryLib] =
					await Promise.all([
						importLibrary('maps'),
						importLibrary('marker'),
						importLibrary('places'),
						importLibrary('routes'),
						importLibrary('geocoding'),
						importLibrary('geometry')
					]);

				if (cancelled || !mapContainerEl) return;

				mapsLibRef = mapsLib;
				markerLibRef = markerLib;
				placesLibRef = placesLib;
				geocodingLibRef = geocodingLib;
				geometryLibRef = geometryLib;

				map = new mapsLib.Map(mapContainerEl, {
					center: AUSTIN_CENTER,
					zoom: AUSTIN_INITIAL_ZOOM,
					mapId: 'DEMO_MAP_ID',
					internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
					mapTypeControl: true,
					streetViewControl: false,
					fullscreenControl: true,
					clickableIcons: false
				});

				infoWindow = new mapsLib.InfoWindow();

				// Render 3 pre-seeded Austin geofence polygons
				for (const zone of preseededZones) {
					const polygon = new mapsLib.Polygon({
						paths: zone.paths,
						strokeColor: zone.color,
						strokeOpacity: 0.92,
						strokeWeight: 2,
						fillColor: zone.color,
						fillOpacity: 0.16,
						map
					});
					preseededPolygons.set(zone.id, polygon);
				}

				// Initialize worker AdvancedMarkerElement
				workerMarker = new markerLib.AdvancedMarkerElement({
					map,
					position: workerPosition,
					title: 'Simulated Field Worker GPS',
					zIndex: 999
				});
				workerMarker.append(buildWorkerPinElement(true));

				// Initialize Terra Draw once map projection is ready
				const startTerraDraw = () => {
					if (terraDraw || !map) return;
					terraDraw = new TerraDraw({
						adapter: new TerraDrawGoogleMapsAdapter({
							map,
							lib: google.maps,
							coordinatePrecision: 9
						}),
						modes: [
							new TerraDrawSelectMode({
								flags: {
									polygon: {
										feature: {
											draggable: true,
											rotateable: true,
											coordinates: {
												midpoints: true,
												draggable: true,
												deletable: true
											}
										}
									}
								}
							}),
							new TerraDrawPolygonMode({
								editable: true,
								styles: {
									fillColor: '#0f766e',
									fillOpacity: 0.24,
									outlineColor: '#0f766e',
									outlineWidth: 2
								}
							})
						]
					});
					terraDraw.start();
					terraDraw.setMode('select');
					drawMode = 'select';
					terraDraw.on('finish', () => syncDrawnZonesFromTerraDraw());
					terraDraw.on('change', () => syncDrawnZonesFromTerraDraw());
				};

				if (map.getProjection()) {
					startTerraDraw();
				} else {
					map.addListener('projection_changed', startTerraDraw);
				}

				mapReady = true;

				// Initial geofence evaluation, reverse geocode, and live Austin audit sites + route
				evaluateGeofenceStatus();
				await Promise.all([
					reverseGeocodeWorker(workerPosition),
					searchAuditSites(SEED_SEARCH_QUERY)
				]);
			} catch (err) {
				if (!cancelled) {
					mapInitError =
						err instanceof Error ? err.message : 'Failed to initialize Google Maps Platform.';
				}
			}
		}

		void initializeMapWorkspace();

		return () => {
			cancelled = true;
		};
	});

	onDestroy(() => {
		clearStopMarkersAndRoute();
		if (workerMarker) {
			workerMarker.map = null;
		}
		for (const poly of preseededPolygons.values()) {
			poly.setMap(null);
		}
		preseededPolygons.clear();
		if (terraDraw) {
			try {
				terraDraw.stop();
			} catch {
				// Ignore cleanup errors if projection was never initialized
			}
		}
	});
</script>

<div class="app-shell">
	<header class="top-header">
		<div class="header-left">
			<div class="brand-dot" aria-hidden="true"></div>
			<div>
				<h1>Field Workforce Geofenced Attendance &amp; Site Audit Router</h1>
			</div>
			<span class="pill pill-district">Austin, TX District</span>
		</div>

		<div class="header-metrics">
			<span class="pill pill-neutral">
				{allZones.length} Active {allZones.length === 1 ? 'Zone' : 'Zones'}
			</span>
			<span class="pill {isInsideGeofence ? 'pill-ok' : 'pill-warn'}">
				{isInsideGeofence ? 'Clock-In Eligible' : 'Clock-In Locked'}
			</span>
			{#if routeResult}
				<span class="pill pill-route">
					{orderedSites.length} Stops · {routeResult.distanceText} · {routeResult.durationText}
				</span>
			{/if}
		</div>
	</header>

	<main class="workspace">
		<aside class="sidebar">
			<!-- Card 1: Worker GPS & Geofenced Attendance -->
			<section class="card">
				<div class="card-header">
					<h2>1. Worker GPS &amp; Geofenced Attendance</h2>
					<span
						id="geofence-status-badge"
						data-testid="geofence-status-badge"
						class="status-pill {isInsideGeofence ? 'status-ok' : 'status-warn'}"
					>
						{isInsideGeofence ? `Inside: ${activeZone?.name}` : 'Outside Active Geofences'}
					</span>
				</div>

				<label class="field-label" for="worker-preset-select">Simulated Worker GPS Position</label>
				<select
					id="worker-preset-select"
					data-testid="worker-preset-select"
					class="select-input"
					value={selectedPresetId}
					onchange={handleWorkerPresetChange}
				>
					{#each WORKER_PRESETS as preset (preset.id)}
						<option value={preset.id}>{preset.label}</option>
					{/each}
				</select>

				<div class="coords-row">
					<span>Lat: {workerPosition.lat.toFixed(4)}</span>
					<span>Lng: {workerPosition.lng.toFixed(4)}</span>
				</div>

				<div class="address-box">
					<span class="address-label">Reverse-Geocoded Street Address</span>
					<p id="worker-address" data-testid="worker-address" class="address-value">
						{geocodeLoading ? 'Geocoding worker coordinates...' : workerAddress}
					</p>
				</div>

				<div class="clockin-panel">
					<div
						id="verified-clockin-badge"
						data-testid="verified-clockin-badge"
						class="verified-badge {isInsideGeofence ? 'verified-unlocked' : 'verified-locked'}"
					>
						<span class="badge-indicator"></span>
						<span>
							{isInsideGeofence
								? 'Verified Clock-In Unlocked'
								: 'Verified Clock-In Locked (Outside Zone)'}
						</span>
					</div>

					<button
						id="clockin-action-btn"
						data-testid="clockin-action-btn"
						type="button"
						class="btn btn-primary full-width"
						disabled={!isInsideGeofence}
						onclick={handleClockIn}
					>
						{clockInRecord
							? `Clocked In at ${clockInRecord.time}`
							: isInsideGeofence
								? 'Record Verified Clock-In'
								: 'Move Inside Geofence to Clock In'}
					</button>

					{#if clockInRecord}
						<p class="clockin-confirmation">
							Checked in at <strong>{clockInRecord.zoneName}</strong> ({clockInRecord.address})
						</p>
					{/if}
				</div>
			</section>

			<!-- Card 2: Geofence Zones & Terra Draw Controls -->
			<section class="card">
				<div class="card-header">
					<h2>2. Geofence Zones &amp; Terra Draw</h2>
					<span class="count-tag">{allZones.length} Zones</span>
				</div>

				<p class="card-subtitle">
					Draw new Austin site boundaries directly on the map with Terra Draw.
				</p>

				<div class="btn-row">
					<button
						id="draw-polygon-btn"
						data-testid="draw-polygon-btn"
						type="button"
						class="btn {drawMode === 'polygon' ? 'btn-active' : 'btn-outline'}"
						onclick={() => setTerraDrawMode('polygon')}
					>
						Draw Polygon
					</button>
					<button
						id="select-mode-btn"
						data-testid="select-mode-btn"
						type="button"
						class="btn {drawMode === 'select' ? 'btn-active' : 'btn-outline'}"
						onclick={() => setTerraDrawMode('select')}
					>
						Select / Edit
					</button>
					<button
						id="clear-drawn-btn"
						data-testid="clear-drawn-btn"
						type="button"
						class="btn btn-danger-outline"
						onclick={clearDrawnZones}
					>
						Clear Drawn
					</button>
				</div>

				<ul id="geofence-list" data-testid="geofence-list" class="zone-list">
					{#each allZones as zone (zone.id)}
						{@const isOccupied = activeZone?.id === zone.id}
						<li>
							<button
								type="button"
								class="zone-item {isOccupied ? 'zone-occupied' : ''}"
								onclick={() => focusZone(zone)}
							>
								<span class="zone-dot" style="background-color: {zone.color}"></span>
								<span class="zone-info">
									<span class="zone-name">{zone.name}</span>
									<span class="zone-meta">
										{zone.source === 'pre-seeded' ? 'Pre-seeded' : 'Supervisor Drawn'}
										{isOccupied ? ' · Worker Inside' : ''}
									</span>
								</span>
							</button>
						</li>
					{/each}
				</ul>
			</section>

			<!-- Card 3: Multi-Stop Audit Router -->
			<section class="card">
				<div class="card-header">
					<h2>3. Multi-Stop Audit Router</h2>
					<span class="count-tag">{orderedSites.length} Stops</span>
				</div>

				<form
					class="search-row"
					onsubmit={(e) => {
						e.preventDefault();
						void searchAuditSites(searchQuery);
					}}
				>
					<input
						id="site-search-input"
						data-testid="site-search-input"
						type="text"
						class="text-input"
						placeholder="Search Austin audit sites..."
						bind:value={searchQuery}
					/>
					<button
						id="site-search-btn"
						data-testid="site-search-btn"
						type="submit"
						class="btn btn-outline"
						disabled={searchLoading}
					>
						{searchLoading ? 'Searching...' : 'Search'}
					</button>
				</form>

				<button
					id="optimize-route-btn"
					data-testid="optimize-route-btn"
					type="button"
					class="btn btn-secondary full-width"
					disabled={routeLoading || auditSites.length === 0}
					onclick={() => void computeOptimizedRoute(auditSites)}
				>
					{routeLoading ? 'Optimizing Waypoints...' : 'Optimize Multi-Stop Route'}
				</button>

				{#if searchError || routeError}
					<div class="error-banner" role="alert">
						{searchError || routeError}
					</div>
				{/if}

				<div id="route-summary" data-testid="route-summary" class="route-summary-box">
					{#if routeResult}
						<div class="summary-stat">
							<span class="stat-label">Distance</span>
							<span class="stat-value">{routeResult.distanceText}</span>
						</div>
						<div class="summary-stat">
							<span class="stat-label">Drive ETA</span>
							<span class="stat-value">{routeResult.durationText}</span>
						</div>
						<div class="summary-stat">
							<span class="stat-label">Audit Stops</span>
							<span class="stat-value">{orderedSites.length}</span>
						</div>
					{:else}
						<span class="summary-placeholder">
							{routeLoading ? 'Computing optimal route...' : 'No route computed yet.'}
						</span>
					{/if}
				</div>

				<ol id="audit-stops-list" data-testid="audit-stops-list" class="stops-list">
					{#each orderedSites as site, index (site.id + '-' + index)}
						{@const leg = routeResult?.legs[index]}
						<li>
							<button
								type="button"
								class="stop-item"
								onclick={() => focusStop(site, index)}
							>
								<span class="stop-number">{index + 1}</span>
								<span class="stop-details">
									<span class="stop-name">{site.displayName}</span>
									<span class="stop-address">{site.formattedAddress}</span>
									{#if leg}
										<span class="stop-leg">
											Leg {index + 1}: {leg.distanceText} · {leg.durationText}
										</span>
									{/if}
								</span>
							</button>
						</li>
					{/each}
				</ol>
			</section>
		</aside>

		<section class="map-section">
			<div
				id="terra-draw-toolbar"
				data-testid="terra-draw-toolbar"
				class="floating-toolbar"
				role="toolbar"
				aria-label="Terra Draw Geofence Toolbar"
			>
				<span class="toolbar-title">Geofence Draw</span>
				<button
					type="button"
					class="toolbar-btn {drawMode === 'polygon' ? 'toolbar-btn-active' : ''}"
					onclick={() => setTerraDrawMode('polygon')}
				>
					Draw Polygon
				</button>
				<button
					type="button"
					class="toolbar-btn {drawMode === 'select' ? 'toolbar-btn-active' : ''}"
					onclick={() => setTerraDrawMode('select')}
				>
					Select / Edit
				</button>
				<button type="button" class="toolbar-btn toolbar-btn-danger" onclick={clearDrawnZones}>
					Clear Drawn
				</button>
			</div>

			{#if apiKeyMissing}
				<div class="map-overlay-notice">
					<h3>Google Maps API Key Required</h3>
					<p>
						Set <code>PUBLIC_GOOGLE_MAPS_API_KEY</code> in your local <code>.env</code> file (see
						<code>.env.example</code>) using a free
						<a
							href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
							target="_blank"
							rel="noreferrer"
						>
							Maps Demo Key
						</a>
						or Google Cloud API key.
					</p>
				</div>
			{:else if mapInitError}
				<div class="map-overlay-notice">
					<h3>Map Initialization Notice</h3>
					<p>{mapInitError}</p>
				</div>
			{/if}

			<div
				id="map-container"
				data-testid="map-container"
				class="map-canvas"
				bind:this={mapContainerEl}
				data-map-ready={mapReady ? 'true' : 'false'}
			></div>
		</section>
	</main>
</div>

<style>
	.app-shell {
		display: flex;
		flex-direction: column;
		height: 100vh;
		min-height: 600px;
		background: var(--bg-app);
	}

	.top-header {
		height: 56px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 0 18px;
		background: #0f172a;
		color: #f8fafc;
		border-bottom: 1px solid #1e293b;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}

	.brand-dot {
		width: 10px;
		height: 10px;
		border-radius: 9999px;
		background: #14b8a6;
		box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.25);
		flex-shrink: 0;
	}

	.top-header h1 {
		margin: 0;
		font-size: 15px;
		font-weight: 700;
		letter-spacing: -0.01em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.header-metrics {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}

	.pill {
		display: inline-flex;
		align-items: center;
		padding: 4px 10px;
		border-radius: 9999px;
		font-size: 12px;
		font-weight: 600;
		white-space: nowrap;
	}

	.pill-district {
		background: rgba(20, 184, 166, 0.16);
		color: #5eead4;
		border: 1px solid rgba(94, 234, 212, 0.3);
	}

	.pill-neutral {
		background: #1e293b;
		color: #e2e8f0;
		border: 1px solid #334155;
	}

	.pill-ok {
		background: rgba(16, 185, 129, 0.18);
		color: #6ee7b7;
		border: 1px solid rgba(110, 231, 183, 0.35);
	}

	.pill-warn {
		background: rgba(245, 158, 11, 0.18);
		color: #fcd34d;
		border: 1px solid rgba(252, 211, 77, 0.35);
	}

	.pill-route {
		background: rgba(59, 130, 246, 0.2);
		color: #93c5fd;
		border: 1px solid rgba(147, 197, 253, 0.35);
	}

	.workspace {
		flex: 1;
		display: flex;
		min-height: 540px;
		overflow: hidden;
	}

	.sidebar {
		width: 380px;
		flex-shrink: 0;
		background: var(--bg-subtle);
		border-right: 1px solid var(--border-color);
		padding: 14px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.card {
		background: var(--bg-surface);
		border: 1px solid var(--border-color);
		border-radius: 10px;
		padding: 14px;
		box-shadow: var(--shadow-sm);
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.card-header h2 {
		margin: 0;
		font-size: 13.5px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.card-subtitle {
		margin: 0;
		font-size: 12px;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	.count-tag {
		font-size: 11px;
		font-weight: 700;
		padding: 2px 8px;
		border-radius: 9999px;
		background: #e2e8f0;
		color: #334155;
	}

	.status-pill {
		font-size: 11px;
		font-weight: 700;
		padding: 3px 8px;
		border-radius: 9999px;
		border: 1px solid transparent;
	}

	.status-ok {
		background: var(--status-ok-bg);
		color: var(--status-ok-text);
		border-color: var(--status-ok-border);
	}

	.status-warn {
		background: var(--status-warn-bg);
		color: var(--status-warn-text);
		border-color: var(--status-warn-border);
	}

	.field-label {
		font-size: 11.5px;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.select-input,
	.text-input {
		width: 100%;
		padding: 8px 10px;
		font-size: 13px;
		border-radius: 7px;
		border: 1px solid #cbd5e1;
		background: #ffffff;
		color: var(--text-primary);
	}

	.select-input:focus,
	.text-input:focus {
		outline: 2px solid rgba(15, 118, 110, 0.25);
		border-color: var(--brand-teal);
	}

	.coords-row {
		display: flex;
		justify-content: space-between;
		font-size: 11.5px;
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}

	.address-box {
		background: var(--bg-subtle);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 8px 10px;
	}

	.address-label {
		display: block;
		font-size: 10.5px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--text-muted);
		margin-bottom: 3px;
	}

	.address-value {
		margin: 0;
		font-size: 12.5px;
		font-weight: 600;
		color: var(--text-primary);
		line-height: 1.35;
	}

	.clockin-panel {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.verified-badge {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 10px;
		border-radius: 8px;
		font-size: 12px;
		font-weight: 700;
		border: 1px solid transparent;
	}

	.verified-unlocked {
		background: var(--status-ok-bg);
		color: var(--status-ok-text);
		border-color: var(--status-ok-border);
	}

	.verified-locked {
		background: var(--status-err-bg);
		color: var(--status-err-text);
		border-color: var(--status-err-border);
	}

	.badge-indicator {
		width: 8px;
		height: 8px;
		border-radius: 9999px;
		background: currentColor;
		flex-shrink: 0;
	}

	.clockin-confirmation {
		margin: 0;
		font-size: 11.5px;
		color: var(--status-ok-text);
		line-height: 1.35;
	}

	.btn-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
	}

	.search-row {
		display: flex;
		gap: 6px;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 7px 10px;
		border-radius: 7px;
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		border: 1px solid transparent;
		transition:
			background-color 0.15s ease,
			border-color 0.15s ease,
			color 0.15s ease;
		white-space: nowrap;
	}

	.btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.full-width {
		width: 100%;
	}

	.btn-primary {
		background: var(--brand-teal);
		color: #ffffff;
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--brand-teal-hover);
	}

	.btn-secondary {
		background: var(--brand-blue);
		color: #ffffff;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #1e40af;
	}

	.btn-outline {
		background: #ffffff;
		border-color: #cbd5e1;
		color: var(--text-primary);
	}

	.btn-outline:hover:not(:disabled) {
		background: #f8fafc;
	}

	.btn-active {
		background: #0f766e;
		border-color: #0f766e;
		color: #ffffff;
	}

	.btn-danger-outline {
		background: #ffffff;
		border-color: #fecaca;
		color: #b91c1c;
	}

	.btn-danger-outline:hover:not(:disabled) {
		background: #fef2f2;
	}

	.zone-list,
	.stops-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.zone-item,
	.stop-item {
		width: 100%;
		text-align: left;
		display: flex;
		align-items: flex-start;
		gap: 9px;
		padding: 8px 10px;
		border-radius: 8px;
		border: 1px solid var(--border-color);
		background: var(--bg-subtle);
		cursor: pointer;
	}

	.zone-item:hover,
	.stop-item:hover {
		border-color: #94a3b8;
		background: #ffffff;
	}

	.zone-occupied {
		border-color: #10b981;
		background: #ecfdf5;
	}

	.zone-dot {
		width: 10px;
		height: 10px;
		border-radius: 9999px;
		margin-top: 4px;
		flex-shrink: 0;
	}

	.zone-info,
	.stop-details {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.zone-name,
	.stop-name {
		font-size: 12.5px;
		font-weight: 700;
		color: var(--text-primary);
	}

	.zone-meta,
	.stop-address {
		font-size: 11.5px;
		color: var(--text-secondary);
		line-height: 1.3;
	}

	.stop-leg {
		font-size: 11px;
		font-weight: 600;
		color: var(--brand-blue);
	}

	.stop-number {
		width: 22px;
		height: 22px;
		border-radius: 9999px;
		background: var(--brand-blue);
		color: #ffffff;
		font-size: 11.5px;
		font-weight: 700;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		margin-top: 1px;
	}

	.route-summary-box {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		background: #eff6ff;
		border: 1px solid #bfdbfe;
		border-radius: 8px;
		padding: 8px 10px;
	}

	.summary-stat {
		display: flex;
		flex-direction: column;
	}

	.stat-label {
		font-size: 10.5px;
		font-weight: 600;
		color: #1e40af;
		text-transform: uppercase;
	}

	.stat-value {
		font-size: 13px;
		font-weight: 700;
		color: #0f172a;
	}

	.summary-placeholder {
		grid-column: 1 / -1;
		font-size: 12px;
		color: #1e3a8a;
	}

	.error-banner {
		padding: 8px 10px;
		border-radius: 7px;
		background: var(--status-err-bg);
		color: var(--status-err-text);
		border: 1px solid var(--status-err-border);
		font-size: 12px;
	}

	.map-section {
		flex: 1;
		position: relative;
		min-height: 540px;
		height: 100%;
	}

	.map-canvas {
		width: 100%;
		height: 100%;
		min-height: 540px;
	}

	.floating-toolbar {
		position: absolute;
		top: 12px;
		left: 12px;
		z-index: 10;
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 8px;
		background: rgba(255, 255, 255, 0.96);
		backdrop-filter: blur(8px);
		border: 1px solid #cbd5e1;
		border-radius: 10px;
		box-shadow: var(--shadow-md);
	}

	.toolbar-title {
		font-size: 11.5px;
		font-weight: 700;
		color: var(--text-primary);
		padding: 0 4px;
	}

	.toolbar-btn {
		padding: 5px 9px;
		border-radius: 6px;
		border: 1px solid #cbd5e1;
		background: #ffffff;
		color: var(--text-primary);
		font-size: 11.5px;
		font-weight: 600;
		cursor: pointer;
	}

	.toolbar-btn-active {
		background: #0f766e;
		border-color: #0f766e;
		color: #ffffff;
	}

	.toolbar-btn-danger {
		color: #b91c1c;
		border-color: #fecaca;
	}

	.map-overlay-notice {
		position: absolute;
		top: 68px;
		left: 16px;
		right: 16px;
		max-width: 480px;
		z-index: 12;
		background: #ffffff;
		border: 1px solid #fca5a5;
		border-radius: 10px;
		padding: 14px 16px;
		box-shadow: var(--shadow-md);
	}

	.map-overlay-notice h3 {
		margin: 0 0 6px 0;
		font-size: 14px;
		color: #991b1b;
	}

	.map-overlay-notice p {
		margin: 0;
		font-size: 12.5px;
		color: var(--text-secondary);
		line-height: 1.45;
	}

	@media (max-width: 900px) {
		.app-shell {
			height: auto;
		}
		.top-header {
			height: auto;
			flex-wrap: wrap;
			padding: 10px 14px;
		}
		.workspace {
			flex-direction: column;
		}
		.sidebar {
			width: 100%;
			border-right: none;
			border-bottom: 1px solid var(--border-color);
		}
		.map-section,
		.map-canvas {
			min-height: 540px;
			height: 540px;
		}
	}
</style>
