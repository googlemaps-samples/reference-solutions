export type TravelModeOption = 'DRIVING' | 'TRANSIT' | 'WALKING';

export type ViewMode = 'map' | 'split' | 'streetview';

export interface Coordinates {
	lat: number;
	lng: number;
}

export interface PlaceReviewItem {
	authorName: string;
	authorUri: string | null;
	authorPhotoUri: string | null;
	rating: number;
	relativePublishTimeDescription: string;
	text: string;
}

export interface PlacePhotoItem {
	uri: string;
	attribution: string | null;
}

export interface OpenNowResult {
	isOpen: boolean | null;
	label: string;
	detail: string;
}

export interface ClinicProfile {
	placeId: string | null;
	displayName: string;
	formattedAddress: string;
	location: Coordinates;
	rating: number | null;
	userRatingCount: number | null;
	weekdayDescriptions: string[];
	openNow: OpenNowResult;
	reviews: PlaceReviewItem[];
	photos: PlacePhotoItem[];
	nationalPhoneNumber: string | null;
	websiteUri: string | null;
	googleMapsUri: string | null;
	businessStatus: string | null;
}

export interface OriginLocation {
	label: string;
	address: string;
	location: Coordinates;
}

export interface RouteSummary {
	travelMode: TravelModeOption;
	durationText: string;
	distanceText: string;
	durationMillis: number | null;
	distanceMeters: number | null;
	originLabel: string;
	destinationLabel: string;
}

export interface BookingRecord {
	confirmationCode: string;
	patientName: string;
	email: string;
	phone: string;
	specialty: string;
	visitType: 'in-clinic' | 'home-visit';
	preferredDate: string;
	preferredTimeSlot: string;
	notes: string;
	createdAt: string;
}
