<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import {
		FLOOD_ZONES,
		HAZARD_TYPES,
		INITIAL_INCIDENTS,
		MIAMI_CENTER
	} from '$lib/data/miamiHazards';
	import {
		ATTRIBUTION_ID,
		buildSafeInfoWindowContent,
		computeEvacuationRoute,
		ensureMapsConfigured,
		fetchElevationPoint,
		fetchWeatherCurrentConditions,
		loadAllGmpLibraries,
		reverseGeocodePoint,
		searchEmergencyShelters,
		type LoadedGmpLibraries
	} from '$lib/maps/gmpClient';
	import { HeatmapOverlayController, type HeatmapRenderMode } from '$lib/maps/heatmapOverlay';
	import type {
		DraftIncidentReport,
		EvacuationRouteSummary,
		FloodZoneDefinition,
		HazardIncident,
		HazardType,
		ShelterPlace,
		WeatherSnapshot
	} from '$lib/types';

	const DEFAULT_WEATHER: WeatherSnapshot = {
		conditionText: 'Loading live weather...',
		temperatureDisplay: '--',
		windSpeedText: '--',
		windGustText: '--',
		windDirectionText: '--',
		precipProbPercent: null,
		precipQpfText: '--',
		thunderstormProbPercent: null,
		isAvailable: false
	};

	let mapContainerEl = $state<HTMLDivElement | null>(null);
	let autocompleteSlotEl = $state<HTMLDivElement | null>(null);

	let mobileSidebarOpen = $state(false);
	let mapReady = $state(false);
	let initError = $state<string | null>(null);
	let missingApiKey = $state(false);

	let showHeatmap = $state(true);
	let showFloodPolygons = $state(true);
	let avoidFloodZones = $state(true);
	let heatmapMode = $state<HeatmapRenderMode>('deckgl-webgl2');

	let incidents = $state<HazardIncident[]>([...INITIAL_INCIDENTS]);
	let userReportedCount = $state(0);
	let reportSubmittedToast = $state<string | null>(null);

	let miamiWeatherPill = $state<WeatherSnapshot>(DEFAULT_WEATHER);

	let draftReport = $state<DraftIncidentReport>({
		lat: MIAMI_CENTER.lat,
		lng: MIAMI_CENTER.lng,
		address: 'Click anywhere on the Miami map to geotag an incident...',
		elevationMeters: null,
		elevationNote: 'Awaiting map click or location selection',
		weather: DEFAULT_WEATHER,
		hazardType: 'Flash Flooding',
		notes: '',
		loading: false,
		errorMessage: null
	});

	let shelterQuery = $state('hospital and community center in Miami, FL');
	let shelters = $state<ShelterPlace[]>([]);
	let sheltersLoading = $state(false);
	let sheltersError = $state<string | null>(null);
	let selectedShelterId = $state<string | null>(null);

	let routeSummary = $state<EvacuationRouteSummary | null>(null);
	let routeLoading = $state(false);
	let routeError = $state<string | null>(null);

	// Non-reactive Google Maps runtime handles
	let gmpLibs: LoadedGmpLibraries | null = null;
	let mapInstance: google.maps.Map | null = null;
	let infoWindow: google.maps.InfoWindow | null = null;
	let heatmapController: HeatmapOverlayController | null = null;
	let floodPolygonEntries: { definition: FloodZoneDefinition; polygon: google.maps.Polygon }[] = [];
	let shelterMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
	let userIncidentMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
	let draftMarker: google.maps.marker.AdvancedMarkerElement | null = null;
	let routePolylines: google.maps.Polyline[] = [];
	let routeViaMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

	function clearShelterMarkers(): void {
		for (const m of shelterMarkers) {
			m.map = null;
		}
		shelterMarkers = [];
	}

	function clearRoutePolylines(): void {
		for (const line of routePolylines) {
			line.setMap(null);
		}
		routePolylines = [];
		for (const m of routeViaMarkers) {
			m.map = null;
		}
		routeViaMarkers = [];
	}

	function createOrMoveDraftMarker(pos: google.maps.LatLngLiteral): void {
		if (!gmpLibs || !mapInstance) return;
		if (!draftMarker) {
			const pin = new gmpLibs.marker.PinElement({
				glyphText: '!',
				glyphColor: '#ffffff',
				background: '#dc2626',
				borderColor: '#ffffff',
				scale: 1.15
			});
			draftMarker = new gmpLibs.marker.AdvancedMarkerElement({
				map: mapInstance,
				position: pos,
				title: 'Selected Incident / Evacuation Origin',
				content: pin
			});
			draftMarker.addListener('click', () => {
				if (!infoWindow || !mapInstance || !draftMarker) return;
				const content = buildSafeInfoWindowContent({
					badge: 'Selected Origin / Incident',
					badgeColor: '#dc2626',
					title: draftReport.address,
					subtitle: `${draftReport.lat.toFixed(5)}, ${draftReport.lng.toFixed(5)}`,
					rows: [
						{
							label: 'Elevation',
							value:
								draftReport.elevationMeters !== null
									? `${draftReport.elevationMeters.toFixed(2)} m`
									: 'Unavailable'
						},
						{
							label: 'Wind',
							value: `${draftReport.weather.windSpeedText} ${draftReport.weather.windDirectionText}`.trim()
						},
						{
							label: 'Precip',
							value:
								draftReport.weather.precipProbPercent !== null
									? `${draftReport.weather.precipProbPercent}% (${draftReport.weather.precipQpfText})`
									: draftReport.weather.precipQpfText
						}
					]
				});
				infoWindow.setContent(content);
				infoWindow.open({ map: mapInstance, anchor: draftMarker });
			});
		} else {
			draftMarker.position = pos;
		}
	}

	async function enrichLocationForIncident(pos: google.maps.LatLngLiteral): Promise<void> {
		const apiKey = (env.PUBLIC_GOOGLE_MAPS_API_KEY ?? '').trim();
		draftReport = {
			...draftReport,
			lat: pos.lat,
			lng: pos.lng,
			address: 'Resolving street address...',
			elevationNote: 'Querying Elevation API...',
			loading: true,
			errorMessage: null
		};
		createOrMoveDraftMarker(pos);

		if (!gmpLibs) {
			draftReport = {
				...draftReport,
				loading: false,
				errorMessage: 'Maps libraries not initialized yet.'
			};
			return;
		}

		try {
			const [addressResult, elevationResult, weatherResult] = await Promise.allSettled([
				reverseGeocodePoint(gmpLibs.geocoding, pos),
				fetchElevationPoint(gmpLibs.elevation, pos),
				fetchWeatherCurrentConditions(apiKey, pos.lat, pos.lng)
			]);

			const resolvedAddress =
				addressResult.status === 'fulfilled'
					? addressResult.value
					: `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)} (Miami, FL)`;

			const resolvedElevation =
				elevationResult.status === 'fulfilled'
					? elevationResult.value
					: { elevationMeters: null, elevationNote: 'Elevation lookup failed' };

			const resolvedWeather =
				weatherResult.status === 'fulfilled' ? weatherResult.value : DEFAULT_WEATHER;

			draftReport = {
				...draftReport,
				address: resolvedAddress,
				elevationMeters: resolvedElevation.elevationMeters,
				elevationNote: resolvedElevation.elevationNote,
				weather: resolvedWeather,
				loading: false,
				errorMessage: null
			};
		} catch (err) {
			draftReport = {
				...draftReport,
				loading: false,
				errorMessage: err instanceof Error ? err.message : 'Unable to enrich coordinates.'
			};
		}
	}

	function handleSubmitIncident(event: SubmitEvent): void {
		event.preventDefault();
		if (!gmpLibs || !mapInstance) return;

		const typeMeta = HAZARD_TYPES.find((t) => t.value === draftReport.hazardType);
		const newIncident: HazardIncident = {
			id: `user-inc-${Date.now()}`,
			lat: draftReport.lat,
			lng: draftReport.lng,
			weight: typeMeta?.defaultWeight ?? 5,
			type: draftReport.hazardType,
			address: draftReport.address,
			elevationMeters: draftReport.elevationMeters,
			weatherSummary: draftReport.weather.conditionText,
			windText: `${draftReport.weather.windSpeedText} ${draftReport.weather.windDirectionText}`.trim(),
			precipText:
				draftReport.weather.precipProbPercent !== null
					? `${draftReport.weather.precipProbPercent}% • ${draftReport.weather.precipQpfText}`
					: draftReport.weather.precipQpfText,
			reportedAt: 'Just now',
			isUserReported: true
		};

		incidents = [...incidents, newIncident];
		userReportedCount += 1;
		heatmapController?.updateIncidents(incidents);

		const pin = new gmpLibs.marker.PinElement({
			glyphText: '!',
			glyphColor: '#ffffff',
			background: '#b91c1c',
			borderColor: '#fef08a',
			scale: 0.95
		});
		const marker = new gmpLibs.marker.AdvancedMarkerElement({
			map: mapInstance,
			position: { lat: newIncident.lat, lng: newIncident.lng },
			title: `${newIncident.type} — ${newIncident.address}`,
			content: pin
		});
		marker.addListener('click', () => {
			if (!infoWindow || !mapInstance) return;
			const content = buildSafeInfoWindowContent({
				badge: newIncident.type,
				badgeColor: '#b91c1c',
				title: newIncident.address,
				subtitle: `Reported ${newIncident.reportedAt}`,
				rows: [
					{
						label: 'Elevation',
						value:
							newIncident.elevationMeters !== null
								? `${newIncident.elevationMeters.toFixed(2)} m`
								: 'N/A'
					},
					{ label: 'Wind', value: newIncident.windText || 'N/A' },
					{ label: 'Precipitation', value: newIncident.precipText || 'N/A' }
				]
			});
			infoWindow.setContent(content);
			infoWindow.open({ map: mapInstance, anchor: marker });
		});
		userIncidentMarkers.push(marker);

		reportSubmittedToast = `Logged "${newIncident.type}" at ${newIncident.address}. Heatmap updated (${incidents.length} reports).`;
		setTimeout(() => {
			reportSubmittedToast = null;
		}, 5000);
	}

	function renderShelterMarkers(list: ShelterPlace[]): void {
		if (!gmpLibs || !mapInstance) return;
		clearShelterMarkers();

		for (const shelter of list) {
			const isHospital = shelter.category === 'hospital';
			const pin = new gmpLibs.marker.PinElement({
				glyphText: isHospital ? 'H' : 'S',
				glyphColor: '#ffffff',
				background: isHospital ? '#059669' : '#0284c7',
				borderColor: '#ffffff',
				scale: selectedShelterId === shelter.id ? 1.2 : 1.0
			});

			const marker = new gmpLibs.marker.AdvancedMarkerElement({
				map: mapInstance,
				position: { lat: shelter.lat, lng: shelter.lng },
				title: shelter.displayName,
				content: pin
			});

			marker.addListener('click', () => {
				if (!infoWindow || !mapInstance) return;
				const ratingStr =
					shelter.rating !== null
						? `${shelter.rating.toFixed(1)} ★ (${shelter.userRatingCount ?? 0} reviews)`
						: 'No ratings listed';
				const content = buildSafeInfoWindowContent({
					badge: isHospital ? 'Emergency Hospital' : 'Civic Shelter / Center',
					badgeColor: isHospital ? '#059669' : '#0284c7',
					title: shelter.displayName,
					subtitle: shelter.formattedAddress,
					rows: [
						{ label: 'Rating', value: ratingStr },
						{ label: 'Status', value: shelter.businessStatus ?? 'OPERATIONAL' }
					],
					actionLabel: 'Route Evacuation Here',
					onAction: () => {
						infoWindow?.close();
						void routeToShelter(shelter);
					}
				});
				infoWindow.setContent(content);
				infoWindow.open({ map: mapInstance, anchor: marker });
			});

			shelterMarkers.push(marker);
		}
	}

	async function loadShelters(queryText: string, autoRouteNearest = false): Promise<void> {
		if (!gmpLibs) return;
		sheltersLoading = true;
		sheltersError = null;

		try {
			const center = { lat: draftReport.lat, lng: draftReport.lng };
			const found = await searchEmergencyShelters(gmpLibs.places, queryText, center);
			shelters = found;
			renderShelterMarkers(found);

			if (found.length === 0) {
				sheltersError = 'No hospitals or community shelters matched this query in Miami.';
				return;
			}

			if (autoRouteNearest) {
				// Pick nearest shelter outside active flood-hazard zones when possible
				const activePolygons = floodPolygonEntries;
				const ranked = [...found].sort((a, b) => {
					const aInside = activePolygons.some((p) =>
						gmpLibs!.geometry.poly.containsLocation(
							new gmpLibs!.core.LatLng(a.lat, a.lng),
							p.polygon
						)
					);
					const bInside = activePolygons.some((p) =>
						gmpLibs!.geometry.poly.containsLocation(
							new gmpLibs!.core.LatLng(b.lat, b.lng),
							p.polygon
						)
					);
					if (aInside !== bInside) return aInside ? 1 : -1;
					const da = Math.hypot(a.lat - center.lat, a.lng - center.lng);
					const db = Math.hypot(b.lat - center.lat, b.lng - center.lng);
					return da - db;
				});
				await routeToShelter(ranked[0]);
			}
		} catch (err) {
			sheltersError =
				err instanceof Error ? err.message : 'Places API (New) shelter search failed.';
		} finally {
			sheltersLoading = false;
		}
	}

	async function routeToShelter(shelter: ShelterPlace): Promise<void> {
		if (!gmpLibs || !mapInstance) return;
		selectedShelterId = shelter.id;
		renderShelterMarkers(shelters);

		routeLoading = true;
		routeError = null;
		clearRoutePolylines();

		try {
			const origin = { lat: draftReport.lat, lng: draftReport.lng };
			const originLabel = draftReport.address || `${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}`;

			const { route, summary } = await computeEvacuationRoute({
				routesLib: gmpLibs.routes,
				coreLib: gmpLibs.core,
				geometryLib: gmpLibs.geometry,
				origin,
				originLabel,
				shelter,
				avoidFloodZones,
				polygonEntries: floodPolygonEntries
			});

			const created = route.createPolylines({
				polylineOptions: {
					strokeColor: summary.intersectsFloodZone ? '#d97706' : '#0f766e',
					strokeWeight: 6,
					strokeOpacity: 0.92,
					zIndex: 10
				}
			});
			for (const line of created) {
				line.setMap(mapInstance);
				routePolylines.push(line);
			}

			if (route.viewport) {
				mapInstance.fitBounds(route.viewport, { top: 48, right: 48, bottom: 84, left: 48 });
			} else {
				const bounds = new gmpLibs.core.LatLngBounds();
				bounds.extend(origin);
				bounds.extend({ lat: shelter.lat, lng: shelter.lng });
				mapInstance.fitBounds(bounds, 64);
			}

			routeSummary = summary;
		} catch (err) {
			routeError =
				err instanceof Error ? err.message : 'Unable to calculate evacuation route via Routes API.';
		} finally {
			routeLoading = false;
		}
	}

	function toggleHeatmapLayer(): void {
		showHeatmap = !showHeatmap;
		heatmapController?.setVisible(showHeatmap);
	}

	function toggleFloodPolygons(): void {
		showFloodPolygons = !showFloodPolygons;
		for (const entry of floodPolygonEntries) {
			entry.polygon.setMap(showFloodPolygons ? mapInstance : null);
		}
	}

	async function handleAvoidFloodToggle(): Promise<void> {
		avoidFloodZones = !avoidFloodZones;
		if (selectedShelterId) {
			const current = shelters.find((s) => s.id === selectedShelterId);
			if (current) {
				await routeToShelter(current);
			}
		}
	}

	async function handleFindSafeShelterClick(): Promise<void> {
		await loadShelters(shelterQuery, true);
	}

	function handleShelterSearchSubmit(event: SubmitEvent): void {
		event.preventDefault();
		void loadShelters(shelterQuery, false);
	}

	onMount(() => {
		let disposed = false;
		const mapListeners: google.maps.MapsEventListener[] = [];

		async function bootstrapApp(): Promise<void> {
			const apiKey = (env.PUBLIC_GOOGLE_MAPS_API_KEY ?? '').trim();
			if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
				missingApiKey = true;
				initError =
					'Missing PUBLIC_GOOGLE_MAPS_API_KEY in .env. Add a Google Maps Demo Key or Cloud API key to activate the Miami map, Places, Routes, Geocoding, Elevation, and Weather services.';
				return;
			}

			if (!mapContainerEl) return;

			try {
				ensureMapsConfigured(apiKey);
				const libs = await loadAllGmpLibraries();
				if (disposed) return;

				gmpLibs = libs;

				const map = new libs.maps.Map(mapContainerEl, {
					center: MIAMI_CENTER,
					zoom: 13,
					mapId: 'DEMO_MAP_ID',
					mapTypeControl: false,
					streetViewControl: false,
					fullscreenControl: true,
					clickableIcons: false,
					internalUsageAttributionIds: [ATTRIBUTION_ID]
				});
				mapInstance = map;
				infoWindow = new libs.maps.InfoWindow();

				// Render Miami Flood-Hazard Zone Polygons
				floodPolygonEntries = FLOOD_ZONES.map((zone) => {
					const polygon = new libs.maps.Polygon({
						paths: zone.paths,
						strokeColor: zone.strokeColor,
						strokeOpacity: 0.85,
						strokeWeight: 2,
						fillColor: zone.fillColor,
						fillOpacity: 0.24,
						clickable: true,
						zIndex: 4,
						map: showFloodPolygons ? map : null
					});

					const polyListener = polygon.addListener('click', (e: google.maps.PolyMouseEvent) => {
						if (!infoWindow || !mapInstance || !e.latLng) return;
						const content = buildSafeInfoWindowContent({
							badge: `${zone.severity} Flood Zone`,
							badgeColor: zone.strokeColor,
							title: zone.name,
							rows: [{ label: 'Advisory', value: zone.description }]
						});
						infoWindow.setContent(content);
						infoWindow.setPosition(e.latLng);
						infoWindow.open(mapInstance);
					});
					mapListeners.push(polyListener);

					return { definition: zone, polygon };
				});

				// Initialize deck.gl HeatmapLayer via GoogleMapsOverlay (with graceful headless fallback)
				heatmapController = new HeatmapOverlayController(map, libs.maps);
				heatmapMode = await heatmapController.init(incidents);
				if (disposed) return;

				// Mount native PlaceAutocompleteElement (gmp-select -> toPlace() -> fetchFields())
				if (autocompleteSlotEl) {
					const autocompleteEl = new libs.places.PlaceAutocompleteElement({
						includedRegionCodes: ['us'],
						locationBias: {
							center: MIAMI_CENTER,
							radius: 25000
						}
					});
					autocompleteEl.style.width = '100%';
					autocompleteEl.addEventListener('gmp-select', async (rawEvent: Event) => {
						const selectEvent = rawEvent as google.maps.places.PlacePredictionSelectEvent;
						if (!selectEvent.placePrediction) return;
						const place = selectEvent.placePrediction.toPlace();
						await place.fetchFields({
							fields: ['displayName', 'formattedAddress', 'location']
						});
						if (!place.location) return;
						const coords = { lat: place.location.lat(), lng: place.location.lng() };
						map.panTo(coords);
						map.setZoom(14);
						await enrichLocationForIncident(coords);
						if (selectedShelterId) {
							const activeShelter = shelters.find((s) => s.id === selectedShelterId);
							if (activeShelter) {
								await routeToShelter(activeShelter);
							}
						}
					});
					autocompleteSlotEl.replaceChildren(autocompleteEl);
				}

				// Click anywhere on the map to geotag + enrich an incident report
				const clickListener = map.addListener('click', (event: google.maps.MapMouseEvent) => {
					if (!event.latLng) return;
					const clicked = { lat: event.latLng.lat(), lng: event.latLng.lng() };
					void enrichLocationForIncident(clicked);
				});
				mapListeners.push(clickListener);

				mapReady = true;

				// Initial Miami weather pill + center enrichment + live nearby emergency shelters + initial safe route
				const [weatherSnapshot] = await Promise.all([
					fetchWeatherCurrentConditions(apiKey, MIAMI_CENTER.lat, MIAMI_CENTER.lng),
					enrichLocationForIncident(MIAMI_CENTER),
					loadShelters(shelterQuery, true)
				]);
				if (!disposed) {
					miamiWeatherPill = weatherSnapshot;
				}
			} catch (err) {
				if (!disposed) {
					initError =
						err instanceof Error
							? err.message
							: 'Failed to initialize Google Maps Platform services.';
				}
			}
		}

		void bootstrapApp();

		return () => {
			disposed = true;
			for (const listener of mapListeners) {
				listener.remove();
			}
			heatmapController?.destroy();
			clearShelterMarkers();
			clearRoutePolylines();
			for (const m of userIncidentMarkers) {
				m.map = null;
			}
			if (draftMarker) {
				draftMarker.map = null;
			}
			for (const entry of floodPolygonEntries) {
				entry.polygon.setMap(null);
			}
		};
	});
