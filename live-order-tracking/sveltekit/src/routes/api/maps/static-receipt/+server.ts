import { env } from '$env/dynamic/public';
import type { RequestHandler } from './$types';

const STATIC_MAP_URL = 'https://maps.googleapis.com/maps/api/staticmap';

function parseCoord(raw: string | null, min: number, max: number): number | null {
	if (!raw) return null;
	const val = Number(raw);
	if (!Number.isFinite(val) || val < min || val > max) return null;
	return val;
}

export const GET: RequestHandler = async ({ url, request }) => {
	const apiKey = env.PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
	if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
		return new Response('PUBLIC_GOOGLE_MAPS_API_KEY is not configured.', { status: 503 });
	}

	const kitchenLat = parseCoord(url.searchParams.get('kitchenLat'), -90, 90);
	const kitchenLng = parseCoord(url.searchParams.get('kitchenLng'), -180, 180);
	const destLat = parseCoord(url.searchParams.get('destLat'), -90, 90);
	const destLng = parseCoord(url.searchParams.get('destLng'), -180, 180);
	const encoded = url.searchParams.get('enc')?.trim() ?? '';

	if (kitchenLat === null || kitchenLng === null || destLat === null || destLng === null) {
		return new Response('Invalid kitchen or destination coordinates.', { status: 400 });
	}

	const params = new URLSearchParams();
	params.set('size', '600x280');
	params.set('scale', '2');
	params.set('maptype', 'roadmap');
	params.append('markers', `color:0x0f766e|label:K|${kitchenLat},${kitchenLng}`);
	params.append('markers', `color:0xe11d48|label:D|${destLat},${destLng}`);

	if (encoded && encoded.length <= 1600) {
		params.append('path', `color:0x2563ebff|weight:5|enc:${encoded}`);
	} else {
		params.append(
			'path',
			`color:0x2563ebff|weight:4|${kitchenLat},${kitchenLng}|${destLat},${destLng}`
		);
	}

	params.set('key', apiKey);

	const headers: Record<string, string> = {};
	const referer = request.headers.get('referer');
	if (referer) {
		headers['Referer'] = referer;
	}

	const upstreamRes = await fetch(`${STATIC_MAP_URL}?${params.toString()}`, { headers });
	if (!upstreamRes.ok) {
		return new Response('Maps Static API request failed.', { status: upstreamRes.status });
	}

	const bytes = await upstreamRes.arrayBuffer();
	const contentType = upstreamRes.headers.get('content-type') ?? 'image/png';

	return new Response(bytes, {
		status: 200,
		headers: {
			'Content-Type': contentType,
			'Cache-Control': 'private, max-age=300',
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
