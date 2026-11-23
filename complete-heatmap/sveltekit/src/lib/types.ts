export type HazardType =
	| 'Flash Flooding'
	| 'Storm Surge'
	| 'Road Closure'
	| 'Downed Power Line'
	| 'Drainage Overflow';

export interface HazardIncident {
	id: string;
	lat: number;
	lng: number;
	weight: number;
	type: HazardType;
	address: string;
	elevationMeters: number | null;
	weatherSummary: string;
	windText: string;
	precipText: string;
	reportedAt: string;
	isUserReported?: boolean;
}

export interface FloodZoneDefinition {
	id: string;
	name: string;
	severity: 'High Risk' | 'Moderate-High' | 'Advisory';
	description: string;
	fillColor: string;
	strokeColor: string;
	paths: google.maps.LatLngLiteral[];
}

export interface WeatherSnapshot {
	conditionText: string;
	temperatureDisplay: string;
	windSpeedText: string;
	windGustText: string;
	windDirectionText: string;
	precipProbPercent: number | null;
	precipQpfText: string;
	thunderstormProbPercent: number | null;
	isAvailable: boolean;
	statusNote?: string;
}

export interface DraftIncidentReport {
	lat: number;
	lng: number;
	address: string;
	elevationMeters: number | null;
	elevationNote: string;
	weather: WeatherSnapshot;
	hazardType: HazardType;
	notes: string;
	loading: boolean;
	errorMessage: string | null;
}

export interface ShelterPlace {
	id: string;
	displayName: string;
	formattedAddress: string;
	lat: number;
	lng: number;
	types: string[];
	rating: number | null;
	userRatingCount: number | null;
	businessStatus: string | null;
	category: 'hospital' | 'community_center';
}

export interface RouteStepPreview {
	instruction: string;
	distanceText: string;
}

export interface EvacuationRouteSummary {
	shelterId: string;
	shelterName: string;
	shelterAddress: string;
	originLabel: string;
	durationText: string;
	distanceText: string;
	durationMillis: number;
	distanceMeters: number;
	avoidFloodZones: boolean;
	usedBypassWaypoint: boolean;
	bypassWaypointLabel: string | null;
	intersectsFloodZone: boolean;
	intersectedZoneNames: string[];
	stepPreviews: RouteStepPreview[];
}
