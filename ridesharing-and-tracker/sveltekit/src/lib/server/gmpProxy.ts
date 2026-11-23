import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';

export const SECURITY_HEADERS = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'SAMEORIGIN',
	'Cache-Control': 'no-store'
} as const;

export function getServerApiKey(): string {
	return (
		publicEnv.PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
		privateEnv.GOOGLE_MAPS_API_KEY?.trim() ||
		''
	);
}

export function secureJson(data: unknown, status = 200): Response {
	return json(data, {
		status,
		headers: SECURITY_HEADERS
	});
}

export function buildGmpHeaders(
	apiKey: string,
	fieldMask: string,
	request: Request
): Record<string, string> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		'X-Goog-Api-Key': apiKey,
		'X-Goog-FieldMask': fieldMask
	};
	const referer = request.headers.get('referer');
	if (referer) {
		headers['Referer'] = referer;
	}
	return headers;
}
