import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { formatDistanceMiles, formatDuration, parseDurationSeconds } from './fare';
import type {
	ComputedRouteSummary,
	EmissionType,
	LatLngLiteral,
	MatrixCandidateResult,
	PlaceSelection
} from './types';

export interface LoadedMapsLibraries {
	core: google.maps.CoreLibrary;
	maps: google.maps.MapsLibrary;
	marker: google.maps.MarkerLibrary;
	places: google.maps.PlacesLibrary;
	routes: google.maps.RoutesLibrary;
	geometry: google.maps.GeometryLibrary;
}

let optionsConfigured = false;
let libsPromise: Promise<LoadedMapsLibraries> | null = null;

export async function loadMapsLibraries(apiKey: string): Promise<LoadedMapsLibraries> {
	if (typeof window === 'undefined') {
		throw new Error('Google Maps JS API can only be loaded in the browser.');
	}
	if (!apiKey) {
		throw new Error('PUBLIC_GOOGLE_MAPS_API_KEY is missing.');
	}

	if (!optionsConfigured) {
		setOptions({
			key: apiKey,
			v: 'weekly',
			language: 'en',
			region: 'US',
			mapIds: ['DEMO_MAP_ID']
		});
		optionsConfigured = true;
	}

	if (!libsPromise) {
		libsPromise = Promise.all([
			importLibrary('core'),
			importLibrary('maps'),
			importLibrary('marker'),
			importLibrary('places'),
			importLibrary('routes'),
			importLibrary('geometry')
		]).then(([core, maps, marker, places, routes, geometry]) => ({
			core,
			maps,
			marker,
			places,
			routes,
			geometry
		}));
	}

	return libsPromise;
}

export function decodePolylinePath(
	geometry: google.maps.GeometryLibrary,
	encodedPolyline: string
): LatLngLiteral[] {
	if (!encodedPolyline) return [];
	return geometry.encoding.decodePath(encodedPolyline).map((pt) => ({
		lat: pt.lat(),
		lng: pt.lng()
	}));
}

export async function searchPlaceByText(
	textQuery: string,
	placesLib: google.maps.PlacesLibrary
): Promise<PlaceSelection | null> {
	try {
		const res = await fetch('/api/places/search', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ textQuery, maxResultCount: 1 })
		});
		if (res.ok) {
			const data = (await res.json()) as {
				places?: Array<{
					id?: string;
					displayName?: { text?: string };
					formattedAddress?: string;
					location?: { latitude?: number; longitude?: number };
				}>;
			};
			const first = data.places?.[0];
			if (
				first?.location?.latitude !== undefined &&
				first?.location?.longitude !== undefined
			) {
				return {
					id: first.id ?? textQuery,
					displayName: first.displayName?.text ?? textQuery,
					formattedAddress: first.formattedAddress ?? textQuery,
					location: {
						lat: first.location.latitude,
						lng: first.location.longitude
					}
				};
			}
		}
	} catch {
		// Fall through to client-side Places Library fallback
	}

	// Client-side Places API (New) Text Search fallback (handles HTTP-referrer restricted keys)
	const { places } = await placesLib.Place.searchByText({
		textQuery,
		fields: ['id', 'displayName', 'formattedAddress', 'location'],
		language: 'en-US',
		region: 'us',
		maxResultCount: 1,
		locationBias: {
			center: { lat: 34.0328, lng: -118.3669 },
			radius: 45000
		}
	});
	const p = places?.[0];
	if (!p || !p.location) return null;
	return {
		id: p.id ?? textQuery,
		displayName: p.displayName ?? textQuery,
		formattedAddress: p.formattedAddress ?? textQuery,
		location: {
			lat: p.location.lat(),
			lng: p.location.lng()
		}
	};
}

interface RawRestRoute {
	distanceMeters?: number;
	duration?: string;
	staticDuration?: string;
	polyline?: { encodedPolyline?: string };
	routeLabels?: string[];
	travelAdvisory?: { fuelConsumptionMicroliters?: string | number };
	localizedValues?: {
		distance?: { text?: string };
		duration?: { text?: string };
	};
}

