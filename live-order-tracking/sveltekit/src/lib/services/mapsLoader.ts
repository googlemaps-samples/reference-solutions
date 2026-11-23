import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

export interface LoadedGoogleMapsLibraries {
	maps: google.maps.MapsLibrary;
	marker: google.maps.MarkerLibrary;
	places: google.maps.PlacesLibrary;
	addressValidation: google.maps.AddressValidationLibrary;
	routes: google.maps.RoutesLibrary;
	geometry: google.maps.GeometryLibrary;
	core: google.maps.CoreLibrary;
}

let configuredKey: string | null = null;
let loadedLibrariesPromise: Promise<LoadedGoogleMapsLibraries> | null = null;

export function hasConfiguredMapsKey(apiKey: string | undefined): boolean {
	if (!apiKey) return false;
	const trimmed = apiKey.trim();
	return trimmed.length > 0 && trimmed !== 'your_google_maps_api_key_here';
}

export async function loadGoogleMapsLibraries(apiKey: string): Promise<LoadedGoogleMapsLibraries> {
	if (typeof window === 'undefined') {
		throw new Error('Google Maps JavaScript API can only be loaded in the browser.');
	}

	const trimmedKey = apiKey.trim();
	if (!hasConfiguredMapsKey(trimmedKey)) {
		throw new Error(
			'Missing PUBLIC_GOOGLE_MAPS_API_KEY. Set it in your .env file to load Google Maps Platform.'
		);
	}

	if (!loadedLibrariesPromise || configuredKey !== trimmedKey) {
		if (!configuredKey) {
			setOptions({
				key: trimmedKey,
				v: 'weekly',
				language: 'en',
				region: 'US'
			});
			configuredKey = trimmedKey;
		}

		loadedLibrariesPromise = (async () => {
			const [maps, marker, places, addressValidation, routes, geometry, core] = await Promise.all([
				importLibrary('maps'),
				importLibrary('marker'),
				importLibrary('places'),
				importLibrary('addressValidation'),
				importLibrary('routes'),
				importLibrary('geometry'),
				importLibrary('core')
			]);

			return {
				maps,
				marker,
				places,
				addressValidation,
				routes,
				geometry,
				core
			};
		})();
	}

	return loadedLibrariesPromise;
}
