import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServerApiKey, GMP_ATTRIBUTION_ID } from '$lib/server/apiKey';
import type { LatLngPoint } from '$lib/types/logistics';

interface SnapRoadsBody {
	path?: LatLngPoint[];
	interpolate?: boolean;
}

export const POST: RequestHandler = async ({ request }) => {
	const apiKey = getServerApiKey();
	if (!apiKey) {
		return json({ error: 'PUBLIC_GOOGLE_MAPS_API_KEY is not configured.' }, { status: 400 });
	}

	let body: SnapRoadsBody;
	try {
		body = (await request.json()) as SnapRoadsBody;
	} catch {
		return json({ error: 'Invalid JSON request body.' }, { status: 400 });
	}

	const points = Array.isArray(body.path) ? body.path.slice(0, 100) : [];
	if (points.length < 2) {
		return json({ error: 'At least 2 GPS coordinates are required.' }, { status: 400 });
	}

	const pathParam = points
		.filter((pt) => Number.isFinite(pt.lat) && Number.isFinite(pt.lng))
		.map((pt) => `${pt.lat},${pt.lng}`)
		.join('|');

	const url = new URL('https://roads.googleapis.com/v1/snapToRoads');
	url.searchParams.set('path', pathParam);
	url.searchParams.set('interpolate', body.interpolate === false ? 'false' : 'true');
	url.searchParams.set('key', apiKey);

	const upstreamResponse = await fetch(url.toString(), {
		method: 'GET',
		headers: {
			'X-Goog-Maps-Solution-ID': GMP_ATTRIBUTION_ID
		}
	});

	const data = await upstreamResponse.json().catch(() => ({}));
	if (!upstreamResponse.ok) {
		return json({
			ok: false,
			upstreamStatus: upstreamResponse.status,
			error: data?.error?.message || `Roads API error (${upstreamResponse.status})`
		});
	}

	return json({ ok: true, ...data });
};
