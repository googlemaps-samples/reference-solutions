export type ProviderCategory = 'ev_charging' | 'auto_repair';
export type CategoryFilter = 'all' | ProviderCategory;
export type RadiusKm = 5 | 10 | 15;

export interface LatLngLiteral {
	lat: number;
	lng: number;
}

export interface EvConnectorSummary {
	typeLabel: string;
	maxKw: number;
	count: number;
	availableCount: number | null;
	outOfServiceCount: number | null;
}

export interface OpenStatusInfo {
	label: string;
	isOpen: boolean | null;
	todayHours: string | null;
}

export interface ServiceProvider {
	id: string;
	name: string;
	category: ProviderCategory;
	address: string;
	location: LatLngLiteral;
	rating: number | null;
	userRatingCount: number | null;
	phoneNumber: string | null;
	googleMapsUri: string | null;
	openStatus: OpenStatusInfo;
	evConnectorCount: number | null;
	evMaxKw: number | null;
	evAvailableCount: number | null;
	evConnectors: EvConnectorSummary[];
	distanceMeters: number | null;
	durationMillis: number | null;
	distanceText: string;
	etaText: string;
	etaSource: 'routes_matrix' | 'estimate';
}

export interface RouteStep {
	index: number;
	instruction: string;
	maneuver: string | null;
	distanceText: string;
	durationText: string;
}

export interface ActiveRouteDetails {
	provider: ServiceProvider;
	distanceText: string;
	durationText: string;
	steps: RouteStep[];
	route: google.maps.routes.Route;
}
