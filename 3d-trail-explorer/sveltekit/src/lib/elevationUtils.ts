import type { LatLngPoint } from './trailData';

export interface ElevationSample {
  elevation: number;
  location: LatLngPoint;
  resolution?: number;
  distanceKm: number;
}

export interface TrailMetrics {
  totalDistanceKm: number;
  minElevationM: number;
  maxElevationM: number;
  totalAscentM: number;
  totalDescentM: number;
}

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: LatLngPoint, b: LatLngPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function buildElevationSamples(
  rawResults: Array<{ elevation: number; location: { lat: number; lng: number }; resolution?: number }>
): { samples: ElevationSample[]; metrics: TrailMetrics } {
  if (!rawResults.length) {
    return {
      samples: [],
      metrics: {
        totalDistanceKm: 0,
        minElevationM: 0,
        maxElevationM: 0,
        totalAscentM: 0,
        totalDescentM: 0
      }
    };
  }

  let cumulativeKm = 0;
  let minElevationM = rawResults[0].elevation;
  let maxElevationM = rawResults[0].elevation;
  let totalAscentM = 0;
  let totalDescentM = 0;

  const samples: ElevationSample[] = rawResults.map((point, index) => {
    if (index > 0) {
      const prev = rawResults[index - 1];
      cumulativeKm += haversineKm(prev.location, point.location);
      const delta = point.elevation - prev.elevation;
      if (delta > 0) {
        totalAscentM += delta;
      } else {
        totalDescentM += Math.abs(delta);
      }
    }

    if (point.elevation < minElevationM) minElevationM = point.elevation;
    if (point.elevation > maxElevationM) maxElevationM = point.elevation;

    return {
      elevation: point.elevation,
      location: point.location,
      resolution: point.resolution,
      distanceKm: cumulativeKm
    };
  });

  return {
    samples,
    metrics: {
      totalDistanceKm: cumulativeKm,
      minElevationM,
      maxElevationM,
      totalAscentM,
      totalDescentM
    }
  };
}
