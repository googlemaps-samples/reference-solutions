import { DALLAS_CENTER } from '$lib/data/dallasFleet';
import type {
	DispatchLeg,
	DispatchRouteResult,
	FleetVehicle,
	LatLngPoint,
	LogisticsHub,
	MatrixEntry,
	SnapAnalysis,
	SnappedPointItem
} from '$lib/types/logistics';
import { computeMeanSnapOffsetMeters, parseGoogleDurationSeconds } from '$lib/utils/geo';

interface PlacesRestPlace {
	id?: string;
	displayName?: { text?: string };
	formattedAddress?: string;
	location?: { latitude?: number; longitude?: number };
}

export async function discoverDallasHubs(
	placesLib?: google.maps.PlacesLibrary | null
): Promise<{ hubs: LogisticsHub[]; source: 'places-bff' | 'places-js-sdk' | 'none'; note?: string }> {
	const textQuery = 'distribution center logistics hub Dallas TX';

	// 1. Prefer BFF REST endpoint to keep Places API calls server-side
	try {
		const res = await fetch('/api/places/search', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				textQuery,
				maxResultCount: 5,
				center: DALLAS_CENTER,
				radiusMeters: 35000
			})
		});

		if (res.ok) {
			const data = (await res.json()) as { places?: PlacesRestPlace[] };
			const hubs: LogisticsHub[] = (data.places ?? [])
				.filter((p) => p.location?.latitude != null && p.location?.longitude != null)
				.map((p, idx) => ({
					id: p.id || `hub-${idx}`,
					name: p.displayName?.text || `Dallas Hub ${idx + 1}`,
					address: p.formattedAddress || 'Dallas, TX',
					location: {
						lat: p.location!.latitude!,
						lng: p.location!.longitude!
					}
				}));
			if (hubs.length > 0) {
				return { hubs, source: 'places-bff' };
			}
		}
	} catch {
		// Fall through to JS SDK Places search
	}

	// 2. Fallback to Maps JS Places API (New) if key has HTTP Referrer restriction
	if (placesLib) {
		try {
			const { places } = await placesLib.Place.searchByText({
				textQuery,
				fields: ['id', 'displayName', 'formattedAddress', 'location'],
				locationBias: DALLAS_CENTER,
				maxResultCount: 5,
				region: 'us',
				language: 'en-US'
			});

			const hubs: LogisticsHub[] = places
				.filter((p) => p.location != null)
				.map((p, idx) => ({
					id: p.id || `hub-js-${idx}`,
					name: p.displayName || `Dallas Hub ${idx + 1}`,
					address: p.formattedAddress || 'Dallas, TX',
					location: {
						lat: p.location!.lat(),
						lng: p.location!.lng()
					}
				}));

			if (hubs.length > 0) {
				return { hubs, source: 'places-js-sdk' };
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Unable to discover hubs via Places API.';
			return { hubs: [], source: 'none', note: msg };
		}
	}

	return {
		hubs: [],
		source: 'none',
		note: 'Add a valid PUBLIC_GOOGLE_MAPS_API_KEY in .env to discover live Dallas logistics hubs.'
	};
}

interface RoadsRestPoint {
	location?: { latitude?: number; longitude?: number };
	originalIndex?: number;
	placeId?: string;
}

export async function snapVehicleTrace(vehicle: FleetVehicle): Promise<SnapAnalysis> {
	try {
		const res = await fetch('/api/roads/snap', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				path: vehicle.rawGpsTrace,
				interpolate: true
			})
		});

		const data = (await res.json().catch(() => ({}))) as {
			snappedPoints?: RoadsRestPoint[];
			warningMessage?: string;
			error?: string;
		};

		if (!res.ok || !Array.isArray(data.snappedPoints) || data.snappedPoints.length === 0) {
			return {
				vehicleId: vehicle.id,
				rawCount: vehicle.rawGpsTrace.length,
				snappedCount: 0,
				uniqueRoadSegments: 0,
				meanOffsetMeters: 0,
				snappedPoints: [],
				warningMessage:
					data.error ||
					data.warningMessage ||
					'Roads API Snap to Roads is unavailable for this API key.',
				source: 'unavailable'
			};
		}

		const snappedPoints: SnappedPointItem[] = data.snappedPoints
			.filter((pt) => pt.location?.latitude != null && pt.location?.longitude != null)
			.map((pt) => ({
				location: {
					lat: pt.location!.latitude!,
					lng: pt.location!.longitude!
				},
				originalIndex: pt.originalIndex,
				placeId: pt.placeId || 'unknown'
			}));

		const uniqueSegments = new Set(snappedPoints.map((p) => p.placeId).filter(Boolean)).size;
		const meanOffsetMeters = computeMeanSnapOffsetMeters(vehicle.rawGpsTrace, snappedPoints);

		return {
			vehicleId: vehicle.id,
			rawCount: vehicle.rawGpsTrace.length,
			snappedCount: snappedPoints.length,
			uniqueRoadSegments: uniqueSegments,
			meanOffsetMeters,
			snappedPoints,
			warningMessage: data.warningMessage,
			source: 'roads-api'
		};
	} catch {
		return {
			vehicleId: vehicle.id,
			rawCount: vehicle.rawGpsTrace.length,
			snappedCount: 0,
			uniqueRoadSegments: 0,
			meanOffsetMeters: 0,
			snappedPoints: [],
			warningMessage: 'Network error contacting /api/roads/snap.',
			source: 'unavailable'
		};
	}
}

