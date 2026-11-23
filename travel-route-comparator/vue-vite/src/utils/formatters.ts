import type { ElevationSamplePoint, ElevationStats } from '../types/routing';

export function toLatLngLiteral(
  loc: google.maps.LatLng | google.maps.LatLngLiteral | google.maps.LatLngAltitude,
): google.maps.LatLngLiteral {
  const rawLat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
  const rawLng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;
  return { lat: rawLat, lng: rawLng };
}

export function formatDurationMillis(millis: number | null | undefined): string {
  if (millis == null || !Number.isFinite(millis) || millis <= 0) {
    return '—';
  }
  const totalMinutes = Math.round(millis / 60000);
  if (totalMinutes < 1) {
    return '< 1 min';
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) {
    return `${mins} min`;
  }
  if (mins === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${mins} min`;
}

export function formatDistanceMeters(meters: number | null | undefined): string {
  if (meters == null || !Number.isFinite(meters) || meters <= 0) {
    return '—';
  }
  const miles = meters / 1609.344;
  if (miles < 0.2) {
    const feet = Math.round(meters * 3.28084);
    return `${feet.toLocaleString()} ft`;
  }
  return `${miles.toFixed(1)} mi`;
}

export function metersToFeet(meters: number): number {
  return meters * 3.28084;
}

export function formatFeet(meters: number): string {
  return `${Math.round(metersToFeet(meters)).toLocaleString()} ft`;
}

export function formatMeters(meters: number): string {
  return `${Math.round(meters).toLocaleString()} m`;
}

export function haversineMeters(
  a: google.maps.LatLngLiteral,
  b: google.maps.LatLngLiteral,
): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function downsamplePath(
  path: google.maps.LatLngLiteral[],
  maxPoints = 180,
): google.maps.LatLngLiteral[] {
  if (path.length <= maxPoints) {
    return path;
  }
  const sampled: google.maps.LatLngLiteral[] = [];
  const step = (path.length - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints - 1; i++) {
    sampled.push(path[Math.round(i * step)]);
  }
  sampled.push(path[path.length - 1]);
  return sampled;
}

export function computeElevationStats(
  results: google.maps.ElevationResult[],
  fallbackDistanceMeters: number,
): ElevationStats {
  if (!results.length) {
    return {
      gainMeters: 0,
      gainFeet: 0,
      lossMeters: 0,
      lossFeet: 0,
      minMeters: 0,
      minFeet: 0,
      maxMeters: 0,
      maxFeet: 0,
      maxGradePercent: 0,
      avgGradePercent: 0,
      samples: [],
    };
  }

  let gainMeters = 0;
  let lossMeters = 0;
  let minMeters = Infinity;
  let maxMeters = -Infinity;
  let maxGradePercent = 0;
  let absGradeSum = 0;
  let cumulativeDistance = 0;

  const coords = results.map((r) =>
    r.location ? toLatLngLiteral(r.location) : { lat: 0, lng: 0 },
  );

  // Compute raw distances between consecutive elevation sample points
  const segmentDistances: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    const dist = haversineMeters(coords[i - 1], coords[i]);
    segmentDistances.push(dist);
    cumulativeDistance += dist;
  }

  const totalDist =
    cumulativeDistance > 10 ? cumulativeDistance : fallbackDistanceMeters;
  const distScale =
    cumulativeDistance > 10 && fallbackDistanceMeters > 10
      ? fallbackDistanceMeters / cumulativeDistance
      : 1;

  let runningDist = 0;
  const samples: ElevationSamplePoint[] = [];

  for (let i = 0; i < results.length; i++) {
    const elev = results[i].elevation;
    if (elev < minMeters) minMeters = elev;
    if (elev > maxMeters) maxMeters = elev;

    let gradePercent = 0;
    if (i > 0) {
      const stepDist = segmentDistances[i] * distScale;
      runningDist += stepDist;
      const deltaElev = elev - results[i - 1].elevation;
      if (deltaElev > 0) {
        gainMeters += deltaElev;
      } else {
        lossMeters += Math.abs(deltaElev);
      }
      if (stepDist > 1) {
        gradePercent = (deltaElev / stepDist) * 100;
      }
      const absGrade = Math.abs(gradePercent);
      if (absGrade > maxGradePercent) {
        maxGradePercent = absGrade;
      }
      absGradeSum += absGrade;
    }

    samples.push({
      index: i,
      distanceMeters: runningDist,
      distanceMiles: runningDist / 1609.344,
      elevationMeters: elev,
      elevationFeet: metersToFeet(elev),
      gradePercent,
      lat: coords[i].lat,
      lng: coords[i].lng,
    });
  }

  const avgGradePercent =
    results.length > 1 ? absGradeSum / (results.length - 1) : 0;

  if (samples.length > 0 && totalDist > 0 && samples[samples.length - 1].distanceMeters === 0) {
    const step = totalDist / Math.max(1, samples.length - 1);
    samples.forEach((s, idx) => {
      s.distanceMeters = idx * step;
      s.distanceMiles = s.distanceMeters / 1609.344;
    });
  }

  return {
    gainMeters,
    gainFeet: metersToFeet(gainMeters),
    lossMeters,
    lossFeet: metersToFeet(lossMeters),
    minMeters,
    minFeet: metersToFeet(minMeters),
    maxMeters,
    maxFeet: metersToFeet(maxMeters),
    maxGradePercent,
    avgGradePercent,
    samples,
  };
}

export function formatMoney(
  money: google.maps.places.Money | null | undefined,
): string | null {
  if (!money) return null;
  const units = Number(money.units ?? 0);
  const nanos = Number(money.nanos ?? 0) / 1e9;
  const total = units + nanos;
  if (!Number.isFinite(total) || total <= 0) return null;
  const currency = money.currencyCode || 'USD';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(total);
  } catch {
    return `${currency} ${total.toFixed(2)}`;
  }
}

export function formatFuelMicroliters(
  microliters: number | null | undefined,
): string | null {
  if (microliters == null || !Number.isFinite(microliters) || microliters <= 0) {
    return null;
  }
  const liters = microliters / 1_000_000;
  const gallons = liters * 0.264172;
  return `~${gallons.toFixed(2)} gal (${liters.toFixed(1)} L)`;
}
