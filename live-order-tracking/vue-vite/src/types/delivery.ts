import type { LatLngPoint } from '../config/delivery';

export interface AddressValidationVerdictSummary {
  validationGranularity: string;
  geocodeGranularity: string;
  addressComplete: boolean;
  hasUnconfirmedComponents: boolean;
  hasInferredComponents: boolean;
  hasReplacedComponents: boolean;
}

export interface AddressPropertyMetadata {
  residential: boolean;
  business: boolean;
  poBox: boolean;
}

export interface UspsDeliverabilitySummary {
  dpvConfirmation: string | null;
  dpvVacant: string | null;
  carrierRoute: string | null;
  cassProcessed: boolean;
  standardizedLine1: string | null;
  standardizedCityStateZip: string | null;
}

export interface ValidatedAddressResult {
  source: 'address-validation' | 'geocoder-fallback';
  inputAddress: string;
  formattedAddress: string;
  placeId: string | null;
  plusCode: string | null;
  location: LatLngPoint;
  verdict: AddressValidationVerdictSummary;
  metadata: AddressPropertyMetadata | null;
  uspsData: UspsDeliverabilitySummary | null;
  deliverable: boolean;
  deliverabilityReason: string;
}

export interface RouteStepSummary {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
}

export interface RouteComputationResult {
  distanceMeters: number;
  durationSeconds: number;
  staticDurationSeconds: number;
  encodedPolyline: string;
  pathPoints: LatLngPoint[];
  steps: RouteStepSummary[];
}

export interface ZoneEligibilityResult {
  insidePolygon: boolean;
  withinDistanceLimit: boolean;
  isEligible: boolean;
  tierLabel: string;
  deliveryFee: number;
  reason: string;
}

export interface CourierState {
  status: 'idle' | 'dispatched' | 'en-route' | 'paused' | 'delivered';
  progress: number; // 0 to 1
  remainingSeconds: number;
  distanceRemainingKm: number;
  currentStepText: string;
}
