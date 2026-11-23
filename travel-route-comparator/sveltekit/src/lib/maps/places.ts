import type { ResolvedPlace } from '$lib/types';

export const FRONT_RANGE_BIAS = {
	center: { lat: 39.884, lng: -105.135 },
	radius: 45000
};

export const SEED_ORIGIN_QUERY = 'Denver Union Station, Denver, CO';
export const SEED_DESTINATION_QUERY = 'Chautauqua Park, Boulder, CO';

export async function resolvePlaceByText(
	placesLib: google.maps.PlacesLibrary,
	textQuery: string
): Promise<ResolvedPlace> {
	const { places } = await placesLib.Place.searchByText({
		textQuery,
		fields: ['id', 'displayName', 'formattedAddress', 'location'],
		locationBias: FRONT_RANGE_BIAS,
		maxResultCount: 1,
		language: 'en-US',
		region: 'us'
	});

	const match = places[0];
	if (!match || !match.location) {
		throw new Error(`No location found for "${textQuery}".`);
	}

	return {
		id: match.id ?? textQuery,
		displayName: match.displayName ?? textQuery,
		formattedAddress: match.formattedAddress ?? textQuery,
		location: {
			lat: match.location.lat(),
			lng: match.location.lng()
		}
	};
}

export interface AutocompleteMountOptions {
	placeholder: string;
	ariaLabel: string;
	onSelect: (place: ResolvedPlace) => void;
	onError?: (message: string) => void;
}

export function mountPlaceAutocomplete(
	placesLib: google.maps.PlacesLibrary,
	container: HTMLElement,
	options: AutocompleteMountOptions
): () => void {
	const element = new placesLib.PlaceAutocompleteElement({
		locationBias: FRONT_RANGE_BIAS,
		includedRegionCodes: ['us'],
		placeholder: options.placeholder
	});
	element.setAttribute('aria-label', options.ariaLabel);

	const handleSelect = async (event: Event) => {
		const selectEvent = event as google.maps.places.PlacePredictionSelectEvent;
		if (!selectEvent.placePrediction) return;

		try {
			const place = selectEvent.placePrediction.toPlace();
			await place.fetchFields({
				fields: ['id', 'displayName', 'formattedAddress', 'location']
			});
			if (!place.location) {
				options.onError?.('Selected place has no geographic coordinates.');
				return;
			}
			options.onSelect({
				id: place.id ?? '',
				displayName: place.displayName ?? place.formattedAddress ?? 'Selected Place',
				formattedAddress: place.formattedAddress ?? place.displayName ?? '',
				location: {
					lat: place.location.lat(),
					lng: place.location.lng()
				}
			});
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Unable to fetch selected place details.';
			options.onError?.(msg);
		}
	};

	const handleError = () => {
		options.onError?.('Places Autocomplete request was rejected. Verify your API key and enabled APIs.');
	};

	element.addEventListener('gmp-select', handleSelect);
	element.addEventListener('gmp-error', handleError);
	container.replaceChildren(element);

	return () => {
		element.removeEventListener('gmp-select', handleSelect);
		element.removeEventListener('gmp-error', handleError);
		container.replaceChildren();
	};
}
