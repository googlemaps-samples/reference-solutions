import { useEffect } from 'react';
import {
  AdvancedMarker,
  Map as GoogleMap,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { LA_CENTER } from '../data/drivers';
import type {
  CandidateDriver,
  DriverLiveState,
  ResolvedPlace,
  RouteComparisonResult,
  RouteKind,
} from '../types/rideshare';
import { RoutePolyline } from './RoutePolyline';

interface RideshareMapProps {
  pickup: ResolvedPlace | null;
  dropoff: ResolvedPlace | null;
  routeComparison: RouteComparisonResult | null;
  selectedRouteKind: RouteKind;
  onSelectRoute: (kind: RouteKind) => void;
  candidateDrivers: CandidateDriver[];
  driverState: DriverLiveState;
  hasApiKey: boolean;
}

function MapViewportFitter({
  pickup,
  dropoff,
  routeComparison,
}: {
  pickup: ResolvedPlace | null;
  dropoff: ResolvedPlace | null;
  routeComparison: RouteComparisonResult | null;
}) {
  const map = useMap();
  const coreLib = useMapsLibrary('core');

  useEffect(() => {
    if (!map || !coreLib || (!pickup && !dropoff)) {
      return;
    }

    const bounds = new coreLib.LatLngBounds();
    let hasPoint = false;

    if (pickup) {
      bounds.extend(pickup.location);
      hasPoint = true;
    }
    if (dropoff) {
      bounds.extend(dropoff.location);
      hasPoint = true;
    }
    if (routeComparison) {
      for (const pt of routeComparison.fastest.path) {
        bounds.extend(pt);
        hasPoint = true;
      }
      for (const pt of routeComparison.eco.path) {
        bounds.extend(pt);
        hasPoint = true;
      }
    }

    if (hasPoint) {
      map.fitBounds(bounds, { top: 64, right: 56, bottom: 72, left: 56 });
    }
  }, [map, coreLib, pickup, dropoff, routeComparison]);

  return null;
}

export function RideshareMap({
  pickup,
  dropoff,
  routeComparison,
  selectedRouteKind,
  onSelectRoute,
  candidateDrivers,
  driverState,
  hasApiKey,
}: RideshareMapProps) {
  const fastestRoute = routeComparison?.fastest ?? null;
  const ecoRoute = routeComparison?.eco ?? null;
  const isSameRoute = routeComparison?.isSameRoute ?? false;
  const activeDriverId = driverState.driver?.id ?? null;

  return (
    <div className="map-stage" data-testid="rideshare-map">
      {!hasApiKey ? (
        <div className="map-missing-key-overlay">
          <div className="map-missing-key-card">
            <h3>Google Maps API Key Required</h3>
            <p>
              Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to <code>.env.local</code>{' '}
              to render the interactive Los Angeles map, live Places Autocomplete,
              Eco-Friendly Routes, and real-time driver dispatch.
            </p>
            <a
              href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
              target="_blank"
              rel="noreferrer"
              className="demo-key-link"
            >
              Get a Free Maps Demo Key
            </a>
          </div>
        </div>
      ) : (
        <GoogleMap
          mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_git_agentsamples_v1.0.0']}
          defaultCenter={LA_CENTER}
          defaultZoom={12}
          gestureHandling="greedy"
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={true}
          style={{ width: '100%', height: '100%' }}
        >
          <MapViewportFitter
            pickup={pickup}
            dropoff={dropoff}
            routeComparison={routeComparison}
          />

          {/* Inactive comparison route rendered beneath active route */}
          {fastestRoute && selectedRouteKind !== 'fastest' && !isSameRoute && (
            <RoutePolyline
              path={fastestRoute.path}
              strokeColor="#60A5FA"
              strokeOpacity={0.75}
              strokeWeight={5}
              zIndex={2}
              onClick={() => onSelectRoute('fastest')}
            />
          )}

          {ecoRoute && selectedRouteKind !== 'eco' && !isSameRoute && (
            <RoutePolyline
              path={ecoRoute.path}
              strokeColor="#34D399"
              strokeOpacity={0.8}
              strokeWeight={5}
              zIndex={2}
              onClick={() => onSelectRoute('eco')}
            />
          )}

          {/* Active primary route rendered on top */}
          {fastestRoute && selectedRouteKind === 'fastest' && (
            <>
              <RoutePolyline
                path={fastestRoute.path}
                strokeColor="#1D4ED8"
                strokeOpacity={0.28}
                strokeWeight={11}
                zIndex={3}
              />
              <RoutePolyline
                path={fastestRoute.path}
                strokeColor="#2563EB"
                strokeOpacity={0.96}
                strokeWeight={6}
                zIndex={4}
                onClick={() => onSelectRoute('fastest')}
              />
            </>
          )}

          {ecoRoute && selectedRouteKind === 'eco' && (
            <>
              <RoutePolyline
                path={ecoRoute.path}
                strokeColor="#047857"
                strokeOpacity={0.28}
                strokeWeight={11}
                zIndex={3}
              />
              <RoutePolyline
                path={ecoRoute.path}
                strokeColor="#059669"
                strokeOpacity={0.96}
                strokeWeight={6}
                zIndex={4}
                onClick={() => onSelectRoute('eco')}
              />
            </>
          )}

          {/* Dispatched driver approach polyline to pickup */}
          {driverState.approachPath.length >= 2 &&
            (driverState.phase === 'en_route_pickup' ||
              driverState.phase === 'arrived_pickup') && (
              <RoutePolyline
                path={driverState.approachPath}
                strokeColor="#D97706"
                strokeWeight={5}
                zIndex={5}
                dashed
              />
            )}

          {/* Pickup AdvancedMarker */}
          {pickup && (
            <AdvancedMarker
              position={pickup.location}
              title={`Pickup: ${pickup.name}`}
              zIndex={20}
            >
              <div className="map-pin map-pin-pickup">
                <span className="map-pin-badge">P</span>
                <span className="map-pin-label">{pickup.name}</span>
              </div>
            </AdvancedMarker>
          )}

          {/* Drop-off AdvancedMarker */}
          {dropoff && (
            <AdvancedMarker
              position={dropoff.location}
              title={`Drop-off: ${dropoff.name}`}
              zIndex={20}
            >
              <div className="map-pin map-pin-dropoff">
                <span className="map-pin-badge">D</span>
                <span className="map-pin-label">{dropoff.name}</span>
              </div>
            </AdvancedMarker>
          )}

          {/* Nearby candidate drivers (excluding active dispatched driver) */}
          {candidateDrivers
            .filter((d) => d.id !== activeDriverId)
            .map((driver) => (
              <AdvancedMarker
                key={driver.id}
                position={driver.initialLocation}
                title={`${driver.name} · ${driver.vehicle}`}
                zIndex={10}
              >
                <div className="candidate-car-chip">
                  <span className="candidate-car-dot" />
                  <span>{driver.neighborhood}</span>
                </div>
              </AdvancedMarker>
            ))}

          {/* Active smoothly animated driver AdvancedMarker */}
          {driverState.driver && driverState.position && (
            <AdvancedMarker
              position={driverState.position}
              title={`Dispatched Driver: ${driverState.driver.name}`}
              zIndex={30}
            >
              <div className="active-driver-marker">
                <div
                  className="active-driver-vehicle"
                  style={{ transform: `rotate(${driverState.heading}deg)` }}
                  aria-label="Live driver vehicle"
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 28 28"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="14"
                      cy="14"
                      r="13"
                      fill="#0F172A"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                    <path
                      d="M14 5L20 19L14 16L8 19L14 5Z"
                      fill="#38BDF8"
                      stroke="#FFFFFF"
                      strokeWidth="1.2"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="active-driver-pill">
                  <span>{driverState.driver.name.split(' ')[0]}</span>
                </div>
              </div>
            </AdvancedMarker>
          )}
        </GoogleMap>
      )}

      {/* Floating Map Legend */}
      <div className="map-legend" data-testid="map-route-legend">
        <div className="map-legend-title">Map Legend</div>
        <div className="map-legend-items">
          <div className="map-legend-item">
            <span className="legend-line legend-line-fastest" />
            <span>Fastest Route</span>
          </div>
          <div className="map-legend-item">
            <span className="legend-line legend-line-eco" />
            <span>Eco-Friendly Route</span>
          </div>
          <div className="map-legend-item">
            <span className="legend-line legend-line-approach" />
            <span>Driver Approach</span>
          </div>
          <div className="map-legend-item">
            <span className="legend-dot legend-dot-pickup" />
            <span>Pickup</span>
          </div>
          <div className="map-legend-item">
            <span className="legend-dot legend-dot-dropoff" />
            <span>Drop-off</span>
          </div>
          <div className="map-legend-item">
            <span className="legend-dot legend-dot-driver" />
            <span>Live Driver</span>
          </div>
        </div>
      </div>
    </div>
  );
}