interface RoutesRestResponse {
	routes?: Array<{
		duration?: string;
		distanceMeters?: number;
		polyline?: { encodedPolyline?: string };
		optimizedIntermediateWaypointIndex?: number[];
		legs?: Array<{
			duration?: string;
			distanceMeters?: number;
		}>;
	}>;
	error?: string;
}

export async function computeDispatchRoute(
	depot: LogisticsHub,
	stops: LogisticsHub[],
	optimizeOrder: boolean,
	geometryLib: google.maps.GeometryLibrary,
	routesLib: google.maps.RoutesLibrary
): Promise<DispatchRouteResult> {
	if (stops.length === 0) {
		throw new Error('Select at least one Dallas drop-off hub to compute a dispatch corridor.');
	}

	// Route starts at depot, visits stops[0..n-2] as intermediates, and ends at stops[n-1]
	// Wait: when optimizing order with >=2 stops, if we want all stops potentially reordered
	// or return-to-depot loop vs last-stop destination:
	// Let's use stops[0..n-2] as intermediates and stops[n-1] as final drop-off (or if 1 stop, direct!).
	const intermediates = stops.length > 1 ? stops.slice(0, -1) : [];
	const finalStop = stops[stops.length - 1];

	// 1. Try BFF REST endpoint first
	try {
		const res = await fetch('/api/routes/compute', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				origin: depot.location,
				destination: finalStop.location,
				intermediates: intermediates.map((s) => s.location),
				optimizeWaypointOrder: optimizeOrder && intermediates.length > 1
			})
		});

		if (res.ok) {
			const data = (await res.json()) as RoutesRestResponse;
			const route = data.routes?.[0];
			if (route?.polyline?.encodedPolyline) {
				const decoded = geometryLib.encoding.decodePath(route.polyline.encodedPolyline);
				const path: LatLngPoint[] = decoded.map((ll) => ({ lat: ll.lat(), lng: ll.lng() }));

				const optIndices = route.optimizedIntermediateWaypointIndex ?? [];
				const orderedIntermediates =
					optIndices.length === intermediates.length
						? optIndices.map((i) => intermediates[i])
						: intermediates;
				const orderedHubs = [...orderedIntermediates, finalStop];

				const legs: DispatchLeg[] = (route.legs ?? []).map((leg, idx) => ({
					fromName: idx === 0 ? depot.name : orderedHubs[idx - 1].name,
					toName: orderedHubs[idx]?.name ?? finalStop.name,
					distanceMeters: leg.distanceMeters ?? 0,
					durationSeconds: parseGoogleDurationSeconds(leg.duration)
				}));

				return {
					encodedPolyline: route.polyline.encodedPolyline,
					path,
					totalDistanceMeters: route.distanceMeters ?? 0,
					totalDurationSeconds: parseGoogleDurationSeconds(route.duration),
					optimizedOrderIndices: optIndices,
					orderedHubs,
					legs,
					source: 'routes-api-bff'
				};
			}
		}
	} catch {
		// Fall through to Maps JS Routes SDK
	}

	// 2. Fallback to Maps JS SDK Route.computeRoutes
	const request: google.maps.routes.ComputeRoutesRequest = {
		origin: depot.location,
		destination: finalStop.location,
		intermediates: intermediates.map((s) => ({ location: s.location })),
		travelMode: 'DRIVING',
		routingPreference: 'TRAFFIC_AWARE' as google.maps.routes.RoutingPreference,
		optimizeWaypointOrder: optimizeOrder && intermediates.length > 1,
		fields: [
			'path',
			'distanceMeters',
			'durationMillis',
			'legs',
			...(optimizeOrder && intermediates.length > 1
				? ['optimizedIntermediateWaypointIndices']
				: [])
		]
	};

	const { routes } = await routesLib.Route.computeRoutes(request);
	const route = routes?.[0];
	if (!route) {
		throw new Error('Routes API returned no route for the selected Dallas hubs.');
	}

	const path: LatLngPoint[] = (route.path ?? []).map((pt) => ({
		lat: pt.lat,
		lng: pt.lng
	}));

	const optIndices = route.optimizedIntermediateWaypointIndices ?? [];
	const orderedIntermediates =
		optIndices.length === intermediates.length
			? optIndices.map((i) => intermediates[i])
			: intermediates;
	const orderedHubs = [...orderedIntermediates, finalStop];

	const legs: DispatchLeg[] = (route.legs ?? []).map((leg, idx) => ({
		fromName: idx === 0 ? depot.name : orderedHubs[idx - 1].name,
		toName: orderedHubs[idx]?.name ?? finalStop.name,
		distanceMeters: leg.distanceMeters ?? 0,
		durationSeconds: leg.durationMillis ? Math.round(leg.durationMillis / 1000) : 0
	}));

	return {
		path,
		totalDistanceMeters: route.distanceMeters ?? 0,
		totalDurationSeconds: route.durationMillis ? Math.round(route.durationMillis / 1000) : 0,
		optimizedOrderIndices: optIndices,
		orderedHubs,
		legs,
		source: 'routes-js-sdk'
	};
}

