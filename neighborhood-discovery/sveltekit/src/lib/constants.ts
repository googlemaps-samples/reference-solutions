import type { CoreCategory, NeighborhoodPreset, PlaceCategory } from './types';

export const INITIAL_CENTER = { lat: 51.5118, lng: -0.128 } as const;
export const INITIAL_ZOOM = 13;
export const SEARCH_RADIUS_METERS = 5000;
export const MAX_COMPARE_PLACES = 3;
export const MAP_ID = 'DEMO_MAP_ID';
export const USAGE_ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';

export const NEIGHBORHOOD_PRESETS: NeighborhoodPreset[] = [
	{
		id: 'covent-garden',
		label: 'Covent Garden / West End',
		center: { lat: 51.5118, lng: -0.128 },
		description: 'Theatreland, piazzas, dining & historic cultural landmarks'
	},
	{
		id: 'soho',
		label: 'Soho',
		center: { lat: 51.5136, lng: -0.1365 },
		description: 'Independent coffee shops, late-night dining & creative streets'
	},
	{
		id: 'south-bank',
		label: 'South Bank',
		center: { lat: 51.5055, lng: -0.116 },
		description: 'Riverside galleries, theatres & Thames-side parks'
	},
	{
		id: 'bloomsbury',
		label: 'Bloomsbury',
		center: { lat: 51.5229, lng: -0.128 },
		description: 'Museums, garden squares & literary cafes'
	}
];

export interface CategoryMeta {
	id: CoreCategory;
	label: string;
	pluralLabel: string;
	pinGlyph: string;
	background: string;
	borderColor: string;
	glyphColor: string;
	badgeBg: string;
	badgeText: string;
}

export const CATEGORY_META: Record<CoreCategory, CategoryMeta> = {
	restaurant: {
		id: 'restaurant',
		label: 'Restaurant',
		pluralLabel: 'Restaurants',
		pinGlyph: 'R',
		background: '#d93829',
		borderColor: '#991b1b',
		glyphColor: '#ffffff',
		badgeBg: '#fef2f2',
		badgeText: '#991b1b'
	},
	cafe: {
		id: 'cafe',
		label: 'Cafe',
		pluralLabel: 'Cafes',
		pinGlyph: 'C',
		background: '#d97706',
		borderColor: '#92400e',
		glyphColor: '#ffffff',
		badgeBg: '#fffbeb',
		badgeText: '#92400e'
	},
	museum: {
		id: 'museum',
		label: 'Museum',
		pluralLabel: 'Museums',
		pinGlyph: 'M',
		background: '#2563eb',
		borderColor: '#1e40af',
		glyphColor: '#ffffff',
		badgeBg: '#eff6ff',
		badgeText: '#1e40af'
	},
	park: {
		id: 'park',
		label: 'Park',
		pluralLabel: 'Parks',
		pinGlyph: 'P',
		background: '#16a34a',
		borderColor: '#166534',
		glyphColor: '#ffffff',
		badgeBg: '#f0fdf4',
		badgeText: '#166534'
	}
};

export const CORE_CATEGORIES: CoreCategory[] = ['restaurant', 'cafe', 'museum', 'park'];

export const CATEGORY_CHIPS: { id: PlaceCategory; label: string }[] = [
	{ id: 'all', label: 'All' },
	{ id: 'restaurant', label: 'Restaurants' },
	{ id: 'cafe', label: 'Cafes' },
	{ id: 'museum', label: 'Museums' },
	{ id: 'park', label: 'Parks' }
];
