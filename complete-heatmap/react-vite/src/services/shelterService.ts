import type { FloodZone, LatLngPoint, ShelterPlace } from '../types/hazard';
import { findContainingFloodZone } from './enrichmentService';

function haversineMeters(a: LatLngPoint, b: LatLngPoint): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export async function searchEmergencyShelters(params: {
  query: string;
  origin: LatLngPoint;
  placesLib: google.maps.PlacesLibrary;
  geometryLib: google.maps.GeometryLibrary | null;
  floodZones: FloodZone[];
}): Promise<ShelterPlace[]> {
  const { query, origin, placesLib, geometryLib, floodZones } = params;
  const { Place } = placesLib;

  const trimmed = query.trim();
  const textQuery = trimmed
    ? trimmed.toLowerCase().includes('miami')
      ? trimmed
      : `${trimmed} in Miami, FL`
    : 'hospital and community center in Miami, FL';

  const request: google.maps.places.SearchByTextRequest = {
    textQuery,
    fields: [
      'id',
      'displayName',
      'formattedAddress',
      'location',
      'types',
      'rating',
      'userRatingCount',
      'businessStatus',
      'regularOpeningHours',
    ],
    locationBias: {
      center: origin,
      radius: 12000,
    },
    maxResultCount: 10,
    language: 'en-US',
    region: 'us',
  };

  const { places } = await Place.searchByText(request);

  const mapped: ShelterPlace[] = [];
  for (const place of places ?? []) {
    if (!place.location) continue;
    const loc: LatLngPoint = {
      lat: place.location.lat(),
      lng: place.location.lng(),
    };
    const zone = findContainingFloodZone(loc, floodZones, geometryLib);
    const weekdayDescriptions = place.regularOpeningHours?.weekdayDescriptions;
    const hoursSummary =
      weekdayDescriptions && weekdayDescriptions.length > 0
        ? weekdayDescriptions[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] ??
          weekdayDescriptions[0]
        : null;

    mapped.push({
      id: place.id,
      displayName: place.displayName ?? 'Miami Emergency Facility',
      formattedAddress: place.formattedAddress ?? 'Miami, FL',
      location: loc,
      types: place.types ?? [],
      rating: place.rating ?? null,
      userRatingCount: place.userRatingCount ?? null,
      businessStatus: place.businessStatus ?? null,
      hoursSummary,
      insideFloodZone: Boolean(zone),
      straightLineMeters: Math.round(haversineMeters(origin, loc)),
    });
  }

  // Prioritize shelters outside active flood-hazard polygons, then sort by proximity
  mapped.sort((a, b) => {
    if (a.insideFloodZone !== b.insideFloodZone) {
      return a.insideFloodZone ? 1 : -1;
    }
    return a.straightLineMeters - b.straightLineMeters;
  });

  return mapped;
}
