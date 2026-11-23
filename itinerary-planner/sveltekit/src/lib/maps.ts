import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import type {
	DiscoveryCategory,
	DiscoveredPlace,
	ItineraryStop,
	LatLngPoint,
	RouteLegSummary,
	RouteSummary,
	TimeZoneInfo,
	TravelModeChoice
} from './types';

export const GMP_ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';

const PLACE_SEARCH_FIELDS = [
	'id',
	'displayName',
	'formattedAddress',
	'location',
	'rating',
	'userRatingCount',
	'regularOpeningHours',
	'photos',
	'primaryTypeDisplayName',
	'priceLevel',
	'googleMapsURI',
	'utcOffsetMinutes',
	'timeZone'
];

let loaderConfigured = false;

export function ensureMapsLoader(apiKey: string): void {
	if (loaderConfigured) return;
	setOptions({
		key: apiKey,
		v: 'weekly',
		language: 'en',
		region: 'US'
	});
	loaderConfigured = true;
}

export async function loadGmpLibraries() {
	const [coreLib, mapsLib, markerLib, placesLib, routesLib, streetViewLib] = await Promise.all([
		importLibrary('core'),
		importLibrary('maps'),
		importLibrary('marker'),
		importLibrary('places'),
		importLibrary('routes'),
		importLibrary('streetView')
	]);

	return {
		coreLib,
		mapsLib,
		markerLib,
		placesLib,
		routesLib,
		streetViewLib
	};
}

function toLatLngPoint(loc: google.maps.LatLng | google.maps.LatLngLiteral | null | undefined): LatLngPoint | null {
	if (!loc) return null;
	if (typeof (loc as google.maps.LatLng).lat === 'function') {
		const gLoc = loc as google.maps.LatLng;
		return { lat: gLoc.lat(), lng: gLoc.lng() };
	}
	const lit = loc as google.maps.LatLngLiteral;
	if (typeof lit.lat === 'number' && typeof lit.lng === 'number') {
		return { lat: lit.lat, lng: lit.lng };
	}
	return null;
}

export function normalizePlace(place: google.maps.places.Place, fallbackCategoryLabel = 'Place'): DiscoveredPlace | null {
	const location = toLatLngPoint(place.location);
	if (!place.id || !location) return null;

	let photoUrl: string | null = null;
	try {
		if (place.photos && place.photos.length > 0) {
			photoUrl = place.photos[0].getURI({ maxWidth: 480, maxHeight: 320 });
		}
	} catch {
		photoUrl = null;
	}

	return {
		id: place.id,
		name: place.displayName || 'Unnamed Place',
		formattedAddress: place.formattedAddress || '',
		location,
		rating: typeof place.rating === 'number' ? place.rating : null,
		userRatingCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
		weekdayDescriptions: place.regularOpeningHours?.weekdayDescriptions ?? [],
		photoUrl,
		primaryType: place.primaryTypeDisplayName || fallbackCategoryLabel,
		priceLevel: place.priceLevel ? String(place.priceLevel) : null,
		googleMapsUri: place.googleMapsURI ?? null,
		utcOffsetMinutes: typeof place.utcOffsetMinutes === 'number' ? place.utcOffsetMinutes : null,
		timeZoneId: place.timeZone?.id ?? null
	};
}

export async function searchDestinationPlaces(
	cityName: string,
	center: LatLngPoint,
	category: DiscoveryCategory,
	placesLib: google.maps.PlacesLibrary
): Promise<DiscoveredPlace[]> {
	const { Place } = placesLib;

	if (category === 'attractions') {
		const { places } = await Place.searchByText({
			textQuery: `top tourist attractions in ${cityName}`,
			locationBias: { center, radius: 12000 },
			maxResultCount: 10,
			fields: PLACE_SEARCH_FIELDS,
			internalUsageAttributionIds: [GMP_ATTRIBUTION_ID]
		});
		return places
			.map((p) => normalizePlace(p, 'Attraction'))
			.filter((p): p is DiscoveredPlace => p !== null);
	}

	const includedPrimaryTypes = category === 'hotels' ? ['hotel', 'lodging'] : ['restaurant'];
	const fallbackLabel = category === 'hotels' ? 'Hotel' : 'Restaurant';

	try {
		const { places } = await Place.searchNearby({
			locationRestriction: { center, radius: 7500 },
			includedPrimaryTypes,
			maxResultCount: 10,
			fields: PLACE_SEARCH_FIELDS,
			internalUsageAttributionIds: [GMP_ATTRIBUTION_ID]
		});

		const normalized = places
			.map((p) => normalizePlace(p, fallbackLabel))
			.filter((p): p is DiscoveredPlace => p !== null);

		if (normalized.length > 0) return normalized;
	} catch {
		// Fall back to Text Search if Nearby Search returns an empty/restricted set
	}

	const textQuery = category === 'hotels' ? `top hotels in ${cityName}` : `best restaurants in ${cityName}`;
	const { places } = await Place.searchByText({
		textQuery,
		locationBias: { center, radius: 12000 },
		maxResultCount: 10,
		fields: PLACE_SEARCH_FIELDS,
		internalUsageAttributionIds: [GMP_ATTRIBUTION_ID]
	});

	return places
		.map((p) => normalizePlace(p, fallbackLabel))
		.filter((p): p is DiscoveredPlace => p !== null);
}

