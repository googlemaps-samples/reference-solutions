'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  CLINIC_DEFAULT_LOCATION,
  CLINIC_SEED_QUERY,
  DEFAULT_ORIGIN,
} from '@/lib/constants';
import {
  computeOpenStatus,
  formatDistanceMeters,
  formatDurationSeconds,
} from '@/lib/hours';
import type {
  ClinicPlaceDetails,
  LatLngLiteral,
  OriginLocation,
  PlaceHoursPeriod,
  RouteSummary,
  TravelMode,
  ViewMode,
} from '@/lib/types';
import { BookingFormCard } from './BookingFormCard';
import { ClinicHeader } from './ClinicHeader';
import { ClinicMapViewport } from './ClinicMapViewport';
import { DirectionsPlannerCard } from './DirectionsPlannerCard';
import { VenueDetailsCard } from './VenueDetailsCard';

const JS_TRAVEL_MODE: Record<TravelMode, google.maps.TravelModeString> = {
  DRIVE: 'DRIVING',
  TRANSIT: 'TRANSIT',
  WALK: 'WALKING',
};

interface SdkDataBridgeProps {
  origin: OriginLocation;
  travelMode: TravelMode;
  clinicLocation: LatLngLiteral;
  onClinicLoaded: (clinic: ClinicPlaceDetails) => void;
  onClinicLoadingChange: (loading: boolean) => void;
  onClinicError: (error: string | null) => void;
  onRouteLoaded: (route: RouteSummary | null) => void;
  onRouteLoadingChange: (loading: boolean) => void;
  onRouteError: (error: string | null) => void;
}

