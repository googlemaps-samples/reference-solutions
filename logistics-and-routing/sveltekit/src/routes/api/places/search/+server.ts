import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServerApiKey, GMP_ATTRIBUTION_ID } from '$lib/server/apiKey';

interface PlacesSearchBody {
	textQuery?: string;
	maxResultCount?: number;
	center?: { lat: number; lng: number };
	radiusMeters?: number;
}

export const POST: RequestHandler = async ({ request }) => {
	const apiKey = getServerApiKey();
	if (!apiKey) {
		return json({ error: 'PUBLIC_GOOGLE_MAPS_API_KEY is not configured.' }, { status: 400 });
	}

	let body: PlacesSearchBody;
	try {
		body = (await request.json()) as PlacesSearchBody;
	} catch {
		return json({ error: 'Invalid JSON request body.' }, { status: 400 });
	}

	const textQuery = body.textQuery?.trim() || 'distribution center logistics hub Dallas TX';
	const center = body.center ?? { lat: 32.7767, lng: -96.797 };
	const radius = typeof body.radiusMeters === 'number' ? body.radiusMeters : 35000;
	const maxResultCount =
		typeof body.maxResultCount === 'number' ? Math.min(Math.max(body.maxResultCount, 1), 10) : 6;

	const upstreamResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-Goog-Api-Key': apiKey,
			'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
			'X-Goog-Maps-Solution-ID': GMP_ATTRIBUTION_ID
		},
		body: JSON.stringify({
			textQuery,
			maxResultCount,
			locationBias: {
				circle: {
					center: {
						latitude: center.lat,
						longitude: center.lng
					},
					radius
				}
			}
		})
	});

	const data = await upstreamResponse.json().catch(() => ({}));
	if (!upstreamResponse.ok) {
		return json({
			ok: false,
			upstreamStatus: upstreamResponse.status,
			error: data?.error?.message || `Places API error (${upstreamResponse.status})`
		});
	}

	return json({ ok: true, ...data });
};
