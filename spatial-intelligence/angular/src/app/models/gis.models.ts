export type BasemapType = 'roadmap' | 'satellite' | 'hybrid' | 'terrain';

export type DeckGlLayerMode = 'scatterplot' | 'hexagon';

export type ZoneScope = 'citywide' | 'district' | 'custom';

export type TerraDrawToolMode = 'static' | 'polygon' | 'select';

export interface DistrictFeatureProperties {
  id: string;
  code: string;
  name: string;
  borough: string;
  capacityPct: number;
  capacityMw: number;
}

export interface DistrictGeoJsonFeature {
  type: 'Feature';
  id: string;
  properties: DistrictFeatureProperties;
  geometry: {
    type: 'Polygon';
    coordinates: [number, number][][];
  };
}

export interface DistrictGeoJsonCollection {
  type: 'FeatureCollection';
  features: DistrictGeoJsonFeature[];
}

export interface DistrictSummary extends DistrictFeatureProperties {
  ring: [number, number][];
  centroid: google.maps.LatLngLiteral;
  areaKm2: number;
  sensorCount: number;
  avgLoadPct: number;
  peakLoadPct: number;
}

export interface SensorPoint {
  id: string;
  position: [number, number];
  lat: number;
  lng: number;
  loadPct: number;
  capacityKw: number;
  districtId: string;
  status: 'nominal' | 'elevated' | 'critical';
}

export interface ZoneAnalyticsSummary {
  scope: ZoneScope;
  scopeLabel: string;
  sensorCount: number;
  avgLoadPct: number;
  peakLoadPct: number;
  totalCapacityMw: number;
  areaKm2: number;
  activeRing: [number, number][] | null;
}

export interface ElevationSamplePoint {
  lat: number;
  lng: number;
  elevation: number;
  resolution: number;
}

export interface ElevationProfileSummary {
  minM: number;
  meanM: number;
  maxM: number;
  resolutionM: number;
  sampleCount: number;
  sourceLabel: string;
  samples: ElevationSamplePoint[];
}

export interface CivicHubPlace {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: google.maps.LatLngLiteral;
  types: string[];
}
