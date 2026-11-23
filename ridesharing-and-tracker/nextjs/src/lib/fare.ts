import type {
  CandidateDriver,
  ComputedRouteData,
  EcoSavingsSummary,
  EmissionType,
  FareEstimate,
  LatLngLiteral,
} from '@/types/rideshare';

const METERS_PER_MILE = 1609.344;
const MICROLITERS_PER_LITER = 1_000_000;
// Average CO2 emitted per liter of gasoline burned (EPA ~2.31 kg/L)
const KG_CO2_PER_LITER_GASOLINE = 2.31;
// Equivalent energy content per liter of gasoline (~8.9 kWh/L)
const KWH_PER_LITER_EQUIVALENT = 8.9;

export function parseDurationSeconds(duration?: string | null): number {
  if (!duration) return 0;
  const match = /^([0-9]+(?:\.[0-9]+)?)s$/.exec(duration.trim());
  if (!match) return 0;
  return Math.round(Number(match[1]));
}

export function formatDistanceMiles(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return '0.0 mi';
  const miles = meters / METERS_PER_MILE;
  return `${miles.toFixed(1)} mi`;
}

export function formatDurationCompact(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '1 min';
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function formatEtaCountdown(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const clamped = Math.max(0, Math.round(seconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function calculateEcoSavings(
  fastest: ComputedRouteData | null,
  eco: ComputedRouteData | null,
  emissionType: EmissionType
): EcoSavingsSummary | null {
  if (!fastest || !eco) return null;

  const isSameRoute =
    fastest.encodedPolyline === eco.encodedPolyline ||
    (eco.routeLabels.includes('DEFAULT_ROUTE') &&
      eco.routeLabels.includes('FUEL_EFFICIENT'));

  const fastestFuelLiters =
    fastest.fuelConsumptionMicroliters !== null
      ? fastest.fuelConsumptionMicroliters / MICROLITERS_PER_LITER
      : null;

  const ecoFuelLiters =
    eco.fuelConsumptionMicroliters !== null
      ? eco.fuelConsumptionMicroliters / MICROLITERS_PER_LITER
      : null;

  let fuelSavedLiters = 0;
  let fuelSavedPercent = 0;

  if (
    fastestFuelLiters !== null &&
    ecoFuelLiters !== null &&
    fastestFuelLiters > 0
  ) {
    fuelSavedLiters = Math.max(0, fastestFuelLiters - ecoFuelLiters);
    fuelSavedPercent = Math.max(
      0,
      Math.round((fuelSavedLiters / fastestFuelLiters) * 100)
    );
  }

  // Factor emission type for realistic CO2 / kWh interpretation
  const emissionFactor =
    emissionType === 'ELECTRIC'
      ? 0.35
      : emissionType === 'HYBRID'
      ? 0.7
      : 1.0;

  const co2SavedKg = fuelSavedLiters * KG_CO2_PER_LITER_GASOLINE * emissionFactor;
  const energySavedKwh = fuelSavedLiters * KWH_PER_LITER_EQUIVALENT;

  return {
    isSameRoute,
    fuelSavedLiters,
    fuelSavedPercent,
    co2SavedKg,
    energySavedKwh,
    timeDeltaSeconds: eco.durationSeconds - fastest.durationSeconds,
    fastestFuelLiters,
    ecoFuelLiters,
  };
}

export function calculateFareEstimates(
  route: ComputedRouteData | null,
  isEcoRouteSelected: boolean,
  emissionType: EmissionType,
  driverEtaSeconds: number
): FareEstimate[] {
  const miles = route ? route.distanceMeters / METERS_PER_MILE : 0;
  const minutes = route ? route.durationSeconds / 60 : 0;
  const pickupEtaMin = Math.max(2, Math.round(driverEtaSeconds / 60) || 4);

  const roundUsd = (value: number) => Math.round(value * 100) / 100;

  // Economy
  const econBase = 3.25;
  const econDist = roundUsd(miles * 1.65);
  const econTime = roundUsd(minutes * 0.32);
  const econFee = 2.25;
  const econTotal = Math.max(
    7.5,
    roundUsd(econBase + econDist + econTime + econFee)
  );

  // Comfort
  const comfBase = 4.75;
  const comfDist = roundUsd(miles * 2.2);
  const comfTime = roundUsd(minutes * 0.44);
  const comfFee = 2.75;
  const comfTotal = Math.max(
    11.0,
    roundUsd(comfBase + comfDist + comfTime + comfFee)
  );

  // Green (EV / Hybrid fleet with eco discount when eco route or EV/Hybrid selected)
  const greenBase = 3.75;
  const greenDist = roundUsd(miles * 1.8);
  const greenTime = roundUsd(minutes * 0.36);
  const greenFee = 2.25;
  const rawGreen = greenBase + greenDist + greenTime + greenFee;
  const ecoDiscount =
    isEcoRouteSelected || emissionType !== 'GASOLINE'
      ? roundUsd(rawGreen * 0.08)
      : 0;
  const greenTotal = Math.max(8.5, roundUsd(rawGreen - ecoDiscount));

  return [
    {
      id: 'economy',
      name: 'LA Economy',
      tagline: 'Everyday reliable rides across Los Angeles',
      vehicleClass: 'Compact Sedan · 4 seats',
      totalUsd: econTotal,
      baseFareUsd: econBase,
      distanceChargeUsd: econDist,
      timeChargeUsd: econTime,
      bookingFeeUsd: econFee,
      ecoDiscountUsd: 0,
      etaMinutes: pickupEtaMin,
    },
    {
      id: 'comfort',
      name: 'LA Comfort',
      tagline: 'Extra legroom & top-rated LA chauffeurs',
      vehicleClass: 'Midsize Executive · 4 seats',
      totalUsd: comfTotal,
      baseFareUsd: comfBase,
      distanceChargeUsd: comfDist,
      timeChargeUsd: comfTime,
      bookingFeeUsd: comfFee,
      ecoDiscountUsd: 0,
      etaMinutes: pickupEtaMin + 1,
    },
    {
      id: 'green',
      name: 'LA Green EV',
      tagline: 'Zero-tailpipe EV & Hybrid priority fleet',
      vehicleClass: 'EV / Hybrid · Low Emission',
      totalUsd: greenTotal,
      baseFareUsd: greenBase,
      distanceChargeUsd: greenDist,
      timeChargeUsd: greenTime,
      bookingFeeUsd: greenFee,
      ecoDiscountUsd: ecoDiscount,
      etaMinutes: pickupEtaMin + 1,
    },
  ];
}

/**
 * Generates 4 realistic simulated candidate drivers positioned in nearby LA corridors
 * relative to the resolved pickup location so ComputeRouteMatrix returns valid street ETAs.
 */
export function buildCandidateDriversNearPickup(
  pickup: LatLngLiteral
): CandidateDriver[] {
  return [
    {
      id: 'drv-maya',
      name: 'Maya R.',
      rating: 4.96,
      vehicleModel: 'Hyundai Ioniq 5',
      licensePlate: '8EVZ412',
      emissionType: 'ELECTRIC',
      tier: 'green',
      location: {
        lat: Number((pickup.lat + 0.0072).toFixed(6)),
        lng: Number((pickup.lng - 0.0095).toFixed(6)),
      },
    },
    {
      id: 'drv-carlos',
      name: 'Carlos M.',
      rating: 4.91,
      vehicleModel: 'Toyota Prius Prime',
      licensePlate: '9HYB204',
      emissionType: 'HYBRID',
      tier: 'economy',
      location: {
        lat: Number((pickup.lat - 0.0115).toFixed(6)),
        lng: Number((pickup.lng + 0.0082).toFixed(6)),
      },
    },
    {
      id: 'drv-elena',
      name: 'Elena V.',
      rating: 4.98,
      vehicleModel: 'Polestar 2 Dual Motor',
      licensePlate: '9PLS889',
      emissionType: 'ELECTRIC',
      tier: 'comfort',
      location: {
        lat: Number((pickup.lat + 0.0138).toFixed(6)),
        lng: Number((pickup.lng + 0.0124).toFixed(6)),
      },
    },
    {
      id: 'drv-devon',
      name: 'Devon K.',
      rating: 4.88,
      vehicleModel: 'Honda Accord Hybrid',
      licensePlate: '8LAX631',
      emissionType: 'HYBRID',
      tier: 'economy',
      location: {
        lat: Number((pickup.lat - 0.0068).toFixed(6)),
        lng: Number((pickup.lng - 0.0142).toFixed(6)),
      },
    },
  ];
}

export function haversineMeters(a: LatLngLiteral, b: LatLngLiteral): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function computeBearingDegrees(
  from: LatLngLiteral,
  to: LatLngLiteral
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}