function mapRestRouteToSummary(
	raw: RawRestRoute,
	kind: 'fastest' | 'eco',
	geometry: google.maps.GeometryLibrary
): ComputedRouteSummary {
	const distanceMeters = raw.distanceMeters ?? 0;
	const durationSeconds = parseDurationSeconds(raw.duration);
	const staticDurationSeconds = parseDurationSeconds(raw.staticDuration);
	const encodedPolyline = raw.polyline?.encodedPolyline ?? '';
	const path = decodePolylinePath(geometry, encodedPolyline);
	const rawFuel = raw.travelAdvisory?.fuelConsumptionMicroliters;
	const fuelConsumptionMicroliters =
		typeof rawFuel === 'number'
			? rawFuel
			: typeof rawFuel === 'string'
				? Number.parseInt(rawFuel, 10) || 0
				: 0;

	return {
		kind,
		label: kind === 'eco' ? 'Eco-Friendly Route' : 'Fastest Traffic-Aware',
		distanceMeters,
		durationSeconds,
		staticDurationSeconds,
		encodedPolyline,
		path,
		fuelConsumptionMicroliters,
		localizedDistance: raw.localizedValues?.distance?.text || formatDistanceMiles(distanceMeters),
		localizedDuration: raw.localizedValues?.duration?.text || formatDuration(durationSeconds),
		routeLabels: raw.routeLabels ?? []
	};
}

export async function computeTripRoutes(
	origin: LatLngLiteral,
	destination: LatLngLiteral,
	emissionType: EmissionType,
	libs: LoadedMapsLibraries
): Promise<{ fastest: ComputedRouteSummary; eco: ComputedRouteSummary }> {
	try {
		const res = await fetch('/api/routes/compute', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				origin,
				destination,
				emissionType,
				includeEcoReference: true
			})
		});

		if (res.ok) {
			const data = (await res.json()) as { routes?: RawRestRoute[] };
			const rawRoutes = data.routes ?? [];
			if (rawRoutes.length > 0) {
				const fastestRaw =
					rawRoutes.find((r) => r.routeLabels?.includes('DEFAULT_ROUTE')) ?? rawRoutes[0];
				const ecoRaw =
					rawRoutes.find((r) => r.routeLabels?.includes('FUEL_EFFICIENT')) ?? fastestRaw;

				return {
					fastest: mapRestRouteToSummary(fastestRaw, 'fastest', libs.geometry),
					eco: mapRestRouteToSummary(ecoRaw, 'eco', libs.geometry)
				};
			}
		}
	} catch {
		// Fall through to Maps JS Route.computeRoutes fallback
	}

	// Client-side Maps JS Routes library fallback
	const request: google.maps.routes.ComputeRoutesRequest = {
		origin,
		destination,
		travelMode: 'DRIVING',
		routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
		extraComputations: ['FUEL_CONSUMPTION'],
		requestedReferenceRoutes: ['FUEL_EFFICIENT'],
		routeModifiers: {
			vehicleInfo: {
				emissionType
			}
		},
		fields: [
			'path',
			'distanceMeters',
			'durationMillis',
			'staticDurationMillis',
			'routeLabels',
			'travelAdvisory',
			'localizedValues'
		]
	};

	const { routes } = await libs.routes.Route.computeRoutes(request);
	if (!routes || routes.length === 0) {
		throw new Error('No routes found between pickup and drop-off.');
	}

	const fastestJs =
		routes.find((r) => r.routeLabels?.includes('DEFAULT_ROUTE' as google.maps.routes.RouteLabel)) ??
		routes[0];
	const ecoJs =
		routes.find((r) =>
			r.routeLabels?.includes('FUEL_EFFICIENT' as google.maps.routes.RouteLabel)
		) ?? fastestJs;

	const toLatLngLiteral = (pt: google.maps.LatLngAltitude): LatLngLiteral => ({
		lat: Number(pt.lat),
		lng: Number(pt.lng)
	});

	const toSummary = (
		r: google.maps.routes.Route,
		kind: 'fastest' | 'eco'
	): ComputedRouteSummary => {
		const path = (r.path ?? []).map((pt) => toLatLngLiteral(pt));
		const distanceMeters = r.distanceMeters ?? 0;
		const durationSeconds = Math.round((r.durationMillis ?? 0) / 1000);
		const staticDurationSeconds = Math.round((r.staticDurationMillis ?? 0) / 1000);
		const encodedPolyline =
			path.length > 0
				? libs.geometry.encoding.encodePath(
						path.map((p) => new libs.core.LatLng(p.lat, p.lng))
					)
				: '';
		const advisory = r.travelAdvisory as
			| { fuelConsumptionMicroliters?: number | string }
			| undefined;
		const fuelConsumptionMicroliters = Number(advisory?.fuelConsumptionMicroliters ?? 0) || 0;

		return {
			kind,
			label: kind === 'eco' ? 'Eco-Friendly Route' : 'Fastest Traffic-Aware',
			distanceMeters,
			durationSeconds,
			staticDurationSeconds,
			encodedPolyline,
			path,
			fuelConsumptionMicroliters,
			localizedDistance: r.localizedValues?.distance ?? formatDistanceMiles(distanceMeters),
			localizedDuration: r.localizedValues?.duration ?? formatDuration(durationSeconds),
			routeLabels: (r.routeLabels ?? []).map(String)
		};
	};

	return {
		fastest: toSummary(fastestJs, 'fastest'),
		eco: toSummary(ecoJs, 'eco')
	};
}

