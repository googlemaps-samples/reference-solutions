export type PlaceCategory = 'all' | 'restaurant' | 'cafe' | 'museum' | 'park';

export type CoreCategory = Exclude<PlaceCategory, 'all'>;

export interface LatLngLiteral {
	lat: number;
	lng: number;
}

export interface NeighborhoodPreset {
	id: string;
	label: string;
	center: LatLngLiteral;
	description: string;
}

export interface PlaceReviewItem {
	authorName: string;
	authorPhotoUrl: string | null;
	rating: number | null;
	relativePublishTimeDescription: string;
	text: string;
}

export interface PlaceItem {
	id: string;
	displayName: string;
	formattedAddress: string;
	location: LatLngLiteral;
	primaryType: string;
	primaryTypeDisplayName: string;
	types: string[];
	category: CoreCategory;
	rating: number | null;
	userRatingCount: number | null;
	priceLevel: string | null;
	weekdayDescriptions: string[];
	photoUrl: string | null;
	googleMapsURI: string | null;
	websiteURI: string | null;
	internationalPhoneNumber: string | null;
	reviews: PlaceReviewItem[];
	detailsLoaded: boolean;
}

export interface ReverseGeocodeInfo {
	lat: number;
	lng: number;
	formattedAddress: string;
	placeId: string | null;
	neighborhood: string | null;
}

export interface CommunitySpot {
	id: string;
	name: string;
	category: CoreCategory;
	note: string;
	address: string;
	lat: number;
	lng: number;
	createdAt: string;
}
