import { GMP_ATTRIBUTION_ID } from '$lib/constants/chicago';
import type { LoadedGoogleMapsLibraries } from '$lib/services/mapsLoader';
import type {
	AddressValidationResult,
	LatLngPoint,
	RouteComputationResult,
	RouteStepSummary
} from '$lib/types/delivery';
import { encodePolylineFallback } from '$lib/utils/deliveryPricing';

function extractLatLng(
	loc: google.maps.LatLng | google.maps.LatLngAltitude | google.maps.LatLngLiteral | null | undefined
): LatLngPoint | null {
	if (!loc) return null;
	if (typeof (loc as google.maps.LatLng).lat === 'function') {
		const latLng = loc as google.maps.LatLng;
		return { lat: latLng.lat(), lng: latLng.lng() };
	}
	const lit = loc as { lat: number; lng: number };
	if (typeof lit.lat === 'number' && typeof lit.lng === 'number') {
		return { lat: lit.lat, lng: lit.lng };
	}
	return null;
}

export async function validateCustomerAddress(
	libs: LoadedGoogleMapsLibraries,
	addressLine: string,
	options?: {
		autocompleteElement?: google.maps.places.PlaceAutocompleteElement;
		fallbackLocation?: LatLngPoint | null;
		fallbackPlaceId?: string;
	}
): Promise<AddressValidationResult> {
	try {
		const request: google.maps.addressValidation.AddressValidationRequest = {
			address: {
				regionCode: 'US',
				addressLines: [addressLine]
			},
			uspsCASSEnabled: true,
			internalUsageAttributionIds: [GMP_ATTRIBUTION_ID]
		};

		if (options?.autocompleteElement) {
			request.placeAutocompleteElement = options.autocompleteElement;
		}

		const response = await libs.addressValidation.AddressValidation.fetchAddressValidation(request);
		const coords = extractLatLng(response.geocode?.location) ?? options?.fallbackLocation ?? null;

		if (!coords) {
			throw new Error('Address Validation returned no geocoded coordinates.');
		}

		const verdict = response.verdict;
		const validationGranularity = String(verdict?.validationGranularity ?? 'OTHER');
		const geocodeGranularity = String(verdict?.geocodeGranularity ?? 'OTHER');
		const inputGranularity = String(verdict?.inputGranularity ?? 'OTHER');
		const addressComplete = Boolean(verdict?.addressComplete);
		const hasUnconfirmedComponents = Boolean(verdict?.hasUnconfirmedComponents);
		const hasInferredComponents = Boolean(verdict?.hasInferredComponents);
		const hasReplacedComponents = Boolean(verdict?.hasReplacedComponents);

		const deliverable =
			['PREMISE', 'SUB_PREMISE', 'PREMISE_PROXIMITY'].includes(validationGranularity) ||
			(addressComplete && !hasUnconfirmedComponents);

		return {
			inputAddress: addressLine,
			formattedAddress: response.address?.formattedAddress ?? addressLine,
			placeId: response.geocode?.placeId ?? options?.fallbackPlaceId ?? '',
			plusCode:
				response.geocode?.plusCode?.compoundCode ??
				response.geocode?.plusCode?.globalCode ??
				'',
			location: coords,
			verdict: {
				inputGranularity,
				validationGranularity,
				geocodeGranularity,
				addressComplete,
				hasUnconfirmedComponents,
				hasInferredComponents,
				hasReplacedComponents
			},
			metadata: response.metadata
				? {
						business: Boolean(response.metadata.business),
						residential: Boolean(response.metadata.residential),
						poBox: Boolean(response.metadata.poBox)
					}
				: null,
			uspsData: response.uspsData
				? {
						dpvConfirmation: response.uspsData.dpvConfirmation ?? 'N/A',
						carrierRoute: response.uspsData.carrierRoute ?? 'N/A',
						county: response.uspsData.county ?? 'Cook County',
						cassProcessed: Boolean(response.uspsData.cassProcessed),
						standardizedFirstLine:
							response.uspsData.standardizedAddress?.firstAddressLine ?? '',
						standardizedCityStateZip:
							response.uspsData.standardizedAddress?.cityStateZipAddressLine ?? ''
					}
				: null,
			deliverable,
			deliverabilityReason: deliverable
				? `Verified ${validationGranularity.toLowerCase().replace(/_/g, ' ')} drop-off point.`
				: `Granularity is ${validationGranularity}; please confirm street number or unit.`,
			source: 'js-sdk'
		};
	} catch (sdkError) {
		const bffRes = await fetch('/api/address/validate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ address: addressLine })
		});

		if (bffRes.ok) {
			return (await bffRes.json()) as AddressValidationResult;
		}

		const errBody = await bffRes.json().catch(() => ({}));
		const msg =
			(errBody as { error?: string }).error ??
			(sdkError instanceof Error ? sdkError.message : 'Address validation failed.');
		throw new Error(msg);
	}
}

