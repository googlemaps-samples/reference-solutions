import { Injectable, signal } from '@angular/core';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

export interface LoadedMapsLibraries {
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
export class GoogleMapsLoaderService {
  readonly ready = signal(false);
  readonly missingApiKey = signal(false);
  readonly error = signal<string | null>(null);

  private librariesPromise: Promise<LoadedMapsLibraries | null> | null = null;
  private initialized = false;

  getApiKey(): string {
    const raw = window.__ENV__?.GOOGLE_MAPS_API_KEY ?? '';
    const trimmed = raw.trim();
    if (!trimmed || trimmed === 'your_google_maps_api_key_here') {
      return '';
    }
    return trimmed;
  }

  async ensureLoaded(): Promise<LoadedMapsLibraries | null> {
    if (this.librariesPromise) {
      return this.librariesPromise;
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      this.missingApiKey.set(true);
      this.error.set(
        'GOOGLE_MAPS_API_KEY is not configured. Add it to .env and restart the server.'
      );
      return null;
    }

    if (!this.initialized) {
      setOptions({
        key: apiKey,
        v: 'weekly',
        language: 'en',
        region: 'US',
        solutionChannel: 'gmp_git_agentsamples_v1.0.0',
      });
      this.initialized = true;
    }

    this.librariesPromise = Promise.all([
      importLibrary('core'),
      importLibrary('maps'),
      importLibrary('marker'),
      importLibrary('places'),
      importLibrary('routes'),
      importLibrary('geometry'),
    ])
      .then(([core, maps, marker, places, routes, geometry]) => {
        const libs: LoadedMapsLibraries = {
          core,
          maps,
          marker,
          places,
          routes,
          geometry,
        };
        this.ready.set(true);
        this.error.set(null);
        return libs;
      })
      .catch((err: unknown) => {
        const msg =
          err instanceof Error
            ? err.message
            : 'Failed to load Google Maps JavaScript API libraries.';
        this.error.set(msg);
        return null;
      });

    return this.librariesPromise;
  }
}
