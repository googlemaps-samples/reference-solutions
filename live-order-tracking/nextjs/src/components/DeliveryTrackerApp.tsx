'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import {
  CheckCircle2,
  Clock,
  KeyRound,
  Loader2,
  MapPin,
  Navigation,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Store,
  Truck,
} from 'lucide-react';
import {
  AddressValidationResponse,
  ComputedRouteData,
  KITCHEN_HUB,
  LatLngLiteral,
  MAX_DELIVERY_DISTANCE_METERS,
  ORDER_BASKET_ITEMS,
  RouteStepSummary,
  SEED_IN_ZONE_ADDRESS,
  SEED_OUT_OF_ZONE_ADDRESS,
  computeDeliveryTier,
  decodeEncodedPolyline,
  formatEtaMinutes,
  interpolateAlongPath,
  isDeliverableVerdict,
  isPointInDeliveryPolygonFallback,
  parseDurationSeconds,
} from '@/lib/delivery';
import {
  AutocompleteSelection,
  PlaceAutocompleteInput,
} from './PlaceAutocompleteInput';
import { DeliveryMap } from './DeliveryMap';
import { OrderReceiptCard } from './OrderReceiptCard';

interface DeliveryTrackerAppProps {
  apiKey: string;
}

type OrderStatus = 'checkout' | 'preparing' | 'en_route' | 'delivered';

const TRIP_DURATION_MS = 22000;

