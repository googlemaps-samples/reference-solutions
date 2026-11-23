import { CommonModule } from '@angular/common';
import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
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
} from '@angular/google-maps';
import { importLibrary } from '@googlemaps/js-api-loader';
import { StreetViewPanelComponent } from './components/street-view-panel/street-view-panel.component';
import { TimezoneHubComponent } from './components/timezone-hub/timezone-hub.component';
import {
  DAY_COLORS,
  DESTINATION_PRESETS,
  DayRouteSummary,
  DestinationPreset,
  DiscoveryCategory,
  ItineraryDay,
  ItineraryStop,
  PlaceCardItem,
  StreetViewPreviewState,
  TimeZoneInfo,
  TravelModeKey,
} from './models/itinerary.models';
import { GoogleMapsLoaderService } from './services/google-maps-loader.service';
import { PlacesDiscoveryService } from './services/places-discovery.service';
import { RoutesPlannerService } from './services/routes-planner.service';
import { TimezoneService } from './services/timezone.service';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    GoogleMap,
    MapAdvancedMarker,
    MapPolyline,
    MapInfoWindow,
    TimezoneHubComponent,
    StreetViewPanelComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private readonly loader = inject(GoogleMapsLoaderService);
  private readonly placesService = inject(PlacesDiscoveryService);
  private readonly routesService = inject(RoutesPlannerService);
  private readonly timezoneService = inject(TimezoneService);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('autocompleteHost') autocompleteHost?: ElementRef<HTMLDivElement>;
  @ViewChild(MapInfoWindow) infoWindow?: MapInfoWindow;

  readonly presets = DESTINATION_PRESETS;
  readonly dayColors = DAY_COLORS;

  readonly mapsLoaded = this.loader.isLoaded;
  readonly mapsLoading = this.loader.isLoading;
  readonly mapsError = this.loader.error;

  readonly selectedPresetId = signal<string>('tokyo');
  readonly destinationName = signal<string>('Tokyo');
  readonly destinationCenter = signal<google.maps.LatLngLiteral>({
    lat: 35.6812,
    lng: 139.7671,
  });
  readonly mapCenter = signal<google.maps.LatLngLiteral>({
    lat: 35.6812,
    lng: 139.7671,
  });
  readonly mapZoom = signal<number>(12);

  readonly mapOptions: google.maps.MapOptions = {
    mapId: 'DEMO_MAP_ID',
    internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    clickableIcons: true,
  };

  readonly timeZoneInfo = signal<TimeZoneInfo>({
    timeZoneId: 'Asia/Tokyo',
    timeZoneName: 'Japan Standard Time',
    rawOffsetSeconds: 32400,
    dstOffsetSeconds: 0,
    totalOffsetMinutes: 540,
    utcOffsetLabel: 'UTC+09:00',
    source: 'preset-fallback',
  });

  readonly activeDay = signal<ItineraryDay>(1);
  readonly travelMode = signal<TravelModeKey>('DRIVE');

  readonly day1Stops = signal<ItineraryStop[]>([]);
  readonly day2Stops = signal<ItineraryStop[]>([]);

  readonly activeDayStops = computed(() =>
    this.activeDay() === 1 ? this.day1Stops() : this.day2Stops()
  );

  readonly day1Route = signal<DayRouteSummary>(
    this.routesService.emptySummary(1, 'DRIVE', null)
  );
  readonly day2Route = signal<DayRouteSummary>(
    this.routesService.emptySummary(2, 'DRIVE', null)
  );

  readonly activeRouteSummary = computed(() =>
    this.activeDay() === 1 ? this.day1Route() : this.day2Route()
  );
  readonly activeRoutePath = computed(() => this.activeRouteSummary().path);
  readonly activePolylineOptions = computed<google.maps.PolylineOptions>(() => ({
    strokeColor: DAY_COLORS[this.activeDay()].primary,
    strokeOpacity: 0.9,
    strokeWeight: 5,
    geodesic: true,
  }));

  readonly routeLoading = signal(false);

  readonly activeCategory = signal<DiscoveryCategory>('attractions');
  readonly discoveryLoading = signal(false);
  readonly discoveryError = signal<string | null>(null);
  readonly discoveryResults = signal<PlaceCardItem[]>([]);
  private readonly discoveryCache = new Map<string, PlaceCardItem[]>();

  readonly selectedPlaceId = signal<string | null>(null);
  readonly infoWindowPlace = signal<PlaceCardItem | null>(null);
  readonly streetViewTarget = signal<StreetViewPreviewState>({
    placeId: null,
    title: 'Tokyo Station',
    address: 'Chiyoda City, Tokyo, Japan',
    location: { lat: 35.6812, lng: 139.7671 },
    status: 'idle',
    copyright: null,
    panoId: null,
    message: null,
  });

  private googleMap: google.maps.Map | null = null;
  private autocompleteElement: google.maps.places.PlaceAutocompleteElement | null = null;
  private autocompleteCleanup: (() => void) | null = null;
  private readonly pinCache = new Map<string, google.maps.marker.PinElement>();
  private stopUidCounter = 0;

  readonly stopMarkerItems = computed(() => {
    if (!this.mapsLoaded()) return [];
    const day = this.activeDay();
    const stops = this.activeDayStops();
    const selectedId = this.selectedPlaceId();
    const color = DAY_COLORS[day];
    return stops.map((stop, idx) => ({
      stop,
      index: idx,
      pin: this.getOrCreatePin(
        `stop:${day}:${idx}:${stop.id}:${selectedId === stop.id}`,
        {
          background: color.primary,
          borderColor: selectedId === stop.id ? '#0f172a' : '#ffffff',
          glyphColor: '#ffffff',
          glyphText: String(idx + 1),
          scale: selectedId === stop.id ? 1.2 : 1.05,
        }
      ),
    }));
  });

  readonly discoveryMarkerItems = computed(() => {
    if (!this.mapsLoaded()) return [];
    const activeIds = new Set(this.activeDayStops().map((s) => s.id));
    const selectedId = this.selectedPlaceId();
    return this.discoveryResults()
      .filter((item) => !activeIds.has(item.id))
      .map((item) => ({
        place: item,
        pin: this.getOrCreatePin(
          `disc:${item.id}:${selectedId === item.id}`,
          {
            background: selectedId === item.id ? '#4f46e5' : '#475569',
            borderColor: '#ffffff',
            glyphColor: '#ffffff',
            glyphText: '•',
            scale: selectedId === item.id ? 1.05 : 0.85,
          }
        ),
      }));
  });

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => {
      if (this.autocompleteCleanup) {
        this.autocompleteCleanup();
        this.autocompleteCleanup = null;
      }
      this.pinCache.clear();
    });

    void this.initializeWorkspace();
  }

  private async initializeWorkspace(): Promise<void> {
    const tokyo = DESTINATION_PRESETS[0];
    const loaded = await this.loader.ensureLoaded();

    // Always resolve Time Zone Hub (with graceful fallback if API key is missing)
    void this.refreshTimeZone(
      tokyo.center,
      tokyo.fallbackUtcOffsetMinutes,
      tokyo.fallbackTimeZoneId,
      tokyo.fallbackTimeZoneName
    );

    if (!loaded) {
      return;
    }

    await this.mountAutocompleteWidget();
    await this.loadDestinationData(tokyo, true);
  }

  private async mountAutocompleteWidget(): Promise<void> {
    const host = this.autocompleteHost?.nativeElement;
    if (!host || this.autocompleteElement) return;

    try {
      const { PlaceAutocompleteElement } = await importLibrary('places');
      const element = new PlaceAutocompleteElement({
        internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
        requestedLanguage: 'en',
        placeholder: 'Search destination city or landmark...',
      });

      const handleSelect = (event: Event) => {
        const selectEvent = event as google.maps.places.PlacePredictionSelectEvent;
        if (!selectEvent.placePrediction) return;
        this.ngZone.run(() => {
          void this.handleAutocompleteSelection(selectEvent.placePrediction);
        });
      };

      element.addEventListener('gmp-select', handleSelect);
      host.replaceChildren(element);
      this.autocompleteElement = element;
      this.autocompleteCleanup = () => {
        element.removeEventListener('gmp-select', handleSelect);
      };
    } catch (err) {
      console.error('Failed to initialize PlaceAutocompleteElement:', err);
    }
  }

  private async handleAutocompleteSelection(
    prediction: google.maps.places.PlacePrediction
  ): Promise<void> {
    try {
      const place = prediction.toPlace();
      const resolved = await this.placesService.resolveDestinationFromPlace(place);
      if (!resolved) return;

      this.selectedPresetId.set('custom');
      const customPreset: DestinationPreset = {
        id: 'custom',
        name: resolved.name,
        country: '',
        query: `top tourist attractions in ${resolved.name}`,
        center: resolved.center,
        zoom: 13,
        fallbackTimeZoneId: 'UTC',
        fallbackTimeZoneName: 'Local Destination Time',
        fallbackUtcOffsetMinutes: resolved.utcOffsetMinutes ?? 0,
      };

      await this.loadDestinationData(
        customPreset,
        true,
        resolved.utcOffsetMinutes
      );

      if (resolved.viewport && this.googleMap) {
        this.googleMap.fitBounds(resolved.viewport);
      }
    } catch (err) {
      this.discoveryError.set(
        err instanceof Error ? err.message : 'Unable to resolve selected destination.'
      );
    }
  }

  async onQuickPresetChange(event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const preset = this.presets.find((p) => p.id === select.value);
    if (!preset) return;
    this.selectedPresetId.set(preset.id);
    await this.loadDestinationData(preset, true);
  }

  private async loadDestinationData(
    preset: DestinationPreset,
    reseedItinerary: boolean,
    explicitUtcOffsetMinutes: number | null = null
  ): Promise<void> {
    this.destinationName.set(preset.name);
    this.destinationCenter.set(preset.center);
    this.mapCenter.set(preset.center);
    this.mapZoom.set(preset.zoom);
    this.activeCategory.set('attractions');
    this.discoveryCache.clear();
    this.infoWindow?.close();

    void this.refreshTimeZone(
      preset.center,
      explicitUtcOffsetMinutes ?? preset.fallbackUtcOffsetMinutes,
      preset.fallbackTimeZoneId,
      preset.fallbackTimeZoneName
    );

    if (!this.mapsLoaded()) return;

    this.discoveryLoading.set(true);
    this.discoveryError.set(null);

    try {
      const attractions = await this.placesService.discoverCategory(
        preset.center,
        preset.name,
        'attractions',
        preset.query
      );

      this.discoveryCache.set(`${preset.name}:attractions`, attractions);
      this.discoveryResults.set(attractions);

      if (reseedItinerary) {
        await this.seedItineraryFromLivePlaces(preset, attractions);
      }
    } catch (err) {
      this.discoveryError.set(
        err instanceof Error ? err.message : 'Failed to load destination places.'
      );
    } finally {
      this.discoveryLoading.set(false);
    }
  }

  private async seedItineraryFromLivePlaces(
    preset: DestinationPreset,
    attractions: PlaceCardItem[]
  ): Promise<void> {
    let hotels: PlaceCardItem[] = [];
    try {
      hotels = await this.placesService.discoverCategory(
        preset.center,
        preset.name,
        'hotels'
      );
      this.discoveryCache.set(`${preset.name}:hotels`, hotels);
    } catch {
      hotels = [];
    }

    const day1Seed = attractions.slice(0, 3).map((item) => this.toItineraryStop(item));
    const day2Candidates = [
      ...attractions.slice(3, 5),
      ...(hotels.length > 0 ? [hotels[0]] : attractions.slice(5, 6)),
    ];
    const day2Seed = day2Candidates
      .slice(0, 3)
      .map((item) => this.toItineraryStop(item));

    this.day1Stops.set(day1Seed);
    this.day2Stops.set(day2Seed);
    this.activeDay.set(1);

    const firstStop = day1Seed[0] ?? attractions[0];
    if (firstStop) {
      this.inspectStreetView(firstStop);
    }

    await Promise.all([
      this.computeRouteForDay(1, false),
      this.computeRouteForDay(2, false),
    ]);

    this.fitMapToActiveDay();
  }

  private async refreshTimeZone(
    location: google.maps.LatLngLiteral,
    fallbackUtcOffsetMinutes: number | null,
    fallbackTimeZoneId: string,
    fallbackTimeZoneName: string
  ): Promise<void> {
    const info = await this.timezoneService.fetchTimeZone(
      location,
      fallbackUtcOffsetMinutes,
      fallbackTimeZoneId,
      fallbackTimeZoneName
    );
    this.timeZoneInfo.set(info);
  }

  async selectCategory(category: DiscoveryCategory): Promise<void> {
    this.activeCategory.set(category);
    if (!this.mapsLoaded()) return;

    const cacheKey = `${this.destinationName()}:${category}`;
    const cached = this.discoveryCache.get(cacheKey);
    if (cached) {
      this.discoveryResults.set(cached);
      return;
    }

    this.discoveryLoading.set(true);
    this.discoveryError.set(null);
    try {
      const items = await this.placesService.discoverCategory(
        this.destinationCenter(),
        this.destinationName(),
        category
      );
      this.discoveryCache.set(cacheKey, items);
      this.discoveryResults.set(items);
    } catch (err) {
      this.discoveryError.set(
        err instanceof Error ? err.message : `Failed to load ${category}.`
      );
    } finally {
      this.discoveryLoading.set(false);
    }
  }

  async selectDay(day: ItineraryDay): Promise<void> {
    if (this.activeDay() === day) return;
    this.activeDay.set(day);
    this.infoWindow?.close();

    const stops = day === 1 ? this.day1Stops() : this.day2Stops();
    if (stops.length > 0) {
      this.inspectStreetView(stops[0]);
    }

    if (stops.length >= 2 && this.activeRouteSummary().path.length === 0) {
      await this.computeRouteForDay(day, false);
    }
    this.fitMapToActiveDay();
  }

  async onTravelModeChange(event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const mode = select.value as TravelModeKey;
    this.travelMode.set(mode);
    await this.computeRouteForDay(this.activeDay(), false);
  }

  async optimizeActiveRoute(): Promise<void> {
    const day = this.activeDay();
    const stops = day === 1 ? this.day1Stops() : this.day2Stops();
    if (stops.length < 3) return;
    await this.computeRouteForDay(day, true);
    this.fitMapToActiveDay();
  }

  async addPlaceToDay(place: PlaceCardItem, day: ItineraryDay): Promise<void> {
    const current = day === 1 ? this.day1Stops() : this.day2Stops();
    if (current.some((s) => s.id === place.id)) {
      await this.selectDay(day);
      return;
    }

    const updated = [...current, this.toItineraryStop(place)];
    if (day === 1) {
      this.day1Stops.set(updated);
    } else {
      this.day2Stops.set(updated);
    }

    this.activeDay.set(day);
    this.inspectStreetView(place);
    await this.computeRouteForDay(day, false);
    this.fitMapToActiveDay();
  }

  async removeStop(day: ItineraryDay, stopUid: string): Promise<void> {
    const current = day === 1 ? this.day1Stops() : this.day2Stops();
    const updated = current.filter((s) => s.stopUid !== stopUid);
    if (day === 1) {
      this.day1Stops.set(updated);
    } else {
      this.day2Stops.set(updated);
    }
    await this.computeRouteForDay(day, false);
  }

  async moveStop(day: ItineraryDay, index: number, delta: -1 | 1): Promise<void> {
    const current = [...(day === 1 ? this.day1Stops() : this.day2Stops())];
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= current.length) return;
    const [moved] = current.splice(index, 1);
    current.splice(targetIndex, 0, moved);
    if (day === 1) {
      this.day1Stops.set(current);
    } else {
      this.day2Stops.set(current);
    }
    await this.computeRouteForDay(day, false);
  }

  isPlaceInDay(placeId: string, day: ItineraryDay): boolean {
    const stops = day === 1 ? this.day1Stops() : this.day2Stops();
    return stops.some((s) => s.id === placeId);
  }

  inspectStreetView(place: PlaceCardItem): void {
    this.selectedPlaceId.set(place.id);
    this.streetViewTarget.set({
      placeId: place.id,
      title: place.displayName,
      address: place.formattedAddress,
      location: place.location,
      status: 'loading',
      copyright: null,
      panoId: null,
      message: null,
    });
    if (this.googleMap) {
      this.googleMap.panTo(place.location);
    }
  }

  onMapInitialized(map: google.maps.Map): void {
    this.googleMap = map;
    if (this.activeDayStops().length > 0) {
      this.fitMapToActiveDay();
    }
  }

  onMarkerClick(place: PlaceCardItem, marker: MapAdvancedMarker): void {
    this.infoWindowPlace.set(place);
    this.inspectStreetView(place);
    this.infoWindow?.open(marker);
  }

  getLegAfterStop(index: number) {
    const legs = this.activeRouteSummary().legs;
    return legs[index] ?? null;
  }

  canOptimizeActiveRoute(): boolean {
    return (
      this.activeDayStops().length >= 3 &&
      this.travelMode() !== 'TRANSIT' &&
      !this.routeLoading()
    );
  }

  private async computeRouteForDay(
    day: ItineraryDay,
    optimizeOrder: boolean
  ): Promise<void> {
    const stops = day === 1 ? this.day1Stops() : this.day2Stops();
    const mode = this.travelMode();

    if (!this.mapsLoaded() || stops.length < 2) {
      const empty = this.routesService.emptySummary(day, mode, null);
      if (day === 1) {
        this.day1Route.set(empty);
      } else {
        this.day2Route.set(empty);
      }
      return;
    }

    this.routeLoading.set(true);
    try {
      const result = await this.routesService.computeDayRoute(
        day,
        stops,
        mode,
        optimizeOrder
      );

      if (day === 1) {
        if (optimizeOrder) {
          this.day1Stops.set(result.reorderedStops);
        }
        this.day1Route.set(result.summary);
      } else {
        if (optimizeOrder) {
          this.day2Stops.set(result.reorderedStops);
        }
        this.day2Route.set(result.summary);
      }
    } finally {
      this.routeLoading.set(false);
    }
  }

  private fitMapToActiveDay(): void {
    if (!this.googleMap) return;
    const stops = this.activeDayStops();
    if (stops.length === 0) {
      this.googleMap.setCenter(this.destinationCenter());
      this.googleMap.setZoom(12);
      return;
    }
    if (stops.length === 1) {
      this.googleMap.panTo(stops[0].location);
      this.googleMap.setZoom(14);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    for (const stop of stops) {
      bounds.extend(stop.location);
    }
    this.googleMap.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
  }

  private toItineraryStop(place: PlaceCardItem): ItineraryStop {
    this.stopUidCounter += 1;
    return {
      ...place,
      stopUid: `${place.id}-${this.stopUidCounter}`,
    };
  }

  private getOrCreatePin(
    key: string,
    options: google.maps.marker.PinElementOptions
  ): google.maps.marker.PinElement {
    const existing = this.pinCache.get(key);
    if (existing) {
      return existing;
    }
    const created = new google.maps.marker.PinElement(options);
    this.pinCache.set(key, created);
    return created;
  }
}
