import type { RequestHandler } from './$types';
import { getGmpApiKey, secureJson } from '$lib/server/gmp';
import type { LatLngLiteral } from '$lib/types';

const COMPUTE_ROUTES_FIELD_MASK =
	'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.localizedValues';

export const POST: RequestHandler = async ({ request }) => {
	const apiKey = getGmpApiKey();
	if (!apiKey) {
		return secureJson({ error: 'PUBLIC_GOOGLE_MAPS_API_KEY is not configured.' }, 503);
	}

	let body: {
		origin?: LatLngLiteral;
		destination?: LatLngLiteral;
		travelMode?: 'DRIVE' | 'TRANSIT';
	};
	try {
		body = await request.json();
	} catch {
		return secureJson({ error: 'Invalid JSON request body.' }, 400);
	}

	if (
		!body.origin ||
		typeof body.origin.lat !== 'number' ||
		typeof body.origin.lng !== 'number' ||
		!body.destination ||
		typeof body.destination.lat !== 'number' ||
		typeof body.destination.lng !== 'number'
	) {
		return secureJson({ error: 'Valid origin and destination { lat, lng } are required.' }, 400);
	}

	const travelMode = body.travelMode === 'TRANSIT' ? 'TRANSIT' : 'DRIVE';
	const requestPayload: Record<string, unknown> = {
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
		travelMode,
		units: 'IMPERIAL'
	};

	if (travelMode === 'DRIVE') {
		requestPayload.routingPreference = 'TRAFFIC_AWARE';
	}

	try {
		const upstream = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Goog-Api-Key': apiKey,
				'X-Goog-FieldMask': COMPUTE_ROUTES_FIELD_MASK
			},
			body: JSON.stringify(requestPayload)
		});

		const payload = await upstream.json();
		if (!upstream.ok) {
			return secureJson(
				{ error: payload?.error?.message || 'Routes Compute upstream error.', details: payload },
				upstream.status
			);
		}

		return secureJson(payload, 200);
	} catch (err) {
		return secureJson(
			{ error: err instanceof Error ? err.message : 'Failed to contact Compute Routes API.' },
			502
		);
	}
};
