import {
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CandidateDriver,
  ComputedRouteOption,
  DriverTelemetry,
  EcoSavingsSummary,
  FareEstimate,
  FareTierId,
  LatLngPoint,
  ResolvedPlace,
  RouteOptionKind,
  VehicleEmissionType,
} from './models/rideshare.models';
import { MapsLoaderService } from './services/maps-loader.service';
import {
  INITIAL_CANDIDATE_DRIVERS,
  RideshareRoutingService,
} from './services/rideshare-routing.service';
import { PlaceAutocompleteInputComponent } from './components/place-autocomplete-input/place-autocomplete-input.component';
import { RideshareMapComponent } from './components/rideshare-map/rideshare-map.component';

const DEFAULT_PICKUP_QUERY = 'Union Station, Los Angeles, CA';
const DEFAULT_DROPOFF_QUERY = 'Santa Monica Pier, Santa Monica, CA';

interface PathSegmentMetrics {
  points: LatLngPoint[];
  cumulativeMeters: number[];
  totalMeters: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PlaceAutocompleteInputComponent,
    RideshareMapComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly mapsLoader = inject(MapsLoaderService);
  private readonly routingService = inject(RideshareRoutingService);

  mapsReady = false;
  apiKeyMissing = false;
  isComputing = false;
  errorMessage: string | null = null;

  pickupDisplayText = DEFAULT_PICKUP_QUERY;
  dropoffDisplayText = DEFAULT_DROPOFF_QUERY;
  pickupPlace: ResolvedPlace | null = null;
  dropoffPlace: ResolvedPlace | null = null;

  emissionType: VehicleEmissionType = 'HYBRID';
  selectedRouteKind: RouteOptionKind = 'eco';
  selectedFareTier: FareTierId = 'green';

  fastestRoute: ComputedRouteOption | null = null;
  ecoRoute: ComputedRouteOption | null = null;
  ecoSavings: EcoSavingsSummary | null = null;
  fareEstimates: FareEstimate[] = [];

  candidateDrivers: CandidateDriver[] = INITIAL_CANDIDATE_DRIVERS.map((d) => ({ ...d }));

  driverTelemetry: DriverTelemetry = {
    driver: null,
    phase: 'idle',
    statusLabel: 'Awaiting dispatch',
    position: null,
    heading: 0,
    remainingSeconds: 0,
    remainingMeters: 0,
    progressPercent: 0,
    pickupPath: [],
  };

  simulationRunning = false;
  private rafId: number | null = null;
  private lastFrameMs = 0;

  private approachMetrics: PathSegmentMetrics | null = null;
  private tripMetrics: PathSegmentMetrics | null = null;
  private approachDurationSec = 180;
  private tripDurationSec = 1200;
  private simStage: 'approach' | 'pickup_dwell' | 'trip' | 'done' = 'approach';
  private simStageProgress = 0; // 0..1 within current stage
  private dwellElapsedMs = 0;

  async ngOnInit(): Promise<void> {
    if (!this.mapsLoader.hasApiKey()) {
      this.apiKeyMissing = true;
      return;
    }

    try {
      await this.mapsLoader.loadLibraries();
      this.mapsReady = true;

      const [pickup, dropoff] = await Promise.all([
        this.routingService.resolvePlaceByText(DEFAULT_PICKUP_QUERY),
        this.routingService.resolvePlaceByText(DEFAULT_DROPOFF_QUERY),
      ]);

      this.pickupPlace = pickup;
      this.dropoffPlace = dropoff;
      this.pickupDisplayText = pickup.name || DEFAULT_PICKUP_QUERY;
      this.dropoffDisplayText = dropoff.name || DEFAULT_DROPOFF_QUERY;

      await this.recomputeTripAndDispatch();
    } catch (err) {
      this.errorMessage =
        err instanceof Error ? err.message : 'Failed to initialize Los Angeles rideshare workspace.';
    }
  }

  ngOnDestroy(): void {
    this.stopAnimationLoop();
  }

  get activeRoute(): ComputedRouteOption | null {
    return this.selectedRouteKind === 'eco'
      ? this.ecoRoute ?? this.fastestRoute
      : this.fastestRoute ?? this.ecoRoute;
  }

  get headerStatusText(): string {
    if (this.apiKeyMissing) return 'API Key Required';
    if (this.isComputing) return 'Computing Routes…';
    if (this.driverTelemetry.phase === 'idle') return 'Ready to Dispatch';
    return this.driverTelemetry.statusLabel;
  }

