import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServerApiKey, GMP_ATTRIBUTION_ID } from '$lib/server/apiKey';
import type { LatLngPoint } from '$lib/types/logistics';

interface ComputeMatrixBody {
	origins?: LatLngPoint[];
	destinations?: LatLngPoint[];
}

const toMatrixWaypoint = (pt: LatLngPoint) => ({
	waypoint: {
		location: {
			latLng: {
				latitude: pt.lat,
				longitude: pt.lng
			}
		}
	}
});

export const POST: RequestHandler = async ({ request }) => {
	const apiKey = getServerApiKey();
	if (!apiKey) {
		return json({ error: 'PUBLIC_GOOGLE_MAPS_API_KEY is not configured.' }, { status: 400 });
	}

	let body: ComputeMatrixBody;
	try {
		body = (await request.json()) as ComputeMatrixBody;
	} catch {
		return json({ error: 'Invalid JSON request body.' }, { status: 400 });
	}

	const origins = body.origins ?? [];
	const destinations = body.destinations ?? [];
	if (origins.length === 0 || destinations.length === 0) {
		return json({ error: 'At least one origin and one destination are required.' }, { status: 400 });
	}

	const payload = {
		origins: origins.map(toMatrixWaypoint),
		destinations: destinations.map(toMatrixWaypoint),
		travelMode: 'DRIVE',
		routingPreference: 'TRAFFIC_AWARE'
	};

	const upstreamResponse = await fetch(
		'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Goog-Api-Key': apiKey,
				'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,status,condition',
				'X-Goog-Maps-Solution-ID': GMP_ATTRIBUTION_ID
			},
			body: JSON.stringify(payload)
		}
	);

	const data = await upstreamResponse.json().catch(() => []);
	if (!upstreamResponse.ok) {
		const message = Array.isArray(data) ? data[0]?.error?.message : data?.error?.message;
		return json({
			ok: false,
			upstreamStatus: upstreamResponse.status,
			error: message || `Route Matrix API error (${upstreamResponse.status})`
		});
	}

	return json({ ok: true, elements: Array.isArray(data) ? data : [] });
};
