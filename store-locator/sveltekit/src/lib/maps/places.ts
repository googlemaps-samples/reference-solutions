import {
	NYC_BOUNDS_LITERAL,
	NYC_CENTER,
	type AutocompleteOption,
	type BranchLocation,
	type BranchType,
	type OriginLocation,
	type ServiceTag
} from '$lib/types';

const PLACE_SEARCH_FIELDS: string[] = [
	'id',
	'displayName',
	'formattedAddress',
	'location',
	'types',
	'primaryType',
	'rating',
	'userRatingCount',
	'regularOpeningHours',
	'businessStatus'
];

interface SearchCategoryConfig {
	textQuery: string;
	defaultType: BranchType;
}

const NYC_BRANCH_SEARCHES: SearchCategoryConfig[] = [
	{
		textQuery: 'flagship retail store in Manhattan, New York',
		defaultType: 'flagship'
	},
	{
		textQuery: 'espresso coffee kiosk in Midtown Manhattan, New York',
		defaultType: 'kiosk'
	},
	{
		textQuery: '24 hour ATM in Manhattan, New York',
		defaultType: 'atm'
	}
];

function classifyBranchType(place: google.maps.places.Place, fallback: BranchType): BranchType {
	const primary = (place.primaryType ?? '').toLowerCase();
	const types = (place.types ?? []).map((t) => t.toLowerCase());
	const name = (place.displayName ?? '').toLowerCase();

	if (primary === 'atm' || types.includes('atm') || name.includes('atm')) {
		return 'atm';
	}
	if (
		primary === 'coffee_shop' ||
		primary === 'cafe' ||
		types.includes('coffee_shop') ||
		types.includes('cafe') ||
		name.includes('espresso') ||
		name.includes('coffee') ||
		name.includes('kiosk')
	) {
		return 'kiosk';
	}
	if (
		primary === 'department_store' ||
		primary === 'clothing_store' ||
		primary === 'electronics_store' ||
		primary === 'store' ||
		types.includes('department_store') ||
		types.includes('shopping_mall')
	) {
		return 'flagship';
	}
	return fallback;
}

function deriveServiceTags(
	type: BranchType,
	weekdayDescriptions: string[],
	placeTypes: string[]
): ServiceTag[] {
	const tags = new Set<ServiceTag>();
	const hoursText = weekdayDescriptions.join(' ').toLowerCase();
	const is24Hours =
		hoursText.includes('open 24 hours') ||
		hoursText.includes('24 hours') ||
		type === 'atm';

	if (type === 'flagship') {
		tags.add('pickup');
		if (placeTypes.includes('cafe') || placeTypes.includes('coffee_shop')) {
			tags.add('coffee');
		}
		tags.add('cash');
	} else if (type === 'kiosk') {
		tags.add('coffee');
		tags.add('pickup');
	} else if (type === 'atm') {
		tags.add('cash');
		tags.add('open24');
	}

	if (is24Hours) {
		tags.add('open24');
	}

	return Array.from(tags);
}

/**
 * Fetches live NYC branches across Flagship Stores, Express Kiosks, and 24/7 ATMs
 * using Places API (New) Place.searchByText.
 * Note: Never calls beta-only place.isOpen() on the weekly channel; reads
 * regularOpeningHours.weekdayDescriptions instead.
 */
