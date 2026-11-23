import {
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  GoogleMap,
  MapAdvancedMarker,
  MapInfoWindow,
  MapPolygon,
  MapPolyline,
} from '@angular/google-maps';
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
  type GeoJSONStoreFeatures,
} from 'terra-draw';
import { TerraDrawGoogleMapsAdapter } from 'terra-draw-google-maps-adapter';

import {
  AUSTIN_CENTER,
  INITIAL_MAP_ZOOM,
  PRE_SEEDED_GEOFENCES,
  SEED_SEARCH_QUERY,
  WORKER_GPS_PRESETS,
} from './data/austin-seed.data';
import {
  AttendanceLogEntry,
  AuditSite,
  DrawMode,
  GeofenceZone,
  WorkerPreset,
} from './models/workforce.models';
import {
  GoogleMapsService,
  INTERNAL_USAGE_ATTRIBUTION_IDS,
} from './services/google-maps.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GoogleMap,
    MapAdvancedMarker,
    MapPolygon,
    MapPolyline,
    MapInfoWindow,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild(GoogleMap) googleMapComp?: GoogleMap;
  @ViewChild('stopInfoWindow') stopInfoWindow?: MapInfoWindow;

  readonly initialCenter: google.maps.LatLngLiteral = AUSTIN_CENTER;
  readonly initialZoom = INITIAL_MAP_ZOOM;
  readonly workerPresets: WorkerPreset[] = WORKER_GPS_PRESETS;
  readonly preSeededGeofences: GeofenceZone[] = PRE_SEEDED_GEOFENCES;

  readonly mapOptions: google.maps.MapOptions = {
    mapId: 'DEMO_MAP_ID',
    internalUsageAttributionIds: INTERNAL_USAGE_ATTRIBUTION_IDS,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    clickableIcons: false,
    gestureHandling: 'greedy',
  };

  readonly routePolylineOptions: google.maps.PolylineOptions = {
    strokeColor: '#1a73e8',
    strokeOpacity: 0.9,
    strokeWeight: 5,
    geodesic: true,
    zIndex: 40,
  };

  // Core readiness & error state
  readonly mapsReady = signal(false);
  readonly apiKeyMissing = signal(false);
  readonly statusMessage = signal<string | null>(null);

  // Worker GPS & Geofence attendance state
  readonly selectedPresetId = signal<string>(WORKER_GPS_PRESETS[0].id);
  readonly workerPosition = signal<google.maps.LatLngLiteral>(
    WORKER_GPS_PRESETS[0].position
  );
  readonly workerAddress = signal<string>('Resolving street address...');
  readonly isGeocoding = signal(false);
  readonly matchedGeofence = signal<GeofenceZone | null>(null);
  readonly isInsideGeofence = computed(() => this.matchedGeofence() !== null);
  readonly attendanceLogs = signal<AttendanceLogEntry[]>([]);
  readonly workerPinContent = signal<google.maps.marker.PinElement | null>(null);

  // Terra Draw & Geofence zones
  readonly drawMode = signal<DrawMode>('static');
  readonly terraDrawReady = signal(false);
  readonly drawnGeofences = signal<GeofenceZone[]>([]);
  readonly allGeofences = computed<GeofenceZone[]>(() => [
    ...this.preSeededGeofences,
    ...this.drawnGeofences(),
  ]);

  // Multi-stop Audit Router state
  searchQuery = SEED_SEARCH_QUERY;
  readonly isSearchingSites = signal(false);
  readonly isComputingRoute = signal(false);
  readonly auditStops = signal<AuditSite[]>([]);
  readonly selectedStop = signal<AuditSite | null>(null);
  readonly routePolylinePath = signal<google.maps.LatLngLiteral[]>([]);
  readonly totalDistanceMeters = signal(0);
  readonly totalDurationMillis = signal(0);

  // Derived summaries
  readonly formattedRouteDistance = computed(() => {
    const meters = this.totalDistanceMeters();
    if (!meters) return '--';
    const miles = meters / 1609.344;
    const km = meters / 1000;
    return `${miles.toFixed(1)} mi (${km.toFixed(1)} km)`;
  });

  readonly formattedRouteDuration = computed(() => {
    const ms = this.totalDurationMillis();
    if (!ms) return '--';
    const totalMinutes = Math.max(1, Math.round(ms / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
  });

  private mapInstance: google.maps.Map | null = null;
  private terraDraw: TerraDraw | null = null;
  private idleListener: google.maps.MapsEventListener | null = null;

  constructor(
    private readonly mapsService: GoogleMapsService,
    private readonly ngZone: NgZone
  ) {}

  async ngOnInit(): Promise<void> {
    if (!this.mapsService.hasApiKey()) {
      this.apiKeyMissing.set(true);
      this.workerAddress.set(
        `${this.workerPosition().lat.toFixed(5)}, ${this.workerPosition().lng.toFixed(5)} (API key required for live geocoding)`
      );
      return;
    }

    try {
      await this.mapsService.ensureLoaded();
      this.ngZone.run(() => {
        this.mapsReady.set(true);
        this.evaluateWorkerGeofence();
      });
    } catch (error) {
      console.error('Google Maps initialization error:', error);
      this.ngZone.run(() => {
        this.statusMessage.set(
          'Unable to load Google Maps JavaScript API. Verify your GOOGLE_MAPS_API_KEY.'
        );
      });
    }
  }

  ngOnDestroy(): void {
    if (this.idleListener) {
      this.idleListener.remove();
      this.idleListener = null;
    }
    if (this.terraDraw) {
      try {
        this.terraDraw.stop();
      } catch {
        // Ignore teardown errors when map DOM is already unmounted
      }
      this.terraDraw = null;
    }
  }

  onMapInitialized(map: google.maps.Map): void {
    this.mapInstance = map;
    this.evaluateWorkerGeofence();

    // Initialize Terra Draw once map DOM and projection are ready
    this.idleListener = google.maps.event.addListenerOnce(map, 'idle', () => {
      this.ngZone.run(() => {
        this.initTerraDraw(map);
      });
    });

    // Trigger initial live GMP workflows
    void this.reverseGeocodeWorkerPosition(this.workerPosition());
    void this.loadSitesAndComputeRoute(this.searchQuery);
  }

  private initTerraDraw(map: google.maps.Map): void {
    if (this.terraDraw) {
      return;
    }

    try {
      const adapter = new TerraDrawGoogleMapsAdapter({
        map,
        lib: google.maps,
        coordinatePrecision: 9,
        isolatedData: true,
      });

      const draw = new TerraDraw({
        adapter,
        modes: [
          new TerraDrawPolygonMode({
            styles: {
              fillColor: '#0d9488',
              fillOpacity: 0.25,
              outlineColor: '#0f766e',
              outlineWidth: 2,
              closingPointColor: '#ffffff',
              closingPointOutlineColor: '#0f766e',
              closingPointWidth: 5,
              closingPointOutlineWidth: 2,
            },
          }),
          new TerraDrawSelectMode({
            flags: {
              polygon: {
                feature: {
                  draggable: true,
                  rotateable: true,
                  coordinates: {
                    midpoints: true,
                    draggable: true,
                    deletable: true,
                  },
                },
              },
            },
          }),
        ],
      });

      draw.on('ready', () => {
        this.ngZone.run(() => {
          this.terraDrawReady.set(true);
          const currentMode = this.drawMode();
          if (currentMode !== 'static') {
            draw.setMode(currentMode);
          }
        });
      });

      draw.on('change', () => {
        this.ngZone.run(() => {
          this.syncDrawnGeofences();
        });
      });

      draw.on('finish', () => {
        this.ngZone.run(() => {
          this.syncDrawnGeofences();
          this.setDrawMode('select');
        });
      });

      draw.start();
      this.terraDraw = draw;
    } catch (error) {
      console.warn('Terra Draw initialization deferred or failed:', error);
    }
  }

  private syncDrawnGeofences(): void {
    if (!this.terraDraw) {
      return;
    }

    const snapshot: GeoJSONStoreFeatures[] = this.terraDraw.getSnapshot();
    const polygonFeatures = snapshot.filter(
      (feature) =>
        feature.geometry.type === 'Polygon' &&
        !feature.properties['currentlyDrawing'] &&
        Array.isArray(feature.geometry.coordinates[0]) &&
        feature.geometry.coordinates[0].length >= 4
    );

    const mapped: GeofenceZone[] = polygonFeatures.map((feature, idx) => {
      const ring = feature.geometry.coordinates[0] as number[][];
      // Exclude closing vertex when storing LatLngLiteral path
      const openRing =
        ring.length > 3 ? ring.slice(0, ring.length - 1) : ring;
      const paths: google.maps.LatLngLiteral[] = openRing.map(([lng, lat]) => ({
        lat,
        lng,
      }));

      return {
        id: `drawn-${String(feature.id ?? idx + 1)}`,
        name: `Supervisor Custom Zone #${idx + 1}`,
        description: `Drawn via Terra Draw (${paths.length} vertices)`,
        source: 'drawn',
        paths,
        color: '#0d9488',
        vertexCount: paths.length,
      };
    });

    this.drawnGeofences.set(mapped);
    this.evaluateWorkerGeofence();
  }

  setDrawMode(mode: DrawMode): void {
    this.drawMode.set(mode);
    if (this.terraDraw && this.terraDrawReady()) {
      try {
        this.terraDraw.setMode(mode);
      } catch (error) {
        console.warn('Unable to switch Terra Draw mode:', error);
      }
    }
  }

  clearDrawnGeofences(): void {
    if (this.terraDraw && this.terraDrawReady()) {
      this.terraDraw.clear();
      this.terraDraw.setMode('static');
    }
    this.drawMode.set('static');
    this.drawnGeofences.set([]);
    this.evaluateWorkerGeofence();
  }

  getPolygonOptions(zone: GeofenceZone): google.maps.PolygonOptions {
    const isMatched = this.matchedGeofence()?.id === zone.id;
    return {
      fillColor: isMatched ? '#10b981' : zone.color,
      fillOpacity: isMatched ? 0.28 : 0.16,
      strokeColor: isMatched ? '#047857' : zone.color,
      strokeOpacity: 0.92,
      strokeWeight: isMatched ? 3 : 2,
      clickable: true,
      zIndex: isMatched ? 20 : 10,
    };
  }

  focusGeofence(zone: GeofenceZone): void {
    if (!this.mapInstance || zone.paths.length === 0) {
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    for (const point of zone.paths) {
      bounds.extend(point);
    }
    this.mapInstance.fitBounds(bounds, 60);
  }

  onWorkerPresetChange(presetId: string): void {
    const preset = this.workerPresets.find((p) => p.id === presetId);
    if (!preset) {
      return;
    }

    this.selectedPresetId.set(preset.id);
    this.workerPosition.set(preset.position);
    this.evaluateWorkerGeofence();

    if (this.mapInstance) {
      this.mapInstance.panTo(preset.position);
    }

    if (this.mapsReady()) {
      void this.reverseGeocodeWorkerPosition(preset.position);
      if (this.auditStops().length > 0) {
        void this.recomputeRouteWithStops(this.auditStops());
      }
    }
  }

  evaluateWorkerGeofence(): void {
    const pos = this.workerPosition();
    let activeMatch: GeofenceZone | null = null;

    if (this.mapsReady()) {
      for (const zone of this.allGeofences()) {
        if (this.mapsService.isPointInPolygon(pos, zone.paths)) {
          activeMatch = zone;
          break;
        }
      }
    }

    this.matchedGeofence.set(activeMatch);
    if (this.mapsReady()) {
      this.workerPinContent.set(
        this.mapsService.createWorkerPin(activeMatch !== null)
      );
    }
  }

  async reverseGeocodeWorkerPosition(
    position: google.maps.LatLngLiteral
  ): Promise<void> {
    if (!this.mapsReady()) {
      return;
    }
    this.isGeocoding.set(true);
    try {
      const address = await this.mapsService.reverseGeocode(position);
      this.ngZone.run(() => {
        this.workerAddress.set(address);
      });
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      this.ngZone.run(() => {
        this.workerAddress.set(
          `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)} (Austin, TX)`
        );
      });
    } finally {
      this.ngZone.run(() => {
        this.isGeocoding.set(false);
      });
    }
  }

  recordVerifiedClockIn(): void {
    const zone = this.matchedGeofence();
    if (!zone) {
      return;
    }

    const preset = this.workerPresets.find(
      (p) => p.id === this.selectedPresetId()
    );
    const entry: AttendanceLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      presetLabel: preset?.label ?? 'Field Worker',
      zoneName: zone.name,
      address: this.workerAddress(),
      coordinates: this.workerPosition(),
    };

    this.attendanceLogs.update((logs) => [entry, ...logs.slice(0, 4)]);
  }

  async onSearchAuditSites(): Promise<void> {
    if (!this.mapsReady()) {
      return;
    }
    await this.loadSitesAndComputeRoute(this.searchQuery);
  }

  async onOptimizeRoute(): Promise<void> {
    if (!this.mapsReady() || this.auditStops().length === 0) {
      return;
    }
    await this.recomputeRouteWithStops(this.auditStops());
  }

  private async loadSitesAndComputeRoute(query: string): Promise<void> {
    this.isSearchingSites.set(true);
    this.statusMessage.set(null);

    try {
      const sites = await this.mapsService.searchAuditSites(query, AUSTIN_CENTER);
      this.ngZone.run(() => {
        if (sites.length === 0) {
          this.auditStops.set([]);
          this.routePolylinePath.set([]);
          this.totalDistanceMeters.set(0);
          this.totalDurationMillis.set(0);
          this.statusMessage.set(
            `No audit sites found in Austin for "${query}". Try another retail query.`
          );
        }
      });

      if (sites.length > 0) {
        await this.recomputeRouteWithStops(sites);
      }
    } catch (error) {
      console.warn('Places Text Search failed:', error);
      this.ngZone.run(() => {
        this.statusMessage.set(
          'Places Text Search could not complete. Ensure Places API (New) is enabled on your API key.'
        );
      });
    } finally {
      this.ngZone.run(() => {
        this.isSearchingSites.set(false);
      });
    }
  }

  private async recomputeRouteWithStops(sites: AuditSite[]): Promise<void> {
    this.isComputingRoute.set(true);
    try {
      const result = await this.mapsService.computeOptimizedAuditRoute(
        this.workerPosition(),
        sites
      );

      this.ngZone.run(() => {
        this.auditStops.set(result.orderedStops);
        this.routePolylinePath.set(result.polylinePath);
        this.totalDistanceMeters.set(result.totalDistanceMeters);
        this.totalDurationMillis.set(result.totalDurationMillis);

        if (this.mapInstance && result.viewport) {
          this.mapInstance.fitBounds(result.viewport, 64);
        }
      });
    } catch (error) {
      console.warn('Route computation failed:', error);
      this.ngZone.run(() => {
        // Still display numbered markers even if Routes API quota/key fails
        const fallbackStops = sites.map((site, idx) => ({
          ...site,
          orderIndex: idx + 1,
          pinContent: this.mapsService.createStopPin(idx + 1, false),
        }));
        this.auditStops.set(fallbackStops);
        this.statusMessage.set(
          'Route optimization could not complete. Ensure Routes API is enabled on your API key.'
        );
      });
    } finally {
      this.ngZone.run(() => {
        this.isComputingRoute.set(false);
      });
    }
  }

  focusAuditStop(stop: AuditSite): void {
    this.selectedStop.set(stop);
    if (this.mapInstance) {
      this.mapInstance.panTo(stop.location);
      this.mapInstance.setZoom(14);
    }
  }

  openStopInfo(stop: AuditSite, markerRef: MapAdvancedMarker): void {
    this.selectedStop.set(stop);
    if (this.mapInstance) {
      this.mapInstance.panTo(stop.location);
    }
    this.stopInfoWindow?.open(markerRef);
  }

  formatLegMetrics(stop: AuditSite): string {
    const parts: string[] = [];
    if (typeof stop.legDistanceMeters === 'number') {
      parts.push(`${(stop.legDistanceMeters / 1609.344).toFixed(1)} mi`);
    }
    if (typeof stop.legDurationMillis === 'number') {
      const mins = Math.max(1, Math.round(stop.legDurationMillis / 60000));
      parts.push(`${mins} min drive`);
    }
    return parts.join(' • ');
  }

  trackByZoneId(_index: number, zone: GeofenceZone): string {
    return zone.id;
  }

  trackByStopId(_index: number, stop: AuditSite): string {
    return `${stop.id}-${stop.orderIndex}`;
  }

  trackByLogId(_index: number, log: AttendanceLogEntry): string {
    return log.id;
  }
}
