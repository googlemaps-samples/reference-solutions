import { Injectable, inject } from '@angular/core';
import {
  CandidateDriver,
  ComputedRouteOption,
  EcoSavingsSummary,
  FareEstimate,
  LatLngPoint,
  ResolvedPlace,
  VehicleEmissionType,
} from '../models/rideshare.models';
import { MapsLoaderService } from './maps-loader.service';

export const LOS_ANGELES_CENTER: LatLngPoint = {
  lat: 34.0328,
  lng: -118.3669,
};

export const INITIAL_CANDIDATE_DRIVERS: CandidateDriver[] = [
  {
    id: 'drv-1',
    name: 'Elena Vance',
    rating: 4.96,
    vehicleModel: 'Hyundai Ioniq 6',
    licensePlate: '8ECO412',
    emissionType: 'ELECTRIC',
    location: { lat: 34.0488, lng: -118.2518 }, // Downtown LA / Arts District
    matrixDistanceMeters: null,
    matrixDurationSeconds: null,
    isDispatched: false,
  },
  {
    id: 'drv-2',
    name: 'Marcus Chen',
    rating: 4.92,
    vehicleModel: 'Toyota Prius Prime',
    licensePlate: '9HYB204',
    emissionType: 'HYBRID',
    location: { lat: 34.0633, lng: -118.3592 }, // Mid-Wilshire / Miracle Mile
    matrixDistanceMeters: null,
    matrixDurationSeconds: null,
    isDispatched: false,
  },
  {
    id: 'drv-3',
    name: 'Sofia Morales',
    rating: 4.98,
    vehicleModel: 'Kia EV6 Wind',
    licensePlate: '9EVX881',
    emissionType: 'ELECTRIC',
    location: { lat: 34.0211, lng: -118.3965 }, // Culver City
    matrixDistanceMeters: null,
    matrixDurationSeconds: null,
    isDispatched: false,
  },
  {
    id: 'drv-4',
    name: 'Devon Brooks',
    rating: 4.89,
    vehicleModel: 'Honda Accord Hybrid',
    licensePlate: '7LAX539',
    emissionType: 'HYBRID',
    location: { lat: 34.0825, lng: -118.3087 }, // Hollywood / Larchmont
    matrixDistanceMeters: null,
    matrixDurationSeconds: null,
    isDispatched: false,
  },
];

function extractLatLng(
  point: google.maps.LatLng | google.maps.LatLngLiteral | google.maps.LatLngAltitude | google.maps.LatLngAltitudeLiteral
): LatLngPoint {
  const latVal = typeof (point as google.maps.LatLng).lat === 'function'
    ? (point as google.maps.LatLng).lat()
    : (point as google.maps.LatLngLiteral).lat;
  const lngVal = typeof (point as google.maps.LatLng).lng === 'function'
    ? (point as google.maps.LatLng).lng()
    : (point as google.maps.LatLngLiteral).lng;
  return { lat: latVal, lng: lngVal };
}

@Injectable({
  providedIn: 'root',
})
export class RideshareRoutingService {
  private readonly mapsLoader = inject(MapsLoaderService);

  async resolvePlaceByText(query: string): Promise<ResolvedPlace> {
    const { places } = await this.mapsLoader.loadLibraries();
    const { Place } = places;

    const { places: foundPlaces } = await Place.searchByText({
      textQuery: query,
      fields: ['id', 'displayName', 'formattedAddress', 'location'],
      locationBias: {
        center: LOS_ANGELES_CENTER,
        radius: 45000,
      },
      maxResultCount: 1,
    });

    const first = foundPlaces?.[0];
    if (!first || !first.location) {
      throw new Error(`Could not resolve Los Angeles location for "${query}".`);
    }

    return {
      id: first.id,
      name: first.displayName ?? query,
      formattedAddress: first.formattedAddress ?? query,
      location: extractLatLng(first.location),
    };
  }

