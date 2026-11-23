import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AUSTIN_CENTER, SEED_SEARCH_QUERY } from '$lib/austinData';
import { getGmpApiKey } from '$lib/server/gmp';
import type { AuditSite } from '$lib/types';

interface PlacesSearchTextApiItem {
	id?: string;
	displayName?: { text?: string };
	formattedAddress?: string;
	primaryTypeDisplayName?: { text?: string };
	location?: { latitude?: number; longitude?: number };
}

interface PlacesSearchTextApiResponse {
	places?: PlacesSearchTextApiItem[];
	error?: { message?: string; status?: string };
}

export const POST: RequestHandler = async ({ request }) => {
	const apiKey = getGmpApiKey();
	if (!apiKey) {
		return json(
			{ error: 'PUBLIC_GOOGLE_MAPS_API_KEY is not configured on the server.' },
			{ status: 503 }
		);
	}

	let body: { textQuery?: string; maxResultCount?: number } = {};
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON request body.' }, { status: 400 });
	}

	const textQuery = (body.textQuery || SEED_SEARCH_QUERY).trim();
	if (!textQuery) {
		return json({ error: 'textQuery must be a non-empty string.' }, { status: 400 });
	}

	const maxResultCount = Math.min(Math.max(Number(body.maxResultCount) || 5, 1), 10);

	try {
		const upstreamRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Goog-Api-Key': apiKey,
				'X-Goog-FieldMask':
					'places.id,places.displayName,places.formattedAddress,places.location,places.primaryTypeDisplayName'
			},
			body: JSON.stringify({
				textQuery,
				maxResultCount,
				regionCode: 'US',
				languageCode: 'en',
				locationBias: {
					circle: {
						center: {
							latitude: AUSTIN_CENTER.lat,
							longitude: AUSTIN_CENTER.lng
						},
						radius: 15000.0
					}
				}
			})
		});

		const data = (await upstreamRes.json()) as PlacesSearchTextApiResponse;
		if (!upstreamRes.ok) {
			return json(
				{
					error: data.error?.message || `Places API returned ${upstreamRes.status}`,
					upstreamStatus: upstreamRes.status
				},
				{ status: upstreamRes.status }
			);
		}

		const places: AuditSite[] = (data.places ?? [])
			.filter(
				(place): place is PlacesSearchTextApiItem & {
					location: { latitude: number; longitude: number };
				} =>
					typeof place.location?.latitude === 'number' &&
					typeof place.location?.longitude === 'number'
			)
			.map((place, idx) => ({
				id: place.id || `site-${idx + 1}`,
				displayName: place.displayName?.text || `Austin Site ${idx + 1}`,
				formattedAddress: place.formattedAddress || 'Austin, TX',
				primaryType: place.primaryTypeDisplayName?.text || 'Retail Store',
				location: {
					lat: place.location.latitude,
					lng: place.location.longitude
				}
			}));

		return json({ places });
	} catch (err) {
		return json(
			{ error: err instanceof Error ? err.message : 'Failed to query Places API.' },
			{ status: 502 }
		);
	}
};