interface MatrixRestElement {
	originIndex?: number;
	destinationIndex?: number;
	duration?: string;
	distanceMeters?: number;
	condition?: string;
}

export async function computeHubMatrix(
	depot: LogisticsHub,
	hubs: LogisticsHub[],
	routesLib: google.maps.RoutesLibrary
): Promise<MatrixEntry[]> {
	if (hubs.length === 0) return [];

	// 1. Try BFF REST endpoint
	try {
		const res = await fetch('/api/routes/matrix', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				origins: [depot.location],
				destinations: hubs.map((h) => h.location)
			})
		});

		if (res.ok) {
			const data = (await res.json()) as { elements?: MatrixRestElement[] };
			if (Array.isArray(data.elements) && data.elements.length > 0) {
				return data.elements
					.slice()
					.sort((a, b) => (a.destinationIndex ?? 0) - (b.destinationIndex ?? 0))
					.map((el) => {
						const destIdx = el.destinationIndex ?? 0;
						const hub = hubs[destIdx];
						return {
							originIndex: el.originIndex ?? 0,
							destinationIndex: destIdx,
							hubId: hub?.id ?? `hub-${destIdx}`,
							hubName: hub?.name ?? `Hub ${destIdx + 1}`,
							distanceMeters: el.distanceMeters ?? null,
							durationSeconds: el.duration ? parseGoogleDurationSeconds(el.duration) : null,
							condition: el.condition ?? 'ROUTE_EXISTS'
						};
					});
			}
		}
	} catch {
		// Fall through to Maps JS RouteMatrix SDK
	}

	// 2. Fallback to Maps JS RouteMatrix.computeRouteMatrix
	const { matrix } = await routesLib.RouteMatrix.computeRouteMatrix({
		origins: [depot.location],
		destinations: hubs.map((h) => h.location),
		travelMode: 'DRIVING',
		routingPreference: 'TRAFFIC_AWARE' as google.maps.routes.RoutingPreference,
		fields: ['durationMillis', 'distanceMeters', 'condition']
	});

	const firstRow = matrix.rows?.[0];
	if (!firstRow) return [];

	return firstRow.items.map((item, idx) => ({
		originIndex: 0,
		destinationIndex: idx,
		hubId: hubs[idx]?.id ?? `hub-${idx}`,
		hubName: hubs[idx]?.name ?? `Hub ${idx + 1}`,
		distanceMeters: item.distanceMeters ?? null,
		durationSeconds:
			item.durationMillis != null && Number.isFinite(item.durationMillis)
				? Math.round(item.durationMillis / 1000)
				: null,
		condition: item.condition ?? 'ROUTE_EXISTS'
	}));
}
