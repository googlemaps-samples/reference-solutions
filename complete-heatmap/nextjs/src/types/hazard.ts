export type HazardType =
  | 'Flash Flooding'
  | 'Storm Surge'
  | 'Road Submersion'
  | 'Downed Power Line'
  | 'Wind Debris';

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface HazardIncident {
  id: string;
  lat: number;
  lng: number;
  weight: number;
  type: HazardType;
  reportedAt: string;
  address?: string;
  elevationMeters?: number | null;
  notes?: string;
  isUserReported?: boolean;
}

export interface FloodHazardZone {
  id: string;
  name: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE';
  surgeEstimateMeters: number;
  description: string;
  fillColor: string;
  strokeColor: string;
  ring: LatLngPoint[];
  bypassWaypoints: LatLngPoint[];
}

export interface WeatherTelemetry {
  conditionText: string;
  conditionType: string;
  iconBaseUri?: string;
  temperatureC: number | null;
  windSpeedKmh: number | null;
  windGustKmh: number | null;
  windCardinal: string | null;
  precipitationPercent: number | null;
  precipitationQpfMm: number | null;
  thunderstormProbability: number | null;
  relativeHumidity: number | null;
  observedAt?: string;
}

export interface EnrichedLocationData {
  point: LatLngPoint;
  address: string;
  placeId?: string;
  elevationMeters: number | null;
  elevationResolutionMeters?: number | null;
  weather: WeatherTelemetry | null;
  insideFloodZone: FloodHazardZone | null;
  loading: boolean;
  warnings: string[];
}

export interface ShelterPlace {
  id: string;
  name: string;
  address: string;
  location: LatLngPoint;
  types: string[];
  category: 'Hospital' | 'Community Center' | 'Emergency Shelter';
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
}

export interface RouteStepSummary {
  instruction: string;
  distanceMeters: number;
  maneuver?: string;
}

export interface EvacuationRouteResult {
  shelter: ShelterPlace;
  origin: LatLngPoint;
  encodedPolyline: string;
  decodedPath: LatLngPoint[];
  durationSeconds: number;
  durationText: string;
  distanceMeters: number;
  distanceText: string;
  avoidFloodEnabled: boolean;
  bypassedFloodZones: string[];
  usedViaWaypoint: LatLngPoint | null;
  intersectsFloodZone: boolean;
  verificationStatus:
    | 'VERIFIED_FLOOD_BYPASS'
    | 'CLEAR_DIRECT_ROUTE'
    | 'PARTIAL_ZONE_PROXIMITY'
    | 'DIRECT_UNFILTERED';
  steps: RouteStepSummary[];
}
