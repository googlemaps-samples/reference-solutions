import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

export interface LoadedMapsLibraries {
	core: google.maps.CoreLibrary;
	maps: google.maps.MapsLibrary;
	marker: google.maps.MarkerLibrary;
	places: google.maps.PlacesLibrary;
	routes: google.maps.RoutesLibrary;
	geocoding: google.maps.GeocodingLibrary;
	geometry: google.maps.GeometryLibrary;
}

let loaderPromise: Promise<LoadedMapsLibraries> | null = null;
let configuredApiKey: string | null = null;

/**
 * Loads all required Google Maps Platform JS libraries once via @googlemaps/js-api-loader v2.
 * Must only be called in the browser (inside Svelte onMount or client-side handlers).
 */
export async function loadMapsLibraries(apiKey: string): Promise<LoadedMapsLibraries> {
	if (!apiKey) {
		throw new Error('Missing PUBLIC_GOOGLE_MAPS_API_KEY.');
	}

	if (loaderPromise && configuredApiKey === apiKey) {
		return loaderPromise;
	}

	if (!configuredApiKey) {
		setOptions({
			key: apiKey,
			v: 'weekly',
			language: 'en',
			region: 'US',
			libraries: ['core', 'maps', 'marker', 'places', 'routes', 'geocoding', 'geometry']
		});
		configuredApiKey = apiKey;
	}

	loaderPromise = Promise.all([
		importLibrary('core'),
		importLibrary('maps'),
		importLibrary('marker'),
		importLibrary('places'),
		importLibrary('routes'),
		importLibrary('geocoding'),
		importLibrary('geometry')
	]).then(([core, maps, marker, places, routes, geocoding, geometry]) => ({
		core,
		maps,
		marker,
		places,
		routes,
		geocoding,
		geometry
	}));

	try {
		return await loaderPromise;
	} catch (error) {
		loaderPromise = null;
		throw error;
	}
}
