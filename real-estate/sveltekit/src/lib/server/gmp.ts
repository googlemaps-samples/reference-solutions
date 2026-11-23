import { json } from '@sveltejs/kit';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

export const SECURITY_HEADERS: Record<string, string> = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'SAMEORIGIN',
	'Cache-Control': 'no-store'
};

export function getGmpApiKey(): string | null {
	const raw =
		privateEnv.GOOGLE_MAPS_API_KEY?.trim() || publicEnv.PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || '';
	if (!raw || raw === 'your_google_maps_api_key_here') {
		return null;
	}
	return raw;
}

export function secureJson(data: unknown, status = 200) {
	return json(data, {
		status,
		headers: SECURITY_HEADERS
	});
}

export function parseDurationSeconds(durationStr?: string | null): number {
	if (!durationStr) return 0;
	const match = /^(\d+(?:\.\d+)?)s$/.exec(durationStr.trim());
	return match ? Math.round(Number(match[1])) : 0;
}

export function formatDurationMinutes(seconds: number): string {
	if (!seconds || seconds <= 0) return '—';
	const totalMinutes = Math.max(1, Math.round(seconds / 60));
	if (totalMinutes < 60) {
		return `${totalMinutes} min`;
	}
	const hrs = Math.floor(totalMinutes / 60);
	const mins = totalMinutes % 60;
	return mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`;
}

export function formatDistanceImperial(meters: number): string {
	if (!meters || meters <= 0) return '—';
	const miles = meters / 1609.344;
	return miles < 0.2 ? `${Math.round(meters * 3.28084)} ft` : `${miles.toFixed(1)} mi`;
}
