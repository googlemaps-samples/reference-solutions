export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface OrderItem {
  id: string;
  name: string;
  category: 'Kitchen' | 'Grocery';
  quantity: number;
  unitPrice: number;
}

export interface AddressValidationSummary {
  inputAddress: string;
  formattedAddress: string;
  placeId: string | null;
  location: LatLngPoint;
  verdict: {
    inputGranularity?: string;
    validationGranularity?: string;
    geocodeGranularity?: string;
    addressComplete?: boolean;
    hasUnconfirmedComponents?: boolean;
    hasInferredComponents?: boolean;
    hasReplacedComponents?: boolean;
  };
  metadata: {
    business?: boolean;
    residential?: boolean;
    poBox?: boolean;
  };
  uspsData: {
    dpvConfirmation?: string;
    carrierRoute?: string;
    standardizedAddressLine?: string;
    cityStateZipLine?: string;
  };
  isDeliverableGranularity: boolean;
  source: 'address-validation-api' | 'places-geocoding-fallback';
  note?: string;
}

export interface DeliveryRouteSummary {
  distanceMeters: number;
  durationSeconds: number;
  staticDurationSeconds: number;
  encodedPolyline: string;
  path: LatLngPoint[];
  steps: Array<{
    instruction: string;
    distanceMeters: number;
    durationText: string;
  }>;
}

export interface DeliveryEligibility {
  inPolygonZone: boolean;
  withinDistanceLimit: boolean;
  isEligible: boolean;
  tierLabel: string;
  deliveryFee: number | null;
  reason: string;
}

export type OrderStatus =
  | 'draft'
  | 'validated'
  | 'dispatched'
  | 'en-route'
  | 'arriving'
  | 'delivered';
