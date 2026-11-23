import type { CandidateDriver, LatLngPoint } from '../types/rideshare';
import { formatDistanceMiles, formatDuration } from './fares';

export const INITIAL_CANDIDATE_DRIVERS: CandidateDriver[] = [
  {
    id: 'drv-arts-district',
    name: 'Elena Vance',
    rating: 4.96,
    vehicleModel: 'Toyota Prius Prime',
    vehicleColor: 'Emerald Pearl',
    licensePlate: '8ECO412',
    tier: 'green',
    emissionType: 'HYBRID',
    position: { lat: 34.0446, lng: -118.2339 },
    etaToPickupSeconds: null,
    distanceToPickupMeters: null,
    etaText: 'Evaluating...',
    distanceText: '--',
  },
  {
    id: 'drv-bunker-hill',
    name: 'Marcus Thorne',
    rating: 4.93,
    vehicleModel: 'Tesla Model 3 Long Range',
    vehicleColor: 'Midnight Silver',
    licensePlate: '9EVLA77',
    tier: 'green',
    emissionType: 'ELECTRIC',
    position: { lat: 34.0548, lng: -118.2508 },
    etaToPickupSeconds: null,
    distanceToPickupMeters: null,
    etaText: 'Evaluating...',
    distanceText: '--',
  },
  {
    id: 'drv-chinatown',
    name: 'Sofia Reyes',
    rating: 4.89,
    vehicleModel: 'Honda Civic Touring',
    vehicleColor: 'Sonic Gray',
    licensePlate: '7LAX309',
    tier: 'economy',
    emissionType: 'GASOLINE',
    position: { lat: 34.0638, lng: -118.2389 },
    etaToPickupSeconds: null,
    distanceToPickupMeters: null,
    etaText: 'Evaluating...',
    distanceText: '--',
  },
  {
    id: 'drv-south-park',
    name: 'Devon Kim',
    rating: 4.98,
    vehicleModel: 'Lexus ES 300h',
    vehicleColor: 'Obsidian',
    licensePlate: '8CMP904',
    tier: 'comfort',
    emissionType: 'HYBRID',
    position: { lat: 34.0414, lng: -118.2654 },
    etaToPickupSeconds: null,
    distanceToPickupMeters: null,
    etaText: 'Evaluating...',
    distanceText: '--',
  },
];

/**
 * Evaluates live driving ETA and distance from all candidate vehicles to the pickup
 * location using the Maps JavaScript SDK `RouteMatrix.computeRouteMatrix` API.
 */
export async function rankDriversWithRouteMatrix(
  drivers: CandidateDriver[],
  pickupLocation: LatLngPoint,
  routesLib: google.maps.RoutesLibrary,
  geometryLib: google.maps.GeometryLibrary,
): Promise<CandidateDriver[]> {
  try {
    const { RouteMatrix, RoutingPreference, TravelMode } = routesLib;
    const { matrix } = await RouteMatrix.computeRouteMatrix({
      origins: drivers.map((d) => d.position),
      destinations: [pickupLocation],
      travelMode: TravelMode.DRIVING,
      routingPreference: RoutingPreference.TRAFFIC_AWARE_OPTIMAL,
      fields: [
        'condition',
        'distanceMeters',
        'durationMillis',
        'localizedValues',
      ],
      internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
    });

    const enriched = drivers.map((driver, index) => {
      const item = matrix.rows[index]?.items[0];
      if (
        item &&
        item.condition === 'ROUTE_EXISTS' &&
        item.durationMillis != null &&
        item.distanceMeters != null
      ) {
        return {
          ...driver,
          etaToPickupSeconds: Math.max(30, Math.round(item.durationMillis / 1000)),
          distanceToPickupMeters: item.distanceMeters,
          etaText: item.localizedValues?.duration ?? formatDuration(item.durationMillis),
          distanceText:
            item.localizedValues?.distance ??
            formatDistanceMiles(item.distanceMeters),
        };
      }
      return fallbackDriverDistance(driver, pickupLocation, geometryLib);
    });

    return [...enriched].sort(
      (a, b) =>
        (a.etaToPickupSeconds ?? Number.POSITIVE_INFINITY) -
        (b.etaToPickupSeconds ?? Number.POSITIVE_INFINITY),
    );
  } catch (err) {
    console.warn('RouteMatrix lookup failed; using spherical distance fallback:', err);
    return drivers
      .map((d) => fallbackDriverDistance(d, pickupLocation, geometryLib))
      .sort(
        (a, b) =>
          (a.etaToPickupSeconds ?? Number.POSITIVE_INFINITY) -
          (b.etaToPickupSeconds ?? Number.POSITIVE_INFINITY),
      );
  }
}

function fallbackDriverDistance(
  driver: CandidateDriver,
  pickupLocation: LatLngPoint,
  geometryLib: google.maps.GeometryLibrary,
): CandidateDriver {
  const straightMeters = geometryLib.spherical.computeDistanceBetween(
    driver.position,
    pickupLocation,
  );
  // Urban LA road multiplier (~1.35x) & ~9 m/s average downtown speed
  const estRoadMeters = Math.round(straightMeters * 1.35);
  const estSeconds = Math.max(45, Math.round(estRoadMeters / 9));
  return {
    ...driver,
    etaToPickupSeconds: estSeconds,
    distanceToPickupMeters: estRoadMeters,
    etaText: formatDuration(estSeconds * 1000),
    distanceText: formatDistanceMiles(estRoadMeters),
  };
}
