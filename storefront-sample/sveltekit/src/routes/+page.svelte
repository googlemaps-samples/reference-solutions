<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import { env } from '$env/dynamic/public';
	import ClinicHeader from '$lib/components/ClinicHeader.svelte';
	import VenueDetailsCard from '$lib/components/VenueDetailsCard.svelte';
	import DirectionsCard from '$lib/components/DirectionsCard.svelte';
	import BookingFormCard from '$lib/components/BookingFormCard.svelte';
	import MapStage from '$lib/components/MapStage.svelte';
	import {
		CLINIC_FALLBACK_COORDS,
		CLINIC_SEED_QUERY,
		DEFAULT_ORIGIN,
		GMP_ATTRIBUTION_ID,
		HOME_VISIT_RADIUS_METERS,
		computeRouteToClinic,
		createClinicPinElement,
		fetchClinicProfile,
		initEntranceStreetView,
		loadMapsLibraries,
		type LoadedMapsLibraries
	} from '$lib/maps/google-maps';
	import type {
		ClinicProfile,
		OriginLocation,
		RouteSummary,
		TravelModeOption,
		ViewMode
	} from '$lib/types/storefront';

	let mapContainer = $state<HTMLDivElement | null>(null);
	let streetViewContainer = $state<HTMLDivElement | null>(null);
	let autocompleteContainer = $state<HTMLDivElement | null>(null);

	let clinic = $state<ClinicProfile | null>(null);
	let loadingClinic = $state(true);
	let clinicError = $state<string | null>(null);

	let origin = $state<OriginLocation>({ ...DEFAULT_ORIGIN });
	let travelMode = $state<TravelModeOption>('DRIVING');
	let routeSummary = $state<RouteSummary | null>(null);
	let routeLoading = $state(false);
	let routeError = $state<string | null>(null);

	let showCoverage = $state(true);
	let viewMode = $state<ViewMode>('map');
	let streetViewAvailable = $state(false);
	let streetViewDescription = $state('450 Sutter St entrance');

	let missingApiKey = $state(false);
	let mapError = $state<string | null>(null);

	let libs: LoadedMapsLibraries | null = null;
	let map: google.maps.Map | null = null;
	let coverageCircle: google.maps.Circle | null = null;
	let clinicMarker: google.maps.marker.AdvancedMarkerElement | null = null;
	let originMarker: google.maps.marker.AdvancedMarkerElement | null = null;
	let activePolylines: google.maps.Polyline[] = [];
	let panorama: google.maps.StreetViewPanorama | null = null;
	let autocompleteEl: google.maps.places.PlaceAutocompleteElement | null = null;

	function clearRoutePolylines() {
		for (const polyline of activePolylines) {
			polyline.setMap(null);
		}
		activePolylines = [];
	}

	async function updateRoute(currentOrigin: OriginLocation, mode: TravelModeOption) {
		if (!libs || !map) return;

		const destinationCoords = clinic?.location ?? CLINIC_FALLBACK_COORDS;
		const destinationLabel = clinic?.displayName ?? '450 Sutter Dental';

		routeLoading = true;
		routeError = null;
		clearRoutePolylines();

		try {
			const computed = await computeRouteToClinic(
				libs.routes,
				map,
				currentOrigin.location,
				currentOrigin.label,
				destinationCoords,
				destinationLabel,
				mode
			);
			activePolylines = computed.polylines;
			routeSummary = computed.summary;

			const { LatLngBounds } = libs.core;
			const bounds = new LatLngBounds();
			bounds.extend(currentOrigin.location);
			bounds.extend(destinationCoords);
			if (computed.path) {
				for (const point of computed.path) {
					bounds.extend({ lat: point.lat, lng: point.lng });
				}
			}
			map.fitBounds(bounds, { top: 64, right: 64, bottom: 64, left: 64 });
		} catch (err) {
			routeSummary = null;
			routeError =
				err instanceof Error
					? err.message
					: 'Unable to calculate route for the selected travel mode.';
		} finally {
			routeLoading = false;
		}
	}

	function updateOriginMarker(newOrigin: OriginLocation) {
		if (!libs || !map) return;
		const { AdvancedMarkerElement, PinElement } = libs.marker;

		if (!originMarker) {
			const pin = new PinElement({
				background: '#0d9488',
				borderColor: '#ffffff',
				glyphColor: '#ffffff',
				glyphText: 'A'
			});
			originMarker = new AdvancedMarkerElement({
				map,
				position: newOrigin.location,
				title: newOrigin.label,
				content: pin
			});
		} else {
			originMarker.position = newOrigin.location;
			originMarker.title = newOrigin.label;
		}
	}

	function handleToggleCoverage() {
		showCoverage = !showCoverage;
		if (coverageCircle && map) {
			coverageCircle.setMap(showCoverage ? map : null);
		}
	}

	async function applyViewMode(nextMode: ViewMode) {
		viewMode = nextMode;
		await tick();
		if (!libs) return;

		if (nextMode !== 'map' && panorama) {
			libs.core.event.trigger(panorama, 'resize');
		}
		if (nextMode !== 'streetview' && map) {
			libs.core.event.trigger(map, 'resize');
		}
	}

	function handleToggleStreetView() {
		const next: ViewMode = viewMode === 'map' ? 'split' : 'map';
		void applyViewMode(next);
	}

	function handleSelectTravelMode(mode: TravelModeOption) {
		travelMode = mode;
		void updateRoute(origin, mode);
	}

	function handleResetOrigin() {
		origin = { ...DEFAULT_ORIGIN };
		if (autocompleteEl) {
			try {
				autocompleteEl.value = DEFAULT_ORIGIN.label;
			} catch {
				// Ignore if web component restricts programmatic value assignment
			}
		}
		updateOriginMarker(origin);
		void updateRoute(origin, travelMode);
	}

	onMount(async () => {
		const apiKey = (env.PUBLIC_GOOGLE_MAPS_API_KEY ?? '').trim();
		if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
			missingApiKey = true;
			loadingClinic = false;
			return;
		}

		try {
			libs = await loadMapsLibraries(apiKey);
			if (!mapContainer) return;

			const { Map, Circle } = libs.maps;
			const { AdvancedMarkerElement } = libs.marker;
			const { PlaceAutocompleteElement } = libs.places;

			const mapOptions: google.maps.MapOptions & {
				internalUsageAttributionIds: string[];
			} = {
				center: CLINIC_FALLBACK_COORDS,
				zoom: 13,
				mapId: 'DEMO_MAP_ID',
				internalUsageAttributionIds: [GMP_ATTRIBUTION_ID],
				mapTypeControl: false,
				streetViewControl: false,
				fullscreenControl: true
			};

			map = new Map(mapContainer, mapOptions);

			// Mount PlaceAutocompleteElement imperatively inside its container
			if (autocompleteContainer) {
				const ac = new PlaceAutocompleteElement({
					includedRegionCodes: ['us'],
					locationBias: {
						center: CLINIC_FALLBACK_COORDS,
						radius: 25000
					}
				});
				ac.id = 'origin-autocomplete';
				ac.setAttribute('placeholder', 'Search San Francisco starting address...');
				try {
					ac.value = DEFAULT_ORIGIN.label;
				} catch {
					// Fallback handled by active origin caption
				}

				ac.addEventListener('gmp-select', async (event) => {
					const selectEvent = event as google.maps.places.PlacePredictionSelectEvent;
					const selectedPlace = selectEvent.placePrediction?.toPlace();
					if (!selectedPlace) return;

					try {
						await selectedPlace.fetchFields({
							fields: ['displayName', 'formattedAddress', 'location']
						});
						if (!selectedPlace.location) return;

						const nextOrigin: OriginLocation = {
							label:
								selectedPlace.displayName ??
								selectedPlace.formattedAddress ??
								'Selected Origin',
							address: selectedPlace.formattedAddress ?? '',
							location: {
								lat: selectedPlace.location.lat(),
								lng: selectedPlace.location.lng()
							}
						};
						origin = nextOrigin;
						updateOriginMarker(nextOrigin);
						await updateRoute(nextOrigin, travelMode);
					} catch (err) {
						routeError =
							err instanceof Error
								? err.message
								: 'Unable to load selected origin location.';
					}
				});

				autocompleteContainer.replaceChildren(ac);
				autocompleteEl = ac;
			}

			// Fetch live clinic profile from Places API (New)
			let clinicCoords = CLINIC_FALLBACK_COORDS;
			let clinicLabel = '450 Sutter Dental Collective';

			try {
				const profile = await fetchClinicProfile(libs.places, CLINIC_SEED_QUERY);
				clinic = profile;
				clinicCoords = profile.location;
				clinicLabel = profile.displayName;
			} catch (err) {
				clinicError =
					err instanceof Error ? err.message : 'Could not load Google Places profile.';
			} finally {
				loadingClinic = false;
			}

			map.setCenter(clinicCoords);

			clinicMarker = new AdvancedMarkerElement({
				map,
				position: clinicCoords,
				title: clinicLabel,
				content: createClinicPinElement(clinicLabel)
			});

			coverageCircle = new Circle({
				map: showCoverage ? map : null,
				center: clinicCoords,
				radius: HOME_VISIT_RADIUS_METERS,
				strokeColor: '#0f766e',
				strokeOpacity: 0.78,
				strokeWeight: 2,
				fillColor: '#14b8a6',
				fillOpacity: 0.12
			});

			updateOriginMarker(origin);

			if (streetViewContainer) {
				const svResult = await initEntranceStreetView(
					libs.streetView,
					libs.geometry,
					libs.core,
					streetViewContainer,
					clinicCoords
				);
				panorama = svResult.panorama;
				streetViewAvailable = svResult.available;
				streetViewDescription = svResult.description;
			}

			await updateRoute(origin, travelMode);
		} catch (err) {
			loadingClinic = false;
			mapError =
				err instanceof Error ? err.message : 'Failed to initialize Google Maps Platform.';
		}
	});

	onDestroy(() => {
		clearRoutePolylines();
		if (coverageCircle) {
			coverageCircle.setMap(null);
		}
		if (clinicMarker) {
			clinicMarker.map = null;
		}
		if (originMarker) {
			originMarker.map = null;
		}
	});
</script>

<div class="app-shell">
	<ClinicHeader
		{clinic}
		{loadingClinic}
		{showCoverage}
		{viewMode}
		{streetViewAvailable}
		onToggleCoverage={handleToggleCoverage}
		onToggleStreetView={handleToggleStreetView}
		onSelectViewMode={(mode) => void applyViewMode(mode)}
	/>

	<main class="workspace-grid">
		<aside class="sidebar-column" aria-label="Clinic details, directions, and appointment booking">
			<VenueDetailsCard {clinic} loading={loadingClinic} errorMessage={clinicError} />

			<DirectionsCard
				bind:autocompleteContainer
				{origin}
				{travelMode}
				{routeSummary}
				{routeLoading}
				{routeError}
				onSelectTravelMode={handleSelectTravelMode}
				onResetOrigin={handleResetOrigin}
			/>

			<BookingFormCard clinicName={clinic?.displayName ?? '450 Sutter Dental Collective'} />
		</aside>

		<section class="stage-column" aria-label="Interactive map and Street View preview">
			<MapStage
				bind:mapContainer
				bind:streetViewContainer
				{viewMode}
				{showCoverage}
				{missingApiKey}
				{mapError}
				{streetViewDescription}
			/>
		</section>
	</main>
</div>
