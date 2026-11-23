import { Injectable } from '@angular/core';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

@Injectable({
  providedIn: 'root',
})
export class MapsLoaderService {
  private loadPromise: Promise<boolean> | null = null;
  private loaded = false;

  getApiKey(): string {
    const key = window.__ENV__?.GOOGLE_MAPS_API_KEY?.trim() ?? '';
    if (!key || key === 'your_google_maps_api_key_here') {
      return '';
    }
    return key;
  }

  hasApiKey(): boolean {
    return this.getApiKey().length > 0;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  loadMapsLibraries(): Promise<boolean> {
    if (this.loaded) {
      return Promise.resolve(true);
    }
    if (this.loadPromise) {
      return this.loadPromise;
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      return Promise.resolve(false);
    }

    setOptions({
      key: apiKey,
      v: 'weekly',
      language: 'en',
      region: 'US',
      libraries: ['maps', 'marker', 'places', 'geocoding'],
      mapIds: ['DEMO_MAP_ID'],
    });

    this.loadPromise = Promise.all([
      importLibrary('maps'),
      importLibrary('marker'),
      importLibrary('places'),
      importLibrary('geocoding'),
    ])
      .then(() => {
        this.loaded = true;
        return true;
      })
      .catch((err) => {
        console.error('Failed to load Google Maps JS API libraries:', err);
        this.loadPromise = null;
        return false;
      });

    return this.loadPromise;
  }

  async reverseGeocode(
    lat: number,
    lng: number,
  ): Promise<{ name: string; formattedAddress: string; placeId?: string }> {
    const fallback = {
      name: 'Selected Building Coordinate',
      formattedAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    };

    try {
      const ready = await this.loadMapsLibraries();
      if (!ready) {
        return fallback;
      }

      const { Geocoder } = await importLibrary('geocoding');
      const geocoder = new Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng } });
      const top = response.results?.[0];
      if (!top) {
        return fallback;
      }

      const streetNumber = top.address_components?.find((c) =>
        c.types.includes('street_number'),
      )?.short_name;
      const route = top.address_components?.find((c) =>
        c.types.includes('route'),
      )?.short_name;
      const locality = top.address_components?.find((c) =>
        c.types.includes('locality'),
      )?.long_name;

      const shortName =
        streetNumber && route
          ? `${streetNumber} ${route}`
          : route || locality || top.formatted_address.split(',')[0] || fallback.name;

      return {
        name: shortName,
        formattedAddress: top.formatted_address || fallback.formattedAddress,
        placeId: top.place_id,
      };
    } catch {
      return fallback;
    }
  }
}
