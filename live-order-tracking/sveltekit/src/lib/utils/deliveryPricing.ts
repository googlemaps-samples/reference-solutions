import { MAX_ROAD_DISTANCE_METERS } from '$lib/constants/chicago';
import type { CourierStage, DeliveryFeeTier, LatLngPoint } from '$lib/types/delivery';

export function calculateTieredDeliveryFee(
	distanceMeters: number,
	insidePolygon: boolean
): DeliveryFeeTier {
	const withinDistanceLimit = distanceMeters <= MAX_ROAD_DISTANCE_METERS;

	if (!insidePolygon && !withinDistanceLimit) {
		return {
			eligible: false,
			insidePolygon,
			withinDistanceLimit,
			tierLabel: 'Out of Delivery Zone',
			fee: null,
			reason: `Drop-off is outside our Chicago delivery polygon and exceeds the 8.0 km road limit (${formatDistanceKm(distanceMeters)}).`
		};
	}

	if (!insidePolygon) {
		return {
			eligible: false,
			insidePolygon,
			withinDistanceLimit,
			tierLabel: 'Outside Zone Boundary',
			fee: null,
			reason: 'Drop-off coordinate falls outside the Chicago service polygon boundary.'
		};
	}

	if (!withinDistanceLimit) {
		return {
			eligible: false,
			insidePolygon,
			withinDistanceLimit,
			tierLabel: 'Over 8.0 km Cap',
			fee: null,
			reason: `Driving distance (${formatDistanceKm(distanceMeters)}) exceeds the 8.0 km maximum courier radius.`
		};
	}

	if (distanceMeters <= 3000) {
		return {
			eligible: true,
			insidePolygon: true,
			withinDistanceLimit: true,
			tierLabel: 'Tier 1 • Express Core (≤ 3.0 km)',
			fee: 2.99,
			reason: 'Eligible: Inside polygon & within 3.0 km express radius.'
		};
	}

	if (distanceMeters <= 5500) {
		return {
			eligible: true,
			insidePolygon: true,
			withinDistanceLimit: true,
			tierLabel: 'Tier 2 • Metro Standard (≤ 5.5 km)',
			fee: 4.99,
			reason: 'Eligible: Inside polygon & within 5.5 km metro radius.'
		};
	}

	return {
		eligible: true,
		insidePolygon: true,
		withinDistanceLimit: true,
		tierLabel: 'Tier 3 • Extended Loop (≤ 8.0 km)',
		fee: 6.99,
		reason: 'Eligible: Inside polygon & within 8.0 km maximum courier radius.'
	};
}

export function formatDistanceKm(meters: number): string {
	return `${(meters / 1000).toFixed(2)} km`;
}

export function formatDurationMinutes(seconds: number): string {
	const mins = Math.max(1, Math.round(seconds / 60));
	return `${mins} min`;
}

export function formatCurrency(amount: number): string {
	return `$${amount.toFixed(2)}`;
}

export function deriveCourierStage(fraction: number, running: boolean): CourierStage {
	if (!running && fraction <= 0) return 'idle';
	if (fraction >= 0.995) return 'delivered';
	if (fraction >= 0.8) return 'arriving';
	if (fraction >= 0.1) return 'en_route';
	return 'preparing';
}

export function computeBearingDegrees(from: LatLngPoint, to: LatLngPoint): number {
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const toDeg = (rad: number) => (rad * 180) / Math.PI;
	const lat1 = toRad(from.lat);
	const lat2 = toRad(to.lat);
	const dLng = toRad(to.lng - from.lng);

	const y = Math.sin(dLng) * Math.cos(lat2);
	const x =
		Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
	return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function haversineMeters(a: LatLngPoint, b: LatLngPoint): number {
	const R = 6371000;
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const dLat = toRad(b.lat - a.lat);
	const dLng = toRad(b.lng - a.lng);
	const sinLat = Math.sin(dLat / 2);
	const sinLng = Math.sin(dLng / 2);
	const h =
		sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
	return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function interpolatePathAtFraction(
	path: LatLngPoint[],
	fraction: number
): { position: LatLngPoint; headingDegrees: number } {
	if (path.length === 0) {
		return { position: { lat: 41.8868, lng: -87.6486 }, headingDegrees: 90 };
	}
	if (path.length === 1) {
		return { position: path[0], headingDegrees: 90 };
	}

	const clamped = Math.max(0, Math.min(1, fraction));
	const cumulative: number[] = [0];
	let total = 0;

	for (let i = 1; i < path.length; i++) {
		total += haversineMeters(path[i - 1], path[i]);
		cumulative.push(total);
	}

	if (total <= 0) {
		return {
			position: path[0],
			headingDegrees: computeBearingDegrees(path[0], path[1])
		};
	}

	const targetDist = clamped * total;
	for (let i = 1; i < cumulative.length; i++) {
		if (targetDist <= cumulative[i] || i === cumulative.length - 1) {
			const segStart = cumulative[i - 1];
			const segEnd = cumulative[i];
			const segLen = Math.max(segEnd - segStart, 1e-6);
			const t = Math.max(0, Math.min(1, (targetDist - segStart) / segLen));
			const p1 = path[i - 1];
			const p2 = path[i];
			return {
				position: {
					lat: p1.lat + (p2.lat - p1.lat) * t,
					lng: p1.lng + (p2.lng - p1.lng) * t
				},
				headingDegrees: computeBearingDegrees(p1, p2)
			};
		}
	}

	const last = path[path.length - 1];
	const prev = path[path.length - 2];
	return {
		position: last,
		headingDegrees: computeBearingDegrees(prev, last)
	};
}

export function encodePolylineFallback(path: LatLngPoint[]): string {
	const result: string[] = [];
	let prevLat = 0;
	let prevLng = 0;

	const encodePart = (part: number) => {
		let val = part < 0 ? ~(part << 1) : part << 1;
		while (val >= 0x20) {
			result.push(String.fromCharCode((0x20 | (val & 0x1f)) + 63));
			val >>= 5;
		}
		result.push(String.fromCharCode(val + 63));
	};

	for (const pt of path) {
		const latE5 = Math.round(pt.lat * 1e5);
		const lngE5 = Math.round(pt.lng * 1e5);
		encodePart(latE5 - prevLat);
		encodePart(lngE5 - prevLng);
		prevLat = latE5;
		prevLng = lngE5;
	}

	return result.join('');
}
