import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import type {
	EvacuationRouteSummary,
	FloodZoneDefinition,
	RouteStepPreview,
	ShelterPlace,
	WeatherSnapshot
} from '$lib/types';

export const ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';

export interface LoadedGmpLibraries {
	core: google.maps.CoreLibrary;
	maps: google.maps.MapsLibrary;
	marker: google.maps.MarkerLibrary;
	places: google.maps.PlacesLibrary;
	routes: google.maps.RoutesLibrary;
	geocoding: google.maps.GeocodingLibrary;
	elevation: google.maps.ElevationLibrary;
	geometry: google.maps.GeometryLibrary;
}

let optionsConfigured = false;

export function ensureMapsConfigured(apiKey: string): void {
	if (typeof window === 'undefined' || optionsConfigured) {
		return;
	}
	setOptions({
		key: apiKey,
		v: 'weekly',
		language: 'en',
		region: 'US',
		mapIds: ['DEMO_MAP_ID'],
		solutionChannel: ATTRIBUTION_ID
	});
	optionsConfigured = true;
}

export async function loadAllGmpLibraries(): Promise<LoadedGmpLibraries> {
	const [core, maps, marker, places, routes, geocoding, elevation, geometry] = await Promise.all([
		importLibrary('core'),
		importLibrary('maps'),
		importLibrary('marker'),
		importLibrary('places'),
		importLibrary('routes'),
		importLibrary('geocoding'),
		importLibrary('elevation'),
		importLibrary('geometry')
	]);

	return { core, maps, marker, places, routes, geocoding, elevation, geometry };
}

export async function reverseGeocodePoint(
	geocodingLib: google.maps.GeocodingLibrary,
	location: google.maps.LatLngLiteral
): Promise<string> {
	const geocoder = new geocodingLib.Geocoder();
	const response = await geocoder.geocode({ location });
	const primary = response.results?.[0];
	if (primary?.formatted_address) {
		return primary.formatted_address;
	}
	return `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)} (Miami, FL)`;
}

export async function fetchElevationPoint(
	elevationLib: google.maps.ElevationLibrary,
	location: google.maps.LatLngLiteral
): Promise<{ elevationMeters: number | null; elevationNote: string }> {
	const service = new elevationLib.ElevationService();
	const response = await service.getElevationForLocations({
		locations: [location]
	});
	const result = response.results?.[0];
	if (!result || typeof result.elevation !== 'number') {
		return {
			elevationMeters: null,
			elevationNote: 'Elevation unavailable for this coordinate'
		};
	}

	const elevationMeters = Math.round(result.elevation * 100) / 100;
	let elevationNote = 'Moderate coastal grade';
	if (elevationMeters < 1.2) {
		elevationNote = 'Critical low-lying elevation (< 1.2 m) — high pooling risk';
	} else if (elevationMeters < 2.2) {
		elevationNote = 'Low tidal elevation (< 2.2 m) — storm drainage vulnerable';
	} else {
		elevationNote = 'Higher ground ridge (>= 2.2 m)';
	}

	return { elevationMeters, elevationNote };
}

