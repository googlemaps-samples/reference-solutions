import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import type { RequestHandler } from './$types';

const ROUTES_COMPUTE_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const ROUTES_FIELD_MASK =
	'routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration';

interface LatLngInput {
	lat: number;
	lng: number;
}

interface RestComputeRoutesPayload {
	routes?: Array<{
		distanceMeters?: number;
		duration?: string;
		staticDuration?: string;
		polyline?: { encodedPolyline?: string };
		legs?: Array<{
			steps?: Array<{
				distanceMeters?: number;
				staticDuration?: string;
				navigationInstruction?: { instructions?: string };
			}>;
		}>;
	}>;
	error?: { message?: string };
}

function isValidLatLng(pt: unknown): pt is LatLngInput {
	if (!pt || typeof pt !== 'object') return false;
	const { lat, lng } = pt as Record<string, unknown>;
	return (
		typeof lat === 'number' &&
		typeof lng === 'number' &&
		Number.isFinite(lat) &&
		Number.isFinite(lng) &&
		lat >= -90 &&
		lat <= 90 &&
		lng >= -180 &&
		lng <= 180
	);
}

function parseProtoDurationSeconds(duration?: string): number {
	if (!duration) return 0;
	const match = duration.match(/^(\d+(?:\.\d+)?)s$/);
	return match ? Math.round(Number(match[1])) : 0;
}

export const POST: RequestHandler = async ({ request }) => {
	const apiKey = env.PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
	if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
		return json(
			{ error: 'PUBLIC_GOOGLE_MAPS_API_KEY is not configured on the server.' },
			{ status: 503 }
		);
	}

	let body: { origin?: unknown; destination?: unknown };
	try {
		body = (await request.json()) as { origin?: unknown; destination?: unknown };
	} catch {
		return json({ error: 'Invalid JSON request body.' }, { status: 400 });
	}

	if (!isValidLatLng(body.origin) || !isValidLatLng(body.destination)) {
		return json({ error: 'Valid origin and destination coordinates are required.' }, { status: 400 });
	}

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		'X-Goog-Api-Key': apiKey,
		'X-Goog-FieldMask': ROUTES_FIELD_MASK
	};
	const referer = request.headers.get('referer');
	if (referer) {
		headers['Referer'] = referer;
	}

	const upstreamRes = await fetch(ROUTES_COMPUTE_URL, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			origin: {
				location: {
					latLng: { latitude: body.origin.lat, longitude: body.origin.lng }
				}
			},
			destination: {
				location: {
					latLng: { latitude: body.destination.lat, longitude: body.destination.lng }
				}
			},
			travelMode: 'DRIVE',
			routingPreference: 'TRAFFIC_AWARE',
			computeAlternativeRoutes: false,
			languageCode: 'en-US',
			units: 'METRIC'
		})
	});

	const payload = (await upstreamRes.json()) as RestComputeRoutesPayload;
	const primary = payload.routes?.[0];
	if (!upstreamRes.ok || !primary) {
		return json(
			{ error: payload.error?.message ?? 'Routes API computeRoutes failed.' },
			{ status: upstreamRes.status || 502 }
		);
	}

	const steps =
		primary.legs?.[0]?.steps?.map((step) => ({
			instruction: step.navigationInstruction?.instructions ?? 'Continue along route',
			distanceMeters: step.distanceMeters ?? 0,
			durationSeconds: parseProtoDurationSeconds(step.staticDuration)
		})) ?? [];

	return json({
		distanceMeters: primary.distanceMeters ?? 0,
		durationSeconds: parseProtoDurationSeconds(primary.duration),
		staticDurationSeconds: parseProtoDurationSeconds(primary.staticDuration),
		encodedPolyline: primary.polyline?.encodedPolyline ?? '',
		steps,
		source: 'bff'
	});
};