export function DeliveryTrackerApp({ apiKey }: DeliveryTrackerAppProps) {
  const hasApiKey = Boolean(apiKey && apiKey !== 'your_google_maps_api_key_here');

  const [addressInput, setAddressInput] = useState<string>(SEED_IN_ZONE_ADDRESS);
  const [validatedAddress, setValidatedAddress] = useState<string>(SEED_IN_ZONE_ADDRESS);
  const [customerLocation, setCustomerLocation] = useState<LatLngLiteral | null>(null);
  const [validationData, setValidationData] =
    useState<AddressValidationResponse | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const [insidePolygon, setInsidePolygon] = useState<boolean>(false);
  const [routeData, setRouteData] = useState<ComputedRouteData | null>(null);

  const [orderStatus, setOrderStatus] = useState<OrderStatus>('checkout');
  const [orderNumber] = useState<string>('CHI-4829');
  const [courierProgress, setCourierProgress] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const rafRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const seededOnceRef = useRef<boolean>(false);

  const routePath = useMemo(() => {
    if (!routeData?.encodedPolyline) return [];
    if (
      typeof window !== 'undefined' &&
      window.google?.maps?.geometry?.encoding?.decodePath
    ) {
      return window.google.maps.geometry.encoding
        .decodePath(routeData.encodedPolyline)
        .map((pt) => ({ lat: pt.lat(), lng: pt.lng() }));
    }
    return decodeEncodedPolyline(routeData.encodedPolyline);
  }, [routeData?.encodedPolyline]);

  const verdictCheck = useMemo(
    () => isDeliverableVerdict(validationData?.result?.verdict),
    [validationData]
  );

  const distanceQuote = useMemo(() => {
    if (!routeData) return null;
    return computeDeliveryTier(routeData.distanceMeters);
  }, [routeData]);

  const isWithin8Km =
    routeData !== null && routeData.distanceMeters <= MAX_DELIVERY_DISTANCE_METERS;

  const isDeliverable = Boolean(
    customerLocation &&
      insidePolygon &&
      isWithin8Km &&
      (verdictCheck.ok || (!validationData && !validationError))
  );

  const courierState = useMemo(() => {
    if (routePath.length >= 2) {
      return interpolateAlongPath(routePath, courierProgress);
    }
    return { position: KITCHEN_HUB.location, headingDeg: 90 };
  }, [routePath, courierProgress]);

  const computeRouteForDestination = useCallback(
    async (destination: LatLngLiteral) => {
      setRouteError(null);
      try {
        const res = await fetch('/api/routes/compute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: KITCHEN_HUB.location,
            destination,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to compute delivery route.');
        }

        const primaryRoute = data.route;
        const durationSeconds = parseDurationSeconds(primaryRoute?.duration);
        const steps: RouteStepSummary[] = (
          primaryRoute?.legs?.[0]?.steps ?? []
        ).map(
          (step: {
            navigationInstruction?: { instructions?: string; maneuver?: string };
            distanceMeters?: number;
            staticDuration?: string;
          }) => ({
            instruction:
              step.navigationInstruction?.instructions || 'Continue on route',
            maneuver: step.navigationInstruction?.maneuver,
            distanceMeters: step.distanceMeters ?? 0,
            staticDurationSeconds: parseDurationSeconds(step.staticDuration),
          })
        );

        setRouteData({
          distanceMeters: Number(primaryRoute?.distanceMeters ?? 0),
          durationSeconds,
          durationText: formatEtaMinutes(durationSeconds),
          encodedPolyline: primaryRoute?.polyline?.encodedPolyline || '',
          steps,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unable to compute route.';
        setRouteError(message);
        setRouteData(null);
      }
    },
    []
  );

  const runAddressAndRouteQuote = useCallback(
    async (rawAddress: string, fallbackLocation?: LatLngLiteral | null) => {
      const trimmed = rawAddress.trim();
      if (!trimmed) return;

      setIsChecking(true);
      setValidationError(null);
      setRouteError(null);
      setIsSimulating(false);
      setOrderStatus('checkout');
      setCourierProgress(0);

      let resolvedLocation: LatLngLiteral | null = fallbackLocation ?? null;
      let resolvedFormatted = trimmed;

      try {
        const res = await fetch('/api/address/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            addressLines: [trimmed],
            regionCode: 'US',
            enableUspsCass: true,
          }),
        });
        const data = (await res.json()) as AddressValidationResponse & {
          error?: string | { message?: string };
        };

        if (!res.ok) {
          const msg =
            typeof data.error === 'string'
              ? data.error
              : data.error?.message || 'Address Validation API error.';
          setValidationError(msg);
          setValidationData(null);
        } else {
          setValidationData(data);
          const geoLoc = data.result?.geocode?.location;
          if (
            geoLoc &&
            typeof geoLoc.latitude === 'number' &&
            typeof geoLoc.longitude === 'number'
          ) {
            resolvedLocation = {
              lat: geoLoc.latitude,
              lng: geoLoc.longitude,
            };
          }
          if (data.result?.address?.formattedAddress) {
            resolvedFormatted = data.result.address.formattedAddress;
          }
        }
      } catch (err) {
        setValidationError(
          err instanceof Error
            ? err.message
            : 'Unable to reach Address Validation proxy.'
        );
        setValidationData(null);
      }

      setValidatedAddress(resolvedFormatted);
      setCustomerLocation(resolvedLocation);

      if (resolvedLocation) {
        setInsidePolygon(isPointInDeliveryPolygonFallback(resolvedLocation));
        await computeRouteForDestination(resolvedLocation);
      } else {
        setInsidePolygon(false);
        setRouteData(null);
      }

      setIsChecking(false);
    },
    [computeRouteForDestination]
  );

  // Auto-seed Chicago address on mount when API key is configured
  useEffect(() => {
    if (!hasApiKey || seededOnceRef.current) return;
    seededOnceRef.current = true;
    void runAddressAndRouteQuote(SEED_IN_ZONE_ADDRESS);
  }, [hasApiKey, runAddressAndRouteQuote]);

  // Smooth courier animation along decoded polyline via requestAnimationFrame
  useEffect(() => {
    if (!isSimulating || routePath.length < 2) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimestampRef.current = null;
      return;
    }

    const tick = (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }
      const deltaMs = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;

      setCourierProgress((prev) => {
        const next = Math.min(1, prev + deltaMs / TRIP_DURATION_MS);
        if (next >= 1) {
          setIsSimulating(false);
          setOrderStatus('delivered');
        }
        return next;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimestampRef.current = null;
    };
  }, [isSimulating, routePath.length]);

  const handleAutocompleteSelect = useCallback(
    (selection: AutocompleteSelection) => {
      if (!selection.formattedAddress) return;
      setAddressInput(selection.formattedAddress);
      void runAddressAndRouteQuote(
        selection.formattedAddress,
        selection.location
      );
    },
    [runAddressAndRouteQuote]
  );

  const handlePlaceOrder = () => {
    if (!isDeliverable || routePath.length < 2) return;
    setCourierProgress(0);
    setOrderStatus('en_route');
    setIsSimulating(true);
  };

  const handleToggleSimulation = () => {
    if (!isDeliverable || routePath.length < 2) return;
    if (orderStatus === 'delivered' || courierProgress >= 1) {
      setCourierProgress(0);
      setOrderStatus('en_route');
      setIsSimulating(true);
      return;
    }
    if (orderStatus === 'checkout') {
      setOrderStatus('en_route');
    }
    setIsSimulating((prev) => !prev);
  };

  const verdict = validationData?.result?.verdict;
  const geocode = validationData?.result?.geocode;
  const metadata = validationData?.result?.metadata;
  const uspsData = validationData?.result?.uspsData;

  const statusPillText = !hasApiKey
    ? 'API Key Required'
    : orderStatus === 'delivered'
    ? 'Order Delivered'
    : orderStatus === 'en_route'
    ? isSimulating
      ? `Courier En Route · ${Math.round(courierProgress * 100)}%`
      : `Courier Paused · ${Math.round(courierProgress * 100)}%`
    : isDeliverable
    ? 'Deliverable · In Zone'
    : customerLocation
    ? 'Outside Zone / > 8 km'
    : 'Awaiting Validation';

  const content = (
    <div className="app-shell">
      {/* 64px Top Navigation Bar */}
      <header className="top-bar">
        <div className="brand-block">
          <div className="brand-badge">
            <Store size={18} />
          </div>
          <div>
            <h1 className="brand-title">Fulton Market Express</h1>
            <p className="brand-subtitle">
              Chicago Delivery Checkout, Zone Validation &amp; Live Tracker
            </p>
          </div>
        </div>

        <div className="top-bar-right">
          <div className="hub-badge">
            <MapPin size={14} />
            <span>{KITCHEN_HUB.name} (41.8868, -87.6486)</span>
          </div>
          <div
            className={`status-pill ${
              orderStatus === 'delivered' || isDeliverable
                ? 'pill-ok'
                : 'pill-warn'
            }`}
          >
            <span className="status-dot" />
            <span>{statusPillText}</span>
          </div>
        </div>
      </header>

      {/* Main Split-Screen Workspace */}
      <main className="split-workspace">
        {/* 440px Scrollable Left Sidebar */}
        <aside className="sidebar-panel">
          {!hasApiKey && (
            <div className="api-key-banner">
              <KeyRound size={18} />
              <div>
                <strong>Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local</strong>
                <p>
                  Copy <code>.env.example</code> to <code>.env.local</code> and add
                  your Google Maps Platform key (or a free Maps Demo Key) to enable
                  live Places Autocomplete, Address Validation, Routes, Static Map,
                  and interactive map rendering.
                </p>
              </div>
            </div>
          )}

          {/* Card 1: Checkout Address Autocomplete & Address Validation + Zone Eligibility */}
          <section className="panel-card">
            <div className="card-header">
              <div className="card-title-group">
                <MapPin size={18} className="card-icon" />
                <div>
                  <h2 className="card-title">1. Checkout Address &amp; Zone Check</h2>
                  <p className="card-subtitle">
                    Places API (New) · Address Validation · Geometry Polygon
                  </p>
                </div>
              </div>
            </div>

            {hasApiKey && (
              <div className="field-group">
                <label className="field-label">
                  Search with Places Autocomplete (New)
                </label>
                <PlaceAutocompleteInput
                  onPlaceSelected={handleAutocompleteSelect}
                  disabled={isChecking}
                />
              </div>
            )}

            <form
              className="address-form"
              onSubmit={(e) => {
                e.preventDefault();
                void runAddressAndRouteQuote(addressInput);
              }}
            >
              <label htmlFor="delivery-address-input" className="field-label">
                Delivery Street Address (Chicago, IL)
              </label>
              <div className="input-action-row">
                <input
                  id="delivery-address-input"
                  type="text"
                  className="text-input"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="401 N Michigan Ave, Chicago, IL 60611"
                />
                <button
                  id="validate-address-btn"
                  data-testid="validate-address-btn"
                  type="submit"
                  className="btn-primary"
                  disabled={!hasApiKey || isChecking || !addressInput.trim()}
                >
                  {isChecking ? (
                    <>
                      <Loader2 size={15} className="spin" />
                      <span>Checking</span>
                    </>
                  ) : (
                    <span>Validate</span>
                  )}
                </button>
              </div>
            </form>

            <div className="preset-row">
              <button
                id="preset-address-in-zone-btn"
                data-testid="preset-address-in-zone-btn"
                type="button"
                className="btn-chip"
                disabled={!hasApiKey || isChecking}
                onClick={() => {
                  setAddressInput(SEED_IN_ZONE_ADDRESS);
                  void runAddressAndRouteQuote(SEED_IN_ZONE_ADDRESS);
                }}
              >
                In-Zone Seed (401 N Michigan)
              </button>
              <button
                id="preset-address-out-of-zone-btn"
                data-testid="preset-address-out-of-zone-btn"
                type="button"
                className="btn-chip btn-chip-warn"
                disabled={!hasApiKey || isChecking}
                onClick={() => {
                  setAddressInput(SEED_OUT_OF_ZONE_ADDRESS);
                  void runAddressAndRouteQuote(SEED_OUT_OF_ZONE_ADDRESS);
                }}
              >
                Out-of-Zone (Hyde Park)
              </button>
            </div>

            {/* Zone & 8km Eligibility Badge */}
            <div
              id="zone-eligibility-badge"
              data-testid="zone-eligibility-badge"
              className={`eligibility-banner ${
                isDeliverable
                  ? 'elig-ok'
                  : customerLocation
                  ? 'elig-fail'
                  : 'elig-pending'
              }`}
            >
              {isDeliverable ? (
                <ShieldCheck size={18} />
              ) : (
                <ShieldAlert size={18} />
              )}
              <div>
                <strong>
                  {isDeliverable
                    ? 'Eligible for On-Demand Delivery'
                    : customerLocation
                    ? 'Outside Delivery Coverage'
                    : 'Awaiting Address Validation'}
                </strong>
                <p>
                  {customerLocation
                    ? `Polygon: ${
                        insidePolygon ? 'Inside Zone' : 'Outside Polygon'
                      } · Road Cap: ${
                        routeData
                          ? isWithin8Km
                            ? `${(routeData.distanceMeters / 1000).toFixed(2)} / 8.0 km`
                            : `${(routeData.distanceMeters / 1000).toFixed(2)} km (> 8.0 km limit)`
                          : 'Calculating…'
                      }`
                    : 'Enter or select a Chicago address to verify polygon & 8 km limit.'}
                </p>
              </div>
            </div>

            {/* Address Validation API Verdict Panel */}
            <div
              id="validation-status-panel"
              data-testid="validation-status-panel"
              className="verdict-panel"
            >
              <div className="verdict-header">
                <span>Address Validation API Verdict</span>
                {verdict && (
                  <span
                    className={`verdict-chip ${
                      verdictCheck.ok ? 'chip-ok' : 'chip-warn'
                    }`}
                  >
                    {verdict.validationGranularity || 'UNKNOWN'}
                  </span>
                )}
              </div>

              {validationError && (
                <p className="error-inline">{validationError}</p>
              )}

              {verdict ? (
                <div className="verdict-grid">
                  <div className="verdict-kv">
                    <span>Address Complete</span>
                    <strong>{verdict.addressComplete ? 'Yes' : 'No'}</strong>
                  </div>
                  <div className="verdict-kv">
                    <span>Geocode Granularity</span>
                    <strong>{verdict.geocodeGranularity || 'N/A'}</strong>
                  </div>
                  <div className="verdict-kv">
                    <span>Unconfirmed Parts</span>
                    <strong>
                      {verdict.hasUnconfirmedComponents ? 'Yes' : 'None'}
                    </strong>
                  </div>
                  <div className="verdict-kv">
                    <span>Inferred / Replaced</span>
                    <strong>
                      {verdict.hasInferredComponents ||
                      verdict.hasReplacedComponents
                        ? 'Normalized'
                        : 'Exact Match'}
                    </strong>
                  </div>
                  <div className="verdict-kv">
                    <span>Property Type</span>
                    <strong>
                      {metadata?.residential
                        ? 'Residential'
                        : metadata?.business
                        ? 'Commercial'
                        : metadata?.poBox
                        ? 'PO Box'
                        : 'Verified'}
                    </strong>
                  </div>
                  <div className="verdict-kv">
                    <span>USPS DPV / Route</span>
                    <strong>
                      {uspsData?.dpvConfirmation || uspsData?.dpvFootnote
                        ? `DPV ${
                            uspsData.dpvConfirmation ?? uspsData.dpvFootnote
                          }${
                            uspsData.carrierRoute
                              ? ` · ${uspsData.carrierRoute}`
                              : ''
                          }`
                        : uspsData?.cassProcessed
                        ? 'CASS Verified'
                        : 'N/A'}
                    </strong>
                  </div>
                  {geocode?.plusCode?.compoundCode && (
                    <div className="verdict-kv verdict-span">
                      <span>Standardized / Plus Code</span>
                      <strong>
                        {validatedAddress} ({geocode.plusCode.compoundCode})
                      </strong>
                    </div>
                  )}
                </div>
              ) : (
                !validationError && (
                  <p className="muted-note">
                    Validates granularity (`PREMISE` / `SUB_PREMISE`), USPS CASS
                    deliverability, and coordinates before quoting delivery.
                  </p>
                )
              )}
            </div>
          </section>

          {/* Card 2: Tiered Delivery Fee, Traffic-Aware ETA & Live Courier Dispatch Controls */}
          <section className="panel-card">
            <div className="card-header">
              <div className="card-title-group">
                <Truck size={18} className="card-icon" />
                <div>
                  <h2 className="card-title">2. Delivery Quote &amp; Live Dispatch</h2>
                  <p className="card-subtitle">
                    Routes API v2 (TRAFFIC_AWARE) · Smooth Polyline Tracking
                  </p>
                </div>
              </div>
            </div>

            {routeError && <p className="error-inline">{routeError}</p>}

            <div
              id="delivery-fee-eta-summary"
              data-testid="delivery-fee-eta-summary"
              className="quote-grid"
            >
              <div className="quote-box">
                <span className="quote-label">Tiered Fee</span>
                <strong className="quote-value">
                  {distanceQuote && isDeliverable && distanceQuote.feeUsd !== null
                    ? `$${distanceQuote.feeUsd.toFixed(2)}`
                    : 'N/A'}
                </strong>
                <span className="quote-meta">
                  {distanceQuote?.tierName || '≤3km $2.99 · ≤5.5km $4.99 · ≤8km $6.99'}
                </span>
              </div>

              <div className="quote-box">
                <span className="quote-label">Traffic ETA</span>
                <strong className="quote-value">
                  {routeData ? routeData.durationText : '--'}
                </strong>
                <span className="quote-meta">
                  {routeData
                    ? `${(routeData.distanceMeters / 1000).toFixed(2)} km via Chicago roads`
                    : 'Awaiting route'}
                </span>
              </div>
            </div>

            <div className="dispatch-actions">
              <button
                id="place-order-btn"
                data-testid="place-order-btn"
                type="button"
                className="btn-accent"
                disabled={!isDeliverable || routePath.length < 2}
                onClick={handlePlaceOrder}
              >
                <CheckCircle2 size={16} />
                <span>
                  {orderStatus === 'en_route'
                    ? 'Restart Delivery Trip'
                    : 'Place Order & Track Courier'}
                </span>
              </button>

              <button
                id="courier-simulation-toggle-btn"
                data-testid="courier-simulation-toggle-btn"
                type="button"
                className="btn-secondary"
                disabled={!isDeliverable || routePath.length < 2}
                onClick={handleToggleSimulation}
              >
                {orderStatus === 'delivered' ? (
                  <>
                    <RotateCcw size={15} />
                    <span>Replay</span>
                  </>
                ) : isSimulating ? (
                  <>
                    <Pause size={15} />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play size={15} />
                    <span>Resume</span>
                  </>
                )}
              </button>
            </div>

            <div
              id="courier-progress-panel"
              data-testid="courier-progress-panel"
              className="progress-panel"
            >
              <div className="progress-header">
                <span>
                  <Clock size={13} className="inline-icon" />{' '}
                  {orderStatus === 'delivered'
                    ? 'Courier arrived at drop-off'
                    : orderStatus === 'en_route'
                    ? 'Courier en route along polyline'
                    : 'Courier staged at Fulton Market Hub'}
                </span>
                <strong>{Math.round(courierProgress * 100)}%</strong>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.round(courierProgress * 100)}%` }}
                />
              </div>
              <div className="courier-coords">
                <span>
                  Courier GPS: {courierState.position.lat.toFixed(5)},{' '}
                  {courierState.position.lng.toFixed(5)}
                </span>
                {routeData && (
                  <span>
                    <Navigation size={12} className="inline-icon" />{' '}
                    {orderStatus === 'delivered'
                      ? '0 min'
                      : formatEtaMinutes(
                          Math.round(
                            routeData.durationSeconds * (1 - courierProgress)
                          )
                        )}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Card 3: Itemized Order Receipt Card with Maps Static API Route Image */}
          <OrderReceiptCard
            items={ORDER_BASKET_ITEMS}
            customerAddress={validatedAddress}
            customerLocation={customerLocation}
            encodedPolyline={routeData?.encodedPolyline || ''}
            deliveryFeeUsd={distanceQuote?.feeUsd ?? null}
            isDeliverable={isDeliverable}
            orderNumber={orderNumber}
            orderStatus={orderStatus}
            distanceKm={routeData ? routeData.distanceMeters / 1000 : null}
            etaText={routeData ? routeData.durationText : null}
          />
        </aside>

        {/* Right Full-Height Interactive Map Panel */}
        <section className="map-panel" aria-label="Live Chicago delivery tracking map">
          {hasApiKey ? (
            <DeliveryMap
              customerLocation={customerLocation}
              customerAddress={validatedAddress}
              routePath={routePath}
              courierPosition={courierState.position}
              courierHeadingDeg={courierState.headingDeg}
              courierProgress={courierProgress}
              orderStatus={orderStatus}
              isDeliverable={isDeliverable}
              distanceMeters={routeData?.distanceMeters ?? null}
              durationSeconds={routeData?.durationSeconds ?? null}
              onPolygonEvaluated={setInsidePolygon}
            />
          ) : (
            <div
              id="live-tracking-map"
              data-testid="live-tracking-map"
              className="map-placeholder"
            >
              <div className="placeholder-card">
                <MapPin size={32} />
                <h3>Interactive Chicago Map Ready</h3>
                <p>
                  Configure <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in{' '}
                  <code>.env.local</code> and restart the server to display the
                  Fulton Market delivery polygon, Routes API polyline, and live
                  courier Advanced Markers.
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );

  if (!hasApiKey) {
    return content;
  }

  return (
    <APIProvider
      apiKey={apiKey}
      libraries={['places', 'geometry', 'marker']}
      language="en"
      region="US"
    >
      {content}
    </APIProvider>
  );
}
