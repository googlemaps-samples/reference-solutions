export type PropertyType = 'Single Family' | 'Condo' | 'Townhouse' | 'Multi-Family';

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface PropertyListing {
  id: string;
  title: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  lotSqFt: number;
  yearBuilt: number;
  propertyType: PropertyType;
  apn: string;
  zoning: string;
  daysOnMarket: number;
  description: string;
  features: string[];
  lat: number;
  lng: number;
  parcelPolygon: LatLngPoint[];
}

export type AmenityCategory = 'all' | 'schools' | 'groceries' | 'transit';

export interface NearbyAmenity {
  id: string;
  name: string;
  address: string;
  primaryType: string;
  category: Exclude<AmenityCategory, 'all'>;
  lat: number;
  lng: number;
  distanceMeters: number;
  rating?: number;
  userRatingCount?: number;
}

export interface CommuteModeResult {
  durationText: string;
  durationSeconds: number;
  distanceText: string;
  distanceMeters: number;
  available: boolean;
}

export interface CommuteCalculationResult {
  destinationLabel: string;
  destinationLocation: LatLngPoint;
  drive: CommuteModeResult;
  transit: CommuteModeResult;
  encodedPolyline: string | null;
}

export interface PropertyFilters {
  maxPrice: number | null;
  minBeds: number | null;
  propertyType: PropertyType | 'ALL';
}