export async function fetchWeatherCurrentConditions(
	apiKey: string,
	lat: number,
	lng: number
): Promise<WeatherSnapshot> {
	const fallback = (statusNote: string): WeatherSnapshot => ({
		conditionText: 'Weather telemetry unavailable',
		temperatureDisplay: '--',
		windSpeedText: '--',
		windGustText: '--',
		windDirectionText: '--',
		precipProbPercent: null,
		precipQpfText: '--',
		thunderstormProbPercent: null,
		isAvailable: false,
		statusNote
	});

	if (!apiKey) {
		return fallback('API key required');
	}

	try {
		const url = new URL('https://weather.googleapis.com/v1/currentConditions:lookup');
		url.searchParams.set('key', apiKey);
		url.searchParams.set('location.latitude', lat.toFixed(6));
		url.searchParams.set('location.longitude', lng.toFixed(6));
		url.searchParams.set('unitsSystem', 'IMPERIAL');

		const res = await fetch(url.toString());
		if (!res.ok) {
			return fallback(`Weather API status ${res.status}`);
		}

		const data = (await res.json()) as {
			weatherCondition?: { description?: { text?: string } };
			temperature?: { degrees?: number; unit?: string };
			wind?: {
				speed?: { value?: number; unit?: string };
				gust?: { value?: number; unit?: string };
				direction?: { cardinal?: string; degrees?: number };
			};
			precipitation?: {
				probability?: { percent?: number; type?: string };
				qpf?: { quantity?: number; unit?: string };
			};
			thunderstormProbability?: number;
		};

		const conditionText = data.weatherCondition?.description?.text ?? 'Active Conditions';
		const tempDeg = data.temperature?.degrees;
		const tempUnit = data.temperature?.unit === 'CELSIUS' ? '°C' : '°F';
		const temperatureDisplay = typeof tempDeg === 'number' ? `${Math.round(tempDeg)}${tempUnit}` : '--';

		const windUnit = data.wind?.speed?.unit === 'KILOMETERS_PER_HOUR' ? 'km/h' : 'mph';
		const windSpeedText =
			typeof data.wind?.speed?.value === 'number'
				? `${Math.round(data.wind.speed.value)} ${windUnit}`
				: '--';
		const windGustText =
			typeof data.wind?.gust?.value === 'number'
				? `${Math.round(data.wind.gust.value)} ${windUnit}`
				: 'N/A';
		const windDirectionText = formatCardinal(data.wind?.direction?.cardinal);

		const precipProbPercent =
			typeof data.precipitation?.probability?.percent === 'number'
				? data.precipitation.probability.percent
				: null;
		const qpfVal = data.precipitation?.qpf?.quantity;
		const qpfUnit = data.precipitation?.qpf?.unit === 'MILLIMETERS' ? 'mm' : 'in';
		const precipQpfText =
			typeof qpfVal === 'number' ? `${qpfVal.toFixed(2)} ${qpfUnit}/hr` : '0.00 in/hr';

		const thunderstormProbPercent =
			typeof data.thunderstormProbability === 'number' ? data.thunderstormProbability : null;

		return {
			conditionText,
			temperatureDisplay,
			windSpeedText,
			windGustText,
			windDirectionText,
			precipProbPercent,
			precipQpfText,
			thunderstormProbPercent,
			isAvailable: true
		};
	} catch {
		return fallback('Weather service unreachable');
	}
}

function formatCardinal(cardinal?: string): string {
	if (!cardinal) return '';
	const map: Record<string, string> = {
		NORTH: 'N',
		NORTH_NORTHEAST: 'NNE',
		NORTHEAST: 'NE',
		EAST_NORTHEAST: 'ENE',
		EAST: 'E',
		EAST_SOUTHEAST: 'ESE',
		SOUTHEAST: 'SE',
		SOUTH_SOUTHEAST: 'SSE',
		SOUTH: 'S',
		SOUTH_SOUTHWEST: 'SSW',
		SOUTHWEST: 'SW',
		WEST_SOUTHWEST: 'WSW',
		WEST: 'W',
		WEST_NORTHWEST: 'WNW',
		NORTHWEST: 'NW',
		NORTH_NORTHWEST: 'NNW'
	};
	return map[cardinal] ?? cardinal;
}

export async function searchEmergencyShelters(
	placesLib: google.maps.PlacesLibrary,
	query: string,
	center: google.maps.LatLngLiteral
): Promise<ShelterPlace[]> {
	const trimmed = query.trim() || 'hospital and community center in Miami, FL';
	const { places } = await placesLib.Place.searchByText({
		textQuery: trimmed,
		fields: [
			'id',
			'displayName',
			'formattedAddress',
			'location',
			'types',
			'rating',
			'userRatingCount',
			'businessStatus'
		],
		locationBias: {
			center,
			radius: 12000
		},
		maxResultCount: 10,
		language: 'en',
		region: 'us',
		internalUsageAttributionIds: [ATTRIBUTION_ID]
	});

	if (!places || places.length === 0) {
		return [];
	}

	const results: ShelterPlace[] = [];
	for (const place of places) {
		if (!place.location) continue;
		const types = place.types ?? [];
		const isHospital =
			types.includes('hospital') ||
			types.includes('emergency_room') ||
			(place.displayName ?? '').toLowerCase().includes('hospital') ||
			(place.displayName ?? '').toLowerCase().includes('medical');

		results.push({
			id: place.id,
			displayName: place.displayName ?? 'Emergency Shelter',
			formattedAddress: place.formattedAddress ?? 'Miami, FL',
			lat: place.location.lat(),
			lng: place.location.lng(),
			types,
			rating: typeof place.rating === 'number' ? place.rating : null,
			userRatingCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
			businessStatus: place.businessStatus ?? null,
			category: isHospital ? 'hospital' : 'community_center'
		});
	}

	return results;
}

