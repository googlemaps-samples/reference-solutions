export type VehicleStatus = 'EN_ROUTE' | 'DELAYED' | 'IDLE';

export type StatusFilter = 'ALL' | VehicleStatus;

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface FleetVehicle {
  id: string;
  callsign: string;
  unitType: 'Freight Tractor' | 'Box Truck' | 'Sprinter Shuttle';
  driverName: string;
  status: VehicleStatus;
  speedMph: number;
  corridor: string;
  nextStopLabel: string;
  etaMinutes: number;
  position: LatLngPoint;
  headingDeg: number;
  rawGpsTrace: LatLngPoint[];
}

export interface LogisticsHub {
  id: string;
  name: string;
  address: string;
  location: LatLngPoint;
  selected: boolean;
  source: 'places-text-search' | 'places-autocomplete' | 'depot';
}

export interface SnappedRoadPoint {
  location: LatLngPoint;
  originalIndex?: number;
  placeId: string;
}

export interface RoadSnapSummary {
  vehicleId: string;
  rawPoints: LatLngPoint[];
  snappedPoints: SnappedRoadPoint[];
  snappedPath: LatLngPoint[];
  uniqueRoadSegments: number;
  meanSnapOffsetMeters: number;
  statusMessage: string;
  isLiveApi: boolean;
}

export interface DispatchLegSummary {
  legIndex: number;
  fromLabel: string;
  toLabel: string;
  distanceMeters: number;
  durationMillis: number;
}

export interface DispatchRouteSummary {
  path: LatLngPoint[];
  totalDistanceMeters: number;
  totalDurationMillis: number;
  legs: DispatchLegSummary[];
  optimizedOrderIndices: number[];
  orderedHubIds: string[];
}

export interface HubMatrixRow {
  hubId: string;
  hubName: string;
  distanceMeters: number;
  durationMillis: number;
  condition: string;
}

export interface RuntimeEnvConfig {
  GOOGLE_MAPS_API_KEY?: string;
}

declare global {
  interface Window {
    __ENV__?: RuntimeEnvConfig;
  }
}
