import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import type {
  ClinicPhoto,
  ClinicReview,
  ClinicVenueData,
  OriginLocation,
  RouteSummaryData,
  TravelModeKey,
} from './types';
import {
  DEFAULT_SF_CENTER,
  SEED_CLINIC_QUERY,
  SEED_ORIGIN_QUERY,
  computeDistanceMeters,
  computeOpenStatusFromPeriods,
} from './utils/geo';
import { ClinicHeader } from './components/ClinicHeader';
import { VenueStorefrontCard } from './components/VenueStorefrontCard';
import { VenueReviewsCard } from './components/VenueReviewsCard';
import { DirectionsPanel } from './components/DirectionsPanel';
import { BookingFormCard } from './components/BookingFormCard';
import { ClinicMapViewport } from './components/ClinicMapViewport';

function mapPlaceToVenue(place: google.maps.places.Place): ClinicVenueData | null {
  if (!place.location) return null;

  const photos: ClinicPhoto[] = (place.photos ?? [])
    .slice(0, 5)
    .map((photo) => ({
      url: photo.getURI({ maxWidth: 800, maxHeight: 500 }),
      authorName: photo.authorAttributions?.[0]?.displayName ?? undefined,
      authorUri: photo.authorAttributions?.[0]?.uri ?? undefined,
    }));

  const reviews: ClinicReview[] = (place.reviews ?? []).map((review) => ({
    authorName: review.authorAttribution?.displayName ?? 'Verified Patient',
    authorUri: review.authorAttribution?.uri ?? undefined,
    rating: review.rating ?? 5,
    relativeTime: review.relativePublishTimeDescription ?? '',
    text: review.text ?? '',
  }));

  return {
    id: place.id,
    name: place.displayName ?? 'San Francisco Dental Clinic',
    category: place.primaryTypeDisplayName ?? 'Dental Clinic',
    address: place.formattedAddress ?? 'San Francisco, CA',
    location: {
      lat: place.location.lat(),
      lng: place.location.lng(),
    },
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? null,
    phone: place.nationalPhoneNumber ?? null,
    websiteUri: place.websiteURI ?? null,
    googleMapsUri: place.googleMapsURI ?? null,
    weekdayDescriptions: place.regularOpeningHours?.weekdayDescriptions ?? [],
    openStatus: computeOpenStatusFromPeriods(place.regularOpeningHours),
    photos,
    reviews,
  };
}