function toLatLngLiteral(
	pt: google.maps.LatLng | google.maps.LatLngAltitude | google.maps.LatLngLiteral
): google.maps.LatLngLiteral {
	const anyPt = pt as unknown as {
		lat: number | (() => number);
		lng: number | (() => number);
	};
	return {
		lat: typeof anyPt.lat === 'function' ? anyPt.lat() : anyPt.lat,
		lng: typeof anyPt.lng === 'function' ? anyPt.lng() : anyPt.lng
	};
}

function findIntersectedFloodZones(
	path: google.maps.LatLngLiteral[],
	coreLib: google.maps.CoreLibrary,
	geometryLib: google.maps.GeometryLibrary,
	polygonEntries: { definition: FloodZoneDefinition; polygon: google.maps.Polygon }[]
): FloodZoneDefinition[] {
	if (path.length === 0 || polygonEntries.length === 0) {
		return [];
	}

	// Sample vertices plus interpolated midpoints so segments crossing narrow polygons are detected
	const samples: google.maps.LatLngLiteral[] = [];
	for (let i = 0; i < path.length; i++) {
		samples.push(path[i]);
		if (i < path.length - 1) {
			const a = path[i];
			const b = path[i + 1];
			samples.push({ lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 });
		}
	}

	const intersected = new Map<string, FloodZoneDefinition>();
	for (const sample of samples) {
		const latLng = new coreLib.LatLng(sample.lat, sample.lng);
		for (const entry of polygonEntries) {
			if (intersected.has(entry.definition.id)) continue;
			if (geometryLib.poly.containsLocation(latLng, entry.polygon)) {
				intersected.set(entry.definition.id, entry.definition);
			}
		}
	}

	return Array.from(intersected.values());
}

function buildPerimeterBypassCandidates(
	intersectedZones: FloodZoneDefinition[],
	origin: google.maps.LatLngLiteral,
	destination: google.maps.LatLngLiteral,
	coreLib: google.maps.CoreLibrary,
	geometryLib: google.maps.GeometryLibrary,
	polygonEntries: { definition: FloodZoneDefinition; polygon: google.maps.Polygon }[]
): { label: string; location: google.maps.LatLngLiteral }[] {
	const allPoints = intersectedZones.flatMap((z) => z.paths);
	if (allPoints.length === 0) return [];

	let minLat = Infinity;
	let maxLat = -Infinity;
	let minLng = Infinity;
	let maxLng = -Infinity;

	for (const pt of allPoints) {
		if (pt.lat < minLat) minLat = pt.lat;
		if (pt.lat > maxLat) maxLat = pt.lat;
		if (pt.lng < minLng) minLng = pt.lng;
		if (pt.lng > maxLng) maxLng = pt.lng;
	}

	const midLat = (minLat + maxLat) / 2;
	const midLng = (minLng + maxLng) / 2;
	const margin = 0.0055; // ~600m buffer outside flood polygon perimeter

	const rawCandidates: { label: string; location: google.maps.LatLngLiteral }[] = [
		{ label: 'West Perimeter Bypass', location: { lat: midLat, lng: minLng - margin } },
		{ label: 'North Perimeter Bypass', location: { lat: maxLat + margin, lng: midLng } },
		{ label: 'South Perimeter Bypass', location: { lat: minLat - margin, lng: midLng } },
		{ label: 'Northwest Corridor Bypass', location: { lat: maxLat + margin, lng: minLng - margin } },
		{ label: 'Southwest Corridor Bypass', location: { lat: minLat - margin, lng: minLng - margin } },
		{ label: 'East Perimeter Bypass', location: { lat: midLat, lng: maxLng + margin } }
	];

	// Filter out any candidate that happens to sit inside another flood zone
	const safeCandidates = rawCandidates.filter((cand) => {
		const ll = new coreLib.LatLng(cand.location.lat, cand.location.lng);
		return polygonEntries.every((entry) => !geometryLib.poly.containsLocation(ll, entry.polygon));
	});

	// Sort heuristically by proximity to the midpoint between origin and destination
	const tripMidLat = (origin.lat + destination.lat) / 2;
	const tripMidLng = (origin.lng + destination.lng) / 2;
	safeCandidates.sort((a, b) => {
		const da = Math.hypot(a.location.lat - tripMidLat, a.location.lng - tripMidLng);
		const db = Math.hypot(b.location.lat - tripMidLat, b.location.lng - tripMidLng);
		return da - db;
	});

	return safeCandidates.slice(0, 4);
}