function SdkDataBridge({
  origin,
  travelMode,
  clinicLocation,
  onClinicLoaded,
  onClinicLoadingChange,
  onClinicError,
  onRouteLoaded,
  onRouteLoadingChange,
  onRouteError,
}: SdkDataBridgeProps) {
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');
  const routeCacheRef = useRef<Record<string, RouteSummary>>({});
  const clinicFetchedRef = useRef(false);

  // Fetch clinic storefront details via BFF /api/places/search with Maps JS Place.searchByText fallback
  useEffect(() => {
    if (clinicFetchedRef.current) return;
    let cancelled = false;

    async function loadClinicDetails() {
      onClinicLoadingChange(true);
      onClinicError(null);

      try {
        const res = await fetch('/api/places/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ textQuery: CLINIC_SEED_QUERY }),
        });

        if (res.ok) {
          const data = (await res.json()) as { place?: ClinicPlaceDetails };
          if (!cancelled && data.place) {
            clinicFetchedRef.current = true;
            onClinicLoaded(data.place);
            onClinicLoadingChange(false);
            return;
          }
        }
      } catch {
        // Fall through to Maps JS SDK fallback if server endpoint cannot reach upstream
      }

      if (!placesLib) {
        return;
      }

      try {
        const { places } = await placesLib.Place.searchByText({
          textQuery: CLINIC_SEED_QUERY,
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
          ],
          maxResultCount: 1,
          locationBias: {
            center: CLINIC_DEFAULT_LOCATION,
            radius: 5000,
          },
          language: 'en',
          region: 'us',
        });

        if (cancelled) return;
        const p = places?.[0];
        if (!p) {
          onClinicError('Clinic listing could not be found in Google Places.');
          onClinicLoadingChange(false);
          return;
        }

        const periods: PlaceHoursPeriod[] | undefined =
          p.regularOpeningHours?.periods?.map((period) => ({
            open: {
              day: period.open.day,
              hour: period.open.hour,
              minute: period.open.minute,
            },
            close: period.close
              ? {
                  day: period.close.day,
                  hour: period.close.hour,
                  minute: period.close.minute,
                }
              : undefined,
          }));

        const mappedClinic: ClinicPlaceDetails = {
          id: p.id,
          displayName: p.displayName ?? '450 Sutter Dental Studio',
          formattedAddress:
            p.formattedAddress ?? '450 Sutter St, San Francisco, CA 94108',
          location: {
            lat: p.location?.lat() ?? CLINIC_DEFAULT_LOCATION.lat,
            lng: p.location?.lng() ?? CLINIC_DEFAULT_LOCATION.lng,
          },
          rating: p.rating ?? undefined,
          userRatingCount: p.userRatingCount ?? undefined,
          openNow: computeOpenStatus(undefined, periods),
          weekdayDescriptions: p.regularOpeningHours?.weekdayDescriptions ?? [],
          periods,
          reviews: (p.reviews ?? []).map((rev) => ({
            authorName: rev.authorAttribution?.displayName ?? 'Verified Patient',
            authorPhotoUri: rev.authorAttribution?.photoURI ?? undefined,
            authorUri: rev.authorAttribution?.uri ?? undefined,
            rating: rev.rating ?? 5,
            relativePublishTimeDescription:
              rev.relativePublishTimeDescription ?? '',
            text: rev.text ?? '',
            googleMapsUri: rev.googleMapsURI ?? undefined,
          })),
          photos: (p.photos ?? []).slice(0, 6).map((photo, idx) => ({
            name: `sdk-photo-${idx}`,
            directUri: photo.getURI({ maxWidth: 640 }),
            widthPx: photo.widthPx,
            heightPx: photo.heightPx,
            authorAttributions: (photo.authorAttributions ?? []).map((attr) => ({
              displayName: attr.displayName ?? '',
              uri: attr.uri ?? undefined,
            })),
          })),
          nationalPhoneNumber: p.nationalPhoneNumber ?? undefined,
          websiteUri: p.websiteURI ?? undefined,
          googleMapsUri: p.googleMapsURI ?? undefined,
          businessStatus: p.businessStatus ?? undefined,
        };

        clinicFetchedRef.current = true;
        onClinicLoaded(mappedClinic);
        onClinicLoadingChange(false);
      } catch {
        if (!cancelled) {
          onClinicError(
            'Unable to fetch live clinic details. Check that Places API (New) is enabled for your key.'
          );
          onClinicLoadingChange(false);
        }
      }
    }

    void loadClinicDetails();

    return () => {
      cancelled = true;
    };
  }, [placesLib, onClinicLoaded, onClinicLoadingChange, onClinicError]);

  // Compute route via BFF /api/routes/compute with Maps JS Route.computeRoutes fallback
  useEffect(() => {
    let cancelled = false;
    const cacheKey = `${origin.location.lat.toFixed(5)},${origin.location.lng.toFixed(
      5
    )}->${clinicLocation.lat.toFixed(5)},${clinicLocation.lng.toFixed(
      5
    )}:${travelMode}`;

    const cached = routeCacheRef.current[cacheKey];
    if (cached) {
      onRouteError(null);
      onRouteLoaded(cached);
      onRouteLoadingChange(false);
      return;
    }

    async function loadRoute() {
      onRouteLoadingChange(true);
      onRouteError(null);

      try {
        const res = await fetch('/api/routes/compute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: origin.location,
            destination: clinicLocation,
            travelMode,
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as { route?: RouteSummary };
          if (!cancelled && data.route) {
            routeCacheRef.current[cacheKey] = data.route;
            onRouteLoaded(data.route);
            onRouteLoadingChange(false);
            return;
          }
        }
      } catch {
        // Fall through to Maps JS SDK Route.computeRoutes fallback
      }

      if (!routesLib) {
        return;
      }

      try {
        const jsMode = JS_TRAVEL_MODE[travelMode];
        const request: google.maps.routes.ComputeRoutesRequest = {
          origin: origin.location,
          destination: clinicLocation,
          travelMode: jsMode,
          fields: ['durationMillis', 'distanceMeters', 'localizedValues', 'path'],
          units: 1, // UnitSystem.IMPERIAL
          language: 'en-US',
        };
        if (jsMode === 'DRIVING') {
          request.routingPreference = 'TRAFFIC_AWARE';
        }

        const { routes } = await routesLib.Route.computeRoutes(request);
        if (cancelled) return;

        const first = routes?.[0];
        if (!first) {
          onRouteLoaded(null);
          onRouteError('No route found for this travel mode.');
          onRouteLoadingChange(false);
          return;
        }

        const durationSeconds = Math.round((first.durationMillis ?? 0) / 1000);
        const distanceMeters = first.distanceMeters ?? 0;

        const summary: RouteSummary = {
          travelMode,
          durationSeconds,
          distanceMeters,
          durationText:
            first.localizedValues?.duration ?? formatDurationSeconds(durationSeconds),
          distanceText:
            first.localizedValues?.distance ?? formatDistanceMeters(distanceMeters),
          path: (first.path ?? []).map((pt) => ({ lat: pt.lat, lng: pt.lng })),
        };

        routeCacheRef.current[cacheKey] = summary;
        onRouteLoaded(summary);
        onRouteLoadingChange(false);
      } catch {
        if (!cancelled) {
          onRouteLoaded(null);
          onRouteError(
            'Unable to calculate route. Ensure Routes API is enabled for your API key.'
          );
          onRouteLoadingChange(false);
        }
      }
    }

    void loadRoute();

    return () => {
      cancelled = true;
    };
  }, [
    origin,
    travelMode,
    clinicLocation,
    routesLib,
    onRouteLoaded,
    onRouteLoadingChange,
    onRouteError,
  ]);

  return null;
}

