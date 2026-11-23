import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getGmpApiKey } from '$lib/server/gmp';
import type { ReverseGeocodeResult } from '$lib/types';

interface GeocodeV4Response {
	results?: Array<{
		formattedAddress?: string;
		placeId?: string;
		location?: { latitude?: number; longitude?: number };
	}>;
	error?: { message?: string; status?: string };
}

export const GET: RequestHandler = async ({ url }) => {
	const apiKey = getGmpApiKey();
	if (!apiKey) {
		return json(
			{ error: 'PUBLIC_GOOGLE_MAPS_API_KEY is not configured on the server.' },
			{ status: 503 }
		);
	}

	const lat = Number(url.searchParams.get('lat'));
	const lng = Number(url.searchParams.get('lng'));
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
		return json({ error: 'Valid numeric lat and lng query parameters are required.' }, { status: 400 });
	}

	try {
		const endpoint = `https://geocode.googleapis.com/v4/geocode/location/${lat.toFixed(6)},${lng.toFixed(6)}`;
		const upstreamRes = await fetch(endpoint, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				'X-Goog-Api-Key': apiKey,
				'X-Goog-FieldMask': 'results.formattedAddress,results.placeId,results.location'
			}
		});

		const data = (await upstreamRes.json()) as GeocodeV4Response;
		if (!upstreamRes.ok) {
			return json(
				{
					error: data.error?.message || `Geocoding API v4 returned ${upstreamRes.status}`,
					upstreamStatus: upstreamRes.status
				},
				{ status: upstreamRes.status }
			);
		}

		const first = data.results?.[0];
		const result: ReverseGeocodeResult = {
			formattedAddress:
				first?.formattedAddress || `${lat.toFixed(5)}, ${lng.toFixed(5)} (Austin, TX)`,
			placeId: first?.placeId ?? null,
			location: {
				lat: first?.location?.latitude ?? lat,
				lng: first?.location?.longitude ?? lng
			}
		};

		return json(result);
	} catch (err) {
		return json(
			{ error: err instanceof Error ? err.message : 'Failed to reverse geocode location.' },
			{ status: 502 }
		);
	}
};
