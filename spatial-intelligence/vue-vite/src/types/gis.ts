export type BasemapId = 'roadmap' | 'satellite' | 'hybrid' | 'terrain';

export type DeckMode = 'scatterplot' | 'hexagon';

export type DrawMode = 'static' | 'polygon' | 'select';

export type ZoneScope = 'Citywide' | 'Selected District' | 'Custom Terra Draw Zone';

export type SensorCategory =
  | 'Grid Node'
  | 'Transit Telemetry'
  | 'Thermal Conduit'
  | 'Stormwater Sensor';

export interface DistrictProperties {
  id: string;
  name: string;
  borough: string;
  capacityPct: number;
  capacityMw: number;
  substationCount: number;
  status: 'Nominal' | 'Elevated' | 'High Load';
}

export interface DistrictFeature {
  type: 'Feature';
  id: string;
  properties: DistrictProperties;
  geometry: {
    type: 'Polygon';
    coordinates: [number, number][][];
  };
}

export interface DistrictGeoJson {
  type: 'FeatureCollection';
  features: DistrictFeature[];
}

export interface SensorPoint {
  id: string;
  lng: number;
  lat: number;
  loadPct: number;
  outputKw: number;
  category: SensorCategory;
  districtId: string;
}

export interface ZoneAnalytics {
  scope: ZoneScope;
  label: string;
  sensorCount: number;
  avgLoadPct: number;
  peakLoadPct: number;
  areaKm2: number;
}

export interface ElevationSamplePoint {
  lat: number;
  lng: number;
  elevation: number;
  resolution: number;
}

export interface ElevationStats {
  loading: boolean;
  minMeters: number | null;
  meanMeters: number | null;
  maxMeters: number | null;
  resolutionMeters: number | null;
  sampleCount: number;
  sourceLabel: string;
  error: string | null;
  samples: ElevationSamplePoint[];
}

export interface CivicHub {
  id: string;
  displayName: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  primaryType: string;
}

export interface HoveredSensorInfo {
  x: number;
  y: number;
  sensor: SensorPoint;
}
