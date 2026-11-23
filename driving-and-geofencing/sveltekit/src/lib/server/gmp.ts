import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

export function getGmpApiKey(): string {
	return (
		publicEnv.PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
		privateEnv.GOOGLE_MAPS_API_KEY?.trim() ||
		''
	);
}

export function parseDurationSeconds(durationStr: string | undefined): number {
	if (!durationStr) return 0;
	const match = durationStr.match(/^(\d+(?:\.\d+)?)s$/);
	return match ? Math.round(Number(match[1])) : 0;
}

export function formatDuration(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds <= 0) return '0 min';
	const totalMins = Math.round(seconds / 60);
	if (totalMins < 60) return `${totalMins} min`;
	const hrs = Math.floor(totalMins / 60);
	const mins = totalMins % 60;
	return mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`;
}

export function formatDistanceMiles(meters: number): string {
	if (!Number.isFinite(meters) || meters <= 0) return '0.0 mi';
	const miles = meters / 1609.344;
	return `${miles.toFixed(1)} mi`;
}
