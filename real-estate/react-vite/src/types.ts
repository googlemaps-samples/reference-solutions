export type PropertyType = 'Single Family' | 'Condo' | 'Townhouse' | 'Multi-Family';

export type AmenityCategory = 'all' | 'schools' | 'groceries' | 'transit';

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
  lotSizeSqFt: number;
  propertyType: PropertyType;
  yearBuilt: number;
  apn: string;
  zoning: string;
  daysOnMarket: number;
  summary: string;
  accentGradient: string;
  lat: number;
  lng: number;
  parcelPolygon: LatLngPoint[];
}

export interface NearbyAmenity {
  id: string;
  name: string;
  address: string;
  category: Exclude<AmenityCategory, 'all'>;
  primaryType: string;
  location: LatLngPoint;
  distanceMeters: number;
  rating: number | null;
  userRatingCount: number | null;
}

export interface WorkplaceLocation {
  label: string;
  address: string;
  location: LatLngPoint;
}

export interface ModeCommuteResult {
  durationText: string;
  durationSeconds: number | null;
  distanceText: string;
  distanceMeters: number | null;
  status: 'ok' | 'unavailable';
}

export interface CommuteEstimate {
  propertyId: string;
  workplace: WorkplaceLocation;
  driving: ModeCommuteResult;
  transit: ModeCommuteResult;
  routePath: LatLngPoint[];
}

export interface PropertyFilters {
  maxPrice: number | null;
  minBeds: number | null;
  propertyType: PropertyType | 'ALL';
}
