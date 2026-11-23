import {
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  GoogleMap,
  MapAdvancedMarker,
  MapInfoWindow,
  MapPolyline,
  MapTrafficLayer,
} from '@angular/google-maps';
import {
  DALLAS_CENTER,
  DALLAS_CENTRAL_DEPOT,
  INITIAL_FLEET_VEHICLES,
} from './data/dallas-fleet.data';
import {
  DispatchRouteSummary,
  FleetVehicle,
  HubMatrixRow,
  LatLngPoint,
  LogisticsHub,
  RoadSnapSummary,
  StatusFilter,
  VehicleStatus,
} from './models/fleet.models';
import { GoogleMapsLoaderService } from './services/google-maps-loader.service';
import { TelematicsApiService } from './services/telematics-api.service';

interface InfoWindowState {
  kind: 'vehicle' | 'hub';
  title: string;
  subtitle: string;
  badgeText: string;
  badgeTone: 'en-route' | 'delayed' | 'idle' | 'depot' | 'hub';
  details: Array<{ label: string; value: string }>;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    GoogleMap,
    MapAdvancedMarker,
    MapPolyline,
    MapTrafficLayer,
    MapInfoWindow,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  readonly mapsLoader = inject(GoogleMapsLoaderService);
  private readonly telematicsApi = inject(TelematicsApiService);

  @ViewChild('googleMap') googleMapRef?: GoogleMap;
  @ViewChild('infoWindow') infoWindowRef?: MapInfoWindow;
  @ViewChild('autocompleteHost')
  autocompleteHostRef?: ElementRef<HTMLDivElement>;

  readonly depot = DALLAS_CENTRAL_DEPOT;
  readonly vehicles = signal<FleetVehicle[]>(INITIAL_FLEET_VEHICLES);
  readonly statusFilter = signal<StatusFilter>('ALL');
  readonly selectedVehicleId = signal<string>(INITIAL_FLEET_VEHICLES[0].id);

  readonly showTrafficLayer = signal<boolean>(false);
  readonly snapToRoadsEnabled = signal<boolean>(true);
  readonly optimizeWaypoints = signal<boolean>(true);

  readonly hubs = signal<LogisticsHub[]>([]);
  readonly roadSnapSummary = signal<RoadSnapSummary | null>(null);
  readonly dispatchRoute = signal<DispatchRouteSummary | null>(null);
  readonly hubMatrix = signal<HubMatrixRow[]>([]);

  readonly snappingInProgress = signal<boolean>(false);
  readonly routingInProgress = signal<boolean>(false);
  readonly discoveringHubs = signal<boolean>(false);
  readonly infoState = signal<InfoWindowState | null>(null);

  readonly mapCenter = signal<LatLngPoint>(DALLAS_CENTER);
  readonly mapZoom = signal<number>(12);

  private autocompleteElement: google.maps.places.PlaceAutocompleteElement | null =
    null;
  private autocompleteListener: ((e: Event) => void) | null = null;
  private googleMapInstance: google.maps.Map | null = null;

  readonly mapOptions = computed<google.maps.MapOptions>(() => ({
    mapId: 'DEMO_MAP_ID',
    clickableIcons: false,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    zoomControl: true,
    internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
  }));

  readonly rawPolylineOptions = computed<google.maps.PolylineOptions>(() => ({
    strokeColor: '#f97316',
    strokeOpacity: 0,
    strokeWeight: 3,
    zIndex: 20,
    icons: [
      {
        icon: {
          path: 'M 0,-1 0,1',
          strokeOpacity: 0.95,
          strokeColor: '#f97316',
          scale: 3,
        },
        offset: '0',
        repeat: '12px',
      },
    ],
  }));

  readonly snappedPolylineOptions = computed<google.maps.PolylineOptions>(
    () => ({
      strokeColor: '#0891b2',
      strokeOpacity: 0.95,
      strokeWeight: 5,
      zIndex: 30,
    })
  );

  readonly dispatchPolylineOptions = computed<google.maps.PolylineOptions>(
    () => ({
      strokeColor: '#2563eb',
      strokeOpacity: 0.85,
      strokeWeight: 5,
      zIndex: 10,
    })
  );

  readonly statusCounts = computed(() => {
    const all = this.vehicles();
    return {
      all: all.length,
      enRoute: all.filter((v) => v.status === 'EN_ROUTE').length,
      delayed: all.filter((v) => v.status === 'DELAYED').length,
      idle: all.filter((v) => v.status === 'IDLE').length,
    };
  });

  readonly filteredVehicles = computed(() => {
    const filter = this.statusFilter();
    const list = this.vehicles();
    if (filter === 'ALL') return list;
    return list.filter((v) => v.status === filter);
  });

