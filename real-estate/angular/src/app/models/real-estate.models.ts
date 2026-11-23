export type PropertyType = 'Single Family' | 'Condo' | 'Townhouse' | 'Victorian' | 'Loft';

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
  zip: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  propertyType: PropertyType;
  yearBuilt: number;
  lat: number;
  lng: number;
  apn: string;
  lotSqFt: number;
  lotDimensions: string;
  zoning: string;
  parcelPolygon: LatLngPoint[];
  highlights: string[];
  accentColor: string;
  streetViewHeading: number;
}

export type AmenityCategory = 'all' | 'schools' | 'groceries' | 'transit';

export interface NearbyAmenity {
  id: string;
  name: string;
  address: string;
  category: Exclude<AmenityCategory, 'all'>;
  primaryTypeLabel: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  rating?: number;
  userRatingCount?: number;
}

export interface CommuteLegResult {
  durationText: string;
  distanceText: string;
  durationSeconds: number;
  distanceMeters: number;
  available: boolean;
  note?: string;
}

export interface CommuteSummary {
  workplaceName: string;
  workplaceAddress: string;
  workplaceLocation: LatLngPoint;
  driving: CommuteLegResult;
  transit: CommuteLegResult;
}
