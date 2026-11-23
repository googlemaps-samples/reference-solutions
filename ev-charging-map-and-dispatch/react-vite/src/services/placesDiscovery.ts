import type {
  DispatchProvider,
  EvConnectorSummary,
  LatLngLiteral,
  ProviderCategory,
} from '../types/dispatch';
import {
  formatConnectorType,
  haversineDistanceMeters,
} from '../utils/formatters';
import { evaluateOpeningStatus } from '../utils/hours';

const ATTRIBUTION_IDS = ['gmp_git_agentsamples_v1.0.0'];

const BASE_PLACE_FIELDS = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'rating',
  'userRatingCount',
  'primaryType',
  'types',
  'regularOpeningHours',
  'nationalPhoneNumber',
  'googleMapsURI',
];

const EV_PLACE_FIELDS = [...BASE_PLACE_FIELDS, 'evChargeOptions'];

function mapPlaceToProvider(
  place: google.maps.places.Place,
  category: ProviderCategory,
  origin: LatLngLiteral,
): DispatchProvider | null {
  if (!place.location) return null;

  const lat = place.location.lat();
  const lng = place.location.lng();
  const location = { lat, lng };
  const straightLineMeters = haversineDistanceMeters(origin, location);

  const evConnectors: EvConnectorSummary[] = [];
  let evTotalConnectors: number | null = null;
  let evAvailableConnectors: number | null = null;
  let evMaxKw: number | null = null;

  if (place.evChargeOptions) {
    evTotalConnectors = place.evChargeOptions.connectorCount ?? null;
    const aggregations = place.evChargeOptions.connectorAggregations ?? [];

    let availSum = 0;
    let hasAvailData = false;

    for (const agg of aggregations) {
      const rate =
        typeof agg.maxChargeRateKw === 'number' && agg.maxChargeRateKw > 0
          ? agg.maxChargeRateKw
          : null;
      if (rate !== null && (evMaxKw === null || rate > evMaxKw)) {
        evMaxKw = rate;
      }
      if (typeof agg.availableCount === 'number') {
        availSum += agg.availableCount;
        hasAvailData = true;
      }
      const rawType = agg.type ?? 'OTHER';
      evConnectors.push({
        type: rawType,
        label: formatConnectorType(rawType),
        count: agg.count ?? 0,
        availableCount: agg.availableCount ?? null,
        outOfServiceCount: agg.outOfServiceCount ?? null,
        maxChargeRateKw: rate,
      });
    }

    if (hasAvailData) {
      evAvailableConnectors = availSum;
    }
  }

  return {
    id: place.id,
    name: place.displayName ?? 'Unnamed Provider',
    category,
    address: place.formattedAddress ?? 'Seattle, WA',
    location,
    rating: typeof place.rating === 'number' ? place.rating : null,
    userRatingCount:
      typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
    phoneNumber: place.nationalPhoneNumber ?? null,
    googleMapsUri: place.googleMapsURI ?? null,
    primaryType: place.primaryType ?? null,
    openingStatus: evaluateOpeningStatus(place.regularOpeningHours),
    weekdayDescriptions: place.regularOpeningHours?.weekdayDescriptions ?? [],
    evTotalConnectors,
    evAvailableConnectors,
    evMaxKw,
    evConnectors,
    distanceMeters: null,
    durationSeconds: null,
    distanceText: null,
    durationText: null,
    straightLineMeters,
  };
}

async function searchCategoryNearby(
  PlaceClass: typeof google.maps.places.Place,
  origin: LatLngLiteral,
  radiusMeters: number,
  primaryType: 'electric_vehicle_charging_station' | 'car_repair',
  category: ProviderCategory,
): Promise<DispatchProvider[]> {
  const fields =
    category === 'ev_charging' ? EV_PLACE_FIELDS : BASE_PLACE_FIELDS;

  try {
    const { places } = await PlaceClass.searchNearby({
      fields,
      locationRestriction: {
        center: origin,
        radius: radiusMeters,
      },
      includedPrimaryTypes: [primaryType],
      maxResultCount: 12,
      rankPreference: 'DISTANCE',
      internalUsageAttributionIds: ATTRIBUTION_IDS,
    });

    if (places && places.length > 0) {
      return places
        .map((p) => mapPlaceToProvider(p, category, origin))
        .filter((p): p is DispatchProvider => p !== null);
    }
  } catch (err) {
    // If evChargeOptions or searchNearby fails under restricted key/fields, retry with base fields
    if (category === 'ev_charging') {
      try {
        const { places } = await PlaceClass.searchNearby({
          fields: BASE_PLACE_FIELDS,
          locationRestriction: {
            center: origin,
            radius: radiusMeters,
          },
          includedPrimaryTypes: [primaryType],
          maxResultCount: 12,
          rankPreference: 'DISTANCE',
          internalUsageAttributionIds: ATTRIBUTION_IDS,
        });
        if (places && places.length > 0) {
          return places
            .map((p) => mapPlaceToProvider(p, category, origin))
            .filter((p): p is DispatchProvider => p !== null);
        }
      } catch {
        // Fall through to searchByText fallback
      }
    } else {
      console.warn(`searchNearby failed for ${primaryType}:`, err);
    }
  }

  // Fallback to Place.searchByText biased around origin
  try {
    const textQuery =
      category === 'ev_charging'
        ? 'EV fast charging station'
        : 'auto repair roadside mechanic';

    const { places } = await PlaceClass.searchByText({
      textQuery,
      fields: BASE_PLACE_FIELDS,
      locationBias: {
        center: origin,
        radius: radiusMeters,
      },
      maxResultCount: 10,
      internalUsageAttributionIds: ATTRIBUTION_IDS,
    });

    return (places ?? [])
      .map((p) => mapPlaceToProvider(p, category, origin))
      .filter(
        (p): p is DispatchProvider =>
          p !== null && p.straightLineMeters <= radiusMeters * 1.15,
      );
  } catch (fallbackErr) {
    console.warn(`searchByText fallback failed for ${category}:`, fallbackErr);
    return [];
  }
}

export async function discoverNearbyProviders(
  placesLib: google.maps.PlacesLibrary,
  origin: LatLngLiteral,
  radiusKm: number,
): Promise<DispatchProvider[]> {
  const radiusMeters = radiusKm * 1000;
  const PlaceClass = placesLib.Place;

  const [evStations, repairShops] = await Promise.all([
    searchCategoryNearby(
      PlaceClass,
      origin,
      radiusMeters,
      'electric_vehicle_charging_station',
      'ev_charging',
    ),
    searchCategoryNearby(
      PlaceClass,
      origin,
      radiusMeters,
      'car_repair',
      'auto_repair',
    ),
  ]);

  // Deduplicate by Place ID while preserving both categories
  const seenIds = new Set<string>();
  const combined: DispatchProvider[] = [];

  for (const item of [...evStations, ...repairShops]) {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      combined.push(item);
    }
  }

  return combined;
}