export async function computeSingleApproachRoute(
	origin: LatLngLiteral,
	destination: LatLngLiteral,
	emissionType: EmissionType,
	libs: LoadedMapsLibraries
): Promise<ComputedRouteSummary | null> {
	try {
		const res = await fetch('/api/routes/compute', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				origin,
				destination,
				emissionType,
				includeEcoReference: false
			})
		});
		if (res.ok) {
			const data = (await res.json()) as { routes?: RawRestRoute[] };
			const first = data.routes?.[0];
			if (first) {
				return mapRestRouteToSummary(first, 'fastest', libs.geometry);
			}
		}
	} catch {
		// Fall through to JS SDK
	}

	const { routes } = await libs.routes.Route.computeRoutes({
		origin,
		destination,
		travelMode: 'DRIVING',
		routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
		fields: ['path', 'distanceMeters', 'durationMillis', 'localizedValues']
	});
	const first = routes?.[0];
	if (!first) return null;
	const path = (first.path ?? []).map((pt) => ({
		lat: Number(pt.lat),
		lng: Number(pt.lng)
	}));
	const distanceMeters = first.distanceMeters ?? 0;
	const durationSeconds = Math.round((first.durationMillis ?? 0) / 1000);
	return {
		kind: 'fastest',
		label: 'Driver Approach',
		distanceMeters,
		durationSeconds,
		staticDurationSeconds: durationSeconds,
		encodedPolyline: '',
		path,
		fuelConsumptionMicroliters: 0,
		localizedDistance: first.localizedValues?.distance ?? formatDistanceMiles(distanceMeters),
		localizedDuration: first.localizedValues?.duration ?? formatDuration(durationSeconds),
		routeLabels: ['DEFAULT_ROUTE']
	};
}

export async function computeDriverMatrix(
	origins: LatLngLiteral[],
	destination: LatLngLiteral,
	libs: LoadedMapsLibraries
): Promise<MatrixCandidateResult[]> {
	try {
		const res = await fetch('/api/routes/matrix', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ origins, destination })
		});
		if (res.ok) {
			const data = (await res.json()) as {
				elements?: Array<{
					originIndex?: number;
					destinationIndex?: number;
					duration?: string;
					distanceMeters?: number;
					condition?: string;
				}>;
			};
			if (Array.isArray(data.elements) && data.elements.length > 0) {
				return data.elements.map((el) => ({
					originIndex: el.originIndex ?? 0,
					destinationIndex: el.destinationIndex ?? 0,
					durationSeconds: parseDurationSeconds(el.duration),
					distanceMeters: el.distanceMeters ?? 0,
					condition: el.condition ?? 'ROUTE_EXISTS'
				}));
			}
		}
	} catch {
		// Fall through to JS SDK RouteMatrix
	}

	const { matrix } = await libs.routes.RouteMatrix.computeRouteMatrix({
		origins,
		destinations: [destination],
		travelMode: 'DRIVING',
		routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
		fields: ['condition', 'distanceMeters', 'durationMillis']
	});

	return matrix.rows.map((row, originIndex) => {
		const item = row.items[0];
		return {
			originIndex,
			destinationIndex: 0,
			durationSeconds: Math.round((item?.durationMillis ?? 0) / 1000),
			distanceMeters: item?.distanceMeters ?? 0,
			condition: String(item?.condition ?? 'ROUTE_EXISTS')
		};
	});
}
