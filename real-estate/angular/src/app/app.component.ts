import {
  AfterViewInit,
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Cluster,
  GoogleMap,
  MapAdvancedMarker,
  MapMarkerClusterer,
  MapPolygon,
  MapPolyline,
  Renderer,
} from '@angular/google-maps';
import { importLibrary } from '@googlemaps/js-api-loader';
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawRenderMode,
  TerraDrawSelectMode,
} from 'terra-draw';
import { TerraDrawGoogleMapsAdapter } from 'terra-draw-google-maps-adapter';
import { SF_LISTINGS } from './data/sf-listings.data';
import {
  CommuteSummary,
  LatLngPoint,
  NearbyAmenity,
  PropertyListing,
  PropertyType,
} from './models/real-estate.models';
import { GoogleMapsService } from './services/google-maps.service';
import { ListingDetailComponent } from './components/listing-detail/listing-detail.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GoogleMap,
    MapAdvancedMarker,
    MapMarkerClusterer,
    MapPolygon,
    MapPolyline,
    ListingDetailComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly mapsService = inject(GoogleMapsService);
  private readonly ngZone = inject(NgZone);

  @ViewChild('locationSearchHost') locationSearchHost?: ElementRef<HTMLDivElement>;
  @ViewChild(GoogleMap) googleMapComp?: GoogleMap;

  // Map & API loading state
  readonly mapsReady = signal(false);
  readonly missingApiKey = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly mapType = signal<'roadmap' | 'hybrid'>('roadmap');

  get googleMapTypeId(): google.maps.MapTypeId {
    return this.mapType() as google.maps.MapTypeId;
  }

  // Filter signals
  readonly maxPriceFilter = signal<number>(0); // 0 = any
  readonly minBedsFilter = signal<number>(0); // 0 = any
  readonly propertyTypeFilter = signal<'ALL' | PropertyType>('ALL');
  readonly drawnSearchPolygon = signal<google.maps.Polygon | null>(null);
  readonly isDrawingArea = signal(false);
  readonly hasDrawnArea = signal(false);
  readonly searchBannerText = signal<string | null>(null);

  // Selection & hover synchronization
  readonly allListings = signal<PropertyListing[]>(SF_LISTINGS);
  readonly selectedListingId = signal<string | null>(null);
  readonly hoveredListingId = signal<string | null>(null);

  // Detail overlays (amenities + commute)
  readonly nearbyAmenities = signal<NearbyAmenity[]>([]);
  readonly commuteSummary = signal<CommuteSummary | null>(null);
  readonly commuteRoutePath = signal<LatLngPoint[]>([]);

  readonly filteredListings = computed(() => {
    const maxPrice = this.maxPriceFilter();
    const minBeds = this.minBedsFilter();
    const propType = this.propertyTypeFilter();
    const poly = this.drawnSearchPolygon();

    return this.allListings().filter((item) => {
      if (maxPrice > 0 && item.price > maxPrice) return false;
      if (minBeds > 0 && item.beds < minBeds) return false;
      if (propType !== 'ALL' && item.propertyType !== propType) return false;
      if (poly && !this.mapsService.isLocationInPolygon({ lat: item.lat, lng: item.lng }, poly)) {
        return false;
      }
      return true;
    });
  });

  readonly selectedListing = computed(() => {
    const id = this.selectedListingId();
    if (!id) return null;
    return this.allListings().find((l) => l.id === id) || null;
  });

  readonly hoveredListing = computed(() => {
    const id = this.hoveredListingId();
    if (!id || id === this.selectedListingId()) return null;
    return this.filteredListings().find((l) => l.id === id) || null;
  });

  readonly mapOptions: google.maps.MapOptions = {
    center: { lat: 37.7749, lng: -122.4194 },
    zoom: 13,
    mapId: 'DEMO_MAP_ID',
    internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    zoomControl: true,
    clickableIcons: false,
  };

  readonly selectedParcelOptions: google.maps.PolygonOptions = {
    strokeColor: '#0f766e',
    strokeOpacity: 0.95,
    strokeWeight: 2.5,
    fillColor: '#14b8a6',
    fillOpacity: 0.26,
    zIndex: 40,
  };

  readonly hoveredParcelOptions: google.maps.PolygonOptions = {
    strokeColor: '#1d4ed8',
    strokeOpacity: 0.85,
    strokeWeight: 2,
    fillColor: '#3b82f6',
    fillOpacity: 0.14,
    zIndex: 30,
  };

  readonly commutePolylineOptions: google.maps.PolylineOptions = {
    strokeColor: '#1d4ed8',
    strokeOpacity: 0.88,
    strokeWeight: 4.5,
    zIndex: 45,
  };

  readonly clusterRenderer: Renderer = {
    render: (cluster: Cluster): google.maps.marker.AdvancedMarkerElement => {
      const badge = document.createElement('div');
      badge.className = 'cluster-pill-marker';
      badge.textContent = String(cluster.count);
      badge.title = `${cluster.count} homes in this area`;

      return new google.maps.marker.AdvancedMarkerElement({
        position: cluster.position,
        content: badge,
        zIndex: 1000 + cluster.count,
      });
    },
  };

  private mapInstance: google.maps.Map | null = null;
  private terraDraw: TerraDraw | null = null;
  private autocompleteMounted = false;
  private readonly markerContentCache = new Map<string, HTMLButtonElement>();
  private readonly amenityContentCache = new Map<string, HTMLDivElement>();
  private workplaceMarkerEl: HTMLDivElement | null = null;

  constructor() {
    // Keep price-pill marker CSS classes synchronized with selected & hovered signals
    effect(() => {
      const selectedId = this.selectedListingId();
      const hoveredId = this.hoveredListingId();
      for (const [id, el] of this.markerContentCache.entries()) {
        el.classList.toggle('is-selected', id === selectedId);
        el.classList.toggle('is-hovered', id === hoveredId && id !== selectedId);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    if (!this.mapsService.hasValidApiKey()) {
      this.missingApiKey.set(true);
      return;
    }

    try {
      const ok = await this.mapsService.ensureLoaded();
      if (!ok) {
        this.missingApiKey.set(true);
        return;
      }
      this.mapsReady.set(true);
      // Wait a microtask for ViewChild host if view already initialized
      queueMicrotask(() => {
        void this.mountPlaceAutocomplete();
      });
    } catch (err) {
      this.loadError.set(
        err instanceof Error ? err.message : 'Failed to load Google Maps JavaScript API.'
      );
    }
  }

  ngAfterViewInit(): void {
    if (this.mapsReady()) {
      void this.mountPlaceAutocomplete();
    }
  }

  ngOnDestroy(): void {
    this.terraDraw?.stop();
    this.terraDraw = null;
  }

  private async mountPlaceAutocomplete(): Promise<void> {
    if (this.autocompleteMounted || !this.locationSearchHost?.nativeElement || !this.mapsReady()) {
      return;
    }
    this.autocompleteMounted = true;

    const { PlaceAutocompleteElement } = await importLibrary('places');
    const autocomplete = new PlaceAutocompleteElement({
      includedRegionCodes: ['us'],
      locationBias: {
        south: 37.703,
        west: -122.527,
        north: 37.815,
        east: -122.348,
      },
      internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
    });
    autocomplete.setAttribute('placeholder', 'Search San Francisco neighborhood or address...');

    autocomplete.addEventListener('gmp-select', (event: Event) => {
      const selectEvent = event as unknown as google.maps.places.PlacePredictionSelectEvent;
      void this.handlePlaceSelect(selectEvent);
    });

    this.locationSearchHost.nativeElement.replaceChildren(autocomplete);
  }

  private async handlePlaceSelect(
    event: google.maps.places.PlacePredictionSelectEvent
  ): Promise<void> {
    const place = event.placePrediction.toPlace();
    await place.fetchFields({
      fields: ['displayName', 'formattedAddress', 'location', 'viewport'],
    });

    this.ngZone.run(() => {
      const label = place.displayName || place.formattedAddress || 'Selected location';
      this.searchBannerText.set(label);
      if (this.mapInstance) {
        if (place.viewport) {
          this.mapInstance.fitBounds(place.viewport);
        } else if (place.location) {
          this.mapInstance.panTo(place.location);
          this.mapInstance.setZoom(15);
        }
      }
    });
  }

  onMapInitialized(map: google.maps.Map): void {
    this.mapInstance = map;
    const initDraw = () => {
      if (!this.terraDraw) {
        this.setupTerraDraw(map);
      }
    };

    if (map.getProjection()) {
      initDraw();
    } else {
      google.maps.event.addListenerOnce(map, 'projection_changed', initDraw);
    }
  }

  private setupTerraDraw(map: google.maps.Map): void {
    const draw = new TerraDraw({
      adapter: new TerraDrawGoogleMapsAdapter({
        map,
        lib: google.maps,
        coordinatePrecision: 9,
      }),
      modes: [
        new TerraDrawPolygonMode({
          editable: true,
          styles: {
            fillColor: '#0f766e',
            fillOpacity: 0.18,
            outlineColor: '#0f766e',
            outlineWidth: 2.5,
            closingPointColor: '#0f766e',
            closingPointWidth: 5,
          },
        }),
        new TerraDrawSelectMode({
          flags: {
            polygon: {
              feature: {
                draggable: true,
                coordinates: {
                  draggable: true,
                  midpoints: true,
                  deletable: true,
                },
              },
            },
          },
        }),
        new TerraDrawRenderMode({
          modeName: 'static',
          styles: {
            polygonFillColor: '#0f766e',
            polygonFillOpacity: 0.15,
            polygonOutlineColor: '#0f766e',
            polygonOutlineWidth: 2.5,
          },
        }),
      ],
    });

    draw.on('finish', () => {
      this.ngZone.run(() => {
        draw.setMode('static');
        this.isDrawingArea.set(false);
        this.applyTerraDrawPolygonFilter();
      });
    });

    draw.on('change', (_ids, type) => {
      if (type === 'update' || type === 'delete') {
        this.ngZone.run(() => {
          this.applyTerraDrawPolygonFilter();
        });
      }
    });

    draw.start();
    draw.setMode('static');
    this.terraDraw = draw;
  }

  startDrawArea(): void {
    if (!this.terraDraw) return;
    if (this.isDrawingArea()) {
      this.terraDraw.setMode('static');
      this.isDrawingArea.set(false);
      return;
    }

    this.terraDraw.clear();
    this.drawnSearchPolygon.set(null);
    this.hasDrawnArea.set(false);
    this.terraDraw.setMode('polygon');
    this.isDrawingArea.set(true);
  }

  clearDrawnArea(): void {
    if (this.terraDraw) {
      this.terraDraw.clear();
      this.terraDraw.setMode('static');
    }
    this.isDrawingArea.set(false);
    this.hasDrawnArea.set(false);
    this.drawnSearchPolygon.set(null);
  }

  private applyTerraDrawPolygonFilter(): void {
    if (!this.terraDraw) return;
    const snapshot = this.terraDraw.getSnapshot();
    const polygonFeature = snapshot.find((f) => f.geometry.type === 'Polygon');

    if (!polygonFeature || polygonFeature.geometry.type !== 'Polygon') {
      this.drawnSearchPolygon.set(null);
      this.hasDrawnArea.set(false);
      return;
    }

    const outerRing = polygonFeature.geometry.coordinates?.[0];
    if (!outerRing || outerRing.length < 3) {
      this.drawnSearchPolygon.set(null);
      this.hasDrawnArea.set(false);
      return;
    }

    const paths = outerRing.map(([lng, lat]) => ({ lat, lng }));
    const poly = new google.maps.Polygon({ paths });
    this.drawnSearchPolygon.set(poly);
    this.hasDrawnArea.set(true);

    // If current selection fell outside drawn polygon, clear selection
    const currentId = this.selectedListingId();
    if (currentId && !this.filteredListings().some((l) => l.id === currentId)) {
      this.closeListingDetail();
    }
  }

  toggleMapType(): void {
    const next = this.mapType() === 'roadmap' ? 'hybrid' : 'roadmap';
    this.mapType.set(next);
    this.mapInstance?.setMapTypeId(next);
  }

  resetLocationView(): void {
    this.searchBannerText.set(null);
    if (this.mapInstance) {
      this.mapInstance.panTo({ lat: 37.7749, lng: -122.4194 });
      this.mapInstance.setZoom(13);
    }
  }

  selectListing(listing: PropertyListing): void {
    this.selectedListingId.set(listing.id);
    this.hoveredListingId.set(null);
    this.commuteSummary.set(null);
    this.commuteRoutePath.set([]);

    if (this.mapInstance) {
      this.mapInstance.panTo({ lat: listing.lat, lng: listing.lng });
      const currentZoom = this.mapInstance.getZoom() ?? 13;
      if (currentZoom < 17) {
        this.mapInstance.setZoom(17);
      }
    }
  }

  closeListingDetail(): void {
    this.selectedListingId.set(null);
    this.nearbyAmenities.set([]);
    this.commuteSummary.set(null);
    this.commuteRoutePath.set([]);
    if (this.mapInstance && !this.hasDrawnArea()) {
      this.mapInstance.panTo({ lat: 37.7749, lng: -122.4194 });
      this.mapInstance.setZoom(13);
    }
  }

  setHoveredListing(id: string | null): void {
    this.hoveredListingId.set(id);
  }

  onAmenitiesUpdated(items: NearbyAmenity[]): void {
    this.nearbyAmenities.set(items);
  }

  onAmenityFocused(amenity: NearbyAmenity): void {
    if (this.mapInstance) {
      this.mapInstance.panTo({ lat: amenity.lat, lng: amenity.lng });
      const currentZoom = this.mapInstance.getZoom() ?? 15;
      if (currentZoom < 15) {
        this.mapInstance.setZoom(15);
      }
    }
  }

  onCommuteUpdated(payload: { summary: CommuteSummary | null; routePath: LatLngPoint[] }): void {
    this.commuteSummary.set(payload.summary);
    this.commuteRoutePath.set(payload.routePath);

    if (this.mapInstance && payload.summary && this.selectedListing()) {
      const bounds = new google.maps.LatLngBounds();
      const home = this.selectedListing()!;
      bounds.extend({ lat: home.lat, lng: home.lng });
      bounds.extend(payload.summary.workplaceLocation);
      this.mapInstance.fitBounds(bounds, 70);
    }
  }

  getMarkerContent(listing: PropertyListing): HTMLElement {
    let pill = this.markerContentCache.get(listing.id);
    if (!pill) {
      pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'price-pill-marker';
      pill.setAttribute('aria-label', `${listing.address}, ${this.formatPrice(listing.price)}`);

      const dot = document.createElement('span');
      dot.className = 'price-pill-dot';

      const text = document.createElement('span');
      text.textContent = this.formatShortPrice(listing.price);

      pill.append(dot, text);

      pill.addEventListener('click', (event) => {
        event.stopPropagation();
        this.ngZone.run(() => this.selectListing(listing));
      });
      pill.addEventListener('mouseenter', () => {
        this.ngZone.run(() => this.setHoveredListing(listing.id));
      });
      pill.addEventListener('mouseleave', () => {
        this.ngZone.run(() => {
          if (this.hoveredListingId() === listing.id) {
            this.setHoveredListing(null);
          }
        });
      });

      this.markerContentCache.set(listing.id, pill);
    }

    pill.classList.toggle('is-selected', this.selectedListingId() === listing.id);
    pill.classList.toggle(
      'is-hovered',
      this.hoveredListingId() === listing.id && this.selectedListingId() !== listing.id
    );
    return pill;
  }

  getMarkerZIndex(listing: PropertyListing): number {
    if (this.selectedListingId() === listing.id) return 900;
    if (this.hoveredListingId() === listing.id) return 800;
    return 100;
  }

  getAmenityMarkerContent(amenity: NearbyAmenity): HTMLElement {
    let badge = this.amenityContentCache.get(amenity.id);
    if (!badge) {
      badge = document.createElement('div');
      badge.className = `amenity-pin-badge cat-${amenity.category}`;
      badge.textContent =
        amenity.category === 'schools' ? 'S' : amenity.category === 'groceries' ? 'G' : 'T';
      badge.title = amenity.name;
      this.amenityContentCache.set(amenity.id, badge);
    }
    return badge;
  }

  getWorkplaceMarkerContent(name: string): HTMLElement {
    if (!this.workplaceMarkerEl) {
      this.workplaceMarkerEl = document.createElement('div');
      this.workplaceMarkerEl.className = 'workplace-pin-badge';
    }
    this.workplaceMarkerEl.textContent = `Work: ${name}`;
    return this.workplaceMarkerEl;
  }

  formatShortPrice(price: number): string {
    if (price >= 1_000_000) {
      const m = price / 1_000_000;
      return `$${Number.isInteger(m) ? m : m.toFixed(2).replace(/0$/, '')}M`;
    }
    return `$${Math.round(price / 1000)}K`;
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  }
}
