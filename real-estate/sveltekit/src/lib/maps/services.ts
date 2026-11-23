import { haversineDistanceMeters } from '$lib/data/properties';
import { GMP_USAGE_ATTRIBUTION_IDS, loadGmpLibraries } from '$lib/maps/loader';
import type {
	AmenityCategory,
	CommuteLegSummary,
	CommuteResult,
	LatLngLiteral,
	NearbyAmenity
} from '$lib/types';

const CATEGORY_TYPES: Record<Exclude<AmenityCategory, 'all'>, string[]> = {
	schools: ['school', 'primary_school', 'secondary_school', 'university'],
	groceries: ['supermarket', 'grocery_store'],
	transit: ['subway_station', 'train_station', 'light_rail_station', 'bus_station', 'transit_station']
};

function categorizePrimaryType(primaryType: string | undefined): Exclude<AmenityCategory, 'all'> {
	const t = (primaryType || '').toLowerCase();
	if (t.includes('school') || t.includes('university')) return 'schools';
	if (t.includes('grocery') || t.includes('supermarket') || t.includes('market')) return 'groceries';
	return 'transit';
}

function formatDurationMs(ms: number | null | undefined): string {
	if (!ms || ms <= 0) return '—';
	const mins = Math.max(1, Math.round(ms / 60000));
	if (mins < 60) return `${mins} min`;
	const hrs = Math.floor(mins / 60);
	const rem = mins % 60;
	return rem > 0 ? `${hrs} hr ${rem} min` : `${hrs} hr`;
}

function formatMetersImperial(meters: number | undefined): string {
	if (!meters || meters <= 0) return '—';
	const miles = meters / 1609.344;
	return miles < 0.2 ? `${Math.round(meters * 3.28084)} ft` : `${miles.toFixed(1)} mi`;
}

export async function fetchNearbyAmenities(
	origin: LatLngLiteral,
	radiusMeters = 5000
): Promise<NearbyAmenity[]> {
	const groups: Array<Exclude<AmenityCategory, 'all'>> = ['schools', 'groceries', 'transit'];

	try {
		const responses = await Promise.all(
			groups.map(async (group) => {
				const res = await fetch('/api/places/nearby', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						lat: origin.lat,
						lng: origin.lng,
						radius: radiusMeters,
						includedTypes: CATEGORY_TYPES[group],
						maxResultCount: 6
					})
				});
				if (!res.ok) {
					throw new Error(`BFF nearby failed (${res.status})`);
				}
				const json = (await res.json()) as {
					places?: Array<{
						id?: string;
						displayName?: { text?: string };
						formattedAddress?: string;
						location?: { latitude?: number; longitude?: number };
						primaryType?: string;
						rating?: number;
						userRatingCount?: number;
					}>;
				};
				return (json.places || []).map((p): NearbyAmenity | null => {
					const lat = p.location?.latitude;
					const lng = p.location?.longitude;
					if (typeof lat !== 'number' || typeof lng !== 'number') return null;
					return {
						id: p.id || `${group}-${lat}-${lng}`,
						name: p.displayName?.text || 'Unnamed Place',
						address: p.formattedAddress || 'San Francisco, CA',
						category: group,
						primaryType: p.primaryType || group,
						lat,
						lng,
						distanceMeters: haversineDistanceMeters(origin.lat, origin.lng, lat, lng),
						rating: p.rating,
						userRatingCount: p.userRatingCount
					};
				});
			})
		);

		const merged = responses.flat().filter((item): item is NearbyAmenity => item !== null);
		const deduped = new Map<string, NearbyAmenity>();
		for (const item of merged) {
			if (!deduped.has(item.id)) {
				deduped.set(item.id, item);
			}
		}
		return Array.from(deduped.values()).sort((a, b) => a.distanceMeters - b.distanceMeters);
	} catch {
		// Fallback to client-side Places API (New) SDK (e.g. if API key is HTTP-referrer restricted)
		const { places } = await loadGmpLibraries();
		const sdkResults = await Promise.all(
			groups.map(async (group) => {
				const { places: found } = await places.Place.searchNearby({
					fields: [
						'id',
						'displayName',
						'formattedAddress',
						'location',
						'primaryType',
						'rating',
						'userRatingCount'
					],
					locationRestriction: {
						center: origin,
						radius: radiusMeters
					},
					includedTypes: CATEGORY_TYPES[group],
					maxResultCount: 6
				});
				return found.map((place): NearbyAmenity | null => {
					const loc = place.location;
					if (!loc) return null;
					const lat = loc.lat();
					const lng = loc.lng();
					return {
						id: place.id,
						name: place.displayName || 'Unnamed Place',
						address: place.formattedAddress || 'San Francisco, CA',
						category: place.primaryType ? categorizePrimaryType(place.primaryType) : group,
						primaryType: place.primaryType || group,
						lat,
						lng,
						distanceMeters: haversineDistanceMeters(origin.lat, origin.lng, lat, lng),
						rating: typeof place.rating === 'number' ? place.rating : undefined,
						userRatingCount:
							typeof place.userRatingCount === 'number' ? place.userRatingCount : undefined
					};
				});
			})
		);

		const merged = sdkResults.flat().filter((item): item is NearbyAmenity => item !== null);
		const deduped = new Map<string, NearbyAmenity>();
		for (const item of merged) {
			if (!deduped.has(item.id)) {
				deduped.set(item.id, item);
			}
		}
		return Array.from(deduped.values()).sort((a, b) => a.distanceMeters - b.distanceMeters);
	}
}

