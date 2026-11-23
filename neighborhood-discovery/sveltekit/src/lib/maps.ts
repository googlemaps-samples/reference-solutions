import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { CORE_CATEGORIES, USAGE_ATTRIBUTION_ID } from './constants';
import type {
	CoreCategory,
	LatLngLiteral,
	PlaceCategory,
	PlaceItem,
	PlaceReviewItem,
	ReverseGeocodeInfo
} from './types';

export interface LoadedMapsLibraries {
	mapsLib: google.maps.MapsLibrary;
	markerLib: google.maps.MarkerLibrary;
	placesLib: google.maps.PlacesLibrary;
	geocodingLib: google.maps.GeocodingLibrary;
	coreLib: google.maps.CoreLibrary;
}

const NEARBY_FIELDS = [
	'id',
	'displayName',
	'formattedAddress',
	'location',
	'primaryType',
	'primaryTypeDisplayName',
	'types',
	'rating',
	'userRatingCount',
	'priceLevel',
	'regularOpeningHours',
	'photos',
	'googleMapsURI'
];

const DETAIL_FIELDS = [
	'id',
	'displayName',
	'formattedAddress',
	'location',
	'primaryType',
	'primaryTypeDisplayName',
	'types',
	'rating',
	'userRatingCount',
	'priceLevel',
	'regularOpeningHours',
	'reviews',
	'photos',
	'websiteURI',
	'internationalPhoneNumber',
	'googleMapsURI'
];

let configured = false;

export function ensureMapsConfigured(apiKey: string): void {
	if (configured) return;
	setOptions({
		key: apiKey,
		v: 'weekly',
		language: 'en',
		region: 'GB'
	});
	configured = true;
}

export async function loadMapsLibraries(): Promise<LoadedMapsLibraries> {
	const [mapsLib, markerLib, placesLib, geocodingLib, coreLib] = await Promise.all([
		importLibrary('maps'),
		importLibrary('marker'),
		importLibrary('places'),
		importLibrary('geocoding'),
		importLibrary('core')
	]);

	return { mapsLib, markerLib, placesLib, geocodingLib, coreLib };
}

export function inferCategory(
	primaryType: string | null | undefined,
	types: string[] | undefined,
	fallback: CoreCategory = 'restaurant'
): CoreCategory {
	const candidates = [primaryType ?? '', ...(types ?? [])].map((t) => t.toLowerCase());
	for (const candidate of candidates) {
		if (candidate === 'cafe' || candidate === 'coffee_shop' || candidate === 'bakery') {
			return 'cafe';
		}
		if (candidate === 'museum' || candidate === 'art_gallery') {
			return 'museum';
		}
		if (candidate === 'park' || candidate === 'garden' || candidate === 'national_park') {
			return 'park';
		}
		if (candidate === 'restaurant' || candidate === 'bistro' || candidate === 'pub') {
			return 'restaurant';
		}
	}
	return fallback;
}

export function formatPriceLevel(priceLevel: string | null | undefined): string {
	switch (priceLevel) {
		case 'FREE':
			return 'Free';
		case 'INEXPENSIVE':
			return '£';
		case 'MODERATE':
			return '££';
		case 'EXPENSIVE':
			return '£££';
		case 'VERY_EXPENSIVE':
			return '££££';
		default:
			return '—';
	}
}

export function getTodayOpeningHours(weekdayDescriptions: string[]): string {
	if (!weekdayDescriptions.length) {
		return 'Hours unavailable';
	}
	// JS getDay(): 0 = Sunday .. 6 = Saturday. weekdayDescriptions starts Monday (0) .. Sunday (6).
	const mondayFirstIdx = (new Date().getDay() + 6) % 7;
	return weekdayDescriptions[mondayFirstIdx] ?? weekdayDescriptions[0] ?? 'Hours unavailable';
}

