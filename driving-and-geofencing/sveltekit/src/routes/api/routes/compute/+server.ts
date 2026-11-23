import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	formatDistanceMiles,
	formatDuration,
	getGmpApiKey,
	parseDurationSeconds
} from '$lib/server/gmp';
import type { LatLngPoint, RouteComputeResult } from '$lib/types';

interface RoutesApiResponse {
	routes?: Array<{
		distanceMeters?: number;
		duration?: string;
		optimizedIntermediateWaypointIndex?: number[];
		polyline?: { encodedPolyline?: string };
		legs?: Array<{
			distanceMeters?: number;
			duration?: string;
		}>;
	}>;
	error?: { message?: string; status?: string };
}

function isValidLatLng(point: unknown): point is LatLngPoint {
	if (!point || typeof point !== 'object') return false;
	const candidate = point as Partial<LatLngPoint>;
	return (
		typeof candidate.lat === 'number' &&
		Number.isFinite(candidate.lat) &&
		typeof candidate.lng === 'number' &&
		Number.isFinite(candidate.lng)
	);
}

export const POST: RequestHandler = async ({ request }) => {
	const apiKey = getGmpApiKey();
	if (!apiKey) {
		return json(
			{ error: 'PUBLIC_GOOGLE_MAPS_API_KEY is not configured on the server.' },
			{ status: 503 }
		);
	}

	let body: {
		origin?: LatLngPoint;
		destination?: LatLngPoint;
		intermediates?: LatLngPoint[];
	} = {};
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON request body.' }, { status: 400 });
	}

	if (!isValidLatLng(body.origin) || !isValidLatLng(body.destination)) {
		return json({ error: 'Valid origin and destination lat/lng coordinates are required.' }, { status: 400 });
	}

	const intermediates = Array.isArray(body.intermediates)
		? body.intermediates.filter(isValidLatLng)
		: [];

	const payload = {
		origin: {
			location: {
				latLng: {
					latitude: body.origin.lat,
					longitude: body.origin.lng
				}
			}
		},
		destination: {
			location: {
				latLng: {
					latitude: body.destination.lat,
					longitude: body.destination.lng
				}
			}
		},
		intermediates: intermediates.map((wp) => ({
			location: {
				latLng: {
					latitude: wp.lat,
					longitude: wp.lng
				}
			}
		})),
		travelMode: 'DRIVE',
		routingPreference: 'TRAFFIC_AWARE',
		optimizeWaypointOrder: intermediates.length > 0,
		units: 'IMPERIAL',
		languageCode: 'en-US'
	};

	try {
		const upstreamRes = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Goog-Api-Key': apiKey,
				'X-Goog-FieldMask':
					'routes.optimizedIntermediateWaypointIndex,routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.distanceMeters,routes.legs.duration,routes.legs.startLocation,routes.legs.endLocation'
			},
			body: JSON.stringify(payload)
		});

		const data = (await upstreamRes.json()) as RoutesApiResponse;
		if (!upstreamRes.ok) {
			return json(
				{
					error: data.error?.message || `Routes API returned ${upstreamRes.status}`,
					upstreamStatus: upstreamRes.status
				},
				{ status: upstreamRes.status }
			);
		}

		const route = data.routes?.[0];
		if (!route || !route.polyline?.encodedPolyline) {
			return json({ error: 'No route returned by Routes API.' }, { status: 404 });
		}

		const distanceMeters = route.distanceMeters ?? 0;
		const durationSeconds = parseDurationSeconds(route.duration);
		const optimizedIntermediateWaypointIndex = Array.isArray(
			route.optimizedIntermediateWaypointIndex
		)
			? route.optimizedIntermediateWaypointIndex
			: intermediates.map((_, idx) => idx);

		const result: RouteComputeResult = {
			encodedPolyline: route.polyline.encodedPolyline,
			distanceMeters,
			durationSeconds,
			distanceText: formatDistanceMiles(distanceMeters),
			durationText: formatDuration(durationSeconds),
			optimizedIntermediateWaypointIndex,
			legs: (route.legs ?? []).map((leg) => {
				const legMeters = leg.distanceMeters ?? 0;
				const legSeconds = parseDurationSeconds(leg.duration);
				return {
					distanceMeters: legMeters,
					durationSeconds: legSeconds,
					distanceText: formatDistanceMiles(legMeters),
					durationText: formatDuration(legSeconds)
				};
			})
		};

		return json(result);
	} catch (err) {
		return json(
			{ error: err instanceof Error ? err.message : 'Failed to compute route.' },
			{ status: 502 }
		);
	}
};