export async function computeDeliveryRoute(
	libs: LoadedGoogleMapsLibraries,
	origin: LatLngPoint,
	destination: LatLngPoint
): Promise<RouteComputationResult> {
	try {
		const { Route } = libs.routes;
		const response = await Route.computeRoutes({
			origin,
			destination,
			travelMode: 'DRIVE' as google.maps.TravelMode,
			routingPreference: 'TRAFFIC_AWARE' as google.maps.routes.RoutingPreference,
			fields: [
				'distanceMeters',
				'durationMillis',
				'staticDurationMillis',
				'path',
				'legs',
				'localizedValues'
			],
			internalUsageAttributionIds: [GMP_ATTRIBUTION_ID]
		});

		const primary = response.routes?.[0];
		if (!primary) {
			throw new Error('No drivable route found between Fulton Market Hub and this address.');
		}

		const pathPoints: LatLngPoint[] = (primary.path ?? [])
			.map((pt) => extractLatLng(pt))
			.filter((pt): pt is LatLngPoint => pt !== null);

		const steps: RouteStepSummary[] =
			primary.legs?.[0]?.steps?.map((step) => ({
				instruction: step.instructions ?? 'Continue on current street',
				distanceMeters: step.distanceMeters ?? 0,
				durationSeconds: Math.round((step.staticDurationMillis ?? 0) / 1000)
			})) ?? [];

		let encodedPolyline = '';
		if (pathPoints.length >= 2) {
			try {
				encodedPolyline = libs.geometry.encoding.encodePath(pathPoints);
			} catch {
				encodedPolyline = encodePolylineFallback(pathPoints);
			}
		}

		return {
			distanceMeters: primary.distanceMeters ?? 0,
			durationSeconds: Math.round((primary.durationMillis ?? 0) / 1000),
			staticDurationSeconds: Math.round((primary.staticDurationMillis ?? 0) / 1000),
			encodedPolyline,
			path: pathPoints,
			steps,
			source: 'js-sdk'
		};
	} catch (sdkError) {
		const bffRes = await fetch('/api/routes/compute', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ origin, destination })
		});

		if (bffRes.ok) {
			const data = (await bffRes.json()) as Omit<RouteComputationResult, 'path'>;
			const decoded = data.encodedPolyline
				? libs.geometry.encoding
						.decodePath(data.encodedPolyline)
						.map((pt) => ({ lat: pt.lat(), lng: pt.lng() }))
				: [origin, destination];

			return {
				...data,
				path: decoded
			};
		}

		const errBody = await bffRes.json().catch(() => ({}));
		const msg =
			(errBody as { error?: string }).error ??
			(sdkError instanceof Error ? sdkError.message : 'Route calculation failed.');
		throw new Error(msg);
	}
}

export function buildStaticReceiptMapUrl(
	kitchen: LatLngPoint,
	dest: LatLngPoint,
	encodedPolyline: string
): string {
	const params = new URLSearchParams({
		kitchenLat: kitchen.lat.toFixed(6),
		kitchenLng: kitchen.lng.toFixed(6),
		destLat: dest.lat.toFixed(6),
		destLng: dest.lng.toFixed(6)
	});
	if (encodedPolyline) {
		params.set('enc', encodedPolyline);
	}
	return `/api/maps/static-receipt?${params.toString()}`;
}