export async function fetchPlaceById(
	placeId: string,
	placesLib: google.maps.PlacesLibrary
): Promise<DiscoveredPlace | null> {
	const { Place } = placesLib;
	const place = new Place({ id: placeId });
	await place.fetchFields({ fields: PLACE_SEARCH_FIELDS });
	return normalizePlace(place);
}

export interface ComputedRouteResult {
	summary: RouteSummary;
	polylines: google.maps.Polyline[];
	optimizedIndices?: number[];
	viewport?: google.maps.LatLngBounds | null;
}

export async function computeItineraryRoute(
	stops: ItineraryStop[],
	travelMode: TravelModeChoice,
	optimizeOrder: boolean,
	routesLib: google.maps.RoutesLibrary,
	mapsLib: google.maps.MapsLibrary,
	map: google.maps.Map,
	strokeColor: string
): Promise<ComputedRouteResult> {
	if (stops.length < 2) {
		return {
			summary: { distanceMeters: 0, durationMillis: 0, legs: [] },
			polylines: []
		};
	}

	const { Route } = routesLib;
	const origin = stops[0].location;
	const destination = stops[stops.length - 1].location;
	const intermediates = stops.slice(1, -1).map((stop) => ({
		location: stop.location
	}));

	const canOptimize = optimizeOrder && intermediates.length > 0;
	const effectiveTravelMode: TravelModeChoice =
		canOptimize && travelMode === 'TRANSIT' ? 'DRIVING' : travelMode;

	const fields = ['path', 'distanceMeters', 'durationMillis', 'legs', 'viewport'];
	if (canOptimize) {
		fields.push('optimizedIntermediateWaypointIndices');
	}

	try {
		const result = await Route.computeRoutes({
			origin,
			destination,
			intermediates: intermediates.length > 0 ? intermediates : undefined,
			travelMode: effectiveTravelMode,
			optimizeWaypointOrder: canOptimize,
			fields
		});

		const route = result.routes?.[0];
		if (!route) {
			throw new Error('No routes returned');
		}

		let finalRoute = route;
		const optimizedIndices = route.optimizedIntermediateWaypointIndices ?? undefined;

		// If user wanted TRANSIT + optimizeOrder, we optimized order via DRIVING above;
		// now compute the TRANSIT route using that reordered sequence if applicable.
		if (canOptimize && travelMode === 'TRANSIT' && optimizedIndices && optimizedIndices.length > 0) {
			const reorderedIntermediates = optimizedIndices.map((idx) => ({
				location: stops[1 + idx].location
			}));
			try {
				const transitResult = await Route.computeRoutes({
					origin,
					destination,
					intermediates: reorderedIntermediates,
					travelMode: 'TRANSIT',
					optimizeWaypointOrder: false,
					fields: ['path', 'distanceMeters', 'durationMillis', 'legs', 'viewport']
				});
				if (transitResult.routes?.[0]) {
					finalRoute = transitResult.routes[0];
				}
			} catch {
				// Keep the driving fallback route if transit cannot connect all stops
			}
		}

		const polylines = finalRoute.createPolylines({
			polylineOptions: {
				map,
				strokeColor,
				strokeOpacity: 0.92,
				strokeWeight: 5
			}
		});

		const legs: RouteLegSummary[] = (finalRoute.legs ?? []).map((leg, index) => ({
			fromName: stops[index]?.name ?? `Stop ${index + 1}`,
			toName: stops[index + 1]?.name ?? `Stop ${index + 2}`,
			distanceMeters: leg.distanceMeters ?? 0,
			durationMillis: leg.durationMillis ?? 0
		}));

		return {
			summary: {
				distanceMeters: finalRoute.distanceMeters ?? 0,
				durationMillis: finalRoute.durationMillis ?? 0,
				legs
			},
			polylines,
			optimizedIndices,
			viewport: finalRoute.viewport
		};
	} catch {
		// Graceful polyline fallback using Maps JS Polyline if Routes API cannot route (e.g. transit gap)
		const { Polyline } = mapsLib;
		const fallbackLine = new Polyline({
			map,
			path: stops.map((s) => s.location),
			strokeColor,
			strokeOpacity: 0.65,
			strokeWeight: 4,
			geodesic: true
		});

		const legs: RouteLegSummary[] = [];
		let totalDistance = 0;
		for (let i = 0; i < stops.length - 1; i++) {
			const dist = haversineMeters(stops[i].location, stops[i + 1].location);
			totalDistance += dist;
			legs.push({
				fromName: stops[i].name,
				toName: stops[i + 1].name,
				distanceMeters: Math.round(dist),
				durationMillis: Math.round((dist / 800) * 60_000)
			});
		}

		return {
			summary: {
				distanceMeters: Math.round(totalDistance),
				durationMillis: legs.reduce((acc, l) => acc + l.durationMillis, 0),
				legs,
				isFallback: true
			},
			polylines: [fallbackLine]
		};
	}
}

