import { Injectable, signal } from '@angular/core';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

declare global {
  interface Window {
    __ENV__?: {
      GOOGLE_MAPS_API_KEY?: string;
    };
  }
}

export interface LoadedMapsLibraries {
  core: google.maps.CoreLibrary;
  maps: google.maps.MapsLibrary;
  marker: google.maps.MarkerLibrary;
  places: google.maps.PlacesLibrary;
  routes: google.maps.RoutesLibrary;
  elevation: google.maps.ElevationLibrary;
}

@Injectable({
  providedIn: 'root',
})
export class GoogleMapsLoaderService {
  readonly isLoaded = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly missingApiKey = signal(false);

  private loadPromise: Promise<LoadedMapsLibraries> | null = null;
  private cachedLibraries: LoadedMapsLibraries | null = null;

  getApiKey(): string {
    const rawKey = window.__ENV__?.GOOGLE_MAPS_API_KEY ?? '';
    return rawKey.trim();
  }

  hasConfiguredKey(): boolean {
    const key = this.getApiKey();
    return Boolean(
      key &&
        key !== 'your_google_maps_api_key_here' &&
        !key.startsWith('REPLACE_')
    );
  }

  async load(): Promise<LoadedMapsLibraries> {
    if (this.cachedLibraries) {
      return this.cachedLibraries;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    const apiKey = this.getApiKey();
    if (!this.hasConfiguredKey()) {
      this.missingApiKey.set(true);
      const message =
        'Google Maps API key not configured. Add GOOGLE_MAPS_API_KEY to .env to enable live Maps, Places, Routes, and Elevation.';
      this.loadError.set(message);
      throw new Error(message);
    }

    this.loadPromise = (async () => {
      try {
        setOptions({
          key: apiKey,
          v: 'weekly',
          language: 'en',
          region: 'US',
        });

        const [core, maps, marker, places, routes, elevation] =
          await Promise.all([
            importLibrary('core'),
            importLibrary('maps'),
            importLibrary('marker'),
            importLibrary('places'),
            importLibrary('routes'),
            importLibrary('elevation'),
          ]);

        this.cachedLibraries = {
          core,
          maps,
          marker,
          places,
          routes,
          elevation,
        };
        this.isLoaded.set(true);
        this.loadError.set(null);
        return this.cachedLibraries;
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Failed to load Google Maps JavaScript API libraries.';
        this.loadError.set(msg);
        this.loadPromise = null;
        throw err;
      }
    })();

    return this.loadPromise;
  }
}
