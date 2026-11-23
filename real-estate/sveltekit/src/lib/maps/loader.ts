import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

export const GMP_USAGE_ATTRIBUTION_IDS = ['gmp_git_agentsamples_v1.0.0'] as const;
export const DEFAULT_MAP_ID = 'DEMO_MAP_ID';

export interface LoadedGmpLibraries {
	maps: google.maps.MapsLibrary;
	marker: google.maps.MarkerLibrary;
	places: google.maps.PlacesLibrary;
	routes: google.maps.RoutesLibrary;
	streetView: google.maps.StreetViewLibrary;
	geometry: google.maps.GeometryLibrary;
	geocoding: google.maps.GeocodingLibrary;
}

let configuredKey: string | null = null;
let librariesPromise: Promise<LoadedGmpLibraries> | null = null;

export function getPublicApiKey(): string {
	if (!browser) return '';
	const key = env.PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || '';
	if (!key || key === 'your_google_maps_api_key_here') {
		return '';
	}
	return key;
}

export function isApiKeyConfigured(): boolean {
	return getPublicApiKey().length > 0;
}

export async function loadGmpLibraries(): Promise<LoadedGmpLibraries> {
	if (!browser) {
		throw new Error('Google Maps Platform libraries can only be loaded in the browser.');
	}

	const key = getPublicApiKey();
	if (!key) {
		throw new Error('PUBLIC_GOOGLE_MAPS_API_KEY is not configured.');
	}

	if (!librariesPromise || configuredKey !== key) {
		configuredKey = key;
		setOptions({
			key,
			v: 'weekly',
			language: 'en',
			region: 'US',
			libraries: ['maps', 'marker', 'places', 'routes', 'streetView', 'geometry', 'geocoding']
		});

		librariesPromise = Promise.all([
			importLibrary('maps'),
			importLibrary('marker'),
			importLibrary('places'),
			importLibrary('routes'),
			importLibrary('streetView'),
			importLibrary('geometry'),
			importLibrary('geocoding')
		]).then(([maps, marker, places, routes, streetView, geometry, geocoding]) => ({
			maps,
			marker,
			places,
			routes,
			streetView,
			geometry,
			geocoding
		}));
	}

	return librariesPromise;
}
