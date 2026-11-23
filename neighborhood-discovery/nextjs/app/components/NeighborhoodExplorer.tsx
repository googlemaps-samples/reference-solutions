'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  ALL_CATEGORIES,
  CommunitySpot,
  DEFAULT_RADIUS_METERS,
  FilterCategory,
  GeocodeLocationResult,
  LONDON_PRESETS,
  LatLngLiteral,
  PlaceDetail,
  PlaceSummary,
  haversineDistanceMeters
} from '@/lib/types';
import {
  fetchPlaceDetailsViaJsSdk,
  geocodeViaJsSdk,
  searchNearbyViaJsSdk
} from '@/lib/gmp-client-fallback';
import PlaceAutocompleteInput from './PlaceAutocompleteInput';
import MapCanvas from './MapCanvas';
import SidebarDirectory from './SidebarDirectory';
import DetailsDrawer from './DetailsDrawer';
import ComparisonPanel from './ComparisonPanel';

interface NeighborhoodExplorerProps {
  apiKey: string;
}

function ExplorerWorkspace({ apiKey }: NeighborhoodExplorerProps) {
  const placesLibrary = useMapsLibrary('places');
  const geocodingLibrary = useMapsLibrary('geocoding');

  const initialPreset = LONDON_PRESETS[0];
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    initialPreset.id
  );
  const [activeCenter, setActiveCenter] = useState<LatLngLiteral>(
    initialPreset.center
  );
  const [activeZoom, setActiveZoom] = useState<number>(initialPreset.zoom);
  const [activeAreaLabel, setActiveAreaLabel] = useState<string>(
    initialPreset.name
  );
  const [showRadiusCircle, setShowRadiusCircle] = useState<boolean>(true);

  const [geocodeInput, setGeocodeInput] = useState<string>('');
  const [isGeocodingAddress, setIsGeocodingAddress] = useState<boolean>(false);

  const [allPlaces, setAllPlaces] = useState<PlaceSummary[]>([]);
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
  const [isLoadingPlaces, setIsLoadingPlaces] = useState<boolean>(true);
  const [placesError, setPlacesError] = useState<string | null>(null);

  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [detailsCache, setDetailsCache] = useState<Record<string, PlaceDetail>>(
    {}
  );
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState<boolean>(false);

  const [reverseGeocodePoint, setReverseGeocodePoint] =
    useState<GeocodeLocationResult | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState<boolean>(false);
  const [communitySpots, setCommunitySpots] = useState<CommunitySpot[]>([]);

  const loadNearbyPlaces = useCallback(
    async (center: LatLngLiteral, label: string) => {
      setIsLoadingPlaces(true);
      setPlacesError(null);

      try {
        const res = await fetch('/api/places/nearby', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: center.lat,
            lng: center.lng,
            radiusMeters: DEFAULT_RADIUS_METERS,
            categories: ALL_CATEGORIES
          })
        });

        if (res.ok) {
          const data = (await res.json()) as { places?: PlaceSummary[] };
          setAllPlaces(data.places ?? []);
          setIsLoadingPlaces(false);
          return;
        }

        // Fall back to Maps JS SDK if server-side key is referrer-restricted
        if (placesLibrary) {
          const jsPlaces = await searchNearbyViaJsSdk(
            placesLibrary,
            center,
            DEFAULT_RADIUS_METERS,
            ALL_CATEGORIES
          );
          setAllPlaces(jsPlaces);
          setIsLoadingPlaces(false);
          return;
        }

        const errData = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(
          errData.message ??
            `Unable to load nearby places around ${label} (HTTP ${res.status}).`
        );
      } catch (err) {
        if (placesLibrary) {
          try {
            const jsPlaces = await searchNearbyViaJsSdk(
              placesLibrary,
              center,
              DEFAULT_RADIUS_METERS,
              ALL_CATEGORIES
            );
            setAllPlaces(jsPlaces);
            setPlacesError(null);
            setIsLoadingPlaces(false);
            return;
          } catch (sdkErr) {
            console.error('JS SDK nearby fallback failed:', sdkErr);
          }
        }

        setPlacesError(
          err instanceof Error
            ? err.message
            : 'Failed to load neighborhood places.'
        );
      } finally {
        setIsLoadingPlaces(false);
      }
    },
    [placesLibrary]
  );

  // Initial seed load in Central London
  useEffect(() => {
    void loadNearbyPlaces(initialPreset.center, initialPreset.name);
  }, [initialPreset.center, initialPreset.name, loadNearbyPlaces]);

  const placesWithinRadius = useMemo(() => {
    return allPlaces.filter(
      (p) =>
        haversineDistanceMeters(activeCenter, p.location) <=
        DEFAULT_RADIUS_METERS + 150
    );
  }, [allPlaces, activeCenter]);

  const categoryCounts = useMemo<Record<FilterCategory, number>>(() => {
    const counts: Record<FilterCategory, number> = {
      all: placesWithinRadius.length,
      restaurant: 0,
      cafe: 0,
      museum: 0,
      park: 0
    };
    for (const place of placesWithinRadius) {
      counts[place.category] = (counts[place.category] ?? 0) + 1;
    }
    return counts;
  }, [placesWithinRadius]);

  const visiblePlaces = useMemo(() => {
    if (activeCategory === 'all') return placesWithinRadius;
    return placesWithinRadius.filter((p) => p.category === activeCategory);
  }, [placesWithinRadius, activeCategory]);

  const fetchAndCacheDetails = useCallback(
    async (placeId: string) => {
      if (detailsCache[placeId]) return;
      setIsLoadingDetails(true);
      try {
        const res = await fetch(
          `/api/places/details?placeId=${encodeURIComponent(placeId)}`
        );
        if (res.ok) {
          const data = (await res.json()) as { place?: PlaceDetail };
          if (data.place) {
            const detail = data.place;
            setDetailsCache((prev) => ({ ...prev, [placeId]: detail }));
            return;
          }
        }
        if (placesLibrary) {
          const detail = await fetchPlaceDetailsViaJsSdk(
            placesLibrary,
            placeId
          );
          if (detail) {
            setDetailsCache((prev) => ({ ...prev, [placeId]: detail }));
          }
        }
      } catch (err) {
        if (placesLibrary) {
          try {
            const detail = await fetchPlaceDetailsViaJsSdk(
              placesLibrary,
              placeId
            );
            if (detail) {
              setDetailsCache((prev) => ({ ...prev, [placeId]: detail }));
            }
          } catch (sdkErr) {
            console.error('Place details fallback failed:', sdkErr);
          }
        } else {
          console.error('Place details error:', err);
        }
      } finally {
        setIsLoadingDetails(false);
      }
    },
    [detailsCache, placesLibrary]
  );

  const handleInspectPlace = useCallback(
    (place: PlaceSummary) => {
      setReverseGeocodePoint(null);
      setIsReverseGeocoding(false);
      setSelectedPlaceId(place.id);
      void fetchAndCacheDetails(place.id);
    },
    [fetchAndCacheDetails]
  );

  const handleToggleCompare = useCallback(
    (place: PlaceSummary) => {
      setCompareIds((prev) => {
        if (prev.includes(place.id)) {
          return prev.filter((id) => id !== place.id);
        }
        if (prev.length >= 3) {
          return prev;
        }
        setIsComparisonOpen(true);
        return [...prev, place.id];
      });
      void fetchAndCacheDetails(place.id);
    },
    [fetchAndCacheDetails]
  );

  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = LONDON_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPlaceId(null);
    setReverseGeocodePoint(null);
    setActiveCenter(preset.center);
    setActiveZoom(preset.zoom);
    setActiveAreaLabel(preset.name);
    void loadNearbyPlaces(preset.center, preset.name);
  };

  const handleAutocompletePlace = useCallback(
    (selection: {
      name: string;
      formattedAddress: string;
      location: LatLngLiteral;
    }) => {
      setSelectedPresetId('custom');
      setSelectedPlaceId(null);
      setReverseGeocodePoint(null);
      setActiveCenter(selection.location);
      setActiveZoom(14);
      setActiveAreaLabel(selection.name || selection.formattedAddress);
      void loadNearbyPlaces(selection.location, selection.name);
    },
    [loadNearbyPlaces]
  );

  const handleForwardGeocode = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = geocodeInput.trim();
    if (!query) return;

    setIsGeocodingAddress(true);
    setPlacesError(null);

    try {
      let geoResult: GeocodeLocationResult | null = null;
      const res = await fetch(
        `/api/geocode?address=${encodeURIComponent(query)}`
      );
      if (res.ok) {
        const data = (await res.json()) as {
          result?: GeocodeLocationResult | null;
        };
        geoResult = data.result ?? null;
      } else if (geocodingLibrary) {
        geoResult = await geocodeViaJsSdk(geocodingLibrary, { address: query });
      }

      if (geoResult) {
        setSelectedPresetId('custom');
        setSelectedPlaceId(null);
        setReverseGeocodePoint(null);
        setActiveCenter(geoResult.location);
        setActiveZoom(14);
        const label =
          geoResult.neighborhood ||
          geoResult.formattedAddress.split(',')[0] ||
          query;
        setActiveAreaLabel(label);
        await loadNearbyPlaces(geoResult.location, label);
      } else {
        setPlacesError(
          `No London address or neighborhood matched "${query}".`
        );
      }
    } catch (err) {
      if (geocodingLibrary) {
        try {
          const fallbackGeo = await geocodeViaJsSdk(geocodingLibrary, {
            address: query
          });
          if (fallbackGeo) {
            setSelectedPresetId('custom');
            setActiveCenter(fallbackGeo.location);
            setActiveZoom(14);
            const label =
              fallbackGeo.neighborhood ||
              fallbackGeo.formattedAddress.split(',')[0] ||
              query;
            setActiveAreaLabel(label);
            await loadNearbyPlaces(fallbackGeo.location, label);
            return;
          }
        } catch (sdkErr) {
          console.error('JS SDK forward geocode failed:', sdkErr);
        }
      }
      setPlacesError(
        err instanceof Error ? err.message : 'Address geocoding failed.'
      );
    } finally {
      setIsGeocodingAddress(false);
    }
  };

  const handleMapClick = useCallback(
    async (coords: LatLngLiteral) => {
      setSelectedPlaceId(null);
      setIsReverseGeocoding(true);
      setReverseGeocodePoint(null);

      try {
        let geoResult: GeocodeLocationResult | null = null;
        const res = await fetch(
          `/api/geocode?lat=${coords.lat}&lng=${coords.lng}`
        );
        if (res.ok) {
          const data = (await res.json()) as {
            result?: GeocodeLocationResult | null;
          };
          geoResult = data.result ?? null;
        } else if (geocodingLibrary) {
          geoResult = await geocodeViaJsSdk(geocodingLibrary, {
            location: coords
          });
        }

        if (geoResult) {
          setReverseGeocodePoint({
            ...geoResult,
            location: coords
          });
        } else {
          setReverseGeocodePoint({
            formattedAddress: `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
            placeId: '',
            location: coords,
            addressComponents: []
          });
        }
      } catch {
        if (geocodingLibrary) {
          try {
            const fallbackGeo = await geocodeViaJsSdk(geocodingLibrary, {
              location: coords
            });
            if (fallbackGeo) {
              setReverseGeocodePoint({ ...fallbackGeo, location: coords });
              return;
            }
          } catch {
            // Fall back to coordinate readout below
          }
        }
        setReverseGeocodePoint({
          formattedAddress: `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
          placeId: '',
          location: coords,
          addressComponents: []
        });
      } finally {
        setIsReverseGeocoding(false);
      }
    },
    [geocodingLibrary]
  );

  const handleSaveCommunitySpot = (
    draft: Omit<CommunitySpot, 'id' | 'createdAt'>
  ) => {
    const newSpot: CommunitySpot = {
      ...draft,
      id: `spot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString()
    };
    setCommunitySpots((prev) => [newSpot, ...prev]);
    setReverseGeocodePoint(null);
  };

  const handleFocusCommunitySpot = (spot: CommunitySpot) => {
    setSelectedPlaceId(null);
    setActiveCenter(spot.location);
    setActiveZoom(15);
    setReverseGeocodePoint({
      formattedAddress: spot.formattedAddress,
      placeId: spot.placeId ?? '',
      location: spot.location,
      neighborhood: spot.name,
      addressComponents: []
    });
  };

  const selectedPlace = useMemo(() => {
    if (!selectedPlaceId) return null;
    return (
      detailsCache[selectedPlaceId] ??
      allPlaces.find((p) => p.id === selectedPlaceId) ??
      null
    );
  }, [selectedPlaceId, detailsCache, allPlaces]);

  const comparedPlaces = useMemo(() => {
    return compareIds
      .map<PlaceDetail | PlaceSummary | null>(
        (id) => detailsCache[id] ?? allPlaces.find((p) => p.id === id) ?? null
      )
      .filter((p): p is PlaceDetail | PlaceSummary => p !== null);
  }, [compareIds, detailsCache, allPlaces]);

  if (!apiKey) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <div className="brand-block">
            <div className="brand-mark">LDN</div>
            <div>
              <h1 className="brand-title">Neighborhood Discovery</h1>
              <div className="brand-subtitle">Central London · 5 km Radius</div>
            </div>
          </div>
        </header>
        <main style={{ padding: 24, maxWidth: 680, margin: '24px auto' }}>
          <div className="banner-notice">
            <strong>Google Maps Platform API Key Required:</strong> Add{' '}
            <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to{' '}
            <code>.env.local</code> and restart the Next.js server. You can
            obtain a free zero-billing Maps Demo Key at{' '}
            <a
              href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
              target="_blank"
              rel="noopener noreferrer"
            >
              mapsplatform.google.com/maps-demo-key
            </a>
            .
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <div className="brand-mark">LDN</div>
          <div>
            <h1 className="brand-title">Neighborhood Discovery</h1>
            <div className="brand-subtitle">
              Central London · 5 km Directory
            </div>
          </div>
        </div>

        <div className="header-controls">
          <PlaceAutocompleteInput onPlaceSelected={handleAutocompletePlace} />

          <form className="geocode-form" onSubmit={handleForwardGeocode}>
            <input
              type="text"
              className="text-input"
              placeholder="Geocode London address or postcode…"
              aria-label="Address or neighborhood to geocode"
              value={geocodeInput}
              onChange={(e) => setGeocodeInput(e.target.value)}
            />
            <button
              id="address-geocode-button"
              data-testid="address-geocode-button"
              type="submit"
              className="btn btn-primary"
              disabled={isGeocodingAddress || !geocodeInput.trim()}
            >
              {isGeocodingAddress ? 'Locating…' : 'Geocode'}
            </button>
          </form>

          <select
            id="neighborhood-preset-select"
            data-testid="neighborhood-preset-select"
            className="select-input"
            aria-label="Central London neighborhood preset"
            value={selectedPresetId}
            onChange={(e) => handlePresetChange(e.target.value)}
          >
            {LONDON_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
            {selectedPresetId === 'custom' && (
              <option value="custom">Custom: {activeAreaLabel}</option>
            )}
          </select>

          <button
            id="radius-toggle-circle"
            data-testid="radius-toggle-circle"
            type="button"
            className={`btn ${showRadiusCircle ? 'btn-active' : ''}`}
            onClick={() => setShowRadiusCircle((v) => !v)}
          >
            5 km Circle: {showRadiusCircle ? 'On' : 'Off'}
          </button>

          <button
            id="toggle-comparison-button"
            data-testid="toggle-comparison-button"
            type="button"
            className={`btn ${isComparisonOpen ? 'btn-active' : ''}`}
            onClick={() => setIsComparisonOpen((v) => !v)}
          >
            Compare ({compareIds.length}/3)
          </button>
        </div>
      </header>

      <main className="workspace">
        <SidebarDirectory
          places={visiblePlaces}
          allPlacesCount={placesWithinRadius.length}
          categoryCounts={categoryCounts}
          activeCategory={activeCategory}
          activeAreaLabel={activeAreaLabel}
          activeCenter={activeCenter}
          selectedPlaceId={selectedPlaceId}
          compareIds={compareIds}
          communitySpots={communitySpots}
          isLoading={isLoadingPlaces}
          errorMessage={placesError}
          onCategoryChange={setActiveCategory}
          onInspectPlace={handleInspectPlace}
          onToggleCompare={handleToggleCompare}
          onFocusCommunitySpot={handleFocusCommunitySpot}
          onDeleteCommunitySpot={(id) =>
            setCommunitySpots((prev) => prev.filter((s) => s.id !== id))
          }
        />

        <div className="map-stage">
          <MapCanvas
            center={activeCenter}
            zoom={activeZoom}
            places={visiblePlaces}
            selectedPlaceId={selectedPlaceId}
            showRadiusCircle={showRadiusCircle}
            communitySpots={communitySpots}
            reverseGeocodePoint={reverseGeocodePoint}
            onSelectPlace={handleInspectPlace}
            onMapClick={handleMapClick}
            onSelectCommunitySpot={handleFocusCommunitySpot}
          />

          <DetailsDrawer
            selectedPlace={selectedPlace}
            isLoadingDetails={isLoadingDetails}
            reverseGeocodePoint={reverseGeocodePoint}
            isGeocodingPoint={isReverseGeocoding}
            activeCenter={activeCenter}
            isCompared={
              selectedPlace ? compareIds.includes(selectedPlace.id) : false
            }
            canAddCompare={compareIds.length < 3}
            onClose={() => {
              setSelectedPlaceId(null);
              setReverseGeocodePoint(null);
              setIsReverseGeocoding(false);
            }}
            onToggleCompare={handleToggleCompare}
            onSaveCommunitySpot={handleSaveCommunitySpot}
          />

          <ComparisonPanel
            isOpen={isComparisonOpen}
            places={comparedPlaces}
            onClose={() => setIsComparisonOpen(false)}
            onInspect={handleInspectPlace}
            onRemove={(id) =>
              setCompareIds((prev) => prev.filter((item) => item !== id))
            }
          />
        </div>
      </main>
    </div>
  );
}

export default function NeighborhoodExplorer({
  apiKey
}: NeighborhoodExplorerProps) {
  if (!apiKey) {
    return <ExplorerWorkspace apiKey="" />;
  }

  return (
    <APIProvider apiKey={apiKey} language="en" region="GB">
      <ExplorerWorkspace apiKey={apiKey} />
    </APIProvider>
  );
}
