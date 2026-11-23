'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  ArrowUpDown,
  Car,
  CheckCircle2,
  Clock,
  Fuel,
  Leaf,
  MapPin,
  Navigation,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';
import { PlaceAutocompleteInput } from '@/components/PlaceAutocompleteInput';
import { RideshareMap } from '@/components/RideshareMap';
import {
  buildCandidateDriversNearPickup,
  calculateEcoSavings,
  calculateFareEstimates,
  computeBearingDegrees,
  formatDistanceMiles,
  formatDurationCompact,
  formatEtaCountdown,
  haversineMeters,
  parseDurationSeconds,
} from '@/lib/fare';
import type {
  CandidateDriver,
  ComputedRouteData,
  DriverSimulationState,
  EmissionType,
  FareTierId,
  LatLngLiteral,
  ResolvedPlace,
  RouteMode,
} from '@/types/rideshare';

const SEED_PICKUP_QUERY = 'Union Station, Los Angeles, CA';
const SEED_DROPOFF_QUERY = 'Santa Monica Pier, Santa Monica, CA';

interface RawRouteApiResponse {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
    staticDuration?: string;
    polyline?: { encodedPolyline?: string };
    routeLabels?: string[];
    travelAdvisory?: { fuelConsumptionMicroliters?: string | number };
    localizedValues?: {
      distance?: { text?: string };
      duration?: { text?: string };
    };
  }>;
  error?: string;
}

interface RawMatrixApiResponse {
  elements?: Array<{
    originIndex?: number;
    destinationIndex?: number;
    duration?: string;
    distanceMeters?: number;
    condition?: string;
  }>;
  error?: string;
}

interface RawPlacesSearchResponse {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
  }>;
  error?: string;
}

function normalizeRoute(
  raw: NonNullable<RawRouteApiResponse['routes']>[number],
  mode: RouteMode
): ComputedRouteData {
  const distanceMeters = raw.distanceMeters ?? 0;
  const durationSeconds = parseDurationSeconds(raw.duration);
  const staticDurationSeconds = parseDurationSeconds(raw.staticDuration);
  const fuelRaw = raw.travelAdvisory?.fuelConsumptionMicroliters;
  const fuelConsumptionMicroliters =
    fuelRaw !== undefined && fuelRaw !== null ? Number(fuelRaw) : null;

  return {
    mode,
    routeLabels: raw.routeLabels ?? [],
    distanceMeters,
    durationSeconds,
    staticDurationSeconds,
    encodedPolyline: raw.polyline?.encodedPolyline ?? '',
    fuelConsumptionMicroliters: Number.isFinite(fuelConsumptionMicroliters)
      ? fuelConsumptionMicroliters
      : null,
    localizedDistance:
      raw.localizedValues?.distance?.text ||
      formatDistanceMiles(distanceMeters),
    localizedDuration:
      raw.localizedValues?.duration?.text ||
      formatDurationCompact(durationSeconds),
  };
}

function buildPolylineCumulativeDistances(
  points: google.maps.LatLng[]
): { cumulative: number[]; totalMeters: number } {
  const cumulative = [0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const prev: LatLngLiteral = {
      lat: points[i - 1].lat(),
      lng: points[i - 1].lng(),
    };
    const curr: LatLngLiteral = {
      lat: points[i].lat(),
      lng: points[i].lng(),
    };
    total += haversineMeters(prev, curr);
    cumulative.push(total);
  }
  return { cumulative, totalMeters: total };
}

function sampleAlongDecodedPath(
  points: google.maps.LatLng[],
  cumulative: number[],
  totalMeters: number,
  fraction: number,
  geometryLib: google.maps.GeometryLibrary
): { position: LatLngLiteral; heading: number } | null {
  if (points.length === 0) return null;
  if (points.length === 1 || totalMeters <= 0) {
    return {
      position: { lat: points[0].lat(), lng: points[0].lng() },
      heading: 0,
    };
  }

  const clamped = Math.max(0, Math.min(1, fraction));
  const targetMeters = clamped * totalMeters;

  let segIdx = 0;
  for (let i = 0; i < cumulative.length - 1; i++) {
    if (targetMeters <= cumulative[i + 1] || i === cumulative.length - 2) {
      segIdx = i;
      break;
    }
  }

  const startPt = points[segIdx];
  const endPt = points[segIdx + 1];
  const segStart = cumulative[segIdx];
  const segEnd = cumulative[segIdx + 1];
  const segLen = segEnd - segStart;
  const segFraction =
    segLen > 0 ? Math.max(0, Math.min(1, (targetMeters - segStart) / segLen)) : 0;

  const interp = geometryLib.spherical.interpolate(startPt, endPt, segFraction);
  const heading = geometryLib.spherical.computeHeading(startPt, endPt);

  return {
    position: { lat: interp.lat(), lng: interp.lng() },
    heading: Number.isFinite(heading)
      ? heading
      : computeBearingDegrees(
          { lat: startPt.lat(), lng: startPt.lng() },
          { lat: endPt.lat(), lng: endPt.lng() }
        ),
  };
}

