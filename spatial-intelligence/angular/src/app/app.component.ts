import { CommonModule } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { GoogleMap, MapAdvancedMarker } from '@angular/google-maps';
import type { GoogleMapsOverlay } from '@deck.gl/google-maps';
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
} from 'terra-draw';
import { TerraDrawGoogleMapsAdapter } from 'terra-draw-google-maps-adapter';

import {
  NYC_CENTER,
  NYC_DEFAULT_ZOOM,
  NYC_DISTRICTS_GEOJSON,
  buildDistrictSummaries,
  generateNycSensors,
} from './data/nyc-spatial-data';
import {
  BasemapType,
  CivicHubPlace,
  DeckGlLayerMode,
  DistrictSummary,
  ElevationProfileSummary,
  TerraDrawToolMode,
  ZoneAnalyticsSummary,
} from './models/gis.models';
import { MapsLoaderService } from './services/maps-loader.service';
import { SpatialGisService } from './services/spatial-gis.service';
import {
  computePolygonAreaKm2,
  isPointInPolygon,
  samplePolygonPoints,
} from './utils/spatial-math';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, GoogleMap, MapAdvancedMarker],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly mapsLoader = inject(MapsLoaderService);
  private readonly spatialGis = inject(SpatialGisService);
  private readonly ngZone = inject(NgZone);

  @ViewChild('autocompleteHost', { static: false })
  private autocompleteHostRef?: ElementRef<HTMLDivElement>;

  readonly center: google.maps.LatLngLiteral = NYC_CENTER;
  readonly zoom = NYC_DEFAULT_ZOOM;
  readonly basemapOptions: BasemapType[] = ['roadmap', 'satellite', 'hybrid', 'terrain'];

  readonly allSensors = generateNycSensors(2400);
  readonly districts: DistrictSummary[] = buildDistrictSummaries(this.allSensors);

  readonly hasApiKey = signal(false);
  readonly mapsReady = signal(false);
  readonly mapsError = signal<string | null>(null);
  readonly webglNotice = signal<string | null>(null);

  readonly activeBasemap = signal<BasemapType>('roadmap');
  readonly deckGlMode = signal<DeckGlLayerMode>('scatterplot');
  readonly geoJsonVisible = signal(true);
  readonly terraDrawMode = signal<TerraDrawToolMode>('static');
  readonly terraDrawReady = signal(false);

  readonly selectedDistrictId = signal<string | null>(null);
  readonly customZoneRing = signal<[number, number][] | null>(null);

  readonly elevationProfile = signal<ElevationProfileSummary | null>(null);
  readonly elevationLoading = signal(false);
  readonly elevationError = signal<string | null>(null);

  readonly civicHubs = signal<CivicHubPlace[]>([]);
  readonly civicHubsLoading = signal(false);
  readonly civicHubsError = signal<string | null>(null);
  readonly activeHubId = signal<string | null>(null);
  readonly searchedPlace = signal<CivicHubPlace | null>(null);

  readonly mapOptions: google.maps.MapOptions = {
    mapId: 'DEMO_MAP_ID',
    internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
    clickableIcons: false,
    streetViewControl: false,
    fullscreenControl: false,
    mapTypeControl: false,
    zoomControl: true,
  };

  readonly selectedDistrict = computed<DistrictSummary | null>(() => {
    const id = this.selectedDistrictId();
    return id ? this.districts.find((d) => d.id === id) ?? null : null;
  });

  readonly zoneAnalytics = computed<ZoneAnalyticsSummary>(() => {
    const customRing = this.customZoneRing();
    if (customRing && customRing.length >= 3) {
      const inside = this.allSensors.filter((s) =>
        isPointInPolygon(s.lng, s.lat, customRing)
      );
      const count = inside.length;
      const avgLoadPct =
        count > 0
          ? Math.round(
              (inside.reduce((sum, s) => sum + s.loadPct, 0) / count) * 10
            ) / 10
          : 0;
      const peakLoadPct =
        count > 0 ? Math.max(...inside.map((s) => s.loadPct)) : 0;
      const totalCapacityMw =
        Math.round(
          (inside.reduce((sum, s) => sum + s.capacityKw, 0) / 1000) * 10
        ) / 10;

      return {
        scope: 'custom',
        scopeLabel: 'Custom Terra Draw Zone',
        sensorCount: count,
        avgLoadPct,
        peakLoadPct,
        totalCapacityMw,
        areaKm2: computePolygonAreaKm2(customRing),
        activeRing: customRing,
      };
    }

    const district = this.selectedDistrict();
    if (district) {
      const inside = this.allSensors.filter((s) => s.districtId === district.id);
      const totalCapacityMw = district.capacityMw;
      return {
        scope: 'district',
        scopeLabel: `District: ${district.name}`,
        sensorCount: inside.length,
        avgLoadPct: district.avgLoadPct,
        peakLoadPct: district.peakLoadPct,
        totalCapacityMw,
        areaKm2: district.areaKm2,
        activeRing: district.ring,
      };
    }

    const totalAreaKm2 =
      Math.round(
        this.districts.reduce((sum, d) => sum + d.areaKm2, 0) * 100
      ) / 100;
    const totalCapacityMw = this.districts.reduce((sum, d) => sum + d.capacityMw, 0);
    const avgLoadPct =
      Math.round(
        (this.allSensors.reduce((sum, s) => sum + s.loadPct, 0) /
          this.allSensors.length) *
          10
      ) / 10;
    const peakLoadPct = Math.max(...this.allSensors.map((s) => s.loadPct));

    return {
      scope: 'citywide',
      scopeLabel: 'Citywide Baseline (8 NYC Districts)',
      sensorCount: this.allSensors.length,
      avgLoadPct,
      peakLoadPct,
      totalCapacityMw,
      areaKm2: totalAreaKm2,
      activeRing: null,
    };
  });

  private mapInstance: google.maps.Map | null = null;
  private deckOverlay: GoogleMapsOverlay | null = null;
  private terraDraw: TerraDraw | null = null;
  private dataClickListener: google.maps.MapsEventListener | null = null;
  private projectionListener: google.maps.MapsEventListener | null = null;
  private autocompleteElement: google.maps.places.PlaceAutocompleteElement | null = null;
  private readonly markerPinCache = new Map<string, HTMLElement>();
  private searchPinElement: HTMLElement | null = null;

  async ngOnInit(): Promise<void> {
    const keyPresent = this.mapsLoader.hasValidApiKey();
    this.hasApiKey.set(keyPresent);

    if (!keyPresent) {
      return;
    }

    try {
      await this.mapsLoader.loadLibraries();
      this.mapsReady.set(true);
      await Promise.all([
        this.loadCivicHubs(),
        this.mountAutocompleteElement(),
      ]);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to initialize Google Maps JS API.';
      this.mapsError.set(msg);
    }
  }

  ngOnDestroy(): void {
    this.dataClickListener?.remove();
    this.projectionListener?.remove();
    if (this.terraDraw) {
      try {
        this.terraDraw.stop();
      } catch {
        // Ignore teardown race if map is already removed
      }
      this.terraDraw = null;
    }
    if (this.deckOverlay) {
      try {
        this.deckOverlay.setMap(null);
        this.deckOverlay.finalize();
      } catch {
        // Ignore teardown errors
      }
      this.deckOverlay = null;
    }
  }

  onMapInitialized(map: google.maps.Map): void {
    this.mapInstance = map;
    map.setMapTypeId(this.activeBasemap());
    this.setupGeoJsonLayer(map);
    this.setupDeckGlOverlay(map);
    this.setupTerraDrawWhenReady(map);
    void this.sampleElevationForCurrentScope();
  }

  setBasemap(type: BasemapType): void {
    this.activeBasemap.set(type);
    if (this.mapInstance) {
      this.mapInstance.setMapTypeId(type);
    }
  }

  setDeckGlMode(mode: DeckGlLayerMode): void {
    this.deckGlMode.set(mode);
    this.refreshDeckGlLayers();
  }

  toggleGeoJsonLayer(): void {
    const next = !this.geoJsonVisible();
    this.geoJsonVisible.set(next);
    if (this.mapInstance) {
      this.mapInstance.data.setMap(next ? this.mapInstance : null);
    }
  }

  selectDistrict(district: DistrictSummary): void {
    this.customZoneRing.set(null);
    if (this.terraDraw && this.terraDrawReady()) {
      this.terraDraw.clear();
      this.terraDraw.setMode('static');
      this.terraDrawMode.set('static');
    }

    this.selectedDistrictId.set(district.id);
    this.refreshDistrictStyles();
    this.refreshDeckGlLayers();

    if (this.mapInstance) {
      const bounds = new google.maps.LatLngBounds();
      for (const [lng, lat] of district.ring) {
        bounds.extend({ lat, lng });
      }
      this.mapInstance.fitBounds(bounds, 48);
    }

    void this.sampleElevationForCurrentScope();
  }

  resetToCitywide(): void {
    this.selectedDistrictId.set(null);
    this.customZoneRing.set(null);
    if (this.terraDraw && this.terraDrawReady()) {
      this.terraDraw.clear();
      this.terraDraw.setMode('static');
      this.terraDrawMode.set('static');
    }
    this.refreshDistrictStyles();
    this.refreshDeckGlLayers();

    if (this.mapInstance) {
      this.mapInstance.panTo(NYC_CENTER);
      this.mapInstance.setZoom(NYC_DEFAULT_ZOOM);
    }

    void this.sampleElevationForCurrentScope();
  }

  setTerraDrawMode(mode: 'polygon' | 'select'): void {
    this.terraDrawMode.set(mode);
    this.refreshDistrictStyles();
    if (this.terraDraw && this.terraDrawReady()) {
      this.terraDraw.setMode(mode);
    }
  }

  clearTerraDrawZone(): void {
    this.customZoneRing.set(null);
    this.terraDrawMode.set('static');
    this.refreshDistrictStyles();
    if (this.terraDraw && this.terraDrawReady()) {
      this.terraDraw.clear();
      this.terraDraw.setMode('static');
    }
    this.refreshDeckGlLayers();
    void this.sampleElevationForCurrentScope();
  }

  selectCivicHub(hub: CivicHubPlace): void {
    this.activeHubId.set(hub.id);
    if (this.mapInstance) {
      this.mapInstance.panTo(hub.location);
      this.mapInstance.setZoom(15);
    }
  }

  async sampleElevationForCurrentScope(): Promise<void> {
    if (!this.hasApiKey() || !this.mapsReady()) return;

    this.elevationLoading.set(true);
    this.elevationError.set(null);

    const analytics = this.zoneAnalytics();
    let sampleCoords: google.maps.LatLngLiteral[];
    let sourceLabel = analytics.scopeLabel;

    if (analytics.activeRing && analytics.activeRing.length >= 3) {
      sampleCoords = samplePolygonPoints(analytics.activeRing, 10);
    } else {
      sourceLabel = 'NYC District Centroids';
      sampleCoords = this.districts.map((d) => d.centroid);
    }

    const { summary, error } = await this.spatialGis.sampleTerrainElevation(
      sampleCoords,
      sourceLabel
    );

    this.elevationLoading.set(false);
    if (summary) {
      this.elevationProfile.set(summary);
    }
    if (error) {
      this.elevationError.set(error);
    }
  }

  getHubPinElement(hub: CivicHubPlace, index: number): HTMLElement {
    const cacheKey = `${hub.id}-${this.activeHubId() === hub.id ? 'active' : 'idle'}`;
    const cached = this.markerPinCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const isActive = this.activeHubId() === hub.id;
    const el = document.createElement('div');
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.width = isActive ? '30px' : '24px';
    el.style.height = isActive ? '30px' : '24px';
    el.style.borderRadius = '999px';
    el.style.background = isActive ? '#38bdf8' : '#0f172a';
    el.style.color = isActive ? '#0f172a' : '#38bdf8';
    el.style.border = `2px solid ${isActive ? '#ffffff' : '#38bdf8'}`;
    el.style.fontSize = '11px';
    el.style.fontWeight = '700';
    el.style.boxShadow = '0 4px 12px rgba(2, 6, 23, 0.55)';
    el.style.cursor = 'pointer';
    el.textContent = String(index + 1);

    this.markerPinCache.set(cacheKey, el);
    return el;
  }

  getSearchPinElement(): HTMLElement {
    if (this.searchPinElement) {
      return this.searchPinElement;
    }
    const el = document.createElement('div');
    el.style.width = '18px';
    el.style.height = '18px';
    el.style.borderRadius = '999px';
    el.style.background = '#10b981';
    el.style.border = '3px solid #ecfdf5';
    el.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.65)';
    this.searchPinElement = el;
    return el;
  }

  capacityTierClass(capacityPct: number): string {
    if (capacityPct >= 85) return 'tier-critical';
    if (capacityPct >= 70) return 'tier-elevated';
    return 'tier-nominal';
  }

  private async loadCivicHubs(): Promise<void> {
    this.civicHubsLoading.set(true);
    this.civicHubsError.set(null);
    const { places, error } = await this.spatialGis.fetchCivicReferenceHubs(
      'New York City civic transit hub'
    );
    this.civicHubsLoading.set(false);
    this.civicHubs.set(places);
    if (error) {
      this.civicHubsError.set(error);
    }
  }

  private async mountAutocompleteElement(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    const host = this.autocompleteHostRef?.nativeElement;
    if (!host || this.autocompleteElement) return;

    try {
      const { places } = await this.mapsLoader.loadLibraries();
      const autocomplete = new places.PlaceAutocompleteElement({
        includedRegionCodes: ['us'],
        internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
        locationBias: {
          north: 40.92,
          south: 40.48,
          east: -73.7,
          west: -74.26,
        },
        placeholder: 'Jump to NYC address or landmark…',
      });

      autocomplete.addEventListener('gmp-select', async (event: Event) => {
        const selectEvent = event as google.maps.places.PlacePredictionSelectEvent;
        const prediction = selectEvent.placePrediction;
        if (!prediction) return;

        const place = prediction.toPlace();
        await place.fetchFields({
          fields: ['id', 'displayName', 'formattedAddress', 'location', 'viewport'],
        });

        this.ngZone.run(() => {
          if (!place.location) return;
          const loc: google.maps.LatLngLiteral = {
            lat: place.location.lat(),
            lng: place.location.lng(),
          };
          this.searchedPlace.set({
            id: place.id,
            displayName: place.displayName ?? 'Selected Location',
            formattedAddress: place.formattedAddress ?? 'New York, NY',
            location: loc,
            types: ['selected'],
          });

          if (this.mapInstance) {
            if (place.viewport) {
              this.mapInstance.fitBounds(place.viewport);
            } else {
              this.mapInstance.panTo(loc);
              this.mapInstance.setZoom(15);
            }
          }
        });
      });

      host.replaceChildren(autocomplete);
      this.autocompleteElement = autocomplete;
    } catch {
      // Non-fatal if autocomplete element fails to mount
    }
  }

  private setupGeoJsonLayer(map: google.maps.Map): void {
    map.data.addGeoJson(NYC_DISTRICTS_GEOJSON);
    this.refreshDistrictStyles();

    this.dataClickListener = map.data.addListener(
      'click',
      (event: google.maps.Data.MouseEvent) => {
        if (this.terraDrawMode() !== 'static') return;
        const featureId = event.feature.getProperty('id');
        if (typeof featureId !== 'string') return;
        const match = this.districts.find((d) => d.id === featureId);
        if (!match) return;
        this.ngZone.run(() => {
          this.selectDistrict(match);
        });
      }
    );
  }

  private refreshDistrictStyles(): void {
    if (!this.mapInstance) return;
    const activeId = this.selectedDistrictId();
    const isDrawing = this.terraDrawMode() !== 'static';

    this.mapInstance.data.setStyle((feature) => {
      const id = String(feature.getProperty('id') || '');
      const capacityPct = Number(feature.getProperty('capacityPct') || 0);
      const isSelected = activeId === id;

      let fillColor = '#10b981';
      let strokeColor = '#34d399';
      if (capacityPct >= 85) {
        fillColor = '#f43f5e';
        strokeColor = '#fb7185';
      } else if (capacityPct >= 70) {
        fillColor = '#f59e0b';
        strokeColor = '#fbbf24';
      }

      return {
        clickable: !isDrawing,
        fillColor,
        fillOpacity: isSelected ? 0.36 : 0.16,
        strokeColor: isSelected ? '#38bdf8' : strokeColor,
        strokeWeight: isSelected ? 3 : 1.5,
        strokeOpacity: isSelected ? 1 : 0.78,
        zIndex: isSelected ? 10 : 1,
      };
    });
  }

  private setupDeckGlOverlay(map: google.maps.Map): void {
    this.deckOverlay = this.spatialGis.createDeckOverlay(map, (reason) => {
      this.ngZone.run(() => {
        this.webglNotice.set(reason);
      });
    });
    this.refreshDeckGlLayers();
  }

  private refreshDeckGlLayers(): void {
    if (!this.deckOverlay) return;
    const analytics = this.zoneAnalytics();
    const layers = this.spatialGis.buildDeckLayers(
      this.deckGlMode(),
      this.allSensors,
      analytics.activeRing
    );
    try {
      this.deckOverlay.setProps({ layers });
    } catch (err) {
      const reason =
        err instanceof Error ? err.message : 'Unable to update deck.gl layer props.';
      this.webglNotice.set(reason);
    }
  }

  private setupTerraDrawWhenReady(map: google.maps.Map): void {
    if (map.getProjection()) {
      this.initTerraDraw(map);
      return;
    }
    this.projectionListener = google.maps.event.addListenerOnce(
      map,
      'projection_changed',
      () => {
        this.initTerraDraw(map);
      }
    );
  }

  private initTerraDraw(map: google.maps.Map): void {
    if (this.terraDraw) return;

    const draw = new TerraDraw({
      adapter: new TerraDrawGoogleMapsAdapter({
        map,
        lib: google.maps,
        coordinatePrecision: 9,
        isolatedData: true,
      }),
      modes: [
        new TerraDrawPolygonMode({
          editable: true,
          styles: {
            fillColor: '#38bdf8',
            fillOpacity: 0.22,
            outlineColor: '#0284c7',
            outlineWidth: 2,
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

    draw.on('finish', (finishedId) => {
      const snapshot = draw.getSnapshot();
      const staleIds = snapshot
        .filter((f) => f.id !== finishedId)
        .map((f) => f.id)
        .filter((id): id is string | number => id !== undefined);
      if (staleIds.length > 0) {
        draw.removeFeatures(staleIds);
      }
      this.syncTerraDrawZoneFromSnapshot(draw);
    });

    draw.on('change', (_ids, type) => {
      if (type === 'update' || type === 'delete') {
        this.syncTerraDrawZoneFromSnapshot(draw);
      }
    });

    draw.start();
    this.terraDraw = draw;
    this.ngZone.run(() => {
      this.terraDrawReady.set(true);
    });
  }

  private syncTerraDrawZoneFromSnapshot(draw: TerraDraw): void {
    const polygons = draw
      .getSnapshot()
      .filter((f) => f.geometry.type === 'Polygon');
    const latest = polygons[polygons.length - 1];

    this.ngZone.run(() => {
      if (!latest || latest.geometry.type !== 'Polygon') {
        this.customZoneRing.set(null);
      } else {
        const ring = latest.geometry.coordinates[0] as [number, number][];
        this.selectedDistrictId.set(null);
        this.customZoneRing.set(ring);
        this.refreshDistrictStyles();
      }
      this.refreshDeckGlLayers();
      void this.sampleElevationForCurrentScope();
    });
  }
}