export async function resolveWorkplaceQuery(
	textQuery: string
): Promise<{ label: string; location: LatLngLiteral }> {
	const trimmed = textQuery.trim();
	if (!trimmed) {
		throw new Error('Please enter a workplace address or landmark.');
	}

	try {
		const res = await fetch('/api/places/search-text', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ textQuery: trimmed, lat: 37.7749, lng: -122.4194 })
		});
		if (!res.ok) {
			throw new Error(`BFF search-text failed (${res.status})`);
		}
		const payload = (await res.json()) as {
			places?: Array<{
				displayName?: { text?: string };
				formattedAddress?: string;
				location?: { latitude?: number; longitude?: number };
			}>;
		};
		const first = payload.places?.[0];
		if (
			first &&
			typeof first.location?.latitude === 'number' &&
			typeof first.location?.longitude === 'number'
		) {
			return {
				label: first.displayName?.text || first.formattedAddress || trimmed,
				location: {
					lat: first.location.latitude,
					lng: first.location.longitude
				}
			};
		}
	} catch {
		// Fall through to Maps JS Places / Geocoder fallback
	}

	const { places, geocoding } = await loadGmpLibraries();
	try {
		const { places: found } = await places.Place.searchByText({
			textQuery: trimmed,
			fields: ['displayName', 'formattedAddress', 'location'],
			locationBias: {
				center: { lat: 37.7749, lng: -122.4194 },
				radius: 25000
			},
			maxResultCount: 1
		});
		const first = found[0];
		if (first?.location) {
			return {
				label: first.displayName || first.formattedAddress || trimmed,
				location: {
					lat: first.location.lat(),
					lng: first.location.lng()
				}
			};
		}
	} catch {
		// Fall through to Geocoder
	}

	const geocoder = new geocoding.Geocoder();
	const geo = await geocoder.geocode({ address: trimmed });
	const match = geo.results[0];
	if (!match) {
		throw new Error(`Could not locate "${trimmed}". Try a San Francisco address.`);
	}
	return {
		label: match.formatted_address || trimmed,
		location: {
			lat: match.geometry.location.lat(),
			lng: match.geometry.location.lng()
		}
	};
}

export async function calculateWorkplaceCommute(
	origin: LatLngLiteral,
	destination: LatLngLiteral,
	destinationLabel: string
): Promise<CommuteResult> {
	try {
		const [matrixRes, routeRes] = await Promise.all([
			fetch('/api/routes/matrix', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ origin, destination })
			}),
			fetch('/api/routes/compute', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ origin, destination, travelMode: 'DRIVE' })
			})
		]);

		if (!matrixRes.ok) {
			throw new Error(`BFF route matrix failed (${matrixRes.status})`);
		}

		const matrixJson = (await matrixRes.json()) as {
			driving?: CommuteLegSummary | null;
			transit?: CommuteLegSummary | null;
		};

		let encodedPolyline: string | null = null;
		if (routeRes.ok) {
			const routeJson = (await routeRes.json()) as {
				routes?: Array<{ polyline?: { encodedPolyline?: string } }>;
			};
			encodedPolyline = routeJson.routes?.[0]?.polyline?.encodedPolyline || null;
		}

		return {
			destinationLabel,
			destinationLocation: destination,
			driving: matrixJson.driving || null,
			transit: matrixJson.transit || null,
			encodedPolyline
		};
	} catch {
		// Fallback to Maps JS SDK RouteMatrix + Route classes
		const { routes } = await loadGmpLibraries();

		const [driveMatrix, transitMatrix, driveRoute] = await Promise.allSettled([
			routes.RouteMatrix.computeRouteMatrix({
				origins: [origin],
				destinations: [destination],
				travelMode: 'DRIVING',
				routingPreference: 'TRAFFIC_AWARE',
				fields: ['condition', 'distanceMeters', 'durationMillis', 'localizedValues'],
				internalUsageAttributionIds: GMP_USAGE_ATTRIBUTION_IDS
			}),
			routes.RouteMatrix.computeRouteMatrix({
				origins: [origin],
				destinations: [destination],
				travelMode: 'TRANSIT',
				fields: ['condition', 'distanceMeters', 'durationMillis', 'localizedValues'],
				internalUsageAttributionIds: GMP_USAGE_ATTRIBUTION_IDS
			}),
			routes.Route.computeRoutes({
				origin,
				destination,
				travelMode: 'DRIVING',
				routingPreference: 'TRAFFIC_AWARE',
				fields: ['durationMillis', 'distanceMeters', 'path', 'localizedValues'],
				internalUsageAttributionIds: GMP_USAGE_ATTRIBUTION_IDS
			})
		]);

		const toLeg = (
			settled: PromiseSettledResult<{ matrix: google.maps.routes.RouteMatrix }>
		): CommuteLegSummary | null => {
			if (settled.status !== 'fulfilled') return null;
			const item = settled.value.matrix.rows[0]?.items[0];
			if (!item) return null;
			return {
				durationText:
					item.localizedValues?.duration || formatDurationMs(item.durationMillis),
				distanceText:
					item.localizedValues?.distance || formatMetersImperial(item.distanceMeters),
				durationSeconds: item.durationMillis ? Math.round(item.durationMillis / 1000) : 0,
				distanceMeters: item.distanceMeters || 0,
				condition: item.condition || 'ROUTE_EXISTS'
			};
		};

		let path: LatLngLiteral[] | null = null;
		if (driveRoute.status === 'fulfilled') {
			const firstRoute = driveRoute.value.routes?.[0];
			if (firstRoute?.path?.length) {
				path = firstRoute.path.map((pt) => ({ lat: pt.lat, lng: pt.lng }));
			}
		}

		return {
			destinationLabel,
			destinationLocation: destination,
			driving: toLeg(driveMatrix),
			transit: toLeg(transitMatrix),
			path
		};
	}
}
