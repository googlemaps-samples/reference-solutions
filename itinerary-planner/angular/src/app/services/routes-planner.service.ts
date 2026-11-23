import { Injectable } from '@angular/core';
import { importLibrary } from '@googlemaps/js-api-loader';
import {
  DayRouteSummary,
  ItineraryDay,
  ItineraryStop,
  RouteLegSummary,
  TravelModeKey,
} from '../models/itinerary.models';

export interface RouteComputationResult {
  summary: DayRouteSummary;
  reorderedStops: ItineraryStop[];
}

@Injectable({
  providedIn: 'root',
})
export class RoutesPlannerService {
  async computeDayRoute(
    day: ItineraryDay,
    stops: ItineraryStop[],
    travelMode: TravelModeKey,
    optimizeOrder: boolean
  ): Promise<RouteComputationResult> {
    if (stops.length < 2) {
      return {
        summary: this.emptySummary(day, travelMode, null),
        reorderedStops: stops,
      };
    }

    const { Route } = await importLibrary('routes');
    const sdkTravelMode = this.toSdkTravelMode(travelMode);

    if (sdkTravelMode === 'TRANSIT' && stops.length > 2) {
      return this.computeLegByLegTransit(Route, day, stops, travelMode);
    }

    const originStop = stops[0];
    const destinationStop = stops[stops.length - 1];
    const intermediateStops = stops.slice(1, -1);

    const canOptimize =
      optimizeOrder &&
      intermediateStops.length >= 2 &&
      sdkTravelMode !== 'TRANSIT';

    const fields = [
      'path',
      'distanceMeters',
      'durationMillis',
      'legs',
      'localizedValues',
      'viewport',
    ];
    if (canOptimize) {
      fields.push('optimizedIntermediateWaypointIndices');
    }

    const request: google.maps.routes.ComputeRoutesRequest = {
      origin: originStop.location,
      destination: destinationStop.location,
      travelMode: sdkTravelMode,
      fields,
      language: 'en',
      ...(intermediateStops.length > 0
        ? {
            intermediates: intermediateStops.map((stop) => ({
              location: stop.location,
            })),
            optimizeWaypointOrder: canOptimize,
          }
        : {}),
    };

    try {
      const response = await Route.computeRoutes(request);
      const route = response.routes?.[0];
      if (!route) {
        return {
          summary: this.emptySummary(
            day,
            travelMode,
            'No route returned for the current stops and travel mode.'
          ),
          reorderedStops: stops,
        };
      }

      let orderedStops = [...stops];
      if (
        canOptimize &&
        route.optimizedIntermediateWaypointIndices &&
        route.optimizedIntermediateWaypointIndices.length ===
          intermediateStops.length
      ) {
        const reorderedIntermediates = route.optimizedIntermediateWaypointIndices
          .map((idx) => intermediateStops[idx])
          .filter((item): item is ItineraryStop => Boolean(item));
        if (reorderedIntermediates.length === intermediateStops.length) {
          orderedStops = [originStop, ...reorderedIntermediates, destinationStop];
        }
      }

      const path = (route.path ?? []).map((pt) => ({
        lat: pt.lat,
        lng: pt.lng,
      }));

      const rawLegs = route.legs ?? [];
      const legs: RouteLegSummary[] = rawLegs.map((leg, index) => {
        const fromStop = orderedStops[index];
        const toStop = orderedStops[index + 1];
        const distanceMeters = leg.distanceMeters ?? 0;
        const durationMillis =
          leg.durationMillis && Number.isFinite(leg.durationMillis)
            ? leg.durationMillis
            : 0;
        return {
          fromName: fromStop?.displayName ?? `Stop ${index + 1}`,
          toName: toStop?.displayName ?? `Stop ${index + 2}`,
          distanceMeters,
          durationMillis,
          distanceText:
            leg.localizedValues?.distance || this.formatDistance(distanceMeters),
          durationText:
            leg.localizedValues?.duration || this.formatDuration(durationMillis),
        };
      });

      const distanceMeters =
        route.distanceMeters ??
        legs.reduce((sum, l) => sum + l.distanceMeters, 0);
      const durationMillis =
        route.durationMillis && Number.isFinite(route.durationMillis)
          ? route.durationMillis
          : legs.reduce((sum, l) => sum + l.durationMillis, 0);

      return {
        reorderedStops: orderedStops,
        summary: {
          day,
          travelMode,
          distanceMeters,
          durationMillis,
          totalDistanceText:
            route.localizedValues?.distance ||
            this.formatDistance(distanceMeters),
          totalDurationText:
            route.localizedValues?.duration ||
            this.formatDuration(durationMillis),
          path,
          legs,
          optimized: canOptimize,
          errorMessage: null,
        },
      };
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to compute route for these stops.';
      return {
        summary: this.emptySummary(day, travelMode, msg),
        reorderedStops: stops,
      };
    }
  }