  async onPickupSelected(place: ResolvedPlace): Promise<void> {
    this.pickupPlace = place;
    this.pickupDisplayText = place.name;
    await this.recomputeTripAndDispatch();
  }

  async onDropoffSelected(place: ResolvedPlace): Promise<void> {
    this.dropoffPlace = place;
    this.dropoffDisplayText = place.name;
    await this.recomputeTripAndDispatch();
  }

  async swapLocations(): Promise<void> {
    if (!this.pickupPlace || !this.dropoffPlace) return;
    const prevPickup = this.pickupPlace;
    const prevDropoff = this.dropoffPlace;
    this.pickupPlace = prevDropoff;
    this.dropoffPlace = prevPickup;
    this.pickupDisplayText = prevDropoff.name;
    this.dropoffDisplayText = prevPickup.name;
    await this.recomputeTripAndDispatch();
  }

  async onEmissionTypeChange(nextType: VehicleEmissionType): Promise<void> {
    this.emissionType = nextType;
    if (this.pickupPlace && this.dropoffPlace) {
      await this.recomputeRoutesOnly();
    }
  }

  selectRouteKind(kind: RouteOptionKind): void {
    this.selectedRouteKind = kind;
    if (kind === 'eco') {
      this.selectedFareTier = 'green';
    }
    this.updateFares();
    if (this.activeRoute) {
      this.tripMetrics = this.buildPathMetrics(this.activeRoute.path);
      this.tripDurationSec = this.activeRoute.durationSeconds;
    }
  }

  selectFareTier(tier: FareTierId): void {
    this.selectedFareTier = tier;
    if (tier === 'green' && this.ecoRoute) {
      this.selectRouteKind('eco');
    }
  }

  async dispatchClosestDriver(): Promise<void> {
    if (!this.pickupPlace || !this.activeRoute) return;

    this.stopAnimationLoop();
    this.errorMessage = null;

    const evaluated = await this.routingService.evaluateCandidateDrivers(
      this.pickupPlace.location,
      INITIAL_CANDIDATE_DRIVERS.map((d) => ({ ...d }))
    );

    const bestDriver = evaluated[0];
    this.candidateDrivers = evaluated.map((d, idx) => ({
      ...d,
      isDispatched: idx === 0,
    }));

    this.driverTelemetry = {
      ...this.driverTelemetry,
      driver: bestDriver,
      phase: 'searching',
      statusLabel: `Dispatching ${bestDriver.name}…`,
    };

    const approach = await this.routingService.computeDriverPickupRoute(
      bestDriver.location,
      this.pickupPlace.location
    );

    this.approachMetrics = this.buildPathMetrics(approach.path);
    this.approachDurationSec = approach.durationSeconds;

    const tripRoute = this.activeRoute;
    this.tripMetrics = this.buildPathMetrics(tripRoute.path);
    this.tripDurationSec = tripRoute.durationSeconds;

    this.simStage = 'approach';
    this.simStageProgress = 0;
    this.dwellElapsedMs = 0;

    const startPoint = approach.path[0] ?? bestDriver.location;
    const nextPoint = approach.path[1] ?? this.pickupPlace.location;

    this.driverTelemetry = {
      driver: bestDriver,
      phase: 'en_route_to_pickup',
      statusLabel: `${bestDriver.name} en route to pickup`,
      position: startPoint,
      heading: this.computeHeading(startPoint, nextPoint),
      remainingSeconds: this.approachDurationSec,
      remainingMeters: approach.distanceMeters,
      progressPercent: 0,
      pickupPath: approach.path,
    };

    this.simulationRunning = true;
    this.startAnimationLoop();
  }

  toggleSimulation(): void {
    if (!this.driverTelemetry.driver) {
      void this.dispatchClosestDriver();
      return;
    }

    if (this.simStage === 'done') {
      void this.dispatchClosestDriver();
      return;
    }

    if (this.simulationRunning) {
      this.simulationRunning = false;
      this.stopAnimationLoop();
    } else {
      this.simulationRunning = true;
      this.startAnimationLoop();
    }
  }

  formatDuration(seconds: number | null | undefined): string {
    if (seconds == null || !Number.isFinite(seconds)) return '—';
    const totalMins = Math.max(1, Math.round(seconds / 60));
    if (totalMins < 60) return `${totalMins} min`;
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }

  formatDistanceMiles(meters: number | null | undefined): string {
    if (meters == null || !Number.isFinite(meters)) return '—';
    const miles = meters / 1609.344;
    return `${miles.toFixed(1)} mi`;
  }

  formatFuelLiters(microliters: number | null): string {
    if (microliters == null || microliters <= 0) return 'N/A';
    const liters = microliters / 1_000_000;
    return `${liters.toFixed(2)} L`;
  }

  private async recomputeTripAndDispatch(): Promise<void> {
    await this.recomputeRoutesOnly();
    if (this.pickupPlace && this.activeRoute) {
      await this.dispatchClosestDriver();
    }
  }

  private async recomputeRoutesOnly(): Promise<void> {
    if (!this.pickupPlace || !this.dropoffPlace) return;

    this.isComputing = true;
    this.errorMessage = null;

    try {
      const { fastest, eco, savings } =
        await this.routingService.computeTripComparison(
          this.pickupPlace.location,
          this.dropoffPlace.location,
          this.emissionType
        );

      this.fastestRoute = fastest;
      this.ecoRoute = eco;
      this.ecoSavings = savings;
      this.updateFares();

      if (this.activeRoute) {
        this.tripMetrics = this.buildPathMetrics(this.activeRoute.path);
        this.tripDurationSec = this.activeRoute.durationSeconds;
      }
    } catch (err) {
      this.errorMessage =
        err instanceof Error ? err.message : 'Unable to compute Routes API comparison.';
    } finally {
      this.isComputing = false;
    }
  }

  private updateFares(): void {
    const route = this.activeRoute;
    if (!route || !this.ecoSavings) return;
    this.fareEstimates = this.routingService.calculateFareEstimates(
      route,
      this.ecoSavings
    );
  }

  private startAnimationLoop(): void {
    this.stopAnimationLoop();
    this.lastFrameMs = performance.now();

    const step = (now: number) => {
      if (!this.simulationRunning) return;
      const dtMs = Math.min(100, Math.max(0, now - this.lastFrameMs));
      this.lastFrameMs = now;
      this.advanceSimulation(dtMs);
      if (this.simulationRunning) {
        this.rafId = requestAnimationFrame(step);
      }
    };

    this.rafId = requestAnimationFrame(step);
  }

  private stopAnimationLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private advanceSimulation(dtMs: number): void {
    const driver = this.driverTelemetry.driver;
    if (!driver || !this.approachMetrics || !this.tripMetrics) return;

    // 14s visual simulation for pickup approach, 18s visual simulation for full trip
    const approachRealMs = 14000;
    const tripRealMs = 18000;
    const dwellDurationMs = 1200;

    if (this.simStage === 'approach') {
      this.simStageProgress = Math.min(1, this.simStageProgress + dtMs / approachRealMs);
      const sample = this.samplePath(this.approachMetrics, this.simStageProgress);
      const remainingSec = Math.max(
        0,
        Math.round(this.approachDurationSec * (1 - this.simStageProgress))
      );
      const remainingMeters = Math.max(
        0,
        Math.round(this.approachMetrics.totalMeters * (1 - this.simStageProgress))
      );

      this.driverTelemetry = {
        ...this.driverTelemetry,
        phase: this.simStageProgress > 0.85 ? 'arriving_pickup' : 'en_route_to_pickup',
        statusLabel:
          this.simStageProgress > 0.85
            ? `${driver.name} arriving at pickup`
            : `${driver.name} en route to pickup`,
        position: sample.position,
        heading: sample.heading,
        remainingSeconds: remainingSec,
        remainingMeters,
        progressPercent: Math.round(this.simStageProgress * 35),
      };

      if (this.simStageProgress >= 1) {
        this.simStage = 'pickup_dwell';
        this.dwellElapsedMs = 0;
      }
      return;
    }

    if (this.simStage === 'pickup_dwell') {
      this.dwellElapsedMs += dtMs;
      this.driverTelemetry = {
        ...this.driverTelemetry,
        phase: 'arriving_pickup',
        statusLabel: `${driver.name} picked up passenger — starting trip`,
        remainingSeconds: this.tripDurationSec,
        remainingMeters: this.tripMetrics.totalMeters,
        progressPercent: 35,
      };
      if (this.dwellElapsedMs >= dwellDurationMs) {
        this.simStage = 'trip';
        this.simStageProgress = 0;
      }
      return;
    }

    if (this.simStage === 'trip') {
      this.simStageProgress = Math.min(1, this.simStageProgress + dtMs / tripRealMs);
      const sample = this.samplePath(this.tripMetrics, this.simStageProgress);
      const remainingSec = Math.max(
        0,
        Math.round(this.tripDurationSec * (1 - this.simStageProgress))
      );
      const remainingMeters = Math.max(
        0,
        Math.round(this.tripMetrics.totalMeters * (1 - this.simStageProgress))
      );

      this.driverTelemetry = {
        ...this.driverTelemetry,
        phase: 'in_trip',
        statusLabel: `In trip to ${this.dropoffPlace?.name ?? 'destination'}`,
        position: sample.position,
        heading: sample.heading,
        remainingSeconds: remainingSec,
        remainingMeters,
        progressPercent: Math.round(35 + this.simStageProgress * 65),
      };

      if (this.simStageProgress >= 1) {
        this.simStage = 'done';
        this.simulationRunning = false;
        this.stopAnimationLoop();
        this.driverTelemetry = {
          ...this.driverTelemetry,
          phase: 'arrived_dropoff',
          statusLabel: `Arrived at ${this.dropoffPlace?.name ?? 'destination'}`,
          remainingSeconds: 0,
          remainingMeters: 0,
          progressPercent: 100,
        };
      }
    }
  }