  readonly selectedVehicle = computed(() => {
    const id = this.selectedVehicleId();
    return this.vehicles().find((v) => v.id === id) ?? this.vehicles()[0];
  });

  readonly selectedHubs = computed(() =>
    this.hubs().filter((hub) => hub.selected)
  );

  readonly rawTracePath = computed<LatLngPoint[]>(() => {
    return this.selectedVehicle()?.rawGpsTrace ?? [];
  });

  readonly snappedTracePath = computed<LatLngPoint[]>(() => {
    if (!this.snapToRoadsEnabled()) return [];
    const summary = this.roadSnapSummary();
    if (!summary || summary.vehicleId !== this.selectedVehicle()?.id) return [];
    return summary.snappedPath;
  });

  readonly dispatchPath = computed<LatLngPoint[]>(() => {
    return this.dispatchRoute()?.path ?? [];
  });

  readonly vehicleMarkerEntries = computed(() => {
    const activeId = this.selectedVehicleId();
    return this.filteredVehicles().map((vehicle) => ({
      vehicle,
      zIndex: vehicle.id === activeId ? 90 : 50,
      content: this.createVehicleMarkerDom(vehicle, vehicle.id === activeId),
    }));
  });

  readonly depotMarkerContent = computed(() =>
    this.createDepotMarkerDom(this.depot.name)
  );

  readonly hubMarkerEntries = computed(() => {
    const orderedIds = this.dispatchRoute()?.orderedHubIds ?? [];
    return this.selectedHubs().map((hub, idx) => {
      const orderPos = orderedIds.indexOf(hub.id);
      const stopNumber = orderPos >= 0 ? orderPos + 1 : idx + 1;
      return {
        hub,
        stopNumber,
        content: this.createHubMarkerDom(stopNumber, hub.name),
      };
    });
  });

  async ngOnInit(): Promise<void> {
    const libs = await this.mapsLoader.ensureLoaded();
    if (!libs) return;

    // Defer mounting PlaceAutocompleteElement slightly to ensure ViewChild host is rendered
    queueMicrotask(() => this.mountPlaceAutocomplete(libs));

    // Load real Dallas logistics hubs via Places API (New), snap active vehicle GPS trace,
    // and compute multi-stop dispatch route + travel-time matrix.
    await this.initializeOperationalData();
  }

  ngOnDestroy(): void {
    if (this.autocompleteElement && this.autocompleteListener) {
      this.autocompleteElement.removeEventListener(
        'gmp-select',
        this.autocompleteListener
      );
    }
  }

  onMapInitialized(map: google.maps.Map): void {
    this.googleMapInstance = map;
  }

  setStatusFilter(filter: StatusFilter): void {
    this.statusFilter.set(filter);
  }

  toggleTrafficLayer(): void {
    this.showTrafficLayer.update((prev) => !prev);
  }

  async toggleSnapToRoads(): Promise<void> {
    const next = !this.snapToRoadsEnabled();
    this.snapToRoadsEnabled.set(next);
    if (next) {
      await this.snapActiveVehicleTrace();
    }
  }

  toggleOptimizeWaypoints(): void {
    this.optimizeWaypoints.update((prev) => !prev);
  }

  async selectVehicle(vehicle: FleetVehicle): Promise<void> {
    this.selectedVehicleId.set(vehicle.id);
    this.mapCenter.set(vehicle.position);
    this.googleMapInstance?.panTo(vehicle.position);
    if (this.snapToRoadsEnabled()) {
      await this.snapActiveVehicleTrace();
    }
  }

  onVehicleMarkerClick(
    vehicle: FleetVehicle,
    markerRef: MapAdvancedMarker
  ): void {
    void this.selectVehicle(vehicle);
    this.infoState.set({
      kind: 'vehicle',
      title: `${vehicle.id} · ${vehicle.driverName}`,
      subtitle: vehicle.corridor,
      badgeText: this.formatStatusLabel(vehicle.status),
      badgeTone:
        vehicle.status === 'EN_ROUTE'
          ? 'en-route'
          : vehicle.status === 'DELAYED'
            ? 'delayed'
            : 'idle',
      details: [
        { label: 'Speed', value: `${vehicle.speedMph} mph` },
        { label: 'Next Stop', value: vehicle.nextStopLabel },
        {
          label: 'ETA',
          value: vehicle.etaMinutes > 0 ? `${vehicle.etaMinutes} min` : 'Staged',
        },
        { label: 'Unit Type', value: vehicle.unitType },
      ],
    });
    this.infoWindowRef?.open(markerRef);
  }

