import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import type {
	ClinicProfile,
	Coordinates,
	PlacePhotoItem,
	PlaceReviewItem,
	RouteSummary,
	TravelModeOption
} from '$lib/types/storefront';
import {
	computeOpenNowStatus,
	formatDistanceFallback,
	formatDurationFallback
} from '$lib/utils/opening-hours';

export const GMP_ATTRIBUTION_ID = 'gmp_git_agentsamples_v1.0.0';
export const CLINIC_SEED_QUERY = '450 Sutter Dental San Francisco';
export const CLINIC_FALLBACK_COORDS: Coordinates = { lat: 37.7896, lng: -122.4076 };
export const HOME_VISIT_RADIUS_METERS = 3500;
export const DEFAULT_ORIGIN = {
	label: 'Ferry Building, San Francisco, CA',
	address: '1 Ferry Building, San Francisco, CA 94111',
	location: { lat: 37.7955, lng: -122.3937 }
};

let optionsConfigured = false;

export interface LoadedMapsLibraries {
	core: google.maps.CoreLibrary;
	maps: google.maps.MapsLibrary;
	marker: google.maps.MarkerLibrary;
	places: google.maps.PlacesLibrary;
	routes: google.maps.RoutesLibrary;
	streetView: google.maps.StreetViewLibrary;
	geometry: google.maps.GeometryLibrary;
}

export function configureMapsLoader(apiKey: string): void {
	if (optionsConfigured) return;
	setOptions({
		key: apiKey,
		v: 'weekly',
		language: 'en',
		region: 'US'
	});
	optionsConfigured = true;
}

export async function loadMapsLibraries(apiKey: string): Promise<LoadedMapsLibraries> {
	configureMapsLoader(apiKey);
	const [core, maps, marker, places, routes, streetView, geometry] = await Promise.all([
		importLibrary('core'),
		importLibrary('maps'),
		importLibrary('marker'),
		importLibrary('places'),
		importLibrary('routes'),
		importLibrary('streetView'),
		importLibrary('geometry')
	]);

	return { core, maps, marker, places, routes, streetView, geometry };
}

/**
 * Builds a branded custom DOM element for the clinic's AdvancedMarkerElement
 * using safe DOM APIs only (no innerHTML).
 */
export function createClinicPinElement(label: string): HTMLElement {
	const wrapper = document.createElement('div');
	wrapper.className = 'clinic-marker-pin';

	const badge = document.createElement('div');
	badge.className = 'clinic-marker-badge';

	const svgNS = 'http://www.w3.org/2000/svg';
	const icon = document.createElementNS(svgNS, 'svg');
	icon.setAttribute('viewBox', '0 0 24 24');
	icon.setAttribute('width', '16');
	icon.setAttribute('height', '16');
	icon.setAttribute('aria-hidden', 'true');
	icon.setAttribute('fill', 'none');
	icon.setAttribute('stroke', 'currentColor');
	icon.setAttribute('stroke-width', '2.2');
	icon.setAttribute('stroke-linecap', 'round');
	icon.setAttribute('stroke-linejoin', 'round');

	const path = document.createElementNS(svgNS, 'path');
	path.setAttribute(
		'd',
		'M12 4v16M4 12h16'
	);
	icon.appendChild(path);

	const text = document.createElement('span');
	text.className = 'clinic-marker-text';
	text.textContent = label;

	const stem = document.createElement('div');
	stem.className = 'clinic-marker-stem';

	badge.appendChild(icon);
	badge.appendChild(text);
	wrapper.appendChild(badge);
	wrapper.appendChild(stem);

	return wrapper;
}

export async function fetchClinicProfile(
	placesLib: google.maps.PlacesLibrary,
	query: string = CLINIC_SEED_QUERY
): Promise<ClinicProfile> {
	const { Place } = placesLib;
	const { places } = await Place.searchByText({
		textQuery: query,
		fields: [
			'id',
			'displayName',
			'formattedAddress',
			'location',
			'rating',
			'userRatingCount',
			'regularOpeningHours',
			'reviews',
			'photos',
			'nationalPhoneNumber',
			'websiteURI',
			'googleMapsURI',
			'businessStatus',
			'utcOffsetMinutes'
		],
		locationBias: CLINIC_FALLBACK_COORDS,
		language: 'en-US',
		region: 'us',
		maxResultCount: 1
	});

	const place = places?.[0];
	if (!place) {
		throw new Error('No clinic place details returned from Places API (New).');
	}

	const coords: Coordinates = place.location
		? { lat: place.location.lat(), lng: place.location.lng() }
		: CLINIC_FALLBACK_COORDS;

	const photos: PlacePhotoItem[] = (place.photos ?? []).slice(0, 6).map((photo) => {
		const firstAttr = photo.authorAttributions?.[0];
		return {
			uri: photo.getURI({ maxWidth: 640 }),
			attribution: firstAttr?.displayName ?? null
		};
	});

	const reviews: PlaceReviewItem[] = (place.reviews ?? []).slice(0, 5).map((rev) => ({
		authorName: rev.authorAttribution?.displayName ?? 'Verified Visitor',
		authorUri: rev.authorAttribution?.uri ?? null,
		authorPhotoUri: rev.authorAttribution?.photoURI ?? null,
		rating: rev.rating ?? 5,
		relativePublishTimeDescription: rev.relativePublishTimeDescription ?? '',
		text: rev.text ?? ''
	}));

	return {
		placeId: place.id ?? null,
		displayName: place.displayName ?? '450 Sutter Dental Collective',
		formattedAddress: place.formattedAddress ?? '450 Sutter St, San Francisco, CA 94108',
		location: coords,
		rating: place.rating ?? null,
		userRatingCount: place.userRatingCount ?? null,
		weekdayDescriptions: place.regularOpeningHours?.weekdayDescriptions ?? [],
		openNow: computeOpenNowStatus(place.regularOpeningHours, place.utcOffsetMinutes),
		reviews,
		photos,
		nationalPhoneNumber: place.nationalPhoneNumber ?? null,
		websiteUri: place.websiteURI ?? null,
		googleMapsUri: place.googleMapsURI ?? null,
		businessStatus: place.businessStatus ?? null
	};
}

