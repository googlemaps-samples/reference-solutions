import type {
	ComputedRouteSummary,
	EcoSavingsSummary,
	EmissionType,
	FareEstimate,
	RideTierId
} from './types';

const METERS_PER_MILE = 1609.344;
// EPA average ~2.31 kg CO2 per liter of gasoline burned (8.887 kg CO2/gal)
const KG_CO2_PER_LITER_GASOLINE = 2.31;
// Approximate gasoline energy equivalent: ~8.9 kWh per liter
const KWH_PER_LITER_GASOLINE_EQ = 8.9;

export function parseDurationSeconds(duration: string | number | undefined | null): number {
	if (typeof duration === 'number' && Number.isFinite(duration)) {
		return Math.max(0, Math.round(duration));
	}
	if (typeof duration === 'string') {
		const trimmed = duration.trim();
		if (trimmed.endsWith('s')) {
			const val = Number.parseFloat(trimmed.slice(0, -1));
			return Number.isFinite(val) ? Math.max(0, Math.round(val)) : 0;
		}
		const val = Number.parseFloat(trimmed);
		return Number.isFinite(val) ? Math.max(0, Math.round(val)) : 0;
	}
	return 0;
}

export function formatDuration(seconds: number): string {
	const safe = Math.max(0, Math.round(seconds));
	if (safe < 60) {
		return `${safe}s`;
	}
	const mins = Math.round(safe / 60);
	if (mins < 60) {
		return `${mins} min`;
	}
	const hours = Math.floor(mins / 60);
	const remMins = mins % 60;
	return remMins > 0 ? `${hours} hr ${remMins} min` : `${hours} hr`;
}

export function formatDistanceMiles(meters: number): string {
	const miles = Math.max(0, meters) / METERS_PER_MILE;
	return `${miles.toFixed(1)} mi`;
}

export function computeEcoSavings(
	fastest: ComputedRouteSummary | null,
	eco: ComputedRouteSummary | null,
	emissionType: EmissionType
): EcoSavingsSummary {
	if (!fastest || !eco) {
		return {
			hasDistinctEcoRoute: false,
			fuelSavedLiters: 0,
			fuelSavedPercent: 0,
			co2SavedKg: 0,
			energySavedKwh: 0,
			timeDeltaSeconds: 0
		};
	}

	const fastestFuelL = fastest.fuelConsumptionMicroliters / 1_000_000;
	const ecoFuelL = eco.fuelConsumptionMicroliters / 1_000_000;
	const rawDiffL = Math.max(0, fastestFuelL - ecoFuelL);
	const hasDistinctEcoRoute =
		fastest.encodedPolyline !== eco.encodedPolyline || rawDiffL > 0.01;

	const fuelSavedPercent =
		fastestFuelL > 0 ? Math.max(0, (rawDiffL / fastestFuelL) * 100) : 0;

	const co2Multiplier =
		emissionType === 'ELECTRIC'
			? 0.45
			: emissionType === 'HYBRID'
				? 0.82
				: 1.0;

	return {
		hasDistinctEcoRoute,
		fuelSavedLiters: rawDiffL,
		fuelSavedPercent,
		co2SavedKg: rawDiffL * KG_CO2_PER_LITER_GASOLINE * co2Multiplier,
		energySavedKwh: rawDiffL * KWH_PER_LITER_GASOLINE_EQ,
		timeDeltaSeconds: eco.durationSeconds - fastest.durationSeconds
	};
}

interface TierPricingRule {
	tier: RideTierId;
	name: string;
	subtitle: string;
	vehicleExample: string;
	baseFare: number;
	perMile: number;
	perMinute: number;
	bookingFee: number;
	minFare: number;
}

const TIER_RULES: TierPricingRule[] = [
	{
		tier: 'economy',
		name: 'Economy',
		subtitle: 'Everyday affordable LA ride',
		vehicleExample: 'Toyota Corolla / Civic',
		baseFare: 2.55,
		perMile: 1.48,
		perMinute: 0.34,
		bookingFee: 2.75,
		minFare: 8.5
	},
	{
		tier: 'comfort',
		name: 'Comfort',
		subtitle: 'Extra legroom & newer sedans',
		vehicleExample: 'Camry / Accord / Model 3',
		baseFare: 4.1,
		perMile: 2.05,
		perMinute: 0.46,
		bookingFee: 3.25,
		minFare: 12.5
	},
	{
		tier: 'green',
		name: 'Green',
		subtitle: 'Zero-emission EV or Hybrid',
		vehicleExample: 'Tesla Model Y / Prius Prime',
		baseFare: 3.15,
		perMile: 1.62,
		perMinute: 0.36,
		bookingFee: 2.25,
		minFare: 9.75
	}
];

export function calculateFareEstimates(
	route: ComputedRouteSummary | null,
	ecoSavings: EcoSavingsSummary,
	pickupEtaSeconds: number | null
): FareEstimate[] {
	const distanceMiles = route ? route.distanceMeters / METERS_PER_MILE : 0;
	const durationMinutes = route ? route.durationSeconds / 60 : 0;
	const pickupMins = pickupEtaSeconds ? Math.max(2, Math.round(pickupEtaSeconds / 60)) : 4;

	return TIER_RULES.map((rule, idx) => {
		const distanceFare = roundCurrency(distanceMiles * rule.perMile);
		const timeFare = roundCurrency(durationMinutes * rule.perMinute);
		const rawTotal = rule.baseFare + distanceFare + timeFare + rule.bookingFee;
		const totalFare = route ? Math.max(rule.minFare, roundCurrency(rawTotal)) : 0;

		let ecoSavingsLabel: string | undefined;
		if (rule.tier === 'green' && route) {
			if (ecoSavings.co2SavedKg >= 0.05) {
				ecoSavingsLabel = `Saves ${ecoSavings.co2SavedKg.toFixed(2)} kg CO₂ on eco route`;
			} else {
				const estEvCo2 = Math.max(0.4, distanceMiles * 0.35);
				ecoSavingsLabel = `~${estEvCo2.toFixed(1)} kg CO₂ lower vs. gas sedan`;
			}
		}

		return {
			tier: rule.tier,
			name: rule.name,
			subtitle: rule.subtitle,
			vehicleExample: rule.vehicleExample,
			baseFare: rule.baseFare,
			distanceFare,
			timeFare,
			bookingFee: rule.bookingFee,
			totalFare,
			etaMinutes: pickupMins + idx,
			ecoSavingsLabel
		};
	});
}

function roundCurrency(value: number): number {
	return Math.round(value * 100) / 100;
}
