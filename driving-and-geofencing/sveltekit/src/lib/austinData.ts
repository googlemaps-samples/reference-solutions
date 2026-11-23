import type { GeofenceZone, LatLngPoint, WorkerPreset } from './types';

export const AUSTIN_CENTER: LatLngPoint = {
	lat: 30.2672,
	lng: -97.7431
};

export const AUSTIN_INITIAL_ZOOM = 12;

export const SEED_SEARCH_QUERY = 'retail stores in Austin, TX';

/**
 * Three pre-seeded Austin client site geofence zones visible within the initial
 * zoom-12 viewport centered on Downtown Austin (30.2672, -97.7431).
 */
export const PRESEEDED_GEOFENCES: GeofenceZone[] = [
	{
		id: 'zone-downtown-congress',
		name: 'Downtown Congress Corridor',
		source: 'pre-seeded',
		color: '#0d9488',
		paths: [
			{ lat: 30.2735, lng: -97.7495 },
			{ lat: 30.2735, lng: -97.7365 },
			{ lat: 30.261, lng: -97.7365 },
			{ lat: 30.261, lng: -97.7495 }
		]
	},
	{
		id: 'zone-mueller-retail',
		name: 'Mueller Retail District',
		source: 'pre-seeded',
		color: '#2563eb',
		paths: [
			{ lat: 30.3045, lng: -97.713 },
			{ lat: 30.3045, lng: -97.698 },
			{ lat: 30.2915, lng: -97.698 },
			{ lat: 30.2915, lng: -97.713 }
		]
	},
	{
		id: 'zone-south-lamar',
		name: 'South Lamar Commercial Zone',
		source: 'pre-seeded',
		color: '#7c3aed',
		paths: [
			{ lat: 30.252, lng: -97.7785 },
			{ lat: 30.252, lng: -97.7635 },
			{ lat: 30.239, lng: -97.7635 },
			{ lat: 30.239, lng: -97.7785 }
		]
	}
];

/**
 * Simulated worker GPS coordinates with presets inside and outside active geofences.
 */
export const WORKER_PRESETS: WorkerPreset[] = [
	{
		id: 'inside-downtown',
		label: 'Downtown Congress (Inside Zone)',
		expectedZone: 'Downtown Congress Corridor',
		position: { lat: 30.2672, lng: -97.7431 }
	},
	{
		id: 'outside-east',
		label: 'East Cesar Chavez (Outside Zones)',
		expectedZone: null,
		position: { lat: 30.258, lng: -97.718 }
	},
	{
		id: 'inside-mueller',
		label: 'Mueller Retail District (Inside Zone)',
		expectedZone: 'Mueller Retail District',
		position: { lat: 30.298, lng: -97.7055 }
	},
	{
		id: 'inside-south-lamar',
		label: 'South Lamar Zone (Inside Zone)',
		expectedZone: 'South Lamar Commercial Zone',
		position: { lat: 30.2455, lng: -97.771 }
	},
	{
		id: 'outside-west',
		label: 'Zilker Perimeter (Outside Zones)',
		expectedZone: null,
		position: { lat: 30.2669, lng: -97.7729 }
	}
];
