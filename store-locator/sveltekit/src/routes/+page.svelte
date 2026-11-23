<script lang="ts">
	import { onDestroy } from 'svelte';
	import { env } from '$env/dynamic/public';
	import HeaderBar from '$lib/components/HeaderBar.svelte';
	import LocatorMap from '$lib/components/LocatorMap.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import type { LoadedMapsLibraries } from '$lib/maps/loader';
	import {
		fetchNycCandidateBranches,
		fetchOriginSuggestions,
		geocodeOriginAddress,
		resolvePlacePrediction
	} from '$lib/maps/places';
	import { computeBranchRouteMatrix, computeSelectedRoute } from '$lib/maps/routes';
	import {
		NYC_DEFAULT_ORIGIN,
		type ActiveRouteInfo,
		type AutocompleteOption,
		type BranchFilterType,
		type BranchLocation,
		type OriginLocation,
		type ServiceTag,
		type TravelModeChoice
	} from '$lib/types';

	const apiKey = (env.PUBLIC_GOOGLE_MAPS_API_KEY ?? '').trim();

	let libs: LoadedMapsLibraries | null = $state(null);
	let origin = $state<OriginLocation>({ ...NYC_DEFAULT_ORIGIN });
	let allBranches = $state<BranchLocation[]>([]);
	let activeTypeFilter = $state<BranchFilterType>('all');
	let activeServices = $state<ServiceTag[]>([]);
	let travelMode = $state<TravelModeChoice>('DRIVE');
	let selectedBranchId = $state<string | null>(null);
	let activeRoute = $state<ActiveRouteInfo | null>(null);
	let activeRouteInstance = $state<google.maps.routes.Route | null>(null);

	let searchQuery = $state('');
	let suggestions = $state<AutocompleteOption[]>([]);
	let showDropdown = $state(false);

	let isLoadingBranches = $state(false);
	let isComputingMatrix = $state(false);
	let isRouting = $state(false);
	let errorMessage = $state<string | null>(null);

	let sessionToken: google.maps.places.AutocompleteSessionToken | null = null;
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let matrixSeq = 0;
	let routeSeq = 0;
	let suggestSeq = 0;

	let filteredBranches = $derived.by(() => {
		const filtered = allBranches.filter((branch) => {
			if (activeTypeFilter !== 'all' && branch.type !== activeTypeFilter) {
				return false;
			}
			for (const reqSvc of activeServices) {
				if (!branch.services.includes(reqSvc)) {
					return false;
				}
			}
			return true;
		});

		return [...filtered].sort((a, b) => {
			const aDur = a.durationMillis ?? Number.POSITIVE_INFINITY;
			const bDur = b.durationMillis ?? Number.POSITIVE_INFINITY;
			return aDur - bDur;
		});
	});

	let fastestBranch = $derived.by(() => {
		if (filteredBranches.length === 0) return null;
		const withDuration = filteredBranches.find((b) => b.durationMillis !== null);
		return withDuration ?? filteredBranches[0];
	});

	function buildGoogleMapsDirUrl(
		from: OriginLocation,
		to: BranchLocation,
		mode: TravelModeChoice
	): string {
		const modeParam =
			mode === 'WALK' ? 'walking' : mode === 'TRANSIT' ? 'transit' : 'driving';
		return `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=${modeParam}`;
	}

	async function refreshRouteMatrix(
		currentOrigin: OriginLocation,
		branchesToMeasure: BranchLocation[],
		mode: TravelModeChoice
	): Promise<void> {
		if (!libs || branchesToMeasure.length === 0) return;

		const currentSeq = ++matrixSeq;
		isComputingMatrix = true;

		try {
			const matrixMap = await computeBranchRouteMatrix(
				libs.routes,
				libs.core,
				currentOrigin,
				branchesToMeasure,
				mode
			);

			if (currentSeq !== matrixSeq) return;

			allBranches = allBranches.map((branch) => {
				const entry = matrixMap.get(branch.id);
				if (!entry) return branch;
				return {
					...branch,
					durationMillis: entry.durationMillis,
					distanceMeters: entry.distanceMeters,
					durationText: entry.durationText,
					distanceText: entry.distanceText
				};
			});
		} catch (error) {
			if (currentSeq !== matrixSeq) return;
			errorMessage =
				error instanceof Error
					? `Route Matrix error: ${error.message}`
					: 'Unable to calculate road travel times.';
		} finally {
			if (currentSeq === matrixSeq) {
				isComputingMatrix = false;
			}
		}
	}

	async function computeRouteToBranch(branch: BranchLocation): Promise<void> {
		if (!libs) return;

		const currentSeq = ++routeSeq;
		selectedBranchId = branch.id;
		isRouting = true;
		errorMessage = null;

		try {
			const result = await computeSelectedRoute(
				libs.routes,
				libs.core,
				origin,
				branch,
				travelMode
			);

			if (currentSeq !== routeSeq) return;

			if (!result) {
				activeRouteInstance = null;
				activeRoute = null;
				errorMessage = `No ${travelMode.toLowerCase()} route could be found to ${branch.name}.`;
				return;
			}

			activeRouteInstance = result.route;
			activeRoute = {
				branchId: branch.id,
				branchName: branch.name,
				branchType: branch.type,
				travelMode,
				durationText: result.durationText,
				distanceText: result.distanceText,
				durationMillis: result.durationMillis,
				distanceMeters: result.distanceMeters,
				googleMapsUrl: buildGoogleMapsDirUrl(origin, branch, travelMode)
			};
		} catch (error) {
			if (currentSeq !== routeSeq) return;
			errorMessage =
				error instanceof Error
					? `Route computation error: ${error.message}`
					: 'Unable to compute route polyline.';
		} finally {
			if (currentSeq === routeSeq) {
				isRouting = false;
			}
		}
	}

	async function handleLibrariesReady(loaded: LoadedMapsLibraries): Promise<void> {
		libs = loaded;
		isLoadingBranches = true;
		errorMessage = null;

		try {
			const discovered = await fetchNycCandidateBranches(loaded.places);
			allBranches = discovered;
			isLoadingBranches = false;

			if (discovered.length > 0) {
				await refreshRouteMatrix(origin, discovered, travelMode);
			}
		} catch (error) {
			isLoadingBranches = false;
			errorMessage =
				error instanceof Error
					? `Places search error: ${error.message}`
					: 'Failed to load live NYC branch locations.';
		}
	}

	function handleQueryInput(value: string): void {
		searchQuery = value;

		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		if (!libs || value.trim().length < 2) {
			suggestions = [];
			showDropdown = false;
			return;
		}

		const activeLibs = libs;
		const seq = ++suggestSeq;

		debounceTimer = setTimeout(async () => {
			try {
				if (!sessionToken) {
					sessionToken = new activeLibs.places.AutocompleteSessionToken();
				}
				const results = await fetchOriginSuggestions(
					activeLibs.places,
					value,
					sessionToken,
					origin
				);
				if (seq !== suggestSeq) return;
				suggestions = results;
				showDropdown = results.length > 0;
			} catch (error) {
				if (seq !== suggestSeq) return;
				suggestions = [];
				showDropdown = false;
				errorMessage =
					error instanceof Error
						? `Autocomplete error: ${error.message}`
						: 'Unable to fetch autocomplete suggestions.';
			}
		}, 220);
	}

	async function applyNewOrigin(nextOrigin: OriginLocation): Promise<void> {
		origin = nextOrigin;
		errorMessage = null;
		await refreshRouteMatrix(nextOrigin, allBranches, travelMode);

		if (selectedBranchId) {
			const current = allBranches.find((b) => b.id === selectedBranchId);
			if (current) {
				await computeRouteToBranch(current);
			}
		}
	}

	async function handleSelectSuggestion(option: AutocompleteOption): Promise<void> {
		showDropdown = false;
		suggestions = [];
		searchQuery = option.fullText;

		try {
			const resolved = await resolvePlacePrediction(option.placePrediction);
			sessionToken = null;
			if (resolved) {
				await applyNewOrigin(resolved);
			}
		} catch (error) {
			sessionToken = null;
			errorMessage =
				error instanceof Error
					? `Place lookup error: ${error.message}`
					: 'Could not resolve selected location.';
		}
	}

	async function handleSubmitQuery(): Promise<void> {
		if (!libs) return;

		if (suggestions.length > 0) {
			await handleSelectSuggestion(suggestions[0]);
			return;
		}

		showDropdown = false;
		const trimmed = searchQuery.trim();
		if (!trimmed) return;

		try {
			const geocoded = await geocodeOriginAddress(libs.geocoding, trimmed);
			if (!geocoded) {
				errorMessage = `Could not find "${trimmed}" in New York City. Try a street address or landmark.`;
				return;
			}
			await applyNewOrigin(geocoded);
		} catch (error) {
			errorMessage =
				error instanceof Error
					? `Geocoding error: ${error.message}`
					: 'Unable to geocode origin address.';
		}
	}

	async function handleNativePlaceSelected(nextOrigin: OriginLocation): Promise<void> {
		searchQuery = nextOrigin.address;
		showDropdown = false;
		suggestions = [];
		await applyNewOrigin(nextOrigin);
	}

	async function handleOriginPreset(preset: OriginLocation): Promise<void> {
		searchQuery = preset.address;
		showDropdown = false;
		suggestions = [];
		await applyNewOrigin({ ...preset });
	}

	async function handleTravelModeChange(nextMode: TravelModeChoice): Promise<void> {
		travelMode = nextMode;
		await refreshRouteMatrix(origin, allBranches, nextMode);

		if (selectedBranchId) {
			const current = allBranches.find((b) => b.id === selectedBranchId);
			if (current) {
				await computeRouteToBranch(current);
			}
		}
	}

	function handleTypeFilterChange(nextType: BranchFilterType): void {
		activeTypeFilter = nextType;
		if (
			selectedBranchId &&
			!allBranches.some(
				(b) =>
					b.id === selectedBranchId &&
					(nextType === 'all' || b.type === nextType) &&
					activeServices.every((s) => b.services.includes(s))
			)
		) {
			selectedBranchId = null;
			activeRoute = null;
			activeRouteInstance = null;
		}
	}

	function handleToggleService(service: ServiceTag): void {
		const exists = activeServices.includes(service);
		const nextServices = exists
			? activeServices.filter((s) => s !== service)
			: [...activeServices, service];
		activeServices = nextServices;

		if (
			selectedBranchId &&
			!allBranches.some(
				(b) =>
					b.id === selectedBranchId &&
					(activeTypeFilter === 'all' || b.type === activeTypeFilter) &&
					nextServices.every((s) => b.services.includes(s))
			)
		) {
			selectedBranchId = null;
			activeRoute = null;
			activeRouteInstance = null;
		}
	}

	async function handleRouteToFastest(): Promise<void> {
		if (!fastestBranch) return;
		await computeRouteToBranch(fastestBranch);
	}

	onDestroy(() => {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}
	});
