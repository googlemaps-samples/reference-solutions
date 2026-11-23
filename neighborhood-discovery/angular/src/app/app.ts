import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  GoogleMap,
  MapAdvancedMarker,
  MapCircle,
} from '@angular/google-maps';
import { ComparisonPanelComponent } from './components/comparison-panel.component';
import { DetailsDrawerComponent } from './components/details-drawer.component';
import { HeaderBarComponent } from './components/header-bar.component';
import { PlacesSidebarComponent } from './components/places-sidebar.component';
import {
  CategoryFilter,
  CommunitySpot,
  DiscoveredPlace,
  GMP_ATTRIBUTION_ID,
  LONDON_NEIGHBORHOOD_PRESETS,
  MAX_COMPARISON_ITEMS,
  NeighborhoodPreset,
  PlaceCategory,
  ReverseGeocodeInspection,
  SEARCH_RADIUS_METERS,
} from './models/neighborhood.models';
import { GoogleMapsLoaderService } from './services/google-maps-loader.service';
import { NeighborhoodDiscoveryService } from './services/neighborhood-discovery.service';

const INITIAL_PRESET = LONDON_NEIGHBORHOOD_PRESETS[0];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    GoogleMap,
    MapAdvancedMarker,
    MapCircle,
    HeaderBarComponent,
    PlacesSidebarComponent,
    DetailsDrawerComponent,
    ComparisonPanelComponent,
  ],
  template: `
    <app-header-bar
      [mapsReady]="mapsLoader.ready()"
      [isBusy]="placesLoading() || reverseGeocodeLoading()"
      [activePresetId]="activePresetId()"
      [activeNeighborhoodLabel]="activeNeighborhoodLabel()"
      [searchCenter]="searchCenter()"
      [showRadiusCircle]="showRadiusCircle()"
      [comparisonCount]="comparedPlaces().length"
      [comparisonOpen]="comparisonOpen()"
      (placeSelected)="onAutocompleteSelect($event)"
      (geocodeRequested)="onGeocodeRequested($event)"
      (presetSelected)="onPresetSelected($event)"
      (toggleRadius)="toggleRadiusCircle()"
      (toggleComparison)="toggleComparisonPanel()"
    />

    <main class="workspace-shell">
      <app-places-sidebar
        [places]="filteredPlaces()"
        [communitySpots]="communitySpots()"
        [activeCategory]="activeCategory()"
        [activeNeighborhoodLabel]="activeNeighborhoodLabel()"
        [selectedPlaceId]="selectedPlace()?.id ?? null"
        [comparisonIds]="comparisonIds()"
        [loading]="placesLoading()"
        (categoryChange)="onCategoryChange($event)"
        (inspectPlace)="onSelectPlace($event)"
        (toggleCompare)="onToggleCompare($event)"
        (inspectCommunitySpot)="onSelectCommunitySpot($event)"
      />

      <section class="map-stage" aria-label="Interactive Central London Map">
        <div id="map-canvas" data-testid="map-canvas" class="map-canvas">
          @if (mapsLoader.ready()) {
            <google-map
              height="100%"
              width="100%"
              mapId="DEMO_MAP_ID"
              [center]="mapCenter()"
              [zoom]="mapZoom()"
              [options]="mapOptions"
              (mapClick)="onMapClick($event)"
              (mapInitialized)="onMapInitialized($event)"
            >
              @if (showRadiusCircle()) {
                <map-circle
                  [center]="searchCenter()"
                  [radius]="radiusMeters"
                  [options]="circleOptions"
                />
              }

              @for (place of filteredPlaces(); track place.id) {
                <map-advanced-marker
                  [position]="place.location"
                  [title]="place.displayName"
                  [content]="place.pin"
                  [zIndex]="getMarkerZIndex(place.id)"
                  (mapClick)="onSelectPlace(place)"
                />
              }

              @for (spot of communitySpots(); track spot.id) {
                <map-advanced-marker
                  [position]="spot.location"
                  [title]="spot.name"
                  [content]="spot.pin"
                  [zIndex]="350"
                  (mapClick)="onSelectCommunitySpot(spot)"
                />
              }

              @if (reverseGeocode(); as geo) {
                <map-advanced-marker
                  [position]="geo.location"
                  title="Inspected Map Location"
                  [content]="geo.pin"
                  [zIndex]="600"
                />
              }
            </google-map>
          } @else if (mapsLoader.error()) {
            <div class="map-status-overlay">
              <div class="status-card">
                <h2>Google Maps API Key Required</h2>
                <p>{{ mapsLoader.error() }}</p>
                <p class="status-steps">
                  Create <code>.env</code> from <code>.env.example</code> and set
                  <code>GOOGLE_MAPS_API_KEY</code> (a free zero-billing Maps Demo
                  Key works for prototyping).
                </p>
              </div>
            </div>
          } @else {
            <div class="map-status-overlay">
              <div class="status-card">
                <h2>Loading Central London Map...</h2>
                <p>Initializing Maps JavaScript API, Places (New), and Geocoding.</p>
              </div>
            </div>
          }

          @if (statusBanner()) {
            <div class="map-toast" role="status">{{ statusBanner() }}</div>
          }
        </div>

        <app-details-drawer
          [selectedPlace]="selectedPlace()"
          [selectedCommunitySpot]="selectedCommunitySpot()"
          [reverseGeocode]="reverseGeocode()"
          [detailsLoading]="detailsLoading()"
          [isCompared]="isSelectedPlaceCompared()"
          [comparisonCount]="comparedPlaces().length"
          (closeDrawer)="closeDetailsDrawer()"
          (toggleCompare)="onToggleCompare($event)"
          (saveCommunitySpot)="onSaveCommunitySpot($event)"
        />

        <app-comparison-panel
          [open]="comparisonOpen()"
          [places]="comparedPlaces()"
          (closePanel)="comparisonOpen.set(false)"
          (clearAll)="clearComparison()"
          (removePlace)="removeFromComparison($event)"
          (inspectPlace)="onSelectPlace($event)"
        />
      </section>
    </main>
  `,
  styles: [
    `
      .workspace-shell {
        flex: 1;
        display: flex;
        min-height: 0;
        height: calc(100vh - 64px);
        position: relative;
      }

      .map-stage {
        flex: 1;
        position: relative;
        min-width: 0;
        height: 100%;
        min-height: 540px;
      }

      .map-canvas {
        width: 100%;
        height: 100%;
        min-height: 540px;
        position: relative;
        background: #e2e8f0;
      }

      .map-status-overlay {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 24px;
        background: #f1f5f9;
      }

      .status-card {
        max-width: 460px;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 14px;
        padding: 22px;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
      }

      .status-card h2 {
        margin: 0 0 8px;
        font-size: 18px;
        color: #0f172a;
      }

      .status-card p {
        margin: 0 0 8px;
        font-size: 13.5px;
        line-height: 1.5;
        color: #475569;
      }

      .status-steps {
        margin-bottom: 0 !important;
        font-size: 12.5px !important;
        color: #334155 !important;
      }

      .map-toast {
        position: absolute;
        top: 14px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(15, 23, 42, 0.92);
        color: #f8fafc;
        padding: 8px 14px;
        border-radius: 999px;
        font-size: 12.5px;
        font-weight: 600;
        z-index: 22;
        box-shadow: 0 8px 20px rgba(15, 23, 42, 0.2);
      }

      @media (max-width: 960px) {
        .workspace-shell {
          flex-direction: column;
          height: auto;
        }
        .map-stage,
        .map-canvas {
          height: 560px;
          min-height: 540px;
          order: 1;
        }
      }
    `,
  ],
})
export class App implements OnInit {
  readonly mapsLoader = inject(GoogleMapsLoaderService);
  private readonly discovery = inject(NeighborhoodDiscoveryService);

