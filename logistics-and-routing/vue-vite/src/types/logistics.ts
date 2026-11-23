export type VehicleStatus = 'En Route' | 'Delayed' | 'Idle';

export type StatusFilter = 'All' | VehicleStatus;

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface FleetVehicle {
  id: string;
  callsign: string;
  vehicleClass: string;
  driverCode: string;
  status: VehicleStatus;
  speedMph: number;
  headingDeg: number;
  corridor: string;
  position: LatLngPoint;
  rawGpsTrace: LatLngPoint[];
  nextStopHubId: string | null;
  nextStopName: string;
  etaText: string;
  distanceText: string;
  cargoLoadPct: number;
}

export interface LogisticsHub {
  id: string;
  placeId: string;
  name: string;
  address: string;
  location: LatLngPoint;
  role: 'depot' | 'stop';
}

export interface SnapToRoadsResult {
  vehicleId: string;
  rawPoints: LatLngPoint[];
  snappedPoints: LatLngPoint[];
  roadSegmentPlaceIds: string[];
  meanOffsetMeters: number;
  source: 'roads-api' | 'routes-fallback';
  warningMessage: string | null;
}

export interface DispatchLegSummary {
  legIndex: number;
  fromName: string;
  toName: string;
  distanceText: string;
  durationText: string;
  distanceMeters: number;
  durationMillis: number;
}

export interface DispatchRouteSummary {
  path: LatLngPoint[];
  totalDistanceText: string;
  totalDurationText: string;
  totalDistanceMeters: number;
  totalDurationMillis: number;
  optimizedStopIndices: number[];
  legs: DispatchLegSummary[];
}

export interface RouteMatrixEntry {
  originId: string;
  originLabel: string;
  destinationId: string;
  destinationName: string;
  distanceText: string;
  durationText: string;
  distanceMeters: number | null;
  durationMillis: number | null;
  condition: string;
}
