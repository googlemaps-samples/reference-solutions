import type { CandidateDriver, LatLngLiteral } from './types';

// Simulated nearby Los Angeles candidate fleet positioned around Downtown LA / Arts District / Chinatown / Echo Park
export const CANDIDATE_DRIVERS: CandidateDriver[] = [
	{
		id: 'drv-la-101',
		name: 'Maya Lin',
		rating: '4.96',
		vehicle: 'Tesla Model 3 Long Range',
		plate: '8EVR412',
		emissionType: 'ELECTRIC',
		location: { lat: 34.0488, lng: -118.2417 }, // Little Tokyo / Arts District
		neighborhood: 'Arts District'
	},
	{
		id: 'drv-la-204',
		name: 'Carlos Mendez',
		rating: '4.92',
		vehicle: 'Toyota Prius Prime',
		plate: '7HYB908',
		emissionType: 'HYBRID',
		location: { lat: 34.0619, lng: -118.2385 }, // Chinatown
		neighborhood: 'Chinatown'
	},
	{
		id: 'drv-la-309',
		name: 'Jordan Brooks',
		rating: '4.89',
		vehicle: 'Honda Accord Touring',
		plate: '9LAX275',
		emissionType: 'GASOLINE',
		location: { lat: 34.0422, lng: -118.2618 }, // South Park / DTLA
		neighborhood: 'South Park DTLA'
	},
	{
		id: 'drv-la-415',
		name: 'Elena Rostova',
		rating: '4.98',
		vehicle: 'Hyundai Ioniq 5',
		plate: '8ZEV651',
		emissionType: 'ELECTRIC',
		location: { lat: 34.0725, lng: -118.2602 }, // Echo Park
		neighborhood: 'Echo Park'
	}
];

export interface PathMetrics {
	points: LatLngLiteral[];
	cumulativeDistances: number[];
	totalLengthMeters: number;
}

export function buildPathMetrics(
	points: LatLngLiteral[],
	computeDistance: (a: LatLngLiteral, b: LatLngLiteral) => number
): PathMetrics {
	if (points.length === 0) {
		return { points: [], cumulativeDistances: [0], totalLengthMeters: 0 };
	}
	const cumulativeDistances: number[] = [0];
	let total = 0;
	for (let i = 1; i < points.length; i++) {
		total += computeDistance(points[i - 1], points[i]);
		cumulativeDistances.push(total);
	}
	return {
		points,
		cumulativeDistances,
		totalLengthMeters: total
	};
}

export function interpolateAlongPath(
	metrics: PathMetrics,
	fraction: number,
	computeHeading: (a: LatLngLiteral, b: LatLngLiteral) => number
): { position: LatLngLiteral; heading: number } {
	const { points, cumulativeDistances, totalLengthMeters } = metrics;
	if (points.length === 0) {
		return { position: { lat: 34.0562, lng: -118.2365 }, heading: 0 };
	}
	if (points.length === 1 || totalLengthMeters <= 0) {
		return { position: points[0], heading: 0 };
	}

	const clamped = Math.min(1, Math.max(0, fraction));
	const targetDist = clamped * totalLengthMeters;

	let low = 0;
	let high = cumulativeDistances.length - 1;
	while (low < high - 1) {
		const mid = Math.floor((low + high) / 2);
		if (cumulativeDistances[mid] <= targetDist) {
			low = mid;
		} else {
			high = mid;
		}
	}

	const segStartDist = cumulativeDistances[low];
	const segEndDist = cumulativeDistances[high];
	const segLen = segEndDist - segStartDist;
	const p1 = points[low];
	const p2 = points[high];

	const t = segLen > 0 ? (targetDist - segStartDist) / segLen : 0;
	const position: LatLngLiteral = {
		lat: p1.lat + (p2.lat - p1.lat) * t,
		lng: p1.lng + (p2.lng - p1.lng) * t
	};
	const heading = computeHeading(p1, p2);
	return { position, heading };
}
