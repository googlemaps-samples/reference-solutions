export type HazardType =
  | 'Street Flooding'
  | 'Storm Surge'
  | 'Storm Drain Overflow'
  | 'Downed Power Line'
  | 'Road Obstruction';

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface IncidentPoint {
  id: string;
  lat: number;
  lng: number;
  weight: number;
  hazardType: HazardType;
  address?: string;
  elevationMeters?: number | null;
  reportedAt: string;
  isUserSubmitted?: boolean;
}

export interface FloodZone {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'moderate';
  estimatedDepthCm: number;
  advisory: string;
  fillColor: string;
  strokeColor: string;
  paths: LatLngPoint[];
}

export interface WeatherSummary {
  conditionText: string;
  conditionType: string;
  temperatureC: number | null;
  windSpeedKmh: number | null;
  windGustKmh: number | null;
  windCardinal: string | null;
  precipProbabilityPct: number | null;
  precipQpfMm: number | null;
  thunderstormPct: number | null;
  relativeHumidity: number | null;
  status: 'live' | 'unavailable';
  note?: string;
}

export interface IncidentDraft {
  lat: number;
  lng: number;
  address: string;
  elevationMeters: number | null;
  elevationResolutionMeters: number | null;
  weather: WeatherSummary | null;
  loading: boolean;
  error: string | null;
}

export interface ShelterPlace {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: LatLngPoint;
  types: string[];
  rating: number | null;
  userRatingCount: number | null;
  businessStatus: string | null;
  distanceKm?: number;
}

export interface EvacuationRouteSummary {
  shelterName: string;
  shelterAddress: string;
  distanceText: string;
  durationText: string;
  distanceMeters: number;
  durationSeconds: number;
  avoidedFloodZones: boolean;
  detourApplied: boolean;
  intersectedZones: string[];
  stepCount: number;
  statusMessage: string;
}
