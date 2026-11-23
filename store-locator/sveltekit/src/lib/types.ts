export type BranchType = 'flagship' | 'kiosk' | 'atm';

export type BranchFilterType = 'all' | BranchType;

export type ServiceTag = 'pickup' | 'coffee' | 'cash' | 'open24';

export type TravelModeChoice = 'DRIVE' | 'WALK' | 'TRANSIT';

export interface OriginLocation {
	label: string;
	address: string;
	lat: number;
	lng: number;
}

export interface BranchLocation {
	id: string;
	name: string;
	address: string;
	lat: number;
	lng: number;
	type: BranchType;
	services: ServiceTag[];
	rating: number | null;
	userRatingCount: number | null;
	weekdayDescriptions: string[];
	businessStatus: string | null;
	primaryType: string | null;
	durationMillis: number | null;
	distanceMeters: number | null;
	durationText: string | null;
	distanceText: string | null;
}

export interface ActiveRouteInfo {
	branchId: string;
	branchName: string;
	branchType: BranchType;
	travelMode: TravelModeChoice;
	durationText: string;
	distanceText: string;
	durationMillis: number;
	distanceMeters: number;
	googleMapsUrl: string;
}

export interface AutocompleteOption {
	id: string;
	mainText: string;
	secondaryText: string;
	fullText: string;
	placePrediction: google.maps.places.PlacePrediction;
}

export const NYC_CENTER: google.maps.LatLngLiteral = {
	lat: 40.7549,
	lng: -73.984
};

export const NYC_DEFAULT_ORIGIN: OriginLocation = {
	label: 'Penn Station / Midtown West',
	address: 'Penn Station, New York, NY 10001',
	lat: 40.7506,
	lng: -73.9935
};

export const NYC_ORIGIN_PRESETS: OriginLocation[] = [
	NYC_DEFAULT_ORIGIN,
	{
		label: 'Grand Central Terminal',
		address: '89 E 42nd St, New York, NY 10017',
		lat: 40.7527,
		lng: -73.9772
	},
	{
		label: 'Union Square',
		address: 'Union Square, New York, NY 10003',
		lat: 40.7359,
		lng: -73.9911
	},
	{
		label: 'Wall Street',
		address: 'Wall Street, New York, NY 10005',
		lat: 40.706,
		lng: -74.0088
	}
];

export const NYC_BOUNDS_LITERAL: google.maps.LatLngBoundsLiteral = {
	south: 40.68,
	west: -74.05,
	north: 40.84,
	east: -73.9
};

export const BRANCH_TYPE_LABELS: Record<BranchType, string> = {
	flagship: 'Flagship Store',
	kiosk: 'Express Kiosk',
	atm: '24/7 ATM'
};

export const SERVICE_LABELS: Record<ServiceTag, string> = {
	pickup: 'Click & Collect',
	coffee: 'Express Espresso',
	cash: 'Cash Deposit',
	open24: 'Open 24h'
};
