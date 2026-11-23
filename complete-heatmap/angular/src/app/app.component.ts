import { CommonModule } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  GoogleMap,
  MapAdvancedMarker,
  MapInfoWindow,
  MapPolygon,
  MapPolyline,
} from '@angular/google-maps';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import {
  FLOOD_HAZARD_ZONES,
  INITIAL_ZOOM,
  MIAMI_CENTER,
  SEED_HAZARD_INCIDENTS,
  SEED_SHELTER_QUERY,
} from './data/miami-hazard-data';
import {
  EmergencyShelter,
  EvacuationRouteSummary,
  FloodZonePolygon,
  HazardIncident,
  HazardType,
  IncidentDraft,
  LatLngLiteral,
  WeatherSnapshot,
} from './models/hazard.models';
import { GoogleMapsLoaderService } from './services/google-maps-loader.service';
import { HazardIntelligenceService } from './services/hazard-intelligence.service';

interface InfoWindowState {
  title: string;
  subtitle: string;
  badgeText: string;
  badgeTone: 'safe' | 'warn' | 'danger' | 'info';
  details: string[];
  shelter?: EmergencyShelter;
}

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
  @ViewChild('googleMapRef') googleMapRef?: GoogleMap;
  @ViewChild('infoWindowRef') infoWindowRef?: MapInfoWindow;

  readonly mapsLoader = inject(GoogleMapsLoaderService);
  private readonly hazardService = inject(HazardIntelligenceService);

  readonly miamiCenter = MIAMI_CENTER;
  readonly initialZoom = INITIAL_ZOOM;
  readonly floodZones: FloodZonePolygon[] = FLOOD_HAZARD_ZONES;
  readonly hazardTypes: HazardType[] = [
    'Flash Flooding',
    'Storm Surge',
    'Downed Power Line',
    'Roadway Obstruction',
    'King Tide Overflow',
  ];

  // Map & Layer Controls
  readonly showHeatmap = signal(true);
  readonly showPolygons = signal(true);
  readonly avoidFlood = signal(true);
  readonly mobileDrawerOpen = signal(true);
  readonly heatmapMode = signal<'deckgl' | 'fallback'>('deckgl');

  // Operational Data
  readonly incidents = signal<HazardIncident[]>([...SEED_HAZARD_INCIDENTS]);
  readonly userSubmittedIncidents = computed(() =>
    this.incidents().filter((inc) => inc.isUserSubmitted)
  );
  readonly headerWeather = signal<WeatherSnapshot | null>(null);
  readonly incidentDraft = signal<IncidentDraft | null>(null);
  readonly selectedHazardType = signal<HazardType>('Flash Flooding');
  readonly incidentNotes = signal('');
  readonly reportStatusMessage = signal<string | null>(null);

  // Shelters & Evacuation Route
  readonly shelterSearchQuery = signal(SEED_SHELTER_QUERY);
  readonly shelters = signal<EmergencyShelter[]>([]);
  readonly isSearchingShelters = signal(false);
  readonly shelterError = signal<string | null>(null);
  readonly selectedShelterId = signal<string | null>(null);
  readonly isComputingRoute = signal(false);
  readonly routeError = signal<string | null>(null);
  readonly activeRoute = signal<EvacuationRouteSummary | null>(null);
  readonly showRouteSteps = signal(false);

  // InfoWindow
  readonly infoState = signal<InfoWindowState | null>(null);
  readonly infoPosition = signal<LatLngLiteral>(MIAMI_CENTER);

  readonly mapOptions: google.maps.MapOptions = {
    center: MIAMI_CENTER,
    zoom: INITIAL_ZOOM,
    mapId: 'DEMO_MAP_ID',
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    clickableIcons: false,
    internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
  } as google.maps.MapOptions;

  readonly routePolylineOptions = computed<google.maps.PolylineOptions>(() => {
    const route = this.activeRoute();
    const crosses = route?.crossesFloodZone ?? false;
    return {
      strokeColor: crosses ? '#f59e0b' : '#38bdf8',
      strokeOpacity: 0.95,
      strokeWeight: 6,
      geodesic: true,
      zIndex: 40,
    };
  });

  private mapInstance: google.maps.Map | null = null;
  private deckOverlay: GoogleMapsOverlay | null = null;
  private fallbackCircles: google.maps.Circle[] = [];
  private draftPinElement: google.maps.marker.PinElement | null = null;
  private readonly shelterPins = new Map<string, google.maps.marker.PinElement>();
  private readonly incidentPins = new Map<string, google.maps.marker.PinElement>();

  async ngOnInit(): Promise<void> {
    try {
      const libs = await this.mapsLoader.ensureLoaded();
      if (!libs) {
        return;
      }

      // Parallel initial load: Miami header weather + emergency shelters
      await Promise.all([
        this.loadHeaderWeather(),
        this.searchShelters(this.shelterSearchQuery(), false),
      ]);
    } catch {
      // Load errors are captured gracefully by GoogleMapsLoaderService signals
    }
  }

  ngOnDestroy(): void {
    this.teardownHeatmapOverlay();
  }

  onMapInitialized(map: google.maps.Map): void {
    this.mapInstance = map;
    this.initHeatmapOverlay(map);
  }

  async onMapClick(
    event: google.maps.MapMouseEvent | google.maps.IconMouseEvent
  ): Promise<void> {
    if (!event.latLng) return;

    const location: LatLngLiteral = {
      lat: Math.round(event.latLng.lat() * 1e6) / 1e6,
      lng: Math.round(event.latLng.lng() * 1e6) / 1e6,
    };

    this.reportStatusMessage.set(null);
    this.incidentDraft.set({
      location,
      address: 'Resolving street address...',
      elevationMeters: null,
      weather: null,
      isLoadingEnrichment: true,
    });

    const [address, elevationMeters, weather] = await Promise.all([
      this.hazardService.reverseGeocode(location),
      this.hazardService.fetchElevation(location),
      this.hazardService.fetchCurrentWeather(location),
    ]);

    this.incidentDraft.set({
      location,
      address,
      elevationMeters,
      weather,
      isLoadingEnrichment: false,
    });
  }

  submitIncidentReport(): void {
    const draft = this.incidentDraft();
    if (!draft) return;

    const weather = draft.weather;
    const windSummary =
      weather && weather.windSpeedKmh !== null
        ? `${weather.windSpeedKmh} km/h ${weather.windDirection}`
        : 'Wind N/A';
    const precipitationSummary =
      weather && weather.precipQpfMm !== null
        ? `${weather.precipQpfMm} mm/hr (${weather.precipProbability ?? 0}%)`
        : 'Precip N/A';

    const newIncident: HazardIncident = {
      id: `user-inc-${Date.now()}`,
      lat: draft.location.lat,
      lng: draft.location.lng,
      weight: 10,
      type: this.selectedHazardType(),
      address: draft.address,
      elevationMeters: draft.elevationMeters,
      windSummary,
      precipitationSummary,
      reportedAt: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      notes: this.incidentNotes().trim() || undefined,
      isUserSubmitted: true,
    };

    this.incidents.update((prev) => [newIncident, ...prev]);
    this.incidentNotes.set('');
    this.reportStatusMessage.set(
      `Logged ${newIncident.type} report at ${newIncident.address}. Heatmap updated.`
    );
    this.syncHeatmapOverlay();
  }

  toggleHeatmapLayer(): void {
    this.showHeatmap.update((v) => !v);
    this.syncHeatmapOverlay();
  }

  toggleFloodPolygons(): void {
    this.showPolygons.update((v) => !v);
  }

  async toggleAvoidFlood(): Promise<void> {
    this.avoidFlood.update((v) => !v);
    const current = this.activeRoute();
    if (current) {
      await this.routeToShelter(current.destination);
    }
  }

  async onFindSafeShelter(): Promise<void> {
    this.mobileDrawerOpen.set(true);
    let list = this.shelters();
    if (list.length === 0) {
      await this.searchShelters(this.shelterSearchQuery(), false);
      list = this.shelters();
    }
    if (list.length > 0) {
      await this.routeToShelter(list[0]);
    }
  }

  async searchShelters(query?: string, routeFirst = false): Promise<void> {
    const searchStr = (query ?? this.shelterSearchQuery()).trim();
    if (!searchStr) return;

    this.isSearchingShelters.set(true);
    this.shelterError.set(null);

    const origin = this.incidentDraft()?.location ?? MIAMI_CENTER;
    try {
      const results = await this.hazardService.searchEmergencyShelters(
        searchStr,
        origin
      );
      this.shelters.set(results);
      if (results.length === 0) {
        this.shelterError.set('No shelters matched that search near Miami.');
      } else if (routeFirst) {
        await this.routeToShelter(results[0]);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to search emergency shelters.';
      this.shelterError.set(msg);
    } finally {
      this.isSearchingShelters.set(false);
    }
  }

  async routeToShelter(shelter: EmergencyShelter): Promise<void> {
    this.selectedShelterId.set(shelter.id);
    this.isComputingRoute.set(true);
    this.routeError.set(null);

    const draft = this.incidentDraft();
    const origin = draft?.location ?? MIAMI_CENTER;
    const originLabel = draft ? draft.address : 'Downtown Miami Civic Center';

    try {
      const route = await this.hazardService.computeEvacuationRoute(
        origin,
        originLabel,
        shelter,
        this.floodZones,
        this.avoidFlood()
      );

      if (!route) {
        this.routeError.set('No drivable evacuation route was returned.');
        return;
      }

      this.activeRoute.set(route);
      this.fitMapToRoute(route);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to compute evacuation route.';
      this.routeError.set(msg);
    } finally {
      this.isComputingRoute.set(false);
    }
  }

  getPolygonOptions(zone: FloodZonePolygon): google.maps.PolygonOptions {
    return {
      strokeColor: zone.strokeColor,
      strokeOpacity: 0.9,
      strokeWeight: 2,
      fillColor: zone.strokeColor,
      fillOpacity: zone.severity === 'HIGH' ? 0.28 : 0.22,
      clickable: true,
      zIndex: 10,
    };
  }

  getDraftPin(): google.maps.marker.PinElement | null {
    const libs = this.mapsLoader.getLibrariesSync();
    if (!libs) return null;
    if (!this.draftPinElement) {
      this.draftPinElement = new libs.marker.PinElement({
        background: '#38bdf8',
        borderColor: '#0f172a',
        glyphColor: '#0f172a',
        glyphText: '!',
        scale: 1.15,
      });
    }
    return this.draftPinElement;
  }

  getShelterPin(shelter: EmergencyShelter): google.maps.marker.PinElement | null {
    const libs = this.mapsLoader.getLibrariesSync();
    if (!libs) return null;

    const isSelected = this.selectedShelterId() === shelter.id;
    const cacheKey = `${shelter.id}-${isSelected ? 'sel' : 'base'}`;
    let pin = this.shelterPins.get(cacheKey);
    if (!pin) {
      const isHospital = shelter.types.some((t) =>
        t.toLowerCase().includes('hospital')
      );
      pin = new libs.marker.PinElement({
        background: isSelected ? '#10b981' : '#059669',
        borderColor: '#ecfdf5',
        glyphColor: '#ffffff',
        glyphText: isHospital ? 'H' : 'S',
        scale: isSelected ? 1.25 : 1.0,
      });
      this.shelterPins.set(cacheKey, pin);
    }
    return pin;
  }

  getIncidentPin(incident: HazardIncident): google.maps.marker.PinElement | null {
    const libs = this.mapsLoader.getLibrariesSync();
    if (!libs) return null;

    let pin = this.incidentPins.get(incident.id);
    if (!pin) {
      pin = new libs.marker.PinElement({
        background: '#ef4444',
        borderColor: '#fef2f2',
        glyphColor: '#ffffff',
        glyphText: '▲',
        scale: 0.95,
      });
      this.incidentPins.set(incident.id, pin);
    }
    return pin;
  }

  openShelterInfo(
    shelter: EmergencyShelter,
    markerRef: MapAdvancedMarker
  ): void {
    const ratingLine =
      shelter.rating !== undefined
        ? `Rating: ${shelter.rating.toFixed(1)} (${shelter.userRatingCount ?? 0} reviews)`
        : 'Emergency Shelter / Medical Facility';
    const distanceLine =
      shelter.distanceMeters !== undefined
        ? `Straight-line distance: ${(shelter.distanceMeters / 1000).toFixed(2)} km`
        : '';

    this.infoState.set({
      title: shelter.name,
      subtitle: shelter.address,
      badgeText: shelter.businessStatus === 'OPERATIONAL' ? 'OPERATIONAL' : 'SHELTER',
      badgeTone: 'safe',
      details: [ratingLine, distanceLine].filter(Boolean),
      shelter,
    });
    this.infoPosition.set(shelter.location);
    this.infoWindowRef?.open(markerRef);
  }

  openIncidentInfo(
    incident: HazardIncident,
    markerRef: MapAdvancedMarker
  ): void {
    this.infoState.set({
      title: incident.type,
      subtitle: incident.address,
      badgeText: `REPORTED ${incident.reportedAt}`,
      badgeTone: 'danger',
      details: [
        incident.elevationMeters !== null
          ? `Elevation: ${incident.elevationMeters.toFixed(1)} m`
          : 'Elevation: N/A',
        `Conditions: ${incident.windSummary} • ${incident.precipitationSummary}`,
        incident.notes ? `Notes: ${incident.notes}` : '',
      ].filter(Boolean),
    });
    this.infoPosition.set({ lat: incident.lat, lng: incident.lng });
    this.infoWindowRef?.open(markerRef);
  }

  openFloodZoneInfo(
    zone: FloodZonePolygon,
    event: google.maps.PolyMouseEvent
  ): void {
    const clickPos: LatLngLiteral = event.latLng
      ? { lat: event.latLng.lat(), lng: event.latLng.lng() }
      : zone.paths[0];

    this.infoState.set({
      title: zone.name,
      subtitle: 'Active Flood-Hazard Polygon',
      badgeText: `${zone.severity} RISK`,
      badgeTone: zone.severity === 'HIGH' ? 'danger' : 'warn',
      details: [zone.advisory],
    });
    this.infoPosition.set(clickPos);
    this.infoWindowRef?.open();
  }

  formatDistanceKm(meters?: number): string {
    if (meters === undefined) return '';
    return `${(meters / 1000).toFixed(1)} km`;
  }

  private async loadHeaderWeather(): Promise<void> {
    const weather = await this.hazardService.fetchCurrentWeather(MIAMI_CENTER);
    this.headerWeather.set(weather);
  }

  private fitMapToRoute(route: EvacuationRouteSummary): void {
    const libs = this.mapsLoader.getLibrariesSync();
    if (!libs || !this.mapInstance) return;

    const bounds = new libs.core.LatLngBounds();
    bounds.extend(route.origin);
    bounds.extend(route.destination.location);
    for (const pt of route.path) {
      bounds.extend(pt);
    }
    this.mapInstance.fitBounds(bounds, { top: 64, right: 64, bottom: 64, left: 64 });
  }

  private detectWebGL2Support(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2', {
        failIfMajorPerformanceCaveat: false,
      });
      return Boolean(gl);
    } catch {
      return false;
    }
  }

  private createHeatmapLayer(): HeatmapLayer<HazardIncident> {
    return new HeatmapLayer<HazardIncident>({
      id: 'miami-hazard-heatmap',
      data: this.incidents(),
      getPosition: (d) => [d.lng, d.lat],
      getWeight: (d) => d.weight,
      radiusPixels: 42,
      intensity: 1.35,
      threshold: 0.05,
      visible: this.showHeatmap(),
      colorRange: [
        [254, 240, 138, 120],
        [253, 186, 116, 170],
        [249, 115, 22, 200],
        [239, 68, 68, 225],
        [185, 28, 28, 245],
      ],
    });
  }

  private initHeatmapOverlay(map: google.maps.Map): void {
    if (!this.detectWebGL2Support()) {
      this.activateFallbackHeatmap();
      return;
    }

    try {
      this.deckOverlay = new GoogleMapsOverlay({
        interleaved: false,
        layers: [this.createHeatmapLayer()],
        onError: () => {
          this.activateFallbackHeatmap();
        },
      });
      this.deckOverlay.setMap(map);
      this.heatmapMode.set('deckgl');
    } catch {
      this.activateFallbackHeatmap();
    }
  }

  private syncHeatmapOverlay(): void {
    if (this.heatmapMode() === 'deckgl' && this.deckOverlay) {
      try {
        this.deckOverlay.setProps({
          layers: [this.createHeatmapLayer()],
        });
      } catch {
        this.activateFallbackHeatmap();
      }
      return;
    }

    this.renderFallbackCircles();
  }

  private activateFallbackHeatmap(): void {
    if (this.deckOverlay) {
      try {
        this.deckOverlay.setMap(null);
        this.deckOverlay.finalize();
      } catch {
        // Ignore teardown errors
      }
      this.deckOverlay = null;
    }
    this.heatmapMode.set('fallback');
    this.renderFallbackCircles();
  }

  private renderFallbackCircles(): void {
    for (const circle of this.fallbackCircles) {
      circle.setMap(null);
    }
    this.fallbackCircles = [];

    const libs = this.mapsLoader.getLibrariesSync();
    if (!libs || !this.mapInstance || !this.showHeatmap()) {
      return;
    }

    for (const inc of this.incidents()) {
      const circle = new libs.maps.Circle({
        map: this.mapInstance,
        center: { lat: inc.lat, lng: inc.lng },
        radius: 140 + inc.weight * 25,
        strokeWeight: 0,
        fillColor: inc.weight >= 8 ? '#ef4444' : '#f97316',
        fillOpacity: 0.24,
        clickable: false,
        zIndex: 5,
      });
      this.fallbackCircles.push(circle);
    }
  }

  private teardownHeatmapOverlay(): void {
    if (this.deckOverlay) {
      try {
        this.deckOverlay.setMap(null);
        this.deckOverlay.finalize();
      } catch {
        // Ignore teardown errors
      }
      this.deckOverlay = null;
    }
    for (const circle of this.fallbackCircles) {
      circle.setMap(null);
    }
    this.fallbackCircles = [];
  }
}
