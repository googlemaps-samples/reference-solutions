import type {
  ComputedRouteInfo,
  EcoSavingsSummary,
  EmissionType,
  FareTierEstimate,
} from '../types/rideshare';

const METERS_PER_MILE = 1609.344;
const LITER_TO_GALLON = 0.264172;
// EPA average tailpipe CO2 per liter of gasoline (~2.31 kg/L); hybrid & EV grid factors
const CO2_KG_PER_LITER_EQ: Record<EmissionType, number> = {
  GASOLINE: 2.31,
  HYBRID: 1.54,
  ELECTRIC: 0.62,
};
// Approximate gasoline-equivalent energy content (~8.9 kWh per liter)
const KWH_PER_LITER_EQ = 8.9;

export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(1, Math.round(ms / 60000));
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
}

export function formatDistanceMiles(meters: number): string {
  const miles = meters / METERS_PER_MILE;
  return miles >= 10 ? `${miles.toFixed(1)} mi` : `${miles.toFixed(2)} mi`;
}

export function calculateEcoComparison(
  fastest: ComputedRouteInfo,
  eco: ComputedRouteInfo | null,
  emissionType: EmissionType,
): EcoSavingsSummary {
  const activeEco = eco ?? fastest;
  const hasSeparateEcoRoute =
    Boolean(eco) && !eco?.isSharedWithFastest && eco !== fastest;

  const fastestLiters =
    fastest.fuelConsumptionMicroliters != null
      ? fastest.fuelConsumptionMicroliters / 1_000_000
      : null;
  const ecoLiters =
    activeEco.fuelConsumptionMicroliters != null
      ? activeEco.fuelConsumptionMicroliters / 1_000_000
      : null;

  const co2Factor = CO2_KG_PER_LITER_EQ[emissionType];

  if (fastestLiters != null && ecoLiters != null && fastestLiters > 0) {
    const rawSavedLiters = Math.max(0, fastestLiters - ecoLiters);
    const percentSaved = Math.round((rawSavedLiters / fastestLiters) * 1000) / 10;
    const fuelSavedGallons = rawSavedLiters * LITER_TO_GALLON;
    const energySavedKwh = rawSavedLiters * KWH_PER_LITER_EQ;
    const co2SavedKg = rawSavedLiters * co2Factor;
    const timeDeltaMinutes = Math.round(
      (activeEco.durationMillis - fastest.durationMillis) / 60000,
    );

    if (!hasSeparateEcoRoute || rawSavedLiters < 0.005) {
      return {
        hasSeparateEcoRoute: false,
        fastestFuelLiters: fastestLiters,
        ecoFuelLiters: ecoLiters,
        fuelSavedLiters: 0,
        fuelSavedGallons: 0,
        energySavedKwh: 0,
        co2SavedKg: 0,
        percentSaved: 0,
        timeDeltaMinutes: 0,
        headline: 'Fastest route is already the most fuel-efficient',
        detail:
          emissionType === 'ELECTRIC'
            ? `Estimated energy use: ${(ecoLiters * KWH_PER_LITER_EQ).toFixed(1)} kWh (${(ecoLiters * co2Factor).toFixed(2)} kg CO₂e)`
            : `Estimated fuel use: ${ecoLiters.toFixed(2)} L (${(ecoLiters * LITER_TO_GALLON).toFixed(2)} gal · ${(ecoLiters * co2Factor).toFixed(2)} kg CO₂)`,
      };
    }

    const timeNote =
      timeDeltaMinutes === 0
        ? 'same ETA'
        : timeDeltaMinutes > 0
          ? `+${timeDeltaMinutes} min`
          : `${timeDeltaMinutes} min`;

    return {
      hasSeparateEcoRoute: true,
      fastestFuelLiters: fastestLiters,
      ecoFuelLiters: ecoLiters,
      fuelSavedLiters: rawSavedLiters,
      fuelSavedGallons,
      energySavedKwh,
      co2SavedKg,
      percentSaved,
      timeDeltaMinutes,
      headline:
        emissionType === 'ELECTRIC'
          ? `Eco route saves ${energySavedKwh.toFixed(1)} kWh (${percentSaved.toFixed(1)}% energy) · ${timeNote}`
          : `Eco route saves ${rawSavedLiters.toFixed(2)} L (${fuelSavedGallons.toFixed(2)} gal · ${percentSaved.toFixed(1)}%) · ${timeNote}`,
      detail: `Avoids ~${co2SavedKg.toFixed(2)} kg CO₂ vs. fastest traffic-aware route (${emissionType.toLowerCase()} powertrain).`,
    };
  }

  return {
    hasSeparateEcoRoute,
    fastestFuelLiters: fastestLiters,
    ecoFuelLiters: ecoLiters,
    fuelSavedLiters: 0,
    fuelSavedGallons: 0,
    energySavedKwh: 0,
    co2SavedKg: 0,
    percentSaved: 0,
    timeDeltaMinutes: eco
      ? Math.round((eco.durationMillis - fastest.durationMillis) / 60000)
      : 0,
    headline: hasSeparateEcoRoute
      ? 'Eco-friendly route computed alongside fastest route'
      : 'Fastest traffic-aware route active',
    detail: 'Fuel telemetry unavailable for this route segment.',
  };
}

