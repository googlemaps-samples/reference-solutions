import { Injectable } from '@angular/core';
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
  elevation: google.maps.ElevationLibrary;
}

@Injectable({
  providedIn: 'root',
})
export class MapsLoaderService {
  private loadPromise: Promise<LoadedMapsLibraries> | null = null;
  private optionsConfigured = false;

  getApiKey(): string {
    if (typeof window === 'undefined') return '';
    const key = (window.__ENV__?.GOOGLE_MAPS_API_KEY || '').trim();
    if (!key || key === 'your_google_maps_api_key_here') {
      return '';
    }
    return key;
  }

  hasValidApiKey(): boolean {
    return this.getApiKey().length > 0;
  }

  loadLibraries(): Promise<LoadedMapsLibraries> {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      return Promise.reject(
        new Error('GOOGLE_MAPS_API_KEY is not configured in .env.')
      );
    }

    if (!this.optionsConfigured) {
      setOptions({
        key: apiKey,
        v: 'weekly',
        language: 'en',
        region: 'US',
      });
      this.optionsConfigured = true;
    }

    this.loadPromise = Promise.all([
      importLibrary('core'),
      importLibrary('maps'),
      importLibrary('marker'),
      importLibrary('places'),
      importLibrary('elevation'),
    ]).then(([core, maps, marker, places, elevation]) => ({
      core,
      maps,
      marker,
      places,
      elevation,
    }));

    return this.loadPromise;
  }
}
