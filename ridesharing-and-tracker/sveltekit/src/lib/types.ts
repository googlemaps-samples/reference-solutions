export type LatLngLiteral = {
	lat: number;
	lng: number;
};

export type EmissionType = 'GASOLINE' | 'HYBRID' | 'ELECTRIC';

export type RoutePreferenceKind = 'fastest' | 'eco';

export type RideTierId = 'economy' | 'comfort' | 'green';

export type DispatchPhase = 'idle' | 'searching' | 'approaching' | 'in_trip' | 'arrived';

export interface PlaceSelection {
	id: string;
	displayName: string;
	formattedAddress: string;
	location: LatLngLiteral;
}

export interface ComputedRouteSummary {
	kind: RoutePreferenceKind;
	label: string;
	distanceMeters: number;
	durationSeconds: number;
	staticDurationSeconds: number;
	encodedPolyline: string;
	path: LatLngLiteral[];
	fuelConsumptionMicroliters: number;
	localizedDistance: string;
	localizedDuration: string;
	routeLabels: string[];
}

export interface EcoSavingsSummary {
	hasDistinctEcoRoute: boolean;
	fuelSavedLiters: number;
	fuelSavedPercent: number;
	co2SavedKg: number;
	energySavedKwh: number;
	timeDeltaSeconds: number;
}

export interface FareEstimate {
	tier: RideTierId;
	name: string;
	subtitle: string;
	vehicleExample: string;
	baseFare: number;
	distanceFare: number;
	timeFare: number;
	bookingFee: number;
	totalFare: number;
	etaMinutes: number;
	ecoSavingsLabel?: string;
}

export interface CandidateDriver {
	id: string;
	name: string;
	rating: string;
	vehicle: string;
	plate: string;
	emissionType: EmissionType;
	location: LatLngLiteral;
	neighborhood: string;
	approachEtaSeconds?: number;
	approachDistanceMeters?: number;
}

export interface MatrixCandidateResult {
	originIndex: number;
	destinationIndex: number;
	durationSeconds: number;
	distanceMeters: number;
	condition: string;
}
