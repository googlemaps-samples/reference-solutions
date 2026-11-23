export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface KitchenHub {
  name: string;
  address: string;
  location: LatLngPoint;
}

export const KITCHEN_HUB: KitchenHub = {
  name: 'Fulton Market Kitchen Hub',
  address: '832 W Fulton Market, Chicago, IL 60607',
  location: { lat: 41.8868, lng: -87.6486 },
};

export const SEED_ADDRESS = '401 N Michigan Ave, Chicago, IL 60611';
export const OUT_OF_ZONE_PRESET_ADDRESS = '5801 S Ellis Ave, Chicago, IL 60637';
export const MAX_DELIVERY_DISTANCE_METERS = 8000;

/**
 * Chicago delivery zone polygon centered around Fulton Market
 * covering West Loop, River North, Streeterville, Loop, Pilsen, and Wicker Park.
 */
export const DELIVERY_ZONE_POLYGON: LatLngPoint[] = [
  { lat: 41.926, lng: -87.678 },
  { lat: 41.928, lng: -87.632 },
  { lat: 41.908, lng: -87.614 },
  { lat: 41.892, lng: -87.606 },
  { lat: 41.874, lng: -87.612 },
  { lat: 41.854, lng: -87.624 },
  { lat: 41.852, lng: -87.668 },
  { lat: 41.874, lng: -87.694 },
  { lat: 41.906, lng: -87.692 },
];

export interface CartItem {
  id: string;
  name: string;
  category: 'Restaurant' | 'Grocery';
  quantity: number;
  unitPrice: number;
}

export const SAMPLE_CART_ITEMS: CartItem[] = [
  {
    id: 'item-1',
    name: 'Fulton Smashburger & Truffle Fries',
    category: 'Restaurant',
    quantity: 2,
    unitPrice: 16.5,
  },
  {
    id: 'item-2',
    name: 'West Loop Sourdough & Cultured Butter',
    category: 'Grocery',
    quantity: 1,
    unitPrice: 8.5,
  },
  {
    id: 'item-3',
    name: 'Honeycrisp Apples & Organic Greens Bundle',
    category: 'Grocery',
    quantity: 1,
    unitPrice: 11.25,
  },
];

export interface AddressValidationSummary {
  status: 'idle' | 'validating' | 'validated' | 'warning' | 'error';
  formattedAddress: string;
  placeId: string | null;
  location: LatLngPoint | null;
  plusCode: string | null;
  validationGranularity: string | null;
  geocodeGranularity: string | null;
  inputGranularity: string | null;
  addressComplete: boolean;
  hasUnconfirmedComponents: boolean;
  hasInferredComponents: boolean;
  hasReplacedComponents: boolean;
  deliverable: boolean;
  propertyType: 'Residential' | 'Business' | 'PO Box' | 'Unknown';
  uspsDpvConfirmation: string | null;
  uspsStandardizedLine: string | null;
  source: 'address-validation-js' | 'address-validation-bff' | 'places-fallback';
  message: string;
}

export interface RouteSummary {
  distanceMeters: number;
  distanceKm: number;
  durationMillis: number;
  durationMinutes: number;
  encodedPolyline: string;
  path: LatLngPoint[];
  steps: RouteStepSummary[];
}

export interface RouteStepSummary {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
}

export interface DeliveryEligibility {
  insidePolygon: boolean;
  withinDistanceLimit: boolean;
  eligible: boolean;
  feeTierLabel: string;
  deliveryFee: number | null;
  reason: string;
}

export interface CourierState {
  status: 'awaiting-order' | 'dispatched' | 'paused' | 'delivered';
  progress: number; // 0 to 1
  position: LatLngPoint;
  headingDegrees: number;
  remainingMinutes: number;
  remainingKm: number;
  orderNumber: string | null;
}