  readonly radiusMeters = SEARCH_RADIUS_METERS;

  readonly mapOptions: google.maps.MapOptions = {
    mapId: 'DEMO_MAP_ID',
    internalUsageAttributionIds: [GMP_ATTRIBUTION_ID],
    clickableIcons: false,
    mapTypeControl: false,
    streetViewControl: true,
    fullscreenControl: true,
    zoomControl: true,
  };

  readonly circleOptions: google.maps.CircleOptions = {
    strokeColor: '#0284c7',
    strokeOpacity: 0.78,
    strokeWeight: 2,
    fillColor: '#38bdf8',
    fillOpacity: 0.08,
    clickable: false,
  };

  readonly activePresetId = signal(INITIAL_PRESET.id);
  readonly activeNeighborhoodLabel = signal(INITIAL_PRESET.label);
  readonly searchCenter = signal<google.maps.LatLngLiteral>(
    INITIAL_PRESET.center,
  );
  readonly mapCenter = signal<google.maps.LatLngLiteral>(INITIAL_PRESET.center);
  readonly mapZoom = signal<number>(13);
  readonly showRadiusCircle = signal<boolean>(true);

  readonly activeCategory = signal<CategoryFilter>('all');
  readonly allPlaces = signal<DiscoveredPlace[]>([]);
  readonly placesLoading = signal<boolean>(false);

  readonly selectedPlace = signal<DiscoveredPlace | null>(null);
  readonly detailsLoading = signal<boolean>(false);

