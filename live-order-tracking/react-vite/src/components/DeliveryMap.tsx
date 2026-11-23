import { useEffect } from 'react';
import {
  AdvancedMarker,
  Map as GoogleMap,
  Polygon,
  Polyline,
  useMap,
} from '@vis.gl/react-google-maps';
import { Bike, MapPin, Store } from 'lucide-react';
import {
  CHICAGO_DELIVERY_ZONE_POLYGON,
  INITIAL_MAP_ZOOM,
  KITCHEN_HUB,
} from '../constants/chicago';
import type {
  AddressValidationSummary,
  DeliveryEligibility,
  DeliveryRouteSummary,
  LatLngPoint,
  OrderStatus,
} from '../types/delivery';
import { formatDistanceKm, formatEtaMinutes } from '../utils/pricing';

interface DeliveryMapProps {
  validation: AddressValidationSummary | null;
  eligibility: DeliveryEligibility | null;
  route: DeliveryRouteSummary | null;
  courierPosition: LatLngPoint;
  courierHeading: number;
  courierProgress: number;
  orderStatus: OrderStatus;
  isSimulating: boolean;
}

function MapBoundsController({
  validation,
  route,
}: {
  validation: AddressValidationSummary | null;
  route: DeliveryRouteSummary | null;
}) {
  const map = useMap('live-tracking-map');

  useEffect(() => {
    if (!map) return;
    if (typeof google === 'undefined' || !google.maps?.LatLngBounds) return;

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(KITCHEN_HUB.coordinates);

    if (validation?.location) {
      bounds.extend(validation.location);
    }

    if (route?.path?.length) {
      for (const pt of route.path) {
        bounds.extend(pt);
      }
    }

    if (validation?.location || route?.path?.length) {
      map.fitBounds(bounds, { top: 72, right: 56, bottom: 84, left: 56 });
    }
  }, [map, validation, route]);

  return null;
}

export function DeliveryMap({
  validation,
  eligibility,
  route,
  courierPosition,
  courierHeading,
  courierProgress,
  orderStatus,
  isSimulating,
}: DeliveryMapProps) {
  const remainingEtaSeconds = route
    ? Math.max(0, Math.round(route.durationSeconds * (1 - courierProgress)))
    : 0;

  return (
    <div className="map-panel" data-testid="live-tracking-map">
      <GoogleMap
        id="live-tracking-map"
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
        defaultCenter={KITCHEN_HUB.coordinates}
        defaultZoom={INITIAL_MAP_ZOOM}
        gestureHandling="greedy"
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={true}
        style={{ width: '100%', height: '100%', minHeight: '560px' }}
      >
        <MapBoundsController validation={validation} route={route} />

        {/* Chicago Delivery Polygon Zone */}
        <Polygon
          paths={CHICAGO_DELIVERY_ZONE_POLYGON}
          strokeColor="#0D9488"
          strokeOpacity={0.85}
          strokeWeight={2.25}
          fillColor="#14B8A6"
          fillOpacity={0.1}
        />

        {/* Computed Routes API Polyline (casing + core) */}
        {route && route.path.length >= 2 && (
          <>
            <Polyline
              path={route.path}
              strokeColor="#1E3A8A"
              strokeOpacity={0.35}
              strokeWeight={8}
            />
            <Polyline
              path={route.path}
              strokeColor={eligibility?.isEligible ? '#2563EB' : '#DC2626'}
              strokeOpacity={0.95}
              strokeWeight={4.5}
            />
          </>
        )}

        {/* Kitchen Hub AdvancedMarker */}
        <AdvancedMarker
          position={KITCHEN_HUB.coordinates}
          title={KITCHEN_HUB.name}
          zIndex={20}
        >
          <div className="map-pin map-pin--kitchen">
            <div className="map-pin__badge">
              <Store size={15} strokeWidth={2.25} />
            </div>
            <span className="map-pin__label">Fulton Kitchen</span>
          </div>
        </AdvancedMarker>

        {/* Customer Drop-off AdvancedMarker */}
        {validation && (
          <AdvancedMarker
            position={validation.location}
            title={validation.formattedAddress}
            zIndex={25}
          >
            <div
              className={`map-pin ${
                eligibility?.isEligible
                  ? 'map-pin--customer'
                  : 'map-pin--ineligible'
              }`}
            >
              <div className="map-pin__badge">
                <MapPin size={15} strokeWidth={2.25} />
              </div>
              <span className="map-pin__label">
                {eligibility?.isEligible ? 'Drop-off' : 'Out of Zone'}
              </span>
            </div>
          </AdvancedMarker>
        )}

        {/* Animated Courier AdvancedMarker */}
        {route && eligibility?.isEligible && (
          <AdvancedMarker
            position={courierPosition}
            title="Active Delivery Courier"
            zIndex={35}
          >
            <div className="map-pin map-pin--courier">
              <div
                className="courier-puck"
                style={{
                  transform: `rotate(${Math.round(courierHeading - 90)}deg)`,
                }}
              >
                <Bike size={16} strokeWidth={2.4} />
              </div>
              <span className="map-pin__label map-pin__label--courier">
                {isSimulating
                  ? `Courier · ${Math.round(courierProgress * 100)}%`
                  : orderStatus === 'delivered'
                    ? 'Delivered'
                    : 'Courier Ready'}
              </span>
            </div>
          </AdvancedMarker>
        )}
      </GoogleMap>

      {/* Floating Live Telemetry Overlay */}
      <div className="map-overlay-card" aria-live="polite">
        <div className="map-overlay-card__row">
          <span className="overlay-pill overlay-pill--zone">
            <span className="dot dot--teal" /> 8 km / Polygon Zone
          </span>
          {route && (
            <span className="overlay-pill overlay-pill--eta">
              <span className="dot dot--blue" />
              {formatDistanceKm(route.distanceMeters)} ·{' '}
              {orderStatus === 'en-route' || orderStatus === 'arriving'
                ? `${formatEtaMinutes(remainingEtaSeconds)} left`
                : formatEtaMinutes(route.durationSeconds)}
            </span>
          )}
        </div>
        <div className="map-legend">
          <span className="legend-item">
            <span className="legend-swatch legend-swatch--kitchen" /> Kitchen
          </span>
          <span className="legend-item">
            <span className="legend-swatch legend-swatch--customer" /> Drop-off
          </span>
          <span className="legend-item">
            <span className="legend-swatch legend-swatch--courier" /> Courier
          </span>
          <span className="legend-item">
            <span className="legend-swatch legend-swatch--route" /> Routes API
          </span>
        </div>
      </div>
    </div>
  );
}
