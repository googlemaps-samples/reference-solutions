export type VehicleStatus = 'en-route' | 'delayed' | 'idle';

export type StatusFilter = 'all' | VehicleStatus;

export interface LatLngPoint {
	lat: number;
	lng: number;
}

export interface FleetVehicle {
	id: string;
	callsign: string;
	driver: string;
	vehicleType: string;
	status: VehicleStatus;
	speedMph: number;
	headingDeg: number;
	corridor: string;
	nextStop: string;
	etaLabel: string;
	delayMinutes: number;
	position: LatLngPoint;
	rawGpsTrace: LatLngPoint[];
}

export interface LogisticsHub {
	id: string;
	name: string;
	address: string;
	location: LatLngPoint;
	isDepot?: boolean;
}

export interface SnappedPointItem {
	location: LatLngPoint;
	originalIndex?: number;
	placeId: string;
}

export interface SnapAnalysis {
	vehicleId: string;
	rawCount: number;
	snappedCount: number;
	uniqueRoadSegments: number;
	meanOffsetMeters: number;
	snappedPoints: SnappedPointItem[];
	warningMessage?: string;
	source: 'roads-api' | 'unavailable';
}

export interface DispatchLeg {
	fromName: string;
	toName: string;
	distanceMeters: number;
	durationSeconds: number;
}

export interface DispatchRouteResult {
	encodedPolyline?: string;
	path: LatLngPoint[];
	totalDistanceMeters: number;
	totalDurationSeconds: number;
	optimizedOrderIndices: number[];
	orderedHubs: LogisticsHub[];
	legs: DispatchLeg[];
	source: 'routes-api-bff' | 'routes-js-sdk';
}

export interface MatrixEntry {
	originIndex: number;
	destinationIndex: number;
	hubId: string;
	hubName: string;
	distanceMeters: number | null;
	durationSeconds: number | null;
	condition: string;
}
