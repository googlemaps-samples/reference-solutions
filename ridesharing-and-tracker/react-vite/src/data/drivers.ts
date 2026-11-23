import type {
  CandidateDriver,
  ComputedRouteData,
  EmissionType,
  FareEstimate,
} from '../types/rideshare';

export const LA_CENTER: google.maps.LatLngLiteral = {
  lat: 34.0328,
  lng: -118.3669,
};

export const SEED_PICKUP_QUERY = 'Union Station, Los Angeles, CA';
export const SEED_DROPOFF_QUERY = 'Santa Monica Pier, Santa Monica, CA';

export const LA_TRIP_PRESETS: Array<{
  label: string;
  pickupQuery: string;
  dropoffQuery: string;
}> = [
  {
    label: 'Union Station → Santa Monica Pier',
    pickupQuery: 'Union Station, Los Angeles, CA',
    dropoffQuery: 'Santa Monica Pier, Santa Monica, CA',
  },
  {
    label: 'LAX → Hollywood Bowl',
    pickupQuery: 'Los Angeles International Airport, Los Angeles, CA',
    dropoffQuery: 'Hollywood Bowl, Los Angeles, CA',
  },
  {
    label: 'DTLA → Venice Beach',
    pickupQuery: 'Crypto.com Arena, Los Angeles, CA',
    dropoffQuery: 'Venice Beach Boardwalk, Venice, CA',
  },
];

/**
 * Simulated rideshare driver fleet positioned across Los Angeles neighborhoods.
 * Used as origins for live Routes API computeRouteMatrix dispatch ranking.
 */
export const SIMULATED_CANDIDATE_DRIVERS: CandidateDriver[] = [
  {
    id: 'drv-arts-district',
    name: 'Elena Rostova',
    vehicle: 'Hyundai Ioniq 5 (EV)',
    plate: '8EVL412',
    rating: 4.96,
    emissionType: 'ELECTRIC',
    neighborhood: 'Arts District',
    initialLocation: { lat: 34.0416, lng: -118.2345 },
  },
  {
    id: 'drv-silver-lake',
    name: 'Marcus Vance',
    vehicle: 'Toyota Prius Prime (Hybrid)',
    plate: '9HYB204',
    rating: 4.92,
    emissionType: 'HYBRID',
    neighborhood: 'Silver Lake',
    initialLocation: { lat: 34.0768, lng: -118.2624 },
  },
  {
    id: 'drv-koreatown',
    name: 'Devon Brooks',
    vehicle: 'Kia Niro EV',
    plate: '8KIA903',
    rating: 4.89,
    emissionType: 'ELECTRIC',
    neighborhood: 'Koreatown',
    initialLocation: { lat: 34.0598, lng: -118.3005 },
  },
  {
    id: 'drv-mid-wilshire',
    name: 'Sofia Alvarez',
    vehicle: 'Honda Accord Hybrid',
    plate: '7HON558',
    rating: 4.95,
    emissionType: 'HYBRID',
    neighborhood: 'Mid-Wilshire',
    initialLocation: { lat: 34.0575, lng: -118.3522 },
  },
  {
    id: 'drv-culver-city',
    name: 'Liam Chen',
    vehicle: 'Toyota Camry',
    plate: '8CAM771',
    rating: 4.87,
    emissionType: 'GASOLINE',
    neighborhood: 'Culver City',
    initialLocation: { lat: 34.0211, lng: -118.3965 },
  },
];

export function formatMiles(meters: number): string {
  const miles = meters / 1609.344;
  return `${miles.toFixed(1)} mi`;
}

export function formatDuration(millis: number): string {
  const totalMinutes = Math.max(1, Math.round(millis / 60000));
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
}

