import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import type { RequestHandler } from './$types';

const ADDRESS_VALIDATION_URL = 'https://addressvalidation.googleapis.com/v1:validateAddress';

interface RestAddressValidationPayload {
	result?: {
		verdict?: {
			inputGranularity?: string;
			validationGranularity?: string;
			geocodeGranularity?: string;
			addressComplete?: boolean;
			hasUnconfirmedComponents?: boolean;
			hasInferredComponents?: boolean;
			hasReplacedComponents?: boolean;
		};
		address?: {
			formattedAddress?: string;
		};
		geocode?: {
			location?: { latitude?: number; longitude?: number };
			placeId?: string;
			plusCode?: { globalCode?: string; compoundCode?: string };
		};
		metadata?: {
			business?: boolean;
			residential?: boolean;
			poBox?: boolean;
		};
		uspsData?: {
			dpvConfirmation?: string;
			carrierRoute?: string;
			county?: string;
			cassProcessed?: boolean;
			standardizedAddress?: {
				firstAddressLine?: string;
				cityStateZipAddressLine?: string;
			};
		};
	};
	error?: {
		message?: string;
		status?: string;
	};
}

export const POST: RequestHandler = async ({ request }) => {
	const apiKey = env.PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
	if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
		return json(
			{ error: 'PUBLIC_GOOGLE_MAPS_API_KEY is not configured on the server.' },
			{ status: 503 }
		);
	}

	let body: { address?: unknown };
	try {
		body = (await request.json()) as { address?: unknown };
	} catch {
		return json({ error: 'Invalid JSON request body.' }, { status: 400 });
	}

	const addressLine = typeof body.address === 'string' ? body.address.trim() : '';
	if (!addressLine || addressLine.length > 300) {
		return json({ error: 'A valid delivery address string is required.' }, { status: 400 });
	}

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		'X-Goog-Api-Key': apiKey
	};
	const referer = request.headers.get('referer');
	if (referer) {
		headers['Referer'] = referer;
	}

	const upstreamRes = await fetch(ADDRESS_VALIDATION_URL, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			address: {
				regionCode: 'US',
				addressLines: [addressLine]
			},
			enableUspsCass: true
		})
	});

	const payload = (await upstreamRes.json()) as RestAddressValidationPayload;
	if (!upstreamRes.ok || !payload.result) {
		return json(
			{ error: payload.error?.message ?? 'Address Validation API request failed.' },
			{ status: upstreamRes.status || 502 }
		);
	}

	const { verdict, address, geocode, metadata, uspsData } = payload.result;
	const lat = geocode?.location?.latitude;
	const lng = geocode?.location?.longitude;
	if (typeof lat !== 'number' || typeof lng !== 'number') {
		return json({ error: 'Address could not be geocoded to coordinates.' }, { status: 422 });
	}

	const validationGranularity = verdict?.validationGranularity ?? 'OTHER';
	const geocodeGranularity = verdict?.geocodeGranularity ?? 'OTHER';
	const addressComplete = Boolean(verdict?.addressComplete);
	const deliverable =
		['PREMISE', 'SUB_PREMISE', 'PREMISE_PROXIMITY'].includes(validationGranularity) ||
		(addressComplete && !verdict?.hasUnconfirmedComponents);

	return json({
		inputAddress: addressLine,
		formattedAddress: address?.formattedAddress ?? addressLine,
		placeId: geocode?.placeId ?? '',
		plusCode: geocode?.plusCode?.compoundCode ?? geocode?.plusCode?.globalCode ?? '',
		location: { lat, lng },
		verdict: {
			inputGranularity: verdict?.inputGranularity ?? 'OTHER',
			validationGranularity,
			geocodeGranularity,
			addressComplete,
			hasUnconfirmedComponents: Boolean(verdict?.hasUnconfirmedComponents),
			hasInferredComponents: Boolean(verdict?.hasInferredComponents),
			hasReplacedComponents: Boolean(verdict?.hasReplacedComponents)
		},
		metadata: metadata
			? {
					business: Boolean(metadata.business),
					residential: Boolean(metadata.residential),
					poBox: Boolean(metadata.poBox)
				}
			: null,
		uspsData: uspsData
			? {
					dpvConfirmation: uspsData.dpvConfirmation ?? 'N/A',
					carrierRoute: uspsData.carrierRoute ?? 'N/A',
					county: uspsData.county ?? 'Cook County',
					cassProcessed: Boolean(uspsData.cassProcessed),
					standardizedFirstLine: uspsData.standardizedAddress?.firstAddressLine ?? '',
					standardizedCityStateZip:
						uspsData.standardizedAddress?.cityStateZipAddressLine ?? ''
				}
			: null,
		deliverable,
		deliverabilityReason: deliverable
			? `Verified ${validationGranularity.toLowerCase().replace(/_/g, ' ')} drop-off point.`
			: `Granularity is ${validationGranularity}; please confirm street number or unit.`,
		source: 'bff'
	});
};
