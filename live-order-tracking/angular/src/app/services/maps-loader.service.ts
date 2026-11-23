import { Injectable } from '@angular/core';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

declare global {
  interface Window {
    __ENV__?: {
      GOOGLE_MAPS_API_KEY?: string;
    };
  }
}

export interface LoadedMapsLibraries {
  maps: google.maps.MapsLibrary;
  marker: google.maps.MarkerLibrary;
  places: google.maps.PlacesLibrary;
  addressValidation: google.maps.AddressValidationLibrary;
  routes: google.maps.RoutesLibrary;
  geometry: google.maps.GeometryLibrary;
  core: google.maps.CoreLibrary;
}

@Injectable({ providedIn: 'root' })
export class MapsLoaderService {
  private loadPromise: Promise<LoadedMapsLibraries> | null = null;
  private optionsConfigured = false;

  getApiKey(): string {
    return (window.__ENV__?.GOOGLE_MAPS_API_KEY ?? '').trim();
  }

  hasApiKey(): boolean {
    const key = this.getApiKey();
    return Boolean(key && key !== 'your_google_maps_api_key_here');
  }

  async load(): Promise<LoadedMapsLibraries> {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    const apiKey = this.getApiKey();
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      throw new Error(
        'Missing GOOGLE_MAPS_API_KEY. Copy .env.example to .env and configure a Google Maps Platform API key or Maps Demo Key.'
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
      importLibrary('maps') as Promise<google.maps.MapsLibrary>,
      importLibrary('marker') as Promise<google.maps.MarkerLibrary>,
      importLibrary('places') as Promise<google.maps.PlacesLibrary>,
      importLibrary('addressValidation') as Promise<google.maps.AddressValidationLibrary>,
      importLibrary('routes') as Promise<google.maps.RoutesLibrary>,
      importLibrary('geometry') as Promise<google.maps.GeometryLibrary>,
      importLibrary('core') as Promise<google.maps.CoreLibrary>,
    ]).then(([maps, marker, places, addressValidation, routes, geometry, core]) => ({
      maps,
      marker,
      places,
      addressValidation,
      routes,
      geometry,
      core,
    }));

    return this.loadPromise;
  }
}
