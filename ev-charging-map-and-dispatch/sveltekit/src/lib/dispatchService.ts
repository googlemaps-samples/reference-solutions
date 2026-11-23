import { importLibrary } from '@googlemaps/js-api-loader';
import type {
	ActiveRouteDetails,
	EvConnectorSummary,
	LatLngLiteral,
	OpenStatusInfo,
	ProviderCategory,
	RouteStep,
	ServiceProvider
} from './types';

export const SEATTLE_CENTER: LatLngLiteral = {
	lat: 47.6062,
	lng: -122.3321
};

export const USAGE_ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';

const PLACE_FIELDS: string[] = [
	'id',
	'displayName',
	'formattedAddress',
	'location',
	'rating',
	'userRatingCount',
	'primaryType',
	'types',
	'regularOpeningHours',
	'evChargeOptions',
	'nationalPhoneNumber',
	'googleMapsURI'
];

const CONNECTOR_LABELS: Record<string, string> = {
	CCS_COMBO_1: 'CCS1',
	CCS_COMBO_2: 'CCS2',
	CHADEMO: 'CHAdeMO',
	J1772: 'J1772',
	NACS: 'NACS',
	TESLA: 'Tesla',
	TYPE_2: 'Type 2',
	OTHER: 'Other',
	UNSPECIFIED_GB_T: 'GB/T',
	UNSPECIFIED_WALL_OUTLET: 'Wall Outlet'
};

export function formatDistanceImperial(meters: number): string {
	const miles = meters / 1609.344;
	if (miles < 0.1) {
		const feet = Math.round(meters * 3.28084);
		return `${feet} ft`;
	}
	return `${miles.toFixed(1)} mi`;
}

export function formatDurationMillis(ms: number): string {
	const totalMinutes = Math.max(1, Math.round(ms / 60000));
	if (totalMinutes < 60) {
		return `${totalMinutes} min`;
	}
	const hours = Math.floor(totalMinutes / 60);
	const mins = totalMinutes % 60;
	return mins === 0 ? `${hours} hr` : `${hours} hr ${mins} min`;
}

export function haversineMeters(a: LatLngLiteral, b: LatLngLiteral): number {
	const R = 6371000;
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const dLat = toRad(b.lat - a.lat);
	const dLng = toRad(b.lng - a.lng);
	const sinDLat = Math.sin(dLat / 2);
	const sinDLng = Math.sin(dLng / 2);
	const c =
		sinDLat * sinDLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
	return 2 * R * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
}

function getSeattleLocalNow(): { day: number; hour: number; minute: number } {
	const now = new Date();
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: 'America/Los_Angeles',
		weekday: 'short',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	}).formatToParts(now);

	const weekdayMap: Record<string, number> = {
		Sun: 0,
		Mon: 1,
		Tue: 2,
		Wed: 3,
		Thu: 4,
		Fri: 5,
		Sat: 6
	};

	const weekdayStr = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
	const hourVal = Number(parts.find((p) => p.type === 'hour')?.value ?? '12') % 24;
	const minVal = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');

	return {
		day: weekdayMap[weekdayStr] ?? now.getDay(),
		hour: hourVal,
		minute: minVal
	};
}

/**
 * Computes opening status on the `weekly` Maps JS API channel without calling
 * beta-only `place.isOpen()`.
 */
export function parseOpeningStatus(
	openingHours: google.maps.places.OpeningHours | null | undefined,
	category: ProviderCategory
): OpenStatusInfo {
	if (!openingHours) {
		return {
			label: category === 'ev_charging' ? '24/7 Access' : 'Hours unverified',
			isOpen: category === 'ev_charging' ? true : null,
			todayHours: null
		};
	}

	const periods = openingHours.periods ?? [];
	const descriptions = openingHours.weekdayDescriptions ?? [];
	const seattleNow = getSeattleLocalNow();

	const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	const todayPrefix = dayNames[seattleNow.day];
	const todayDesc = descriptions.find((d) => d.startsWith(todayPrefix)) ?? null;

	// Standard Google Places 24-hour representation: single period starting Sunday 00:00 with no close
	if (
		periods.length === 1 &&
		periods[0].open.day === 0 &&
		periods[0].open.hour === 0 &&
		periods[0].open.minute === 0 &&
		!periods[0].close
	) {
		return {
			label: 'Open 24 Hours',
			isOpen: true,
			todayHours: todayDesc
		};
	}

	if (periods.length === 0) {
		return {
			label: category === 'ev_charging' ? '24/7 Access' : 'Hours unverified',
			isOpen: category === 'ev_charging' ? true : null,
			todayHours: todayDesc
		};
	}

	const minutesInWeek = 7 * 24 * 60;
	const nowMinuteOfWeek = seattleNow.day * 24 * 60 + seattleNow.hour * 60 + seattleNow.minute;

	let isOpen = false;
	for (const period of periods) {
		const openMin = period.open.day * 24 * 60 + period.open.hour * 60 + period.open.minute;
		if (!period.close) {
			isOpen = true;
			break;
		}
		let closeMin = period.close.day * 24 * 60 + period.close.hour * 60 + period.close.minute;
		if (closeMin <= openMin) {
			closeMin += minutesInWeek;
		}
		const adjustedNow = nowMinuteOfWeek < openMin ? nowMinuteOfWeek + minutesInWeek : nowMinuteOfWeek;
		if (adjustedNow >= openMin && adjustedNow < closeMin) {
			isOpen = true;
			break;
		}
	}

	return {
		label: isOpen ? 'Open Now' : 'Closed',
		isOpen,
		todayHours: todayDesc
	};
}

