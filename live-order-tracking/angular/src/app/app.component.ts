import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  GoogleMap,
  MapAdvancedMarker,
  MapPolygon,
  MapPolyline,
} from '@angular/google-maps';
import {
  AddressValidationSummary,
  CartItem,
  CourierState,
  DELIVERY_ZONE_POLYGON,
  DeliveryEligibility,
  KITCHEN_HUB,
  LatLngPoint,
  OUT_OF_ZONE_PRESET_ADDRESS,
  SAMPLE_CART_ITEMS,
  SEED_ADDRESS,
  RouteSummary,
} from './models/delivery.models';
import {
  LoadedMapsLibraries,
  MapsLoaderService,
} from './services/maps-loader.service';
import { DeliveryTrackingService } from './services/delivery-tracking.service';
import {
  createCourierMarkerContent,
  createCustomerMarkerContent,
  createKitchenMarkerContent,
} from './components/marker-factory';

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
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(GoogleMap) googleMap?: GoogleMap;
  @ViewChild('autocompleteHost') autocompleteHost?: ElementRef<HTMLElement>;
  @ViewChild('courierMarker') courierMarker?: MapAdvancedMarker;

  readonly kitchenHub = KITCHEN_HUB;
  readonly deliveryZonePolygon = DELIVERY_ZONE_POLYGON;
  readonly cartItems: CartItem[] = SAMPLE_CART_ITEMS;
  readonly seedAddress = SEED_ADDRESS;
  readonly outOfZoneAddress = OUT_OF_ZONE_PRESET_ADDRESS;

  addressInput = SEED_ADDRESS;
  unitInput = 'Suite 1200';
  mapsReady = false;
  initError: string | null = null;
  isProcessing = false;
  routeError: string | null = null;
  staticMapUrl: string | null = null;
  staticMapLoaded = false;
  staticMapError = false;

  mapCenter: google.maps.LatLngLiteral = KITCHEN_HUB.location;
  mapZoom = 13;
  mapOptions: google.maps.MapOptions = {
    mapId: 'DEMO_MAP_ID',
    internalUsageAttributionIds: ['gmp_git_agentsamples_v1.0.0'],
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
    clickableIcons: false,
  };

  zonePolygonOptions: google.maps.PolygonOptions = {
    strokeColor: '#0f766e',
    strokeOpacity: 0.85,
    strokeWeight: 2,
    fillColor: '#14b8a6',
    fillOpacity: 0.12,
    clickable: false,
  };

  routePolylineOptions: google.maps.PolylineOptions = {
    strokeColor: '#2563eb',
    strokeOpacity: 0.9,
    strokeWeight: 5,
    clickable: false,
  };

  kitchenMarkerContent: HTMLElement = createKitchenMarkerContent();
  customerMarkerContent: HTMLElement = createCustomerMarkerContent(true);
  courierMarkerContent: HTMLElement = createCourierMarkerContent();

  dropoffPosition: LatLngPoint | null = null;
  routePath: LatLngPoint[] = [];
  routeSummary: RouteSummary | null = null;
  eligibility: DeliveryEligibility | null = null;

  validationSummary: AddressValidationSummary = {
    status: 'idle',
    formattedAddress: SEED_ADDRESS,
    placeId: null,
    location: null,
    plusCode: null,
    validationGranularity: null,
    geocodeGranularity: null,
    inputGranularity: null,
    addressComplete: false,
    hasUnconfirmedComponents: false,
    hasInferredComponents: false,
    hasReplacedComponents: false,
    deliverable: false,
    propertyType: 'Unknown',
    uspsDpvConfirmation: null,
    uspsStandardizedLine: null,
    source: 'address-validation-js',
    message: 'Initializing Google Maps Platform services...',
  };

  courierState: CourierState = {
    status: 'awaiting-order',
    progress: 0,
    position: KITCHEN_HUB.location,
    headingDegrees: 0,
    remainingMinutes: 0,
    remainingKm: 0,
    orderNumber: null,
  };

  private libs: LoadedMapsLibraries | null = null;
  private rafId: number | null = null;
  private lastFrameTimestamp = 0;
  private lastUiSyncTimestamp = 0;
  private autocompleteWired = false;
  private readonly animationDurationMs = 18000;

  private readonly onPlaceSelect = (event: Event): void => {
    void this.handleAutocompleteSelect(event);
  };

  constructor(
    private readonly mapsLoader: MapsLoaderService,
    private readonly trackingService: DeliveryTrackingService,
    private readonly ngZone: NgZone,
    private readonly cdr: ChangeDetectorRef
  ) {}

  get subtotal(): number {
    return this.cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }

  get totalAmount(): number {
    return this.subtotal + (this.eligibility?.deliveryFee ?? 0);
  }

  get canPlaceOrder(): boolean {
    return Boolean(
      this.mapsReady &&
        !this.isProcessing &&
        this.eligibility?.eligible &&
        this.routeSummary &&
        this.routePath.length > 0
    );
  }

  get topStatusText(): string {
    if (this.initError) return 'API Key Required';
    if (this.courierState.status === 'dispatched') {
      return `En Route · ${Math.round(this.courierState.progress * 100)}%`;
    }
    if (this.courierState.status === 'delivered') {
      return 'Order Delivered';
    }
    if (this.eligibility) {
      return this.eligibility.eligible ? 'Inside Delivery Zone' : 'Outside Delivery Zone';
    }
    return 'Validating Address';
  }

  async ngOnInit(): Promise<void> {
    if (!this.mapsLoader.hasApiKey()) {
      this.initError =
        'GOOGLE_MAPS_API_KEY is not configured. Copy .env.example to .env and add your Google Maps Platform API key or Maps Demo Key.';
      this.validationSummary = {
        ...this.validationSummary,
        status: 'error',
        message: this.initError,
      };
      return;
    }

    try {
      this.libs = await this.mapsLoader.load();
      this.mapsReady = true;
      this.cdr.detectChanges();
      this.wireAutocompleteElement();
      await this.runCheckoutEvaluation(this.seedAddress, this.unitInput);
    } catch (error) {
      this.initError =
        error instanceof Error ? error.message : 'Failed to initialize Google Maps Platform.';
      this.validationSummary = {
        ...this.validationSummary,
        status: 'error',
        message: this.initError,
      };
    }
  }

  ngAfterViewInit(): void {
    if (this.mapsReady) {
      this.wireAutocompleteElement();
    }
  }

  ngOnDestroy(): void {
    this.stopCourierAnimation();
    const el = this.autocompleteHost?.nativeElement;
    if (el) {
      el.removeEventListener('gmp-select', this.onPlaceSelect);
    }
  }

  private wireAutocompleteElement(): void {
    if (this.autocompleteWired || !this.libs) return;
    const host = this.autocompleteHost?.nativeElement;
    if (!host) return;

    const autocompleteEl = host as unknown as google.maps.places.PlaceAutocompleteElement & {
      value?: string;
      placeholder?: string;
    };

    autocompleteEl.includedRegionCodes = ['us'];
    autocompleteEl.locationBias = {
      center: KITCHEN_HUB.location,
      radius: 25000,
    };
    autocompleteEl.placeholder = 'Search Chicago delivery address...';
    autocompleteEl.value = this.addressInput;
    autocompleteEl.addEventListener('gmp-select', this.onPlaceSelect);
    this.autocompleteWired = true;
  }

  private async handleAutocompleteSelect(event: Event): Promise<void> {
    const selectEvent = event as google.maps.places.PlacePredictionSelectEvent;
    const prediction = selectEvent.placePrediction;
    if (!prediction) return;

    try {
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ['formattedAddress', 'location', 'id', 'displayName'],
      });

      const formatted = place.formattedAddress || this.addressInput;
      const loc = place.location
        ? { lat: place.location.lat(), lng: place.location.lng() }
        : null;

      await this.ngZone.run(async () => {
        this.addressInput = formatted;
        await this.runCheckoutEvaluation(formatted, this.unitInput, {
          formattedAddress: formatted,
          location: loc,
          id: place.id ?? null,
        });
      });
    } catch (error) {
      this.ngZone.run(() => {
        this.routeError =
          error instanceof Error ? error.message : 'Failed to fetch selected place details.';
      });
    }
  }

  async onValidateAddressClick(): Promise<void> {
    const host = this.autocompleteHost?.nativeElement as
      | (HTMLElement & { value?: string })
      | undefined;
    const currentInput = (host?.value ?? this.addressInput).trim() || this.addressInput;
    this.addressInput = currentInput;
    await this.runCheckoutEvaluation(currentInput, this.unitInput);
  }

  async selectPresetAddress(preset: 'in-zone' | 'out-of-zone'): Promise<void> {
    const targetAddress = preset === 'in-zone' ? this.seedAddress : this.outOfZoneAddress;
    this.addressInput = targetAddress;
    this.unitInput = preset === 'in-zone' ? 'Suite 1200' : '';

    const host = this.autocompleteHost?.nativeElement as
      | (HTMLElement & { value?: string })
      | undefined;
    if (host) {
      host.value = targetAddress;
    }

    await this.runCheckoutEvaluation(targetAddress, this.unitInput);
  }

  private async runCheckoutEvaluation(
    streetAddress: string,
    unit: string,
    fallbackPlace?: { formattedAddress?: string | null; location?: LatLngPoint | null; id?: string | null }
  ): Promise<void> {
    if (!this.libs) return;

    this.stopCourierAnimation();
    this.isProcessing = true;
    this.routeError = null;
    this.staticMapError = false;
    this.staticMapLoaded = false;

    this.validationSummary = {
      ...this.validationSummary,
      status: 'validating',
      message: 'Validating address granularity and USPS deliverability...',
    };

    try {
      let resolvedFallback = fallbackPlace;
      if (!resolvedFallback?.location) {
        const placeDetails = await this.trackingService.resolveAddressDetails(
          this.libs,
          streetAddress
        );
        if (placeDetails) {
          resolvedFallback = placeDetails;
        }
      }

      const validation = await this.trackingService.validateAddress(
        this.libs,
        streetAddress,
        unit,
        resolvedFallback
      );
      this.validationSummary = validation;

      if (!validation.location) {
        this.dropoffPosition = null;
        this.routePath = [];
        this.routeSummary = null;
        this.eligibility = null;
        this.staticMapUrl = null;
        this.isProcessing = false;
        return;
      }

      this.dropoffPosition = validation.location;
      const insidePolygon = this.trackingService.isInsideDeliveryPolygon(
        this.libs,
        validation.location
      );

      const route = await this.trackingService.computeDeliveryRoute(
        this.libs,
        validation.location
      );
      this.routeSummary = route;
      this.routePath = route.path;

      const eligibility = this.trackingService.evaluateEligibility(
        insidePolygon,
        route.distanceMeters,
        validation.deliverable
      );
      this.eligibility = eligibility;

      this.customerMarkerContent = createCustomerMarkerContent(eligibility.eligible);
      this.routePolylineOptions = {
        ...this.routePolylineOptions,
        strokeColor: eligibility.eligible ? '#2563eb' : '#d97706',
      };

      this.staticMapUrl = this.trackingService.buildStaticReceiptUrl(
        KITCHEN_HUB.location,
        validation.location,
        route.encodedPolyline
      );

      this.courierState = {
        status: 'awaiting-order',
        progress: 0,
        position: route.path[0] ?? KITCHEN_HUB.location,
        headingDegrees: 0,
        remainingMinutes: route.durationMinutes,
        remainingKm: route.distanceKm,
        orderNumber: null,
      };

      this.fitMapToRoute(validation.location, route.path);
    } catch (error) {
      this.routeError =
        error instanceof Error ? error.message : 'Unable to calculate delivery route.';
    } finally {
      this.isProcessing = false;
      this.cdr.detectChanges();
    }
  }

  private fitMapToRoute(dropoff: LatLngPoint, path: LatLngPoint[]): void {
    if (!this.libs || !this.googleMap?.googleMap) return;
    const bounds = new this.libs.core.LatLngBounds();
    bounds.extend(KITCHEN_HUB.location);
    bounds.extend(dropoff);
    for (const pt of path) {
      bounds.extend(pt);
    }
    this.googleMap.googleMap.fitBounds(bounds, {
      top: 72,
      right: 48,
      bottom: 72,
      left: 48,
    });
  }

  placeOrderAndDispatch(): void {
    if (!this.canPlaceOrder || !this.routeSummary) return;

    this.stopCourierAnimation();
    const orderNum = `FM-${Math.floor(1000 + Math.random() * 9000)}`;
    const initial = this.trackingService.interpolateAlongPath(this.routePath, 0);

    this.courierState = {
      status: 'dispatched',
      progress: 0,
      position: initial.position,
      headingDegrees: initial.headingDegrees,
      remainingMinutes: this.routeSummary.durationMinutes,
      remainingKm: this.routeSummary.distanceKm,
      orderNumber: orderNum,
    };

    this.startCourierAnimation();
  }

  toggleCourierSimulation(): void {
    if (!this.routeSummary || this.routePath.length === 0) return;

    if (this.courierState.status === 'dispatched') {
      this.stopCourierAnimation();
      this.courierState = {
        ...this.courierState,
        status: 'paused',
      };
      return;
    }

    if (this.courierState.status === 'delivered' || this.courierState.status === 'awaiting-order') {
      const initial = this.trackingService.interpolateAlongPath(this.routePath, 0);
      this.courierState = {
        ...this.courierState,
        status: 'dispatched',
        progress: 0,
        position: initial.position,
        headingDegrees: initial.headingDegrees,
        remainingMinutes: this.routeSummary.durationMinutes,
        remainingKm: this.routeSummary.distanceKm,
        orderNumber: this.courierState.orderNumber ?? `FM-${Math.floor(1000 + Math.random() * 9000)}`,
      };
    } else {
      this.courierState = {
        ...this.courierState,
        status: 'dispatched',
      };
    }

    this.startCourierAnimation();
  }

  private startCourierAnimation(): void {
    this.stopCourierAnimation();
    this.lastFrameTimestamp = performance.now();
    this.lastUiSyncTimestamp = this.lastFrameTimestamp;

    this.ngZone.runOutsideAngular(() => {
      const tick = (now: number) => {
        const dt = Math.min(100, now - this.lastFrameTimestamp);
        this.lastFrameTimestamp = now;

        const nextProgress = Math.min(
          1,
          this.courierState.progress + dt / this.animationDurationMs
        );
        const { position, headingDegrees } = this.trackingService.interpolateAlongPath(
          this.routePath,
          nextProgress
        );

        this.courierState.progress = nextProgress;
        this.courierState.position = position;
        this.courierState.headingDegrees = headingDegrees;

        // Directly update AdvancedMarkerElement position at 60fps for smooth movement
        if (this.courierMarker?.advancedMarker) {
          this.courierMarker.advancedMarker.position = position;
        }

        if (now - this.lastUiSyncTimestamp >= 100 || nextProgress >= 1) {
          this.lastUiSyncTimestamp = now;
          const totalMin = this.routeSummary?.durationMinutes ?? 1;
          const totalKm = this.routeSummary?.distanceKm ?? 0;
          const remainingMinutes = Math.max(0, Math.ceil(totalMin * (1 - nextProgress)));
          const remainingKm = Number((totalKm * (1 - nextProgress)).toFixed(2));

          this.ngZone.run(() => {
            this.courierState = {
              ...this.courierState,
              status: nextProgress >= 1 ? 'delivered' : 'dispatched',
              progress: nextProgress,
              position,
              headingDegrees,
              remainingMinutes,
              remainingKm,
            };
          });
        }

        if (nextProgress < 1 && this.courierState.status === 'dispatched') {
          this.rafId = requestAnimationFrame(tick);
        } else {
          this.rafId = null;
        }
      };

      this.rafId = requestAnimationFrame(tick);
    });
  }

  private stopCourierAnimation(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  onStaticMapLoad(): void {
    this.staticMapLoaded = true;
    this.staticMapError = false;
  }

  onStaticMapError(): void {
    this.staticMapLoaded = false;
    this.staticMapError = true;
  }
}