function extractPhotoUrl(photos: google.maps.places.Photo[] | undefined): string | null {
	if (!photos || photos.length === 0) return null;
	try {
		return photos[0].getURI({ maxWidth: 640, maxHeight: 400 });
	} catch {
		return null;
	}
}

function extractReviews(reviews: google.maps.places.Review[] | undefined): PlaceReviewItem[] {
	if (!reviews || reviews.length === 0) return [];
	return reviews.slice(0, 5).map((r) => ({
		authorName: r.authorAttribution?.displayName ?? 'Google Maps User',
		authorPhotoUrl: r.authorAttribution?.photoURI ?? null,
		rating: typeof r.rating === 'number' ? r.rating : null,
		relativePublishTimeDescription: r.relativePublishTimeDescription ?? '',
		text: r.text ?? r.originalText ?? ''
	}));
}

function toLatLngLiteral(loc: google.maps.LatLng | null | undefined): LatLngLiteral | null {
	if (!loc) return null;
	return { lat: loc.lat(), lng: loc.lng() };
}

export function mapPlaceToItem(
	place: google.maps.places.Place,
	fallbackCategory: CoreCategory
): PlaceItem | null {
	const coords = toLatLngLiteral(place.location);
	if (!place.id || !coords) return null;

	const types = place.types ?? [];
	const primaryType = place.primaryType ?? '';
	const category = inferCategory(primaryType, types, fallbackCategory);

	return {
		id: place.id,
		displayName: place.displayName ?? 'Unnamed Place',
		formattedAddress: place.formattedAddress ?? 'Central London, UK',
		location: coords,
		primaryType,
		primaryTypeDisplayName: place.primaryTypeDisplayName ?? category,
		types,
		category,
		rating: typeof place.rating === 'number' ? place.rating : null,
		userRatingCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
		priceLevel: place.priceLevel ?? null,
		weekdayDescriptions: place.regularOpeningHours?.weekdayDescriptions ?? [],
		photoUrl: extractPhotoUrl(place.photos),
		googleMapsURI: place.googleMapsURI ?? null,
		websiteURI: place.websiteURI ?? null,
		internationalPhoneNumber: place.internationalPhoneNumber ?? null,
		reviews: extractReviews(place.reviews),
		detailsLoaded: Boolean(place.reviews && place.reviews.length > 0)
	};
}

export async function searchNearbyPlaces(
	placesLib: google.maps.PlacesLibrary,
	center: LatLngLiteral,
	radiusMeters: number,
	category: PlaceCategory
): Promise<PlaceItem[]> {
	const { Place, SearchNearbyRankPreference } = placesLib;
	const targetCategories: CoreCategory[] =
		category === 'all' ? CORE_CATEGORIES : [category];

	const maxPerCategory = category === 'all' ? 6 : 16;

	const settled = await Promise.allSettled(
		targetCategories.map(async (cat) => {
			const { places } = await Place.searchNearby({
				fields: NEARBY_FIELDS,
				locationRestriction: {
					center,
					radius: radiusMeters
				},
				includedPrimaryTypes: [cat],
				maxResultCount: maxPerCategory,
				rankPreference: SearchNearbyRankPreference.POPULARITY,
				language: 'en',
				region: 'gb',
				internalUsageAttributionIds: [USAGE_ATTRIBUTION_ID]
			});
			return { cat, places };
		})
	);

	const deduped = new Map<string, PlaceItem>();
	for (const result of settled) {
		if (result.status !== 'fulfilled') continue;
		const { cat, places } = result.value;
		for (const p of places) {
			const item = mapPlaceToItem(p, cat);
			if (item && !deduped.has(item.id)) {
				deduped.set(item.id, item);
			}
		}
	}

	return Array.from(deduped.values()).sort((a, b) => {
		const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
		if (Math.abs(ratingDiff) > 0.05) return ratingDiff;
		return (b.userRatingCount ?? 0) - (a.userRatingCount ?? 0);
	});
}

