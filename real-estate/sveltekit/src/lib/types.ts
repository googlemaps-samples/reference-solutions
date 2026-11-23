export type PropertyType = 'Single Family' | 'Condo' | 'Townhouse' | 'Victorian' | 'Loft';

export type AmenityCategory = 'all' | 'schools' | 'groceries' | 'transit';

export interface LatLngLiteral {
	lat: number;
	lng: number;
}

export interface ParcelMetadata {
	apn: string;
	lotSqFt: number;
	lotDimensions: string;
	zoning: string;
	yearBuilt: number;
	polygon: LatLngLiteral[];
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
	propertyType: PropertyType;
	hoaMonthly: number;
	daysOnMarket: number;
	lat: number;
	lng: number;
	streetViewHeading: number;
	streetViewPitch: number;
	accentColor: string;
	highlights: string[];
	description: string;
	parcel: ParcelMetadata;
}

export interface FilterState {
	maxPrice: number;
	minBeds: number;
	propertyType: PropertyType | 'all';
	searchLabel: string;
}

export interface NearbyAmenity {
	id: string;
	name: string;
	address: string;
	category: Exclude<AmenityCategory, 'all'>;
	primaryType: string;
	lat: number;
	lng: number;
	distanceMeters: number;
	rating?: number;
	userRatingCount?: number;
}

export interface CommuteLegSummary {
	durationText: string;
	distanceText: string;
	durationSeconds: number;
	distanceMeters: number;
	condition: string;
}

export interface CommuteResult {
	destinationLabel: string;
	destinationLocation: LatLngLiteral;
	driving: CommuteLegSummary | null;
	transit: CommuteLegSummary | null;
	encodedPolyline?: string | null;
	path?: LatLngLiteral[] | null;
	error?: string | null;
}
