import type { RequestHandler } from './$types';
import { getGmpApiKey, secureJson } from '$lib/server/gmp';

const NEARBY_FIELD_MASK =
	'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.rating,places.userRatingCount';

export const POST: RequestHandler = async ({ request }) => {
	const apiKey = getGmpApiKey();
	if (!apiKey) {
		return secureJson({ error: 'PUBLIC_GOOGLE_MAPS_API_KEY is not configured.' }, 503);
	}

	let body: {
		lat?: number;
		lng?: number;
		radius?: number;
		includedTypes?: string[];
		maxResultCount?: number;
	};
	try {
		body = await request.json();
	} catch {
		return secureJson({ error: 'Invalid JSON request body.' }, 400);
	}

	if (typeof body.lat !== 'number' || typeof body.lng !== 'number') {
		return secureJson({ error: 'Numeric lat and lng are required.' }, 400);
	}

	const radius =
		typeof body.radius === 'number' ? Math.min(Math.max(body.radius, 100), 50000) : 5000;
	const includedTypes =
		Array.isArray(body.includedTypes) && body.includedTypes.length > 0
			? body.includedTypes
			: ['school', 'supermarket', 'grocery_store', 'subway_station', 'train_station', 'transit_station'];
	const maxResultCount =
		typeof body.maxResultCount === 'number'
			? Math.min(Math.max(body.maxResultCount, 1), 20)
			: 12;

	try {
		const upstream = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Goog-Api-Key': apiKey,
				'X-Goog-FieldMask': NEARBY_FIELD_MASK
			},
			body: JSON.stringify({
				includedTypes,
				maxResultCount,
				rankPreference: 'DISTANCE',
				locationRestriction: {
					circle: {
						center: {
							latitude: body.lat,
							longitude: body.lng
						},
						radius
					}
				}
			})
		});

		const payload = await upstream.json();
		if (!upstream.ok) {
			return secureJson(
				{ error: payload?.error?.message || 'Places Nearby Search upstream error.', details: payload },
				upstream.status
			);
		}

		return secureJson(payload, 200);
	} catch (err) {
		return secureJson(
			{ error: err instanceof Error ? err.message : 'Failed to contact Places Nearby Search API.' },
			502
		);
	}
};
