import { Injectable } from '@angular/core';
import {
  ATTRIBUTION_ID,
  ComputedRouteOption,
  DENVER_BOULDER_BOUNDS,
  ElevationProfileSummary,
  ElevationSamplePoint,
  ROUTE_PALETTE,
  ResolvedPlace,
  RouteModifiersState,
  TravelModeId,
} from '../models/route-comparator.models';

const METERS_TO_FEET = 3.28084;
const METERS_TO_MILES = 0.000621371;

@Injectable({
  providedIn: 'root',
})
export class RouteComparatorService {
  async resolvePlaceByText(textQuery: string): Promise<ResolvedPlace> {
    const { Place } = (await google.maps.importLibrary(
      'places'
    )) as google.maps.PlacesLibrary;

    const { places } = await Place.searchByText({
      textQuery,
      fields: ['id', 'displayName', 'formattedAddress', 'location'],
      locationBias: DENVER_BOULDER_BOUNDS,
      maxResultCount: 1,
      language: 'en-US',
      region: 'us',
    });

    const match = places[0];
    if (!match?.location) {
      throw new Error(`No location found for "${textQuery}".`);
    }

    return {
      id: match.id ?? textQuery,
      displayName: match.displayName ?? textQuery,
      formattedAddress: match.formattedAddress ?? textQuery,
      location: {
        lat: match.location.lat(),
        lng: match.location.lng(),
      },
    };
  }

  async computeRoutesForMode(
    origin: ResolvedPlace,
    destination: ResolvedPlace,
    mode: TravelModeId,
    modifiers: RouteModifiersState
  ): Promise<ComputedRouteOption[]> {
    const { Route } = (await google.maps.importLibrary(
      'routes'
    )) as google.maps.RoutesLibrary;

    const fields = [
      'durationMillis',
      'staticDurationMillis',
      'distanceMeters',
      'path',
      'routeLabels',
      'localizedValues',
      'travelAdvisory',
      'warnings',
      'legs',
    ];

    const baseRequest: google.maps.routes.ComputeRoutesRequest = {
      origin: origin.location,
      destination: destination.location,
      travelMode: mode as google.maps.TravelMode,
      computeAlternativeRoutes: true,
      fields,
      internalUsageAttributionIds: [ATTRIBUTION_ID],
      language: 'en-US',
      region: 'us',
    };

    if (mode === 'DRIVING') {
      baseRequest.routingPreference =
        'TRAFFIC_AWARE' as google.maps.routes.RoutingPreference;
      baseRequest.routeModifiers = {
        avoidTolls: modifiers.avoidTolls,
        avoidHighways: modifiers.avoidHighways,
      };
      baseRequest.extraComputations = ['FUEL_CONSUMPTION', 'TOLLS'];
      if (modifiers.ecoFriendly) {
        baseRequest.requestedReferenceRoutes = ['FUEL_EFFICIENT'];
      }
    }

    let responseRoutes: google.maps.routes.Route[] = [];

    try {
      const result = await Route.computeRoutes(baseRequest);
      responseRoutes = result.routes ?? [];
    } catch (primaryErr) {
      if (mode === 'DRIVING') {
        // Fallback without extraComputations/referenceRoutes if project/demo key omits optional billing tiers
        const fallbackRequest: google.maps.routes.ComputeRoutesRequest = {
          origin: origin.location,
          destination: destination.location,
          travelMode: mode as google.maps.TravelMode,
          computeAlternativeRoutes: true,
          routeModifiers: {
            avoidTolls: modifiers.avoidTolls,
            avoidHighways: modifiers.avoidHighways,
          },
          fields,
          internalUsageAttributionIds: [ATTRIBUTION_ID],
          language: 'en-US',
          region: 'us',
        };
        const fallbackResult = await Route.computeRoutes(fallbackRequest);
        responseRoutes = fallbackResult.routes ?? [];
      } else {
        throw primaryErr;
      }
    }

    return responseRoutes.map((route, idx) =>
      this.mapRouteToOption(route, idx, mode, modifiers.ecoFriendly)
    );
  }