  private async computeLegByLegTransit(
    Route: typeof google.maps.routes.Route,
    day: ItineraryDay,
    stops: ItineraryStop[],
    travelMode: TravelModeKey
  ): Promise<RouteComputationResult> {
    const combinedPath: google.maps.LatLngLiteral[] = [];
    const legs: RouteLegSummary[] = [];
    let totalDistanceMeters = 0;
    let totalDurationMillis = 0;

    for (let i = 0; i < stops.length - 1; i += 1) {
      const fromStop = stops[i];
      const toStop = stops[i + 1];

      let route: google.maps.routes.Route | undefined;
      try {
        const res = await Route.computeRoutes({
          origin: fromStop.location,
          destination: toStop.location,
          travelMode: 'TRANSIT',
          fields: ['path', 'distanceMeters', 'durationMillis', 'localizedValues'],
          language: 'en',
        });
        route = res.routes?.[0];
      } catch {
        route = undefined;
      }

      if (!route) {
        // Fallback to WALKING for short urban hops with no transit segment
        try {
          const walkRes = await Route.computeRoutes({
            origin: fromStop.location,
            destination: toStop.location,
            travelMode: 'WALKING',
            fields: ['path', 'distanceMeters', 'durationMillis', 'localizedValues'],
            language: 'en',
          });
          route = walkRes.routes?.[0];
        } catch {
          route = undefined;
        }
      }

      if (route) {
        const legPath = (route.path ?? []).map((pt) => ({
          lat: pt.lat,
          lng: pt.lng,
        }));
        combinedPath.push(...legPath);
        const dist = route.distanceMeters ?? 0;
        const dur =
          route.durationMillis && Number.isFinite(route.durationMillis)
            ? route.durationMillis
            : 0;
        totalDistanceMeters += dist;
        totalDurationMillis += dur;
        legs.push({
          fromName: fromStop.displayName,
          toName: toStop.displayName,
          distanceMeters: dist,
          durationMillis: dur,
          distanceText:
            route.localizedValues?.distance || this.formatDistance(dist),
          durationText:
            route.localizedValues?.duration || this.formatDuration(dur),
        });
      }
    }

    return {
      reorderedStops: stops,
      summary: {
        day,
        travelMode,
        distanceMeters: totalDistanceMeters,
        durationMillis: totalDurationMillis,
        totalDistanceText: this.formatDistance(totalDistanceMeters),
        totalDurationText: this.formatDuration(totalDurationMillis),
        path: combinedPath,
        legs,
        optimized: false,
        errorMessage:
          combinedPath.length === 0
            ? 'Transit directions unavailable between these stops.'
            : null,
      },
    };
  }

  emptySummary(
    day: ItineraryDay,
    travelMode: TravelModeKey,
    errorMessage: string | null
  ): DayRouteSummary {
    return {
      day,
      travelMode,
      distanceMeters: 0,
      durationMillis: 0,
      totalDistanceText: '—',
      totalDurationText: '—',
      path: [],
      legs: [],
      optimized: false,
      errorMessage,
    };
  }

  private toSdkTravelMode(mode: TravelModeKey): google.maps.TravelModeString {
    switch (mode) {
      case 'DRIVE':
        return 'DRIVING';
      case 'WALK':
        return 'WALKING';
      case 'TRANSIT':
        return 'TRANSIT';
    }
  }

  formatDistance(meters: number): string {
    if (!meters || meters <= 0) return '0 m';
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  }

  formatDuration(millis: number): string {
    if (!millis || millis <= 0) return '0 min';
    const totalMinutes = Math.max(1, Math.round(millis / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} hr`;
    return `${hours} hr ${mins} min`;
  }
}