export async function searchPlacesByText(
	placesLib: google.maps.PlacesLibrary,
	textQuery: string,
	center: LatLngLiteral,
	radiusMeters: number,
	category: PlaceCategory
): Promise<PlaceItem[]> {
	const { Place } = placesLib;
	const fallbackCat: CoreCategory = category === 'all' ? 'restaurant' : category;

	const { places } = await Place.searchByText({
		textQuery,
		fields: NEARBY_FIELDS,
		locationBias: {
			center,
			radius: radiusMeters
		},
		includedType: category === 'all' ? undefined : category,
		maxResultCount: 16,
		language: 'en',
		region: 'gb',
		internalUsageAttributionIds: [USAGE_ATTRIBUTION_ID]
	});

	const items: PlaceItem[] = [];
	for (const p of places) {
		const mapped = mapPlaceToItem(p, fallbackCat);
		if (mapped) items.push(mapped);
	}
	return items;
}

export async function fetchPlaceDetails(
	placesLib: google.maps.PlacesLibrary,
	placeId: string,
	existingCategory: CoreCategory
): Promise<Partial<PlaceItem>> {
	const place = new placesLib.Place({ id: placeId });
	await place.fetchFields({ fields: DETAIL_FIELDS });

	const photoUrl = extractPhotoUrl(place.photos);
	const reviews = extractReviews(place.reviews);
	const weekdayDescriptions = place.regularOpeningHours?.weekdayDescriptions ?? [];

	return {
		displayName: place.displayName ?? undefined,
		formattedAddress: place.formattedAddress ?? undefined,
		primaryTypeDisplayName: place.primaryTypeDisplayName ?? existingCategory,
		rating: typeof place.rating === 'number' ? place.rating : null,
		userRatingCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
		priceLevel: place.priceLevel ?? null,
		weekdayDescriptions,
		...(photoUrl ? { photoUrl } : {}),
		googleMapsURI: place.googleMapsURI ?? null,
		websiteURI: place.websiteURI ?? null,
		internationalPhoneNumber: place.internationalPhoneNumber ?? null,
		reviews,
		detailsLoaded: true
	};
}

export async function geocodeAddress(
	geocodingLib: google.maps.GeocodingLibrary,
	address: string
): Promise<{
	lat: number;
	lng: number;
	formattedAddress: string;
	placeId: string | null;
} | null> {
	const geocoder = new geocodingLib.Geocoder();
	const response = await geocoder.geocode({
		address,
		region: 'GB'
	});

	const top = response.results?.[0];
	if (!top?.geometry?.location) return null;

	return {
		lat: top.geometry.location.lat(),
		lng: top.geometry.location.lng(),
		formattedAddress: top.formatted_address,
		placeId: top.place_id ?? null
	};
}

export async function reverseGeocodeCoords(
	geocodingLib: google.maps.GeocodingLibrary,
	coords: LatLngLiteral
): Promise<ReverseGeocodeInfo> {
	const geocoder = new geocodingLib.Geocoder();
	const response = await geocoder.geocode({
		location: coords
	});

	const top = response.results?.[0];
	const neighborhoodComp = top?.address_components?.find(
		(c) =>
			c.types.includes('neighborhood') ||
			c.types.includes('sublocality') ||
			c.types.includes('postal_town')
	);

	return {
		lat: coords.lat,
		lng: coords.lng,
		formattedAddress:
			top?.formatted_address ?? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
		placeId: top?.place_id ?? null,
		neighborhood: neighborhoodComp?.long_name ?? null
	};
}

export function computeDistanceMeters(a: LatLngLiteral, b: LatLngLiteral): number {
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const R = 6371000;
	const dLat = toRad(b.lat - a.lat);
	const dLng = toRad(b.lng - a.lng);
	const sinLat = Math.sin(dLat / 2);
	const sinLng = Math.sin(dLng / 2);
	const h =
		sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
	return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function formatDistance(meters: number): string {
	if (meters < 1000) {
		return `${Math.round(meters)} m`;
	}
	return `${(meters / 1000).toFixed(1)} km`;
}
