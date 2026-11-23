import type { LatLngPoint, OrderItem } from '$lib/types/delivery';

export const GMP_ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';
export const DEMO_MAP_ID = 'DEMO_MAP_ID';

export const KITCHEN_HUB = {
	name: 'Fulton Market Kitchen Hub',
	address: '820 W Fulton Market, Chicago, IL 60607',
	coords: { lat: 41.8868, lng: -87.6486 } satisfies LatLngPoint
};

export const SEED_CUSTOMER_ADDRESS = '401 N Michigan Ave, Chicago, IL 60611';
export const IN_ZONE_PRESET_ADDRESS = '401 N Michigan Ave, Chicago, IL 60611';
export const OUT_OF_ZONE_PRESET_ADDRESS = '6330 N Sheridan Rd, Chicago, IL 60660';

export const MAX_ROAD_DISTANCE_METERS = 8000;

/**
 * Chicago Core Delivery Polygon centered around Fulton Market Hub (41.8868, -87.6486)
 * covering West Loop, River North, Streeterville, Loop, South Loop, Pilsen, and Lincoln Park South.
 */
export const CHICAGO_DELIVERY_ZONE_POLYGON: LatLngPoint[] = [
	{ lat: 41.922, lng: -87.688 },
	{ lat: 41.9255, lng: -87.652 },
	{ lat: 41.9225, lng: -87.624 },
	{ lat: 41.908, lng: -87.612 },
	{ lat: 41.8915, lng: -87.606 },
	{ lat: 41.868, lng: -87.611 },
	{ lat: 41.8525, lng: -87.628 },
	{ lat: 41.852, lng: -87.664 },
	{ lat: 41.866, lng: -87.691 },
	{ lat: 41.896, lng: -87.694 }
];

export const DEFAULT_CART_ITEMS: OrderItem[] = [
	{
		id: 'item-1',
		name: 'West Loop Wood-Fired Margherita Pizza',
		category: 'Restaurant',
		quantity: 1,
		unitPrice: 19.5
	},
	{
		id: 'item-2',
		name: 'Burrata, Prosciutto & Hearth Sourdough Kit',
		category: 'Restaurant',
		quantity: 1,
		unitPrice: 15.0
	},
	{
		id: 'item-3',
		name: 'Michigan Honeycrisp Apples (2 lb Organic Bag)',
		category: 'Grocery',
		quantity: 1,
		unitPrice: 6.49
	},
	{
		id: 'item-4',
		name: 'Fulton Cold-Pressed Citrus & Ginger Tonic',
		category: 'Grocery',
		quantity: 2,
		unitPrice: 4.5
	}
];

export const CHICAGO_TAX_RATE = 0.1025;