function haversineMeters(a: LatLngPoint, b: LatLngPoint): number {
	const R = 6371000;
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const dLat = toRad(b.lat - a.lat);
	const dLng = toRad(b.lng - a.lng);
	const sinLat = Math.sin(dLat / 2);
	const sinLng = Math.sin(dLng / 2);
	const h =
		sinLat * sinLat +
		Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
	return 2 * R * Math.asin(Math.sqrt(h));
}

export async function fetchDestinationTimeZone(
	location: LatLngPoint,
	fallbackUtcOffsetMinutes: number | null,
	fallbackTimeZoneId: string | null
): Promise<TimeZoneInfo> {
	const timestamp = Math.floor(Date.now() / 1000);
	try {
		const res = await fetch(
			`/api/timezone?lat=${encodeURIComponent(location.lat)}&lng=${encodeURIComponent(location.lng)}&timestamp=${timestamp}`
		);
		if (res.ok) {
			const data = (await res.json()) as {
				status?: string;
				timeZoneId?: string;
				timeZoneName?: string;
				rawOffset?: number;
				dstOffset?: number;
			};
			if (data.status === 'OK' && data.timeZoneId) {
				const raw = Number(data.rawOffset ?? 0);
				const dst = Number(data.dstOffset ?? 0);
				return {
					timeZoneId: data.timeZoneId,
					timeZoneName: data.timeZoneName || data.timeZoneId,
					rawOffsetSeconds: raw,
					dstOffsetSeconds: dst,
					totalOffsetSeconds: raw + dst,
					source: 'timezone-api'
				};
			}
		}
	} catch {
		// Fall through to Places API utcOffsetMinutes fallback
	}

	const offsetMinutes =
		fallbackUtcOffsetMinutes !== null
			? fallbackUtcOffsetMinutes
			: Math.round(location.lng / 15) * 60;
	const totalSeconds = offsetMinutes * 60;
	const tzId = fallbackTimeZoneId || 'UTC';

	let tzName = `UTC${formatOffset(totalSeconds)}`;
	if (fallbackTimeZoneId) {
		try {
			const parts = new Intl.DateTimeFormat('en-US', {
				timeZone: fallbackTimeZoneId,
				timeZoneName: 'long'
			}).formatToParts(new Date());
			const part = parts.find((p) => p.type === 'timeZoneName');
			if (part?.value) tzName = part.value;
		} catch {
			// Keep formatted offset name
		}
	}

	return {
		timeZoneId: tzId,
		timeZoneName: tzName,
		rawOffsetSeconds: totalSeconds,
		dstOffsetSeconds: 0,
		totalOffsetSeconds: totalSeconds,
		source: 'places-fallback'
	};
}