  async fetchElevationProfile(
    path: google.maps.LatLngLiteral[],
    samplesCount = 64
  ): Promise<ElevationProfileSummary> {
    if (path.length < 2) {
      throw new Error('Route path requires at least two coordinates.');
    }

    const { ElevationService } = (await google.maps.importLibrary(
      'elevation'
    )) as google.maps.ElevationLibrary;

    const downsampledPath = this.downsamplePath(path, 128);
    const elevator = new ElevationService();
    const { results } = await elevator.getElevationAlongPath({
      path: downsampledPath,
      samples: samplesCount,
    });

    if (!results?.length) {
      throw new Error('Elevation service returned no path samples.');
    }

    const samples: ElevationSamplePoint[] = [];
    let cumulativeMeters = 0;
    let totalGainM = 0;
    let totalLossM = 0;
    let minElevationM = Number.POSITIVE_INFINITY;
    let maxElevationM = Number.NEGATIVE_INFINITY;
    let maxGradePct = 0;

    for (let i = 0; i < results.length; i += 1) {
      const item = results[i];
      const lat = item.location?.lat() ?? downsampledPath[0].lat;
      const lng = item.location?.lng() ?? downsampledPath[0].lng;
      const elevationM = item.elevation;

      let gradePct = 0;
      if (i > 0) {
        const prev = samples[i - 1];
        const segMeters = this.haversineMeters(
          { lat: prev.lat, lng: prev.lng },
          { lat, lng }
        );
        cumulativeMeters += segMeters;
        const deltaElev = elevationM - prev.elevationM;
        if (deltaElev > 0) {
          totalGainM += deltaElev;
        } else {
          totalLossM += Math.abs(deltaElev);
        }
        if (segMeters > 1) {
          gradePct = (deltaElev / segMeters) * 100;
          maxGradePct = Math.max(maxGradePct, Math.abs(gradePct));
        }
      }

      minElevationM = Math.min(minElevationM, elevationM);
      maxElevationM = Math.max(maxElevationM, elevationM);

      samples.push({
        index: i,
        lat,
        lng,
        elevationM,
        elevationFt: Math.round(elevationM * METERS_TO_FEET),
        distanceKm: Number((cumulativeMeters / 1000).toFixed(2)),
        distanceMi: Number((cumulativeMeters * METERS_TO_MILES).toFixed(2)),
        gradePct: Number(gradePct.toFixed(1)),
      });
    }

    return {
      samples,
      totalGainM: Math.round(totalGainM),
      totalGainFt: Math.round(totalGainM * METERS_TO_FEET),
      totalLossM: Math.round(totalLossM),
      minElevationM: Math.round(minElevationM),
      maxElevationM: Math.round(maxElevationM),
      maxGradePct: Number(maxGradePct.toFixed(1)),
      totalDistanceKm: Number((cumulativeMeters / 1000).toFixed(1)),
    };
  }

