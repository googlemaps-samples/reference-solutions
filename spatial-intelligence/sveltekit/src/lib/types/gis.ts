export type BasemapType = 'roadmap' | 'satellite' | 'hybrid' | 'terrain';

export type DeckLayerMode = 'scatterplot' | 'hexagon';

export type AnalyticsScope = 'citywide' | 'district' | 'custom';

export interface DistrictProperties {
  id: string;
  name: string;
  borough: string;
  capacityUtilization: number;
  capacityMW: number;
  substationCount: number;
  status: 'Critical Load' | 'High Load' | 'Elevated' | 'Optimal' | 'Nominal';
  centroid: { lat: number; lng: number };
}

export interface DistrictFeature {
  type: 'Feature';
  id: string;
  properties: DistrictProperties;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export interface DistrictGeoJsonCollection {
  type: 'FeatureCollection';
  features: DistrictFeature[];
}

export type SensorCategory =
  | 'Substation Telemetry'
  | 'Transit Signal'
  | 'Grid Inverter'
  | 'Water Main Pressure';

export interface SensorPoint {
  id: string;
  districtId: string;
  category: SensorCategory;
  lng: number;
  lat: number;
  loadPct: number;
  outputMW: number;
  health: 'nominal' | 'elevated' | 'critical';
}

export interface ZoneAnalyticsSummary {
  scope: AnalyticsScope;
  scopeLabel: string;
  sensorCount: number;
  avgCapacityLoadPct: number;
  peakCapacityLoadPct: number;
  totalOutputMW: number;
  areaKm2: number;
}

export interface ElevationSamplePoint {
  elevation: number;
  location: { lat: number; lng: number };
  resolution: number;
}

export interface ElevationSummary {
  minElevation: number;
  meanElevation: number;
  maxElevation: number;
  meanResolution: number;
  sampleCount: number;
}

export interface ElevationApiResponse {
  ok: boolean;
  status: string;
  results: ElevationSamplePoint[];
  summary: ElevationSummary | null;
  error?: string;
}

export interface CivicPlaceAnchor {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: { latitude: number; longitude: number };
  types: string[];
}

export interface PlacesSearchApiResponse {
  ok: boolean;
  status: string;
  places: CivicPlaceAnchor[];
  error?: string;
}
