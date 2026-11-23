import type { DiscoveryCategory, LatLngLiteral, NeighborhoodPreset } from '../types/neighborhood';

export const CENTRAL_LONDON_CENTER: LatLngLiteral = {
  lat: 51.5118,
  lng: -0.128,
};

export const DEFAULT_ZOOM = 13;

export const SEARCH_RADIUS_METERS = 5000;

export const DEMO_MAP_ID = 'DEMO_MAP_ID';

export const GMP_ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';

export const LONDON_PRESETS: NeighborhoodPreset[] = [
  {
    id: 'covent-garden',
    label: 'Covent Garden / West End',
    center: { lat: 51.5118, lng: -0.128 },
    description: 'Historic piazza, theatres, dining, and cultural venues in WC2',
  },
  {
    id: 'soho',
    label: 'Soho',
    center: { lat: 51.5137, lng: -0.1337 },
    description: 'Vibrant independent cafes, restaurants, and Soho Square in W1',
  },
  {
    id: 'south-bank',
    label: 'South Bank',
    center: { lat: 51.5055, lng: -0.1168 },
    description: 'Riverside promenade, museums, galleries, and green spaces in SE1',
  },
  {
    id: 'bloomsbury',
    label: 'Bloomsbury',
    center: { lat: 51.5236, lng: -0.126 },
    description: 'British Museum, literary garden squares, and academic cafes in WC1',
  },
];

export interface CategoryMeta {
  id: DiscoveryCategory;
  label: string;
  pluralLabel: string;
  background: string;
  borderColor: string;
  glyphText: string;
  glyphColor: string;
}

export const CATEGORY_META: Record<DiscoveryCategory, CategoryMeta> = {
  restaurant: {
    id: 'restaurant',
    label: 'Restaurant',
    pluralLabel: 'Restaurants',
    background: '#dc2626',
    borderColor: '#991b1b',
    glyphText: 'R',
    glyphColor: '#ffffff',
  },
  cafe: {
    id: 'cafe',
    label: 'Cafe',
    pluralLabel: 'Cafes',
    background: '#d97706',
    borderColor: '#92400e',
    glyphText: 'C',
    glyphColor: '#ffffff',
  },
  museum: {
    id: 'museum',
    label: 'Museum',
    pluralLabel: 'Museums',
    background: '#2563eb',
    borderColor: '#1e40af',
    glyphText: 'M',
    glyphColor: '#ffffff',
  },
  park: {
    id: 'park',
    label: 'Park',
    pluralLabel: 'Parks',
    background: '#16a34a',
    borderColor: '#166534',
    glyphText: 'P',
    glyphColor: '#ffffff',
  },
};

export const DISCOVERY_CATEGORIES: DiscoveryCategory[] = [
  'restaurant',
  'cafe',
  'museum',
  'park',
];

export const COMMUNITY_SPOT_PIN = {
  background: '#7c3aed',
  borderColor: '#5b21b6',
  glyphText: '★',
  glyphColor: '#ffffff',
};