function mapPlaceToProvider(
	place: google.maps.places.Place,
	category: ProviderCategory,
	origin: LatLngLiteral
): ServiceProvider | null {
	if (!place.location) return null;

	const loc: LatLngLiteral = {
		lat: place.location.lat(),
		lng: place.location.lng()
	};

	const evOptions = place.evChargeOptions;
	const connectors: EvConnectorSummary[] = (evOptions?.connectorAggregations ?? []).map((agg) => ({
		typeLabel: agg.type ? (CONNECTOR_LABELS[agg.type] ?? agg.type) : 'Charger',
		maxKw: Math.round(agg.maxChargeRateKw ?? 0),
		count: agg.count ?? 0,
		availableCount: agg.availableCount ?? null,
		outOfServiceCount: agg.outOfServiceCount ?? null
	}));

	let evAvailableCount: number | null = null;
	if (connectors.some((c) => c.availableCount !== null)) {
		evAvailableCount = connectors.reduce((sum, c) => sum + (c.availableCount ?? 0), 0);
	}

	const evMaxKw =
		connectors.length > 0 ? Math.max(...connectors.map((c) => c.maxKw)) : null;

	const straightMeters = Math.round(haversineMeters(origin, loc));
	const estDriveMeters = Math.round(straightMeters * 1.28);
	const estDriveMs = Math.max(120000, Math.round((estDriveMeters / 8.5) * 1000));

	return {
		id: place.id,
		name: place.displayName ?? (category === 'ev_charging' ? 'EV Charging Station' : 'Auto Repair'),
		category,
		address: place.formattedAddress ?? 'Seattle, WA',
		location: loc,
		rating: place.rating ?? null,
		userRatingCount: place.userRatingCount ?? null,
		phoneNumber: place.nationalPhoneNumber ?? null,
		googleMapsUri: place.googleMapsURI ?? null,
		openStatus: parseOpeningStatus(place.regularOpeningHours, category),
		evConnectorCount: evOptions?.connectorCount ?? (connectors.reduce((s, c) => s + c.count, 0) || null),
		evMaxKw: evMaxKw && evMaxKw > 0 ? evMaxKw : null,
		evAvailableCount,
		evConnectors: connectors,
		distanceMeters: estDriveMeters,
		durationMillis: estDriveMs,
		distanceText: formatDistanceImperial(estDriveMeters),
		etaText: `~${formatDurationMillis(estDriveMs)}`,
		etaSource: 'estimate'
	};
}

