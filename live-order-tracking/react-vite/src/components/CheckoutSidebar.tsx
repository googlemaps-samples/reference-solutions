import { useEffect, useMemo, useState } from 'react';
import { createStaticMapsUrl } from '@vis.gl/react-google-maps';
import {
  AlertTriangle,
  Bike,
  CheckCircle2,
  Clock,
  MapPin,
  Navigation,
  PackageCheck,
  Pause,
  Play,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import {
  KITCHEN_HUB,
  PRESET_OUT_OF_ZONE_ADDRESS,
  SEED_IN_ZONE_ADDRESS,
} from '../constants/chicago';
import type {
  AddressValidationSummary,
  DeliveryEligibility,
  DeliveryRouteSummary,
  OrderItem,
  OrderStatus,
} from '../types/delivery';
import {
  calculateSubtotal,
  formatDistanceKm,
  formatEtaMinutes,
} from '../utils/pricing';
import { AddressAutocompleteInput } from './AddressAutocompleteInput';

interface CheckoutSidebarProps {
  apiKey: string;
  addressInput: string;
  onAddressInputChange: (val: string) => void;
  onValidateAddress: (
    addressOverride?: string,
    autocompleteEl?: google.maps.places.PlaceAutocompleteElement | null
  ) => void;
  isValidating: boolean;
  validationError: string | null;
  validation: AddressValidationSummary | null;
  eligibility: DeliveryEligibility | null;
  route: DeliveryRouteSummary | null;
  items: OrderItem[];
  orderStatus: OrderStatus;
  onPlaceOrder: () => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  onResetSimulation: () => void;
  courierProgress: number;
  onAutocompleteReady: (
    el: google.maps.places.PlaceAutocompleteElement | null
  ) => void;
}

export function CheckoutSidebar({
  apiKey,
  addressInput,
  onAddressInputChange,
  onValidateAddress,
  isValidating,
  validationError,
  validation,
  eligibility,
  route,
  items,
  orderStatus,
  onPlaceOrder,
  isSimulating,
  onToggleSimulation,
  onResetSimulation,
  courierProgress,
  onAutocompleteReady,
}: CheckoutSidebarProps) {
  const [staticMapFailed, setStaticMapFailed] = useState(false);

  const subtotal = useMemo(() => calculateSubtotal(items), [items]);
  const deliveryFee = eligibility?.deliveryFee ?? 0;
  const serviceTax = useMemo(() => Number((subtotal * 0.1025).toFixed(2)), [subtotal]);
  const total = subtotal + deliveryFee + serviceTax;

  const staticReceiptMapUrl = useMemo(() => {
    if (!apiKey || !validation?.location) return '';

    const markers: Parameters<typeof createStaticMapsUrl>[0]['markers'] = [
      {
        location: KITCHEN_HUB.coordinates,
        color: '0x0F172A',
        label: 'K',
      },
      {
        location: validation.location,
        color: eligibility?.isEligible ? '0x059669' : '0xDC2626',
        label: 'D',
      },
    ];

    const paths: Parameters<typeof createStaticMapsUrl>[0]['paths'] =
      route?.encodedPolyline
        ? [
            {
              coordinates: `enc:${route.encodedPolyline}`,
              color: eligibility?.isEligible ? '0x2563EBFF' : '0xDC2626FF',
              weight: 5,
            },
          ]
        : undefined;

    return createStaticMapsUrl({
      apiKey,
      width: 400,
      height: 190,
      scale: 2,
      format: 'png',
      mapType: 'roadmap' as google.maps.MapTypeId,
      markers,
      paths,
    });
  }, [apiKey, validation, eligibility, route]);

  useEffect(() => {
    setStaticMapFailed(false);
  }, [staticReceiptMapUrl]);

  const progressPct = Math.round(courierProgress * 100);
  const remainingSeconds = route
    ? Math.max(0, Math.round(route.durationSeconds * (1 - courierProgress)))
    : 0;

  return (
    <aside className="sidebar" aria-label="Checkout and live tracking controls">
      {/* Card 1: Checkout Address Autocomplete & Address Validation */}
      <section className="card">
        <div className="card__header">
          <div className="card__title-group">
            <span className="step-badge">1</span>
            <div>
              <h2 className="card__title">Checkout Address &amp; Zone Check</h2>
              <p className="card__subtitle">
                Places Autocomplete (New) + Address Validation API
              </p>
            </div>
          </div>
        </div>

        <AddressAutocompleteInput
          value={addressInput}
          onInputChange={onAddressInputChange}
          onPlaceSelected={(resolvedAddress, el) => {
            onAddressInputChange(resolvedAddress);
            onValidateAddress(resolvedAddress, el);
          }}
          onElementReady={onAutocompleteReady}
        />

        <div className="preset-row">
          <button
            id="preset-address-in-zone-btn"
            data-testid="preset-address-in-zone-btn"
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              onAddressInputChange(SEED_IN_ZONE_ADDRESS);
              onValidateAddress(SEED_IN_ZONE_ADDRESS);
            }}
          >
            In-Zone Preset (Michigan Ave)
          </button>
          <button
            id="preset-address-out-of-zone-btn"
            data-testid="preset-address-out-of-zone-btn"
            type="button"
            className="btn btn--ghost"
            onClick={() => {
              onAddressInputChange(PRESET_OUT_OF_ZONE_ADDRESS);
              onValidateAddress(PRESET_OUT_OF_ZONE_ADDRESS);
            }}
          >
            Out-of-Zone Preset (Hyde Park)
          </button>
        </div>

        <button
          id="validate-address-btn"
          data-testid="validate-address-btn"
          type="button"
          className="btn btn--primary btn--full"
          disabled={isValidating || !addressInput.trim()}
          onClick={() => onValidateAddress()}
        >
          <ShieldCheck size={16} />
          {isValidating
            ? 'Validating Deliverability & Route...'
            : 'Verify Address & Delivery Zone'}
        </button>

        {validationError && (
          <div className="alert alert--error" role="alert">
            <AlertTriangle size={16} />
            <span>{validationError}</span>
          </div>
        )}

        {/* Validation Verdict & Polygon Eligibility Panel */}
        <div
          id="validation-status-panel"
          data-testid="validation-status-panel"
          className="verdict-panel"
        >
          {validation ? (
            <>
              <div className="verdict-panel__top">
                <div>
                  <span className="eyebrow">Standardized Address</span>
                  <p className="verdict-address">{validation.formattedAddress}</p>
                </div>
                <span
                  id="zone-eligibility-badge"
                  data-testid="zone-eligibility-badge"
                  className={`status-pill ${
                    eligibility?.isEligible
                      ? 'status-pill--eligible'
                      : 'status-pill--ineligible'
                  }`}
                >
                  {eligibility?.isEligible ? (
                    <>
                      <CheckCircle2 size={14} /> Eligible
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={14} />{' '}
                      {eligibility?.tierLabel ?? 'Ineligible'}
                    </>
                  )}
                </span>
              </div>

              <div className="verdict-grid">
                <div className="metric-box">
                  <span className="metric-box__label">Validation Granularity</span>
                  <span className="metric-box__value">
                    {validation.verdict.validationGranularity ?? 'N/A'}
                  </span>
                </div>
                <div className="metric-box">
                  <span className="metric-box__label">Geocode Granularity</span>
                  <span className="metric-box__value">
                    {validation.verdict.geocodeGranularity ?? 'N/A'}
                  </span>
                </div>
                <div className="metric-box">
                  <span className="metric-box__label">Polygon Zone</span>
                  <span className="metric-box__value">
                    {eligibility?.inPolygonZone ? 'Inside Zone' : 'Outside Zone'}
                  </span>
                </div>
                <div className="metric-box">
                  <span className="metric-box__label">Road Distance Cap</span>
                  <span className="metric-box__value">
                    {route
                      ? `${formatDistanceKm(route.distanceMeters)} / 8 km`
                      : 'Pending'}
                  </span>
                </div>
              </div>

              <div className="verdict-flags">
                <span
                  className={`flag-chip ${
                    validation.verdict.addressComplete
                      ? 'flag-chip--ok'
                      : 'flag-chip--warn'
                  }`}
                >
                  Address Complete: {validation.verdict.addressComplete ? 'Yes' : 'No'}
                </span>
                <span
                  className={`flag-chip ${
                    validation.verdict.hasUnconfirmedComponents
                      ? 'flag-chip--warn'
                      : 'flag-chip--ok'
                  }`}
                >
                  Unconfirmed:{' '}
                  {validation.verdict.hasUnconfirmedComponents ? 'Yes' : 'None'}
                </span>
                <span className="flag-chip flag-chip--neutral">
                  Inferred: {validation.verdict.hasInferredComponents ? 'Yes' : 'No'}
                </span>
                <span className="flag-chip flag-chip--neutral">
                  Replaced: {validation.verdict.hasReplacedComponents ? 'Yes' : 'No'}
                </span>
                {validation.metadata.business !== undefined && (
                  <span className="flag-chip flag-chip--neutral">
                    Type:{' '}
                    {validation.metadata.business
                      ? 'Commercial'
                      : validation.metadata.residential
                        ? 'Residential'
                        : validation.metadata.poBox
                          ? 'PO Box'
                          : 'Mixed'}
                  </span>
                )}
                {validation.uspsData.dpvConfirmation && (
                  <span className="flag-chip flag-chip--ok">
                    USPS DPV: {validation.uspsData.dpvConfirmation}
                    {validation.uspsData.carrierRoute
                      ? ` · ${validation.uspsData.carrierRoute}`
                      : ''}
                  </span>
                )}
              </div>

              {eligibility && (
                <p
                  className={`eligibility-reason ${
                    eligibility.isEligible
                      ? 'eligibility-reason--ok'
                      : 'eligibility-reason--warn'
                  }`}
                >
                  {eligibility.reason}
                </p>
              )}

              {validation.note && (
                <p className="validation-note">{validation.note}</p>
              )}
            </>
          ) : (
            <p className="muted-copy">
              Validating seeded Chicago address ({SEED_IN_ZONE_ADDRESS})...
            </p>
          )}
        </div>
      </section>

      {/* Card 2: Tiered Delivery Fee, Traffic-Aware ETA & Live Courier Dispatch */}
      <section className="card">
        <div className="card__header">
          <div className="card__title-group">
            <span className="step-badge">2</span>
            <div>
              <h2 className="card__title">Delivery Fee, ETA &amp; Dispatch</h2>
              <p className="card__subtitle">
                Routes API traffic-aware pricing &amp; live courier telemetry
              </p>
            </div>
          </div>
        </div>

        <div
          id="delivery-fee-eta-summary"
          data-testid="delivery-fee-eta-summary"
          className="fee-eta-grid"
        >
          <div className="fee-card">
            <span className="fee-card__label">Tiered Fee</span>
            <strong className="fee-card__value">
              {eligibility?.isEligible && eligibility.deliveryFee !== null
                ? `$${eligibility.deliveryFee.toFixed(2)}`
                : 'Unavailable'}
            </strong>
            <span className="fee-card__sub">
              {eligibility?.tierLabel ?? 'Awaiting check'}
            </span>
          </div>

          <div className="fee-card">
            <span className="fee-card__label">Traffic ETA</span>
            <strong className="fee-card__value">
              {route ? formatEtaMinutes(route.durationSeconds) : '--'}
            </strong>
            <span className="fee-card__sub">
              {route ? formatDistanceKm(route.distanceMeters) : 'No route'}
            </span>
          </div>
        </div>

        <div className="dispatch-actions">
          <button
            id="place-order-btn"
            data-testid="place-order-btn"
            type="button"
            className="btn btn--accent btn--full"
            disabled={
              !eligibility?.isEligible ||
              !route ||
              orderStatus === 'en-route' ||
              orderStatus === 'arriving'
            }
            onClick={onPlaceOrder}
          >
            <PackageCheck size={16} />
            {orderStatus === 'delivered'
              ? 'Re-Dispatch New Courier'
              : orderStatus === 'en-route' || orderStatus === 'arriving'
                ? 'Order Dispatched — Courier Active'
                : `Place Order · $${total.toFixed(2)}`}
          </button>

          <div className="sim-controls-row">
            <button
              id="courier-simulation-toggle-btn"
              data-testid="courier-simulation-toggle-btn"
              type="button"
              className="btn btn--secondary"
              disabled={!eligibility?.isEligible || !route}
              onClick={onToggleSimulation}
            >
              {isSimulating ? <Pause size={15} /> : <Play size={15} />}
              {isSimulating
                ? 'Pause Courier'
                : courierProgress > 0 && courierProgress < 1
                  ? 'Resume Courier'
                  : 'Simulate Courier'}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              disabled={!route || courierProgress === 0}
              onClick={onResetSimulation}
              title="Reset courier to Fulton Market kitchen"
            >
              <RotateCcw size={15} /> Reset
            </button>
          </div>
        </div>

        {/* Live Courier Progress Panel */}
        <div
          id="courier-progress-panel"
          data-testid="courier-progress-panel"
          className="courier-panel"
        >
          <div className="courier-panel__header">
            <span className="courier-status">
              {orderStatus === 'delivered' ? (
                <CheckCircle2 size={15} className="text-emerald" />
              ) : isSimulating ? (
                <Bike size={15} className="text-blue" />
              ) : (
                <Truck size={15} className="text-slate" />
              )}
              <span>
                {orderStatus === 'delivered'
                  ? 'Delivered at customer doorstep'
                  : isSimulating
                    ? 'Courier en route along Chicago corridor'
                    : orderStatus === 'dispatched'
                      ? 'Courier staged at Fulton Market Kitchen'
                      : 'Ready for dispatch once verified'}
              </span>
            </span>
            <span className="courier-pct">{progressPct}%</span>
          </div>

          <div className="progress-track" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="progress-track__fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="courier-meta">
            <span>
              <Clock size={13} />{' '}
              {route
                ? orderStatus === 'delivered'
                  ? 'Arrived'
                  : `${formatEtaMinutes(remainingSeconds)} remaining`
                : 'Awaiting route'}
            </span>
            {route?.steps?.[0] && (
              <span className="courier-next-step">
                <Navigation size={13} /> {route.steps[0].instruction}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Card 3: Itemized Order Receipt Card with Maps Static API Preview */}
      <section
        id="order-receipt-card"
        data-testid="order-receipt-card"
        className="card"
      >
        <div className="card__header">
          <div className="card__title-group">
            <span className="step-badge">3</span>
            <div>
              <h2 className="card__title">Order Receipt &amp; Route Snapshot</h2>
              <p className="card__subtitle">
                Maps Static API summary image + itemized Chicago order
              </p>
            </div>
          </div>
          <Receipt size={18} className="text-slate" />
        </div>

        <div className="static-map-frame">
          {staticReceiptMapUrl && !staticMapFailed ? (
            <img
              id="static-receipt-map-img"
              data-testid="static-receipt-map-img"
              src={staticReceiptMapUrl}
              alt={`Static route summary from ${KITCHEN_HUB.name} to ${validation?.formattedAddress ?? 'customer'}`}
              className="static-receipt-img"
              onError={() => setStaticMapFailed(true)}
            />
          ) : (
            <div
              id="static-receipt-map-img"
              data-testid="static-receipt-map-img"
              className="static-map-fallback"
            >
              <MapPin size={18} />
              <span>
                {staticMapFailed
                  ? 'Maps Static API preview requires Maps Static API enabled on your key.'
                  : 'Route preview will appear after address validation.'}
              </span>
            </div>
          )}
        </div>

        <ul className="receipt-items">
          {items.map((item) => (
            <li key={item.id} className="receipt-item">
              <div>
                <span className="receipt-item__qty">{item.quantity}×</span>{' '}
                <span className="receipt-item__name">{item.name}</span>
                <span className="receipt-item__cat">{item.category}</span>
              </div>
              <span className="receipt-item__price">
                ${(item.quantity * item.unitPrice).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>

        <div className="receipt-totals">
          <div className="receipt-row">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="receipt-row">
            <span>
              Delivery ({eligibility?.tierLabel ?? 'Pending'})
            </span>
            <span>
              {eligibility?.isEligible && eligibility.deliveryFee !== null
                ? `$${eligibility.deliveryFee.toFixed(2)}`
                : '--'}
            </span>
          </div>
          <div className="receipt-row">
            <span>Chicago Tax (10.25%)</span>
            <span>${serviceTax.toFixed(2)}</span>
          </div>
          <div className="receipt-row receipt-row--total">
            <span>Order Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </section>
    </aside>
  );
}
