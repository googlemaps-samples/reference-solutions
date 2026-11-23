import type { GeofenceZone, LatLngPoint, WorkerPreset } from '../types/workforce';

export const AUSTIN_CENTER: LatLngPoint = {
  lat: 30.2672,
  lng: -97.7431,
};

export const INITIAL_ZOOM = 12;

export const SEED_SEARCH_QUERY = 'retail stores in Austin, TX';

export const PRESEEDED_GEOFENCES: GeofenceZone[] = [
  {
    id: 'zone-downtown-congress',
    name: 'Downtown Congress Hub',
    district: 'Central Austin',
    source: 'preseeded',
    color: '#2563eb',
    coordinates: [
      { lat: 30.2712, lng: -97.7468 },
      { lat: 30.2712, lng: -97.7392 },
      { lat: 30.2648, lng: -97.7392 },
      { lat: 30.2648, lng: -97.7468 },
    ],
  },
  {
    id: 'zone-soco-retail',
    name: 'South Congress (SoCo) Corridor',
    district: 'South Austin',
    source: 'preseeded',
    color: '#0d9488',
    coordinates: [
      { lat: 30.2548, lng: -97.7528 },
      { lat: 30.2548, lng: -97.7455 },
      { lat: 30.2475, lng: -97.7455 },
      { lat: 30.2475, lng: -97.7528 },
    ],
  },
  {
    id: 'zone-east-cesar',
    name: 'East Cesar Chavez Zone',
    district: 'East Austin',
    source: 'preseeded',
    color: '#7c3aed',
    coordinates: [
      { lat: 30.2630, lng: -97.7298 },
      { lat: 30.2630, lng: -97.7215 },
      { lat: 30.2565, lng: -97.7215 },
      { lat: 30.2565, lng: -97.7298 },
    ],
  },
];

export const WORKER_PRESETS: WorkerPreset[] = [
  {
    id: 'inside-downtown',
    label: 'Inside Zone: Downtown Congress Ave (30.2682, -97.7431)',
    expectedState: 'inside',
    coordinates: { lat: 30.2682, lng: -97.7431 },
    description: 'Worker positioned inside Downtown Congress Hub polygon.',
  },
  {
    id: 'inside-soco',
    label: 'Inside Zone: South Congress Ave (30.2512, -97.7492)',
    expectedState: 'inside',
    coordinates: { lat: 30.2512, lng: -97.7492 },
    description: 'Worker positioned inside South Congress (SoCo) Corridor polygon.',
  },
  {
    id: 'inside-east',
    label: 'Inside Zone: East Cesar Chavez (30.2598, -97.7258)',
    expectedState: 'inside',
    coordinates: { lat: 30.2598, lng: -97.7258 },
    description: 'Worker positioned inside East Cesar Chavez Zone polygon.',
  },
  {
    id: 'outside-zilker',
    label: 'Outside Geofence: Zilker Park West (30.2669, -97.7729)',
    expectedState: 'outside',
    coordinates: { lat: 30.2669, lng: -97.7729 },
    description: 'Worker outside all pre-seeded client site geofences.',
  },
  {
    id: 'outside-campus',
    label: 'Outside Geofence: North Campus (30.2895, -97.7355)',
    expectedState: 'outside',
    coordinates: { lat: 30.2895, lng: -97.7355 },
    description: 'Worker outside all pre-seeded client site geofences.',
  },
];
