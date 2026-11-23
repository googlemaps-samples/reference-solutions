import type { RequestHandler } from './$types';
import { getGmpApiKey, secureJson } from '$lib/server/gmp';

const TEXT_SEARCH_FIELD_MASK =
	'places.id,places.displayName,places.formattedAddress,places.location,places.viewport';

export const POST: RequestHandler = async ({ request }) => {
	const apiKey = getGmpApiKey();
	if (!apiKey) {
		return secureJson({ error: 'PUBLIC_GOOGLE_MAPS_API_KEY is not configured.' }, 503);
	}

	let body: { textQuery?: string; lat?: number; lng?: number; radius?: number };
	try {
		body = await request.json();
	} catch {
		return secureJson({ error: 'Invalid JSON request body.' }, 400);
	}

	const textQuery = body.textQuery?.trim();
	if (!textQuery) {
		return secureJson({ error: 'textQuery is required.' }, 400);
	}

	const centerLat = typeof body.lat === 'number' ? body.lat : 37.7749;
	const centerLng = typeof body.lng === 'number' ? body.lng : -122.4194;
	const radius = typeof body.radius === 'number' ? Math.min(Math.max(body.radius, 500), 50000) : 20000;

	try {
		const upstream = await fetch('https://places.googleapis.com/v1/places:searchText', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Goog-Api-Key': apiKey,
				'X-Goog-FieldMask': TEXT_SEARCH_FIELD_MASK
			},
			body: JSON.stringify({
				textQuery,
				pageSize: 5,
				locationBias: {
					circle: {
						center: { latitude: centerLat, longitude: centerLng },
						radius
					}
				}
			})
		});

		const payload = await upstream.json();
		if (!upstream.ok) {
			return secureJson(
				{ error: payload?.error?.message || 'Places Text Search upstream error.', details: payload },
				upstream.status
			);
		}

		return secureJson(payload, 200);
	} catch (err) {
		return secureJson(
			{ error: err instanceof Error ? err.message : 'Failed to contact Places Text Search API.' },
			502
		);
	}
};
