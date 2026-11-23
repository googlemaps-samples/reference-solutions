import type { GeofenceZone, LatLngLiteral, WorkerPreset } from '@/types/geofencing';

export const AUSTIN_CENTER: LatLngLiteral = {
  lat: 30.2672,
  lng: -97.7431,
};

export const AUSTIN_DEFAULT_ZOOM = 12;

export const SEED_SEARCH_QUERY = 'retail stores in Austin, TX';

export const PRE_SEEDED_GEOFENCES: GeofenceZone[] = [
  {
    id: 'zone-downtown-congress',
    name: 'Downtown Congress Ave Hub',
    siteCode: 'AUS-101',
    source: 'pre-seeded',
    color: '#0284c7',
    path: [
      { lat: 30.2718, lng: -97.7482 },
      { lat: 30.2718, lng: -97.7388 },
      { lat: 30.2636, lng: -97.7388 },
      { lat: 30.2636, lng: -97.7482 },
    ],
  },
  {
    id: 'zone-south-congress',
    name: 'South Congress (SoCo) Retail Zone',
    siteCode: 'AUS-204',
    source: 'pre-seeded',
    color: '#0d9488',
    path: [
      { lat: 30.2532, lng: -97.7542 },
      { lat: 30.2532, lng: -97.7452 },
      { lat: 30.2446, lng: -97.7452 },
      { lat: 30.2446, lng: -97.7542 },
    ],
  },
  {
    id: 'zone-east-plaza',
    name: 'East 6th & Plaza Saltillo Depot',
    siteCode: 'AUS-309',
    source: 'pre-seeded',
    color: '#2563eb',
    path: [
      { lat: 30.2668, lng: -97.7286 },
      { lat: 30.2668, lng: -97.7194 },
      { lat: 30.2588, lng: -97.7194 },
      { lat: 30.2588, lng: -97.7286 },
    ],
  },
];

export const WORKER_GPS_PRESETS: WorkerPreset[] = [
  {
    id: 'preset-inside-downtown',
    label: 'Inside — Downtown Congress Ave Hub (30.2676, -97.7431)',
    expectedState: 'inside',
    coords: { lat: 30.2676, lng: -97.7431 },
    shiftNote: 'Primary morning audit check-in point',
  },
  {
    id: 'preset-inside-soco',
    label: 'Inside — South Congress Retail Zone (30.2489, -97.7497)',
    expectedState: 'inside',
    coords: { lat: 30.2489, lng: -97.7497 },
    shiftNote: 'Midday SoCo storefront audit zone',
  },
  {
    id: 'preset-inside-east6',
    label: 'Inside — East 6th Plaza Depot (30.2628, -97.7240)',
    expectedState: 'inside',
    coords: { lat: 30.2628, lng: -97.7240 },
    shiftNote: 'Eastside staging & inventory zone',
  },
  {
    id: 'preset-outside-zilker',
    label: 'Outside — Zilker Park West Perimeter (30.2670, -97.7729)',
    expectedState: 'outside',
    coords: { lat: 30.2670, lng: -97.7729 },
    shiftNote: 'Outside active geofences (clock-in locked)',
  },
  {
    id: 'preset-outside-north-lamar',
    label: 'Outside — North Lamar Transit Corridor (30.3048, -97.7375)',
    expectedState: 'outside',
    coords: { lat: 30.3048, lng: -97.7375 },
    shiftNote: 'En route north of active zones (clock-in locked)',
  },
];
