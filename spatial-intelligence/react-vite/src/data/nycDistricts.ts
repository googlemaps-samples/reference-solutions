import type { DistrictGeoJsonCollection, DistrictCapacityTier } from '../types/gis';

export function getDistrictFillColor(capacityPct: number): string {
  if (capacityPct >= 82) return '#ef4444';
  if (capacityPct >= 66) return '#f59e0b';
  return '#10b981';
}

export function getDistrictTier(capacityPct: number): DistrictCapacityTier {
  if (capacityPct >= 82) return 'critical';
  if (capacityPct >= 66) return 'elevated';
  return 'optimal';
}

export const NYC_DISTRICTS_GEOJSON: DistrictGeoJsonCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'dist-lower-manhattan',
      properties: {
        districtId: 'dist-lower-manhattan',
        name: 'Lower Manhattan Financial Grid',
        borough: 'Manhattan',
        capacityPct: 89,
        capacityMw: 1420,
        substationCount: 14,
        tier: 'critical',
        description: 'High-density underground substation corridor serving FiDi, Civic Center, and Battery Park.'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-74.0185, 40.7012],
            [-74.0002, 40.7038],
            [-73.9765, 40.7115],
            [-73.9788, 40.7225],
            [-74.0112, 40.7235],
            [-74.0185, 40.7012]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'dist-midtown-core',
      properties: {
        districtId: 'dist-midtown-core',
        name: 'Midtown Core Corridor',
        borough: 'Manhattan',
        capacityPct: 92,
        capacityMw: 2180,
        substationCount: 19,
        tier: 'critical',
        description: 'Peak commercial and transit demand hub encompassing Penn Station, Times Square, and Grand Central.'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-74.0055, 40.7355],
            [-73.9718, 40.7318],
            [-73.9612, 40.7582],
            [-73.9942, 40.7685],
            [-74.0055, 40.7355]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'dist-upper-manhattan',
      properties: {
        districtId: 'dist-upper-manhattan',
        name: 'Upper West & Central Park Grid',
        borough: 'Manhattan',
        capacityPct: 61,
        capacityMw: 940,
        substationCount: 11,
        tier: 'optimal',
        description: 'Mixed residential and institutional feeder zone spanning Lincoln Square, UWS, and Harlem south.'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-73.9922, 40.7698],
            [-73.9535, 40.7625],
            [-73.9415, 40.7995],
            [-73.9752, 40.8075],
            [-73.9922, 40.7698]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'dist-downtown-brooklyn',
      properties: {
        districtId: 'dist-downtown-brooklyn',
        name: 'Downtown Brooklyn & DUMBO',
        borough: 'Brooklyn',
        capacityPct: 78,
        capacityMw: 1150,
        substationCount: 12,
        tier: 'elevated',
        description: 'Rapid-growth civic, rail, and commercial microgrid hub linking Brooklyn Bridge and Atlantic Terminal.'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-74.0028, 40.6815],
            [-73.9685, 40.6805],
            [-73.9668, 40.7032],
            [-73.9958, 40.7048],
            [-74.0028, 40.6815]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'dist-williamsburg',
      properties: {
        districtId: 'dist-williamsburg',
        name: 'Williamsburg–Greenpoint Tech Zone',
        borough: 'Brooklyn',
        capacityPct: 72,
        capacityMw: 860,
        substationCount: 9,
        tier: 'elevated',
        description: 'Waterfront distribution network serving Greenpoint, Williamsburg, and East River ferry corridors.'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-73.9685, 40.7042],
            [-73.9345, 40.7048],
            [-73.9372, 40.7355],
            [-73.9628, 40.7368],
            [-73.9685, 40.7042]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'dist-lic-hub',
      properties: {
        districtId: 'dist-lic-hub',
        name: 'Long Island City Hub',
        borough: 'Queens',
        capacityPct: 84,
        capacityMw: 1290,
        substationCount: 13,
        tier: 'critical',
        description: 'Interborough transit and industrial power node anchored at Queensboro Plaza and Sunnyside Yards.'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-73.9612, 40.7385],
            [-73.9182, 40.7378],
            [-73.9165, 40.7618],
            [-73.9565, 40.7628],
            [-73.9612, 40.7385]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'dist-astoria-energy',
      properties: {
        districtId: 'dist-astoria-energy',
        name: 'Astoria Energy Corridor',
        borough: 'Queens',
        capacityPct: 54,
        capacityMw: 1680,
        substationCount: 16,
        tier: 'optimal',
        description: 'High-headroom generation and transmission corridor along Upper East River and Steinway.'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-73.9385, 40.7635],
            [-73.8935, 40.7632],
            [-73.8902, 40.7885],
            [-73.9312, 40.7892],
            [-73.9385, 40.7635]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      id: 'dist-south-bronx',
      properties: {
        districtId: 'dist-south-bronx',
        name: 'South Bronx Logistics District',
        borough: 'Bronx',
        capacityPct: 68,
        capacityMw: 910,
        substationCount: 10,
        tier: 'elevated',
        description: 'Freight rail, cold-storage, and Port Morris distribution corridor with active solar/storage telemetry.'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-73.9342, 40.7985],
            [-73.8842, 40.7995],
            [-73.8815, 40.8258],
            [-73.9292, 40.8265],
            [-73.9342, 40.7985]
          ]
        ]
      }
    }
  ]
};
