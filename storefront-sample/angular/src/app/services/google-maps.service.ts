import { Injectable } from '@angular/core';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import {
  CLINIC_DEFAULT_CENTER,
  ClinicDetails,
  ClinicPhoto,
  ClinicReview,
  GMP_ATTRIBUTION_ID,
  RouteSummary,
  SEED_SEARCH_QUERY,
  StreetViewEntranceData,
  TravelModeId,
} from '../models/storefront.models';

@Injectable({ providedIn: 'root' })
export class GoogleMapsService {
  private initPromise: Promise<void> | null = null;
  private initialized = false;

  getApiKey(): string {
    return (window.__ENV__?.GOOGLE_MAPS_API_KEY ?? '').trim();
  }

  hasApiKey(): boolean {
    const key = this.getApiKey();
    return Boolean(key && key !== 'your_google_maps_api_key_here');
  }

  async ensureLoaded(): Promise<void> {
    if (this.initialized) {
      return;
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    const apiKey = this.getApiKey();
    if (!apiKey || apiKey === 'your_google_maps_api_key_here') {
      throw new Error(
        'Missing GOOGLE_MAPS_API_KEY. Copy .env.example to .env and add your Google Maps Platform API key.'
      );
    }

    this.initPromise = (async () => {
      setOptions({
        key: apiKey,
        v: 'weekly',
        language: 'en',
        region: 'US',
        mapIds: ['DEMO_MAP_ID'],
      });

      await Promise.all([
        importLibrary('core'),
        importLibrary('maps'),
        importLibrary('marker'),
        importLibrary('places'),
        importLibrary('routes'),
        importLibrary('streetView'),
        importLibrary('geometry'),
      ]);

      this.initialized = true;
    })();

    return this.initPromise;
  }

  async fetchClinicDetails(): Promise<ClinicDetails> {
    await this.ensureLoaded();
    const { Place } = (await importLibrary('places')) as google.maps.PlacesLibrary;

    const { places } = await Place.searchByText({
      textQuery: SEED_SEARCH_QUERY,
      fields: [
        'id',
        'displayName',
        'formattedAddress',
        'location',
        'rating',
        'userRatingCount',
        'regularOpeningHours',
        'reviews',
        'photos',
        'nationalPhoneNumber',
        'websiteURI',
        'googleMapsURI',
        'businessStatus',
        'utcOffsetMinutes',
      ],
      locationBias: {
        center: CLINIC_DEFAULT_CENTER,
        radius: 5000,
      },
      maxResultCount: 1,
    });

    const place = places?.[0];
    if (!place) {
      throw new Error(`No Google Places match returned for "${SEED_SEARCH_QUERY}".`);
    }

    const location: google.maps.LatLngLiteral = place.location
      ? { lat: place.location.lat(), lng: place.location.lng() }
      : { ...CLINIC_DEFAULT_CENTER };

    const photos: ClinicPhoto[] = (place.photos ?? []).slice(0, 6).map((photo) => {
      const firstAttr = photo.authorAttributions?.[0];
      return {
        url: photo.getURI({ maxWidth: 640 }),
        authorName: firstAttr?.displayName || 'Google Contributor',
        authorUri: firstAttr?.uri ?? null,
      };
    });

    const reviews: ClinicReview[] = (place.reviews ?? []).slice(0, 5).map((review) => ({
      authorName: review.authorAttribution?.displayName || 'Google User',
      authorUri: review.authorAttribution?.uri ?? null,
      authorPhotoUri: review.authorAttribution?.photoURI ?? null,
      rating: review.rating ?? 5,
      relativeTime: review.relativePublishTimeDescription || 'Recently',
      text: review.text ?? review.originalText ?? '',
    }));

    const periods = place.regularOpeningHours?.periods ?? [];
    const isOpenNow = this.computeIsOpenNow(periods, place.utcOffsetMinutes ?? -480);

    return {
      id: place.id,
      name: place.displayName || '450 Sutter Dental Practice',
      formattedAddress: place.formattedAddress || '450 Sutter St, San Francisco, CA 94108',
      location,
      rating: place.rating ?? null,
      userRatingCount: place.userRatingCount ?? 0,
      isOpenNow,
      weekdayDescriptions: place.regularOpeningHours?.weekdayDescriptions ?? [],
      nationalPhoneNumber: place.nationalPhoneNumber ?? null,
      websiteUri: place.websiteURI ?? null,
      googleMapsUri: place.googleMapsURI ?? null,
      businessStatus: place.businessStatus ?? null,
      photos,
      reviews,
    };
  }

  async computeRoute(
    origin: google.maps.LatLngLiteral,
    destination: google.maps.LatLngLiteral,
    mode: TravelModeId,
    originLabel: string
  ): Promise<RouteSummary> {
    await this.ensureLoaded();
    const { Route } = (await importLibrary('routes')) as google.maps.RoutesLibrary;

    const travelModeMap: Record<TravelModeId, google.maps.TravelMode> = {
      DRIVING: google.maps.TravelMode.DRIVING,
      TRANSIT: google.maps.TravelMode.TRANSIT,
      WALKING: google.maps.TravelMode.WALKING,
    };

    const modeLabelMap: Record<TravelModeId, string> = {
      DRIVING: 'Driving',
      TRANSIT: 'Public Transit',
      WALKING: 'Walking',
    };

    const request: google.maps.routes.ComputeRoutesRequest = {
      origin,
      destination,
      travelMode: travelModeMap[mode],
      fields: ['durationMillis', 'distanceMeters', 'localizedValues', 'path', 'viewport'],
      internalUsageAttributionIds: [GMP_ATTRIBUTION_ID],
    };

    const { routes } = await Route.computeRoutes(request);
    const route = routes?.[0];
    if (!route) {
      throw new Error(`No ${modeLabelMap[mode]} route available between origin and clinic.`);
    }

    const path: google.maps.LatLngLiteral[] = (route.path ?? []).map((pt) => ({
      lat: pt.lat,
      lng: pt.lng,
    }));

    return {
      mode,
      modeLabel: modeLabelMap[mode],
      durationText: route.localizedValues?.duration || this.formatDurationMillis(route.durationMillis),
      distanceText: route.localizedValues?.distance || this.formatDistanceMeters(route.distanceMeters),
      originLabel,
      path,
      viewport: route.viewport ?? null,
    };
  }

  async findEntrancePanorama(
    clinicLocation: google.maps.LatLngLiteral
  ): Promise<StreetViewEntranceData | null> {
    await this.ensureLoaded();
    const { StreetViewService, StreetViewPreference, StreetViewSource } = (await importLibrary(
      'streetView'
    )) as google.maps.StreetViewLibrary;
    const { spherical } = (await importLibrary('geometry')) as google.maps.GeometryLibrary;

    const svService = new StreetViewService();

    const tryFetch = async (
      source: google.maps.StreetViewSource
    ): Promise<google.maps.StreetViewResponse | null> => {
      try {
        return await svService.getPanorama({
          location: clinicLocation,
          radius: 80,
          preference: StreetViewPreference.BEST,
          source,
        });
      } catch {
        return null;
      }
    };

    const response =
      (await tryFetch(StreetViewSource.OUTDOOR)) ?? (await tryFetch(StreetViewSource.DEFAULT));

    const panoLocation = response?.data?.location;
    if (!panoLocation?.pano || !panoLocation.latLng) {
      return null;
    }

    const heading = spherical.computeHeading(panoLocation.latLng, clinicLocation);

    return {
      panoId: panoLocation.pano,
      position: {
        lat: panoLocation.latLng.lat(),
        lng: panoLocation.latLng.lng(),
      },
      heading,
      pitch: 8,
      copyright: response?.data?.copyright ?? null,
      imageDate: response?.data?.imageDate ?? null,
    };
  }

  private computeIsOpenNow(
    periods: google.maps.places.OpeningHoursPeriod[],
    utcOffsetMinutes: number
  ): boolean | null {
    if (!periods.length) {
      return null;
    }

    if (
      periods.length === 1 &&
      periods[0].open.day === 0 &&
      periods[0].open.hour === 0 &&
      periods[0].open.minute === 0 &&
      !periods[0].close
    ) {
      return true;
    }

    const shifted = new Date(Date.now() + utcOffsetMinutes * 60_000);
    const currentDay = shifted.getUTCDay();
    const currentMinutes = currentDay * 1440 + shifted.getUTCHours() * 60 + shifted.getUTCMinutes();

    for (const period of periods) {
      const start = period.open.day * 1440 + period.open.hour * 60 + period.open.minute;
      const end = period.close
        ? period.close.day * 1440 + period.close.hour * 60 + period.close.minute
        : start + 1440;

      if (end > start) {
        if (currentMinutes >= start && currentMinutes < end) {
          return true;
        }
      } else {
        // Wraps across Saturday -> Sunday boundary
        if (currentMinutes >= start || currentMinutes < end) {
          return true;
        }
      }
    }

    return false;
  }

  private formatDurationMillis(durationMillis?: number | null): string {
    if (typeof durationMillis !== 'number' || !Number.isFinite(durationMillis)) {
      return 'N/A';
    }
    const totalMinutes = Math.max(1, Math.round(durationMillis / 60_000));
    if (totalMinutes < 60) {
      return `${totalMinutes} min`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
  }

  private formatDistanceMeters(distanceMeters?: number | null): string {
    if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters)) {
      return 'N/A';
    }
    const miles = distanceMeters / 1609.344;
    if (miles >= 0.1) {
      return `${miles.toFixed(1)} mi`;
    }
    return `${Math.round(distanceMeters)} m`;
  }
}
