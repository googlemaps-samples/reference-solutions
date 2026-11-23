import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServerApiKey, GMP_ATTRIBUTION_ID } from '$lib/server/apiKey';
import type { LatLngPoint } from '$lib/types/logistics';

interface ComputeRoutesBody {
	origin?: LatLngPoint;
	destination?: LatLngPoint;
	intermediates?: LatLngPoint[];
	optimizeWaypointOrder?: boolean;
}

const toWaypoint = (pt: LatLngPoint) => ({
	location: {
		latLng: {
			latitude: pt.lat,
			longitude: pt.lng
		}
	}
});

export const POST: RequestHandler = async ({ request }) => {
	const apiKey = getServerApiKey();
	if (!apiKey) {
		return json({ error: 'PUBLIC_GOOGLE_MAPS_API_KEY is not configured.' }, { status: 400 });
	}

	let body: ComputeRoutesBody;
	try {
		body = (await request.json()) as ComputeRoutesBody;
	} catch {
		return json({ error: 'Invalid JSON request body.' }, { status: 400 });
	}

	if (!body.origin || !body.destination) {
		return json({ error: 'origin and destination coordinates are required.' }, { status: 400 });
	}

	const payload = {
		origin: toWaypoint(body.origin),
		destination: toWaypoint(body.destination),
		intermediates: (body.intermediates ?? []).map(toWaypoint),
		travelMode: 'DRIVE',
		routingPreference: 'TRAFFIC_AWARE',
		optimizeWaypointOrder: Boolean(body.optimizeWaypointOrder && (body.intermediates?.length ?? 0) > 0),
		computeAlternativeRoutes: false,
		languageCode: 'en-US',
		units: 'IMPERIAL'
	};

	const fieldMask = [
		'routes.duration',
		'routes.distanceMeters',
		'routes.polyline.encodedPolyline',
		'routes.legs.duration',
		'routes.legs.distanceMeters',
		'routes.legs.startLocation',
		'routes.legs.endLocation',
		'routes.optimizedIntermediateWaypointIndex'
	].join(',');

	const upstreamResponse = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-Goog-Api-Key': apiKey,
			'X-Goog-FieldMask': fieldMask,
			'X-Goog-Maps-Solution-ID': GMP_ATTRIBUTION_ID
		},
		body: JSON.stringify(payload)
	});

	const data = await upstreamResponse.json().catch(() => ({}));
	if (!upstreamResponse.ok) {
		return json({
			ok: false,
			upstreamStatus: upstreamResponse.status,
			error: data?.error?.message || `Routes API error (${upstreamResponse.status})`
		});
	}

	return json({ ok: true, ...data });
};
