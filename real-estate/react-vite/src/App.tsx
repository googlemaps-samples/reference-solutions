import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  SAN_FRANCISCO_PROPERTIES,
  SF_DEFAULT_CENTER,
  SF_DEFAULT_ZOOM,
} from './data/properties';
import { TopSearchBar } from './components/TopSearchBar';
import { PropertyList } from './components/PropertyList';
import { ListingDetailPanel } from './components/ListingDetailPanel';
import { RealEstateMap, type CameraTarget } from './components/RealEstateMap';
import type {
  AmenityCategory,
  CommuteEstimate,
  LatLngPoint,
  NearbyAmenity,
  PropertyFilters,
  PropertyListing,
} from './types';

const DEFAULT_FILTERS: PropertyFilters = {
  maxPrice: null,
  minBeds: null,
  propertyType: 'ALL',
};

const RealEstateExplorer: React.FC = () => {
  const geometryLib = useMapsLibrary('geometry');
  const mapsLib = useMapsLibrary('maps');

  const [filters, setFilters] = useState<PropertyFilters>(DEFAULT_FILTERS);
  const [drawnPolygonCoords, setDrawnPolygonCoords] = useState<LatLngPoint[] | null>(
    null
  );
  const [isDrawing, setIsDrawing] = useState(false);
  const [clearPolygonNonce, setClearPolygonNonce] = useState(0);

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    SAN_FRANCISCO_PROPERTIES[0]?.id ?? null
  );
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'satellite'>('roadmap');

  const [searchedLocationLabel, setSearchedLocationLabel] = useState<string | null>(
    null
  );
  const [cameraTarget, setCameraTarget] = useState<CameraTarget | null>(null);

  const [activeAmenityTab, setActiveAmenityTab] = useState<AmenityCategory>('all');
  const [loadedAmenities, setLoadedAmenities] = useState<NearbyAmenity[]>([]);
  const [selectedAmenity, setSelectedAmenity] = useState<NearbyAmenity | null>(null);

  const [commuteEstimate, setCommuteEstimate] = useState<CommuteEstimate | null>(
    null
  );

  const filteredProperties = useMemo(() => {
    let boundaryPoly: google.maps.Polygon | null = null;
    if (drawnPolygonCoords && drawnPolygonCoords.length >= 3 && mapsLib) {
      boundaryPoly = new mapsLib.Polygon({ paths: drawnPolygonCoords });
    }

    return SAN_FRANCISCO_PROPERTIES.filter((property) => {
      if (filters.maxPrice !== null && property.price > filters.maxPrice) {
        return false;
      }
      if (filters.minBeds !== null && property.beds < filters.minBeds) {
        return false;
      }
      if (
        filters.propertyType !== 'ALL' &&
        property.propertyType !== filters.propertyType
      ) {
        return false;
      }
      if (boundaryPoly && geometryLib) {
        const inside = geometryLib.poly.containsLocation(
          new google.maps.LatLng(property.lat, property.lng),
          boundaryPoly
        );
        if (!inside) return false;
      }
      return true;
    });
  }, [filters, drawnPolygonCoords, geometryLib, mapsLib]);

  // Keep selectedPropertyId synchronized with visible filtered listings
  useEffect(() => {
    if (filteredProperties.length === 0) {
      setSelectedPropertyId(null);
      return;
    }
    const stillVisible = filteredProperties.some(
      (item) => item.id === selectedPropertyId
    );
    if (!stillVisible) {
      setSelectedPropertyId(filteredProperties[0].id);
    }
  }, [filteredProperties, selectedPropertyId]);

  const selectedProperty = useMemo(
    () =>
      filteredProperties.find((p) => p.id === selectedPropertyId) ??
      SAN_FRANCISCO_PROPERTIES.find((p) => p.id === selectedPropertyId) ??
      null,
    [filteredProperties, selectedPropertyId]
  );

  const hoveredProperty = useMemo(
    () =>
      filteredProperties.find((p) => p.id === hoveredPropertyId) ?? null,
    [filteredProperties, hoveredPropertyId]
  );

  const visibleAmenities = useMemo(() => {
    if (activeAmenityTab === 'all') return loadedAmenities;
    return loadedAmenities.filter((a) => a.category === activeAmenityTab);
  }, [loadedAmenities, activeAmenityTab]);

  const handleSelectProperty = useCallback((propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setSelectedAmenity(null);
    const match = SAN_FRANCISCO_PROPERTIES.find((p) => p.id === propertyId);
    if (match) {
      setCameraTarget({
        center: { lat: match.lat, lng: match.lng },
        zoom: 16,
        nonce: Date.now(),
      });
    }
  }, []);

  const handleFocusParcel = useCallback((property: PropertyListing) => {
    setCameraTarget({
      center: { lat: property.lat, lng: property.lng },
      zoom: 18,
      nonce: Date.now(),
    });
  }, []);

  const handleLocationSelected = useCallback(
    (
      location: LatLngPoint,
      viewport: google.maps.LatLngBoundsLiteral | null,
      label: string
    ) => {
      setSearchedLocationLabel(label);
      setCameraTarget({
        center: location,
        zoom: viewport ? undefined : 14,
        bounds: viewport,
        nonce: Date.now(),
      });
    },
    []
  );

  const handleResetSearchView = useCallback(() => {
    setSearchedLocationLabel(null);
    setCameraTarget({
      center: SF_DEFAULT_CENTER,
      zoom: SF_DEFAULT_ZOOM,
      nonce: Date.now(),
    });
  }, []);

  const handleStartDrawing = useCallback(() => {
    setIsDrawing((prev) => !prev);
  }, []);

  const handleClearDrawing = useCallback(() => {
    setIsDrawing(false);
    setDrawnPolygonCoords(null);
    setClearPolygonNonce((n) => n + 1);
  }, []);

  const handlePolygonCompleted = useCallback((coords: LatLngPoint[] | null) => {
    setIsDrawing(false);
    setDrawnPolygonCoords(coords);
  }, []);

  const handleResetAllFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setDrawnPolygonCoords(null);
    setIsDrawing(false);
    setClearPolygonNonce((n) => n + 1);
    setSearchedLocationLabel(null);
    setCameraTarget({
      center: SF_DEFAULT_CENTER,
      zoom: SF_DEFAULT_ZOOM,
      nonce: Date.now(),
    });
  }, []);

  const handleAmenitySelect = useCallback((amenity: NearbyAmenity) => {
    setSelectedAmenity(amenity);
    setCameraTarget({
      center: amenity.location,
      zoom: 15,
      nonce: Date.now(),
    });
  }, []);

  const handleCommuteComputed = useCallback(
    (estimate: CommuteEstimate | null) => {
      setCommuteEstimate(estimate);
      if (!estimate) return;
      const prop = SAN_FRANCISCO_PROPERTIES.find(
        (p) => p.id === estimate.propertyId
      );
      if (!prop) return;

      const north = Math.max(prop.lat, estimate.workplace.location.lat);
      const south = Math.min(prop.lat, estimate.workplace.location.lat);
      const east = Math.max(prop.lng, estimate.workplace.location.lng);
      const west = Math.min(prop.lng, estimate.workplace.location.lng);
      setCameraTarget({
        center: { lat: (north + south) / 2, lng: (east + west) / 2 },
        bounds: { north, south, east, west },
        nonce: Date.now(),
      });
    },
    []
  );

  return (
    <div className="app-shell">
      <TopSearchBar
        filters={filters}
        onFiltersChange={setFilters}
        totalMatching={filteredProperties.length}
        hasPolygonFilter={Boolean(drawnPolygonCoords)}
        searchedLocationLabel={searchedLocationLabel}
        onLocationSelected={handleLocationSelected}
        onResetSearchView={handleResetSearchView}
      />

      <main className="split-workspace">
        <section className="map-pane" aria-label="Interactive Real Estate Map">
          <RealEstateMap
            properties={filteredProperties}
            selectedProperty={selectedProperty}
            hoveredProperty={hoveredProperty}
            mapTypeId={mapTypeId}
            onToggleMapType={() =>
              setMapTypeId((prev) => (prev === 'roadmap' ? 'satellite' : 'roadmap'))
            }
            onSelectProperty={handleSelectProperty}
            onHoverProperty={setHoveredPropertyId}
            isDrawing={isDrawing}
            hasDrawnPolygon={Boolean(drawnPolygonCoords)}
            onStartDrawing={handleStartDrawing}
            onClearDrawing={handleClearDrawing}
            onPolygonCompleted={handlePolygonCompleted}
            clearPolygonNonce={clearPolygonNonce}
            cameraTarget={cameraTarget}
            visibleAmenities={visibleAmenities}
            selectedAmenity={selectedAmenity}
            onSelectAmenity={setSelectedAmenity}
            commuteEstimate={commuteEstimate}
          />
        </section>

        <aside className="left-sidebar" aria-label="Property Listings and Details">
          <PropertyList
            properties={filteredProperties}
            selectedPropertyId={selectedProperty?.id ?? null}
            hoveredPropertyId={hoveredPropertyId}
            hasPolygonFilter={Boolean(drawnPolygonCoords)}
            onSelectProperty={handleSelectProperty}
            onHoverProperty={setHoveredPropertyId}
            onResetAllFilters={handleResetAllFilters}
          />

          <ListingDetailPanel
            property={selectedProperty}
            activeAmenityTab={activeAmenityTab}
            onAmenityTabChange={setActiveAmenityTab}
            onAmenitiesLoaded={setLoadedAmenities}
            onAmenitySelect={handleAmenitySelect}
            onFocusParcel={handleFocusParcel}
            commuteEstimate={commuteEstimate}
            onCommuteComputed={handleCommuteComputed}
          />
        </aside>
      </main>
    </div>
  );
};

export function App() {
  const apiKey =
    (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() || '';

  if (!apiKey) {
    return (
      <div className="missing-key-screen">
        <div className="missing-key-card">
          <h1>Google Maps Platform API Key Required</h1>
          <p>
            Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in your <code>.env.local</code>{' '}
            file to launch the San Francisco Real Estate, Parcel &amp; Commute Explorer.
          </p>
          <ol>
            <li>
              Generate a free Maps Demo Key at{' '}
              <a
                href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
                target="_blank"
                rel="noreferrer"
              >
                mapsplatform.google.com/maps-demo-key
              </a>{' '}
              (no billing card required for prototyping) or use a restricted Google Cloud key.
            </li>
            <li>
              Copy <code>.env.example</code> to <code>.env.local</code> and paste your key into{' '}
              <code>VITE_GOOGLE_MAPS_API_KEY</code>.
            </li>
            <li>Restart the Vite dev or preview server.</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} language="en" region="US">
      <RealEstateExplorer />
    </APIProvider>
  );
}

export default App;