</script>

<div class="app-shell">
	<header class="top-header">
		<div class="brand-group">
			<div class="brand-icon" aria-hidden="true">
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2">
					<path d="M12 2L3 7v6c0 5.25 3.83 10.15 9 11 5.17-.85 9-5.75 9-11V7l-9-5z" />
					<path d="M8 13c1.2-1 2.4-1 3.6 0s2.4 1 3.6 0" />
				</svg>
			</div>
			<div class="brand-title-wrap">
				<h1 class="brand-title">Miami Civic Flood &amp; Shelter Router</h1>
				<span class="brand-subtitle">
					Hazard Heatmap • Incident Enricher • Flood-Bypass Evacuation
				</span>
			</div>
		</div>

		<div class="header-controls">
			<div class="weather-pill" title="Live Miami Weather API conditions">
				<span
					class="status-dot"
					class:warning={(miamiWeatherPill.precipProbPercent ?? 0) >= 40}
				></span>
				{#if miamiWeatherPill.isAvailable}
					<span>
						Miami: {miamiWeatherPill.temperatureDisplay} • {miamiWeatherPill.conditionText} • Wind {miamiWeatherPill.windSpeedText}
					</span>
				{:else}
					<span>Miami Hazard Monitor • Active</span>
				{/if}
			</div>

			<button
				id="layer-toggle-heatmap"
				data-testid="layer-toggle-heatmap"
				type="button"
				class="layer-toggle-btn"
				class:active={showHeatmap}
				aria-pressed={showHeatmap}
				onclick={toggleHeatmapLayer}
			>
				Heatmap ({incidents.length})
			</button>

			<button
				id="layer-toggle-polygons"
				data-testid="layer-toggle-polygons"
				type="button"
				class="layer-toggle-btn"
				class:active={showFloodPolygons}
				aria-pressed={showFloodPolygons}
				onclick={toggleFloodPolygons}
			>
				Flood Zones ({FLOOD_ZONES.length})
			</button>

			<button
				id="find-shelter-btn"
				data-testid="find-shelter-btn"
				type="button"
				class="primary-cta"
				disabled={!mapReady || sheltersLoading || routeLoading}
				onclick={handleFindSafeShelterClick}
			>
				{routeLoading ? 'Routing...' : 'Find Safe Shelter'}
			</button>

			<button
				type="button"
				class="mobile-drawer-btn"
				aria-label="Toggle civic control sidebar"
				onclick={() => (mobileSidebarOpen = !mobileSidebarOpen)}
			>
				{mobileSidebarOpen ? 'Map' : 'Controls'}
			</button>
		</div>
	</header>

	<main class="workspace">
		<aside class="sidebar" class:open={mobileSidebarOpen}>
			<!-- [A] Civic Incident Reporter -->
			<section
				id="incident-report-panel"
				data-testid="incident-report-panel"
				class="card"
				aria-label="Civic Incident Reporter"
			>
				<div class="card-header">
					<div class="card-title-group">
						<span class="card-badge-num">A</span>
						<h2 class="card-title">Civic Incident Reporter</h2>
					</div>
					<span class="tag tag-red">
						{userReportedCount > 0 ? `+${userReportedCount} Logged` : 'Click Map'}
					</span>
				</div>

				<p class="hint-text">
					Click anywhere on the Miami map to geotag an incident. Address, terrain elevation, and
					live storm telemetry populate automatically.
				</p>

				<div class="telemetry-grid">
					<div class="telemetry-box full">
						<span class="telemetry-label">Reverse-Geocoded Location</span>
						<span class="telemetry-value">{draftReport.address}</span>
						<span class="telemetry-sub">
							{draftReport.lat.toFixed(5)}, {draftReport.lng.toFixed(5)}
						</span>
					</div>

					<div class="telemetry-box">
						<span class="telemetry-label">Terrain Elevation</span>
						<span class="telemetry-value">
							{draftReport.elevationMeters !== null
								? `${draftReport.elevationMeters.toFixed(2)} m`
								: draftReport.loading
									? 'Loading...'
									: '--'}
						</span>
						<span class="telemetry-sub">{draftReport.elevationNote}</span>
					</div>

					<div class="telemetry-box">
						<span class="telemetry-label">Live Wind &amp; Rain</span>
						<span class="telemetry-value">
							{draftReport.weather.isAvailable
								? `${draftReport.weather.windSpeedText} ${draftReport.weather.windDirectionText}`.trim()
								: draftReport.loading
									? 'Loading...'
									: 'Unavailable'}
						</span>
						<span class="telemetry-sub">
							{#if draftReport.weather.isAvailable}
								Gust {draftReport.weather.windGustText} • Rain{' '}
								{draftReport.weather.precipProbPercent !== null
									? `${draftReport.weather.precipProbPercent}%`
									: '--'} ({draftReport.weather.precipQpfText})
							{:else}
								{draftReport.weather.statusNote ?? 'Weather API pending'}
							{/if}
						</span>
					</div>
				</div>

				{#if draftReport.errorMessage}
					<p class="hint-text" style="color: #b91c1c;">{draftReport.errorMessage}</p>
				{/if}

				<form onsubmit={handleSubmitIncident} style="display: grid; gap: 8px;">
					<label class="field-label">
						Hazard Category
						<select
							id="incident-type-select"
							data-testid="incident-type-select"
							class="select-input"
							bind:value={draftReport.hazardType}
						>
							{#each HAZARD_TYPES as item}
								<option value={item.value}>{item.label}</option>
							{/each}
						</select>
					</label>

					<button
						id="incident-submit-btn"
						data-testid="incident-submit-btn"
						type="submit"
						class="submit-btn"
						disabled={!mapReady || draftReport.loading}
					>
						Log Hazard Report to Heatmap
					</button>
				</form>

				{#if reportSubmittedToast}
					<div class="tag tag-green" role="status" style="border-radius: 8px; padding: 6px 10px;">
						{reportSubmittedToast}
					</div>
				{/if}
			</section>

			<!-- [B] Safe Shelter Evacuation Route Summary -->
			<section
				id="route-summary-card"
				data-testid="route-summary-card"
				class="card"
				aria-label="Safe Shelter Evacuation Route Summary"
			>
				<div class="card-header">
					<div class="card-title-group">
						<span class="card-badge-num">B</span>
						<h2 class="card-title">Evacuation Route Summary</h2>
					</div>
					{#if routeSummary}
						{#if !routeSummary.intersectsFloodZone}
							<span class="tag tag-green">Flood-Zone Bypass Verified</span>
						{:else}
							<span class="tag tag-amber">Crosses Flood Zone</span>
						{/if}
					{:else}
						<span class="tag tag-slate">Ready</span>
					{/if}
				</div>

				<label class="toggle-row">
					<span>Avoid Active Flood-Hazard Polygons</span>
					<input
						id="avoid-flood-toggle"
						data-testid="avoid-flood-toggle"
						type="checkbox"
						checked={avoidFloodZones}
						onchange={handleAvoidFloodToggle}
					/>
				</label>

				{#if routeLoading}
					<p class="hint-text">Computing evacuation corridor via Routes API...</p>
				{:else if routeError}
					<p class="hint-text" style="color: #b91c1c;">{routeError}</p>
				{:else if routeSummary}
					<div class="telemetry-box">
						<span class="telemetry-label">Destination Shelter</span>
						<span class="telemetry-value">{routeSummary.shelterName}</span>
						<span class="telemetry-sub">{routeSummary.shelterAddress}</span>
					</div>

					<div class="route-metrics">
						<div class="metric-card">
							<span class="telemetry-label">Estimated ETA</span>
							<div class="metric-val">{routeSummary.durationText}</div>
						</div>
						<div class="metric-card">
							<span class="telemetry-label">Route Distance</span>
							<div class="metric-val">{routeSummary.distanceText}</div>
						</div>
					</div>

					{#if routeSummary.usedBypassWaypoint}
						<div class="tag tag-blue" style="border-radius: 8px; padding: 6px 9px;">
							Detour Active: {routeSummary.bypassWaypointLabel} (via-waypoint injected)
						</div>
					{:else if routeSummary.intersectsFloodZone}
						<div class="tag tag-amber" style="border-radius: 8px; padding: 6px 9px;">
							Intersects: {routeSummary.intersectedZoneNames.join(', ')}
						</div>
					{/if}

					{#if routeSummary.stepPreviews.length > 0}
						<ol class="step-list">
							{#each routeSummary.stepPreviews as step}
								<li>
									{step.instruction}
									{#if step.distanceText}
										<span> ({step.distanceText})</span>
									{/if}
								</li>
							{/each}
						</ol>
					{/if}
				{:else}
					<p class="hint-text">
						Click <strong>Find Safe Shelter</strong> or select any hospital/community center below
						to calculate a flood-avoiding evacuation route.
					</p>
				{/if}
			</section>

			<!-- [C] Live Nearby Emergency Shelters -->
			<section
				id="shelter-list"
				data-testid="shelter-list"
				class="card"
				aria-label="Live Nearby Emergency Shelters"
			>
				<div class="card-header">
					<div class="card-title-group">
						<span class="card-badge-num">C</span>
						<h2 class="card-title">Nearby Emergency Shelters</h2>
					</div>
					<span class="tag tag-blue">{shelters.length} Found</span>
				</div>

				<div class="field-label">
					Jump Origin via Place Autocomplete
					<div bind:this={autocompleteSlotEl} class="autocomplete-slot"></div>
				</div>

				<form class="search-row" onsubmit={handleShelterSearchSubmit}>
					<input
						id="shelter-search-input"
						data-testid="shelter-search-input"
						type="text"
						class="text-input"
						bind:value={shelterQuery}
						placeholder="Search hospitals or community centers..."
						aria-label="Search nearby hospitals or community centers"
					/>
					<button
						type="submit"
						class="secondary-btn"
						disabled={!mapReady || sheltersLoading}
					>
						{sheltersLoading ? '...' : 'Search'}
					</button>
				</form>

				{#if sheltersError}
					<p class="hint-text" style="color: #b91c1c;">{sheltersError}</p>
				{/if}

				<div class="shelter-items">
					{#each shelters as shelter}
						<article
							class="shelter-item"
							class:selected={selectedShelterId === shelter.id}
						>
							<div class="shelter-top">
								<span class="shelter-name">{shelter.displayName}</span>
								<span class="tag {shelter.category === 'hospital' ? 'tag-green' : 'tag-blue'}">
									{shelter.category === 'hospital' ? 'Hospital' : 'Shelter'}
								</span>
							</div>
							<div class="shelter-address">{shelter.formattedAddress}</div>
							<div class="shelter-footer">
								<span class="shelter-meta">
									{#if shelter.rating !== null}
										{shelter.rating.toFixed(1)} ★ ({shelter.userRatingCount ?? 0})
									{:else}
										{shelter.businessStatus ?? 'Active'}
									{/if}
								</span>
								<button
									type="button"
									class="route-btn"
									disabled={routeLoading}
									onclick={() => void routeToShelter(shelter)}
								>
									Route Here
								</button>
							</div>
						</article>
					{/each}
				</div>
			</section>
		</aside>

		<section class="map-stage" aria-label="Interactive Miami Hazard Map">
			<div id="map-container" data-testid="map-container" bind:this={mapContainerEl} class="map-container"></div>

			{#if initError}
				<div class="banner-overlay" class:error={!missingApiKey} role="alert">
					<strong>{missingApiKey ? 'API Key Setup Required' : 'Map Initialization Notice'}:</strong>
					{initError}
				</div>
			{/if}

			<div class="map-legend">
				<div class="legend-header">
					<span>Miami Flood &amp; Shelter Legend</span>
					<span class="tag tag-slate">
						{heatmapMode === 'deckgl-webgl2' ? 'deck.gl WebGL2' : 'Canvas Thermal'}
					</span>
				</div>
				<div class="legend-items">
					<div class="legend-row">
						<span class="swatch swatch-heat"></span>
						<span>Incident Heatmap</span>
					</div>
					<div class="legend-row">
						<span class="swatch swatch-poly"></span>
						<span>Flood-Hazard Zone</span>
					</div>
					<div class="legend-row">
						<span class="swatch swatch-route"></span>
						<span>Evacuation Route</span>
					</div>
					<div class="legend-row">
						<span class="swatch swatch-hosp"></span>
						<span>Hospital (H)</span>
					</div>
					<div class="legend-row">
						<span class="swatch swatch-shelter"></span>
						<span>Community Shelter (S)</span>
					</div>
					<div class="legend-row">
						<span class="swatch swatch-incident"></span>
						<span>Reported Incident (!)</span>
					</div>
				</div>
				<div class="disclaimer-note">
					Informational civic planning tool only — not an official 911 or emergency dispatch
					system. Follow Miami-Dade Emergency Management directives or dial 911 in emergencies.
				</div>
			</div>
		</section>
	</main>
</div>