  private buildPathMetrics(points: LatLngPoint[]): PathSegmentMetrics {
    const cumulativeMeters: number[] = [0];
    let totalMeters = 0;

    for (let i = 1; i < points.length; i++) {
      const seg = this.distanceMeters(points[i - 1], points[i]);
      totalMeters += seg;
      cumulativeMeters.push(totalMeters);
    }

    return {
      points,
      cumulativeMeters,
      totalMeters: Math.max(1, totalMeters),
    };
  }

  private samplePath(
    metrics: PathSegmentMetrics,
    fraction: number
  ): { position: LatLngPoint; heading: number } {
    const pts = metrics.points;
    if (pts.length === 0) {
      return { position: { lat: 34.0328, lng: -118.3669 }, heading: 0 };
    }
    if (pts.length === 1 || fraction <= 0) {
      return {
        position: pts[0],
        heading: pts.length > 1 ? this.computeHeading(pts[0], pts[1]) : 0,
      };
    }
    if (fraction >= 1) {
      const last = pts[pts.length - 1];
      const prev = pts[pts.length - 2];
      return {
        position: last,
        heading: this.computeHeading(prev, last),
      };
    }

    const targetMeters = fraction * metrics.totalMeters;
    let idx = 1;
    while (idx < metrics.cumulativeMeters.length && metrics.cumulativeMeters[idx] < targetMeters) {
      idx++;
    }
    idx = Math.min(idx, pts.length - 1);

    const startMeters = metrics.cumulativeMeters[idx - 1];
    const endMeters = metrics.cumulativeMeters[idx];
    const segLen = Math.max(0.001, endMeters - startMeters);
    const localT = Math.min(1, Math.max(0, (targetMeters - startMeters) / segLen));

    const p1 = pts[idx - 1];
    const p2 = pts[idx];

    if (typeof google !== 'undefined' && google.maps?.geometry?.spherical) {
      const interp = google.maps.geometry.spherical.interpolate(p1, p2, localT);
      const heading = google.maps.geometry.spherical.computeHeading(p1, p2);
      return {
        position: { lat: interp.lat(), lng: interp.lng() },
        heading,
      };
    }

    return {
      position: {
        lat: p1.lat + (p2.lat - p1.lat) * localT,
        lng: p1.lng + (p2.lng - p1.lng) * localT,
      },
      heading: this.computeHeading(p1, p2),
    };
  }

  private distanceMeters(a: LatLngPoint, b: LatLngPoint): number {
    if (typeof google !== 'undefined' && google.maps?.geometry?.spherical) {
      return google.maps.geometry.spherical.computeDistanceBetween(a, b);
    }
    const R = 6371000;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  private computeHeading(a: LatLngPoint, b: LatLngPoint): number {
    if (typeof google !== 'undefined' && google.maps?.geometry?.spherical) {
      return google.maps.geometry.spherical.computeHeading(a, b);
    }
    const y = Math.sin(((b.lng - a.lng) * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180);
    const x =
      Math.cos((a.lat * Math.PI) / 180) * Math.sin((b.lat * Math.PI) / 180) -
      Math.sin((a.lat * Math.PI) / 180) *
        Math.cos((b.lat * Math.PI) / 180) *
        Math.cos(((b.lng - a.lng) * Math.PI) / 180);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  }
}
