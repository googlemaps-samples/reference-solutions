export interface LatLngPoint {
  lat: number;
  lng: number;
}

export type HazardType =
  | 'Street Flooding'
  | 'Storm Surge'
  | 'Blocked Evacuation Route'
  | 'Downed Power Line'
  | 'Coastal Tide Overflow';

export interface HazardIncident {
  id: string;
  lat: number;
  lng: number;
  weight: number;
  type: HazardType;
  address: string;
  elevationMeters?: number | null;
  weatherSummary?: string;
  note?: string;
  reportedAt: string;
  isUserReported?: boolean;
}

export interface FloodZone {
  id: string;
  name: string;
  severity: 'HIGH' | 'CRITICAL';
  surgeLevelMeters: number;
  description: string;
  paths: LatLngPoint[];
}

export interface WeatherSnapshot {
  conditionText: string;
  conditionType: string;
  temperatureC: number | null;
  windSpeedKmh: number | null;
  windGustKmh: number | null;
  windCardinal: string;
  precipPercent: number | null;
  precipQpfMm: number | null;
  thunderstormProbability: number | null;
  iconBaseUri?: string;
  unavailableReason?: string;
}

export interface IncidentDraft {
  location: LatLngPoint;
  address: string;
  elevationMeters: number | null;
  weather: WeatherSnapshot | null;
  insideFloodZoneName: string | null;
  loading: boolean;
  error?: string;
}

export interface ShelterPlace {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: LatLngPoint;
  types: string[];
  rating?: number | null;
  userRatingCount?: number | null;
  businessStatus?: string | null;
  hoursSummary?: string | null;
  insideFloodZone: boolean;
  straightLineMeters: number;
}

export interface RouteStepSummary {
  instruction: string;
  distance: string;
  duration: string;
}

export interface EvacuationRouteState {
  origin: LatLngPoint;
  destination: ShelterPlace;
  path: LatLngPoint[];
  distanceMeters: number;
  durationMillis: number;
  distanceText: string;
  durationText: string;
  avoidFloodEnabled: boolean;
  bypassedFloodZone: boolean;
  intersectsFloodZone: boolean;
  bypassWaypoints: LatLngPoint[];
  steps: RouteStepSummary[];
}
