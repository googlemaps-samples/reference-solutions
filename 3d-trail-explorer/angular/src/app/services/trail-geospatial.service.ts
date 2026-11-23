import { Injectable, inject } from '@angular/core';
import {
  ElevationSample,
  haversineDistanceKm,
  INITIAL_CENTER,
  LAKE_TAHOE_TRAIL_PATH,
  SelectedViewpointInfo,
  TrailMetrics,
} from '../data/tahoe-trail.data';
import { MapsLoaderService } from './maps-loader.service';

export interface ElevationProfileResult {
  samples: ElevationSample[];
  metrics: TrailMetrics;
}

@Injectable({
  providedIn: 'root',
})
export class TrailGeospatialService {
  private readonly mapsLoader = inject(MapsLoaderService);

  async fetchTrailElevationProfile(sampleCount = 64): Promise<ElevationProfileResult> {
    const { ElevationService } = await this.mapsLoader.loadElevationLibrary();
    const service = new ElevationService();

    const path = LAKE_TAHOE_TRAIL_PATH.map((wp) => ({
      lat: wp.lat,
      lng: wp.lng,
    }));

    const response = await service.getElevationAlongPath({
      path,
      samples: sampleCount,
    });

    const results = response.results || [];
    const samples: ElevationSample[] = [];
    let cumulativeDistanceKm = 0;
    let minElevationMeters = Number.POSITIVE_INFINITY;
    let maxElevationMeters = Number.NEGATIVE_INFINITY;
    let totalAscentMeters = 0;
    let totalDescentMeters = 0;

    for (let i = 0; i < results.length; i += 1) {
      const item = results[i];
      const lat = item.location?.lat() ?? path[0].lat;
      const lng = item.location?.lng() ?? path[0].lng;

      if (i > 0) {
        const prev = samples[i - 1];
        cumulativeDistanceKm += haversineDistanceKm(
          { lat: prev.lat, lng: prev.lng },
          { lat, lng }
        );
        const delta = item.elevation - prev.elevationMeters;
        if (delta > 0) {
          totalAscentMeters += delta;
        } else {
          totalDescentMeters += Math.abs(delta);
        }
      }

      minElevationMeters = Math.min(minElevationMeters, item.elevation);
      maxElevationMeters = Math.max(maxElevationMeters, item.elevation);

      samples.push({
        index: i,
        lat,
        lng,
        elevationMeters: item.elevation,
        distanceKm: cumulativeDistanceKm,
        resolutionMeters: item.resolution ?? 0,
      });
    }

    if (samples.length === 0) {
      minElevationMeters = 0;
      maxElevationMeters = 0;
    }

    return {
      samples,
      metrics: {
        totalDistanceKm: cumulativeDistanceKm,
        minElevationMeters,
        maxElevationMeters,
        totalAscentMeters,
        totalDescentMeters,
      },
    };
  }

  async fetchPointElevation(lat: number, lng: number): Promise<number | null> {
    if (!this.mapsLoader.hasApiKey()) {
      return null;
    }
    try {
      const { ElevationService } = await this.mapsLoader.loadElevationLibrary();
      const service = new ElevationService();
      const response = await service.getElevationForLocations({
        locations: [{ lat, lng }],
      });
      return response.results?.[0]?.elevation ?? null;
    } catch {
      return null;
    }
  }

  async searchLandmarkByText(textQuery: string): Promise<SelectedViewpointInfo | null> {
    const trimmed = textQuery.trim();
    if (!trimmed || !this.mapsLoader.hasApiKey()) {
      return null;
    }

    const { Place } = await this.mapsLoader.loadPlacesLibrary();
    const { places } = await Place.searchByText({
      textQuery: trimmed,
      fields: [
        'id',
        'displayName',
        'formattedAddress',
        'location',
        'rating',
        'userRatingCount',
        'googleMapsURI',
      ],
      locationBias: {
        lat: INITIAL_CENTER.lat,
        lng: INITIAL_CENTER.lng,
      },
      maxResultCount: 1,
    });

    const place = places?.[0];
    if (!place || !place.location) {
      return null;
    }

    const lat = place.location.lat();
    const lng = place.location.lng();
    const elevationMeters = await this.fetchPointElevation(lat, lng);

    return {
      title: place.displayName || trimmed,
      subtitle: 'Places API (New) Landmark',
      address: place.formattedAddress || undefined,
      lat,
      lng,
      elevationMeters,
      rating: place.rating ?? null,
      userRatingCount: place.userRatingCount ?? null,
      googleMapsUri: place.googleMapsURI ?? null,
      source: 'places-search',
    };
  }

  async resolvePlacePrediction(
    placePrediction: google.maps.places.PlacePrediction
  ): Promise<SelectedViewpointInfo | null> {
    const place = placePrediction.toPlace();
    await place.fetchFields({
      fields: [
        'id',
        'displayName',
        'formattedAddress',
        'location',
        'rating',
        'userRatingCount',
        'googleMapsURI',
      ],
    });

    if (!place.location) {
      return null;
    }

    const lat = place.location.lat();
    const lng = place.location.lng();
    const elevationMeters = await this.fetchPointElevation(lat, lng);

    return {
      title: place.displayName || 'Selected Landmark',
      subtitle: 'Places Autocomplete Selection',
      address: place.formattedAddress || undefined,
      lat,
      lng,
      elevationMeters,
      rating: place.rating ?? null,
      userRatingCount: place.userRatingCount ?? null,
      googleMapsUri: place.googleMapsURI ?? null,
      source: 'places-search',
    };
  }
}
