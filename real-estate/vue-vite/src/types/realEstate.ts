export type PropertyType = 'house' | 'condo' | 'townhouse' | 'multi-family';

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
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  lotSqFt: number;
  yearBuilt: number;
  propertyType: PropertyType;
  apn: string;
  zoning: string;
  hoaMonthly: number;
  daysOnMarket: number;
  description: string;
  highlights: string[];
  accentColor: string;
  position: LatLngPoint;
  parcelPolygon: LatLngPoint[];
}

export interface NearbyAmenity {
  id: string;
  name: string;
  address: string;
  primaryType: string;
  category: Exclude<AmenityCategory, 'all'>;
  location: LatLngPoint;
  distanceMeters: number;
  rating: number | null;
  userRatingCount: number | null;
}

export interface CommuteLegResult {
  durationText: string;
  distanceText: string;
  durationMillis: number | null;
  distanceMeters: number | null;
  available: boolean;
  note?: string;
}

export interface CommuteSummary {
  workplaceName: string;
  workplaceAddress: string;
  workplaceLocation: LatLngPoint;
  driving: CommuteLegResult;
  transit: CommuteLegResult;
  drivingPath: LatLngPoint[];
  transitPath: LatLngPoint[];
}

export interface WorkplaceSuggestion {
  id: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
  placePrediction: google.maps.places.PlacePrediction;
}
