import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { AlertTriangle, KeyRound } from 'lucide-react';
import { ComparisonPanel } from './components/ComparisonPanel';
import { DirectorySidebar } from './components/DirectorySidebar';
import { HeaderBar } from './components/HeaderBar';
import { InspectorDrawer } from './components/InspectorDrawer';
import { CameraRequest, NeighborhoodMap } from './components/NeighborhoodMap';
import {
  CommunitySpot,
  DEFAULT_CENTER,
  LatLngPoint,
  NeighborhoodPreset,
  PlaceCategory,
  PlaceItem,
  ReverseGeocodeResult,
  SEARCH_RADIUS_METERS,
  VenueCategory,
} from './types/neighborhood';
import {
  DETAIL_FIELDS,
  SEARCH_FIELDS,
  extractNeighborhoodFromGeocoder,
  mapGooglePlaceToPlaceItem,
} from './utils/placeMapper';

const SESSION_SPOTS_KEY = 'london_neighborhood_community_spots_v1';

function loadSessionCommunitySpots(): CommunitySpot[] {
  try {
    const raw = sessionStorage.getItem(SESSION_SPOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CommunitySpot[]) : [];
  } catch {
    return [];
  }
}

const NeighborhoodDiscoveryShell: React.FC = () => {
  const placesLib = useMapsLibrary('places');
  const geocodingLib = useMapsLibrary('geocoding');

  const [searchCenter, setSearchCenter] =
    useState<LatLngPoint>(DEFAULT_CENTER);
  const [activePresetId, setActivePresetId] = useState<string>('covent-garden');
  const [activeNeighborhoodName, setActiveNeighborhoodName] =
    useState<string>('Covent Garden');
  const [activeCategory, setActiveCategory] = useState<PlaceCategory>('all');
  const [showRadiusCircle, setShowRadiusCircle] = useState<boolean>(true);
  const [cameraRequest, setCameraRequest] = useState<CameraRequest | null>(
    null
  );

  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [placeDetailsCache, setPlaceDetailsCache] = useState<
    Record<string, PlaceItem>
  >({});
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [infoWindowPlaceId, setInfoWindowPlaceId] = useState<string | null>(
    null
  );

  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState<boolean>(false);

  const [reverseGeocodeResult, setReverseGeocodeResult] =
    useState<ReverseGeocodeResult | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);

  const [communitySpots, setCommunitySpots] = useState<CommunitySpot[]>(() =>
    loadSessionCommunitySpots()
  );
  const [selectedCommunitySpotId, setSelectedCommunitySpotId] = useState<
    string | null
  >(null);

  const [isLoadingPlaces, setIsLoadingPlaces] = useState<boolean>(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const searchRequestSeq = useRef(0);
  const cameraSeq = useRef(0);

  const triggerCamera = useCallback((center: LatLngPoint, zoom?: number) => {
    cameraSeq.current += 1;
    setCameraRequest({ id: cameraSeq.current, center, zoom });
  }, []);

  // Persist community spots in sessionStorage (session-scoped only)
  useEffect(() => {
    try {
      sessionStorage.setItem(
        SESSION_SPOTS_KEY,
        JSON.stringify(communitySpots)
      );
    } catch {
      // Ignore storage quota issues
    }
  }, [communitySpots]);

  // Execute live Places API (New) Nearby Search whenever center, category, or placesLib updates
  useEffect(() => {
    if (!placesLib) return;

    const seq = ++searchRequestSeq.current;
    setIsLoadingPlaces(true);
    setErrorMessage(null);

    const includedPrimaryTypes =
      activeCategory === 'all'
        ? ['restaurant', 'cafe', 'museum', 'park']
        : [activeCategory];

    placesLib.Place.searchNearby({
      fields: SEARCH_FIELDS,
      locationRestriction: {
        center: searchCenter,
        radius: SEARCH_RADIUS_METERS,
      },
      includedPrimaryTypes,
      maxResultCount: 20,
      language: 'en',
      region: 'GB',
    })
      .then(({ places: rawPlaces }) => {
        if (seq !== searchRequestSeq.current) return;

        const mapped = rawPlaces
          .map((p) => mapGooglePlaceToPlaceItem(p, searchCenter, false))
          .filter((item): item is PlaceItem => item !== null)
          .sort((a, b) => a.distanceMeters - b.distanceMeters);

        setPlaces(mapped);
        setPlaceDetailsCache((prev) => {
          const next = { ...prev };
          for (const item of mapped) {
            const existing = next[item.id];
            next[item.id] = existing?.detailsLoaded
              ? { ...existing, distanceMeters: item.distanceMeters }
              : item;
          }
          return next;
        });
      })
      .catch((err: unknown) => {
        if (seq !== searchRequestSeq.current) return;
        const msg =
          err instanceof Error
            ? err.message
            : 'Unable to fetch nearby places from Places API (New).';
        setErrorMessage(msg);
        setPlaces([]);
      })
      .finally(() => {
        if (seq === searchRequestSeq.current) {
          setIsLoadingPlaces(false);
        }
      });
  }, [placesLib, searchCenter, activeCategory]);

  // Enrich a PlaceItem with full Place Details (reviews, website, phone, full hours)
  const ensurePlaceDetails = useCallback(
    async (placeItem: PlaceItem): Promise<PlaceItem> => {
      const cached = placeDetailsCache[placeItem.id];
      if (cached?.detailsLoaded) {
        return cached;
      }
      if (!placesLib) return placeItem;

      setIsLoadingDetails(true);
      try {
        const placeInstance = new placesLib.Place({
          id: placeItem.id,
          requestedLanguage: 'en',
          requestedRegion: 'GB',
        });
        await placeInstance.fetchFields({ fields: DETAIL_FIELDS });
        const enriched =
          mapGooglePlaceToPlaceItem(placeInstance, searchCenter, true) ??
          placeItem;

        setPlaceDetailsCache((prev) => ({
          ...prev,
          [enriched.id]: enriched,
        }));
        setPlaces((prev) =>
          prev.map((p) => (p.id === enriched.id ? enriched : p))
        );
        return enriched;
      } catch {
        return placeItem;
      } finally {
        setIsLoadingDetails(false);
      }
    },
    [placesLib, placeDetailsCache, searchCenter]
  );

  const handleSelectPlace = useCallback(
    (place: PlaceItem, panMap = true) => {
      setReverseGeocodeResult(null);
      setIsReverseGeocoding(false);
      setSelectedCommunitySpotId(null);
      setSelectedPlaceId(place.id);
      if (panMap) {
        triggerCamera(place.location);
      }
      void ensurePlaceDetails(place);
    },
    [ensurePlaceDetails, triggerCamera]
  );

  const handleMarkerClick = useCallback(
    (place: PlaceItem) => {
      setInfoWindowPlaceId(place.id);
      handleSelectPlace(place, false);
    },
    [handleSelectPlace]
  );

  const handleToggleCompare = useCallback(
    (place: PlaceItem) => {
      setComparisonIds((prev) => {
        if (prev.includes(place.id)) {
          return prev.filter((id) => id !== place.id);
        }
        if (prev.length >= 3) {
          return prev;
        }
        setIsComparisonOpen(true);
        void ensurePlaceDetails(place);
        return [...prev, place.id];
      });
    },
    [ensurePlaceDetails]
  );

  const handleSelectPreset = useCallback(
    (preset: NeighborhoodPreset) => {
      setActivePresetId(preset.id);
      setActiveNeighborhoodName(preset.label);
      setSearchCenter(preset.center);
      setSelectedPlaceId(null);
      setInfoWindowPlaceId(null);
      setReverseGeocodeResult(null);
      setSelectedCommunitySpotId(null);
      triggerCamera(preset.center, preset.zoom);
    },
    [triggerCamera]
  );

  const handleSelectAutocompletePlace = useCallback(
    async (place: google.maps.places.Place) => {
      setErrorMessage(null);
      try {
        await place.fetchFields({ fields: DETAIL_FIELDS });
        if (!place.location) return;

        const nextCenter: LatLngPoint = {
          lat: place.location.lat(),
          lng: place.location.lng(),
        };
        const label = place.displayName ?? place.formattedAddress ?? 'Selected Location';

        setActivePresetId('custom');
        setActiveNeighborhoodName(label);
        setSearchCenter(nextCenter);
        setReverseGeocodeResult(null);
        setSelectedCommunitySpotId(null);
        triggerCamera(nextCenter, 14);

        const mapped = mapGooglePlaceToPlaceItem(place, nextCenter, true);
        if (mapped) {
          const areaTypes = [
            'locality',
            'sublocality',
            'neighborhood',
            'postal_code',
            'administrative_area_level_1',
            'administrative_area_level_2',
            'route',
            'street_address',
          ];
          const isAreaOnly =
            mapped.types.length > 0 &&
            mapped.types.every((t) => areaTypes.includes(t));

          setPlaceDetailsCache((prev) => ({ ...prev, [mapped.id]: mapped }));
          if (!isAreaOnly) {
            setSelectedPlaceId(mapped.id);
            setInfoWindowPlaceId(mapped.id);
          } else {
            setSelectedPlaceId(null);
            setInfoWindowPlaceId(null);
          }
        }
      } catch (err: unknown) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Could not load details for the selected place.'
        );
      }
    },
    [triggerCamera]
  );

  const handleForwardGeocode = useCallback(
    async (address: string) => {
      if (!geocodingLib || !address.trim()) return;

      setIsGeocoding(true);
      setErrorMessage(null);
      try {
        const geocoder = new geocodingLib.Geocoder();
        const response = await geocoder.geocode({
          address: address.trim(),
          region: 'GB',
        });
        const first = response.results[0];
        if (!first?.geometry?.location) {
          setErrorMessage(`No location found for "${address}".`);
          return;
        }
        const nextCenter: LatLngPoint = {
          lat: first.geometry.location.lat(),
          lng: first.geometry.location.lng(),
        };
        const { neighborhood } = extractNeighborhoodFromGeocoder(first);
        setActivePresetId('custom');
        setActiveNeighborhoodName(neighborhood || first.formatted_address);
        setSearchCenter(nextCenter);
        setSelectedPlaceId(null);
        setInfoWindowPlaceId(null);
        setReverseGeocodeResult(null);
        setSelectedCommunitySpotId(null);
        triggerCamera(nextCenter, 14);
      } catch (err: unknown) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Forward geocoding failed for that address.'
        );
      } finally {
        setIsGeocoding(false);
      }
    },
    [geocodingLib, triggerCamera]
  );

  const handleMapClick = useCallback(
    async (latLng: LatLngPoint) => {
      setSelectedPlaceId(null);
      setInfoWindowPlaceId(null);
      setSelectedCommunitySpotId(null);
      setIsReverseGeocoding(true);
      setReverseGeocodeResult(null);

      if (!geocodingLib) {
        setIsReverseGeocoding(false);
        setReverseGeocodeResult({
          location: latLng,
          formattedAddress: `${latLng.lat.toFixed(5)}, ${latLng.lng.toFixed(5)}`,
          neighborhood: 'Pinned Coordinates',
          postalCode: null,
          placeId: null,
          plusCode: null,
        });
        return;
      }

      try {
        const geocoder = new geocodingLib.Geocoder();
        const response = await geocoder.geocode({ location: latLng });
        const best = response.results[0];
        if (best) {
          const { neighborhood, postalCode } =
            extractNeighborhoodFromGeocoder(best);
          setReverseGeocodeResult({
            location: latLng,
            formattedAddress: best.formatted_address,
            neighborhood,
            postalCode,
            placeId: best.place_id ?? null,
            plusCode:
              best.plus_code?.compound_code ??
              best.plus_code?.global_code ??
              null,
          });
        } else {
          setReverseGeocodeResult({
            location: latLng,
            formattedAddress: 'Unnamed London location',
            neighborhood: 'Central London',
            postalCode: null,
            placeId: null,
            plusCode: null,
          });
        }
      } catch {
        setReverseGeocodeResult({
          location: latLng,
          formattedAddress: `${latLng.lat.toFixed(5)}, ${latLng.lng.toFixed(5)}`,
          neighborhood: 'Selected Map Point',
          postalCode: null,
          placeId: null,
          plusCode: null,
        });
      } finally {
        setIsReverseGeocoding(false);
      }
    },
    [geocodingLib]
  );

  const handleSearchAroundPoint = useCallback(
    (center: LatLngPoint, label: string) => {
      setActivePresetId('custom');
      setActiveNeighborhoodName(label);
      setSearchCenter(center);
      setReverseGeocodeResult(null);
      triggerCamera(center, 14);
    },
    [triggerCamera]
  );

  const handleSaveCommunitySpot = useCallback(
    (input: {
      name: string;
      category: VenueCategory | 'community';
      note: string;
      formattedAddress: string;
      location: LatLngPoint;
    }) => {
      const spot: CommunitySpot = {
        id: `spot-${Date.now()}`,
        name: input.name,
        category: input.category,
        note: input.note,
        formattedAddress: input.formattedAddress,
        location: input.location,
        createdAt: new Date().toISOString(),
      };
      setCommunitySpots((prev) => [spot, ...prev]);
      setReverseGeocodeResult(null);
      setSelectedCommunitySpotId(spot.id);
    },
    []
  );

  const handleSelectCommunitySpot = useCallback(
    (spot: CommunitySpot) => {
      setReverseGeocodeResult(null);
      setSelectedPlaceId(null);
      setInfoWindowPlaceId(null);
      setSelectedCommunitySpotId(spot.id);
      triggerCamera(spot.location, 15);
    },
    [triggerCamera]
  );

  const handleRemoveCommunitySpot = useCallback((id: string) => {
    setCommunitySpots((prev) => prev.filter((s) => s.id !== id));
    setSelectedCommunitySpotId((prev) => (prev === id ? null : prev));
  }, []);

  const selectedPlace = useMemo(() => {
    if (!selectedPlaceId) return null;
    return (
      placeDetailsCache[selectedPlaceId] ??
      places.find((p) => p.id === selectedPlaceId) ??
      null
    );
  }, [selectedPlaceId, placeDetailsCache, places]);

  const infoWindowPlace = useMemo(() => {
    if (!infoWindowPlaceId) return null;
    return (
      placeDetailsCache[infoWindowPlaceId] ??
      places.find((p) => p.id === infoWindowPlaceId) ??
      null
    );
  }, [infoWindowPlaceId, placeDetailsCache, places]);

  const comparisonPlaces = useMemo(() => {
    return comparisonIds
      .map(
        (id) =>
          placeDetailsCache[id] ?? places.find((p) => p.id === id) ?? null
      )
      .filter((item): item is PlaceItem => item !== null);
  }, [comparisonIds, placeDetailsCache, places]);

  const selectedCommunitySpot = useMemo(() => {
    if (!selectedCommunitySpotId) return null;
    return (
      communitySpots.find((s) => s.id === selectedCommunitySpotId) ?? null
    );
  }, [selectedCommunitySpotId, communitySpots]);

  return (
    <div className="app-shell">
      <HeaderBar
        searchCenter={searchCenter}
        activePresetId={activePresetId}
        showRadiusCircle={showRadiusCircle}
        comparisonCount={comparisonIds.length}
        isComparisonOpen={isComparisonOpen}
        isGeocoding={isGeocoding}
        onSelectAutocompletePlace={handleSelectAutocompletePlace}
        onForwardGeocode={handleForwardGeocode}
        onSelectPreset={handleSelectPreset}
        onToggleRadiusCircle={() => setShowRadiusCircle((prev) => !prev)}
        onToggleComparison={() => setIsComparisonOpen((prev) => !prev)}
      />

      <main className="app-workspace">
        <DirectorySidebar
          activeNeighborhoodName={activeNeighborhoodName}
          activeCategory={activeCategory}
          places={places}
          selectedPlaceId={selectedPlaceId}
          comparisonIds={comparisonIds}
          communitySpots={communitySpots}
          isLoading={isLoadingPlaces}
          errorMessage={errorMessage}
          onSelectCategory={setActiveCategory}
          onSelectPlace={(place) => handleSelectPlace(place, true)}
          onToggleCompare={handleToggleCompare}
          onSelectCommunitySpot={handleSelectCommunitySpot}
          onRemoveCommunitySpot={handleRemoveCommunitySpot}
        />

        <div className="map-stage">
          <NeighborhoodMap
            searchCenter={searchCenter}
            cameraRequest={cameraRequest}
            showRadiusCircle={showRadiusCircle}
            places={places}
            selectedPlaceId={selectedPlaceId}
            infoWindowPlace={infoWindowPlace}
            communitySpots={communitySpots}
            reverseGeocodeResult={reverseGeocodeResult}
            onMapClick={handleMapClick}
            onMarkerClick={handleMarkerClick}
            onCloseInfoWindow={() => setInfoWindowPlaceId(null)}
            onCommunitySpotClick={handleSelectCommunitySpot}
          />

          <InspectorDrawer
            selectedPlace={selectedPlace}
            isLoadingDetails={isLoadingDetails}
            isCompared={
              selectedPlace ? comparisonIds.includes(selectedPlace.id) : false
            }
            comparisonFull={comparisonIds.length >= 3}
            reverseGeocodeResult={reverseGeocodeResult}
            isReverseGeocoding={isReverseGeocoding}
            selectedCommunitySpot={selectedCommunitySpot}
            onClose={() => {
              setSelectedPlaceId(null);
              setReverseGeocodeResult(null);
              setIsReverseGeocoding(false);
              setSelectedCommunitySpotId(null);
            }}
            onToggleCompare={handleToggleCompare}
            onSearchAroundPoint={handleSearchAroundPoint}
            onSaveCommunitySpot={handleSaveCommunitySpot}
          />

          <ComparisonPanel
            isOpen={isComparisonOpen}
            places={comparisonPlaces}
            onClose={() => setIsComparisonOpen(false)}
            onInspectPlace={(place) => handleSelectPlace(place, true)}
            onRemovePlace={(id) =>
              setComparisonIds((prev) => prev.filter((cid) => cid !== id))
            }
            onClearAll={() => setComparisonIds([])}
          />
        </div>
      </main>
    </div>
  );
};

