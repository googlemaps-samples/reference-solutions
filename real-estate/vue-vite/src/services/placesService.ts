import type {
  AmenityCategory,
  LatLngPoint,
  NearbyAmenity,
  WorkplaceSuggestion,
} from '../types/realEstate';
import { SF_CENTER } from '../data/properties';

const CATEGORY_TYPES: Record<AmenityCategory, string[]> = {
  all: [
    'school',
    'primary_school',
    'secondary_school',
    'supermarket',
    'grocery_store',
    'transit_station',
    'subway_station',
    'light_rail_station',
    'bus_station',
  ],
  schools: ['school', 'primary_school', 'secondary_school', 'university'],
  groceries: ['supermarket', 'grocery_store'],
  transit: [
    'transit_station',
    'subway_station',
    'light_rail_station',
    'bus_station',
    'train_station',
  ],
};

function classifyPrimaryType(primaryType: string | null | undefined): Exclude<AmenityCategory, 'all'> {
  const t = (primaryType ?? '').toLowerCase();
  if (t.includes('school') || t.includes('university')) {
    return 'schools';
  }
  if (t.includes('grocery') || t.includes('supermarket') || t.includes('market')) {
    return 'groceries';
  }
  return 'transit';
}

export async function fetchNearbyAmenities(
  center: LatLngPoint,
  category: AmenityCategory,
  placesLib: google.maps.PlacesLibrary,
  geometryLib: google.maps.GeometryLibrary
): Promise<NearbyAmenity[]> {
  const { Place, SearchNearbyRankPreference } = placesLib;
  const { places } = await Place.searchNearby({
    fields: [
      'id',
      'displayName',
      'formattedAddress',
      'location',
      'primaryType',
      'rating',
      'userRatingCount',
    ],
    locationRestriction: {
      center,
      radius: 5000,
    },
    includedPrimaryTypes: CATEGORY_TYPES[category],
    maxResultCount: 12,
    rankPreference: SearchNearbyRankPreference.DISTANCE,
    language: 'en-US',
    region: 'us',
  });

  const originLatLng = new google.maps.LatLng(center.lat, center.lng);

  return (places ?? [])
    .filter((place) => Boolean(place.location))
    .map((place) => {
      const loc = place.location!;
      const distanceMeters = geometryLib.spherical.computeDistanceBetween(originLatLng, loc);
      return {
        id: place.id,
        name: place.displayName ?? 'Unnamed Place',
        address: place.formattedAddress ?? '',
        primaryType: (place.primaryType ?? 'place').replace(/_/g, ' '),
        category: classifyPrimaryType(place.primaryType),
        location: { lat: loc.lat(), lng: loc.lng() },
        distanceMeters,
        rating: typeof place.rating === 'number' ? place.rating : null,
        userRatingCount:
          typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
      };
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

export async function fetchWorkplaceSuggestions(
  input: string,
  placesLib: google.maps.PlacesLibrary,
  sessionToken?: google.maps.places.AutocompleteSessionToken
): Promise<WorkplaceSuggestion[]> {
  const trimmed = input.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const { AutocompleteSuggestion } = placesLib;
  const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input: trimmed,
    sessionToken,
    includedRegionCodes: ['us'],
    locationBias: {
      center: SF_CENTER,
      radius: 30000,
    },
    language: 'en-US',
    region: 'us',
  });

  return suggestions
    .filter((s) => Boolean(s.placePrediction))
    .slice(0, 5)
    .map((s) => {
      const pred = s.placePrediction!;
      return {
        id: pred.placeId,
        mainText: pred.mainText?.text ?? pred.text.text,
        secondaryText: pred.secondaryText?.text ?? '',
        fullText: pred.text.text,
        placePrediction: pred,
      };
    });
}

export async function resolvePlaceFromTextQuery(
  textQuery: string,
  placesLib: google.maps.PlacesLibrary
): Promise<{ name: string; address: string; location: LatLngPoint; place: google.maps.places.Place } | null> {
  const { Place } = placesLib;
  const { places } = await Place.searchByText({
    textQuery,
    fields: ['id', 'displayName', 'formattedAddress', 'location'],
    locationBias: {
      center: SF_CENTER,
      radius: 30000,
    },
    maxResultCount: 1,
    language: 'en-US',
    region: 'us',
  });

  const match = places?.[0];
  if (!match || !match.location) {
    return null;
  }

  return {
    name: match.displayName ?? textQuery,
    address: match.formattedAddress ?? textQuery,
    location: {
      lat: match.location.lat(),
      lng: match.location.lng(),
    },
    place: match,
  };
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
}