  readonly reverseGeocode = signal<ReverseGeocodeInspection | null>(null);
  readonly reverseGeocodeLoading = signal<boolean>(false);

  readonly communitySpots = signal<CommunitySpot[]>([]);
  readonly selectedCommunitySpot = signal<CommunitySpot | null>(null);

  readonly comparedPlaces = signal<DiscoveredPlace[]>([]);
  readonly comparisonOpen = signal<boolean>(false);

  readonly statusBanner = signal<string | null>(null);

  readonly filteredPlaces = computed(() => {
    const filter = this.activeCategory();
    const list = this.allPlaces();
    if (filter === 'all') {
      return list;
    }
    return list.filter((place) => place.category === filter);
  });

  readonly comparisonIds = computed(() =>
    this.comparedPlaces().map((place) => place.id),
  );

  readonly isSelectedPlaceCompared = computed(() => {
    const current = this.selectedPlace();
    return current ? this.comparisonIds().includes(current.id) : false;
  });

  private googleMapInstance: google.maps.Map | null = null;
  private toastTimeout: ReturnType<typeof setTimeout> | null = null;

  async ngOnInit(): Promise<void> {
    const libs = await this.mapsLoader.ensureLoaded();
    if (libs) {
      await this.loadPlacesForCenter(INITIAL_PRESET.center, 'all');
    }
  }

  onMapInitialized(map: google.maps.Map): void {
    this.googleMapInstance = map;
  }

  async onPresetSelected(preset: NeighborhoodPreset): Promise<void> {
    this.activePresetId.set(preset.id);
    this.activeNeighborhoodLabel.set(preset.label);
    this.searchCenter.set(preset.center);
    this.mapCenter.set(preset.center);
    this.mapZoom.set(13);
    this.googleMapInstance?.panTo(preset.center);
    this.closeDetailsDrawer();
    await this.loadPlacesForCenter(preset.center, this.activeCategory());
  }

