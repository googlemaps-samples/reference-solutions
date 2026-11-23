import type { ElevationSamplePoint, ElevationProfileSummary, LatLngLiteral } from '@/types/travel';

/**
 * Decodes a Google Encoded Polyline Algorithm Format string into LatLngLiteral coordinates.
 */
export function decodePolyline(encoded: string): LatLngLiteral[] {
  const points: LatLngLiteral[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);

    const deltaLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      if (index >= encoded.length) break;
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    });
  }

  return points;
}

/**
 * Encodes LatLngLiteral coordinates into Google Encoded Polyline Algorithm Format.
 */
export function encodePolyline(points: LatLngLiteral[]): string {
  let lastLat = 0;
  let lastLng = 0;
  let output = '';

  const encodeSigned = (val: number): string => {
    let v = val < 0 ? ~(val << 1) : val << 1;
    let chunk = '';
    while (v >= 0x20) {
      chunk += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    chunk += String.fromCharCode(v + 63);
    return chunk;
  };

  for (const pt of points) {
    const latE5 = Math.round(pt.lat * 1e5);
    const lngE5 = Math.round(pt.lng * 1e5);
    output += encodeSigned(latE5 - lastLat);
    output += encodeSigned(lngE5 - lastLng);
    lastLat = latE5;
    lastLng = lngE5;
  }

  return output;
}

export function haversineMeters(a: LatLngLiteral, b: LatLngLiteral): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Uniformly downsamples a path while preserving endpoints to stay well under the
 * Elevation API 512-point path limit and URL length ceiling.
 */
export function downsamplePath(
  points: LatLngLiteral[],
  maxPoints = 180
): LatLngLiteral[] {
  if (points.length <= maxPoints) return points;
  if (maxPoints < 2) return points.slice(0, 1);

  const sampled: LatLngLiteral[] = [];
  const step = (points.length - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints - 1; i++) {
    sampled.push(points[Math.round(i * step)]);
  }
  sampled.push(points[points.length - 1]);
  return sampled;
}

export interface RawElevationResult {
  elevation: number;
  location: LatLngLiteral;
  resolution?: number;
}

export function buildElevationSummary(
  results: RawElevationResult[],
  source: 'bff' | 'sdk'
): ElevationProfileSummary {
  if (!results.length) {
    return {
      points: [],
      totalGainMeters: 0,
      totalLossMeters: 0,
      minElevationMeters: 0,
      maxElevationMeters: 0,
      maxGradePercent: 0,
      totalDistanceMeters: 0,
      source,
    };
  }

  let cumulativeDistance = 0;
  let totalGain = 0;
  let totalLoss = 0;
  let minElev = results[0].elevation;
  let maxElev = results[0].elevation;
  let maxGrade = 0;

  const points: ElevationSamplePoint[] = results.map((item, idx) => {
    let gradePercent = 0;
    if (idx > 0) {
      const prev = results[idx - 1];
      const segDist = haversineMeters(prev.location, item.location);
      cumulativeDistance += segDist;
      const elevDelta = item.elevation - prev.elevation;
      if (elevDelta > 0) totalGain += elevDelta;
      else totalLoss += Math.abs(elevDelta);

      if (segDist >= 5) {
        gradePercent = (elevDelta / segDist) * 100;
        if (Math.abs(gradePercent) > Math.abs(maxGrade)) {
          maxGrade = gradePercent;
        }
      }
    }

    if (item.elevation < minElev) minElev = item.elevation;
    if (item.elevation > maxElev) maxElev = item.elevation;

    return {
      index: idx,
      lat: item.location.lat,
      lng: item.location.lng,
      elevationMeters: item.elevation,
      elevationFeet: item.elevation * 3.28084,
      distanceMeters: cumulativeDistance,
      gradePercent,
      resolution: item.resolution ?? 0,
    };
  });

  return {
    points,
    totalGainMeters: totalGain,
    totalLossMeters: totalLoss,
    minElevationMeters: minElev,
    maxElevationMeters: maxElev,
    maxGradePercent: maxGrade,
    totalDistanceMeters: cumulativeDistance,
    source,
  };
}