function DriverSimulationLoop({
  simulation,
  setSimulation,
  activeTripRoute,
}: {
  simulation: DriverSimulationState;
  setSimulation: React.Dispatch<React.SetStateAction<DriverSimulationState>>;
  activeTripRoute: ComputedRouteData | null;
}) {
  const geometryLib = useMapsLibrary('geometry');
  const progressRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number | null>(null);
  const boardingElapsedRef = useRef<number>(0);

  // Reset segment progress when phase resets to EN_ROUTE_TO_PICKUP from dispatch
  useEffect(() => {
    if (simulation.phase === 'EN_ROUTE_TO_PICKUP' && simulation.progressPercent === 0) {
      progressRef.current = 0;
      boardingElapsedRef.current = 0;
      lastFrameTimeRef.current = null;
    }
  }, [simulation.phase, simulation.progressPercent]);

  const decodedApproach = useMemo(() => {
    if (!geometryLib || !simulation.approachPolyline) return null;
    const pts = geometryLib.encoding.decodePath(simulation.approachPolyline);
    const meta = buildPolylineCumulativeDistances(pts);
    return { pts, ...meta };
  }, [geometryLib, simulation.approachPolyline]);

  const decodedTrip = useMemo(() => {
    if (!geometryLib || !activeTripRoute?.encodedPolyline) return null;
    const pts = geometryLib.encoding.decodePath(activeTripRoute.encodedPolyline);
    const meta = buildPolylineCumulativeDistances(pts);
    return { pts, ...meta };
  }, [geometryLib, activeTripRoute?.encodedPolyline]);

  useEffect(() => {
    if (!geometryLib || !simulation.isRunning) {
      lastFrameTimeRef.current = null;
      return;
    }
    if (
      simulation.phase === 'IDLE' ||
      simulation.phase === 'COMPLETED'
    ) {
      return;
    }

    let rafId = 0;
    const APPROACH_ANIM_DURATION_MS = 12000;
    const BOARDING_DWELL_MS = 1200;
    const TRIP_ANIM_DURATION_MS = 28000;

    const tick = (now: number) => {
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = now;
      }
      const dt = Math.min(120, Math.max(0, now - lastFrameTimeRef.current));
      lastFrameTimeRef.current = now;

      setSimulation((prev) => {
        if (!prev.isRunning) return prev;

        if (prev.phase === 'EN_ROUTE_TO_PICKUP') {
          if (!decodedApproach || decodedApproach.pts.length === 0) {
            progressRef.current = 0;
            return {
              ...prev,
              phase: 'IN_TRANSIT',
              progressPercent: 0,
            };
          }

          progressRef.current = Math.min(
            1,
            progressRef.current + dt / APPROACH_ANIM_DURATION_MS
          );
          const sample = sampleAlongDecodedPath(
            decodedApproach.pts,
            decodedApproach.cumulative,
            decodedApproach.totalMeters,
            progressRef.current,
            geometryLib
          );

          const approachDurationSec =
            prev.dispatchedDriver?.etaToPickupSeconds ?? 240;
          const remainingRatio = Math.max(0, 1 - progressRef.current);

          if (progressRef.current >= 1) {
            boardingElapsedRef.current = 0;
            return {
              ...prev,
              phase: 'ARRIVED_AT_PICKUP',
              currentPosition: sample?.position ?? prev.currentPosition,
              heading: sample?.heading ?? prev.heading,
              progressPercent: 100,
              remainingEtaSeconds: 0,
              remainingDistanceMeters: 0,
            };
          }

          return {
            ...prev,
            currentPosition: sample?.position ?? prev.currentPosition,
            heading: sample?.heading ?? prev.heading,
            progressPercent: Math.round(progressRef.current * 100),
            remainingEtaSeconds: Math.round(approachDurationSec * remainingRatio),
            remainingDistanceMeters: Math.round(
              decodedApproach.totalMeters * remainingRatio
            ),
          };
        }

        if (prev.phase === 'ARRIVED_AT_PICKUP') {
          boardingElapsedRef.current += dt;
          if (boardingElapsedRef.current >= BOARDING_DWELL_MS) {
            progressRef.current = 0;
            const tripDurationSec = activeTripRoute?.durationSeconds ?? 1500;
            const tripDistanceM = activeTripRoute?.distanceMeters ?? 16000;
            return {
              ...prev,
              phase: 'IN_TRANSIT',
              progressPercent: 0,
              remainingEtaSeconds: tripDurationSec,
              remainingDistanceMeters: tripDistanceM,
            };
          }
          return prev;
        }

        if (prev.phase === 'IN_TRANSIT') {
          if (!decodedTrip || decodedTrip.pts.length === 0) {
            return {
              ...prev,
              phase: 'COMPLETED',
              isRunning: false,
              progressPercent: 100,
              remainingEtaSeconds: 0,
              remainingDistanceMeters: 0,
            };
          }

          progressRef.current = Math.min(
            1,
            progressRef.current + dt / TRIP_ANIM_DURATION_MS
          );
          const sample = sampleAlongDecodedPath(
            decodedTrip.pts,
            decodedTrip.cumulative,
            decodedTrip.totalMeters,
            progressRef.current,
            geometryLib
          );

          const tripDurationSec = activeTripRoute?.durationSeconds ?? 1500;
          const tripDistanceM =
            activeTripRoute?.distanceMeters ?? decodedTrip.totalMeters;
          const remainingRatio = Math.max(0, 1 - progressRef.current);

          if (progressRef.current >= 1) {
            return {
              ...prev,
              phase: 'COMPLETED',
              isRunning: false,
              currentPosition: sample?.position ?? prev.currentPosition,
              heading: sample?.heading ?? prev.heading,
              progressPercent: 100,
              remainingEtaSeconds: 0,
              remainingDistanceMeters: 0,
            };
          }

          return {
            ...prev,
            currentPosition: sample?.position ?? prev.currentPosition,
            heading: sample?.heading ?? prev.heading,
            progressPercent: Math.round(progressRef.current * 100),
            remainingEtaSeconds: Math.round(tripDurationSec * remainingRatio),
            remainingDistanceMeters: Math.round(tripDistanceM * remainingRatio),
          };
        }

        return prev;
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [
    geometryLib,
    simulation.isRunning,
    simulation.phase,
    decodedApproach,
    decodedTrip,
    activeTripRoute?.durationSeconds,
    activeTripRoute?.distanceMeters,
    setSimulation,
  ]);

  return null;
}

function RideshareInner({
  hasApiKey,
}: {
  hasApiKey: boolean;
}) {
  const [pickup, setPickup] = useState<ResolvedPlace | null>(null);
  const [dropoff, setDropoff] = useState<ResolvedPlace | null>(null);
  const [emissionType, setEmissionType] = useState<EmissionType>('GASOLINE');
  const [selectedRouteMode, setSelectedRouteMode] = useState<RouteMode>('eco');
  const [selectedTier, setSelectedTier] = useState<FareTierId>('green');

  const [fastestRoute, setFastestRoute] = useState<ComputedRouteData | null>(
    null
  );
  const [ecoRoute, setEcoRoute] = useState<ComputedRouteData | null>(null);
  const [candidateDrivers, setCandidateDrivers] = useState<CandidateDriver[]>(
    []
  );

  const [isLoadingTrip, setIsLoadingTrip] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [simulation, setSimulation] = useState<DriverSimulationState>({
    phase: 'IDLE',
    isRunning: false,
    dispatchedDriver: null,
    currentPosition: null,
    heading: 0,
    progressPercent: 0,
    remainingEtaSeconds: 0,
    remainingDistanceMeters: 0,
    approachPolyline: null,
  });

  // Resolve pre-seeded Los Angeles pickup & drop-off via Places API (New) Text Search
  useEffect(() => {
    if (!hasApiKey) return;
    let cancelled = false;

    async function seedPlaces() {
      setIsLoadingTrip(true);
      setErrorMessage(null);

      try {
        const [pickupRes, dropoffRes] = await Promise.all([
          fetch('/api/places/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              textQuery: SEED_PICKUP_QUERY,
              maxResultCount: 1,
            }),
          }),
          fetch('/api/places/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              textQuery: SEED_DROPOFF_QUERY,
              maxResultCount: 1,
            }),
          }),
        ]);

        const [pickupJson, dropoffJson] = (await Promise.all([
          pickupRes.json(),
          dropoffRes.json(),
        ])) as [RawPlacesSearchResponse, RawPlacesSearchResponse];

        if (cancelled) return;

        const firstPickup = pickupJson.places?.[0];
        const firstDropoff = dropoffJson.places?.[0];

        if (
          firstPickup?.location?.latitude !== undefined &&
          firstPickup?.location?.longitude !== undefined
        ) {
          setPickup({
            id: firstPickup.id || 'seed-pickup',
            name: firstPickup.displayName?.text || 'Union Station Los Angeles',
            formattedAddress: firstPickup.formattedAddress || SEED_PICKUP_QUERY,
            location: {
              lat: firstPickup.location.latitude,
              lng: firstPickup.location.longitude,
            },
          });
        } else if (pickupJson.error) {
          setErrorMessage(pickupJson.error);
        }

        if (
          firstDropoff?.location?.latitude !== undefined &&
          firstDropoff?.location?.longitude !== undefined
        ) {
          setDropoff({
            id: firstDropoff.id || 'seed-dropoff',
            name: firstDropoff.displayName?.text || 'Santa Monica Pier',
            formattedAddress:
              firstDropoff.formattedAddress || SEED_DROPOFF_QUERY,
            location: {
              lat: firstDropoff.location.latitude,
              lng: firstDropoff.location.longitude,
            },
          });
        } else if (dropoffJson.error) {
          setErrorMessage(dropoffJson.error);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to resolve initial LA locations:', err);
          setErrorMessage(
            'Unable to resolve initial Los Angeles locations via Places API.'
          );
        }
      } finally {
        if (!cancelled) setIsLoadingTrip(false);
      }
    }

    void seedPlaces();
    return () => {
      cancelled = true;
    };
  }, [hasApiKey]);

  const dispatchClosestDriver = useCallback(
    async (pickupLoc: LatLngLiteral) => {
      const initialCandidates = buildCandidateDriversNearPickup(pickupLoc);
      setCandidateDrivers(initialCandidates);

      try {
        const matrixRes = await fetch('/api/routes/matrix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origins: initialCandidates.map((d) => d.location),
            destination: pickupLoc,
          }),
        });

        const matrixJson = (await matrixRes.json()) as RawMatrixApiResponse;
        let enriched = initialCandidates;

        if (matrixRes.ok && Array.isArray(matrixJson.elements)) {
          enriched = initialCandidates.map((driver, idx) => {
            const match = matrixJson.elements?.find(
              (el) => (el.originIndex ?? 0) === idx
            );
            const etaSec = match?.duration
              ? parseDurationSeconds(match.duration)
              : Math.round(
                  haversineMeters(driver.location, pickupLoc) / 9.5
                );
            const distM =
              match?.distanceMeters ??
              Math.round(haversineMeters(driver.location, pickupLoc));

            return {
              ...driver,
              etaToPickupSeconds: Math.max(60, etaSec),
              distanceToPickupMeters: distM,
            };
          });
        }

        setCandidateDrivers(enriched);

        // Pick closest driver by live Route Matrix ETA
        const sorted = [...enriched].sort(
          (a, b) =>
            (a.etaToPickupSeconds ?? Number.MAX_SAFE_INTEGER) -
            (b.etaToPickupSeconds ?? Number.MAX_SAFE_INTEGER)
        );
        const winner = sorted[0] ?? enriched[0];

        // Fetch approach polyline from winning driver to pickup
        let approachPolyline: string | null = null;
        let approachEtaSec = winner.etaToPickupSeconds ?? 240;
        let approachDistM =
          winner.distanceToPickupMeters ??
          Math.round(haversineMeters(winner.location, pickupLoc));

        const approachRes = await fetch('/api/routes/compute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: winner.location,
            destination: pickupLoc,
            includeEco: false,
          }),
        });

        if (approachRes.ok) {
          const approachJson =
            (await approachRes.json()) as RawRouteApiResponse;
          const approachRoute = approachJson.routes?.[0];
          if (approachRoute?.polyline?.encodedPolyline) {
            approachPolyline = approachRoute.polyline.encodedPolyline;
            approachEtaSec =
              parseDurationSeconds(approachRoute.duration) || approachEtaSec;
            approachDistM = approachRoute.distanceMeters ?? approachDistM;
          }
        }

        const updatedWinner: CandidateDriver = {
          ...winner,
          etaToPickupSeconds: approachEtaSec,
          distanceToPickupMeters: approachDistM,
        };

        setSimulation({
          phase: 'EN_ROUTE_TO_PICKUP',
          isRunning: true,
          dispatchedDriver: updatedWinner,
          currentPosition: updatedWinner.location,
          heading: computeBearingDegrees(updatedWinner.location, pickupLoc),
          progressPercent: 0,
          remainingEtaSeconds: approachEtaSec,
          remainingDistanceMeters: approachDistM,
          approachPolyline,
        });
      } catch (err) {
        console.error('Error dispatching closest driver:', err);
      }
    },
    []
  );

  // Compute fastest & eco-friendly routes whenever pickup, dropoff, or emissionType updates
  useEffect(() => {
    if (!hasApiKey || !pickup || !dropoff) return;
    let cancelled = false;

    async function computeTripRoutes() {
      if (!pickup || !dropoff) return;
      setIsLoadingTrip(true);
      setErrorMessage(null);

      try {
        const res = await fetch('/api/routes/compute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: pickup.location,
            destination: dropoff.location,
            emissionType,
            includeEco: true,
          }),
        });

        const data = (await res.json()) as RawRouteApiResponse;
        if (cancelled) return;

        if (!res.ok || !data.routes?.length) {
          setErrorMessage(
            data.error || 'Routes API returned no routes for this trip.'
          );
          return;
        }

        const rawDefault =
          data.routes.find((r) => r.routeLabels?.includes('DEFAULT_ROUTE')) ??
          data.routes[0];
        const rawEco =
          data.routes.find((r) => r.routeLabels?.includes('FUEL_EFFICIENT')) ??
          rawDefault;

        setFastestRoute(normalizeRoute(rawDefault, 'fastest'));
        setEcoRoute(normalizeRoute(rawEco, 'eco'));
      } catch (err) {
        if (!cancelled) {
          console.error('Error computing trip routes:', err);
          setErrorMessage('Failed to compute traffic-aware and eco routes.');
        }
      } finally {
        if (!cancelled) setIsLoadingTrip(false);
      }
    }

    void computeTripRoutes();
    return () => {
      cancelled = true;
    };
  }, [hasApiKey, pickup, dropoff, emissionType]);

  // Dispatch closest candidate driver whenever pickup changes
  useEffect(() => {
    if (!hasApiKey || !pickup) return;
    void dispatchClosestDriver(pickup.location);
  }, [hasApiKey, pickup, dispatchClosestDriver]);

  const activeRoute =
    selectedRouteMode === 'eco' ? ecoRoute ?? fastestRoute : fastestRoute ?? ecoRoute;

  const ecoSavings = useMemo(
    () => calculateEcoSavings(fastestRoute, ecoRoute, emissionType),
    [fastestRoute, ecoRoute, emissionType]
  );

  const fareEstimates = useMemo(
    () =>
      calculateFareEstimates(
        activeRoute,
        selectedRouteMode === 'eco',
        emissionType,
        simulation.dispatchedDriver?.etaToPickupSeconds ?? 240
      ),
    [
      activeRoute,
      selectedRouteMode,
      emissionType,
      simulation.dispatchedDriver?.etaToPickupSeconds,
    ]
  );

  const handleSwapLocations = () => {
    if (!pickup || !dropoff) return;
    const prevPickup = pickup;
    const prevDropoff = dropoff;
    setPickup(prevDropoff);
    setDropoff(prevPickup);
  };

  const handleDispatchClick = () => {
    if (!pickup) return;
    void dispatchClosestDriver(pickup.location);
  };

  const handleToggleSimulation = () => {
    setSimulation((prev) => {
      if (prev.phase === 'COMPLETED' && pickup) {
        void dispatchClosestDriver(pickup.location);
        return prev;
      }
      return {
        ...prev,
        isRunning: !prev.isRunning,
      };
    });
  };

  const statusBadge = useMemo(() => {
    switch (simulation.phase) {
      case 'EN_ROUTE_TO_PICKUP':
        return {
          label: 'Driver En Route',
          classes: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
        };
      case 'ARRIVED_AT_PICKUP':
        return {
          label: 'At Pickup Curb',
          classes: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
        };
      case 'IN_TRANSIT':
        return {
          label: 'Trip In Progress',
          classes: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
        };
      case 'COMPLETED':
        return {
          label: 'Arrived at Drop-off',
          classes: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
        };
      default:
        return {
          label: hasApiKey ? 'Preparing Dispatch' : 'API Key Required',
          classes: 'bg-slate-700/70 text-slate-200 border-slate-600',
        };
    }
  }, [simulation.phase, hasApiKey]);

  const activeFare =
    fareEstimates.find((f) => f.id === selectedTier) ?? fareEstimates[0];

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900">
      {hasApiKey && (
        <DriverSimulationLoop
          simulation={simulation}
          setSimulation={setSimulation}
          activeTripRoute={activeRoute}
        />
      )}

      {/* 56px Top Header */}
      <header className="flex h-[56px] shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-slate-950 shadow-sm">
            <Navigation className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <h1 className="text-sm font-bold tracking-tight text-white">
              LA EcoRide Dispatch
            </h1>
            <p className="text-[11px] text-slate-400">
              Los Angeles Smart Mobility &amp; Live Driver Telemetry
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-2 rounded-full border border-slate-800 bg-slate-900/90 px-3 py-1 text-xs text-slate-300 md:flex">
          <MapPin className="h-3.5 w-3.5 text-emerald-400" />
          <span className="max-w-[180px] truncate font-medium text-white">
            {pickup?.name || 'Union Station'}
          </span>
          <span className="text-slate-500">→</span>
          <span className="max-w-[180px] truncate font-medium text-white">
            {dropoff?.name || 'Santa Monica Pier'}
          </span>
          {activeRoute && (
            <span className="ml-1 rounded bg-slate-800 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-300">
              {activeRoute.localizedDistance} · {activeRoute.localizedDuration}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadge.classes}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {statusBadge.label}
          </span>
        </div>
      </header>

      {/* Split-Screen Main Workspace */}
      <main className="flex flex-1 flex-col lg:flex-row">
        {/* 400px Scrollable Left Sidebar */}
        <aside className="sidebar-scroll w-full shrink-0 space-y-4 border-r border-slate-200 bg-slate-50 p-4 lg:h-[calc(100vh-56px)] lg:w-[400px] lg:overflow-y-auto">
          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <p className="font-semibold">Routing / Places Notice</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          )}

          {/* 1. Trip Planner Card */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Los Angeles Trip Planner
              </h2>
              <button
                type="button"
                data-testid="swap-locations-btn"
                onClick={handleSwapLocations}
                disabled={!pickup || !dropoff}
                title="Swap pickup and drop-off"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                Swap
              </button>
            </div>

            <div className="space-y-3">
              <PlaceAutocompleteInput
                testId="pickup-autocomplete"
                label="Pickup Location"
                placeholder="Search Los Angeles pickup..."
                selectedPlace={pickup}
                fallbackText={SEED_PICKUP_QUERY}
                accentColor="emerald"
                hasApiKey={hasApiKey}
                onPlaceSelect={(place) => setPickup(place)}
              />

              <PlaceAutocompleteInput
                testId="dropoff-autocomplete"
                label="Drop-off Location"
                placeholder="Search Los Angeles drop-off..."
                selectedPlace={dropoff}
                fallbackText={SEED_DROPOFF_QUERY}
                accentColor="rose"
                hasApiKey={hasApiKey}
                onPlaceSelect={(place) => setDropoff(place)}
              />
            </div>
          </section>

          {/* 2. Fastest vs Eco-Friendly Route Comparison */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                2. Route &amp; Eco Comparison
              </h2>
              <div className="flex items-center gap-1.5">
                <label
                  htmlFor="emission-type-select"
                  className="text-[11px] font-medium text-slate-500"
                >
                  Powertrain:
                </label>
                <select
                  id="emission-type-select"
                  data-testid="emission-type-select"
                  value={emissionType}
                  onChange={(e) =>
                    setEmissionType(e.target.value as EmissionType)
                  }
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
                >
                  <option value="GASOLINE">Gasoline</option>
                  <option value="HYBRID">Hybrid</option>
                  <option value="ELECTRIC">Electric (EV)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Fastest Route Card */}
              <button
                type="button"
                data-testid="route-option-fastest"
                onClick={() => setSelectedRouteMode('fastest')}
                className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                  selectedRouteMode === 'fastest'
                    ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-100'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700">
                    <Zap className="h-3.5 w-3.5" />
                    Fastest
                  </span>
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
                    Traffic
                  </span>
                </div>
                <div className="mt-2 text-base font-extrabold text-slate-900">
                  {fastestRoute
                    ? fastestRoute.localizedDuration
                    : isLoadingTrip
                      ? 'Computing...'
                      : '--'}
                </div>
                <div className="text-xs font-medium text-slate-500">
                  {fastestRoute ? fastestRoute.localizedDistance : 'Routes API'}
                </div>
                {fastestRoute?.fuelConsumptionMicroliters !== null &&
                  fastestRoute?.fuelConsumptionMicroliters !== undefined && (
                    <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-slate-600">
                      <Fuel className="h-3 w-3 text-slate-400" />
                      {(fastestRoute.fuelConsumptionMicroliters / 1_000_000).toFixed(
                        2
                      )}{' '}
                      L eq.
                    </div>
                  )}
              </button>

              {/* Eco-Friendly Route Card */}
              <button
                type="button"
                data-testid="route-option-eco"
                onClick={() => setSelectedRouteMode('eco')}
                className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                  selectedRouteMode === 'eco'
                    ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-100'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                    <Leaf className="h-3.5 w-3.5" />
                    Eco-Friendly
                  </span>
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                    Eco
                  </span>
                </div>
                <div className="mt-2 text-base font-extrabold text-slate-900">
                  {ecoRoute
                    ? ecoRoute.localizedDuration
                    : isLoadingTrip
                      ? 'Computing...'
                      : '--'}
                </div>
                <div className="text-xs font-medium text-slate-500">
                  {ecoRoute ? ecoRoute.localizedDistance : 'Fuel Efficient'}
                </div>
                {ecoRoute?.fuelConsumptionMicroliters !== null &&
                  ecoRoute?.fuelConsumptionMicroliters !== undefined && (
                    <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                      <Fuel className="h-3 w-3 text-emerald-500" />
                      {(ecoRoute.fuelConsumptionMicroliters / 1_000_000).toFixed(
                        2
                      )}{' '}
                      L eq.
                    </div>
                  )}
              </button>
            </div>

            {/* Eco Fuel / Energy & CO2 Savings Banner */}
            <div
              data-testid="eco-savings-banner"
              className="mt-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-3"
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1 text-xs">
                  {ecoSavings ? (
                    ecoSavings.fuelSavedLiters > 0.01 ? (
                      <>
                        <p className="font-bold text-emerald-950">
                          Eco Route saves {ecoSavings.fuelSavedLiters.toFixed(2)} L (
                          {ecoSavings.fuelSavedPercent}%) &amp;{' '}
                          {ecoSavings.co2SavedKg.toFixed(2)} kg CO₂
                        </p>
                        <p className="mt-0.5 text-emerald-800">
                          ~{ecoSavings.energySavedKwh.toFixed(1)} kWh energy
                          saved for {emissionType.toLowerCase()} powertrain
                          {ecoSavings.timeDeltaSeconds > 0
                            ? ` (+${Math.max(1, Math.round(ecoSavings.timeDeltaSeconds / 60))} min vs fastest)`
                            : ' with equal or faster ETA'}
                          .
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-bold text-emerald-950">
                          Optimal Corridor Active ({emissionType})
                        </p>
                        <p className="mt-0.5 text-emerald-800">
                          {ecoSavings.isSameRoute
                            ? 'The fastest traffic-aware route is also the most fuel-efficient path right now'
                            : 'Minimal fuel variance between routes'}
                          {ecoSavings.ecoFuelLiters !== null
                            ? ` · Est. ${ecoSavings.ecoFuelLiters.toFixed(2)} L (${(ecoSavings.ecoFuelLiters * 2.31).toFixed(2)} kg CO₂ eq.)`
                            : '.'}
                        </p>
                      </>
                    )
                  ) : (
                    <p className="font-medium text-emerald-900">
                      Live fuel &amp; energy consumption estimates load via
                      Routes API <code className="text-[11px]">FUEL_CONSUMPTION</code>.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 3. Transparent Fare Estimator */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                3. Transparent Fare Estimator
              </h2>
              <span className="text-[11px] font-medium text-slate-500">
                Live distance &amp; traffic
              </span>
            </div>

            <div className="space-y-2">
              {fareEstimates.map((tier) => {
                const isSelected = selectedTier === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    data-testid={`fare-tier-${tier.id}`}
                    onClick={() => setSelectedTier(tier.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                        : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{tier.name}</span>
                          {tier.id === 'green' && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isSelected
                                  ? 'bg-emerald-500 text-slate-950'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              Eco Choice
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-[11px] ${
                            isSelected ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          {tier.vehicleClass} · {tier.etaMinutes} min away
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-extrabold">
                          ${tier.totalUsd.toFixed(2)}
                        </div>
                        {tier.ecoDiscountUsd > 0 && (
                          <div
                            className={`text-[10px] font-semibold ${
                              isSelected
                                ? 'text-emerald-300'
                                : 'text-emerald-600'
                            }`}
                          >
                            -${tier.ecoDiscountUsd.toFixed(2)} eco credit
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Itemized Fare Breakdown for Active Tier */}
            {activeFare && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <div className="mb-1.5 flex items-center justify-between font-semibold text-slate-800">
                  <span>{activeFare.name} Breakdown</span>
                  <span>${activeFare.totalUsd.toFixed(2)}</span>
                </div>
                <div className="grid grid-cols-2 gap-y-1 text-[11px]">
                  <span>Base fare</span>
                  <span className="text-right font-medium">
                    ${activeFare.baseFareUsd.toFixed(2)}
                  </span>
                  <span>
                    Distance ({activeRoute ? activeRoute.localizedDistance : '0 mi'})
                  </span>
                  <span className="text-right font-medium">
                    ${activeFare.distanceChargeUsd.toFixed(2)}
                  </span>
                  <span>
                    Time ({activeRoute ? activeRoute.localizedDuration : '0 min'})
                  </span>
                  <span className="text-right font-medium">
                    ${activeFare.timeChargeUsd.toFixed(2)}
                  </span>
                  <span>LA booking &amp; safety fee</span>
                  <span className="text-right font-medium">
                    ${activeFare.bookingFeeUsd.toFixed(2)}
                  </span>
                  {activeFare.ecoDiscountUsd > 0 && (
                    <>
                      <span className="font-semibold text-emerald-700">
                        Eco-Friendly credit
                      </span>
                      <span className="text-right font-semibold text-emerald-700">
                        -${activeFare.ecoDiscountUsd.toFixed(2)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* 4. Live Driver Dispatch & ETA Tracker */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                4. Live Driver Dispatch
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Route Matrix Matched
              </span>
            </div>

            {simulation.dispatchedDriver ? (
              <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-emerald-400">
                    <Car className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-900">
                        {simulation.dispatchedDriver.name}
                      </span>
                      <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                        <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                        {simulation.dispatchedDriver.rating.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      {simulation.dispatchedDriver.vehicleModel} ·{' '}
                      <span className="font-mono font-semibold text-slate-800">
                        {simulation.dispatchedDriver.licensePlate}
                      </span>
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                  {simulation.dispatchedDriver.emissionType}
                </span>
              </div>
            ) : (
              <p className="mb-3 text-xs text-slate-500">
                Evaluating nearby Los Angeles vehicles via Route Matrix...
              </p>
            )}

            {/* Live ETA Telemetry Box */}
            <div
              data-testid="driver-live-eta"
              className="mb-3 rounded-xl border border-slate-800 bg-slate-950 p-3 text-white"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  {simulation.phase === 'COMPLETED' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Clock className="h-4 w-4 text-amber-400" />
                  )}
                  <span>
                    {simulation.phase === 'EN_ROUTE_TO_PICKUP' &&
                      'En route to pickup'}
                    {simulation.phase === 'ARRIVED_AT_PICKUP' &&
                      'Driver arrived at pickup'}
                    {simulation.phase === 'IN_TRANSIT' &&
                      'Heading to drop-off'}
                    {simulation.phase === 'COMPLETED' && 'Trip completed'}
                    {simulation.phase === 'IDLE' && 'Ready to dispatch'}
                  </span>
                </div>
                <span className="font-mono text-sm font-bold text-emerald-400">
                  {simulation.phase === 'COMPLETED'
                    ? '0:00'
                    : formatEtaCountdown(simulation.remainingEtaSeconds)}
                </span>
              </div>

              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-150"
                  style={{ width: `${simulation.progressPercent}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  Remaining:{' '}
                  {formatDistanceMiles(simulation.remainingDistanceMeters)}
                </span>
                <span>{simulation.progressPercent}% leg progress</span>
              </div>
            </div>

            {/* Dispatch & Pause/Resume Controls */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="dispatch-driver-btn"
                onClick={handleDispatchClick}
                disabled={!pickup}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Dispatch Closest
              </button>

              <button
                type="button"
                data-testid="toggle-simulation-btn"
                onClick={handleToggleSimulation}
                disabled={!simulation.dispatchedDriver}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                {simulation.isRunning ? (
                  <>
                    <Pause className="h-3.5 w-3.5" />
                    Pause Tracker
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    {simulation.phase === 'COMPLETED'
                      ? 'Replay Trip'
                      : 'Resume Tracker'}
                  </>
                )}
              </button>
            </div>
          </section>
        </aside>

        {/* Right Interactive Map Canvas */}
        <section
          data-testid="rideshare-map"
          className="relative min-h-[560px] w-full flex-1 bg-slate-200 lg:h-[calc(100vh-56px)]"
        >
          {hasApiKey ? (
            <RideshareMap
              pickup={pickup}
              dropoff={dropoff}
              fastestRoute={fastestRoute}
              ecoRoute={ecoRoute}
              selectedRouteMode={selectedRouteMode}
              candidateDrivers={candidateDrivers}
              simulation={simulation}
            />
          ) : (
            <div className="flex h-full min-h-[560px] w-full items-center justify-center bg-slate-900 p-6 text-white">
              <div className="max-w-md rounded-2xl border border-slate-700 bg-slate-800/90 p-6 shadow-2xl">
                <h3 className="text-base font-bold text-emerald-400">
                  Google Maps Platform API Key Required
                </h3>
                <p className="mt-2 text-sm text-slate-300">
                  Add <code className="rounded bg-slate-900 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{' '}
                  to <code className="rounded bg-slate-900 px-1.5 py-0.5 text-xs">.env.local</code>{' '}
                  to enable interactive LA vector maps, Places Autocomplete,
                  Eco-Friendly Routes, and live driver tracking.
                </p>
                <a
                    href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentsamples_v1.0.0"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"
                >
                  Get a Free Maps Demo Key
                </a>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export function RideshareWorkspace({
  initialApiKey,
}: {
  initialApiKey: string;
}) {
  const apiKey =
    initialApiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const hasApiKey = Boolean(apiKey && apiKey !== 'your_google_maps_api_key_here');

  if (!hasApiKey) {
    return <RideshareInner hasApiKey={false} />;
  }

  return (
    <APIProvider
      apiKey={apiKey}
      libraries={['core', 'maps', 'marker', 'places', 'routes', 'geometry']}
      language="en"
      region="US"
    >
      <RideshareInner hasApiKey={true} />
    </APIProvider>
  );
}
