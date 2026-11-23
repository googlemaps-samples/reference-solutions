export type BasemapType = 'roadmap' | 'satellite' | 'hybrid' | 'terrain';

export type DeckGlLayerMode = 'scatterplot' | 'hexagon';

export type TerraDrawToolMode = 'static' | 'polygon' | 'select';

export type SensorSector = 'power' | 'transit' | 'telecom' | 'water';

export type DistrictCapacityTier = 'optimal' | 'elevated' | 'critical';

export interface DistrictProperties {
  districtId: string;
  name: string;
  borough: string;
  capacityPct: number;
  capacityMw: number;
  substationCount: number;
  tier: DistrictCapacityTier;
  description: string;
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

export interface DistrictGeoJsonCollection {
  type: 'FeatureCollection';
  features: DistrictFeature[];
}

export interface SensorPoint {
  id: string;
  lng: number;
  lat: number;
  capacityLoad: number;
  sector: SensorSector;
  districtId: string;
  status: 'nominal' | 'warning' | 'critical';
}

export interface ZoneAnalyticsSummary {
  scopeLabel: string;
  scopeType: 'citywide' | 'district' | 'terradraw';
  sensorCount: number;
  totalSensors: number;
  avgCapacityLoad: number;
  peakCapacityLoad: number;
  criticalCount: number;
  areaKm2: number;
  sectorBreakdown: Record<SensorSector, number>;
}

export interface ElevationSamplePoint {
  lat: number;
  lng: number;
  elevation: number;
  resolution: number;
}

export interface ElevationSummary {
  status: 'idle' | 'loading' | 'ready' | 'unavailable' | 'error';
  sourceLabel: string;
  minMeters: number | null;
  meanMeters: number | null;
  maxMeters: number | null;
  resolutionMeters: number | null;
  samples: ElevationSamplePoint[];
  errorMessage?: string;
}

export interface CivicHubPlace {
  id: string;
  displayName: string;
  formattedAddress: string;
  location: { lat: number; lng: number };
  types: string[];
}
