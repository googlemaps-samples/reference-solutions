import { Injectable, inject } from '@angular/core';
import {
  DispatchLegSummary,
  DispatchRouteSummary,
  HubMatrixRow,
  LatLngPoint,
  LogisticsHub,
  RoadSnapSummary,
  SnappedRoadPoint,
} from '../models/fleet.models';
import { DALLAS_CENTER } from '../data/dallas-fleet.data';
import { GoogleMapsLoaderService } from './google-maps-loader.service';

const ATTRIBUTION_IDS = ['gmp_git_agentsamples_v1.0.0'];

@Injectable({
  providedIn: 'root',
})
export class TelematicsApiService {
  private readonly mapsLoader = inject(GoogleMapsLoaderService);

  /**
   * Discovers real Dallas logistics hubs & distribution centers via Places API (New)
   * Place.searchByText, falling back to the BFF /api/places/search endpoint if needed.
   */
  async discoverDallasHubs(
    query = 'distribution center logistics hub Dallas TX'
  ): Promise<LogisticsHub[]> {
    const libs = await this.mapsLoader.ensureLoaded();
    if (!libs) return [];

    try {
      const { Place } = libs.places;
      const { places } = await Place.searchByText({
        textQuery: query,
        fields: ['id', 'displayName', 'formattedAddress', 'location'],
        locationBias: {
          center: DALLAS_CENTER,
          radius: 30000,
        },
        maxResultCount: 5,
        language: 'en-US',
        region: 'us',
      });

      const discovered: LogisticsHub[] = [];
      for (const place of places ?? []) {
        if (!place.location) continue;
        discovered.push({
          id: place.id || `hub-${discovered.length + 1}`,
          name: place.displayName || 'Dallas Logistics Hub',
          address: place.formattedAddress || 'Dallas, TX',
          location: {
            lat: place.location.lat(),
            lng: place.location.lng(),
          },
          selected: discovered.length < 4,
          source: 'places-text-search',
        });
      }

      if (discovered.length > 0) {
        return discovered;
      }
    } catch {
      // Fall through to BFF proxy if client Place.searchByText is blocked/unavailable
    }

    try {
      const res = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textQuery: query,
          maxResultCount: 5,
          locationBias: {
            circle: {
              center: {
                latitude: DALLAS_CENTER.lat,
                longitude: DALLAS_CENTER.lng,
              },
              radius: 30000,
            },
          },
        }),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as {
        places?: Array<{
          id?: string;
          displayName?: { text?: string };
          formattedAddress?: string;
          location?: { latitude?: number; longitude?: number };
        }>;
      };
      return (data.places ?? [])
        .filter(
          (p) =>
            p.location?.latitude !== undefined &&
            p.location?.longitude !== undefined
        )
        .map((p, idx) => ({
          id: p.id || `hub-${idx + 1}`,
          name: p.displayName?.text || 'Dallas Logistics Hub',
          address: p.formattedAddress || 'Dallas, TX',
          location: {
            lat: p.location!.latitude!,
            lng: p.location!.longitude!,
          },
          selected: idx < 4,
          source: 'places-text-search' as const,
        }));
    } catch {
      return [];
    }
  }

  /**
   * Snaps noisy raw GPS breadcrumb coordinates to road geometry via
   * Roads API v1/snapToRoads (through our BFF /api/roads/snap proxy).
   */
  async snapGpsTraceToRoads(
    vehicleId: string,
    rawPoints: LatLngPoint[]
  ): Promise<RoadSnapSummary> {
    const libs = await this.mapsLoader.ensureLoaded();
    if (!libs || rawPoints.length < 2) {
      return {
        vehicleId,
        rawPoints,
        snappedPoints: [],
        snappedPath: [],
        uniqueRoadSegments: 0,
        meanSnapOffsetMeters: 0,
        statusMessage: 'Insufficient GPS points to snap.',
        isLiveApi: false,
      };
    }

    try {
      const response = await fetch('/api/roads/snap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: rawPoints,
          interpolate: true,
        }),
      });

      const payload = (await response.json()) as {
        snappedPoints?: Array<{
          location?: { latitude: number; longitude: number };
          originalIndex?: number;
          placeId?: string;
        }>;
        warningMessage?: string;
        error?: string;
      };

      if (
        response.ok &&
        Array.isArray(payload.snappedPoints) &&
        payload.snappedPoints.length > 0
      ) {
        const snappedPoints: SnappedRoadPoint[] = payload.snappedPoints
          .filter((pt) => pt.location)
          .map((pt) => ({
            location: {
              lat: pt.location!.latitude,
              lng: pt.location!.longitude,
            },
            originalIndex: pt.originalIndex,
            placeId: pt.placeId || '',
          }));

        const snappedPath = snappedPoints.map((pt) => pt.location);
        const uniqueSegments = new Set(
          snappedPoints.map((pt) => pt.placeId).filter(Boolean)
        ).size;

        const meanSnapOffsetMeters = this.computeMeanOffsetMeters(
          libs.geometry.spherical,
          rawPoints,
          snappedPoints
        );

        return {
          vehicleId,
          rawPoints,
          snappedPoints,
          snappedPath,
          uniqueRoadSegments: uniqueSegments,
          meanSnapOffsetMeters,
          statusMessage:
            payload.warningMessage ||
            'Snapped cleanly via Roads API (v1/snapToRoads, interpolate=true).',
          isLiveApi: true,
        };
      }

      // Graceful fallback via Routes API road corridor alignment if Roads API is not enabled on key
      return await this.fallbackSnapViaRoutes(
        libs,
        vehicleId,
        rawPoints,
        payload.error || `Roads API status ${response.status}`
      );
    } catch (err) {
      return await this.fallbackSnapViaRoutes(
        libs,
        vehicleId,
        rawPoints,
        err instanceof Error ? err.message : 'Roads API request unavailable'
      );
    }
  }

  private computeMeanOffsetMeters(
    spherical: typeof google.maps.geometry.spherical,
    rawPoints: LatLngPoint[],
    snappedPoints: SnappedRoadPoint[]
  ): number {
    let totalMeters = 0;
    let pairedCount = 0;

    for (const sp of snappedPoints) {
      if (
        typeof sp.originalIndex === 'number' &&
        rawPoints[sp.originalIndex]
      ) {
        const rawPt = rawPoints[sp.originalIndex];
        totalMeters += spherical.computeDistanceBetween(
          new google.maps.LatLng(rawPt.lat, rawPt.lng),
          new google.maps.LatLng(sp.location.lat, sp.location.lng)
        );
        pairedCount += 1;
      }
    }

    if (pairedCount === 0) return 0;
    return Math.round((totalMeters / pairedCount) * 10) / 10;
  }

  private async fallbackSnapViaRoutes(
    libs: NonNullable<Awaited<ReturnType<GoogleMapsLoaderService['ensureLoaded']>>>,
    vehicleId: string,
    rawPoints: LatLngPoint[],
    reason: string
  ): Promise<RoadSnapSummary> {
    try {
      const { Route } = libs.routes;
      const origin = rawPoints[0];
      const destination = rawPoints[rawPoints.length - 1];
      const step = Math.max(1, Math.floor((rawPoints.length - 2) / 6));
      const intermediates: google.maps.routes.Waypoint[] = [];
      for (let i = step; i < rawPoints.length - 1; i += step) {
        if (intermediates.length < 8) {
          intermediates.push({ location: rawPoints[i], via: true });
        }
      }

      const { routes } = await Route.computeRoutes({
        origin,
        destination,
        intermediates,
        travelMode: 'DRIVING',
        routingPreference: 'TRAFFIC_UNAWARE',
        fields: ['path'],
        internalUsageAttributionIds: ATTRIBUTION_IDS,
      });

      const path = (routes?.[0]?.path ?? []).map((pt) => ({
        lat: pt.lat,
        lng: pt.lng,
      }));

      if (path.length > 0) {
        const snappedPoints: SnappedRoadPoint[] = path.map((pt, idx) => ({
          location: pt,
          originalIndex: idx === 0 ? 0 : undefined,
          placeId: 'routes-corridor-fallback',
        }));

        // Approximate mean offset between raw points and nearest point on snapped path
        let totalMeters = 0;
        for (const rawPt of rawPoints) {
          let minD = Number.POSITIVE_INFINITY;
          const rawLatLng = new google.maps.LatLng(rawPt.lat, rawPt.lng);
          for (const roadPt of path) {
            const d = libs.geometry.spherical.computeDistanceBetween(
              rawLatLng,
              new google.maps.LatLng(roadPt.lat, roadPt.lng)
            );
            if (d < minD) minD = d;
          }
          totalMeters += Number.isFinite(minD) ? minD : 0;
        }
        const meanSnapOffsetMeters =
          Math.round((totalMeters / rawPoints.length) * 10) / 10;

        return {
          vehicleId,
          rawPoints,
          snappedPoints,
          snappedPath: path,
          uniqueRoadSegments: Math.max(1, Math.round(path.length / 8)),
          meanSnapOffsetMeters,
          statusMessage: `Roads API unavailable (${reason}); showing Routes corridor alignment.`,
          isLiveApi: false,
        };
      }
    } catch {
      // ignore
    }

    return {
      vehicleId,
      rawPoints,
      snappedPoints: [],
      snappedPath: [],
      uniqueRoadSegments: 0,
      meanSnapOffsetMeters: 0,
      statusMessage: `Roads API unavailable (${reason}).`,
      isLiveApi: false,
    };
  }

  /**
   * Computes a multi-stop dispatch corridor route from the central depot through
   * selected Dallas drop-off hubs via Route.computeRoutes (Routes API JS library).
   */
  async computeDispatchRoute(
    depot: LogisticsHub,
    hubs: LogisticsHub[],
    optimizeWaypointOrder: boolean
  ): Promise<DispatchRouteSummary | null> {
    const libs = await this.mapsLoader.ensureLoaded();
    if (!libs || hubs.length === 0) return null;

    const { Route } = libs.routes;
    const intermediateHubs = hubs.slice(0, -1);
    const finalHub = hubs[hubs.length - 1];

    const intermediates: google.maps.routes.Waypoint[] = intermediateHubs.map(
      (hub) => ({
        location: hub.location,
        vehicleStopover: true,
      })
    );

    const request: google.maps.routes.ComputeRoutesRequest = {
      origin: depot.location,
      destination: finalHub.location,
      intermediates,
      travelMode: 'DRIVING',
      routingPreference: 'TRAFFIC_AWARE',
      optimizeWaypointOrder:
        optimizeWaypointOrder && intermediateHubs.length > 1,
      fields: [
        'path',
        'legs',
        'distanceMeters',
        'durationMillis',
        'optimizedIntermediateWaypointIndices',
      ],
      internalUsageAttributionIds: ATTRIBUTION_IDS,
    };

    const { routes } = await Route.computeRoutes(request);
    const route = routes?.[0];
    if (!route) return null;

    const optimizedIndices =
      route.optimizedIntermediateWaypointIndices ?? [];
    const orderedIntermediates =
      optimizedIndices.length === intermediateHubs.length
        ? optimizedIndices.map((idx) => intermediateHubs[idx])
        : intermediateHubs;
    const orderedStops = [...orderedIntermediates, finalHub];

    const labels = [depot.name, ...orderedStops.map((s) => s.name)];
    const legs: DispatchLegSummary[] = (route.legs ?? []).map((leg, idx) => ({
      legIndex: idx + 1,
      fromLabel: labels[idx] || `Stop ${idx}`,
      toLabel: labels[idx + 1] || `Stop ${idx + 1}`,
      distanceMeters: leg.distanceMeters ?? 0,
      durationMillis: leg.durationMillis ?? 0,
    }));

    const path: LatLngPoint[] = (route.path ?? []).map((pt) => ({
      lat: pt.lat,
      lng: pt.lng,
    }));

    return {
      path,
      totalDistanceMeters: route.distanceMeters ?? 0,
      totalDurationMillis: route.durationMillis ?? 0,
      legs,
      optimizedOrderIndices: optimizedIndices,
      orderedHubIds: orderedStops.map((s) => s.id),
    };
  }

  /**
   * Computes travel-time & distance matrix from the central depot to all active hubs
   * via RouteMatrix.computeRouteMatrix (Routes API JS library).
   */
  async computeHubMatrix(
    depot: LogisticsHub,
    hubs: LogisticsHub[]
  ): Promise<HubMatrixRow[]> {
    const libs = await this.mapsLoader.ensureLoaded();
    if (!libs || hubs.length === 0) return [];

    const { RouteMatrix } = libs.routes;

    const { matrix } = await RouteMatrix.computeRouteMatrix({
      origins: [depot.location],
      destinations: hubs.map((h) => h.location),
      travelMode: 'DRIVING',
      routingPreference: 'TRAFFIC_AWARE',
      fields: ['condition', 'distanceMeters', 'durationMillis'],
      internalUsageAttributionIds: ATTRIBUTION_IDS,
    });

    const firstRow = matrix.rows?.[0];
    if (!firstRow) return [];

    return hubs.map((hub, idx) => {
      const item = firstRow.items?.[idx];
      return {
        hubId: hub.id,
        hubName: hub.name,
        distanceMeters: item?.distanceMeters ?? 0,
        durationMillis: item?.durationMillis ?? 0,
        condition: item?.condition ?? 'ROUTE_EXISTS',
      };
    });
  }
}
