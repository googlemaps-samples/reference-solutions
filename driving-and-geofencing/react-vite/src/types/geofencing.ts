export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface GeofenceZone {
  id: string;
  name: string;
  district: string;
  source: 'seeded' | 'drawn';
  color: string;
  path: LatLngPoint[];
}

export interface WorkerPreset {
  id: string;
  label: string;
  description: string;
  expectedState: 'inside' | 'outside';
  position: LatLngPoint;
}

export interface AuditSite {
  id: string;
  name: string;
  address: string;
  primaryType?: string;
  location: LatLngPoint;
}

export interface RouteLegSummary {
  stopId: string;
  distanceMeters: number;
  durationMillis: number;
}

export interface OptimizedRouteSummary {
  orderedStops: AuditSite[];
  totalDistanceMeters: number;
  totalDurationMillis: number;
  legs: RouteLegSummary[];
}

export type TerraDrawModeName = 'static' | 'polygon' | 'select';

export interface ClockInRecord {
  timestamp: string;
  zoneName: string;
  address: string;
  position: LatLngPoint;
}
