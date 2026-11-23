import { Injectable, inject } from '@angular/core';
import {
  EmergencyShelter,
  EvacuationRouteSummary,
  FloodZonePolygon,
  LatLngLiteral,
  RouteStepSummary,
  WeatherSnapshot,
} from '../models/hazard.models';
import { GoogleMapsLoaderService } from './google-maps-loader.service';

interface WeatherApiResponse {
  weatherCondition?: {
    description?: {
      text?: string;
    };
  };
  temperature?: {
    degrees?: number;
  };
  relativeHumidity?: number;
  wind?: {
    speed?: {
      value?: number;
    };
    gust?: {
      value?: number;
    };
    direction?: {
      cardinal?: string;
    };
  };
  precipitation?: {
    probability?: {
      percent?: number;
    };
    qpf?: {
      quantity?: number;
    };
  };
}

@Injectable({
  providedIn: 'root',
})
export class HazardIntelligenceService {
  private readonly mapsLoader = inject(GoogleMapsLoaderService);

  async reverseGeocode(location: LatLngLiteral): Promise<string> {
    const libs = await this.mapsLoader.ensureLoaded();
    if (!libs) {
      return `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`;
    }

    try {
      const geocoder = new libs.geocoding.Geocoder();
      const response = await geocoder.geocode({ location });
      const firstResult = response.results?.[0];
      if (firstResult?.formatted_address) {
        return firstResult.formatted_address;
      }
      return `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`;
    } catch {
      return `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`;
    }
  }

  async fetchElevation(location: LatLngLiteral): Promise<number | null> {
    const libs = await this.mapsLoader.ensureLoaded();
    if (!libs) {
      return null;
    }

    try {
      const elevationService = new libs.elevation.ElevationService();
      const response = await elevationService.getElevationForLocations({
        locations: [location],
      });
      const first = response.results?.[0];
      if (typeof first?.elevation === 'number') {
        return Math.round(first.elevation * 100) / 100;
      }
      return null;
    } catch {
      return null;
    }
  }

