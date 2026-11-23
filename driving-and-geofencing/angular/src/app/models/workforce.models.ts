export type DrawMode = 'static' | 'polygon' | 'select';

export interface GeofenceZone {
  id: string;
  name: string;
  description: string;
  source: 'pre-seeded' | 'drawn';
  paths: google.maps.LatLngLiteral[];
  color: string;
  vertexCount: number;
}

export interface WorkerPreset {
  id: string;
  label: string;
  expectedState: 'inside' | 'outside';
  position: google.maps.LatLngLiteral;
  note: string;
}

export interface AuditSite {
  id: string;
  name: string;
  formattedAddress: string;
  primaryType: string;
  location: google.maps.LatLngLiteral;
  orderIndex: number;
  legDistanceMeters?: number;
  legDurationMillis?: number;
  pinContent?: google.maps.marker.PinElement;
}

export interface OptimizedRouteResult {
  orderedStops: AuditSite[];
  polylinePath: google.maps.LatLngLiteral[];
  totalDistanceMeters: number;
  totalDurationMillis: number;
  viewport?: google.maps.LatLngBounds | null;
}

export interface AttendanceLogEntry {
  id: string;
  timestamp: string;
  presetLabel: string;
  zoneName: string;
  address: string;
  coordinates: google.maps.LatLngLiteral;
}
