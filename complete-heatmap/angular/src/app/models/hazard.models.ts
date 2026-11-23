export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export type HazardType =
  | 'Flash Flooding'
  | 'Storm Surge'
  | 'Downed Power Line'
  | 'Roadway Obstruction'
  | 'King Tide Overflow';

export interface HazardIncident {
  id: string;
  lat: number;
  lng: number;
  weight: number;
  type: HazardType;
  address: string;
  elevationMeters: number | null;
  windSummary: string;
  precipitationSummary: string;
  reportedAt: string;
  notes?: string;
  isUserSubmitted?: boolean;
}

export interface FloodZonePolygon {
  id: string;
  name: string;
  severity: 'HIGH' | 'MODERATE';
  advisory: string;
  strokeColor: string;
  fillColor: string;
  paths: LatLngLiteral[];
}

export interface EmergencyShelter {
  id: string;
  name: string;
  address: string;
  location: LatLngLiteral;
  types: string[];
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  distanceMeters?: number;
}

export interface WeatherSnapshot {
  conditionText: string;
  temperatureC: number | null;
  windSpeedKmh: number | null;
  windGustKmh: number | null;
  windDirection: string;
  precipProbability: number | null;
  precipQpfMm: number | null;
  humidity: number | null;
  error?: string;
}

export interface IncidentDraft {
  location: LatLngLiteral;
  address: string;
  elevationMeters: number | null;
  weather: WeatherSnapshot | null;
  isLoadingEnrichment: boolean;
}

export interface RouteStepSummary {
  instruction: string;
  distanceText: string;
}

export interface EvacuationRouteSummary {
  origin: LatLngLiteral;
  originLabel: string;
  destination: EmergencyShelter;
  durationText: string;
  distanceText: string;
  distanceMeters: number;
  durationSeconds: number;
  path: LatLngLiteral[];
  avoidsFloodZones: boolean;
  bypassedZoneNames: string[];
  crossesFloodZone: boolean;
  steps: RouteStepSummary[];
}
