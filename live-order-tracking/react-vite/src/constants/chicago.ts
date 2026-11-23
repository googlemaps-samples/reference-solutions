import type { LatLngPoint, OrderItem } from '../types/delivery';

export const KITCHEN_HUB = {
  name: 'Fulton Market Kitchen & Pantry',
  address: '845 W Fulton Market, Chicago, IL 60607',
  coordinates: { lat: 41.8868, lng: -87.6486 } as LatLngPoint,
};

export const INITIAL_MAP_ZOOM = 13;
export const MAX_DELIVERY_DISTANCE_METERS = 8000;

export const SEED_IN_ZONE_ADDRESS = '401 N Michigan Ave, Chicago, IL 60611';
export const PRESET_OUT_OF_ZONE_ADDRESS = '5801 S Ellis Ave, Chicago, IL 60637';

/**
 * Chicago Central/West/North delivery polygon anchored around Fulton Market.
 * Covers West Loop, Fulton Market, River North, Streeterville, Loop,
 * Old Town, Lincoln Park (south), Wicker Park, and Pilsen.
 */
export const CHICAGO_DELIVERY_ZONE_POLYGON: LatLngPoint[] = [
  { lat: 41.9255, lng: -87.6865 }, // NW: Logan Blvd / Western Ave
  { lat: 41.9258, lng: -87.6320 }, // N: Fullerton / Lincoln Park
  { lat: 41.9110, lng: -87.6240 }, // NE: North Ave / Gold Coast
  { lat: 41.8920, lng: -87.6115 }, // E: Navy Pier / Streeterville shoreline
  { lat: 41.8675, lng: -87.6165 }, // SE: Roosevelt / Museum Campus
  { lat: 41.8575, lng: -87.6465 }, // S: 18th St / Halsted
  { lat: 41.8575, lng: -87.6865 }, // SW: 18th St / Western Ave
  { lat: 41.8915, lng: -87.6915 }, // W: Humboldt Park East edge
];

export const CHICAGO_LOCATION_BIAS_BOUNDS = {
  south: 41.6445,
  west: -87.9401,
  north: 42.0230,
  east: -87.5240,
};

export const SAMPLE_CART_ITEMS: OrderItem[] = [
  {
    id: 'item-1',
    name: 'West Loop Truffle Smash Burger',
    category: 'Kitchen',
    quantity: 2,
    unitPrice: 16.5,
  },
  {
    id: 'item-2',
    name: 'Crispy Garlic Rosemary Frites',
    category: 'Kitchen',
    quantity: 1,
    unitPrice: 7.0,
  },
  {
    id: 'item-3',
    name: 'Artisanal Sourdough & Cultured Butter',
    category: 'Grocery',
    quantity: 1,
    unitPrice: 8.5,
  },
  {
    id: 'item-4',
    name: 'Cold-Pressed Blood Orange Juice (500ml)',
    category: 'Grocery',
    quantity: 2,
    unitPrice: 5.25,
  },
];
