import { useCallback, useEffect, useRef, useState } from 'react';
import { APIProvider, useApiIsLoaded } from '@vis.gl/react-google-maps';
import { MapPin, ShieldCheck, Store } from 'lucide-react';
import { CheckoutSidebar } from './components/CheckoutSidebar';
import { DeliveryMap } from './components/DeliveryMap';
import {
  CHICAGO_DELIVERY_ZONE_POLYGON,
  KITCHEN_HUB,
  SAMPLE_CART_ITEMS,
  SEED_IN_ZONE_ADDRESS,
} from './constants/chicago';
import {
  checkPointInDeliveryZone,
  computeDeliveryRoute,
  validateAddressWithGmp,
} from './services/mapsServices';
import type {
  AddressValidationSummary,
  DeliveryEligibility,
  DeliveryRouteSummary,
  LatLngPoint,
  OrderStatus,
} from './types/delivery';
import {
  evaluateDeliveryEligibility,
  interpolateAlongPath,
} from './utils/pricing';

const API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
const SIMULATION_DURATION_MS = 14000;

function LiveOrderTrackerWorkspace({ apiKey }: { apiKey: string }) {
  const isApiLoaded = useApiIsLoaded();

  const [addressInput, setAddressInput] = useState(SEED_IN_ZONE_ADDRESS);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validation, setValidation] =
    useState<AddressValidationSummary | null>(null);
  const [eligibility, setEligibility] = useState<DeliveryEligibility | null>(
    null
  );
  const [route, setRoute] = useState<DeliveryRouteSummary | null>(null);

  const [orderStatus, setOrderStatus] = useState<OrderStatus>('draft');
  const [isSimulating, setIsSimulating] = useState(false);
  const [courierProgress, setCourierProgress] = useState(0);
  const [courierPosition, setCourierPosition] = useState<LatLngPoint>(
    KITCHEN_HUB.coordinates
  );
  const [courierHeading, setCourierHeading] = useState(90);

  const autocompleteElRef =
    useRef<google.maps.places.PlaceAutocompleteElement | null>(null);
  const seededRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const lastFrameTimeRef = useRef<number | null>(null);

  const stopAnimation = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    lastFrameTimeRef.current = null;
  }, []);

  const runValidationAndRoute = useCallback(
    async (
      addressOverride?: string,
      autocompleteEl?: google.maps.places.PlaceAutocompleteElement | null
    ) => {
      if (!isApiLoaded) return;

      const targetAddress = (addressOverride ?? addressInput).trim();
      if (!targetAddress) return;

      stopAnimation();
      setIsSimulating(false);
      progressRef.current = 0;
      setCourierProgress(0);
      setCourierPosition(KITCHEN_HUB.coordinates);
      setCourierHeading(90);

      setIsValidating(true);
      setValidationError(null);

      try {
        const valSummary = await validateAddressWithGmp(
          targetAddress,
          autocompleteEl ?? autocompleteElRef.current
        );
        setValidation(valSummary);

        const [inPolygon, computedRoute] = await Promise.all([
          checkPointInDeliveryZone(
            valSummary.location,
            CHICAGO_DELIVERY_ZONE_POLYGON
          ),
          computeDeliveryRoute(KITCHEN_HUB.coordinates, valSummary.location).catch(
            () => null
          ),
        ]);

        setRoute(computedRoute);
        const evalResult = evaluateDeliveryEligibility(
          inPolygon,
          computedRoute?.distanceMeters ?? null,
          valSummary.isDeliverableGranularity
        );
        setEligibility(evalResult);
        setOrderStatus(evalResult.isEligible ? 'validated' : 'draft');

        if (computedRoute?.path?.length) {
          const initial = interpolateAlongPath(computedRoute.path, 0);
          setCourierPosition(initial.position);
          setCourierHeading(initial.heading);
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to validate address or compute delivery route.';
        setValidationError(message);
        setOrderStatus('draft');
      } finally {
        setIsValidating(false);
      }
    },
    [addressInput, isApiLoaded, stopAnimation]
  );

  // Run seeded validation once Maps JS API has loaded
  useEffect(() => {
    if (!isApiLoaded || seededRef.current) return;
    seededRef.current = true;
    void runValidationAndRoute(SEED_IN_ZONE_ADDRESS);
  }, [isApiLoaded, runValidationAndRoute]);

  // Smooth requestAnimationFrame courier interpolation along route polyline
  useEffect(() => {
    if (!isSimulating || !route?.path?.length) {
      stopAnimation();
      return;
    }

    const tick = (now: number) => {
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = now;
      }
      const deltaMs = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      const nextProgress = Math.min(
        1,
        progressRef.current + deltaMs / SIMULATION_DURATION_MS
      );
      progressRef.current = nextProgress;
      setCourierProgress(nextProgress);

      const { position, heading } = interpolateAlongPath(
        route.path,
        nextProgress
      );
      setCourierPosition(position);
      setCourierHeading(heading);

      if (nextProgress >= 1) {
        setIsSimulating(false);
        setOrderStatus('delivered');
        stopAnimation();
        return;
      }

      if (nextProgress >= 0.8) {
        setOrderStatus('arriving');
      } else {
        setOrderStatus('en-route');
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      stopAnimation();
    };
  }, [isSimulating, route, stopAnimation]);

  const handlePlaceOrder = useCallback(() => {
    if (!eligibility?.isEligible || !route?.path?.length) return;
    progressRef.current = 0;
    setCourierProgress(0);
    const start = interpolateAlongPath(route.path, 0);
    setCourierPosition(start.position);
    setCourierHeading(start.heading);
    setOrderStatus('en-route');
    setIsSimulating(true);
  }, [eligibility, route]);

  const handleToggleSimulation = useCallback(() => {
    if (!eligibility?.isEligible || !route?.path?.length) return;
    if (progressRef.current >= 1) {
      progressRef.current = 0;
      setCourierProgress(0);
    }
    setIsSimulating((prev) => {
      const next = !prev;
      if (next) {
        setOrderStatus(progressRef.current >= 0.8 ? 'arriving' : 'en-route');
      }
      return next;
    });
  }, [eligibility, route]);

  const handleResetSimulation = useCallback(() => {
    stopAnimation();
    setIsSimulating(false);
    progressRef.current = 0;
    setCourierProgress(0);
    if (route?.path?.length) {
      const start = interpolateAlongPath(route.path, 0);
      setCourierPosition(start.position);
      setCourierHeading(start.heading);
    } else {
      setCourierPosition(KITCHEN_HUB.coordinates);
      setCourierHeading(90);
    }
    setOrderStatus(eligibility?.isEligible ? 'validated' : 'draft');
  }, [eligibility, route, stopAnimation]);

  const headerStatusText = (() => {
    if (orderStatus === 'delivered') return 'Delivered';
    if (orderStatus === 'arriving') return 'Arriving Soon';
    if (orderStatus === 'en-route') return 'Courier En Route';
    if (eligibility?.isEligible) return `Zone Verified · ${eligibility.tierLabel}`;
    if (validation && !eligibility?.isEligible) return 'Outside Delivery Zone';
    return 'Checking Chicago Zone';
  })();

  const headerStatusClass =
    orderStatus === 'delivered' ||
    orderStatus === 'arriving' ||
    orderStatus === 'en-route'
      ? 'topbar-pill--active'
      : eligibility?.isEligible
        ? 'topbar-pill--ok'
        : validation && !eligibility?.isEligible
          ? 'topbar-pill--warn'
          : 'topbar-pill--neutral';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__brand">
          <div className="brand-mark">
            <Store size={18} />
          </div>
          <div>
            <h1 className="brand-title">Fulton Market Dispatch</h1>
            <p className="brand-sub">
              On-Demand Chicago Delivery Checkout &amp; Live Tracker
            </p>
          </div>
        </div>

        <div className="topbar__badges">
          <span className="topbar-hub">
            <MapPin size={14} /> {KITCHEN_HUB.address}
          </span>
          <span className={`topbar-pill ${headerStatusClass}`}>
            <ShieldCheck size={14} /> {headerStatusText}
          </span>
        </div>
      </header>

      <main className="split-layout">
        <CheckoutSidebar
          apiKey={apiKey}
          addressInput={addressInput}
          onAddressInputChange={setAddressInput}
          onValidateAddress={(addr, el) => {
            void runValidationAndRoute(addr, el);
          }}
          isValidating={isValidating}
          validationError={validationError}
          validation={validation}
          eligibility={eligibility}
          route={route}
          items={SAMPLE_CART_ITEMS}
          orderStatus={orderStatus}
          onPlaceOrder={handlePlaceOrder}
          isSimulating={isSimulating}
          onToggleSimulation={handleToggleSimulation}
          onResetSimulation={handleResetSimulation}
          courierProgress={courierProgress}
          onAutocompleteReady={(el) => {
            autocompleteElRef.current = el;
          }}
        />

        <DeliveryMap
          validation={validation}
          eligibility={eligibility}
          route={route}
          courierPosition={courierPosition}
          courierHeading={courierHeading}
          courierProgress={courierProgress}
          orderStatus={orderStatus}
          isSimulating={isSimulating}
        />
      </main>
    </div>
  );
}

export default function App() {
  if (!API_KEY) {
    return (
      <div className="missing-key-screen">
        <div className="missing-key-card">
          <h1>Missing VITE_GOOGLE_MAPS_API_KEY</h1>
          <p>
            Create a <code>.env.local</code> file in the project root with your
            Google Maps Platform API key:
          </p>
          <pre>VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here</pre>
          <p>
            Need a free zero-billing key for prototyping? Follow the Maps Demo Key
            instructions in <code>.env.example</code> or <code>README.md</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider
      apiKey={API_KEY}
      libraries={[
        'places',
        'marker',
        'routes',
        'geometry',
        'geocoding',
      ]}
      version="weekly"
      region="US"
      language="en"
    >
      <LiveOrderTrackerWorkspace apiKey={API_KEY} />
    </APIProvider>
  );
}
