export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface ElevationSample {
  elevation: number;
  location: LatLngPoint;
  resolution?: number;
}

export interface EnrichedElevationSample extends ElevationSample {
  distanceMeters: number;
  gradePct: number;
}

export interface ElevationProfileMetrics {
  minElevationMeters: number;
  maxElevationMeters: number;
  elevationGainMeters: number;
  elevationLossMeters: number;
  totalDistanceMeters: number;
  maxGradePct: number;
  minGradePct: number;
}

/**
 * Decodes an encoded polyline string (Google Encoded Polyline Algorithm Format)
 * into an array of { lat, lng } coordinates.
 */
export function decodePolyline(encoded: string): LatLngPoint[] {
  const points: LatLngPoint[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte = 0;

    do {
      if (index >= encoded.length) break;
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

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

function encodeSignedNumber(num: number): string {
  let sgnNum = num << 1;
  if (num < 0) {
    sgnNum = ~sgnNum;
  }
  let encoded = '';
  while (sgnNum >= 0x20) {
    encoded += String.fromCharCode((0x20 | (sgnNum & 0x1f)) + 63);
    sgnNum >>= 5;
  }
  encoded += String.fromCharCode(sgnNum + 63);
  return encoded;
}

/**
 * Encodes an array of { lat, lng } coordinates into a Google encoded polyline string.
 */
export function encodePolyline(points: LatLngPoint[]): string {
  let prevLat = 0;
  let prevLng = 0;
  let encoded = '';

  for (const point of points) {
    const latE5 = Math.round(point.lat * 1e5);
    const lngE5 = Math.round(point.lng * 1e5);
    encoded += encodeSignedNumber(latE5 - prevLat);
    encoded += encodeSignedNumber(lngE5 - prevLng);
    prevLat = latE5;
    prevLng = lngE5;
  }

  return encoded;
}

/**
 * Uniformly downsamples a coordinate array to at most maxPoints vertices
 * while preserving the start and end points. Keeps Elevation API path URLs
 * well below the 512-vertex and 16,384-character limits.
 */
export function downsamplePath(points: LatLngPoint[], maxPoints = 200): LatLngPoint[] {
  if (points.length <= maxPoints) {
    return points;
  }
  const sampled: LatLngPoint[] = [];
  const step = (points.length - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints - 1; i++) {
    sampled.push(points[Math.round(i * step)]);
  }
  sampled.push(points[points.length - 1]);
  return sampled;
}

export function haversineMeters(a: LatLngPoint, b: LatLngPoint): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function enrichElevationSamples(rawSamples: ElevationSample[]): {
  samples: EnrichedElevationSample[];
  metrics: ElevationProfileMetrics;
} {
  if (rawSamples.length === 0) {
    return {
      samples: [],
      metrics: {
        minElevationMeters: 0,
        maxElevationMeters: 0,
        elevationGainMeters: 0,
        elevationLossMeters: 0,
        totalDistanceMeters: 0,
        maxGradePct: 0,
        minGradePct: 0,
      },
    };
  }

  let cumulativeDistance = 0;
  let elevationGain = 0;
  let elevationLoss = 0;
  let minElevation = rawSamples[0].elevation;
  let maxElevation = rawSamples[0].elevation;
  let maxGradePct = 0;
  let minGradePct = 0;

  const samples: EnrichedElevationSample[] = rawSamples.map((sample, index) => {
    let gradePct = 0;
    if (index > 0) {
      const prev = rawSamples[index - 1];
      const segDist = haversineMeters(prev.location, sample.location);
      cumulativeDistance += segDist;
      const dElev = sample.elevation - prev.elevation;
      if (dElev > 0) {
        elevationGain += dElev;
      } else {
        elevationLoss += Math.abs(dElev);
      }
      if (segDist >= 5) {
        gradePct = Number(((dElev / segDist) * 100).toFixed(1));
      }
      if (gradePct > maxGradePct) maxGradePct = gradePct;
      if (gradePct < minGradePct) minGradePct = gradePct;
    }

    if (sample.elevation < minElevation) minElevation = sample.elevation;
    if (sample.elevation > maxElevation) maxElevation = sample.elevation;

    return {
      elevation: Number(sample.elevation.toFixed(2)),
      location: sample.location,
      resolution: sample.resolution,
      distanceMeters: Math.round(cumulativeDistance),
      gradePct,
    };
  });

  return {
    samples,
    metrics: {
      minElevationMeters: Math.round(minElevation),
      maxElevationMeters: Math.round(maxElevation),
      elevationGainMeters: Math.round(elevationGain),
      elevationLossMeters: Math.round(elevationLoss),
      totalDistanceMeters: Math.round(cumulativeDistance),
      maxGradePct: Number(maxGradePct.toFixed(1)),
      minGradePct: Number(minGradePct.toFixed(1)),
    },
  };
}
