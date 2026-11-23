export type DayId = 'day1' | 'day2';

export type DiscoveryCategory = 'attractions' | 'restaurants' | 'hotels';

export type TravelModeChoice = 'DRIVING' | 'WALKING' | 'TRANSIT';

export interface LatLngPoint {
	lat: number;
	lng: number;
}

export interface DestinationPreset {
	id: string;
	name: string;
	country: string;
	center: LatLngPoint;
	zoom: number;
	seedQuery: string;
}

export interface DiscoveredPlace {
	id: string;
	name: string;
	formattedAddress: string;
	location: LatLngPoint;
	rating: number | null;
	userRatingCount: number | null;
	weekdayDescriptions: string[];
	photoUrl: string | null;
	primaryType: string;
	priceLevel: string | null;
	googleMapsUri: string | null;
	utcOffsetMinutes: number | null;
	timeZoneId: string | null;
}

export interface ItineraryStop extends DiscoveredPlace {
	uid: string;
}

export interface RouteLegSummary {
	fromName: string;
	toName: string;
	distanceMeters: number;
	durationMillis: number;
}

export interface RouteSummary {
	distanceMeters: number;
	durationMillis: number;
	legs: RouteLegSummary[];
	isFallback?: boolean;
}

export interface TimeZoneInfo {
	timeZoneId: string;
	timeZoneName: string;
	rawOffsetSeconds: number;
	dstOffsetSeconds: number;
	totalOffsetSeconds: number;
	source: 'timezone-api' | 'places-fallback';
}
