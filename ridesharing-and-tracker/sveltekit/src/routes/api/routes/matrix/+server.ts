import type { RequestHandler } from './$types';
import { buildGmpHeaders, getServerApiKey, secureJson } from '$lib/server/gmpProxy';
import type { LatLngLiteral } from '$lib/types';

const FIELD_MASK = 'originIndex,destinationIndex,duration,distanceMeters,status,condition';

interface MatrixRequestBody {
	origins?: LatLngLiteral[];
	destination?: LatLngLiteral;
}

function isValidLatLng(pt: unknown): pt is LatLngLiteral {
	if (!pt || typeof pt !== 'object') return false;
	const { lat, lng } = pt as LatLngLiteral;
	return (
		typeof lat === 'number' &&
		typeof lng === 'number' &&
		Number.isFinite(lat) &&
		Number.isFinite(lng)
	);
}

export const POST: RequestHandler = async ({ request }) => {
	const apiKey = getServerApiKey();
	if (!apiKey) {
		return secureJson({ error: 'PUBLIC_GOOGLE_MAPS_API_KEY is not configured.' }, 503);
	}

	let body: MatrixRequestBody;
	try {
		body = await request.json();
	} catch {
		return secureJson({ error: 'Invalid JSON request body.' }, 400);
	}

	if (
		!Array.isArray(body.origins) ||
		body.origins.length === 0 ||
		body.origins.length > 25 ||
		!body.origins.every(isValidLatLng) ||
		!isValidLatLng(body.destination)
	) {
		return secureJson(
			{ error: 'Valid origins array (1-25) and destination lat/lng are required.' },
			400
		);
	}

	const payload = {
		origins: body.origins.map((loc) => ({
			waypoint: {
				location: {
					latLng: {
						latitude: loc.lat,
						longitude: loc.lng
					}
				}
			}
		})),
		destinations: [
			{
				waypoint: {
					location: {
						latLng: {
							latitude: body.destination.lat,
							longitude: body.destination.lng
						}
					}
				}
			}
		],
		travelMode: 'DRIVE',
		routingPreference: 'TRAFFIC_AWARE_OPTIMAL'
	};

	try {
		const upstream = await fetch(
			'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
			{
				method: 'POST',
				headers: buildGmpHeaders(apiKey, FIELD_MASK, request),
				body: JSON.stringify(payload)
			}
		);

		const data = await upstream.json();
		if (!upstream.ok) {
			return secureJson(
				{
					error: data?.error?.message || 'Routes computeRouteMatrix request failed.',
					code: upstream.status
				},
				upstream.status
			);
		}

		const elements = Array.isArray(data) ? data : [];
		return secureJson({ elements }, 200);
	} catch {
		return secureJson({ error: 'Failed to reach Routes API computeRouteMatrix.' }, 502);
	}
};
