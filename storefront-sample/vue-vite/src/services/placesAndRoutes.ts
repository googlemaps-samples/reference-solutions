import type {
  ClinicPhotoItem,
  ClinicReviewItem,
  ClinicVenueData,
  ComputedRouteSummary,
  LatLngPoint,
  TravelModeKey,
} from '../types/storefront';
import {
  CLINIC_SEED_QUERY,
  formatDistanceMeters,
  formatDurationMillis,
  GMP_ATTRIBUTION_IDS,
  INITIAL_CLINIC_CENTER,
} from '../utils/formatters';
import { computeOpenNowStatus } from '../utils/hours';

export async function fetchClinicVenueDetails(
  placesLib: google.maps.PlacesLibrary
): Promise<ClinicVenueData | null> {
  const { Place } = placesLib;

  const request: google.maps.places.SearchByTextRequest = {
    textQuery: CLINIC_SEED_QUERY,
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
      'utcOffsetMinutes',
    ],
    locationBias: {
      center: INITIAL_CLINIC_CENTER,
      radius: 1500,
    },
    maxResultCount: 1,
    language: 'en-US',
    region: 'us',
    internalUsageAttributionIds: GMP_ATTRIBUTION_IDS,
  };

  const { places } = await Place.searchByText(request);
  const place = places?.[0];
  if (!place) {
    return null;
  }

  // Ensure rich fields are hydrated if searchByText omitted any sub-fields
  const missingRichFields: string[] = [];
  if (!place.reviews) missingRichFields.push('reviews');
  if (!place.photos) missingRichFields.push('photos');
  if (!place.regularOpeningHours) missingRichFields.push('regularOpeningHours');
  if (missingRichFields.length > 0) {
    try {
      await place.fetchFields({ fields: missingRichFields });
    } catch {
      // Non-fatal: proceed with fields returned by searchByText
    }
  }

  const location: LatLngPoint = place.location
    ? { lat: place.location.lat(), lng: place.location.lng() }
    : INITIAL_CLINIC_CENTER;

  const photos: ClinicPhotoItem[] = (place.photos ?? [])
    .slice(0, 6)
    .map((photo, index) => {
      const firstAuthor = photo.authorAttributions?.[0];
      return {
        id: `${place.id}-photo-${index}`,
        url: photo.getURI({ maxWidth: 640, maxHeight: 420 }),
        authorName: firstAuthor?.displayName ?? null,
        authorUri: firstAuthor?.uri ?? null,
      };
    });

  const reviews: ClinicReviewItem[] = (place.reviews ?? [])
    .slice(0, 5)
    .map((review, index) => ({
      id: `${place.id}-review-${index}`,
      authorName: review.authorAttribution?.displayName ?? 'Google User',
      authorUri: review.authorAttribution?.uri ?? null,
      authorPhotoUri: review.authorAttribution?.photoURI ?? null,
      rating: typeof review.rating === 'number' ? review.rating : null,
      relativePublishTime: review.relativePublishTimeDescription ?? '',
      text: review.text ?? review.originalText ?? '',
      googleMapsUri: review.googleMapsURI ?? null,
    }));

  const weekdayDescriptions =
    place.regularOpeningHours?.weekdayDescriptions ?? [];

  const openStatus = computeOpenNowStatus(
    place.regularOpeningHours,
    place.utcOffsetMinutes
  );

  return {
    id: place.id,
    displayName: place.displayName ?? '450 Sutter Dental Clinic',
    formattedAddress:
      place.formattedAddress ?? '450 Sutter St, San Francisco, CA 94108',
    location,
    rating: typeof place.rating === 'number' ? place.rating : null,
    userRatingCount:
      typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
    nationalPhoneNumber: place.nationalPhoneNumber ?? null,
    websiteUri: place.websiteURI ?? null,
    googleMapsUri: place.googleMapsURI ?? null,
    businessStatus: place.businessStatus ?? null,
    weekdayDescriptions,
    openStatus,
    photos,
    reviews,
  };
}

export interface RouteComputeOutput {
  route: google.maps.routes.Route;
  summary: ComputedRouteSummary;
}

export async function computeClinicRoute(
  routesLib: google.maps.RoutesLibrary,
  origin: LatLngPoint,
  originLabel: string,
  destination: LatLngPoint,
  destinationLabel: string,
  travelMode: TravelModeKey
): Promise<RouteComputeOutput | null> {
  const { Route, RoutingPreference } = routesLib;

  const request: google.maps.routes.ComputeRoutesRequest = {
    origin,
    destination,
    travelMode: travelMode as google.maps.TravelMode,
    fields: ['path', 'distanceMeters', 'durationMillis', 'localizedValues'],
    language: 'en-US',
    region: 'us',
    ...(travelMode === 'DRIVING'
      ? { routingPreference: RoutingPreference.TRAFFIC_AWARE }
      : {}),
  };

  const response = await Route.computeRoutes(request);
  const route = response.routes?.[0];
  if (!route) {
    return null;
  }

  const durationMillis =
    typeof route.durationMillis === 'number' && Number.isFinite(route.durationMillis)
      ? route.durationMillis
      : null;
  const distanceMeters =
    typeof route.distanceMeters === 'number' && Number.isFinite(route.distanceMeters)
      ? route.distanceMeters
      : null;

  const durationText =
    route.localizedValues?.duration ?? formatDurationMillis(durationMillis);
  const distanceText =
    route.localizedValues?.distance ?? formatDistanceMeters(distanceMeters);

  return {
    route,
    summary: {
      travelMode,
      durationText,
      distanceText,
      durationMillis,
      distanceMeters,
      originLabel,
      destinationLabel,
    },
  };
}