  async onAutocompleteSelect(
    prediction: google.maps.places.PlacePrediction,
  ): Promise<void> {
    try {
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ['id', 'displayName', 'formattedAddress', 'location'],
      });
      if (!place.location) {
        this.showToast('Selected place did not include coordinates.');
        return;
      }
      const nextCenter = {
        lat: place.location.lat(),
        lng: place.location.lng(),
      };
      const label =
        place.displayName || place.formattedAddress || 'Selected Location';
      this.activePresetId.set('');
      this.activeNeighborhoodLabel.set(label);
      this.searchCenter.set(nextCenter);
      this.mapCenter.set(nextCenter);
      this.mapZoom.set(14);
      this.googleMapInstance?.panTo(nextCenter);
      this.closeDetailsDrawer();
      await this.loadPlacesForCenter(nextCenter, this.activeCategory());
    } catch {
      this.showToast('Could not load details for the selected location.');
    }
  }

  async onGeocodeRequested(query: string): Promise<void> {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    this.placesLoading.set(true);
    try {
      const geo = await this.discovery.forwardGeocodeAddress(trimmed);
      if (geo) {
        this.activePresetId.set('');
        this.activeNeighborhoodLabel.set(geo.label);
        this.searchCenter.set(geo.location);
        this.mapCenter.set(geo.location);
        this.mapZoom.set(14);
        this.googleMapInstance?.panTo(geo.location);
        this.closeDetailsDrawer();
        await this.loadPlacesForCenter(geo.location, this.activeCategory());
        this.showToast(`Centered on ${geo.formattedAddress}`);
        return;
      }

      const textResults = await this.discovery.searchPlacesByText(
        trimmed,
        this.searchCenter(),
      );
      if (textResults.length > 0) {
        this.allPlaces.set(textResults);
        this.syncPinStyles();
        this.showToast(`Found ${textResults.length} places for "${trimmed}"`);
      } else {
        this.showToast(`No results found for "${trimmed}".`);
      }
    } catch {
      this.showToast('Geocoding request failed. Try another London address.');
    } finally {
      this.placesLoading.set(false);
    }
  }

  async onCategoryChange(category: CategoryFilter): Promise<void> {
    this.activeCategory.set(category);
    await this.loadPlacesForCenter(this.searchCenter(), category);
  }

  async onSelectPlace(place: DiscoveredPlace): Promise<void> {
    this.reverseGeocode.set(null);
    this.selectedCommunitySpot.set(null);
    this.selectedPlace.set(place);
    this.syncPinStyles();

    this.googleMapInstance?.panTo(place.location);

    if (place.detailsLoaded) {
      return;
    }

    this.detailsLoading.set(true);
    try {
      const enriched = await this.discovery.fetchPlaceDetails(place);
      this.allPlaces.update((items) =>
        items.map((item) => (item.id === enriched.id ? enriched : item)),
      );
      this.comparedPlaces.update((items) =>
        items.map((item) => (item.id === enriched.id ? enriched : item)),
      );
      if (this.selectedPlace()?.id === enriched.id) {
        this.selectedPlace.set(enriched);
      }
    } catch {
      this.showToast('Loaded summary; full reviews could not be fetched.');
    } finally {
      this.detailsLoading.set(false);
    }
  }

  onSelectCommunitySpot(spot: CommunitySpot): void {
    this.selectedPlace.set(null);
    this.reverseGeocode.set(null);
    this.selectedCommunitySpot.set(spot);
    this.syncPinStyles();
    this.googleMapInstance?.panTo(spot.location);
  }

  async onMapClick(
    event: google.maps.MapMouseEvent | google.maps.IconMouseEvent,
  ): Promise<void> {
    if (!event.latLng) {
      return;
    }
    const coords = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng(),
    };
    this.selectedPlace.set(null);
    this.selectedCommunitySpot.set(null);
    this.syncPinStyles();
    this.reverseGeocodeLoading.set(true);

    try {
      const result = await this.discovery.reverseGeocodeLocation(coords);
      if (result) {
        this.reverseGeocode.set(result);
      }
    } catch {
      this.showToast('Reverse geocoding failed for that point.');
    } finally {
      this.reverseGeocodeLoading.set(false);
    }
  }

  async onSaveCommunitySpot(payload: {
    name: string;
    note: string;
    category: PlaceCategory;
    geo: ReverseGeocodeInspection;
  }): Promise<void> {
    const spot = await this.discovery.createCommunitySpot({
      name: payload.name,
      note: payload.note,
      category: payload.category,
      address: payload.geo.formattedAddress,
      placeId: payload.geo.placeId,
      location: payload.geo.location,
    });
    if (!spot) {
      return;
    }
    this.communitySpots.update((list) => [spot, ...list]);
    this.reverseGeocode.set(null);
    this.selectedCommunitySpot.set(spot);
    this.showToast(`Pinned community spot: ${spot.name}`);
  }

  onToggleCompare(place: DiscoveredPlace): void {
    const current = this.comparedPlaces();
    const exists = current.some((item) => item.id === place.id);
    if (exists) {
      this.comparedPlaces.set(current.filter((item) => item.id !== place.id));
    } else if (current.length < MAX_COMPARISON_ITEMS) {
      this.comparedPlaces.set([...current, place]);
      this.comparisonOpen.set(true);
    } else {
      this.showToast('Comparison supports up to 3 places at a time.');
    }
    this.syncPinStyles();
  }

  removeFromComparison(placeId: string): void {
    this.comparedPlaces.update((items) =>
      items.filter((item) => item.id !== placeId),
    );
    this.syncPinStyles();
  }

  clearComparison(): void {
    this.comparedPlaces.set([]);
    this.syncPinStyles();
  }

  toggleRadiusCircle(): void {
    this.showRadiusCircle.update((v) => !v);
  }

  toggleComparisonPanel(): void {
    this.comparisonOpen.update((v) => !v);
  }

  closeDetailsDrawer(): void {
    this.selectedPlace.set(null);
    this.selectedCommunitySpot.set(null);
    this.reverseGeocode.set(null);
    this.syncPinStyles();
  }

  getMarkerZIndex(placeId: string): number {
    if (this.selectedPlace()?.id === placeId) {
      return 500;
    }
    if (this.comparisonIds().includes(placeId)) {
      return 300;
    }
    return 20;
  }

  private async loadPlacesForCenter(
    center: google.maps.LatLngLiteral,
    category: CategoryFilter,
  ): Promise<void> {
    this.placesLoading.set(true);
    try {
      const results = await this.discovery.searchNearbyPlaces(center, category);
      this.allPlaces.set(results);
      this.syncPinStyles();
    } catch {
      this.showToast('Unable to load nearby places. Check API key quotas.');
    } finally {
      this.placesLoading.set(false);
    }
  }

  private syncPinStyles(): void {
    const selectedId = this.selectedPlace()?.id ?? null;
    const compared = new Set(this.comparisonIds());
    for (const place of this.allPlaces()) {
      this.discovery.updatePinSelectionStyle(
        place,
        place.id === selectedId,
        compared.has(place.id),
      );
    }
  }

  private showToast(message: string): void {
    this.statusBanner.set(message);
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = setTimeout(() => {
      this.statusBanner.set(null);
    }, 3500);
  }
}
