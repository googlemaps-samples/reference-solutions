import type {
  ComputedDispatchRoute,
  LatLngLiteral,
  ProviderCategory,
  ReverseGeocodeResult,
  RouteStep,
  ServiceProvider,
} from './types';

export function formatDistance(meters?: number): string {
  if (typeof meters !== 'number' || !Number.isFinite(meters)) {
    return '—';
  }
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds?: number): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) {
    return '—';
  }
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) {
    return `${mins} min`;
  }
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${hours} hr` : `${hours} hr ${rem} min`;
}

export function formatManeuverLabel(maneuver?: string): string {
  if (!maneuver || maneuver === 'MANEUVER_UNSPECIFIED') return 'Continue';
  return maneuver
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function reverseGeocodeDriverLocation(
  location: LatLngLiteral
): Promise<ReverseGeocodeResult> {
  const params = new URLSearchParams({
    lat: String(location.lat),
    lng: String(location.lng),
  });

  const res = await fetch(`/api/geocode/reverse?${params.toString()}`, {
    cache: 'no-store',
  });

  if (res.ok) {
    return (await res.json()) as ReverseGeocodeResult;
  }

  // Fallback to Maps JS Geocoder if server proxy is blocked (e.g. HTTP referrer-restricted key)
  if (
    typeof window !== 'undefined' &&
    window.google?.maps &&
    typeof window.google.maps.importLibrary === 'function'
  ) {
    const geocodingLib = (await window.google.maps.importLibrary(
      'geocoding'
    )) as google.maps.GeocodingLibrary;
    const geocoder = new geocodingLib.Geocoder();
    const response = await geocoder.geocode({ location });
    const formatted =
      response.results?.[0]?.formatted_address ||
      `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
    const parts = formatted.split(',').map((s) => s.trim());
    return {
      formattedAddress: formatted,
      shortLabel: parts.length >= 2 ? `${parts[0]}, ${parts[1]}` : formatted,
      placeId: response.results?.[0]?.place_id,
    };
  }

  const errData = (await res.json().catch(() => ({}))) as { error?: string };
  throw new Error(errData.error || 'Unable to reverse geocode location.');
}

export async function fetchNearbyProviders(
  origin: LatLngLiteral,
  radiusKm: number,
  includedTypes: string[] = ['electric_vehicle_charging_station', 'car_repair']
): Promise<ServiceProvider[]> {
  const radiusMeters = radiusKm * 1000;
  const res = await fetch('/api/places/nearby', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lat: origin.lat,
      lng: origin.lng,
      radiusMeters,
      includedTypes,
    }),
    cache: 'no-store',
  });

  if (res.ok) {
    const data = (await res.json()) as { places: ServiceProvider[] };
    return data.places ?? [];
  }

  // Fallback to Places JS SDK Place.searchNearby if server proxy is blocked by referrer restriction
  if (
    typeof window !== 'undefined' &&
    window.google?.maps &&
    typeof window.google.maps.importLibrary === 'function'
  ) {
    const placesLib = (await window.google.maps.importLibrary(
      'places'
    )) as google.maps.PlacesLibrary;

    const results: ServiceProvider[] = [];
    const seen: Record<string, boolean> = {};

    for (const typeName of includedTypes) {
      const { places } = await placesLib.Place.searchNearby({
        fields: [
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
        ],
        locationRestriction: {
          center: origin,
          radius: radiusMeters,
        },
        includedTypes: [typeName],
        maxResultCount: 10,
      });

      const category: ProviderCategory =
        typeName === 'electric_vehicle_charging_station' ? 'ev' : 'repair';

      for (const p of places) {
        if (!p.id || !p.location || seen[p.id]) continue;
        seen[p.id] = true;
        const pLoc = { lat: p.location.lat(), lng: p.location.lng() };
        results.push({
          id: p.id,
          name: p.displayName || 'Service Provider',
          address: p.formattedAddress || 'Seattle, WA',
          location: pLoc,
          category,
          primaryType: p.primaryType ?? undefined,
          types: p.types,
          rating: typeof p.rating === 'number' ? p.rating : undefined,
          userRatingCount:
            typeof p.userRatingCount === 'number' ? p.userRatingCount : undefined,
          weekdayDescriptions: p.regularOpeningHours?.weekdayDescriptions,
          phone: p.nationalPhoneNumber ?? undefined,
          googleMapsUri: p.googleMapsURI ?? undefined,
          straightLineMeters: computeDistanceMetersClient(origin, pLoc),
        });
      }
    }

    return results.sort((a, b) => a.straightLineMeters - b.straightLineMeters);
  }

  const errData = (await res.json().catch(() => ({}))) as { error?: string };
  throw new Error(errData.error || 'Failed to load nearby providers.');
}

