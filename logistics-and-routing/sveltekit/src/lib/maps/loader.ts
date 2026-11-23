import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

export interface LoadedGmpLibraries {
	core: google.maps.CoreLibrary;
	maps: google.maps.MapsLibrary;
	marker: google.maps.MarkerLibrary;
	places: google.maps.PlacesLibrary;
	routes: google.maps.RoutesLibrary;
	geometry: google.maps.GeometryLibrary;
}

export const GMP_ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';

let configured = false;
let librariesPromise: Promise<LoadedGmpLibraries> | null = null;

export async function loadGmpLibraries(apiKey: string): Promise<LoadedGmpLibraries> {
	if (typeof window === 'undefined') {
		throw new Error('Google Maps JavaScript API can only be loaded in the browser.');
	}

	if (!configured) {
		setOptions({
			key: apiKey,
			v: 'weekly',
			language: 'en',
			region: 'US'
		});
		configured = true;
	}

	if (!librariesPromise) {
		librariesPromise = Promise.all([
			importLibrary('core'),
			importLibrary('maps'),
			importLibrary('marker'),
			importLibrary('places'),
			importLibrary('routes'),
			importLibrary('geometry')
		]).then(([core, maps, marker, places, routes, geometry]) => ({
			core,
			maps,
			marker,
			places,
			routes,
			geometry
		}));
	}

	return librariesPromise;
}