export function calculateFareTiers(
  selectedRoute: ComputedRouteInfo,
  ecoSummary: EcoSavingsSummary,
  emissionType: EmissionType,
): FareTierEstimate[] {
  const distanceMiles = selectedRoute.distanceMeters / METERS_PER_MILE;
  const durationMinutes = Math.max(1, selectedRoute.durationMillis / 60000);
  const bookingFee = 2.5;

  const baseFuelLiters =
    selectedRoute.fuelConsumptionMicroliters != null
      ? selectedRoute.fuelConsumptionMicroliters / 1_000_000
      : distanceMiles * 0.11;

  const ecoIncentive =
    selectedRoute.kind === 'eco' && ecoSummary.hasSeparateEcoRoute ? 1.0 : 0.45;

  const economyBase = 2.85;
  const economyDistance = roundCurrency(distanceMiles * 1.55);
  const economyTime = roundCurrency(durationMinutes * 0.32);
  const economyTotal = roundCurrency(
    economyBase + economyDistance + economyTime + bookingFee,
  );

  const comfortBase = 4.25;
  const comfortDistance = roundCurrency(distanceMiles * 2.15);
  const comfortTime = roundCurrency(durationMinutes * 0.45);
  const comfortTotal = roundCurrency(
    comfortBase + comfortDistance + comfortTime + bookingFee,
  );

  const greenBase = 3.1;
  const greenDistance = roundCurrency(distanceMiles * 1.65);
  const greenTime = roundCurrency(durationMinutes * 0.35);
  const greenTotal = roundCurrency(
    Math.max(
      6.5,
      greenBase + greenDistance + greenTime + bookingFee - ecoIncentive,
    ),
  );

  return [
    {
      id: 'economy',
      name: 'Metro Economy',
      subtitle: 'Everyday affordable rides for up to 4 riders',
      badge: 'Best Value',
      totalFare: economyTotal,
      baseFare: economyBase,
      distanceFare: economyDistance,
      timeFare: economyTime,
      bookingFee,
      ecoDiscount: 0,
      distanceMiles,
      durationMinutes,
      vehicleExamples: 'Civic, Corolla, Elantra',
      co2EstimateKg: roundTwo(
        baseFuelLiters * CO2_KG_PER_LITER_EQ[emissionType],
      ),
    },
    {
      id: 'comfort',
      name: 'Metro Comfort',
      subtitle: 'Extra legroom, quiet cabin, top-rated drivers',
      badge: 'Spacious',
      totalFare: comfortTotal,
      baseFare: comfortBase,
      distanceFare: comfortDistance,
      timeFare: comfortTime,
      bookingFee,
      ecoDiscount: 0,
      distanceMiles,
      durationMinutes,
      vehicleExamples: 'Camry, Lexus ES, Model Y',
      co2EstimateKg: roundTwo(
        baseFuelLiters * 1.08 * CO2_KG_PER_LITER_EQ[emissionType],
      ),
    },
    {
      id: 'green',
      name: 'Metro Green',
      subtitle: 'Hybrid & zero-tailpipe EVs with Eco-Route priority',
      badge:
        ecoSummary.percentSaved > 0
          ? `-${ecoSummary.percentSaved.toFixed(0)}% Fuel`
          : 'Low Emission',
      totalFare: greenTotal,
      baseFare: greenBase,
      distanceFare: greenDistance,
      timeFare: greenTime,
      bookingFee,
      ecoDiscount: ecoIncentive,
      distanceMiles,
      durationMinutes,
      vehicleExamples: 'Model 3 EV, Prius Prime, Ioniq 5',
      co2EstimateKg: roundTwo(baseFuelLiters * CO2_KG_PER_LITER_EQ.ELECTRIC),
    },
  ];
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}
