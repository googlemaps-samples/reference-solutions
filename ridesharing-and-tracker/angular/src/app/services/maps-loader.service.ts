import { Injectable } from '@angular/core';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

export interface LoadedGmpLibraries {
  core: google.maps.CoreLibrary;
  maps: google.maps.MapsLibrary;
  marker: google.maps.MarkerLibrary;
  places: google.maps.PlacesLibrary;
  routes: google.maps.RoutesLibrary;
  geometry: google.maps.GeometryLibrary;
}

@Injectable({
  providedIn: 'root',
})
export class MapsLoaderService {
  private loadPromise: Promise<LoadedGmpLibraries> | null = null;

  getApiKey(): string {
    const key = window.__ENV__?.GOOGLE_MAPS_API_KEY?.trim() ?? '';
    return key === 'your_google_maps_api_key_here' ? '' : key;
  }

  hasApiKey(): boolean {
    return this.getApiKey().length > 0;
  }

  loadLibraries(): Promise<LoadedGmpLibraries> {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      return Promise.reject(
        new Error(
          'Missing GOOGLE_MAPS_API_KEY. Copy .env.example to .env and provide a valid Maps Demo Key or Google Cloud API key.'
        )
      );
    }

    setOptions({
      key: apiKey,
      v: 'weekly',
      language: 'en',
      region: 'US',
      internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
    } as Parameters<typeof setOptions>[0]);

    this.loadPromise = Promise.all([
      importLibrary('core') as Promise<google.maps.CoreLibrary>,
      importLibrary('maps') as Promise<google.maps.MapsLibrary>,
      importLibrary('marker') as Promise<google.maps.MarkerLibrary>,
      importLibrary('places') as Promise<google.maps.PlacesLibrary>,
      importLibrary('routes') as Promise<google.maps.RoutesLibrary>,
      importLibrary('geometry') as Promise<google.maps.GeometryLibrary>,
    ]).then(([core, maps, marker, places, routes, geometry]) => ({
      core,
      maps,
      marker,
      places,
      routes,
      geometry,
    }));

    return this.loadPromise;
  }
}