  onDepotMarkerClick(markerRef: MapAdvancedMarker): void {
    this.infoState.set({
      kind: 'hub',
      title: this.depot.name,
      subtitle: this.depot.address,
      badgeText: 'Central Depot',
      badgeTone: 'depot',
      details: [
        { label: 'Active Stops', value: `${this.selectedHubs().length} hubs` },
        {
          label: 'Coordinates',
          value: `${this.depot.location.lat.toFixed(4)}, ${this.depot.location.lng.toFixed(4)}`,
        },
      ],
    });
    this.infoWindowRef?.open(markerRef);
  }

  onHubMarkerClick(
    hub: LogisticsHub,
    stopNumber: number,
    markerRef: MapAdvancedMarker
  ): void {
    const matrixEntry = this.hubMatrix().find((m) => m.hubId === hub.id);
    this.infoState.set({
      kind: 'hub',
      title: `Stop #${stopNumber} · ${hub.name}`,
      subtitle: hub.address,
      badgeText:
        hub.source === 'places-autocomplete'
          ? 'Added via Search'
          : 'Places Hub',
      badgeTone: 'hub',
      details: [
        {
          label: 'Depot ETA',
          value: matrixEntry
            ? this.formatDuration(matrixEntry.durationMillis)
            : 'Pending',
        },
        {
          label: 'Depot Distance',
          value: matrixEntry
            ? this.formatDistance(matrixEntry.distanceMeters)
            : 'Pending',
        },
      ],
    });
    this.infoWindowRef?.open(markerRef);
  }

  async toggleHubSelection(hubId: string): Promise<void> {
    this.hubs.update((list) =>
      list.map((hub) =>
        hub.id === hubId ? { ...hub, selected: !hub.selected } : hub
      )
    );
  }

  async recalculateDispatch(): Promise<void> {
    const stops = this.selectedHubs();
    if (stops.length === 0) {
      this.dispatchRoute.set(null);
      this.hubMatrix.set([]);
      return;
    }

    this.routingInProgress.set(true);
    try {
      const [routeResult, matrixRows] = await Promise.all([
        this.telematicsApi.computeDispatchRoute(
          this.depot,
          stops,
          this.optimizeWaypoints()
        ),
        this.telematicsApi.computeHubMatrix(this.depot, stops),
      ]);
      this.dispatchRoute.set(routeResult);
      this.hubMatrix.set(matrixRows);
    } finally {
      this.routingInProgress.set(false);
    }
  }

  async snapActiveVehicleTrace(): Promise<void> {
    const vehicle = this.selectedVehicle();
    if (!vehicle) return;

    this.snappingInProgress.set(true);
    try {
      const summary = await this.telematicsApi.snapGpsTraceToRoads(
        vehicle.id,
        vehicle.rawGpsTrace
      );
      this.roadSnapSummary.set(summary);
    } finally {
      this.snappingInProgress.set(false);
    }
  }

  private async initializeOperationalData(): Promise<void> {
    this.discoveringHubs.set(true);
    try {
      const discoveredHubs = await this.telematicsApi.discoverDallasHubs();
      this.hubs.set(discoveredHubs);
    } finally {
      this.discoveringHubs.set(false);
    }

    await Promise.all([
      this.snapActiveVehicleTrace(),
      this.recalculateDispatch(),
    ]);
  }

  private mountPlaceAutocomplete(
    libs: NonNullable<Awaited<ReturnType<GoogleMapsLoaderService['ensureLoaded']>>>
  ): void {
    const host = this.autocompleteHostRef?.nativeElement;
    if (!host || this.autocompleteElement) return;

    const { PlaceAutocompleteElement } = libs.places;
    const element = new PlaceAutocompleteElement({
      locationBias: {
        center: DALLAS_CENTER,
        radius: 40000,
      },
      includedRegionCodes: ['us'],
      placeholder: 'Search Dallas hub or depot...',
      internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
    });
    element.className = 'gmp-hub-autocomplete';

    const handler = async (event: Event) => {
      const selectEvent = event as google.maps.places.PlacePredictionSelectEvent;
      const prediction = selectEvent?.placePrediction;
      if (!prediction) return;

      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ['id', 'displayName', 'formattedAddress', 'location'],
      });

      if (!place.location) return;
      const newHub: LogisticsHub = {
        id: place.id || `custom-hub-${Date.now()}`,
        name: place.displayName || 'Custom Dallas Stop',
        address: place.formattedAddress || 'Dallas, TX',
        location: {
          lat: place.location.lat(),
          lng: place.location.lng(),
        },
        selected: true,
        source: 'places-autocomplete',
      };

