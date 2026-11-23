import type { BranchLocation, OriginLocation, TravelModeChoice } from '$lib/types';

export function toSdkTravelMode(mode: TravelModeChoice): google.maps.TravelModeString {
	switch (mode) {
		case 'WALK':
			return 'WALKING';
		case 'TRANSIT':
			return 'TRANSIT';
		case 'DRIVE':
		default:
			return 'DRIVING';
	}
}

export function formatDuration(durationMillis: number | null | undefined, localized?: string | null): string {
	if (localized && localized.trim().length > 0) {
		return localized;
	}
	if (typeof durationMillis !== 'number' || !Number.isFinite(durationMillis)) {
		return '—';
	}
	const totalMinutes = Math.max(1, Math.round(durationMillis / 60000));
	if (totalMinutes < 60) {
		return `${totalMinutes} min`;
	}
	const hours = Math.floor(totalMinutes / 60);
	const mins = totalMinutes % 60;
	return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
}

export function formatDistance(distanceMeters: number | null | undefined, localized?: string | null): string {
	if (localized && localized.trim().length > 0) {
		return localized;
	}
	if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters)) {
		return '—';
	}
	const miles = distanceMeters / 1609.344;
	if (miles >= 0.1) {
		return `${miles.toFixed(1)} mi`;
	}
	const feet = Math.round(distanceMeters * 3.28084);
	return `${feet} ft`;
}

export interface MatrixResult {
	durationMillis: number | null;
	distanceMeters: number | null;
	durationText: string;
	distanceText: string;
}

/**
 * Computes road travel times and distances from the customer origin to all candidate branches
 * via Routes API RouteMatrix.computeRouteMatrix().
 */
export async function computeBranchRouteMatrix(
	routesLib: google.maps.RoutesLibrary,
	coreLib: google.maps.CoreLibrary,
	origin: OriginLocation,
	branches: BranchLocation[],
	travelMode: TravelModeChoice
): Promise<Map<string, MatrixResult>> {
	const results = new Map<string, MatrixResult>();
	if (branches.length === 0) {
		return results;
	}

	const { RouteMatrix } = routesLib;
	const { UnitSystem } = coreLib;
	const sdkMode = toSdkTravelMode(travelMode);

	// Chunk into batches of 20 destinations to remain within Routes Matrix element limits across all travel modes
	const batchSize = 20;
	for (let start = 0; start < branches.length; start += batchSize) {
		const batch = branches.slice(start, start + batchSize);
		const request: google.maps.routes.ComputeRouteMatrixRequest = {
			origins: [{ lat: origin.lat, lng: origin.lng }],
			destinations: batch.map((b) => ({ lat: b.lat, lng: b.lng })),
			travelMode: sdkMode,
			units: UnitSystem.IMPERIAL,
			fields: ['distanceMeters', 'durationMillis', 'condition', 'localizedValues']
		};

		const { matrix } = await RouteMatrix.computeRouteMatrix(request);
		const row = matrix.rows[0];
		if (!row) continue;

		row.items.forEach((item, idx) => {
			const branch = batch[idx];
			if (!branch) return;

			if (item.condition && item.condition !== 'ROUTE_EXISTS') {
				results.set(branch.id, {
					durationMillis: null,
					distanceMeters: null,
					durationText: 'Unavailable',
					distanceText: '—'
				});
				return;
			}

			const durationMillis =
				typeof item.durationMillis === 'number' && Number.isFinite(item.durationMillis)
					? item.durationMillis
					: null;
			const distanceMeters =
				typeof item.distanceMeters === 'number' && Number.isFinite(item.distanceMeters)
					? item.distanceMeters
					: null;

			results.set(branch.id, {
				durationMillis,
				distanceMeters,
				durationText: formatDuration(durationMillis, item.localizedValues?.duration),
				distanceText: formatDistance(distanceMeters, item.localizedValues?.distance)
			});
		});
	}

	return results;
}

export interface ComputedRouteResult {
	route: google.maps.routes.Route;
	durationMillis: number;
	distanceMeters: number;
	durationText: string;
	distanceText: string;
}

/**
 * Computes the optimal route and polyline geometry from origin to the selected branch
 * via Routes API Route.computeRoutes().
 */
export async function computeSelectedRoute(
	routesLib: google.maps.RoutesLibrary,
	coreLib: google.maps.CoreLibrary,
	origin: OriginLocation,
	branch: BranchLocation,
	travelMode: TravelModeChoice
): Promise<ComputedRouteResult | null> {
	const { Route } = routesLib;
	const { UnitSystem } = coreLib;

	const request: google.maps.routes.ComputeRoutesRequest = {
		origin: { lat: origin.lat, lng: origin.lng },
		destination: { lat: branch.lat, lng: branch.lng },
		travelMode: toSdkTravelMode(travelMode),
		units: UnitSystem.IMPERIAL,
		fields: ['path', 'durationMillis', 'distanceMeters', 'localizedValues']
	};

	const { routes } = await Route.computeRoutes(request);
	const route = routes?.[0];
	if (!route) {
		return null;
	}

	const durationMillis =
		typeof route.durationMillis === 'number' && Number.isFinite(route.durationMillis)
			? route.durationMillis
			: (branch.durationMillis ?? 0);
	const distanceMeters =
		typeof route.distanceMeters === 'number' && Number.isFinite(route.distanceMeters)
			? route.distanceMeters
			: (branch.distanceMeters ?? 0);

	return {
		route,
		durationMillis,
		distanceMeters,
		durationText: formatDuration(durationMillis, route.localizedValues?.duration),
		distanceText: formatDistance(distanceMeters, route.localizedValues?.distance)
	};
}
