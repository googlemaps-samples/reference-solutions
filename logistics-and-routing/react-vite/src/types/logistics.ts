export type VehicleStatus = 'en-route' | 'delayed' | 'idle';

export type StatusFilter = 'all' | VehicleStatus;

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface FleetVehicle {
  id: string;
  label: string;
  unitType: string;
  driver: string;
  corridor: string;
  status: VehicleStatus;
  speedMph: number;
  position: LatLngPoint;
  nextStop: string;
  etaText: string;
  rawBreadcrumbs: LatLngPoint[];
}

export interface LogisticsHub {
  id: string;
  name: string;
  address: string;
  position: LatLngPoint;
  isDepot?: boolean;
  source: 'places-search' | 'places-autocomplete';
}

export interface SnappedPointInfo {
  location: LatLngPoint;
  originalIndex?: number;
  placeId: string;
}

export interface RoadSnapResult {
  vehicleId: string;
  source: 'roads-api' | 'routes-fallback' | 'unavailable';
  rawPoints: LatLngPoint[];
  snappedPath: LatLngPoint[];
  snappedPoints: SnappedPointInfo[];
  uniqueRoadSegments: number;
  meanOffsetMeters: number;
  warningMessage: string | null;
}

export interface DispatchLegSummary {
  legIndex: number;
  fromLabel: string;
  toLabel: string;
  durationText: string;
  durationSeconds: number;
  distanceText: string;
  distanceMeters: number;
}

export interface MatrixStopEntry {
  hubId: string;
  hubName: string;
  address: string;
  durationText: string;
  durationSeconds: number | null;
  distanceText: string;
  distanceMeters: number | null;
  condition: string;
}

export interface DispatchRouteResult {
  path: LatLngPoint[];
  totalDurationText: string;
  totalDistanceText: string;
  optimizedOrderIndices: number[];
  orderedStopIds: string[];
  legs: DispatchLegSummary[];
  matrixEntries: MatrixStopEntry[];
}
