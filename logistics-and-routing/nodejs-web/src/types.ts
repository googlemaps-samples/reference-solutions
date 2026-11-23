export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export interface ComputeRoutesRequestBody {
  origin: LatLngLiteral;
  destination: LatLngLiteral;
  intermediates?: LatLngLiteral[];
  optimizeWaypointOrder?: boolean;
  travelMode?: 'DRIVE' | 'TWO_WHEELER';
  routingPreference?: 'TRAFFIC_AWARE' | 'TRAFFIC_AWARE_OPTIMAL' | 'TRAFFIC_UNAWARE';
}

export interface ComputeMatrixRequestBody {
  origins: LatLngLiteral[];
  destinations: LatLngLiteral[];
  travelMode?: 'DRIVE' | 'TWO_WHEELER';
  routingPreference?: 'TRAFFIC_AWARE' | 'TRAFFIC_AWARE_OPTIMAL' | 'TRAFFIC_UNAWARE';
}

export interface SnapRoadsRequestBody {
  path: LatLngLiteral[];
  interpolate?: boolean;
}

export interface PlacesSearchRequestBody {
  textQuery: string;
  locationBias?: {
    center: LatLngLiteral;
    radiusMeters: number;
  };
  maxResultCount?: number;
}