  private mapRouteToOption(
    route: google.maps.routes.Route,
    index: number,
    mode: TravelModeId,
    ecoRequested: boolean
  ): ComputedRouteOption {
    const labels = (route.routeLabels ?? []).map(String);
    const isEco = labels.includes('FUEL_EFFICIENT');
    const isDefault = labels.includes('DEFAULT_ROUTE');

    let label = `Option ${index + 1}`;
    if (isEco) {
      label = 'Eco-Friendly';
    } else if (isDefault || index === 0) {
      label = mode === 'BICYCLING' ? 'Recommended Trail' : 'Recommended';
    } else if (labels.includes('SHORTER_DISTANCE')) {
      label = 'Shortest Distance';
    } else {
      label = `Alternative ${index}`;
    }

    const distanceMeters = route.distanceMeters ?? 0;
    const durationMillis =
      route.durationMillis ?? route.staticDurationMillis ?? 0;

    const path: google.maps.LatLngLiteral[] = (route.path ?? []).map((pt) => ({
      lat: pt.lat,
      lng: pt.lng,
    }));

    const tollInfo = route.travelAdvisory?.tollInfo;
    const hasTolls = Boolean(tollInfo);
    let tollEstimateText: string | null = null;
    if (tollInfo?.estimatedPrices?.length) {
      const price = tollInfo.estimatedPrices[0];
      const units = Number(price.units ?? 0);
      const nanos = Number(price.nanos ?? 0) / 1e9;
      const total = units + nanos;
      if (total > 0) {
        tollEstimateText = `Toll ~${price.currencyCode ?? 'USD'} ${total.toFixed(2)}`;
      } else {
        tollEstimateText = 'Toll road';
      }
    } else if (hasTolls) {
      tollEstimateText = 'May include tolls';
    }

    const fuelMicro = route.travelAdvisory?.fuelConsumptionMicroliters;
    const fuelLitersText =
      typeof fuelMicro === 'number' && Number.isFinite(fuelMicro) && fuelMicro > 0
        ? `${(fuelMicro / 1_000_000).toFixed(2)} L fuel`
        : null;

    const transitFare = route.localizedValues?.transitFare ?? null;

    const color =
      isEco && ecoRequested
        ? '#059669'
        : ROUTE_PALETTE[index % ROUTE_PALETTE.length];

    return {
      index,
      mode,
      color,
      label,
      isEcoFriendly: isEco || mode === 'BICYCLING' || mode === 'WALKING',
      isRecommended: isDefault || index === 0,
      description:
        route.description?.trim() ||
        this.fallbackRouteDescription(mode, index, isEco),
      distanceMeters,
      distanceText:
        route.localizedValues?.distance || this.formatDistance(distanceMeters),
      durationMillis,
      durationText:
        route.localizedValues?.duration ||
        route.localizedValues?.staticDuration ||
        this.formatDuration(durationMillis),
      path,
      hasTolls,
      tollEstimateText,
      fuelLitersText,
      transitFareText: transitFare,
      warnings: route.warnings ?? [],
      routeLabels: labels,
    };
  }

  private fallbackRouteDescription(
    mode: TravelModeId,
    index: number,
    isEco: boolean
  ): string {
    if (isEco) return 'Fuel-optimized corridor';
    switch (mode) {
      case 'BICYCLING':
        return index === 0
          ? 'US-36 Bikeway / Front Range Trail corridor'
          : 'Alternate bike corridor';
      case 'WALKING':
        return index === 0
          ? 'Pedestrian & greenway corridor'
          : 'Alternate walking route';
      case 'TRANSIT':
        return index === 0 ? 'RTD Flatiron Flyer / Regional transit' : 'Alternate transit';
      case 'DRIVING':
      default:
        return index === 0 ? 'US-36 W corridor' : 'Alternate driving route';
    }
  }

  formatDuration(durationMillis: number): string {
    if (!Number.isFinite(durationMillis) || durationMillis <= 0) {
      return '—';
    }
    const totalMinutes = Math.round(durationMillis / 60000);
    if (totalMinutes < 60) {
      return `${totalMinutes} min`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
  }

  formatDistance(distanceMeters: number): string {
    if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
      return '—';
    }
    const miles = distanceMeters * METERS_TO_MILES;
    const km = distanceMeters / 1000;
    return `${miles.toFixed(1)} mi (${km.toFixed(1)} km)`;
  }

  private downsamplePath(
    path: google.maps.LatLngLiteral[],
    maxPoints: number
  ): google.maps.LatLngLiteral[] {
    if (path.length <= maxPoints) {
      return path;
    }
    const sampled: google.maps.LatLngLiteral[] = [];
    const step = (path.length - 1) / (maxPoints - 1);
    for (let i = 0; i < maxPoints - 1; i += 1) {
      sampled.push(path[Math.round(i * step)]);
    }
    sampled.push(path[path.length - 1]);
    return sampled;
  }

  private haversineMeters(
    a: google.maps.LatLngLiteral,
    b: google.maps.LatLngLiteral
  ): number {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const sinLat = Math.sin(dLat / 2);
    const sinLng = Math.sin(dLng / 2);
    const h =
      sinLat * sinLat +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }
}