export async function searchProvidersByText(
  textQuery: string,
  origin: LatLngLiteral,
  radiusKm: number
): Promise<ServiceProvider[]> {
  const res = await fetch('/api/places/search-text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      textQuery,
      lat: origin.lat,
      lng: origin.lng,
      radiusMeters: radiusKm * 1000,
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errData = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(errData.error || 'Failed to search providers.');
  }

  const data = (await res.json()) as { places: ServiceProvider[] };
  return data.places ?? [];
}

export async function enrichWithRouteMatrix(
  origin: LatLngLiteral,
  providers: ServiceProvider[]
): Promise<ServiceProvider[]> {
  if (providers.length === 0) return providers;

  const batch = providers.slice(0, 25);

  try {
    const res = await fetch('/api/routes/matrix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin,
        destinations: batch.map((p) => ({
          id: p.id,
          lat: p.location.lat,
          lng: p.location.lng,
        })),
      }),
      cache: 'no-store',
    });

    if (!res.ok) {
      return providers;
    }

    const data = (await res.json()) as {
      elements?: Array<{
        destinationId: string;
        condition?: string;
        distanceMeters?: number;
        durationSeconds?: number;
      }>;
    };

    const byId: Record<
      string,
      { distanceMeters?: number; durationSeconds?: number }
    > = {};

    for (const el of data.elements ?? []) {
      if (el.destinationId) {
        byId[el.destinationId] = {
          distanceMeters: el.distanceMeters,
          durationSeconds: el.durationSeconds,
        };
      }
    }

    const merged = providers.map((p) => {
      const metrics = byId[p.id];
      if (!metrics) return p;
      return {
        ...p,
        distanceMeters: metrics.distanceMeters ?? p.distanceMeters,
        durationSeconds: metrics.durationSeconds ?? p.durationSeconds,
      };
    });

    return merged.sort((a, b) => {
      const etaA = a.durationSeconds ?? Number.MAX_SAFE_INTEGER;
      const etaB = b.durationSeconds ?? Number.MAX_SAFE_INTEGER;
      if (etaA !== etaB) return etaA - etaB;
      return a.straightLineMeters - b.straightLineMeters;
    });
  } catch {
    return providers;
  }
}

export async function computeDispatchRoute(
  origin: LatLngLiteral,
  destinationProvider: ServiceProvider
): Promise<ComputedDispatchRoute> {
  const res = await fetch('/api/routes/compute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin,
      destination: destinationProvider.location,
    }),
    cache: 'no-store',
  });

  if (res.ok) {
    const data = (await res.json()) as {
      encodedPolyline: string;
      distanceMeters: number;
      durationSeconds: number;
      viewport?: { low: LatLngLiteral; high: LatLngLiteral };
      steps: RouteStep[];
    };

    return {
      destinationId: destinationProvider.id,
      destinationName: destinationProvider.name,
      destinationCategory: destinationProvider.category,
      encodedPolyline: data.encodedPolyline,
      distanceMeters: data.distanceMeters,
      durationSeconds: data.durationSeconds,
      viewport: data.viewport,
      steps: data.steps ?? [],
    };
  }

  const errData = (await res.json().catch(() => ({}))) as { error?: string };
  throw new Error(errData.error || 'Unable to compute dispatch route.');
}

function computeDistanceMetersClient(
  a: LatLngLiteral,
  b: LatLngLiteral
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return Math.round(2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}
