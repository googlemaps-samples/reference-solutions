import type {
	ComputedRouteSummary,
	LatLngPoint,
	ResolvedPlace,
	RouteModifiersState,
	TravelModeKey
} from '$lib/types';

export const MODE_PALETTE: Record<TravelModeKey, string[]> = {
	BICYCLING: ['#059669', '#0d9488', '#14b8a6'],
	DRIVING: ['#2563eb', '#0284c7', '#4f46e5'],
	WALKING: ['#d97706', '#ea580c', '#f59e0b'],
	TRANSIT: ['#7c3aed', '#9333ea', '#a855f7']
};

export function formatDurationMillis(millis: number): string {
	const totalMinutes = Math.max(1, Math.round(millis / 60000));
	const hours = Math.floor(totalMinutes / 60);
	const mins = totalMinutes % 60;
	if (hours === 0) return `${mins} min`;
	if (mins === 0) return `${hours} hr`;
	return `${hours} hr ${mins} min`;
}

export function formatDistanceMeters(meters: number): string {
	const miles = meters / 1609.344;
	const km = meters / 1000;
	return `${miles.toFixed(1)} mi (${km.toFixed(1)} km)`;
}

function buildRouteTitle(
	mode: TravelModeKey,
	index: number,
	description: string | null | undefined,
	labels: string[]
): string {
	if (description && description.trim().length > 0) {
		return description.trim();
	}
	if (labels.includes('FUEL_EFFICIENT')) {
		return 'Eco-Friendly Route';
	}
	if (index === 0) {
		const modeNames: Record<TravelModeKey, string> = {
			BICYCLING: 'Recommended Cycling Route',
			DRIVING: 'Fastest Driving Route',
			WALKING: 'Recommended Walking Route',
			TRANSIT: 'Recommended Transit Route'
		};
		return modeNames[mode];
	}
	return `Alternative Route ${index}`;
}

function extractTollText(tollInfo: google.maps.routes.TollInfo | null | undefined): {
	hasTolls: boolean;
	tollText: string | null;
} {
	if (!tollInfo) {
		return { hasTolls: false, tollText: null };
	}
	const price = tollInfo.estimatedPrices?.[0];
	if (price && price.units !== undefined) {
		const units = Number(price.units ?? 0);
		const nanos = Number(price.nanos ?? 0) / 1e9;
		const total = units + nanos;
		const currency = price.currencyCode || 'USD';
		return {
			hasTolls: true,
			tollText: `${currency === 'USD' ? '$' : `${currency} `}${total.toFixed(2)} est. toll`
		};
	}
	return { hasTolls: true, tollText: 'Tolls on route' };
}

function mapRawRoute(
	route: google.maps.routes.Route,
	index: number,
	mode: TravelModeKey
): ComputedRouteSummary {
	const distanceMeters = route.distanceMeters ?? 0;
	const durationMillis = route.durationMillis ?? route.staticDurationMillis ?? 0;
	const labels = (route.routeLabels ?? []).map((label) => String(label));
	const isEcoRecommended = labels.includes('FUEL_EFFICIENT');
	const isAlternative = index > 0 || labels.includes('DEFAULT_ROUTE_ALTERNATE');
	const path: LatLngPoint[] = (route.path ?? []).map((pt) => ({
		lat: pt.lat,
		lng: pt.lng
	}));

	const { hasTolls, tollText } = extractTollText(route.travelAdvisory?.tollInfo);
	const fuelMicroliters = route.travelAdvisory?.fuelConsumptionMicroliters;
	const fuelConsumptionLiters =
		typeof fuelMicroliters === 'number' && Number.isFinite(fuelMicroliters) && fuelMicroliters > 0
			? fuelMicroliters / 1_000_000
			: null;

	const palette = MODE_PALETTE[mode];
	const color = isEcoRecommended ? '#16a34a' : palette[index % palette.length];

	const distanceText = route.localizedValues?.distance || formatDistanceMeters(distanceMeters);
	const durationText = route.localizedValues?.duration || formatDurationMillis(durationMillis);

	return {
		id: `${mode}-${index}`,
		index,
		mode,
		description: buildRouteTitle(mode, index, route.description, labels),
		distanceMeters,
		distanceText,
		durationMillis,
		durationText,
		routeLabels: labels,
		isEcoRecommended,
		isAlternative,
		hasTolls,
		tollText,
		fuelConsumptionLiters,
		warnings: [...(route.warnings ?? [])],
		path,
		color,
		rawRoute: route
	};
}

