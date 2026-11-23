export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export interface GeofenceZone {
  id: string;
  name: string;
  siteCode: string;
  source: 'pre-seeded' | 'supervisor-drawn';
  color: string;
  path: LatLngLiteral[];
}

export interface WorkerPreset {
  id: string;
  label: string;
  expectedState: 'inside' | 'outside';
  coords: LatLngLiteral;
  shiftNote: string;
}

export interface AuditSite {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: LatLngLiteral;
  primaryType: string;
  source: 'places-search' | 'places-autocomplete';
}

export interface RouteLegSummary {
  distanceMeters: number;
  durationSeconds: number;
}

export interface OptimizedRouteResult {
  orderedStops: AuditSite[];
  optimizedIndices: number[];
  encodedPolyline: string;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  legs: RouteLegSummary[];
}

export interface ClockInLogEntry {
  id: string;
  timestamp: string;
  zoneName: string;
  address: string;
  coords: LatLngLiteral;
}

export type DrawMode = 'static' | 'polygon' | 'select';
