import { CommonModule } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GoogleMap, MapAdvancedMarker } from '@angular/google-maps';
import {
  ActiveDispatchRoute,
  CategoryFilter,
  RadiusKm,
  ServiceProviderItem,
} from './models/dispatch.models';
import {
  ATTRIBUTION_ID,
  GoogleMapsService,
  SEATTLE_CENTER,
} from './services/google-maps.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, GoogleMap, MapAdvancedMarker],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('autocompleteContainer')
  autocompleteContainerRef?: ElementRef<HTMLDivElement>;

  @ViewChild('googleMapComponent')
  googleMapComponent?: GoogleMap;

  mapsReady = false;
  missingKey = false;
  initError = '';

  driverLocation: google.maps.LatLngLiteral = { ...SEATTLE_CENTER };
  driverAddress = 'Downtown Seattle, WA (47.6062, -122.3321)';
  mapCenter: google.maps.LatLngLiteral = { ...SEATTLE_CENTER };
  mapZoom = 12;

  mapOptions: google.maps.MapOptions = {
    mapId: 'DEMO_MAP_ID',
    internalUsageAttributionIds: [ATTRIBUTION_ID],
    clickableIcons: false,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true,
    zoomControl: true,
  };

  radiusKm: RadiusKm = 10;
  readonly radiusOptions: RadiusKm[] = [5, 10, 15];
  categoryFilter: CategoryFilter = 'all';

  providers: ServiceProviderItem[] = [];
  selectedProviderId: string | null = null;
  activeRoute: ActiveDispatchRoute | null = null;
  stepsExpanded = true;

  loadingProviders = false;
  loadingRoute = false;
  statusError = '';

  driverPin: google.maps.marker.PinElement | null = null;
  private providerPins = new Map<string, google.maps.marker.PinElement>();
  private providerMarkerElements = new Map<
    string,
    google.maps.marker.AdvancedMarkerElement
  >();

  private mapInstance: google.maps.Map | null = null;
  private driverMarkerElement: google.maps.marker.AdvancedMarkerElement | null = null;
  private searchCircle: google.maps.Circle | null = null;
  private routePolylines: google.maps.Polyline[] = [];
  private infoWindow: google.maps.InfoWindow | null = null;
  private autocompleteElement: google.maps.places.PlaceAutocompleteElement | null =
    null;
  private searchSeq = 0;
  private routeSeq = 0;

  constructor(
    private readonly mapsService: GoogleMapsService,
    private readonly ngZone: NgZone,
  ) {}

  async ngOnInit(): Promise<void> {
    if (!this.mapsService.hasApiKey()) {
      this.missingKey = true;
      return;
    }

    try {
      await this.mapsService.ensureLoaded();
      this.driverPin = this.mapsService.createDriverPinElement();
      this.mapsReady = true;

      // Mount PlaceAutocompleteElement once view renders #autocomplete-container
      queueMicrotask(() => {
        void this.mountAutocomplete();
      });

      await this.refreshAroundDriver(false);
    } catch (err) {
      this.initError =
        err instanceof Error
          ? err.message
          : 'Failed to load Google Maps JavaScript API.';
    }
  }

  ngOnDestroy(): void {
    this.clearRouteOverlays();
    if (this.searchCircle) {
      this.searchCircle.setMap(null);
      this.searchCircle = null;
    }
    if (this.infoWindow) {
      this.infoWindow.close();
      this.infoWindow = null;
    }
    if (this.autocompleteElement) {
      this.autocompleteElement.remove();
      this.autocompleteElement = null;
    }
  }

  get filteredProviders(): ServiceProviderItem[] {
    if (this.categoryFilter === 'all') {
      return this.providers;
    }
    return this.providers.filter((p) => p.category === this.categoryFilter);
  }

  get evCount(): number {
    return this.providers.filter((p) => p.category === 'ev').length;
  }

  get repairCount(): number {
    return this.providers.filter((p) => p.category === 'repair').length;
  }

  getPinForProvider(
    provider: ServiceProviderItem,
  ): google.maps.marker.PinElement | null {
    const isSelected = provider.id === this.selectedProviderId;
    const key = `${provider.id}:${isSelected ? 'selected' : 'default'}`;
    let pin = this.providerPins.get(key);
    if (!pin) {
      const created = this.mapsService.createProviderPinElement(
        provider.category,
        isSelected,
      );
      if (created) {
        this.providerPins.set(key, created);
        pin = created;
      }
    }
    return pin ?? null;
  }

  onDriverMarkerInitialized(
    marker: google.maps.marker.AdvancedMarkerElement,
  ): void {
    this.driverMarkerElement = marker;
  }

  onProviderMarkerInitialized(
    providerId: string,
    marker: google.maps.marker.AdvancedMarkerElement,
  ): void {
    this.providerMarkerElements.set(providerId, marker);
  }

  onMapInitialized(map: google.maps.Map): void {
    this.mapInstance = map;
    this.infoWindow = new google.maps.InfoWindow();
    this.searchCircle = new google.maps.Circle({
      map,
      center: this.driverLocation,
      radius: this.radiusKm * 1000,
      strokeColor: '#1a73e8',
      strokeOpacity: 0.75,
      strokeWeight: 2,
      fillColor: '#1a73e8',
      fillOpacity: 0.08,
      clickable: false,
    });
    this.fitSearchCircle();
  }

  async onMapClick(event: google.maps.MapMouseEvent): Promise<void> {
    if (!event.latLng) {
      return;
    }
    const nextCoords: google.maps.LatLngLiteral = {
      lat: event.latLng.lat(),
      lng: event.latLng.lng(),
    };
    await this.relocateDriver(nextCoords, true);
  }

  async onDriverMarkerDragEnd(event: google.maps.MapMouseEvent): Promise<void> {
    let nextCoords: google.maps.LatLngLiteral | null = null;

    if (event?.latLng) {
      nextCoords = { lat: event.latLng.lat(), lng: event.latLng.lng() };
    } else if (this.driverMarkerElement?.position) {
      const pos = this.driverMarkerElement.position;
      if (typeof (pos as google.maps.LatLng).lat === 'function') {
        const ll = pos as google.maps.LatLng;
        nextCoords = { lat: ll.lat(), lng: ll.lng() };
      } else {
        const lit = pos as google.maps.LatLngLiteral;
        nextCoords = { lat: lit.lat, lng: lit.lng };
      }
    }

    if (nextCoords) {
      await this.relocateDriver(nextCoords, false);
    }
  }

  async useCurrentMapCenter(): Promise<void> {
    const center = this.mapInstance?.getCenter();
    if (!center) {
      return;
    }
    await this.relocateDriver(
      { lat: center.lat(), lng: center.lng() },
      false,
    );
  }

  setCategoryFilter(filter: CategoryFilter): void {
    this.categoryFilter = filter;
  }

  async onRadiusChange(newRadius: number | string): Promise<void> {
    const parsed = Number(newRadius) as RadiusKm;
    if (parsed !== 5 && parsed !== 10 && parsed !== 15) {
      return;
    }
    if (this.radiusKm === parsed) {
      return;
    }
    this.radiusKm = parsed;
    this.updateCircleOverlay();
    this.fitSearchCircle();
    await this.refreshNearbyProvidersOnly();
  }

  async selectProvider(provider: ServiceProviderItem): Promise<void> {
    this.selectedProviderId = provider.id;
    this.statusError = '';
    this.openProviderInfoWindow(provider);
    await this.routeToProvider(provider);
  }

  clearRoute(): void {
    this.routeSeq += 1;
    this.activeRoute = null;
    this.selectedProviderId = null;
    this.loadingRoute = false;
    this.clearRouteOverlays();
    if (this.infoWindow) {
      this.infoWindow.close();
    }
    this.fitSearchCircle();
  }

  toggleSteps(): void {
    this.stepsExpanded = !this.stepsExpanded;
  }

  fitSearchCircle(): void {
    if (!this.mapInstance || !this.searchCircle) {
      return;
    }
    const bounds = this.searchCircle.getBounds();
    if (bounds) {
      this.mapInstance.fitBounds(bounds, 36);
    }
  }

  trackByProviderId(_index: number, item: ServiceProviderItem): string {
    return item.id;
  }

  private async mountAutocomplete(): Promise<void> {
    const host = this.autocompleteContainerRef?.nativeElement;
    if (!host || this.autocompleteElement) {
      return;
    }
    try {
      const el = await this.mapsService.createPlaceAutocompleteElement(
        this.driverLocation,
      );
      el.addEventListener('gmp-select', (rawEvent: Event) => {
        const selectEvent =
          rawEvent as google.maps.places.PlacePredictionSelectEvent;
        void this.handleAutocompleteSelect(selectEvent);
      });
      host.replaceChildren(el);
      this.autocompleteElement = el;
    } catch (err) {
      this.statusError =
        err instanceof Error
          ? err.message
          : 'Could not initialize Places Autocomplete.';
    }
  }

  private async handleAutocompleteSelect(
    event: google.maps.places.PlacePredictionSelectEvent,
  ): Promise<void> {
    try {
      const place = event.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location', 'viewport'],
      });

      if (!place.location) {
        return;
      }

      const coords: google.maps.LatLngLiteral = {
        lat: place.location.lat(),
        lng: place.location.lng(),
      };

      this.ngZone.run(() => {
        this.driverAddress =
          place.formattedAddress ||
          place.displayName ||
          `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
      });

      await this.relocateDriver(coords, true, false);
    } catch (err) {
      this.ngZone.run(() => {
        this.statusError =
          err instanceof Error
            ? err.message
            : 'Unable to resolve selected place.';
      });
    }
  }

  private async relocateDriver(
    coords: google.maps.LatLngLiteral,
    panMap: boolean,
    reverseGeocode = true,
  ): Promise<void> {
    this.driverLocation = coords;
    this.clearRoute();
    this.updateCircleOverlay();

    if (panMap && this.mapInstance) {
      this.mapInstance.panTo(coords);
    }

    await this.refreshAroundDriver(reverseGeocode);
  }

  private async refreshAroundDriver(reverseGeocode: boolean): Promise<void> {
    const currentSeq = ++this.searchSeq;
    this.loadingProviders = true;
    this.statusError = '';

    try {
      const addressPromise = reverseGeocode
        ? this.mapsService.reverseGeocode(this.driverLocation)
        : Promise.resolve(this.driverAddress);

      const nearbyPromise = this.mapsService.searchNearbyProviders(
        this.driverLocation,
        this.radiusKm * 1000,
      );

      const [address, initialProviders] = await Promise.all([
        addressPromise,
        nearbyPromise,
      ]);

      if (currentSeq !== this.searchSeq) {
        return;
      }

      this.driverAddress = address;
      this.providerPins.clear();
      this.providers = initialProviders;

      if (initialProviders.length > 0) {
        const ranked = await this.mapsService.rankProvidersByRouteMatrix(
          this.driverLocation,
          initialProviders,
        );
        if (currentSeq !== this.searchSeq) {
          return;
        }
        this.providers = ranked;
      }
    } catch (err) {
      if (currentSeq === this.searchSeq) {
        this.statusError =
          err instanceof Error
            ? err.message
            : 'Unable to fetch nearby EV charging and auto repair services.';
      }
    } finally {
      if (currentSeq === this.searchSeq) {
        this.loadingProviders = false;
      }
    }
  }

  private async refreshNearbyProvidersOnly(): Promise<void> {
    await this.refreshAroundDriver(false);
  }

  private async routeToProvider(provider: ServiceProviderItem): Promise<void> {
    const currentSeq = ++this.routeSeq;
    this.loadingRoute = true;
    this.clearRouteOverlays();

    try {
      const { route, summary } = await this.mapsService.computeDispatchRoute(
        this.driverLocation,
        provider,
      );

      if (currentSeq !== this.routeSeq) {
        return;
      }

      this.activeRoute = summary;
      this.stepsExpanded = true;

      if (this.mapInstance) {
        const polylines = route.createPolylines({
          polylineOptions: {
            strokeColor: provider.category === 'ev' ? '#0f9d58' : '#1a73e8',
            strokeOpacity: 0.92,
            strokeWeight: 6,
          },
        });
        for (const poly of polylines) {
          poly.setMap(this.mapInstance);
        }
        this.routePolylines = polylines;

        if (route.viewport) {
          this.mapInstance.fitBounds(route.viewport, 48);
        } else {
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(this.driverLocation);
          bounds.extend(provider.location);
          this.mapInstance.fitBounds(bounds, 64);
        }
      }
    } catch (err) {
      if (currentSeq === this.routeSeq) {
        this.statusError =
          err instanceof Error
            ? err.message
            : 'Unable to compute driving route to the selected provider.';
      }
    } finally {
      if (currentSeq === this.routeSeq) {
        this.loadingRoute = false;
      }
    }
  }

  private openProviderInfoWindow(provider: ServiceProviderItem): void {
    if (!this.infoWindow || !this.mapInstance) {
      return;
    }

    const container = document.createElement('div');
    container.className = 'map-info-card';

    const badge = document.createElement('div');
    badge.className = `map-info-badge ${provider.category}`;
    badge.textContent =
      provider.category === 'ev' ? 'EV Fast Charging' : 'Auto Repair';
    container.appendChild(badge);

    const title = document.createElement('strong');
    title.className = 'map-info-title';
    title.textContent = provider.name;
    container.appendChild(title);

    const addr = document.createElement('div');
    addr.className = 'map-info-meta';
    addr.textContent = provider.address;
    container.appendChild(addr);

    const stats = document.createElement('div');
    stats.className = 'map-info-stats';
    const ratingText =
      provider.rating !== null
        ? `★ ${provider.rating.toFixed(1)} (${provider.userRatingCount ?? 0})`
        : 'No rating';
    stats.textContent = `${ratingText} · ${provider.distanceText} · ${provider.etaText}`;
    container.appendChild(stats);

    const status = document.createElement('div');
    status.className = 'map-info-status';
    status.textContent = provider.availabilityLabel;
    container.appendChild(status);

    this.infoWindow.setContent(container);
    const anchor = this.providerMarkerElements.get(provider.id);
    if (anchor) {
      this.infoWindow.open({ anchor, map: this.mapInstance });
    } else {
      this.infoWindow.setPosition(provider.location);
      this.infoWindow.open({ map: this.mapInstance });
    }
  }

  private updateCircleOverlay(): void {
    if (!this.searchCircle) {
      return;
    }
    this.searchCircle.setCenter(this.driverLocation);
    this.searchCircle.setRadius(this.radiusKm * 1000);
  }

  private clearRouteOverlays(): void {
    for (const poly of this.routePolylines) {
      poly.setMap(null);
    }
    this.routePolylines = [];
  }
}
