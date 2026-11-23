export type TravelModeId = 'DRIVING' | 'BICYCLING' | 'WALKING' | 'TRANSIT';

export interface ResolvedPlace {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: google.maps.LatLngLiteral;
}

export interface RouteModifiersState {
  avoidTolls: boolean;
  avoidHighways: boolean;
  ecoFriendly: boolean;
}

export interface ComputedRouteOption {
  index: number;
  mode: TravelModeId;
  color: string;
  label: string;
  isEcoFriendly: boolean;
  isRecommended: boolean;
  description: string;
  distanceMeters: number;
  distanceText: string;
  durationMillis: number;
  durationText: string;
  path: google.maps.LatLngLiteral[];
  hasTolls: boolean;
  tollEstimateText: string | null;
  fuelLitersText: string | null;
  transitFareText: string | null;
  warnings: string[];
  routeLabels: string[];
}

export interface ModeQuickSummary {
  mode: TravelModeId;
  label: string;
  durationText: string;
  distanceText: string;
  routeCount: number;
  loading: boolean;
  unavailable: boolean;
}

export interface ElevationSamplePoint {
  index: number;
  lat: number;
  lng: number;
  elevationM: number;
  elevationFt: number;
  distanceKm: number;
  distanceMi: number;
  gradePct: number;
}

export interface ElevationProfileSummary {
  samples: ElevationSamplePoint[];
  totalGainM: number;
  totalGainFt: number;
  totalLossM: number;
  minElevationM: number;
  maxElevationM: number;
  maxGradePct: number;
  totalDistanceKm: number;
}

export const DENVER_BOULDER_CENTER: google.maps.LatLngLiteral = {
  lat: 39.884,
  lng: -105.135,
};

export const DENVER_BOULDER_BOUNDS: google.maps.LatLngBoundsLiteral = {
  south: 39.58,
  west: -105.42,
  north: 40.14,
  east: -104.78,
};

export const SEED_ORIGIN_QUERY = 'Denver Union Station, Denver, CO';
export const SEED_DESTINATION_QUERY = 'Chautauqua Park, Boulder, CO';

export const ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';

export const ROUTE_PALETTE = ['#059669', '#2563eb', '#d97706', '#7c3aed'] as const;
