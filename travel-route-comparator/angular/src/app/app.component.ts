import { CommonModule } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  GoogleMap,
  MapAdvancedMarker,
  MapBicyclingLayer,
  MapPolyline,
  MapTrafficLayer,
  MapTransitLayer,
} from '@angular/google-maps';
import { ElevationChartComponent } from './components/elevation-chart/elevation-chart.component';
import { PlacePickerComponent } from './components/place-picker/place-picker.component';
import {
  ATTRIBUTION_ID,
  ComputedRouteOption,
  DENVER_BOULDER_CENTER,
  ElevationProfileSummary,
  ElevationSamplePoint,
  ModeQuickSummary,
  ResolvedPlace,
  RouteModifiersState,
  SEED_DESTINATION_QUERY,
  SEED_ORIGIN_QUERY,
  TravelModeId,
} from './models/route-comparator.models';
import { GoogleMapsLoaderService } from './services/google-maps-loader.service';
import { RouteComparatorService } from './services/route-comparator.service';

const MODE_DEFINITIONS: Array<{ id: TravelModeId; label: string; icon: string }> = [
  { id: 'DRIVING', label: 'Drive', icon: '🚗' },
  { id: 'BICYCLING', label: 'Cycle', icon: '🚴' },
  { id: 'WALKING', label: 'Walk', icon: '🥾' },
  { id: 'TRANSIT', label: 'Transit', icon: '🚆' },
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    GoogleMap,
    MapAdvancedMarker,
    MapPolyline,
    MapBicyclingLayer,
    MapTransitLayer,
    MapTrafficLayer,
    PlacePickerComponent,
    ElevationChartComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private readonly mapsLoader = inject(GoogleMapsLoaderService);
  private readonly routeService = inject(RouteComparatorService);

  private readonly mapRef = viewChild(GoogleMap);

  readonly mapsReady = this.mapsLoader.isLoaded;
  readonly missingApiKey = this.mapsLoader.missingApiKey;
  readonly loadError = this.mapsLoader.loadError;

  readonly origin = signal<ResolvedPlace | null>(null);
  readonly destination = signal<ResolvedPlace | null>(null);
  readonly activeMode = signal<TravelModeId>('BICYCLING');
  readonly modifiers = signal<RouteModifiersState>({
    avoidTolls: false,
    avoidHighways: false,
    ecoFriendly: false,
  });

  readonly routesByMode = signal<Record<TravelModeId, ComputedRouteOption[]>>({
    DRIVING: [],
    BICYCLING: [],
    WALKING: [],
    TRANSIT: [],
  });
  readonly modeLoading = signal<Record<TravelModeId, boolean>>({
    DRIVING: false,
    BICYCLING: false,
    WALKING: false,
    TRANSIT: false,
  });
  readonly modeErrors = signal<Record<TravelModeId, string | null>>({
    DRIVING: null,
    BICYCLING: null,
    WALKING: null,
    TRANSIT: null,
  });

  readonly selectedRouteIndex = signal(0);
  readonly elevationProfile = signal<ElevationProfileSummary | null>(null);
  readonly elevationLoading = signal(false);
  readonly elevationError = signal<string | null>(null);
  readonly hoverSample = signal<ElevationSamplePoint | null>(null);
  readonly statusMessage = signal<string | null>(null);

  readonly initialCenter = DENVER_BOULDER_CENTER;
  readonly initialZoom = 11;
  readonly mapOptions: google.maps.MapOptions = {
    mapId: 'DEMO_MAP_ID',
    internalUsageAttributionIds: [ATTRIBUTION_ID],
    mapTypeControl: true,
    streetViewControl: false,
    fullscreenControl: true,
    clickableIcons: true,
  };

  originPin: google.maps.marker.PinElement | null = null;
  destinationPin: google.maps.marker.PinElement | null = null;
  hoverPin: google.maps.marker.PinElement | null = null;

  private mapInstance: google.maps.Map | null = null;
  private elevationRequestSeq = 0;

  readonly activeRoutes = computed(() => this.routesByMode()[this.activeMode()]);

  readonly selectedRoute = computed<ComputedRouteOption | null>(() => {
    const routes = this.activeRoutes();
    if (!routes.length) return null;
    return routes[this.selectedRouteIndex()] ?? routes[0];
  });

  readonly inactiveRoutes = computed(() => {
    const active = this.selectedRoute();
    return this.activeRoutes().filter((r) => !active || r.index !== active.index);
  });

  readonly showBetaAdvisory = computed(
    () => this.activeMode() === 'BICYCLING' || this.activeMode() === 'WALKING'
  );

  readonly activeModeLoading = computed(
    () => this.modeLoading()[this.activeMode()]
  );

  readonly activeModeError = computed(
    () => this.modeErrors()[this.activeMode()]
  );

  readonly modeSummaries = computed<ModeQuickSummary[]>(() => {
    const mapRoutes = this.routesByMode();
    const loadingMap = this.modeLoading();
    const errMap = this.modeErrors();

    return MODE_DEFINITIONS.map((def) => {
      const list = mapRoutes[def.id];
      const primary = list[0];
      return {
        mode: def.id,
        label: def.label,
        durationText: primary ? primary.durationText : loadingMap[def.id] ? '…' : '—',
        distanceText: primary ? primary.distanceText : '',
        routeCount: list.length,
        loading: loadingMap[def.id],
        unavailable: Boolean(errMap[def.id]) && !list.length,
      };
    });
  });

  readonly modeDefs = MODE_DEFINITIONS;

  async ngOnInit(): Promise<void> {
    try {
      const libs = await this.mapsLoader.load();
      const { PinElement } = libs.marker;

      this.originPin = new PinElement({
        background: '#059669',
        borderColor: '#064e3b',
        glyphColor: '#ffffff',
        glyphText: 'A',
        scale: 1.1,
      });

      this.destinationPin = new PinElement({
        background: '#e11d48',
        borderColor: '#881337',
        glyphColor: '#ffffff',
        glyphText: 'B',
        scale: 1.1,
      });

      this.hoverPin = new PinElement({
        background: '#0f172a',
        borderColor: '#ffffff',
        glyphColor: '#34d399',
        glyphText: '●',
        scale: 0.95,
      });

      const [seededOrigin, seededDest] = await Promise.all([
        this.routeService.resolvePlaceByText(SEED_ORIGIN_QUERY),
        this.routeService.resolvePlaceByText(SEED_DESTINATION_QUERY),
      ]);

      this.origin.set(seededOrigin);
      this.destination.set(seededDest);
      await this.computeAllModes();
    } catch (err) {
      if (!this.missingApiKey() && !this.loadError()) {
        this.statusMessage.set(
          err instanceof Error ? err.message : 'Unable to initialize route comparator.'
        );
      }
    }
  }

  onMapInitialized(map: google.maps.Map): void {
    this.mapInstance = map;
    this.fitMapToActiveRoute();
  }

  onOriginSelected(place: ResolvedPlace): void {
    this.origin.set(place);
    this.hoverSample.set(null);
    void this.computeAllModes();
  }

  onDestinationSelected(place: ResolvedPlace): void {
    this.destination.set(place);
    this.hoverSample.set(null);
    void this.computeAllModes();
  }

  onPickerError(msg: string): void {
    this.statusMessage.set(msg);
  }

  swapLocations(): void {
    const currentOrigin = this.origin();
    const currentDest = this.destination();
    if (!currentOrigin || !currentDest) return;
    this.origin.set(currentDest);
    this.destination.set(currentOrigin);
    this.hoverSample.set(null);
    void this.computeAllModes();
  }

  setMode(mode: TravelModeId): void {
    if (this.activeMode() === mode) return;
    this.activeMode.set(mode);
    this.selectedRouteIndex.set(0);
    this.hoverSample.set(null);
    this.fitMapToActiveRoute();
    void this.refreshElevationForSelectedRoute();
  }

  toggleModifier(key: keyof RouteModifiersState): void {
    this.modifiers.update((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    this.hoverSample.set(null);
    void this.recomputeDrivingMode();
  }

  selectRoute(index: number): void {
    this.selectedRouteIndex.set(index);
    this.hoverSample.set(null);
    this.fitMapToActiveRoute();
    void this.refreshElevationForSelectedRoute();
  }

  onElevationHover(sample: ElevationSamplePoint | null): void {
    this.hoverSample.set(sample);
  }

  fitMapToActiveRoute(): void {
    const map = this.mapInstance ?? this.mapRef()?.googleMap;
    if (!map || !this.mapsReady()) return;

    const route = this.selectedRoute();
    const bounds = new google.maps.LatLngBounds();
    let hasPoints = false;

    if (route?.path?.length) {
      for (const pt of route.path) {
        bounds.extend(pt);
        hasPoints = true;
      }
    } else {
      const o = this.origin();
      const d = this.destination();
      if (o) {
        bounds.extend(o.location);
        hasPoints = true;
      }
      if (d) {
        bounds.extend(d.location);
        hasPoints = true;
      }
    }

    if (hasPoints) {
      map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
    }
  }

  modeButtonId(mode: TravelModeId): string {
    switch (mode) {
      case 'DRIVING':
        return 'mode-drive-btn';
      case 'BICYCLING':
        return 'mode-bicycle-btn';
      case 'WALKING':
        return 'mode-walk-btn';
      case 'TRANSIT':
        return 'mode-transit-btn';
    }
  }

  modeIcon(mode: TravelModeId): string {
    return MODE_DEFINITIONS.find((m) => m.id === mode)?.icon ?? '🧭';
  }

  inactivePolylineOptions(route: ComputedRouteOption): google.maps.PolylineOptions {
    return {
      strokeColor: route.color,
      strokeOpacity: 0.45,
      strokeWeight: 5,
      zIndex: 10,
      clickable: true,
    };
  }

  activeCasingOptions(): google.maps.PolylineOptions {
    return {
      strokeColor: '#ffffff',
      strokeOpacity: 0.9,
      strokeWeight: 10,
      zIndex: 25,
      clickable: false,
    };
  }

  activePolylineOptions(route: ComputedRouteOption): google.maps.PolylineOptions {
    return {
      strokeColor: route.color,
      strokeOpacity: 0.95,
      strokeWeight: 6,
      zIndex: 30,
      clickable: true,
    };
  }

  private async computeAllModes(): Promise<void> {
    const o = this.origin();
    const d = this.destination();
    if (!o || !d) return;

    this.selectedRouteIndex.set(0);
    this.statusMessage.set(null);

    const modes: TravelModeId[] = ['BICYCLING', 'DRIVING', 'WALKING', 'TRANSIT'];
    this.modeLoading.set({
      DRIVING: true,
      BICYCLING: true,
      WALKING: true,
      TRANSIT: true,
    });
    this.modeErrors.set({
      DRIVING: null,
      BICYCLING: null,
      WALKING: null,
      TRANSIT: null,
    });

    await Promise.all(modes.map((mode) => this.computeSingleMode(o, d, mode)));
  }

  private async recomputeDrivingMode(): Promise<void> {
    const o = this.origin();
    const d = this.destination();
    if (!o || !d) return;

    if (this.activeMode() === 'DRIVING') {
      this.selectedRouteIndex.set(0);
    }
    this.modeLoading.update((prev) => ({ ...prev, DRIVING: true }));
    this.modeErrors.update((prev) => ({ ...prev, DRIVING: null }));
    await this.computeSingleMode(o, d, 'DRIVING');
  }

  private async computeSingleMode(
    origin: ResolvedPlace,
    destination: ResolvedPlace,
    mode: TravelModeId
  ): Promise<void> {
    try {
      const routes = await this.routeService.computeRoutesForMode(
        origin,
        destination,
        mode,
        this.modifiers()
      );
      this.routesByMode.update((prev) => ({ ...prev, [mode]: routes }));
      this.modeErrors.update((prev) => ({
        ...prev,
        [mode]: routes.length ? null : `No ${mode.toLowerCase()} routes returned for this pair.`,
      }));

      if (mode === this.activeMode()) {
        this.fitMapToActiveRoute();
        void this.refreshElevationForSelectedRoute();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : `Unable to compute ${mode.toLowerCase()} route.`;
      this.routesByMode.update((prev) => ({ ...prev, [mode]: [] }));
      this.modeErrors.update((prev) => ({ ...prev, [mode]: message }));
      if (mode === this.activeMode()) {
        this.elevationProfile.set(null);
      }
    } finally {
      this.modeLoading.update((prev) => ({ ...prev, [mode]: false }));
    }
  }

  private async refreshElevationForSelectedRoute(): Promise<void> {
    const route = this.selectedRoute();
    const mode = this.activeMode();

    if (!route || route.path.length < 2) {
      this.elevationProfile.set(null);
      this.elevationError.set(null);
      return;
    }

    if (mode === 'TRANSIT') {
      this.elevationProfile.set(null);
      this.elevationError.set(
        'Elevation & slope tracking focuses on Cycling, Walking, and Driving routes. Switch to Cycle or Walk to inspect trail grade.'
      );
      return;
    }

    const seq = ++this.elevationRequestSeq;
    this.elevationLoading.set(true);
    this.elevationError.set(null);

    try {
      const summary = await this.routeService.fetchElevationProfile(route.path, 64);
      if (seq !== this.elevationRequestSeq) return;
      this.elevationProfile.set(summary);
    } catch (err) {
      if (seq !== this.elevationRequestSeq) return;
      this.elevationProfile.set(null);
      this.elevationError.set(
        err instanceof Error ? err.message : 'Unable to fetch Elevation API profile.'
      );
    } finally {
      if (seq === this.elevationRequestSeq) {
        this.elevationLoading.set(false);
      }
    }
  }
}
