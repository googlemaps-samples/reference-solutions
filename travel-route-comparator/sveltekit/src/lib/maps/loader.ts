import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

export interface LoadedGoogleMapsLibraries {
	core: google.maps.CoreLibrary;
	maps: google.maps.MapsLibrary;
	marker: google.maps.MarkerLibrary;
	places: google.maps.PlacesLibrary;
	routes: google.maps.RoutesLibrary;
	elevation: google.maps.ElevationLibrary;
}

let librariesPromise: Promise<LoadedGoogleMapsLibraries> | null = null;
let configuredApiKey: string | null = null;

export async function loadGoogleMapsLibraries(apiKey: string): Promise<LoadedGoogleMapsLibraries> {
	if (typeof window === 'undefined') {
		throw new Error('Google Maps Platform SDK can only be loaded in the browser.');
	}

	const trimmedKey = apiKey.trim();
	if (!trimmedKey || trimmedKey === 'your_google_maps_api_key_here') {
		throw new Error('MISSING_API_KEY');
	}

	if (librariesPromise && configuredApiKey === trimmedKey) {
		return librariesPromise;
	}

	configuredApiKey = trimmedKey;
	setOptions({
		key: trimmedKey,
		v: 'weekly',
		language: 'en',
		region: 'US',
		libraries: ['core', 'maps', 'marker', 'places', 'routes', 'elevation']
	});

	librariesPromise = (async () => {
		const [core, maps, marker, places, routes, elevation] = await Promise.all([
			importLibrary('core'),
			importLibrary('maps'),
			importLibrary('marker'),
			importLibrary('places'),
			importLibrary('routes'),
			importLibrary('elevation')
		]);

		return {
			core,
			maps,
			marker,
			places,
			routes,
			elevation
		};
	})();

	try {
		return await librariesPromise;
	} catch (error) {
		librariesPromise = null;
		throw error;
	}
}