const ClinicWorkspace: React.FC = () => {
  const placesLib = useMapsLibrary('places');
  const geometryLib = useMapsLibrary('geometry');

  const [clinic, setClinic] = useState<ClinicVenueData | null>(null);
  const [clinicLoading, setClinicLoading] = useState(true);
  const [clinicError, setClinicError] = useState<string | null>(null);

  const seedOriginRef = useRef<OriginLocation | null>(null);
  const [origin, setOrigin] = useState<OriginLocation | null>(null);
  const [travelMode, setTravelMode] = useState<TravelModeKey>('DRIVING');
  const [routeSummary, setRouteSummary] = useState<RouteSummaryData | null>(
    null
  );
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const [showCoverage, setShowCoverage] = useState(true);
  const [showStreetView, setShowStreetView] = useState(false);

  useEffect(() => {
    if (!placesLib) return;

    let cancelled = false;

    const loadInitialVenueAndOrigin = async () => {
      setClinicLoading(true);
      setClinicError(null);

      try {
        const [clinicResult, originResult] = await Promise.allSettled([
          placesLib.Place.searchByText({
            textQuery: SEED_CLINIC_QUERY,
            locationBias: { center: DEFAULT_SF_CENTER, radius: 5000 },
            maxResultCount: 1,
            language: 'en-US',
            region: 'us',
            internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
            fields: [
              'id',
              'displayName',
              'formattedAddress',
              'location',
              'rating',
              'userRatingCount',
              'regularOpeningHours',
              'nationalPhoneNumber',
              'websiteURI',
              'photos',
              'reviews',
              'googleMapsURI',
              'primaryTypeDisplayName',
            ],
          }),
          placesLib.Place.searchByText({
            textQuery: SEED_ORIGIN_QUERY,
            locationBias: { center: DEFAULT_SF_CENTER, radius: 10000 },
            maxResultCount: 1,
            language: 'en-US',
            region: 'us',
            internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
            fields: ['id', 'displayName', 'formattedAddress', 'location'],
          }),
        ]);

        if (cancelled) return;

        if (clinicResult.status === 'fulfilled') {
          const firstPlace = clinicResult.value.places[0];
          const mapped = firstPlace ? mapPlaceToVenue(firstPlace) : null;
          if (mapped) {
            setClinic(mapped);
          } else {
            setClinicError(
              'No San Francisco dental clinic details were returned by Places API (New).'
            );
          }
        } else {
          setClinicError(
            clinicResult.reason instanceof Error
              ? clinicResult.reason.message
              : 'Failed to load clinic details from Places API (New).'
          );
        }

        if (originResult.status === 'fulfilled') {
          const seedPlace = originResult.value.places[0];
          if (seedPlace?.location) {
            const resolvedSeed: OriginLocation = {
              id: seedPlace.id,
              name: seedPlace.displayName ?? 'Ferry Building',
              address: seedPlace.formattedAddress ?? SEED_ORIGIN_QUERY,
              location: {
                lat: seedPlace.location.lat(),
                lng: seedPlace.location.lng(),
              },
              isSeedDefault: true,
            };
            seedOriginRef.current = resolvedSeed;
            setOrigin((prev) => prev ?? resolvedSeed);
          }
        }
      } finally {
        if (!cancelled) {
          setClinicLoading(false);
        }
      }
    };

    void loadInitialVenueAndOrigin();

    return () => {
      cancelled = true;
    };
  }, [placesLib]);

  const handleResetOrigin = useCallback(() => {
    if (seedOriginRef.current) {
      setOrigin(seedOriginRef.current);
    }
  }, []);

  const straightLineDistanceMeters = useMemo(() => {
    if (!clinic || !origin) return null;
    return computeDistanceMeters(origin.location, clinic.location, geometryLib);
  }, [clinic, origin, geometryLib]);

  return (
    <div className="app-shell">
      <ClinicHeader
        clinic={clinic}
        loading={clinicLoading}
        showCoverage={showCoverage}
        onToggleCoverage={() => setShowCoverage((prev) => !prev)}
        showStreetView={showStreetView}
        onToggleStreetView={() => setShowStreetView((prev) => !prev)}
      />

      <main className="workspace-split">
        <aside className="sidebar-panel" aria-label="Clinic Storefront and Booking">
          <VenueStorefrontCard
            clinic={clinic}
            loading={clinicLoading}
            error={clinicError}
            distanceFromOriginMeters={straightLineDistanceMeters}
            originName={origin?.name ?? null}
          />

          <VenueReviewsCard clinic={clinic} loading={clinicLoading} />

          <DirectionsPanel
            origin={origin}
            onOriginChange={setOrigin}
            onResetOrigin={handleResetOrigin}
            travelMode={travelMode}
            onTravelModeChange={setTravelMode}
            routeSummary={routeSummary}
            routeLoading={routeLoading}
            routeError={routeError}
            straightLineDistanceMeters={straightLineDistanceMeters}
          />

          <BookingFormCard
            clinic={clinic}
            origin={origin}
            distanceFromOriginMeters={straightLineDistanceMeters}
          />
        </aside>

        <ClinicMapViewport
          clinic={clinic}
          origin={origin}
          travelMode={travelMode}
          showCoverage={showCoverage}
          showStreetView={showStreetView}
          onRouteComputed={setRouteSummary}
          onRouteLoadingChange={setRouteLoading}
          onRouteError={setRouteError}
        />
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
  const hasValidKey =
    apiKey.length > 0 && apiKey !== 'your_google_maps_api_key_here';

  if (!hasValidKey) {
    return (
      <div style={{ padding: '24px' }}>
        <div className="api-key-warning">
          <h2>Google Maps Platform API Key Required</h2>
          <p>
            Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in your{' '}
            <code>.env.local</code> file to load live San Francisco dental
            clinic details, interactive map markers, Street View, and multimodal
            directions.
          </p>
          <ol style={{ lineHeight: 1.6, paddingLeft: 20 }}>
            <li>
              Copy <code>.env.example</code> to <code>.env.local</code>.
            </li>
            <li>
              Obtain a free zero-billing{' '}
              <a
                href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
                target="_blank"
                rel="noreferrer"
              >
                Maps Demo Key
              </a>{' '}
              (or a Cloud Console key with Maps JavaScript API, Places API
              (New), and Routes API enabled).
            </li>
            <li>
              Restart the Vite dev or preview build so{' '}
              <code>import.meta.env.VITE_GOOGLE_MAPS_API_KEY</code> is bundled.
            </li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <APIProvider
      apiKey={apiKey}
      libraries={['places', 'routes', 'marker', 'streetView', 'geometry', 'core']}
      language="en"
      region="US"
    >
      <ClinicWorkspace />
    </APIProvider>
  );
};

export default App;