  async fetchCurrentWeather(location: LatLngLiteral): Promise<WeatherSnapshot> {
    const apiKey = this.mapsLoader.getApiKey();
    if (!apiKey) {
      return {
        conditionText: 'API key required',
        temperatureC: null,
        windSpeedKmh: null,
        windGustKmh: null,
        windDirection: '--',
        precipProbability: null,
        precipQpfMm: null,
        humidity: null,
        error: 'Configure GOOGLE_MAPS_API_KEY to enable live Weather API lookup.',
      };
    }

    const url =
      `https://weather.googleapis.com/v1/currentConditions:lookup` +
      `?key=${encodeURIComponent(apiKey)}` +
      `&location.latitude=${encodeURIComponent(location.lat.toFixed(6))}` +
      `&location.longitude=${encodeURIComponent(location.lng.toFixed(6))}` +
      `&unitsSystem=METRIC`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        return {
          conditionText: 'Unavailable',
          temperatureC: null,
          windSpeedKmh: null,
          windGustKmh: null,
          windDirection: '--',
          precipProbability: null,
          precipQpfMm: null,
          humidity: null,
          error: `Weather API HTTP ${response.status}`,
        };
      }
      const data = (await response.json()) as WeatherApiResponse;
      return {
        conditionText:
          data.weatherCondition?.description?.text ?? 'Current Conditions',
        temperatureC:
          typeof data.temperature?.degrees === 'number'
            ? Math.round(data.temperature.degrees * 10) / 10
            : null,
        windSpeedKmh:
          typeof data.wind?.speed?.value === 'number'
            ? Math.round(data.wind.speed.value)
            : null,
        windGustKmh:
          typeof data.wind?.gust?.value === 'number'
            ? Math.round(data.wind.gust.value)
            : null,
        windDirection: this.formatCardinalDirection(
          data.wind?.direction?.cardinal
        ),
        precipProbability:
          typeof data.precipitation?.probability?.percent === 'number'
            ? data.precipitation.probability.percent
            : null,
        precipQpfMm:
          typeof data.precipitation?.qpf?.quantity === 'number'
            ? Math.round(data.precipitation.qpf.quantity * 10) / 10
            : null,
        humidity:
          typeof data.relativeHumidity === 'number'
            ? data.relativeHumidity
            : null,
      };
    } catch {
      return {
        conditionText: 'Weather lookup unavailable',
        temperatureC: null,
        windSpeedKmh: null,
        windGustKmh: null,
        windDirection: '--',
        precipProbability: null,
        precipQpfMm: null,
        humidity: null,
        error: 'Unable to reach Weather API.',
      };
    }
  }

  async searchEmergencyShelters(
    textQuery: string,
    origin: LatLngLiteral
  ): Promise<EmergencyShelter[]> {
    const libs = await this.mapsLoader.ensureLoaded();
    if (!libs) {
      return [];
    }

    const normalizedQuery =
      textQuery.trim() || 'hospital and community center in Miami, FL';

    const request: google.maps.places.SearchByTextRequest = {
      textQuery: normalizedQuery,
      fields: [
        'id',
        'displayName',
        'formattedAddress',
        'location',
        'types',
        'rating',
        'userRatingCount',
        'businessStatus',
      ],
      locationBias: {
        center: origin,
        radius: 12000,
      },
      maxResultCount: 10,
      language: 'en-US',
      region: 'us',
      internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
    };

    const { places } = await libs.places.Place.searchByText(request);
    if (!places || places.length === 0) {
      return [];
    }

    const originLatLng = new libs.core.LatLng(origin.lat, origin.lng);
    const shelters: EmergencyShelter[] = [];

    for (const place of places) {
      if (!place.location) continue;
      const locLiteral: LatLngLiteral = {
        lat: place.location.lat(),
        lng: place.location.lng(),
      };
      const distanceMeters = Math.round(
        libs.geometry.spherical.computeDistanceBetween(
          originLatLng,
          place.location
        )
      );
      shelters.push({
        id: place.id ?? `${locLiteral.lat}-${locLiteral.lng}`,
        name: place.displayName ?? 'Emergency Shelter',
        address: place.formattedAddress ?? 'Miami, FL',
        location: locLiteral,
        types: place.types ?? [],
        rating: typeof place.rating === 'number' ? place.rating : undefined,
        userRatingCount:
          typeof place.userRatingCount === 'number'
            ? place.userRatingCount
            : undefined,
        businessStatus: place.businessStatus ?? undefined,
        distanceMeters,
      });
    }

    shelters.sort(
      (a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity)
    );
    return shelters;
  }

  async computeEvacuationRoute(
    origin: LatLngLiteral,
    originLabel: string,
    destination: EmergencyShelter,
    floodZones: FloodZonePolygon[],
    avoidFlood: boolean
  ): Promise<EvacuationRouteSummary | null> {
    const libs = await this.mapsLoader.ensureLoaded();
    if (!libs) {
      return null;
    }

    const zonePolygons = floodZones.map((zone) => ({
      zone,
      polygon: new libs.maps.Polygon({ paths: zone.paths }),
    }));

    const baseRoute = await this.requestRoute(libs, origin, destination.location);
    if (!baseRoute) {
      return null;
    }

    let selectedRoute = baseRoute;
    const basePath = this.extractPath(baseRoute);
    const intersectedZones = this.findIntersectedZones(
      libs,
      basePath,
      zonePolygons
    );
    let bypassedZoneNames: string[] = [];

    if (avoidFlood && intersectedZones.length > 0) {
      const candidateWaypoints = this.buildSafeBypassWaypoints(
        libs,
        origin,
        destination.location,
        intersectedZones.map((z) => z.zone),
        zonePolygons
      );

      let bestClearRoute: google.maps.routes.Route | null = null;
      let bestClearDistance = Infinity;

      for (const waypoint of candidateWaypoints.slice(0, 4)) {
        try {
          const candidateRoute = await this.requestRoute(
            libs,
            origin,
            destination.location,
            [{ location: waypoint, via: true }]
          );
          if (!candidateRoute) continue;

          const candidatePath = this.extractPath(candidateRoute);
          const remainingIntersections = this.findIntersectedZones(
            libs,
            candidatePath,
            zonePolygons
          );
          const candidateDist = candidateRoute.distanceMeters ?? Infinity;

          if (
            remainingIntersections.length === 0 &&
            candidateDist < bestClearDistance
          ) {
            bestClearRoute = candidateRoute;
            bestClearDistance = candidateDist;
          }
        } catch {
          // Ignore individual candidate failures and try next bypass point
        }
      }

      if (bestClearRoute) {
        selectedRoute = bestClearRoute;
        bypassedZoneNames = intersectedZones.map((z) => z.zone.name);
      }
    }

    const finalPath = this.extractPath(selectedRoute);
    const finalIntersections = this.findIntersectedZones(
      libs,
      finalPath,
      zonePolygons
    );

    const distanceMeters = selectedRoute.distanceMeters ?? 0;
    const durationSeconds = Math.round(
      (selectedRoute.durationMillis ?? 0) / 1000
    );

    const distanceText =
      selectedRoute.localizedValues?.distance ??
      this.formatDistance(distanceMeters);
    const durationText =
      selectedRoute.localizedValues?.duration ??
      this.formatDuration(durationSeconds);

    const steps = this.extractSteps(selectedRoute);

    return {
      origin,
      originLabel,
      destination,
      durationText,
      distanceText,
      distanceMeters,
      durationSeconds,
      path: finalPath,
      avoidsFloodZones: finalIntersections.length === 0,
      bypassedZoneNames,
      crossesFloodZone: finalIntersections.length > 0,
      steps,
    };
  }

  private async requestRoute(
    libs: Awaited<ReturnType<GoogleMapsLoaderService['ensureLoaded']>> & {},
    origin: LatLngLiteral,
    destination: LatLngLiteral,
    intermediates?: google.maps.routes.Waypoint[]
  ): Promise<google.maps.routes.Route | null> {
    const request: google.maps.routes.ComputeRoutesRequest = {
      origin,
      destination,
      intermediates,
      travelMode: 'DRIVING',
      fields: [
        'path',
        'legs',
        'distanceMeters',
        'durationMillis',
        'localizedValues',
        'routeLabels',
      ],
    };
    const { routes } = await libs.routes.Route.computeRoutes(request);
    return routes?.[0] ?? null;
  }

  private extractPath(route: google.maps.routes.Route): LatLngLiteral[] {
    if (!route.path || route.path.length === 0) {
      return [];
    }
    return route.path.map((pt) => ({
      lat: typeof pt.lat === 'number' ? pt.lat : Number(pt.lat),
      lng: typeof pt.lng === 'number' ? pt.lng : Number(pt.lng),
    }));
  }

  private extractSteps(route: google.maps.routes.Route): RouteStepSummary[] {
    const steps: RouteStepSummary[] = [];
    for (const leg of route.legs ?? []) {
      for (const step of leg.steps ?? []) {
        if (step.instructions) {
          steps.push({
            instruction: step.instructions,
            distanceText: step.localizedValues?.distance ?? '',
          });
        }
      }
    }
    return steps.slice(0, 8);
  }

  private findIntersectedZones(
    libs: NonNullable<ReturnType<GoogleMapsLoaderService['getLibrariesSync']>>,
    path: LatLngLiteral[],
    zonePolygons: Array<{
      zone: FloodZonePolygon;
      polygon: google.maps.Polygon;
    }>
  ): Array<{ zone: FloodZonePolygon; polygon: google.maps.Polygon }> {
    if (path.length === 0) return [];

    // Sample densely along path segments so narrow polygons cannot be skipped
    const samples: google.maps.LatLng[] = [];
    for (let i = 0; i < path.length; i += 1) {
      const curr = path[i];
      samples.push(new libs.core.LatLng(curr.lat, curr.lng));
      if (i + 1 < path.length) {
        const next = path[i + 1];
        const midLat = (curr.lat + next.lat) / 2;
        const midLng = (curr.lng + next.lng) / 2;
        samples.push(new libs.core.LatLng(midLat, midLng));
      }
    }

    const hit: Array<{ zone: FloodZonePolygon; polygon: google.maps.Polygon }> =
      [];
    for (const entry of zonePolygons) {
      const intersects = samples.some(
        (pt) =>
          libs.geometry.poly.containsLocation(pt, entry.polygon) ||
          libs.geometry.poly.isLocationOnEdge(pt, entry.polygon, 1e-4)
      );
      if (intersects) {
        hit.push(entry);
      }
    }
    return hit;
  }

  private buildSafeBypassWaypoints(
    libs: NonNullable<ReturnType<GoogleMapsLoaderService['getLibrariesSync']>>,
    origin: LatLngLiteral,
    destination: LatLngLiteral,
    intersectedZones: FloodZonePolygon[],
    allPolygons: Array<{
      zone: FloodZonePolygon;
      polygon: google.maps.Polygon;
    }>
  ): LatLngLiteral[] {
    const buffer = 0.0055;
    const candidates: LatLngLiteral[] = [];

    for (const zone of intersectedZones) {
      const lats = zone.paths.map((p) => p.lat);
      const lngs = zone.paths.map((p) => p.lng);
      const minLat = Math.min(...lats) - buffer;
      const maxLat = Math.max(...lats) + buffer;
      const minLng = Math.min(...lngs) - buffer;
      const maxLng = Math.max(...lngs) + buffer;
      const midLat = (minLat + maxLat) / 2;
      const midLng = (minLng + maxLng) / 2;

      candidates.push(
        { lat: midLat, lng: minLng },
        { lat: midLat, lng: maxLng },
        { lat: maxLat, lng: midLng },
        { lat: minLat, lng: midLng },
        { lat: maxLat, lng: minLng },
        { lat: minLat, lng: minLng },
        { lat: maxLat, lng: maxLng },
        { lat: minLat, lng: maxLng }
      );
    }

    // Filter out any candidate that falls inside any flood zone polygon
    const safeCandidates = candidates.filter((pt) => {
      const latLng = new libs.core.LatLng(pt.lat, pt.lng);
      return !allPolygons.some((entry) =>
        libs.geometry.poly.containsLocation(latLng, entry.polygon)
      );
    });

    // Sort candidates closest to midpoint of origin-destination for reasonable detours
    const tripMid: LatLngLiteral = {
      lat: (origin.lat + destination.lat) / 2,
      lng: (origin.lng + destination.lng) / 2,
    };

    safeCandidates.sort((a, b) => {
      const distA =
        Math.hypot(a.lat - tripMid.lat, a.lng - tripMid.lng) +
        Math.hypot(a.lat - origin.lat, a.lng - origin.lng) * 0.25;
      const distB =
        Math.hypot(b.lat - tripMid.lat, b.lng - tripMid.lng) +
        Math.hypot(b.lat - origin.lat, b.lng - origin.lng) * 0.25;
      return distA - distB;
    });

    return safeCandidates;
  }

  private formatCardinalDirection(cardinal?: string): string {
    if (!cardinal) return '--';
    const map: Record<string, string> = {
      NORTH: 'N',
      NORTH_NORTHEAST: 'NNE',
      NORTHEAST: 'NE',
      EAST_NORTHEAST: 'ENE',
      EAST: 'E',
      EAST_SOUTHEAST: 'ESE',
      SOUTHEAST: 'SE',
      SOUTH_SOUTHEAST: 'SSE',
      SOUTH: 'S',
      SOUTH_SOUTHWEST: 'SSW',
      SOUTHWEST: 'SW',
      WEST_SOUTHWEST: 'WSW',
      WEST: 'W',
      WEST_NORTHWEST: 'WNW',
      NORTHWEST: 'NW',
      NORTH_NORTHWEST: 'NNW',
    };
    return map[cardinal] ?? cardinal;
  }

  private formatDistance(meters: number): string {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  }

  private formatDuration(seconds: number): string {
    const mins = Math.max(1, Math.round(seconds / 60));
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const rem = mins % 60;
      return `${hrs} hr ${rem} min`;
    }
    return `${mins} min`;
  }
}