export async function computeRoutesForMode(
	routesLib: google.maps.RoutesLibrary,
	origin: ResolvedPlace,
	destination: ResolvedPlace,
	mode: TravelModeKey,
	modifiers: RouteModifiersState
): Promise<ComputedRouteSummary[]> {
	const baseFields = [
		'description',
		'distanceMeters',
		'durationMillis',
		'staticDurationMillis',
		'path',
		'routeLabels',
		'localizedValues',
		'warnings',
		'viewport'
	];

	if (mode === 'DRIVING') {
		const standardDrivingRequest: google.maps.routes.ComputeRoutesRequest = {
			origin: origin.location,
			destination: destination.location,
			travelMode: 'DRIVING',
			routingPreference: routesLib.RoutingPreference.TRAFFIC_AWARE,
			computeAlternativeRoutes: true,
			routeModifiers: {
				avoidTolls: modifiers.avoidTolls,
				avoidHighways: modifiers.avoidHighways
			},
			extraComputations: [routesLib.ComputeRoutesExtraComputation.TOLLS],
			fields: [...baseFields, 'travelAdvisory']
		};

		if (!modifiers.ecoFriendly) {
			const response = await routesLib.Route.computeRoutes(standardDrivingRequest);
			return (response.routes ?? []).map((route, idx) => mapRawRoute(route, idx, mode));
		}

		// Eco-friendly reference routing (FUEL_EFFICIENT) and FUEL_CONSUMPTION require TRAFFIC_AWARE_OPTIMAL
		const ecoDrivingRequest: google.maps.routes.ComputeRoutesRequest = {
			origin: origin.location,
			destination: destination.location,
			travelMode: 'DRIVING',
			routingPreference: routesLib.RoutingPreference.TRAFFIC_AWARE_OPTIMAL,
			computeAlternativeRoutes: true,
			routeModifiers: {
				avoidTolls: modifiers.avoidTolls,
				avoidHighways: modifiers.avoidHighways,
				vehicleInfo: {
					emissionType: routesLib.VehicleEmissionType.GASOLINE
				}
			},
			requestedReferenceRoutes: [routesLib.ReferenceRoute.FUEL_EFFICIENT],
			extraComputations: [
				routesLib.ComputeRoutesExtraComputation.TOLLS,
				routesLib.ComputeRoutesExtraComputation.FUEL_CONSUMPTION
			],
			fields: [...baseFields, 'travelAdvisory']
		};

		try {
			const response = await routesLib.Route.computeRoutes(ecoDrivingRequest);
			return (response.routes ?? []).map((route, idx) => mapRawRoute(route, idx, mode));
		} catch {
			// Fallback to standard TRAFFIC_AWARE driving route if eco reference routing is unsupported in the selected region
			const response = await routesLib.Route.computeRoutes(standardDrivingRequest);
			return (response.routes ?? []).map((route, idx) => mapRawRoute(route, idx, mode));
		}
	}

	if (mode === 'TRANSIT') {
		const request: google.maps.routes.ComputeRoutesRequest = {
			origin: origin.location,
			destination: destination.location,
			travelMode: 'TRANSIT',
			computeAlternativeRoutes: true,
			fields: [...baseFields, 'legs', 'travelAdvisory']
		};

		const response = await routesLib.Route.computeRoutes(request);
		return (response.routes ?? []).map((route, idx) => mapRawRoute(route, idx, mode));
	}

	// BICYCLING or WALKING
	const request: google.maps.routes.ComputeRoutesRequest = {
		origin: origin.location,
		destination: destination.location,
		travelMode: mode,
		computeAlternativeRoutes: true,
		fields: baseFields
	};

	const response = await routesLib.Route.computeRoutes(request);
	return (response.routes ?? []).map((route, idx) => mapRawRoute(route, idx, mode));
}
