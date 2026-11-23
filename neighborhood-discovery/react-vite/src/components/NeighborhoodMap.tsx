import React, { useEffect } from 'react';
import {
  AdvancedMarker,
  Circle,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useMap,
} from '@vis.gl/react-google-maps';
import { Crosshair, MapPin, Star } from 'lucide-react';
import {
  CATEGORY_META,
  CommunitySpot,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  LatLngPoint,
  PlaceItem,
  ReverseGeocodeResult,
  SEARCH_RADIUS_METERS,
} from '../types/neighborhood';
import { renderCategoryIcon } from './DirectorySidebar';
import { formatPriceLevel } from '../utils/placeMapper';

export interface CameraRequest {
  id: number;
  center: LatLngPoint;
  zoom?: number;
}

interface NeighborhoodMapProps {
  searchCenter: LatLngPoint;
  cameraRequest: CameraRequest | null;
  showRadiusCircle: boolean;
  places: PlaceItem[];
  selectedPlaceId: string | null;
  infoWindowPlace: PlaceItem | null;
  communitySpots: CommunitySpot[];
  reverseGeocodeResult: ReverseGeocodeResult | null;
  onMapClick: (latLng: LatLngPoint) => void;
  onMarkerClick: (place: PlaceItem) => void;
  onCloseInfoWindow: () => void;
  onCommunitySpotClick: (spot: CommunitySpot) => void;
}

const CameraController: React.FC<{
  cameraRequest: CameraRequest | null;
}> = ({ cameraRequest }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !cameraRequest) return;
    map.panTo(cameraRequest.center);
    if (typeof cameraRequest.zoom === 'number') {
      map.setZoom(cameraRequest.zoom);
    }
  }, [map, cameraRequest]);

  return null;
};

export const NeighborhoodMap: React.FC<NeighborhoodMapProps> = ({
  searchCenter,
  cameraRequest,
  showRadiusCircle,
  places,
  selectedPlaceId,
  infoWindowPlace,
  communitySpots,
  reverseGeocodeResult,
  onMapClick,
  onMarkerClick,
  onCloseInfoWindow,
  onCommunitySpotClick,
}) => {
  return (
    <div className="map-canvas-shell" data-testid="map-canvas">
      <GoogleMap
        id="main-map"
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        gestureHandling="greedy"
        clickableIcons={false}
        mapTypeControl={false}
        streetViewControl={true}
        fullscreenControl={true}
        style={{ width: '100%', height: '100%' }}
        onClick={(ev) => {
          if (ev.detail.latLng) {
            onMapClick({
              lat: ev.detail.latLng.lat,
              lng: ev.detail.latLng.lng,
            });
          }
        }}
      >
        <CameraController cameraRequest={cameraRequest} />

        <Circle
          center={searchCenter}
          radius={SEARCH_RADIUS_METERS}
          visible={showRadiusCircle}
          clickable={false}
          strokeColor="#2563eb"
          strokeOpacity={0.7}
          strokeWeight={2}
          fillColor="#3b82f6"
          fillOpacity={0.07}
        />

        {/* Active Search Center Anchor */}
        <AdvancedMarker
          position={searchCenter}
          title="Active 5 km Search Center"
          zIndex={5}
        >
          <div className="search-center-dot" aria-label="Search center">
            <span className="search-center-core" />
          </div>
        </AdvancedMarker>

        {/* Categorized Nearby Places Markers */}
        {places.map((place) => {
          const meta = CATEGORY_META[place.category];
          const isSelected = place.id === selectedPlaceId;
          return (
            <AdvancedMarker
              key={place.id}
              position={place.location}
              title={place.displayName}
              zIndex={isSelected ? 40 : 15}
              onClick={() => onMarkerClick(place)}
            >
              <Pin
                background={meta.color}
                borderColor={isSelected ? '#0f172a' : meta.borderColor}
                glyphColor="#ffffff"
                scale={isSelected ? 1.28 : 1.0}
              >
                {renderCategoryIcon(place.category, 14)}
              </Pin>
            </AdvancedMarker>
          );
        })}

        {/* Session Community Spot Markers */}
        {communitySpots.map((spot) => (
          <AdvancedMarker
            key={spot.id}
            position={spot.location}
            title={`Community Spot: ${spot.name}`}
            zIndex={35}
            onClick={() => onCommunitySpotClick(spot)}
          >
            <Pin
              background="#0d9488"
              borderColor="#115e59"
              glyphColor="#ffffff"
              scale={1.12}
            >
              <MapPin size={14} strokeWidth={2.4} />
            </Pin>
          </AdvancedMarker>
        ))}

        {/* Reverse-Geocode Click Inspector Pin */}
        {reverseGeocodeResult && (
          <AdvancedMarker
            position={reverseGeocodeResult.location}
            title={reverseGeocodeResult.formattedAddress}
            zIndex={50}
          >
            <Pin
              background="#e11d48"
              borderColor="#9f1239"
              glyphColor="#ffffff"
              scale={1.2}
            >
              <Crosshair size={14} strokeWidth={2.4} />
            </Pin>
          </AdvancedMarker>
        )}

        {/* Lightweight InfoWindow anchored above selected marker */}
        {infoWindowPlace && (
          <InfoWindow
            position={infoWindowPlace.location}
            pixelOffset={[0, -38]}
            onCloseClick={onCloseInfoWindow}
          >
            <div className="map-infowindow">
              <div className="infowindow-category">
                {infoWindowPlace.primaryTypeDisplayName ??
                  CATEGORY_META[infoWindowPlace.category].label}
              </div>
              <div className="infowindow-title">
                {infoWindowPlace.displayName}
              </div>
              <div className="infowindow-meta">
                {infoWindowPlace.rating !== null && (
                  <span className="infowindow-rating">
                    <Star size={12} className="star-icon" />
                    {infoWindowPlace.rating.toFixed(1)}
                    {infoWindowPlace.userRatingCount !== null &&
                      ` (${infoWindowPlace.userRatingCount.toLocaleString()})`}
                  </span>
                )}
                {formatPriceLevel(infoWindowPlace.priceLevel).symbols !==
                  '—' && (
                  <span>
                    {' · '}
                    {formatPriceLevel(infoWindowPlace.priceLevel).symbols}
                  </span>
                )}
              </div>
              <div className="infowindow-address">
                {infoWindowPlace.formattedAddress}
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Bottom-left Map Legend & Click Tip */}
      <div className="map-legend-overlay" aria-label="Map marker legend">
        <div className="legend-items">
          {(['restaurant', 'cafe', 'museum', 'park'] as const).map((cat) => (
            <span key={cat} className="legend-item">
              <span
                className="legend-swatch"
                style={{ backgroundColor: CATEGORY_META[cat].color }}
              />
              <span>{CATEGORY_META[cat].pluralLabel}</span>
            </span>
          ))}
          <span className="legend-item">
            <span
              className="legend-swatch"
              style={{ backgroundColor: '#0d9488' }}
            />
            <span>Community</span>
          </span>
        </div>
        <div className="legend-tip">
          Click anywhere on the map to reverse-geocode &amp; pin a spot
        </div>
      </div>
    </div>
  );
};
