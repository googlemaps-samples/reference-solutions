export interface LatLngPoint {
	lat: number;
	lng: number;
}

export interface GeofenceZone {
	id: string;
	name: string;
	source: 'pre-seeded' | 'supervisor-drawn';
	color: string;
	paths: LatLngPoint[];
}

export interface WorkerPreset {
	id: string;
	label: string;
	expectedZone: string | null;
	position: LatLngPoint;
}

export interface AuditSite {
	id: string;
	displayName: string;
	formattedAddress: string;
	primaryType: string;
	location: LatLngPoint;
}

export interface RouteLegSummary {
	distanceMeters: number;
	durationSeconds: number;
	durationText: string;
	distanceText: string;
}

export interface RouteComputeResult {
	encodedPolyline: string;
	distanceMeters: number;
	durationSeconds: number;
	distanceText: string;
	durationText: string;
	optimizedIntermediateWaypointIndex: number[];
	legs: RouteLegSummary[];
}

export interface ReverseGeocodeResult {
	formattedAddress: string;
	placeId: string | null;
	location: LatLngPoint;
}
