import { GeofenceZone, WorkerPreset } from '../models/workforce.models';

export const AUSTIN_CENTER: google.maps.LatLngLiteral = {
  lat: 30.2672,
  lng: -97.7431,
};

export const INITIAL_MAP_ZOOM = 12;

export const SEED_SEARCH_QUERY = 'retail stores in Austin, TX';

export const PRE_SEEDED_GEOFENCES: GeofenceZone[] = [
  {
    id: 'zone-downtown',
    name: 'Downtown Congress & 2nd St Hub',
    description: 'Primary downtown Austin retail & flagship audit perimeter',
    source: 'pre-seeded',
    color: '#059669',
    vertexCount: 5,
    paths: [
      { lat: 30.2712, lng: -97.7486 },
      { lat: 30.2712, lng: -97.7382 },
      { lat: 30.2642, lng: -97.7382 },
      { lat: 30.2636, lng: -97.7445 },
      { lat: 30.2654, lng: -97.7486 },
    ],
  },
  {
    id: 'zone-soco',
    name: 'South Congress Retail Corridor',
    description: 'SoCo district storefront audit boundary',
    source: 'pre-seeded',
    color: '#2563eb',
    vertexCount: 4,
    paths: [
      { lat: 30.2542, lng: -97.7544 },
      { lat: 30.2542, lng: -97.7448 },
      { lat: 30.2446, lng: -97.7448 },
      { lat: 30.2446, lng: -97.7544 },
    ],
  },
  {
    id: 'zone-domain',
    name: 'North Austin Domain Campus',
    description: 'North Austin mixed-retail inspection perimeter',
    source: 'pre-seeded',
    color: '#7c3aed',
    vertexCount: 4,
    paths: [
      { lat: 30.4068, lng: -97.7305 },
      { lat: 30.4068, lng: -97.7202 },
      { lat: 30.3978, lng: -97.7202 },
      { lat: 30.3978, lng: -97.7305 },
    ],
  },
];

export const WORKER_GPS_PRESETS: WorkerPreset[] = [
  {
    id: 'inside-downtown',
    label: 'Inside: Downtown Congress Hub (30.2672, -97.7431)',
    expectedState: 'inside',
    position: { lat: 30.2672, lng: -97.7431 },
    note: 'Simulated GPS inside Downtown Congress & 2nd St Hub geofence',
  },
  {
    id: 'inside-soco',
    label: 'Inside: South Congress Corridor (30.2492, -97.7495)',
    expectedState: 'inside',
    position: { lat: 30.2492, lng: -97.7495 },
    note: 'Simulated GPS inside South Congress Retail Corridor geofence',
  },
  {
    id: 'inside-domain',
    label: 'Inside: Domain Northside Campus (30.4021, -97.7253)',
    expectedState: 'inside',
    position: { lat: 30.4021, lng: -97.7253 },
    note: 'Simulated GPS inside North Austin Domain Campus geofence',
  },
  {
    id: 'outside-zilker',
    label: 'Outside: Zilker Park Staging Lot (30.2669, -97.7729)',
    expectedState: 'outside',
    position: { lat: 30.2669, lng: -97.7729 },
    note: 'Simulated GPS outside pre-seeded geofences (test drawing a zone here!)',
  },
  {
    id: 'outside-east',
    label: 'Outside: East Cesar Chavez Transit (30.2562, -97.7215)',
    expectedState: 'outside',
    position: { lat: 30.2562, lng: -97.7215 },
    note: 'Simulated GPS outside all pre-seeded client geofences',
  },
];