interface StorefrontAppProps {
  apiKey: string;
}

export function StorefrontApp({ apiKey }: StorefrontAppProps) {
  const hasApiKey = apiKey.trim().length > 0;

  const [clinic, setClinic] = useState<ClinicPlaceDetails | null>(null);
  const [clinicLoading, setClinicLoading] = useState<boolean>(hasApiKey);
  const [clinicError, setClinicError] = useState<string | null>(
    hasApiKey
      ? null
      : 'Configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local to load live Google Places clinic data.'
  );

  const [origin, setOrigin] = useState<OriginLocation>(DEFAULT_ORIGIN);
  const [travelMode, setTravelMode] = useState<TravelMode>('DRIVE');
  const [route, setRoute] = useState<RouteSummary | null>(null);
  const [routeLoading, setRouteLoading] = useState<boolean>(hasApiKey);
  const [routeError, setRouteError] = useState<string | null>(null);

  const [showCoverage, setShowCoverage] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>('map');

  const clinicLocation = clinic?.location ?? CLINIC_DEFAULT_LOCATION;
  const clinicName = clinic?.displayName ?? '450 Sutter Dental Studio';

  const handleToggleCoverage = useCallback(() => {
    setShowCoverage((prev) => !prev);
  }, []);

  const content = (
    <div className="app-shell">
      {hasApiKey && (
        <SdkDataBridge
          origin={origin}
          travelMode={travelMode}
          clinicLocation={clinicLocation}
          onClinicLoaded={setClinic}
          onClinicLoadingChange={setClinicLoading}
          onClinicError={setClinicError}
          onRouteLoaded={setRoute}
          onRouteLoadingChange={setRouteLoading}
          onRouteError={setRouteError}
        />
      )}

      <ClinicHeader
        clinic={clinic}
        showCoverage={showCoverage}
        onToggleCoverage={handleToggleCoverage}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
      />

      <main className="main-workspace">
        <aside className="sidebar-column" aria-label="Clinic Storefront, Directions & Booking">
          <VenueDetailsCard
            clinic={clinic}
            loading={clinicLoading}
            error={clinicError}
          />

          <DirectionsPlannerCard
            hasApiKey={hasApiKey}
            origin={origin}
            onSelectOrigin={setOrigin}
            travelMode={travelMode}
            onSelectTravelMode={setTravelMode}
            route={route}
            routeLoading={routeLoading}
            routeError={routeError}
            clinicName={clinicName}
          />

          <BookingFormCard clinicLocation={clinicLocation} origin={origin} />
        </aside>

        <section className="viewport-column" aria-label="Interactive Clinic Map & Street View">
          <ClinicMapViewport
            hasApiKey={hasApiKey}
            clinic={clinic}
            origin={origin}
            showCoverage={showCoverage}
            viewMode={viewMode}
            route={route}
          />
        </section>
      </main>
    </div>
  );

  if (!hasApiKey) {
    return content;
  }

  return (
    <APIProvider apiKey={apiKey} version="weekly" language="en" region="US">
      {content}
    </APIProvider>
  );
}