  async computeTripComparison(
    pickup: LatLngPoint,
    dropoff: LatLngPoint,
    emissionType: VehicleEmissionType
  ): Promise<{
    fastest: ComputedRouteOption;
    eco: ComputedRouteOption;
    savings: EcoSavingsSummary;
  }> {
    const { routes } = await this.mapsLoader.loadLibraries();
    const { Route } = routes;

    const request = {
      origin: pickup,
      destination: dropoff,
      travelMode: 'DRIVING' as google.maps.TravelMode,
      routingPreference: 'TRAFFIC_AWARE_OPTIMAL' as google.maps.routes.RoutingPreference,
      requestedReferenceRoutes: ['FUEL_EFFICIENT' as google.maps.routes.ReferenceRoute],
      extraComputations: ['FUEL_CONSUMPTION' as google.maps.routes.ComputeRoutesExtraComputation],
      routeModifiers: {
        vehicleInfo: {
          emissionType: emissionType as google.maps.routes.VehicleEmissionType,
        },
      },
      fields: [
        'distanceMeters',
        'durationMillis',
        'staticDurationMillis',
        'path',
        'routeLabels',
        'travelAdvisory',
        'localizedValues',
      ],
    } as google.maps.routes.ComputeRoutesRequest;

    const response = await Route.computeRoutes(request);
    const computed = response.routes ?? [];
    if (computed.length === 0) {
      throw new Error('No drivable route found between the selected Los Angeles locations.');
    }

    const defaultRaw =
      computed.find((r) => r.routeLabels?.includes('DEFAULT_ROUTE' as google.maps.routes.RouteLabel)) ??
      computed[0];

    const ecoRaw =
      computed.find((r) => r.routeLabels?.includes('FUEL_EFFICIENT' as google.maps.routes.RouteLabel)) ??
      (computed.length > 1 ? computed[1] : defaultRaw);

    const sameRoute = defaultRaw === ecoRaw;

    const mapRoute = (
      raw: google.maps.routes.Route,
      kind: 'fastest' | 'eco'
    ): ComputedRouteOption => {
      const labels = (raw.routeLabels ?? []).map(String);
      const matchesBoth =
        labels.includes('DEFAULT_ROUTE') && labels.includes('FUEL_EFFICIENT');
      const path = (raw.path ?? []).map((p) => extractLatLng(p));
      const distanceMeters = raw.distanceMeters ?? 0;
      const durationSeconds = Math.max(1, Math.round((raw.durationMillis ?? 0) / 1000));
      const staticDurationSeconds = Math.max(
        1,
        Math.round((raw.staticDurationMillis ?? raw.durationMillis ?? 0) / 1000)
      );
      const fuelConsumptionMicroliters =
        typeof raw.travelAdvisory?.fuelConsumptionMicroliters === 'number' &&
        Number.isFinite(raw.travelAdvisory.fuelConsumptionMicroliters)
          ? raw.travelAdvisory.fuelConsumptionMicroliters
          : null;

      return {
        kind,
        label: kind === 'fastest' ? 'Fastest Traffic-Aware' : 'Eco-Friendly Route',
        distanceMeters,
        durationSeconds,
        staticDurationSeconds,
        fuelConsumptionMicroliters,
        path: path.length >= 2 ? path : [pickup, dropoff],
        routeLabels: labels,
        matchesBoth: sameRoute || matchesBoth,
      };
    };

    const fastest = mapRoute(defaultRaw, 'fastest');
    const eco = mapRoute(ecoRaw, 'eco');
    const savings = this.calculateEcoSavings(fastest, eco, emissionType);

    return { fastest, eco, savings };
  }

