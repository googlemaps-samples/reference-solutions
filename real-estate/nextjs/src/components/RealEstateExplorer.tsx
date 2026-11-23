'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { SF_PROPERTIES } from '@/data/properties';
import TopSearchBar from '@/components/TopSearchBar';
import PropertyList from '@/components/PropertyList';
import ListingDetailPanel from '@/components/ListingDetailPanel';
import RealEstateMap from '@/components/RealEstateMap';
import type {
  CommuteCalculationResult,
  LatLngPoint,
  PropertyFilters,
  PropertyListing,
} from '@/types/real-estate';

const INITIAL_FILTERS: PropertyFilters = {
  maxPrice: null,
  minBeds: null,
  propertyType: 'ALL',
};

function pointInRingFallback(point: LatLngPoint, ring: LatLngPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].lng;
    const yi = ring[i].lat;
    const xj = ring[j].lng;
    const yj = ring[j].lat;
    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function ExplorerWorkspace({ apiKey }: { apiKey: string }) {
  const geometryLib = useMapsLibrary('geometry');
  const mapsLib = useMapsLibrary('maps');
  const coreLib = useMapsLibrary('core');

  const [filters, setFilters] = useState<PropertyFilters>(INITIAL_FILTERS);
  const [searchPolygon, setSearchPolygon] = useState<LatLngPoint[] | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);
  const [commuteResult, setCommuteResult] = useState<CommuteCalculationResult | null>(null);
  const [mapTarget, setMapTarget] = useState<{
    center: LatLngPoint;
    zoom?: number;
    viewport?: google.maps.LatLngBoundsLiteral;
    nonce: number;
  } | null>(null);

  const filteredProperties = useMemo(() => {
    let containmentPolygon: google.maps.Polygon | null = null;
    if (searchPolygon && searchPolygon.length >= 3 && mapsLib) {
      containmentPolygon = new mapsLib.Polygon({ paths: searchPolygon });
    }

    return SF_PROPERTIES.filter((property) => {
      if (filters.maxPrice !== null && property.price > filters.maxPrice) return false;
      if (filters.minBeds !== null && property.beds < filters.minBeds) return false;
      if (filters.propertyType !== 'ALL' && property.propertyType !== filters.propertyType) {
        return false;
      }

      if (searchPolygon && searchPolygon.length >= 3) {
        if (containmentPolygon && geometryLib && coreLib) {
          return geometryLib.poly.containsLocation(
            new coreLib.LatLng(property.lat, property.lng),
            containmentPolygon
          );
        }
        return pointInRingFallback({ lat: property.lat, lng: property.lng }, searchPolygon);
      }

      return true;
    });
  }, [filters, searchPolygon, geometryLib, mapsLib, coreLib]);

  const selectedProperty = useMemo(
    () =>
      selectedPropertyId
        ? SF_PROPERTIES.find((p) => p.id === selectedPropertyId) ?? null
        : null,
    [selectedPropertyId]
  );

  const handleSelectProperty = useCallback((property: PropertyListing) => {
    setSelectedPropertyId(property.id);
    setMapTarget({
      center: { lat: property.lat, lng: property.lng },
      zoom: 17,
      nonce: Date.now(),
    });
  }, []);

  const handleLocationSelect = useCallback(
    (selection: {
      center: LatLngPoint;
      viewport?: google.maps.LatLngBoundsLiteral;
      label: string;
    }) => {
      setMapTarget({
        center: selection.center,
        viewport: selection.viewport,
        zoom: selection.viewport ? undefined : 14,
        nonce: Date.now(),
      });
    },
    []
  );

  const handleResetAll = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setSearchPolygon(null);
    setSelectedPropertyId(null);
    setCommuteResult(null);
    setMapTarget({
      center: { lat: 37.7749, lng: -122.4194 },
      zoom: 13,
      nonce: Date.now(),
    });
  }, []);

  return (
    <div className="app-shell">
      {!apiKey && (
        <div className="api-key-warning-banner" role="alert">
          <span>
            <strong>Google Maps API Key Required:</strong> Copy{' '}
            <code>.env.example</code> to <code>.env.local</code> and set{' '}
            <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to render live maps, Street View,
            Places, and Routes.
          </span>
          <a
            href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#92400e', fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            Get Free Maps Demo Key →
          </a>
        </div>
      )}

      <TopSearchBar
        filters={filters}
        onFiltersChange={setFilters}
        totalCount={SF_PROPERTIES.length}
        filteredCount={filteredProperties.length}
        hasActiveAreaFilter={Boolean(searchPolygon)}
        onLocationSelect={handleLocationSelect}
      />

      <main className="workspace-split">
        <aside className="left-pane" aria-label="Property listings and details">
          {selectedProperty ? (
            <ListingDetailPanel
              property={selectedProperty}
              onBack={() => {
                setSelectedPropertyId(null);
                setCommuteResult(null);
              }}
              commuteResult={commuteResult}
              onCommuteComputed={setCommuteResult}
            />
          ) : (
            <PropertyList
              properties={filteredProperties}
              selectedPropertyId={selectedPropertyId}
              hoveredPropertyId={hoveredPropertyId}
              onSelectProperty={handleSelectProperty}
              onHoverProperty={setHoveredPropertyId}
              hasActiveAreaFilter={Boolean(searchPolygon)}
              onResetAll={handleResetAll}
            />
          )}
        </aside>

        <RealEstateMap
          properties={filteredProperties}
          selectedProperty={selectedProperty}
          hoveredPropertyId={hoveredPropertyId}
          onSelectProperty={handleSelectProperty}
          onHoverProperty={setHoveredPropertyId}
          searchPolygon={searchPolygon}
          onSearchPolygonChange={setSearchPolygon}
          mapTarget={mapTarget}
          commuteResult={commuteResult}
        />
      </main>
    </div>
  );
}

export default function RealEstateExplorer({ apiKey }: { apiKey: string }) {
  return (
    <APIProvider
      apiKey={apiKey}
      language="en"
      region="US"
      libraries={['places', 'marker', 'routes', 'streetView', 'geometry', 'geocoding']}
    >
      <ExplorerWorkspace apiKey={apiKey} />
    </APIProvider>
  );
}
