export type VehicleStatus = 'En Route' | 'Delayed' | 'Idle';

export type StatusFilter = 'All' | VehicleStatus;

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface FleetVehicle {
  id: string;
  callsign: string;
  unitType: 'Freight Sprinter' | 'Box Truck 26ft' | 'Shuttle Van' | 'Semi Tractor';
  status: VehicleStatus;
  speedMph: number;
  headingDeg: number;
  position: LatLngPoint;
  corridorName: string;
  nextStopHubId?: string;
  nextStopLabel: string;
  etaMinutes: number | null;
  cargoLoadPct: number;
  rawGpsTrace: LatLngPoint[];
}

export interface LogisticsHub {
  id: string;
  placeId?: string;
  name: string;
  address: string;
  location: LatLngPoint;
  role: 'depot' | 'dropoff';
  source: 'places_api' | 'autocomplete' | 'fleet_yard';
}

export interface SnappedPointItem {
  location: {
    latitude: number;
    longitude: number;
  };
  originalIndex?: number;
  placeId: string;
}

export interface RoadsSnapResult {
  vehicleId: string;
  rawCount: number;
  snappedCount: number;
  uniqueRoadSegments: number;
  meanOffsetMeters: number;
  snappedPath: LatLngPoint[];
  snappedPoints: SnappedPointItem[];
  warningMessage?: string;
  source: 'roads_api' | 'unavailable';
  errorMessage?: string;
}

export interface DispatchLegInfo {
  legIndex: number;
  fromName: string;
  toName: string;
  durationSeconds: number;
  durationText: string;
  distanceMeters: number;
  distanceText: string;
}

export interface DispatchRouteResult {
  encodedPolyline: string;
  totalDurationSeconds: number;
  totalDurationText: string;
  totalDistanceMeters: number;
  totalDistanceText: string;
  optimizedIntermediateWaypointIndex: number[];
  orderedStopIds: string[];
  legs: DispatchLegInfo[];
}

export interface RouteMatrixCell {
  originIndex: number;
  destinationIndex: number;
  hubId: string;
  hubName: string;
  durationSeconds: number;
  durationText: string;
  distanceMeters: number;
  distanceText: string;
  condition: string;
}
