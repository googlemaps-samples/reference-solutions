import { Injectable, signal } from '@angular/core';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

declare global {
  interface Window {
    __ENV__?: {
      GOOGLE_MAPS_API_KEY?: string;
    };
  }
}

export interface LoadedGoogleMapsLibraries {
  Map: typeof google.maps.Map;
  AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement;
  PinElement: typeof google.maps.marker.PinElement;
  Place: typeof google.maps.places.Place;
  PlaceAutocompleteElement: typeof google.maps.places.PlaceAutocompleteElement;
  Geocoder: typeof google.maps.Geocoder;
  LatLng: typeof google.maps.LatLng;
}

@Injectable({
  providedIn: 'root',
})
export class GoogleMapsLoaderService {
  readonly ready = signal(false);
  readonly error = signal<string | null>(null);
  readonly missingApiKey = signal(false);

  private loadPromise: Promise<LoadedGoogleMapsLibraries> | null = null;
  private optionsConfigured = false;

  getApiKey(): string {
    return (window.__ENV__?.GOOGLE_MAPS_API_KEY ?? '').trim();
  }

  async ensureLoaded(): Promise<LoadedGoogleMapsLibraries | null> {
    const apiKey = this.getApiKey();
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      this.missingApiKey.set(true);
      this.error.set(
        'Missing GOOGLE_MAPS_API_KEY. Copy .env.example to .env and configure a Google Maps API key or Maps Demo Key.',
      );
      return null;
    }

    this.missingApiKey.set(false);

    if (!this.loadPromise) {
      if (!this.optionsConfigured) {
        setOptions({
          key: apiKey,
          v: 'weekly',
          language: 'en',
          region: 'GB',
        });
        this.optionsConfigured = true;
      }

      this.loadPromise = Promise.all([
        importLibrary('maps'),
        importLibrary('marker'),
        importLibrary('places'),
        importLibrary('geocoding'),
        importLibrary('core'),
      ])
        .then(([mapsLib, markerLib, placesLib, geocodingLib, coreLib]) => {
          this.ready.set(true);
          this.error.set(null);
          return {
            Map: mapsLib.Map,
            AdvancedMarkerElement: markerLib.AdvancedMarkerElement,
            PinElement: markerLib.PinElement,
            Place: placesLib.Place,
            PlaceAutocompleteElement: placesLib.PlaceAutocompleteElement,
            Geocoder: geocodingLib.Geocoder,
            LatLng: coreLib.LatLng,
          };
        })
        .catch((err: unknown) => {
          const message =
            err instanceof Error
              ? err.message
              : 'Failed to load Google Maps JavaScript API libraries.';
          this.error.set(message);
          this.loadPromise = null;
          throw err;
        });
    }

    try {
      return await this.loadPromise;
    } catch {
      return null;
    }
  }
}
