import { Injectable } from '@angular/core';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

@Injectable({
  providedIn: 'root',
})
export class MapsLoaderService {
  private configured = false;
  private cachedApiKey: string | null = null;

  getApiKey(): string {
    if (this.cachedApiKey !== null) {
      return this.cachedApiKey;
    }
    const runtimeKey =
      typeof window !== 'undefined' ? window.__ENV__?.GOOGLE_MAPS_API_KEY : '';
    this.cachedApiKey = (runtimeKey || '').trim();
    return this.cachedApiKey;
  }

  hasApiKey(): boolean {
    return this.getApiKey().length > 0;
  }

  ensureConfigured(): boolean {
    const key = this.getApiKey();
    if (!key) {
      return false;
    }
    if (!this.configured) {
      setOptions({
        key,
        v: 'weekly',
      });
      this.configured = true;
    }
    return true;
  }

  async loadMaps3dLibrary(): Promise<google.maps.Maps3DLibrary> {
    if (!this.ensureConfigured()) {
      throw new Error('GOOGLE_MAPS_API_KEY is not configured.');
    }
    return importLibrary('maps3d');
  }

  async loadMaps2dLibrary(): Promise<google.maps.MapsLibrary> {
    if (!this.ensureConfigured()) {
      throw new Error('GOOGLE_MAPS_API_KEY is not configured.');
    }
    return importLibrary('maps');
  }

  async loadMarkerLibrary(): Promise<google.maps.MarkerLibrary> {
    if (!this.ensureConfigured()) {
      throw new Error('GOOGLE_MAPS_API_KEY is not configured.');
    }
    return importLibrary('marker');
  }

  async loadPlacesLibrary(): Promise<google.maps.PlacesLibrary> {
    if (!this.ensureConfigured()) {
      throw new Error('GOOGLE_MAPS_API_KEY is not configured.');
    }
    return importLibrary('places');
  }

  async loadElevationLibrary(): Promise<google.maps.ElevationLibrary> {
    if (!this.ensureConfigured()) {
      throw new Error('GOOGLE_MAPS_API_KEY is not configured.');
    }
    return importLibrary('elevation');
  }
}