export async function fetchNycCandidateBranches(
	placesLib: google.maps.PlacesLibrary
): Promise<BranchLocation[]> {
	const { Place } = placesLib;

	const searchResponses = await Promise.all(
		NYC_BRANCH_SEARCHES.map(async (category) => {
			const { places } = await Place.searchByText({
				textQuery: category.textQuery,
				fields: PLACE_SEARCH_FIELDS,
				locationBias: NYC_CENTER,
				language: 'en-US',
				region: 'us',
				maxResultCount: 8
			});
			return { places, defaultType: category.defaultType };
		})
	);

	const deduped = new Map<string, BranchLocation>();

	for (const { places, defaultType } of searchResponses) {
		for (const place of places) {
			if (!place.id || !place.location || deduped.has(place.id)) {
				continue;
			}

			const type = classifyBranchType(place, defaultType);
			const weekdayDescriptions = place.regularOpeningHours?.weekdayDescriptions ?? [];
			const placeTypes = place.types ?? [];

			deduped.set(place.id, {
				id: place.id,
				name: place.displayName ?? 'NYC Branch Location',
				address: place.formattedAddress ?? 'New York, NY',
				lat: place.location.lat(),
				lng: place.location.lng(),
				type,
				services: deriveServiceTags(type, weekdayDescriptions, placeTypes),
				rating: typeof place.rating === 'number' ? place.rating : null,
				userRatingCount:
					typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
				weekdayDescriptions,
				businessStatus: place.businessStatus ?? null,
				primaryType: place.primaryType ?? null,
				durationMillis: null,
				distanceMeters: null,
				durationText: null,
				distanceText: null
			});
		}
	}

	// Keep up to 24 branches so Route Matrix requests fit cleanly within per-request limits
	return Array.from(deduped.values()).slice(0, 24);
}

/**
 * Fetches NYC-biased Places API (New) Autocomplete suggestions using a session token.
 */
export async function fetchOriginSuggestions(
	placesLib: google.maps.PlacesLibrary,
	input: string,
	sessionToken: google.maps.places.AutocompleteSessionToken,
	origin: OriginLocation
): Promise<AutocompleteOption[]> {
	const trimmed = input.trim();
	if (trimmed.length < 2) {
		return [];
	}

	const { AutocompleteSuggestion } = placesLib;
	const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
		input: trimmed,
		sessionToken,
		locationBias: NYC_BOUNDS_LITERAL,
		origin: { lat: origin.lat, lng: origin.lng },
		language: 'en-US',
		region: 'us'
	});

	const options: AutocompleteOption[] = [];
	for (const suggestion of suggestions) {
		const prediction = suggestion.placePrediction;
		if (!prediction) continue;

		options.push({
			id: prediction.placeId,
			mainText: prediction.mainText?.text ?? prediction.text.text,
			secondaryText: prediction.secondaryText?.text ?? 'New York, NY',
			fullText: prediction.text.text,
			placePrediction: prediction
		});
	}

	return options;
}

/**
 * Resolves a selected PlacePrediction into coordinates and formatted address via Place.fetchFields().
 */
export async function resolvePlacePrediction(
	prediction: google.maps.places.PlacePrediction
): Promise<OriginLocation | null> {
	const place = prediction.toPlace();
	await place.fetchFields({
		fields: ['displayName', 'formattedAddress', 'location']
	});

	if (!place.location) {
		return null;
	}

	return {
		label: place.displayName ?? prediction.mainText?.text ?? 'Selected Origin',
		address: place.formattedAddress ?? prediction.text.text,
		lat: place.location.lat(),
		lng: place.location.lng()
	};
}

/**
 * Fallback Geocoder lookup when the user submits free-form text without selecting an autocomplete item.
 */
export async function geocodeOriginAddress(
	geocodingLib: google.maps.GeocodingLibrary,
	query: string
): Promise<OriginLocation | null> {
	const trimmed = query.trim();
	if (!trimmed) return null;

	const geocoder = new geocodingLib.Geocoder();
	const response = await geocoder.geocode({
		address: trimmed.toLowerCase().includes('new york') || trimmed.toLowerCase().includes('ny')
			? trimmed
			: `${trimmed}, New York, NY`,
		bounds: NYC_BOUNDS_LITERAL,
		region: 'US'
	});

	const first = response.results[0];
	if (!first?.geometry?.location) {
		return null;
	}

	return {
		label: trimmed,
		address: first.formatted_address ?? trimmed,
		lat: first.geometry.location.lat(),
		lng: first.geometry.location.lng()
	};
}
