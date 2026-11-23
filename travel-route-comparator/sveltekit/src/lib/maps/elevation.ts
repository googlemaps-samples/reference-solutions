import type { ElevationProfileSummary, ElevationSamplePoint, LatLngPoint } from '$lib/types';

const EARTH_RADIUS_METERS = 6371000;

function haversineMeters(a: LatLngPoint, b: LatLngPoint): number {
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const dLat = toRad(b.lat - a.lat);
	const dLng = toRad(b.lng - a.lng);
	const lat1 = toRad(a.lat);
	const lat2 = toRad(b.lat);

	const sinHalfLat = Math.sin(dLat / 2);
	const sinHalfLng = Math.sin(dLng / 2);
	const h = sinHalfLat * sinHalfLat + Math.cos(lat1) * Math.cos(lat2) * sinHalfLng * sinHalfLng;
	return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

function downsamplePath(path: LatLngPoint[], maxVertices = 160): LatLngPoint[] {
	if (path.length <= maxVertices) {
		return path;
	}
	const sampled: LatLngPoint[] = [];
	const step = (path.length - 1) / (maxVertices - 1);
	for (let i = 0; i < maxVertices; i++) {
		const idx = Math.min(path.length - 1, Math.round(i * step));
		sampled.push(path[idx]);
	}
	return sampled;
}

export async function fetchElevationProfile(
	elevationLib: google.maps.ElevationLibrary,
	routePath: LatLngPoint[],
	samplesCount = 64
): Promise<ElevationProfileSummary> {
	if (routePath.length < 2) {
		throw new Error('Route path requires at least two coordinates for elevation sampling.');
	}

	const trimmedPath = downsamplePath(routePath, 160);
	const clampedSamples = Math.max(2, Math.min(512, samplesCount));
	const service = new elevationLib.ElevationService();

	const { results } = await service.getElevationAlongPath({
		path: trimmedPath,
		samples: clampedSamples
	});

	if (!results || results.length === 0) {
		throw new Error('Elevation API returned no elevation samples for this route.');
	}

	const samples: ElevationSamplePoint[] = [];
	let cumulativeDistance = 0;
	let totalGainMeters = 0;
	let totalLossMeters = 0;
	let minElevationMeters = Number.POSITIVE_INFINITY;
	let maxElevationMeters = Number.NEGATIVE_INFINITY;
	let maxGradePercent = 0;

	for (let i = 0; i < results.length; i++) {
		const current = results[i];
		const loc: LatLngPoint = current.location
			? { lat: current.location.lat(), lng: current.location.lng() }
			: trimmedPath[Math.min(trimmedPath.length - 1, i)];

		let slopePercent = 0;
		if (i > 0) {
			const prev = samples[i - 1];
			const segmentDist = haversineMeters(prev.location, loc);
			cumulativeDistance += segmentDist;
			const deltaElev = current.elevation - prev.elevationMeters;

			if (deltaElev > 0) {
				totalGainMeters += deltaElev;
			} else if (deltaElev < 0) {
				totalLossMeters += Math.abs(deltaElev);
			}

			if (segmentDist > 5) {
				slopePercent = (deltaElev / segmentDist) * 100;
				if (Math.abs(slopePercent) > Math.abs(maxGradePercent)) {
					maxGradePercent = slopePercent;
				}
			}
		}

		if (current.elevation < minElevationMeters) minElevationMeters = current.elevation;
		if (current.elevation > maxElevationMeters) maxElevationMeters = current.elevation;

		samples.push({
			index: i,
			distanceMeters: cumulativeDistance,
			elevationMeters: current.elevation,
			slopePercent,
			location: loc
		});
	}

	return {
		samples,
		totalGainMeters,
		totalLossMeters,
		minElevationMeters,
		maxElevationMeters,
		maxGradePercent,
		totalDistanceMeters: cumulativeDistance
	};
}