export interface ComputedRouteResult {
	polylines: google.maps.Polyline[];
	summary: RouteSummary;
	viewport: google.maps.LatLngBounds | null;
	path: google.maps.LatLngAltitude[] | null;
}

const MODE_COLORS: Record<TravelModeOption, string> = {
	DRIVING: '#0f766e',
	TRANSIT: '#2563eb',
	WALKING: '#d97706'
};

export async function computeRouteToClinic(
	routesLib: google.maps.RoutesLibrary,
	map: google.maps.Map,
	origin: Coordinates,
	originLabel: string,
	destination: Coordinates,
	destinationLabel: string,
	mode: TravelModeOption
): Promise<ComputedRouteResult> {
	const { Route, TravelMode, RoutingPreference } = routesLib;

	const travelModeMap: Record<TravelModeOption, google.maps.TravelMode> = {
		DRIVING: TravelMode.DRIVING,
		TRANSIT: TravelMode.TRANSIT,
		WALKING: TravelMode.WALKING
	};

	const request: google.maps.routes.ComputeRoutesRequest = {
		origin,
		destination,
		travelMode: travelModeMap[mode],
		fields: ['path', 'durationMillis', 'distanceMeters', 'localizedValues', 'viewport'],
		language: 'en-US',
		region: 'us'
	};

	if (mode === 'DRIVING') {
		request.routingPreference = RoutingPreference.TRAFFIC_AWARE;
	}

	const { routes } = await Route.computeRoutes(request);
	const route = routes?.[0];
	if (!route) {
		throw new Error(`No ${mode.toLowerCase()} route found for this origin.`);
	}

	const polylines = route.createPolylines({
		polylineOptions: {
			map,
			strokeColor: MODE_COLORS[mode],
			strokeWeight: 5,
			strokeOpacity: 0.9
		}
	});

	const durationText =
		route.localizedValues?.duration ?? formatDurationFallback(route.durationMillis);
	const distanceText =
		route.localizedValues?.distance ?? formatDistanceFallback(route.distanceMeters);

	return {
		polylines,
		summary: {
			travelMode: mode,
			durationText,
			distanceText,
			durationMillis: route.durationMillis ?? null,
			distanceMeters: route.distanceMeters ?? null,
			originLabel,
			destinationLabel
		},
		viewport: route.viewport ?? null,
		path: route.path ?? null
	};
}

export interface StreetViewInitResult {
	panorama: google.maps.StreetViewPanorama;
	available: boolean;
	description: string;
}

export async function initEntranceStreetView(
	streetViewLib: google.maps.StreetViewLibrary,
	geometryLib: google.maps.GeometryLibrary,
	coreLib: google.maps.CoreLibrary,
	container: HTMLElement,
	clinicCoords: Coordinates
): Promise<StreetViewInitResult> {
	const { StreetViewService, StreetViewPanorama, StreetViewPreference, StreetViewSource } =
		streetViewLib;
	const { spherical } = geometryLib;
	const { LatLng } = coreLib;

	const svService = new StreetViewService();
	const clinicLatLng = new LatLng(clinicCoords.lat, clinicCoords.lng);

	let panoData: google.maps.StreetViewPanoramaData | null = null;
	try {
		const res = await svService.getPanorama({
			location: clinicCoords,
			radius: 100,
			preference: StreetViewPreference.NEAREST,
			source: StreetViewSource.OUTDOOR
		});
		panoData = res.data;
	} catch {
		try {
			const fallbackRes = await svService.getPanorama({
				location: clinicCoords,
				radius: 150,
				preference: StreetViewPreference.BEST
			});
			panoData = fallbackRes.data;
		} catch {
			panoData = null;
		}
	}

	const panoId = panoData?.location?.pano;
	const panoLatLng = panoData?.location?.latLng;
	const heading = panoLatLng ? spherical.computeHeading(panoLatLng, clinicLatLng) : 20;

	const panorama = new StreetViewPanorama(container, {
		pano: panoId ?? undefined,
		position: panoId ? undefined : clinicCoords,
		pov: {
			heading,
			pitch: 8
		},
		zoom: 1,
		addressControl: true,
		linksControl: true,
		panControl: true,
		enableCloseButton: false
	});

	return {
		panorama,
		available: Boolean(panoId),
		description: panoData?.location?.description ?? 'Building entrance street view'
	};
}
