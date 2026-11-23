'use client';

import React, { useEffect, useState } from 'react';
import {
  AdvancedMarker,
  Circle,
  InfoWindow,
  Map as GoogleMap,
  MapMouseEvent,
  Pin,
  useMap
} from '@vis.gl/react-google-maps';
import {
  CATEGORY_META,
  CommunitySpot,
  DEFAULT_RADIUS_METERS,
  GeocodeLocationResult,
  LatLngLiteral,
  PlaceSummary,
  formatPriceLevel
} from '@/lib/types';

interface MapCanvasProps {
  center: LatLngLiteral;
  zoom: number;
  places: PlaceSummary[];
  selectedPlaceId: string | null;
  showRadiusCircle: boolean;
  communitySpots: CommunitySpot[];
  reverseGeocodePoint: GeocodeLocationResult | null;
  onSelectPlace: (place: PlaceSummary) => void;
  onMapClick: (coords: LatLngLiteral) => void;
  onSelectCommunitySpot: (spot: CommunitySpot) => void;
}

export default function MapCanvas({
  center,
  zoom,
  places,
  selectedPlaceId,
  showRadiusCircle,
  communitySpots,
  reverseGeocodePoint,
  onSelectPlace,
  onMapClick,
  onSelectCommunitySpot
}: MapCanvasProps) {
  const map = useMap();
  const [infoPlaceId, setInfoPlaceId] = useState<string | null>(null);

  useEffect(() => {
    if (!map) return;
    map.panTo(center);
  }, [map, center]);

  useEffect(() => {
    if (!map) return;
    map.setZoom(zoom);
  }, [map, zoom]);

  const activeInfoPlace =
    places.find((p) => p.id === (infoPlaceId ?? selectedPlaceId)) ?? null;

  const handleMapClick = (event: MapMouseEvent) => {
    const latLng = event.detail?.latLng;
    if (!latLng) return;
    setInfoPlaceId(null);
    onMapClick({ lat: latLng.lat, lng: latLng.lng });
  };

  return (
    <div className="map-container" data-testid="map-canvas">
      <GoogleMap
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
        defaultCenter={center}
        defaultZoom={zoom}
        gestureHandling="greedy"
        clickableIcons={false}
        onClick={handleMapClick}
        style={{ width: '100%', height: '100%', minHeight: '520px' }}
      >
        {showRadiusCircle && (
          <Circle
            center={center}
            radius={DEFAULT_RADIUS_METERS}
            clickable={false}
            fillColor="#1A56DB"
            fillOpacity={0.07}
            strokeColor="#1A56DB"
            strokeOpacity={0.45}
            strokeWeight={2}
          />
        )}

        {places.map((place) => {
          const meta = CATEGORY_META[place.category];
          const isSelected = place.id === selectedPlaceId;
          return (
            <AdvancedMarker
              key={place.id}
              position={place.location}
              title={place.displayName}
              zIndex={isSelected ? 100 : 10}
              onClick={() => {
                setInfoPlaceId(place.id);
                onSelectPlace(place);
              }}
            >
              <Pin
                background={meta.background}
                borderColor={isSelected ? '#111827' : meta.borderColor}
                glyphColor={meta.glyphColor}
                glyphText={meta.glyphText}
                scale={isSelected ? 1.25 : 1}
              />
            </AdvancedMarker>
          );
        })}

        {communitySpots.map((spot) => (
          <AdvancedMarker
            key={spot.id}
            position={spot.location}
            title={`Community Spot: ${spot.name}`}
            zIndex={80}
            onClick={() => {
              setInfoPlaceId(null);
              onSelectCommunitySpot(spot);
            }}
          >
            <Pin
              background="#0F766E"
              borderColor="#134E4A"
              glyphColor="#FFFFFF"
              glyphText="★"
              scale={1.1}
            />
          </AdvancedMarker>
        ))}

        {reverseGeocodePoint && (
          <AdvancedMarker
            position={reverseGeocodePoint.location}
            title={reverseGeocodePoint.formattedAddress}
            zIndex={110}
          >
            <Pin
              background="#0284C7"
              borderColor="#0C4A6E"
              glyphColor="#FFFFFF"
              glyphText="+"
              scale={1.15}
            />
          </AdvancedMarker>
        )}

        {activeInfoPlace && (
          <InfoWindow
            position={activeInfoPlace.location}
            pixelOffset={[0, -34]}
            onCloseClick={() => setInfoPlaceId(null)}
          >
            <div style={{ maxWidth: 220, padding: '2px 4px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>
                {activeInfoPlace.displayName}
              </div>
              <div style={{ fontSize: 11.5, color: '#4B5563', marginTop: 2 }}>
                {activeInfoPlace.primaryTypeDisplayName}
                {activeInfoPlace.rating !== null
                  ? ` · ★ ${activeInfoPlace.rating.toFixed(1)}`
                  : ''}
                {activeInfoPlace.priceLevel
                  ? ` · ${formatPriceLevel(activeInfoPlace.priceLevel)}`
                  : ''}
              </div>
              <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>
                {activeInfoPlace.formattedAddress}
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      <div className="map-hint-pill">
        Click anywhere on the map to reverse-geocode &amp; pin a community spot
      </div>
    </div>
  );
}
