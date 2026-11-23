export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface CartItem {
  id: string;
  name: string;
  category: 'Kitchen' | 'Grocery';
  quantity: number;
  unitPrice: number;
}

export const GMP_USAGE_ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';
export const DEMO_MAP_ID = 'DEMO_MAP_ID';

export const KITCHEN_HUB = {
  name: 'Fulton Market Kitchen Hub',
  address: '832 W Fulton Market, Chicago, IL 60607',
  position: { lat: 41.8868, lng: -87.6486 } as LatLngPoint,
};

export const SEED_IN_ZONE_ADDRESS = '401 N Michigan Ave, Chicago, IL 60611';
export const PRESET_OUT_OF_ZONE_ADDRESS = '5500 N Sheridan Rd, Chicago, IL 60640';

export const MAX_DELIVERY_DISTANCE_METERS = 8000;

/**
 * Chicago core delivery polygon centered around Fulton Market,
 * covering West Loop, River North, Streeterville, Loop, Wicker Park,
 * Lincoln Park South, and South Loop.
 */
export const CHICAGO_DELIVERY_ZONE_POLYGON: LatLngPoint[] = [
  { lat: 41.9255, lng: -87.6950 },
  { lat: 41.9255, lng: -87.6300 },
  { lat: 41.9100, lng: -87.6120 },
  { lat: 41.8880, lng: -87.6100 },
  { lat: 41.8550, lng: -87.6150 },
  { lat: 41.8550, lng: -87.6650 },
  { lat: 41.8720, lng: -87.6950 },
];

export const SAMPLE_CART_ITEMS: CartItem[] = [
  {
    id: 'item-1',
    name: 'Fulton Herb-Roasted Chicken Bowl',
    category: 'Kitchen',
    quantity: 1,
    unitPrice: 16.50,
  },
  {
    id: 'item-2',
    name: 'Artisanal Sourdough & Cultured Butter',
    category: 'Grocery',
    quantity: 1,
    unitPrice: 7.50,
  },
  {
    id: 'item-3',
    name: 'Organic Honeycrisp Apples (4-pk)',
    category: 'Grocery',
    quantity: 1,
    unitPrice: 6.00,
  },
  {
    id: 'item-4',
    name: 'Sparkling Yuzu Ginger Tonic',
    category: 'Kitchen',
    quantity: 1,
    unitPrice: 4.25,
  },
];

export const CHICAGO_TAX_RATE = 0.1025;

export interface DeliveryTierResult {
  eligibleByDistance: boolean;
  tierLabel: string;
  fee: number;
}

export function calculateDeliveryTier(distanceMeters: number): DeliveryTierResult {
  const distanceKm = distanceMeters / 1000;
  if (distanceKm <= 3.0) {
    return {
      eligibleByDistance: true,
      tierLabel: 'Tier 1 • Neighborhood Express (<= 3.0 km)',
      fee: 2.99,
    };
  }
  if (distanceKm <= 5.5) {
    return {
      eligibleByDistance: true,
      tierLabel: 'Tier 2 • City Standard (<= 5.5 km)',
      fee: 4.99,
    };
  }
  if (distanceKm <= 8.0) {
    return {
      eligibleByDistance: true,
      tierLabel: 'Tier 3 • Extended Metro (<= 8.0 km)',
      fee: 6.99,
    };
  }
  return {
    eligibleByDistance: false,
    tierLabel: 'Exceeds 8.0 km Road Limit',
    fee: 0,
  };
}