      this.hubs.update((existing) => {
        const alreadyPresent = existing.some((h) => h.id === newHub.id);
        if (alreadyPresent) {
          return existing.map((h) =>
            h.id === newHub.id ? { ...h, selected: true } : h
          );
        }
        return [...existing, newHub];
      });

      this.mapCenter.set(newHub.location);
      this.googleMapInstance?.panTo(newHub.location);
      await this.recalculateDispatch();
    };

    element.addEventListener('gmp-select', handler);
    host.replaceChildren(element);
    this.autocompleteElement = element;
    this.autocompleteListener = handler;
  }

  formatStatusLabel(status: VehicleStatus): string {
    switch (status) {
      case 'EN_ROUTE':
        return 'En Route';
      case 'DELAYED':
        return 'Delayed';
      case 'IDLE':
        return 'Idle';
    }
  }

  formatDuration(ms: number): string {
    if (!ms || ms <= 0) return '—';
    const totalMinutes = Math.round(ms / 60000);
    if (totalMinutes < 60) return `${totalMinutes} min`;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours}h ${mins}m`;
  }

  formatDistance(meters: number): string {
    if (!meters || meters <= 0) return '—';
    const miles = meters / 1609.344;
    return `${miles.toFixed(1)} mi`;
  }

  getMatrixForHub(hubId: string): HubMatrixRow | undefined {
    return this.hubMatrix().find((row) => row.hubId === hubId);
  }

  private createVehicleMarkerDom(
    vehicle: FleetVehicle,
    isSelected: boolean
  ): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'fleet-pin';
    wrapper.style.display = 'inline-flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '6px';
    wrapper.style.padding = '5px 9px';
    wrapper.style.borderRadius = '9999px';
    wrapper.style.fontFamily = 'Inter, system-ui, sans-serif';
    wrapper.style.fontSize = '11px';
    wrapper.style.fontWeight = '700';
    wrapper.style.color = '#ffffff';
    wrapper.style.cursor = 'pointer';
    wrapper.style.whiteSpace = 'nowrap';
    wrapper.style.boxShadow = isSelected
      ? '0 0 0 3px #ffffff, 0 6px 16px rgba(15, 23, 42, 0.35)'
      : '0 3px 10px rgba(15, 23, 42, 0.25)';

    const bg =
      vehicle.status === 'EN_ROUTE'
        ? '#059669'
        : vehicle.status === 'DELAYED'
          ? '#dc2626'
          : '#475569';
    wrapper.style.backgroundColor = bg;
    wrapper.style.border = isSelected
      ? '2px solid #0f172a'
      : '1.5px solid rgba(255,255,255,0.85)';

    const dot = document.createElement('span');
    dot.style.width = '7px';
    dot.style.height = '7px';
    dot.style.borderRadius = '50%';
    dot.style.backgroundColor = '#ffffff';
    dot.style.opacity = vehicle.status === 'IDLE' ? '0.65' : '1';

    const label = document.createElement('span');
    label.textContent = `${vehicle.id} · ${vehicle.speedMph}mph`;

    wrapper.appendChild(dot);
    wrapper.appendChild(label);
    return wrapper;
  }

  private createDepotMarkerDom(name: string): HTMLElement {
    const badge = document.createElement('div');
    badge.title = name;
    badge.style.display = 'flex';
    badge.style.alignItems = 'center';
    badge.style.justifyContent = 'center';
    badge.style.width = '30px';
    badge.style.height = '30px';
    badge.style.borderRadius = '8px';
    badge.style.backgroundColor = '#0f172a';
    badge.style.color = '#ffffff';
    badge.style.border = '2px solid #ffffff';
    badge.style.fontWeight = '800';
    badge.style.fontSize = '13px';
    badge.style.boxShadow = '0 4px 12px rgba(15, 23, 42, 0.35)';
    badge.style.cursor = 'pointer';
    badge.textContent = 'D';
    return badge;
  }

  private createHubMarkerDom(stopNumber: number, name: string): HTMLElement {
    const badge = document.createElement('div');
    badge.title = name;
    badge.style.display = 'flex';
    badge.style.alignItems = 'center';
    badge.style.justifyContent = 'center';
    badge.style.width = '26px';
    badge.style.height = '26px';
    badge.style.borderRadius = '50%';
    badge.style.backgroundColor = '#1d4ed8';
    badge.style.color = '#ffffff';
    badge.style.border = '2px solid #ffffff';
    badge.style.fontWeight = '700';
    badge.style.fontSize = '12px';
    badge.style.boxShadow = '0 4px 10px rgba(29, 78, 216, 0.35)';
    badge.style.cursor = 'pointer';
    badge.textContent = String(stopNumber);
    return badge;
  }
}