  calculateEcoSavings(
    fastest: ComputedRouteOption,
    eco: ComputedRouteOption,
    emissionType: VehicleEmissionType
  ): EcoSavingsSummary {
    const fastFuel = fastest.fuelConsumptionMicroliters;
    const ecoFuel = eco.fuelConsumptionMicroliters;
    const hasDistinctFuel =
      fastFuel != null && ecoFuel != null && fastFuel > ecoFuel;

    const isSameAsFastest =
      !hasDistinctFuel &&
      (eco.matchesBoth ||
        (fastest.distanceMeters === eco.distanceMeters &&
          fastest.durationSeconds === eco.durationSeconds));

    let fuelSavedLiters = 0;
    let fuelSavedPercent = 0;

    if (hasDistinctFuel) {
      fuelSavedLiters = (fastFuel - ecoFuel) / 1_000_000;
      fuelSavedPercent = ((fastFuel - ecoFuel) / fastFuel) * 100;
    }

    // Approximate tailpipe / lifecycle CO2 factor per liter gasoline-equivalent
    const gramsPerLiter =
      emissionType === 'GASOLINE' ? 2310 : emissionType === 'HYBRID' ? 1750 : 680;
    const co2SavedGrams = Math.round(fuelSavedLiters * gramsPerLiter);

    return {
      fuelSavedLiters,
      fuelSavedPercent,
      co2SavedGrams,
      timeDeltaSeconds: eco.durationSeconds - fastest.durationSeconds,
      isSameAsFastest,
      emissionType,
    };
  }

  calculateFareEstimates(
    route: ComputedRouteOption,
    savings: EcoSavingsSummary
  ): FareEstimate[] {
    const miles = route.distanceMeters / 1609.344;
    const minutes = route.durationSeconds / 60;

    const roundMoney = (val: number) => Math.round(val * 100) / 100;

    const ecoBase = 2.55;
    const ecoDist = roundMoney(miles * 1.45);
    const ecoTime = roundMoney(minutes * 0.32);
    const ecoTotal = Math.max(8.5, roundMoney(ecoBase + ecoDist + ecoTime));

    const comfBase = 4.2;
    const comfDist = roundMoney(miles * 1.95);
    const comfTime = roundMoney(minutes * 0.45);
    const comfTotal = Math.max(12.5, roundMoney(comfBase + comfDist + comfTime));

    const greenBase = 3.1;
    const greenDist = roundMoney(miles * 1.55);
    const greenTime = roundMoney(minutes * 0.34);
    const greenDiscount = route.kind === 'eco' || savings.emissionType !== 'GASOLINE' ? 1.25 : 0.75;
    const greenTotal = Math.max(
      9.0,
      roundMoney(greenBase + greenDist + greenTime - greenDiscount)
    );

    const co2SavedKg = (savings.co2SavedGrams / 1000).toFixed(2);
    const greenCo2Label =
      savings.co2SavedGrams > 0
        ? `Zero-tailpipe EV · Saves ${co2SavedKg} kg CO₂ on Eco`
        : 'Zero-tailpipe EV / Hybrid · Lowest LA carbon footprint';

    return [
      {
        id: 'economy',
        name: 'Economy',
        subtitle: 'Everyday compact sedan · Up to 4 riders',
        badge: 'Best Value',
        baseFare: ecoBase,
        distanceFare: ecoDist,
        timeFare: ecoTime,
        greenDiscount: 0,
        totalFare: ecoTotal,
        etaOffsetMinutes: 0,
        co2Label: 'Standard city dispatch',
        seats: 4,
      },
      {
        id: 'comfort',
        name: 'Comfort',
        subtitle: 'Newer midsize with extra legroom & quiet cabin',
        badge: 'Top Rated',
        baseFare: comfBase,
        distanceFare: comfDist,
        timeFare: comfTime,
        greenDiscount: 0,
        totalFare: comfTotal,
        etaOffsetMinutes: 2,
        co2Label: 'Priority pickup & climate control',
        seats: 4,
      },
      {
        id: 'green',
        name: 'Green',
        subtitle: 'All-Electric & Hybrid fleet · Eco-routed',
        badge: 'Eco Choice',
        baseFare: greenBase,
        distanceFare: greenDist,
        timeFare: greenTime,
        greenDiscount,
        totalFare: greenTotal,
        etaOffsetMinutes: 1,
        co2Label: greenCo2Label,
        seats: 4,
      },
    ];
  }

