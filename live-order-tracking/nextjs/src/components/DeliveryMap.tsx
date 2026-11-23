'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Map as GoogleMap,
  AdvancedMarker,
  Polygon,
  Polyline,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { Store, Home, Bike, Navigation, ShieldCheck, ShieldAlert } from 'lucide-react';
import {
  DELIVERY_ZONE_POLYGON,
  KITCHEN_HUB,
  LatLngLiteral,
  formatEtaMinutes,
  isPointInDeliveryPolygonFallback,
} from '@/lib/delivery';

interface DeliveryMapProps {
  customerLocation: LatLngLiteral | null;
  customerAddress: string;
  routePath: LatLngLiteral[];
  courierPosition: LatLngLiteral;
  courierHeadingDeg: number;
  courierProgress: number;
  orderStatus: 'checkout' | 'preparing' | 'en_route' | 'delivered';
  isDeliverable: boolean;
  distanceMeters: number | null;
  durationSeconds: number | null;
  onPolygonEvaluated: (insidePolygon: boolean) => void;
}

export function DeliveryMap({
  customerLocation,
  customerAddress,
  routePath,
  courierPosition,
  courierHeadingDeg,
  courierProgress,
  orderStatus,
  isDeliverable,
  distanceMeters,
  durationSeconds,
  onPolygonEvaluated,
}: DeliveryMapProps) {
  const map = useMap();
  const geometryLibrary = useMapsLibrary('geometry');
  const coreLibrary = useMapsLibrary('core');
  const [polygonInstance, setPolygonInstance] = useState<google.maps.Polygon | null>(
    null
  );
  const lastFittedKeyRef = useRef<string>('');

  const polygonPaths = useMemo(() => [DELIVERY_ZONE_POLYGON], []);

  // Evaluate drop-off point against the Chicago delivery zone Polygon using google.maps.geometry.poly.containsLocation
  useEffect(() => {
    if (!customerLocation) {
      onPolygonEvaluated(false);
      return;
    }

    if (geometryLibrary && coreLibrary && polygonInstance) {
      const point = new coreLibrary.LatLng(
        customerLocation.lat,
        customerLocation.lng
      );
      const inside = geometryLibrary.poly.containsLocation(point, polygonInstance);
      onPolygonEvaluated(inside);
      return;
    }

    onPolygonEvaluated(isPointInDeliveryPolygonFallback(customerLocation));
  }, [customerLocation, geometryLibrary, coreLibrary, polygonInstance, onPolygonEvaluated]);

  // Fit viewport around Kitchen, Customer, and Route Polyline when destination/route changes
  useEffect(() => {
    if (!map || !coreLibrary) return;

    const routeKey = `${customerLocation?.lat ?? ''},${customerLocation?.lng ?? ''}|${routePath.length}`;
    if (lastFittedKeyRef.current === routeKey) return;
    lastFittedKeyRef.current = routeKey;

    const bounds = new coreLibrary.LatLngBounds();
    bounds.extend(KITCHEN_HUB.location);
    if (customerLocation) {
      bounds.extend(customerLocation);
    }
    for (const pt of routePath) {
      bounds.extend(pt);
    }

    if (customerLocation || routePath.length > 0) {
      map.fitBounds(bounds, { top: 72, right: 48, bottom: 72, left: 48 });
    }
  }, [map, coreLibrary, customerLocation, routePath]);

  const remainingSeconds =
    durationSeconds !== null
      ? Math.max(0, Math.round(durationSeconds * (1 - courierProgress)))
      : null;

  return (
    <div
      id="live-tracking-map"
      data-testid="live-tracking-map"
      className="map-stage"
    >
      <GoogleMap
        defaultCenter={KITCHEN_HUB.location}
        defaultZoom={13}
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
        gestureHandling="greedy"
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={true}
        style={{ width: '100%', height: '100%' }}
      >
        <Polygon
          ref={setPolygonInstance}
          paths={polygonPaths}
          strokeColor={isDeliverable ? '#0f766e' : '#d97706'}
          strokeOpacity={0.9}
          strokeWeight={2.5}
          fillColor={isDeliverable ? '#14b8a6' : '#f59e0b'}
          fillOpacity={0.11}
          clickable={false}
        />

        {routePath.length >= 2 && (
          <>
            <Polyline
              path={routePath}
              strokeColor="#1e3a8a"
              strokeOpacity={0.35}
              strokeWeight={9}
              zIndex={2}
            />
            <Polyline
              path={routePath}
              strokeColor={isDeliverable ? '#2563eb' : '#dc2626'}
              strokeOpacity={0.95}
              strokeWeight={5}
              zIndex={3}
            />
          </>
        )}

        {/* Kitchen Hub Advanced Marker */}
        <AdvancedMarker
          position={KITCHEN_HUB.location}
          title={KITCHEN_HUB.name}
          zIndex={10}
        >
          <div className="marker-pin marker-kitchen">
            <span className="marker-icon-circle">
              <Store size={14} strokeWidth={2.4} />
            </span>
            <span className="marker-label">Fulton Kitchen</span>
          </div>
        </AdvancedMarker>

        {/* Customer Drop-Off Advanced Marker */}
        {customerLocation && (
          <AdvancedMarker
            position={customerLocation}
            title={customerAddress || 'Customer Drop-Off'}
            zIndex={12}
          >
            <div
              className={`marker-pin ${
                isDeliverable ? 'marker-customer-ok' : 'marker-customer-blocked'
              }`}
            >
              <span className="marker-icon-circle">
                <Home size={14} strokeWidth={2.4} />
              </span>
              <span className="marker-label">
                {isDeliverable ? 'Drop-off' : 'Out of Zone'}
              </span>
            </div>
          </AdvancedMarker>
        )}

        {/* Live Animated Courier Advanced Marker */}
        {routePath.length >= 2 && isDeliverable && (
          <AdvancedMarker
            position={courierPosition}
            title="Live Courier"
            zIndex={20}
          >
            <div
              className={`marker-courier ${
                orderStatus === 'en_route' ? 'is-moving' : ''
              }`}
            >
              <span className="courier-pulse" />
              <span
                className="courier-badge"
                style={{
                  transform: `rotate(${Math.round(
                    ((courierHeadingDeg - 90 + 540) % 360) - 180
                  ) * 0.08}deg)`,
                }}
              >
                <Bike size={16} strokeWidth={2.4} />
              </span>
              <span className="courier-tag">
                {orderStatus === 'delivered'
                  ? 'Delivered'
                  : orderStatus === 'en_route'
                  ? `Courier · ${Math.round(courierProgress * 100)}%`
                  : 'Courier Ready'}
              </span>
            </div>
          </AdvancedMarker>
        )}
      </GoogleMap>

      {/* Floating Map Legend & Live ETA Overlay */}
      <div className="map-hud-top-left">
        <div className="map-hud-pill">
          {isDeliverable ? (
            <ShieldCheck size={16} className="text-emerald" />
          ) : (
            <ShieldAlert size={16} className="text-amber" />
          )}
          <span>
            {isDeliverable
              ? 'Chicago Polygon + ≤ 8 km Verified'
              : 'Delivery Eligibility Check Required'}
          </span>
        </div>

        {distanceMeters !== null && durationSeconds !== null && (
          <div className="map-hud-metrics">
            <div>
              <span className="hud-metric-label">Road Distance</span>
              <strong className="hud-metric-value">
                {(distanceMeters / 1000).toFixed(2)} km
              </strong>
            </div>
            <div className="hud-divider" />
            <div>
              <span className="hud-metric-label">
                {orderStatus === 'en_route' ? 'Remaining ETA' : 'Traffic ETA'}
              </span>
              <strong className="hud-metric-value">
                <Navigation size={13} className="inline-icon" />{' '}
                {orderStatus === 'delivered'
                  ? 'Arrived'
                  : formatEtaMinutes(remainingSeconds ?? durationSeconds)}
              </strong>
            </div>
          </div>
        )}
      </div>

      <div className="map-legend-card">
        <div className="legend-item">
          <span className="legend-swatch swatch-zone" />
          <span>8 km / Polygon Zone</span>
        </div>
        <div className="legend-item">
          <span className="legend-swatch swatch-route" />
          <span>Routes API Path</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot dot-kitchen" />
          <span>Kitchen</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot dot-customer" />
          <span>Customer</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot dot-courier" />
          <span>Courier</span>
        </div>
      </div>
    </div>
  );
}
