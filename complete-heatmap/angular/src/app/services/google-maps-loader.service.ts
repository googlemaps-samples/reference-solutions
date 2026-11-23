import { Injectable, signal } from '@angular/core';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

declare global {
  interface Window {
    __ENV__?: {
      GOOGLE_MAPS_API_KEY?: string;
    };
  }
}

export interface LoadedGmpLibraries {
  core: google.maps.CoreLibrary;
  maps: google.maps.MapsLibrary;
  marker: google.maps.MarkerLibrary;
  places: google.maps.PlacesLibrary;
  routes: google.maps.RoutesLibrary;
  geocoding: google.maps.GeocodingLibrary;
  elevation: google.maps.ElevationLibrary;
  geometry: google.maps.GeometryLibrary;
}

@Injectable({
  providedIn: 'root',
})
export class GoogleMapsLoaderService {
  readonly isLoaded = signal(false);
  readonly isLoading = signal(false);
  readonly hasApiKey = signal(false);
  readonly loadError = signal<string | null>(null);

  private librariesPromise: Promise<LoadedGmpLibraries> | null = null;
  private cachedLibraries: LoadedGmpLibraries | null = null;
  private optionsConfigured = false;

  getApiKey(): string {
    const key = window.__ENV__?.GOOGLE_MAPS_API_KEY?.trim() ?? '';
    if (!key || key === 'your_google_maps_api_key_here') {
      return '';
    }
    return key;
  }

  async ensureLoaded(): Promise<LoadedGmpLibraries | null> {
    if (this.cachedLibraries) {
      return this.cachedLibraries;
    }
    if (this.librariesPromise) {
      return this.librariesPromise;
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      this.hasApiKey.set(false);
      this.loadError.set(
        'GOOGLE_MAPS_API_KEY is not configured. Copy .env.example to .env and add a Maps Demo Key or Google Cloud API key.'
      );
      return null;
    }

    this.hasApiKey.set(true);
    this.isLoading.set(true);
    this.loadError.set(null);

    if (!this.optionsConfigured) {
      setOptions({
        key: apiKey,
        v: 'weekly',
        language: 'en',
        region: 'US',
        internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
      } as Parameters<typeof setOptions>[0]);
      this.optionsConfigured = true;
    }

    this.librariesPromise = Promise.all([
      importLibrary('core'),
      importLibrary('maps'),
      importLibrary('marker'),
      importLibrary('places'),
      importLibrary('routes'),
      importLibrary('geocoding'),
      importLibrary('elevation'),
      importLibrary('geometry'),
    ])
      .then(
        ([
          core,
          maps,
          marker,
          places,
          routes,
          geocoding,
          elevation,
          geometry,
        ]) => {
          const libs: LoadedGmpLibraries = {
            core,
            maps,
            marker,
            places,
            routes,
            geocoding,
            elevation,
            geometry,
          };
          this.cachedLibraries = libs;
          this.isLoaded.set(true);
          this.isLoading.set(false);
          return libs;
        }
      )
      .catch((err: unknown) => {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to load Google Maps JavaScript API libraries.';
        this.loadError.set(message);
        this.isLoading.set(false);
        this.librariesPromise = null;
        throw err;
      });

    return this.librariesPromise;
  }

  getLibrariesSync(): LoadedGmpLibraries | null {
    return this.cachedLibraries;
  }
}