export function formatOffset(totalOffsetSeconds: number): string {
	const sign = totalOffsetSeconds >= 0 ? '+' : '-';
	const abs = Math.abs(totalOffsetSeconds);
	const hours = Math.floor(abs / 3600);
	const minutes = Math.floor((abs % 3600) / 60);
	return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatDestinationLocalTime(tz: TimeZoneInfo, nowMs: number): {
	timeStr: string;
	dateStr: string;
	utcLabel: string;
} {
	const utcLabel = `UTC${formatOffset(tz.totalOffsetSeconds)}`;

	if (tz.timeZoneId && tz.timeZoneId !== 'UTC') {
		try {
			const dateObj = new Date(nowMs);
			const timeStr = new Intl.DateTimeFormat('en-US', {
				timeZone: tz.timeZoneId,
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
				hour12: false
			}).format(dateObj);
			const dateStr = new Intl.DateTimeFormat('en-US', {
				timeZone: tz.timeZoneId,
				weekday: 'short',
				month: 'short',
				day: 'numeric'
			}).format(dateObj);
			return { timeStr, dateStr, utcLabel };
		} catch {
			// Fall back to offset calculation below
		}
	}

	const shifted = new Date(nowMs + tz.totalOffsetSeconds * 1000);
	const hours = String(shifted.getUTCHours()).padStart(2, '0');
	const minutes = String(shifted.getUTCMinutes()).padStart(2, '0');
	const seconds = String(shifted.getUTCSeconds()).padStart(2, '0');
	const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

	return {
		timeStr: `${hours}:${minutes}:${seconds}`,
		dateStr: `${days[shifted.getUTCDay()]}, ${months[shifted.getUTCMonth()]} ${shifted.getUTCDate()}`,
		utcLabel
	};
}

export function formatDistance(meters: number): string {
	if (!meters) return '0 km';
	if (meters < 1000) return `${Math.round(meters)} m`;
	return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(millis: number): string {
	if (!millis) return '0 min';
	const totalMinutes = Math.round(millis / 60000);
	if (totalMinutes < 60) return `${totalMinutes} min`;
	const hours = Math.floor(totalMinutes / 60);
	const mins = totalMinutes % 60;
	return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function buildInfoWindowContent(
	stop: DiscoveredPlace,
	stopNumber: number | null,
	dayLabel: string | null,
	accentColor: string
): HTMLElement {
	const wrapper = document.createElement('div');
	wrapper.style.maxWidth = '260px';
	wrapper.style.fontFamily = 'Inter, system-ui, sans-serif';
	wrapper.style.color = '#0f172a';
	wrapper.style.padding = '2px';

	if (stopNumber !== null && dayLabel) {
		const badge = document.createElement('div');
		badge.textContent = `${dayLabel} · Stop ${stopNumber}`;
		badge.style.display = 'inline-block';
		badge.style.fontSize = '11px';
		badge.style.fontWeight = '700';
		badge.style.color = '#ffffff';
		badge.style.backgroundColor = accentColor;
		badge.style.borderRadius = '999px';
		badge.style.padding = '2px 8px';
		badge.style.marginBottom = '6px';
		wrapper.appendChild(badge);
	}

	const title = document.createElement('div');
	title.textContent = stop.name;
	title.style.fontWeight = '700';
	title.style.fontSize = '14px';
	title.style.lineHeight = '1.3';
	title.style.marginBottom = '4px';
	wrapper.appendChild(title);

	if (stop.rating !== null) {
		const ratingEl = document.createElement('div');
		const countText =
			stop.userRatingCount !== null ? ` (${stop.userRatingCount.toLocaleString()})` : '';
		ratingEl.textContent = `★ ${stop.rating.toFixed(1)}${countText} · ${stop.primaryType}`;
		ratingEl.style.fontSize = '12px';
		ratingEl.style.color = '#475569';
		ratingEl.style.marginBottom = '4px';
		wrapper.appendChild(ratingEl);
	}

	if (stop.formattedAddress) {
		const addr = document.createElement('div');
		addr.textContent = stop.formattedAddress;
		addr.style.fontSize = '12px';
		addr.style.color = '#64748b';
		addr.style.lineHeight = '1.35';
		wrapper.appendChild(addr);
	}

	if (stop.googleMapsUri) {
		const link = document.createElement('a');
		link.href = stop.googleMapsUri;
		link.target = '_blank';
		link.rel = 'noopener noreferrer';
		link.textContent = 'View on Google Maps ↗';
		link.style.display = 'inline-block';
		link.style.marginTop = '6px';
		link.style.fontSize = '12px';
		link.style.fontWeight = '600';
		link.style.color = '#0f766e';
		link.style.textDecoration = 'none';
		wrapper.appendChild(link);
	}

	return wrapper;
}
