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
  routes: google.maps.RoutesLibrary;
  geocoding: google.maps.GeocodingLibrary;
  geometry: google.maps.GeometryLibrary;
}

@Injectable({
  providedIn: 'root',
})
export class MapsLoaderService {
  private loadPromise: Promise<LoadedMapsLibraries> | null = null;
  private optionsConfigured = false;

  getApiKey(): string {
    return (window.__ENV__?.GOOGLE_MAPS_API_KEY || '').trim();
  }

  async load(): Promise<LoadedMapsLibraries> {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    const apiKey = this.getApiKey();
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      throw new Error(
        'Missing GOOGLE_MAPS_API_KEY. Set GOOGLE_MAPS_API_KEY in .env and restart serve-dist.mjs.'
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
      importLibrary('routes'),
      importLibrary('geocoding'),
      importLibrary('geometry'),
    ]).then(([core, maps, marker, places, routes, geocoding, geometry]) => ({
      core,
      maps,
      marker,
      places,
      routes,
      geocoding,
      geometry,
    }));

    return this.loadPromise;
  }
}