export async function computeEvacuationRoute(params: {
	routesLib: google.maps.RoutesLibrary;
	coreLib: google.maps.CoreLibrary;
	geometryLib: google.maps.GeometryLibrary;
	origin: google.maps.LatLngLiteral;
	originLabel: string;
	shelter: ShelterPlace;
	avoidFloodZones: boolean;
	polygonEntries: { definition: FloodZoneDefinition; polygon: google.maps.Polygon }[];
}): Promise<{
	route: google.maps.routes.Route;
	summary: EvacuationRouteSummary;
}> {
	const {
		routesLib,
		coreLib,
		geometryLib,
		origin,
		originLabel,
		shelter,
		avoidFloodZones,
		polygonEntries
	} = params;

	const destination: google.maps.LatLngLiteral = { lat: shelter.lat, lng: shelter.lng };
	const fields = ['path', 'durationMillis', 'distanceMeters', 'localizedValues', 'legs', 'routeLabels'];

	const baseResponse = await routesLib.Route.computeRoutes({
		origin,
		destination,
		travelMode: 'DRIVING',
		fields,
		internalUsageAttributionIds: [ATTRIBUTION_ID]
	});

	const baseRoute = baseResponse.routes?.[0];
	if (!baseRoute) {
		throw new Error('No evacuation driving route found to this shelter.');
	}

	const basePath = (baseRoute.path ?? []).map(toLatLngLiteral);
	const baseIntersections = findIntersectedFloodZones(
		basePath,
		coreLib,
		geometryLib,
		polygonEntries
	);

	let chosenRoute = baseRoute;
	let chosenIntersections = baseIntersections;
	let usedBypassWaypoint = false;
	let bypassWaypointLabel: string | null = null;

	if (avoidFloodZones && baseIntersections.length > 0) {
		const candidates = buildPerimeterBypassCandidates(
			baseIntersections,
			origin,
			destination,
			coreLib,
			geometryLib,
			polygonEntries
		);

		let bestCleanRoute: {
			route: google.maps.routes.Route;
			label: string;
			distance: number;
		} | null = null;

		let bestFallbackRoute: {
			route: google.maps.routes.Route;
			label: string;
			intersections: FloodZoneDefinition[];
			distance: number;
		} | null = null;

		for (const candidate of candidates) {
			try {
				const detourResponse = await routesLib.Route.computeRoutes({
					origin,
					destination,
					intermediates: [{ location: candidate.location, via: true }],
					travelMode: 'DRIVING',
					fields,
					internalUsageAttributionIds: [ATTRIBUTION_ID]
				});
				const detourRoute = detourResponse.routes?.[0];
				if (!detourRoute) continue;

				const detourPath = (detourRoute.path ?? []).map(toLatLngLiteral);
				const detourIntersections = findIntersectedFloodZones(
					detourPath,
					coreLib,
					geometryLib,
					polygonEntries
				);
				const dist = detourRoute.distanceMeters ?? Number.MAX_SAFE_INTEGER;

				if (detourIntersections.length === 0) {
					if (!bestCleanRoute || dist < bestCleanRoute.distance) {
						bestCleanRoute = {
							route: detourRoute,
							label: candidate.label,
							distance: dist
						};
					}
				} else if (
					detourIntersections.length < baseIntersections.length &&
					(!bestFallbackRoute ||
						detourIntersections.length < bestFallbackRoute.intersections.length ||
						(detourIntersections.length === bestFallbackRoute.intersections.length &&
							dist < bestFallbackRoute.distance))
				) {
					bestFallbackRoute = {
						route: detourRoute,
						label: candidate.label,
						intersections: detourIntersections,
						distance: dist
					};
				}
			} catch {
				// Skip failed candidate detour and try next perimeter waypoint
			}
		}

		if (bestCleanRoute) {
			chosenRoute = bestCleanRoute.route;
			chosenIntersections = [];
			usedBypassWaypoint = true;
			bypassWaypointLabel = bestCleanRoute.label;
		} else if (bestFallbackRoute) {
			chosenRoute = bestFallbackRoute.route;
			chosenIntersections = bestFallbackRoute.intersections;
			usedBypassWaypoint = true;
			bypassWaypointLabel = bestFallbackRoute.label;
		}
	}

	const durationMillis = chosenRoute.durationMillis ?? 0;
	const distanceMeters = chosenRoute.distanceMeters ?? 0;
	const durationMinutes = Math.max(1, Math.round(durationMillis / 60000));
	const durationText = chosenRoute.localizedValues?.duration ?? `${durationMinutes} min`;
	const distanceText =
		chosenRoute.localizedValues?.distance ?? `${(distanceMeters / 1609.34).toFixed(1)} mi`;

	const stepPreviews: RouteStepPreview[] = [];
	const steps = chosenRoute.legs?.[0]?.steps ?? [];
	for (const step of steps.slice(0, 4)) {
		const instruction = step.instructions?.trim();
		if (!instruction) continue;
		const stepDist =
			step.localizedValues?.distance ??
			(typeof step.distanceMeters === 'number' ? `${Math.round(step.distanceMeters)} m` : '');
		stepPreviews.push({ instruction, distanceText: stepDist });
	}

	return {
		route: chosenRoute,
		summary: {
			shelterId: shelter.id,
			shelterName: shelter.displayName,
			shelterAddress: shelter.formattedAddress,
			originLabel,
			durationText,
			distanceText,
			durationMillis,
			distanceMeters,
			avoidFloodZones,
			usedBypassWaypoint,
			bypassWaypointLabel,
			intersectsFloodZone: chosenIntersections.length > 0,
			intersectedZoneNames: chosenIntersections.map((z) => z.name),
			stepPreviews
		}
	};
}