export async function reverseGeocodePosition(location: LatLngLiteral): Promise<string> {
	try {
		const { Geocoder } = await importLibrary('geocoding');
		const geocoder = new Geocoder();
		const response = await geocoder.geocode({
			location,
			fulfillOnZeroResults: true
		});
		const primary = response.results?.[0];
		if (primary?.formatted_address) {
			return primary.formatted_address;
		}
	} catch {
		// Fall back cleanly to coordinate label if geocoding quota/network fails
	}
	return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)} (Seattle Area)`;
}

export async function discoverNearbyProviders(
	origin: LatLngLiteral,
	radiusMeters: number
): Promise<ServiceProvider[]> {
	const { Place, SearchNearbyRankPreference } = await importLibrary('places');

	const [evRes, repairRes] = await Promise.all([
		Place.searchNearby({
			fields: PLACE_FIELDS,
			locationRestriction: {
				center: origin,
				radius: radiusMeters
			},
			includedPrimaryTypes: ['electric_vehicle_charging_station'],
			maxResultCount: 10,
			rankPreference: SearchNearbyRankPreference.DISTANCE,
			internalUsageAttributionIds: [USAGE_ATTRIBUTION_ID]
		}).catch(() => ({ places: [] as google.maps.places.Place[] })),
		Place.searchNearby({
			fields: PLACE_FIELDS,
			locationRestriction: {
				center: origin,
				radius: radiusMeters
			},
			includedPrimaryTypes: ['car_repair'],
			maxResultCount: 10,
			rankPreference: SearchNearbyRankPreference.DISTANCE,
			internalUsageAttributionIds: [USAGE_ATTRIBUTION_ID]
		}).catch(() => ({ places: [] as google.maps.places.Place[] }))
	]);

	const seen = new Set<string>();
	const providers: ServiceProvider[] = [];

	for (const place of evRes.places) {
		if (!seen.has(place.id)) {
			seen.add(place.id);
			const mapped = mapPlaceToProvider(place, 'ev_charging', origin);
			if (mapped) providers.push(mapped);
		}
	}

	for (const place of repairRes.places) {
		if (!seen.has(place.id)) {
			seen.add(place.id);
			const mapped = mapPlaceToProvider(place, 'auto_repair', origin);
			if (mapped) providers.push(mapped);
		}
	}

	if (providers.length === 0) {
		return providers;
	}

	// Rank all discovered providers by live driving ETA using Routes API RouteMatrix
	try {
		const [{ RouteMatrix }, { UnitSystem }] = await Promise.all([
			importLibrary('routes'),
			importLibrary('core')
		]);

		const { matrix } = await RouteMatrix.computeRouteMatrix({
			origins: [origin],
			destinations: providers.map((p) => p.location),
			travelMode: 'DRIVING',
			routingPreference: 'TRAFFIC_AWARE',
			units: UnitSystem.IMPERIAL,
			fields: ['condition', 'distanceMeters', 'durationMillis', 'localizedValues'],
			internalUsageAttributionIds: [USAGE_ATTRIBUTION_ID]
		});

		const row = matrix.rows?.[0];
		if (row?.items) {
			row.items.forEach((item, idx) => {
				const target = providers[idx];
				if (!target) return;
				if (item.condition === 'ROUTE_EXISTS' && item.durationMillis != null) {
					target.durationMillis = item.durationMillis;
					target.distanceMeters = item.distanceMeters ?? target.distanceMeters;
					target.etaText =
						item.localizedValues?.duration ?? formatDurationMillis(item.durationMillis);
					target.distanceText =
						item.localizedValues?.distance ??
						(item.distanceMeters != null
							? formatDistanceImperial(item.distanceMeters)
							: target.distanceText);
					target.etaSource = 'routes_matrix';
				}
			});
		}
	} catch {
		// Retain Haversine-based fallback estimates if RouteMatrix fails
	}

	providers.sort((a, b) => {
		const durA = a.durationMillis ?? Number.MAX_SAFE_INTEGER;
		const durB = b.durationMillis ?? Number.MAX_SAFE_INTEGER;
		return durA - durB;
	});

	return providers;
}

export async function computeDispatchRoute(
	origin: LatLngLiteral,
	provider: ServiceProvider
): Promise<ActiveRouteDetails> {
	const [{ Route }, { UnitSystem }] = await Promise.all([
		importLibrary('routes'),
		importLibrary('core')
	]);

	const { routes } = await Route.computeRoutes({
		origin,
		destination: provider.location,
		travelMode: 'DRIVING',
		routingPreference: 'TRAFFIC_AWARE',
		units: UnitSystem.IMPERIAL,
		fields: [
			'distanceMeters',
			'durationMillis',
			'localizedValues',
			'path',
			'viewport',
			'legs.distanceMeters',
			'legs.durationMillis',
			'legs.localizedValues',
			'legs.steps.distanceMeters',
			'legs.steps.staticDurationMillis',
			'legs.steps.instructions',
			'legs.steps.maneuver',
			'legs.steps.localizedValues'
		],
		internalUsageAttributionIds: [USAGE_ATTRIBUTION_ID]
	});

	const route = routes?.[0];
	if (!route) {
		throw new Error('No drivable dispatch route was returned for this destination.');
	}

	const leg = route.legs?.[0];
	const steps: RouteStep[] = (leg?.steps ?? []).map((step, index) => ({
		index: index + 1,
		instruction: step.instructions ?? 'Continue on route',
		maneuver: step.maneuver ?? null,
		distanceText:
			step.localizedValues?.distance ?? formatDistanceImperial(step.distanceMeters ?? 0),
		durationText:
			step.localizedValues?.staticDuration ??
			(step.staticDurationMillis != null ? formatDurationMillis(step.staticDurationMillis) : '1 min')
	}));

	const distanceText =
		route.localizedValues?.distance ??
		(route.distanceMeters != null ? formatDistanceImperial(route.distanceMeters) : provider.distanceText);
	const durationText =
		route.localizedValues?.duration ??
		(route.durationMillis != null ? formatDurationMillis(route.durationMillis) : provider.etaText);

	return {
		provider,
		distanceText,
		durationText,
		steps,
		route
	};
}