export function formatCountdown(seconds: number): string {
  const clamped = Math.max(0, Math.round(seconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  if (mins === 0) {
    return `${secs}s`;
  }
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Converts Routes API fuelConsumptionMicroliters into human-readable energy/fuel
 * metrics and CO2 estimates.
 * - Gasoline / Hybrid: 1 US gal = 3.78541 L; ~2.31 kg CO2 per liter burned.
 * - Electric: Routes API expresses EV energy consumption in gasoline-equivalent microliters
 *   (EPA 33.7 kWh/gal => ~8.903 kWh per liter-equivalent).
 */
export function formatFuelMetric(
  microliters: number | null,
  emissionType: EmissionType
): string {
  if (!microliters || !Number.isFinite(microliters) || microliters <= 0) {
    return 'N/A';
  }
  const liters = microliters / 1_000_000;
  if (emissionType === 'ELECTRIC') {
    const kwh = liters * 8.9026;
    return `${kwh.toFixed(1)} kWh`;
  }
  const gallons = liters / 3.785411784;
  return `${gallons.toFixed(2)} gal`;
}

export interface EcoSavingsSummary {
  hasFuelData: boolean;
  percentSaved: number;
  energySavedText: string;
  co2SavedKg: number;
  timeDeltaMinutes: number;
  isSameRoute: boolean;
}

export function calculateEcoSavings(
  fastest: ComputedRouteData,
  eco: ComputedRouteData,
  emissionType: EmissionType,
  isSameRoute: boolean
): EcoSavingsSummary {
  const fastFuel = fastest.fuelConsumptionMicroliters ?? 0;
  const ecoFuel = eco.fuelConsumptionMicroliters ?? 0;
  const timeDeltaMinutes = Math.round(
    (eco.durationMillis - fastest.durationMillis) / 60000
  );

  if (fastFuel <= 0 || ecoFuel <= 0) {
    return {
      hasFuelData: false,
      percentSaved: 0,
      energySavedText: '—',
      co2SavedKg: 0,
      timeDeltaMinutes,
      isSameRoute,
    };
  }

  const savedMicroliters = Math.max(0, fastFuel - ecoFuel);
  const percentSaved = fastFuel > 0 ? (savedMicroliters / fastFuel) * 100 : 0;
  const savedLiters = savedMicroliters / 1_000_000;

  let energySavedText: string;
  let co2SavedKg: number;

  if (emissionType === 'ELECTRIC') {
    const savedKwh = savedLiters * 8.9026;
    energySavedText = `${savedKwh.toFixed(2)} kWh saved`;
    // California grid intensity ~0.22 kg CO2 / kWh
    co2SavedKg = savedKwh * 0.22;
  } else {
    const savedGal = savedLiters / 3.785411784;
    energySavedText = `${savedGal.toFixed(2)} gal saved`;
    co2SavedKg = savedLiters * 2.31;
  }

  return {
    hasFuelData: true,
    percentSaved,
    energySavedText,
    co2SavedKg,
    timeDeltaMinutes,
    isSameRoute,
  };
}

export function calculateFareEstimates(
  activeRoute: ComputedRouteData | null,
  ecoSavings: EcoSavingsSummary | null
): FareEstimate[] {
  const distanceMiles = activeRoute ? activeRoute.distanceMeters / 1609.344 : 15.2;
  const durationMinutes = activeRoute ? activeRoute.durationMillis / 60000 : 28;
  const etaMinutes = Math.max(1, Math.round(durationMinutes));

  const buildTier = (
    tierId: FareEstimate['tierId'],
    name: string,
    subtitle: string,
    base: number,
    perMile: number,
    perMin: number,
    fee: number,
    minFare: number,
    badge?: string,
    ecoTag?: string
  ): FareEstimate => {
    const distanceFare = Number((distanceMiles * perMile).toFixed(2));
    const timeFare = Number((durationMinutes * perMin).toFixed(2));
    const rawTotal = base + distanceFare + timeFare + fee;
    const totalFare = Number(Math.max(minFare, rawTotal).toFixed(2));
    return {
      tierId,
      name,
      subtitle,
      badge,
      baseFare: base,
      distanceFare,
      timeFare,
      bookingFee: fee,
      totalFare,
      etaMinutes,
      ecoTag,
    };
  };

  const greenTag =
    ecoSavings && ecoSavings.hasFuelData && ecoSavings.percentSaved > 0.5
      ? `Saves ${ecoSavings.percentSaved.toFixed(0)}% energy (${ecoSavings.co2SavedKg.toFixed(1)} kg CO₂)`
      : 'Zero-tailpipe EV & hybrid fleet';

  return [
    buildTier(
      'economy',
      'Economy',
      'Everyday reliable rides · 4 seats',
      2.5,
      1.35,
      0.28,
      2.25,
      8.0,
      'Best Value'
    ),
    buildTier(
      'comfort',
      'Comfort',
      'Extra legroom & top-rated sedans · 4 seats',
      4.25,
      1.85,
      0.4,
      2.75,
      12.5
    ),
    buildTier(
      'green',
      'Green EV',
      'All-electric or hybrid vehicles · 4 seats',
      3.0,
      1.45,
      0.3,
      2.25,
      9.0,
      'Eco Choice',
      greenTag
    ),
  ];
}
