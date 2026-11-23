import { Injectable, signal } from '@angular/core';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

@Injectable({
  providedIn: 'root',
})
export class GoogleMapsLoaderService {
  readonly isLoaded = signal(false);
  readonly isLoading = signal(false);
  readonly hasApiKey = signal(false);
  readonly error = signal<string | null>(null);

  private loadPromise: Promise<boolean> | null = null;
  private optionsConfigured = false;

  getApiKey(): string {
    const raw = window.__GMP_CONFIG__?.googleMapsApiKey ?? '';
    const trimmed = raw.trim();
    if (!trimmed || trimmed === 'your_google_maps_api_key_here') {
      return '';
    }
    return trimmed;
  }

  async ensureLoaded(): Promise<boolean> {
    if (this.isLoaded()) {
      return true;
    }
    if (this.loadPromise) {
      return this.loadPromise;
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      this.hasApiKey.set(false);
      this.error.set(
        'Missing GOOGLE_MAPS_API_KEY. Set it in .env (a free Maps Demo Key works for prototyping) and restart the server.'
      );
      return false;
    }

    this.hasApiKey.set(true);
    this.isLoading.set(true);
    this.error.set(null);

    this.loadPromise = (async () => {
      try {
        if (!this.optionsConfigured) {
          setOptions({
            key: apiKey,
            v: 'weekly',
            language: 'en',
            region: 'US',
          });
          this.optionsConfigured = true;
        }

        await Promise.all([
          importLibrary('core'),
          importLibrary('maps'),
          importLibrary('marker'),
          importLibrary('places'),
          importLibrary('routes'),
          importLibrary('streetView'),
          importLibrary('geometry'),
        ]);

        this.isLoaded.set(true);
        return true;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to load Google Maps JavaScript API libraries.';
        this.error.set(message);
        this.loadPromise = null;
        return false;
      } finally {
        this.isLoading.set(false);
      }
    })();

    return this.loadPromise;
  }
}
