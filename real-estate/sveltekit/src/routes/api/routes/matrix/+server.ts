import type { RequestHandler } from './$types';
import {
	formatDistanceImperial,
	formatDurationMinutes,
	getGmpApiKey,
	parseDurationSeconds,
	secureJson
} from '$lib/server/gmp';
import type { CommuteLegSummary, LatLngLiteral } from '$lib/types';

const MATRIX_FIELD_MASK =
	'originIndex,destinationIndex,status,condition,distanceMeters,duration,localizedValues';

interface UpstreamMatrixElement {
	originIndex?: number;
	destinationIndex?: number;
	status?: { code?: number; message?: string };
	condition?: string;
	distanceMeters?: number;
	duration?: string;
	localizedValues?: {
		distance?: { text?: string };
		duration?: { text?: string };
		staticDuration?: { text?: string };
	};
}

async function fetchModeMatrix(
	apiKey: string,
	origin: LatLngLiteral,
	destination: LatLngLiteral,
	travelMode: 'DRIVE' | 'TRANSIT'
): Promise<{ ok: boolean; status: number; leg: CommuteLegSummary | null; error?: string }> {
	const requestBody: Record<string, unknown> = {
		origins: [
			{
				waypoint: {
					location: {
						latLng: {
							latitude: origin.lat,
							longitude: origin.lng
						}
					}
				}
			}
		],
		destinations: [
			{
				waypoint: {
					location: {
						latLng: {
							latitude: destination.lat,
							longitude: destination.lng
						}
					}
				}
			}
		],
		travelMode,
		units: 'IMPERIAL'
	};

	if (travelMode === 'DRIVE') {
		requestBody.routingPreference = 'TRAFFIC_AWARE';
	}

	const upstream = await fetch(
		'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Goog-Api-Key': apiKey,
				'X-Goog-FieldMask': MATRIX_FIELD_MASK
			},
			body: JSON.stringify(requestBody)
		}
	);

	const raw = await upstream.json();
	if (!upstream.ok) {
		return {
			ok: false,
			status: upstream.status,
			leg: null,
			error: raw?.error?.message || `Route Matrix (${travelMode}) upstream error.`
		};
	}

	const first: UpstreamMatrixElement | undefined = Array.isArray(raw) ? raw[0] : raw;
	if (!first || first.condition === 'ROUTE_NOT_FOUND') {
		return {
			ok: true,
			status: 200,
			leg: {
				durationText: 'Unavailable',
				distanceText: '—',
				durationSeconds: 0,
				distanceMeters: 0,
				condition: first?.condition || 'ROUTE_NOT_FOUND'
			}
		};
	}

	const durationSeconds = parseDurationSeconds(first.duration);
	const distanceMeters = typeof first.distanceMeters === 'number' ? first.distanceMeters : 0;

	return {
		ok: true,
		status: 200,
		leg: {
			durationText:
				first.localizedValues?.duration?.text || formatDurationMinutes(durationSeconds),
			distanceText:
				first.localizedValues?.distance?.text || formatDistanceImperial(distanceMeters),
			durationSeconds,
			distanceMeters,
			condition: first.condition || 'ROUTE_EXISTS'
		}
	};
}

export const POST: RequestHandler = async ({ request }) => {
	const apiKey = getGmpApiKey();
	if (!apiKey) {
		return secureJson({ error: 'PUBLIC_GOOGLE_MAPS_API_KEY is not configured.' }, 503);
	}

	let body: {
		origin?: LatLngLiteral;
		destination?: LatLngLiteral;
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

	try {
		const [driveRes, transitRes] = await Promise.all([
			fetchModeMatrix(apiKey, body.origin, body.destination, 'DRIVE'),
			fetchModeMatrix(apiKey, body.origin, body.destination, 'TRANSIT')
		]);

		if (!driveRes.ok && !transitRes.ok) {
			return secureJson(
				{ error: driveRes.error || transitRes.error || 'Routes Matrix request failed.' },
				driveRes.status || 502
			);
		}

		return secureJson(
			{
				driving: driveRes.leg,
				transit: transitRes.leg,
				warnings: [driveRes.error, transitRes.error].filter(Boolean)
			},
			200
		);
	} catch (err) {
		return secureJson(
			{ error: err instanceof Error ? err.message : 'Failed to contact Routes Matrix API.' },
			502
		);
	}
};
