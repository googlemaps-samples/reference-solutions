export type TravelModeKey = 'DRIVING' | 'BICYCLING' | 'WALKING' | 'TRANSIT';

export interface LatLngPoint {
	lat: number;
	lng: number;
}

export interface ResolvedPlace {
	id: string;
	displayName: string;
	formattedAddress: string;
	location: LatLngPoint;
}

export interface RouteModifiersState {
	avoidTolls: boolean;
	avoidHighways: boolean;
	ecoFriendly: boolean;
}

export interface ComputedRouteSummary {
	id: string;
	index: number;
	mode: TravelModeKey;
	description: string;
	distanceMeters: number;
	distanceText: string;
	durationMillis: number;
	durationText: string;
	routeLabels: string[];
	isEcoRecommended: boolean;
	isAlternative: boolean;
	hasTolls: boolean;
	tollText: string | null;
	fuelConsumptionLiters: number | null;
	warnings: string[];
	path: LatLngPoint[];
	color: string;
	rawRoute: google.maps.routes.Route;
}

export interface ModeComparisonEntry {
	mode: TravelModeKey;
	loading: boolean;
	error: string | null;
	routes: ComputedRouteSummary[];
}

export interface ElevationSamplePoint {
	index: number;
	distanceMeters: number;
	elevationMeters: number;
	slopePercent: number;
	location: LatLngPoint;
}

export interface ElevationProfileSummary {
	samples: ElevationSamplePoint[];
	totalGainMeters: number;
	totalLossMeters: number;
	minElevationMeters: number;
	maxElevationMeters: number;
	maxGradePercent: number;
	totalDistanceMeters: number;
}
