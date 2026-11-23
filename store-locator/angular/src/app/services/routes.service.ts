import { Injectable, inject } from '@angular/core';
import {
  BranchLocation,
  OriginPoint,
  TravelModeOption,
} from '../models/store.models';
import { MapsLoaderService } from './maps-loader.service';

export interface MatrixMetrics {
  durationMillis: number;
  distanceMeters: number;
  etaText: string;
  distanceText: string;
}

export interface ComputedRouteResult {
  route: google.maps.routes.Route;
  durationMillis: number | null;
  distanceMeters: number | null;
  etaText: string;
  distanceText: string;
}

@Injectable({
  providedIn: 'root',
})
export class RoutesService {
  private readonly mapsLoader = inject(MapsLoaderService);

  private toJsTravelMode(mode: TravelModeOption): google.maps.TravelMode {
    switch (mode) {
      case 'WALK':
        return 'WALKING' as google.maps.TravelMode;
      case 'TRANSIT':
        return 'TRANSIT' as google.maps.TravelMode;
      case 'DRIVE':
      default:
        return 'DRIVING' as google.maps.TravelMode;
    }
  }

  async computeRouteMatrix(
    origin: OriginPoint,
    branches: BranchLocation[],
    travelMode: TravelModeOption
  ): Promise<Map<string, MatrixMetrics>> {
    const metricsMap = new Map<string, MatrixMetrics>();
    if (branches.length === 0) {
      return metricsMap;
    }

    const { core, routes } = await this.mapsLoader.load();
    const { RouteMatrix } = routes;
    const { UnitSystem } = core;

    const jsMode = this.toJsTravelMode(travelMode);
    const chunkSize = 20;

    for (let i = 0; i < branches.length; i += chunkSize) {
      const chunk = branches.slice(i, i + chunkSize);

      try {
        const request: google.maps.routes.ComputeRouteMatrixRequest = {
          origins: [{ lat: origin.lat, lng: origin.lng }],
          destinations: chunk.map((b) => ({ lat: b.lat, lng: b.lng })),
          travelMode: jsMode,
          units: UnitSystem.IMPERIAL,
          fields: ['distanceMeters', 'durationMillis', 'localizedValues', 'condition'],
          ...(travelMode === 'DRIVE'
            ? { routingPreference: 'TRAFFIC_AWARE' as google.maps.routes.RoutingPreference }
            : {}),
        };

        const { matrix } = await RouteMatrix.computeRouteMatrix(request);
        const rowItems = matrix.rows?.[0]?.items ?? [];

        chunk.forEach((branch, idx) => {
          const item = rowItems[idx];
          if (!item || item.condition === 'ROUTE_NOT_FOUND') {
            return;
          }
          const durationMillis =
            typeof item.durationMillis === 'number' &&
            Number.isFinite(item.durationMillis)
              ? item.durationMillis
              : null;
          const distanceMeters =
            typeof item.distanceMeters === 'number' &&
            Number.isFinite(item.distanceMeters)
              ? item.distanceMeters
              : null;

          if (durationMillis !== null && distanceMeters !== null) {
            metricsMap.set(branch.id, {
              durationMillis,
              distanceMeters,
              etaText:
                item.localizedValues?.duration ||
                this.formatDuration(durationMillis),
              distanceText:
                item.localizedValues?.distance ||
                this.formatDistance(distanceMeters),
            });
          }
        });
      } catch (err) {
        console.error('RouteMatrix.computeRouteMatrix chunk failed:', err);
      }
    }

    return metricsMap;
  }

  async computeRoute(
    origin: OriginPoint,
    destination: BranchLocation,
    travelMode: TravelModeOption
  ): Promise<ComputedRouteResult | null> {
    const { core, routes } = await this.mapsLoader.load();
    const { Route } = routes;
    const { UnitSystem } = core;

    const jsMode = this.toJsTravelMode(travelMode);

    const request: google.maps.routes.ComputeRoutesRequest = {
      origin: { lat: origin.lat, lng: origin.lng },
      destination: { lat: destination.lat, lng: destination.lng },
      travelMode: jsMode,
      units: UnitSystem.IMPERIAL,
      fields: [
        'durationMillis',
        'distanceMeters',
        'localizedValues',
        'path',
        'legs',
        'viewport',
      ],
      ...(travelMode === 'DRIVE'
        ? { routingPreference: 'TRAFFIC_AWARE' as google.maps.routes.RoutingPreference }
        : {}),
    };

    const response = await Route.computeRoutes(request);
    const primary = response.routes?.[0];
    if (!primary) {
      return null;
    }

    const durationMillis =
      typeof primary.durationMillis === 'number' &&
      Number.isFinite(primary.durationMillis)
        ? primary.durationMillis
        : null;
    const distanceMeters =
      typeof primary.distanceMeters === 'number' &&
      Number.isFinite(primary.distanceMeters)
        ? primary.distanceMeters
        : null;

    return {
      route: primary,
      durationMillis,
      distanceMeters,
      etaText:
        primary.localizedValues?.duration ||
        (durationMillis !== null ? this.formatDuration(durationMillis) : '—'),
      distanceText:
        primary.localizedValues?.distance ||
        (distanceMeters !== null ? this.formatDistance(distanceMeters) : '—'),
    };
  }

  private formatDuration(ms: number): string {
    const mins = Math.max(1, Math.round(ms / 60000));
    if (mins < 60) {
      return `${mins} min`;
    }
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs} hr ${rem} min` : `${hrs} hr`;
  }

  private formatDistance(meters: number): string {
    const miles = meters / 1609.344;
    if (miles < 0.2) {
      const feet = Math.round(meters * 3.28084);
      return `${feet} ft`;
    }
    return `${miles.toFixed(1)} mi`;
  }
}