export function App() {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
  const isMissingKey =
    !apiKey || apiKey === 'your_google_maps_api_key_here';

  if (isMissingKey) {
    return (
      <div className="missing-key-screen">
        <div className="missing-key-card">
          <div className="missing-key-icon">
            <KeyRound size={28} />
          </div>
          <h1>Configure Google Maps Platform API Key</h1>
          <p>
            Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in your{' '}
            <code>.env.local</code> file to load the Central London interactive
            map, Places API (New), and Geocoding API.
          </p>
          <div className="missing-key-steps">
            <div className="step-banner">
              <AlertTriangle size={16} />
              <span>
                Prototyping? Get a free zero-billing Maps Demo Key in 60 seconds:
              </span>
            </div>
            <ol>
              <li>
                Open{' '}
                <a
                  href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  mapsplatform.google.com/maps-demo-key
                </a>
              </li>
              <li>Sign in with a Google account and accept the Demo Terms.</li>
              <li>
                Copy <code>.env.example</code> to <code>.env.local</code> and
                set <code>VITE_GOOGLE_MAPS_API_KEY</code>.
              </li>
              <li>Restart the Vite dev or preview server.</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <APIProvider
      apiKey={apiKey}
      language="en"
      region="GB"
      libraries={['places', 'marker', 'geocoding', 'core']}
    >
      <NeighborhoodDiscoveryShell />
    </APIProvider>
  );
}

export default App;
