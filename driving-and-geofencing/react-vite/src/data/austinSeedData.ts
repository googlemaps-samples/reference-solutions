import type { GeofenceZone, LatLngPoint, WorkerPreset } from '../types/geofencing';

export const AUSTIN_CENTER: LatLngPoint = {
  lat: 30.2672,
  lng: -97.7431,
};

export const AUSTIN_ZOOM = 12;

export const DEFAULT_SEARCH_QUERY = 'retail stores in Austin, TX';

export const SEEDED_GEOFENCES: GeofenceZone[] = [
  {
    id: 'zone-congress-flagship',
    name: 'Congress Ave Flagship Zone',
    district: 'Downtown District',
    source: 'seeded',
    color: '#0284c7',
    path: [
      { lat: 30.2694, lng: -97.7466 },
      { lat: 30.2694, lng: -97.7402 },
      { lat: 30.2642, lng: -97.7402 },
      { lat: 30.2642, lng: -97.7466 },
    ],
  },
  {
    id: 'zone-soco-retail',
    name: 'South Congress (SoCo) Zone',
    district: 'South Austin',
    source: 'seeded',
    color: '#059669',
    path: [
      { lat: 30.2528, lng: -97.7526 },
      { lat: 30.2528, lng: -97.7462 },
      { lat: 30.2468, lng: -97.7462 },
      { lat: 30.2468, lng: -97.7526 },
    ],
  },
  {
    id: 'zone-east-austin-hub',
    name: 'East Austin Logistics Hub',
    district: 'East Cesar Chavez',
    source: 'seeded',
    color: '#7c3aed',
    path: [
      { lat: 30.2656, lng: -97.7248 },
      { lat: 30.2656, lng: -97.7182 },
      { lat: 30.2596, lng: -97.7182 },
      { lat: 30.2596, lng: -97.7248 },
    ],
  },
];

export const WORKER_PRESETS: WorkerPreset[] = [
  {
    id: 'inside-congress',
    label: 'Inside — Congress Ave Flagship Zone',
    description: 'Downtown Congress Ave & 5th St check-in perimeter',
    expectedState: 'inside',
    position: { lat: 30.2668, lng: -97.7434 },
  },
  {
    id: 'inside-soco',
    label: 'Inside — South Congress (SoCo) Zone',
    description: 'South Congress retail corridor perimeter',
    expectedState: 'inside',
    position: { lat: 30.2498, lng: -97.7494 },
  },
  {
    id: 'inside-east',
    label: 'Inside — East Austin Logistics Hub',
    description: 'East 5th St warehouse staging perimeter',
    expectedState: 'inside',
    position: { lat: 30.2626, lng: -97.7215 },
  },
  {
    id: 'outside-zilker',
    label: 'Outside — Zilker Park South Gate',
    description: 'Outside active geofences (2.8 km west of Downtown)',
    expectedState: 'outside',
    position: { lat: 30.2669, lng: -97.7729 },
  },
  {
    id: 'outside-ut',
    label: 'Outside — UT Austin North Campus',
    description: 'Outside active geofences (north of Downtown)',
    expectedState: 'outside',
    position: { lat: 30.2895, lng: -97.7355 },
  },
];
