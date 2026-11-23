export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface GeofenceZone {
  id: string;
  name: string;
  district: string;
  source: 'preseeded' | 'drawn';
  coordinates: LatLngPoint[];
  color: string;
}

export interface WorkerPreset {
  id: string;
  label: string;
  expectedState: 'inside' | 'outside';
  coordinates: LatLngPoint;
  description: string;
}

export interface AuditStop {
  id: string;
  displayName: string;
  formattedAddress: string;
  primaryType?: string;
  location: LatLngPoint;
  legDistanceMeters?: number;
  legDurationMillis?: number;
}

export interface RouteSummary {
  totalDistanceMeters: number;
  totalDurationMillis: number;
  stopCount: number;
  optimizedIndices: number[];
}

export type DrawMode = 'polygon' | 'select' | 'static';

export interface ClockInRecord {
  timestamp: string;
  zoneName: string;
  address: string;
}