</script>

<div class="app-shell">
	<HeaderBar
		{searchQuery}
		{suggestions}
		{showDropdown}
		{travelMode}
		hasFastestBranch={fastestBranch !== null}
		{isRouting}
		placesLibrary={libs?.places ?? null}
		onQueryInput={handleQueryInput}
		onSelectSuggestion={handleSelectSuggestion}
		onSubmitQuery={handleSubmitQuery}
		onTravelModeChange={handleTravelModeChange}
		onRouteToFastest={handleRouteToFastest}
		onNativePlaceSelected={handleNativePlaceSelected}
	/>

	<main class="main-workspace">
		<Sidebar
			{origin}
			branches={filteredBranches}
			totalBranchesCount={allBranches.length}
			{selectedBranchId}
			fastestBranchId={fastestBranch?.id ?? null}
			{activeTypeFilter}
			{activeServices}
			{activeRoute}
			{isLoadingBranches}
			{isComputingMatrix}
			{errorMessage}
			onTypeFilterChange={handleTypeFilterChange}
			onToggleService={handleToggleService}
			onSelectBranch={computeRouteToBranch}
			onSelectOriginPreset={handleOriginPreset}
		/>

		<LocatorMap
			{apiKey}
			{origin}
			branches={filteredBranches}
			{selectedBranchId}
			fastestBranchId={fastestBranch?.id ?? null}
			{activeRouteInstance}
			onLibrariesReady={handleLibrariesReady}
			onMapError={(msg) => {
				errorMessage = msg;
			}}
			onSelectBranch={computeRouteToBranch}
		/>
	</main>
</div>