  async evaluateCandidateDrivers(
    pickup: LatLngPoint,
    candidates: CandidateDriver[]
  ): Promise<CandidateDriver[]> {
    const { routes, geometry } = await this.mapsLoader.loadLibraries();
    const { RouteMatrix } = routes;

    try {
      const { matrix } = await RouteMatrix.computeRouteMatrix({
        origins: candidates.map((d) => d.location),
        destinations: [pickup],
        travelMode: 'DRIVING' as google.maps.TravelMode,
        routingPreference: 'TRAFFIC_AWARE_OPTIMAL' as google.maps.routes.RoutingPreference,
        fields: ['condition', 'distanceMeters', 'durationMillis'],
      });

      const updated = candidates.map((candidate, idx) => {
        const item = matrix.rows?.[idx]?.items?.[0];
        if (item && item.condition === 'ROUTE_EXISTS' && item.durationMillis != null) {
          return {
            ...candidate,
            matrixDistanceMeters: item.distanceMeters ?? 0,
            matrixDurationSeconds: Math.max(15, Math.round(item.durationMillis / 1000)),
          };
        }
        const straightMeters = Math.round(
          geometry.spherical.computeDistanceBetween(candidate.location, pickup)
        );
        return {
          ...candidate,
          matrixDistanceMeters: Math.round(straightMeters * 1.25),
          matrixDurationSeconds: Math.max(60, Math.round((straightMeters * 1.25) / 11)),
        };
      });

      return updated.sort(
        (a, b) =>
          (a.matrixDurationSeconds ?? Number.MAX_SAFE_INTEGER) -
          (b.matrixDurationSeconds ?? Number.MAX_SAFE_INTEGER)
      );
    } catch {
      const updated = candidates.map((candidate) => {
        const straightMeters = Math.round(
          geometry.spherical.computeDistanceBetween(candidate.location, pickup)
        );
        return {
          ...candidate,
          matrixDistanceMeters: Math.round(straightMeters * 1.25),
          matrixDurationSeconds: Math.max(60, Math.round((straightMeters * 1.25) / 11)),
        };
      });

      return updated.sort(
        (a, b) =>
          (a.matrixDurationSeconds ?? Number.MAX_SAFE_INTEGER) -
          (b.matrixDurationSeconds ?? Number.MAX_SAFE_INTEGER)
      );
    }
  }

  async computeDriverPickupRoute(
    driverLocation: LatLngPoint,
    pickup: LatLngPoint
  ): Promise<{
    path: LatLngPoint[];
    distanceMeters: number;
    durationSeconds: number;
  }> {
    const { routes } = await this.mapsLoader.loadLibraries();
    const { Route } = routes;

    const response = await Route.computeRoutes({
      origin: driverLocation,
      destination: pickup,
      travelMode: 'DRIVING' as google.maps.TravelMode,
      routingPreference: 'TRAFFIC_AWARE_OPTIMAL' as google.maps.routes.RoutingPreference,
      fields: ['distanceMeters', 'durationMillis', 'path'],
    });

    const route = response.routes?.[0];
    if (!route) {
      return {
        path: [driverLocation, pickup],
        distanceMeters: 2500,
        durationSeconds: 240,
      };
    }

    const path = (route.path ?? []).map((p) => extractLatLng(p));
    return {
      path: path.length >= 2 ? path : [driverLocation, pickup],
      distanceMeters: route.distanceMeters ?? 2500,
      durationSeconds: Math.max(15, Math.round((route.durationMillis ?? 240000) / 1000)),
    };
  }
}