/**
 * Safely builds an HTML element for Google Maps InfoWindow without innerHTML.
 */
export function buildSafeInfoWindowContent(options: {
	badge?: string;
	badgeColor?: string;
	title: string;
	subtitle?: string;
	rows: { label: string; value: string }[];
	actionLabel?: string;
	onAction?: () => void;
}): HTMLElement {
	const root = document.createElement('div');
	root.style.fontFamily =
		'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
	root.style.maxWidth = '270px';
	root.style.padding = '4px 2px';
	root.style.color = '#0f172a';

	if (options.badge) {
		const badgeEl = document.createElement('span');
		badgeEl.textContent = options.badge;
		badgeEl.style.display = 'inline-block';
		badgeEl.style.fontSize = '11px';
		badgeEl.style.fontWeight = '700';
		badgeEl.style.letterSpacing = '0.03em';
		badgeEl.style.textTransform = 'uppercase';
		badgeEl.style.padding = '2px 7px';
		badgeEl.style.borderRadius = '999px';
		badgeEl.style.marginBottom = '6px';
		badgeEl.style.color = '#ffffff';
		badgeEl.style.backgroundColor = options.badgeColor ?? '#0f766e';
		root.appendChild(badgeEl);
	}

	const titleEl = document.createElement('div');
	titleEl.textContent = options.title;
	titleEl.style.fontSize = '14px';
	titleEl.style.fontWeight = '700';
	titleEl.style.lineHeight = '1.3';
	titleEl.style.marginBottom = '3px';
	root.appendChild(titleEl);

	if (options.subtitle) {
		const subEl = document.createElement('div');
		subEl.textContent = options.subtitle;
		subEl.style.fontSize = '12px';
		subEl.style.color = '#475569';
		subEl.style.marginBottom = '8px';
		root.appendChild(subEl);
	}

	if (options.rows.length > 0) {
		const listEl = document.createElement('div');
		listEl.style.display = 'grid';
		listEl.style.gap = '4px';
		listEl.style.fontSize = '12px';
		listEl.style.borderTop = '1px solid #e2e8f0';
		listEl.style.paddingTop = '6px';

		for (const row of options.rows) {
			const rowEl = document.createElement('div');
			const labelSpan = document.createElement('strong');
			labelSpan.textContent = `${row.label}: `;
			labelSpan.style.color = '#334155';
			const valSpan = document.createElement('span');
			valSpan.textContent = row.value;
			valSpan.style.color = '#0f172a';
			rowEl.appendChild(labelSpan);
			rowEl.appendChild(valSpan);
			listEl.appendChild(rowEl);
		}
		root.appendChild(listEl);
	}

	if (options.actionLabel && options.onAction) {
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.textContent = options.actionLabel;
		btn.style.marginTop = '9px';
		btn.style.width = '100%';
		btn.style.padding = '7px 10px';
		btn.style.borderRadius = '6px';
		btn.style.border = 'none';
		btn.style.backgroundColor = '#0f766e';
		btn.style.color = '#ffffff';
		btn.style.fontSize = '12px';
		btn.style.fontWeight = '600';
		btn.style.cursor = 'pointer';
		btn.addEventListener('click', options.onAction);
		root.appendChild(btn);
	}

	return root;
}
