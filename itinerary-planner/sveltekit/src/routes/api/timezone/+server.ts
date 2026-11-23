import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const latParam = url.searchParams.get('lat');
	const lngParam = url.searchParams.get('lng');
	const timestampParam = url.searchParams.get('timestamp');

	const lat = latParam ? Number(latParam) : NaN;
	const lng = lngParam ? Number(lngParam) : NaN;
	const timestamp = timestampParam ? Number(timestampParam) : Math.floor(Date.now() / 1000);

	if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
		return json({ status: 'INVALID_REQUEST', errorMessage: 'Valid lat and lng parameters are required.' }, { status: 400 });
	}

	const apiKey = env.PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
	if (!apiKey) {
		return json({ status: 'NO_API_KEY', errorMessage: 'PUBLIC_GOOGLE_MAPS_API_KEY is not configured.' }, { status: 200 });
	}

	try {
		const tzUrl = new URL('https://maps.googleapis.com/maps/api/timezone/json');
		tzUrl.searchParams.set('location', `${lat},${lng}`);
		tzUrl.searchParams.set('timestamp', String(Math.floor(timestamp)));
		tzUrl.searchParams.set('key', apiKey);

		const upstream = await fetch(tzUrl.toString());
		if (!upstream.ok) {
			return json(
				{ status: 'UPSTREAM_ERROR', errorMessage: `Time Zone API HTTP ${upstream.status}` },
				{ status: 200 }
			);
		}
		const payload = (await upstream.json()) as {
			status?: string;
			timeZoneId?: string;
			timeZoneName?: string;
			rawOffset?: number;
			dstOffset?: number;
			errorMessage?: string;
		};

		return json(payload, { status: 200 });
	} catch (error) {
		return json(
			{
				status: 'UPSTREAM_ERROR',
				errorMessage: error instanceof Error ? error.message : 'Time Zone request failed'
			},
			{ status: 200 }
		);
	}
};
