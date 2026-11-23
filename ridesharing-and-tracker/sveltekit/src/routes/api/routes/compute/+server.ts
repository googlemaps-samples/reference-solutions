import type { RequestHandler } from './$types';
import { buildGmpHeaders, getServerApiKey, secureJson } from '$lib/server/gmpProxy';
import type { EmissionType, LatLngLiteral } from '$lib/types';

const FIELD_MASK =
	'routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline.encodedPolyline,routes.routeLabels,routes.travelAdvisory.fuelConsumptionMicroliters,routes.localizedValues';

interface ComputeRouteBody {
	origin?: LatLngLiteral;
	destination?: LatLngLiteral;
	emissionType?: EmissionType;
	includeEcoReference?: boolean;
}

function isValidLatLng(pt: unknown): pt is LatLngLiteral {
	if (!pt || typeof pt !== 'object') return false;
	const { lat, lng } = pt as LatLngLiteral;
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

export const POST: RequestHandler = async ({ request }) => {
	const apiKey = getServerApiKey();
	if (!apiKey) {
		return secureJson({ error: 'PUBLIC_GOOGLE_MAPS_API_KEY is not configured.' }, 503);
	}

	let body: ComputeRouteBody;
	try {
		body = await request.json();
	} catch {
		return secureJson({ error: 'Invalid JSON request body.' }, 400);
	}

	if (!isValidLatLng(body.origin) || !isValidLatLng(body.destination)) {
		return secureJson({ error: 'Valid origin and destination lat/lng are required.' }, 400);
	}

	const emissionType: EmissionType =
		body.emissionType === 'ELECTRIC' || body.emissionType === 'HYBRID'
			? body.emissionType
			: 'GASOLINE';

	const includeEcoReference = body.includeEcoReference !== false;

	const payload: Record<string, unknown> = {
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
		travelMode: 'DRIVE',
		routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
		units: 'IMPERIAL',
		languageCode: 'en-US',
		regionCode: 'US',
		extraComputations: ['FUEL_CONSUMPTION'],
		routeModifiers: {
			vehicleInfo: {
				emissionType
			}
		}
	};

	if (includeEcoReference) {
		payload.requestedReferenceRoutes = ['FUEL_EFFICIENT'];
	}

	try {
		const upstream = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
			method: 'POST',
			headers: buildGmpHeaders(apiKey, FIELD_MASK, request),
			body: JSON.stringify(payload)
		});

		const data = await upstream.json();
		if (!upstream.ok) {
			return secureJson(
				{
					error: data?.error?.message || 'Routes computeRoutes request failed.',
					code: upstream.status
				},
				upstream.status
			);
		}

		return secureJson({ routes: data.routes ?? [] }, 200);
	} catch {
		return secureJson({ error: 'Failed to reach Routes API computeRoutes.' }, 502);
	}
};
