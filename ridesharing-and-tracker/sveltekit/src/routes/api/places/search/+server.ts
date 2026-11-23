import type { RequestHandler } from './$types';
import { buildGmpHeaders, getServerApiKey, secureJson } from '$lib/server/gmpProxy';

const FIELD_MASK = 'places.id,places.displayName,places.formattedAddress,places.location';

export const POST: RequestHandler = async ({ request }) => {
	const apiKey = getServerApiKey();
	if (!apiKey) {
		return secureJson({ error: 'PUBLIC_GOOGLE_MAPS_API_KEY is not configured.' }, 503);
	}

	let body: { textQuery?: string; maxResultCount?: number };
	try {
		body = await request.json();
	} catch {
		return secureJson({ error: 'Invalid JSON request body.' }, 400);
	}

	const textQuery = typeof body.textQuery === 'string' ? body.textQuery.trim() : '';
	if (!textQuery) {
		return secureJson({ error: 'textQuery is required.' }, 400);
	}

	const payload = {
		textQuery,
		languageCode: 'en',
		regionCode: 'US',
		maxResultCount: Math.min(Math.max(Number(body.maxResultCount) || 1, 1), 5),
		locationBias: {
			circle: {
				center: { latitude: 34.0328, longitude: -118.3669 },
				radius: 45000.0
			}
		}
	};

	try {
		const upstream = await fetch('https://places.googleapis.com/v1/places:searchText', {
			method: 'POST',
			headers: buildGmpHeaders(apiKey, FIELD_MASK, request),
			body: JSON.stringify(payload)
		});

		const data = await upstream.json();
		if (!upstream.ok) {
			return secureJson(
				{
					error: data?.error?.message || 'Places Text Search request failed.',
					code: upstream.status
				},
				upstream.status
			);
		}

		return secureJson({ places: data.places ?? [] }, 200);
	} catch {
		return secureJson({ error: 'Failed to reach Places API (New).' }, 502);
	}
};
