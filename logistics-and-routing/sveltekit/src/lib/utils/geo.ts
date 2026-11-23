import type { LatLngPoint, SnappedPointItem } from '$lib/types/logistics';

const EARTH_RADIUS_METERS = 6371000;

export function haversineMeters(a: LatLngPoint, b: LatLngPoint): number {
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const dLat = toRad(b.lat - a.lat);
	const dLng = toRad(b.lng - a.lng);
	const lat1 = toRad(a.lat);
	const lat2 = toRad(b.lat);

	const sinLat = Math.sin(dLat / 2);
	const sinLng = Math.sin(dLng / 2);
	const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
	return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function computeMeanSnapOffsetMeters(
	rawTrace: LatLngPoint[],
	snappedPoints: SnappedPointItem[]
): number {
	const offsets: number[] = [];
	for (const pt of snappedPoints) {
		if (typeof pt.originalIndex === 'number' && rawTrace[pt.originalIndex]) {
			offsets.push(haversineMeters(rawTrace[pt.originalIndex], pt.location));
		}
	}
	if (offsets.length === 0) return 0;
	const total = offsets.reduce((sum, val) => sum + val, 0);
	return Math.round((total / offsets.length) * 10) / 10;
}

export function parseGoogleDurationSeconds(duration?: string | null): number {
	if (!duration) return 0;
	const match = /^(\d+(?:\.\d+)?)s$/.exec(duration.trim());
	if (!match) return 0;
	return Math.round(Number(match[1]));
}

export function formatDuration(seconds: number | null): string {
	if (seconds === null || !Number.isFinite(seconds)) return '—';
	const totalMins = Math.max(1, Math.round(seconds / 60));
	if (totalMins < 60) return `${totalMins} min`;
	const hrs = Math.floor(totalMins / 60);
	const mins = totalMins % 60;
	return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export function formatDistanceMiles(meters: number | null): string {
	if (meters === null || !Number.isFinite(meters)) return '—';
	const miles = meters / 1609.344;
	return `${miles.toFixed(1)} mi`;
}
