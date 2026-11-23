import {
  AfterViewInit,
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { importLibrary } from '@googlemaps/js-api-loader';
import {
  AmenityCategory,
  CommuteSummary,
  LatLngPoint,
  NearbyAmenity,
  PropertyListing,
} from '../../models/real-estate.models';
import {
  GoogleMapsService,
  ResolvedWorkplace,
  WorkplaceSuggestion,
} from '../../services/google-maps.service';

@Component({
  selector: 'app-listing-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './listing-detail.component.html',
  styleUrl: './listing-detail.component.css',
})
export class ListingDetailComponent implements AfterViewInit, OnChanges, OnDestroy {
  private readonly mapsService = inject(GoogleMapsService);

  @Input({ required: true }) listing!: PropertyListing;
  @Input() mapsReady = false;

  @Output() closeDetail = new EventEmitter<void>();
  @Output() amenitiesUpdated = new EventEmitter<NearbyAmenity[]>();
  @Output() amenityFocused = new EventEmitter<NearbyAmenity>();
  @Output() commuteUpdated = new EventEmitter<{
    summary: CommuteSummary | null;
    routePath: LatLngPoint[];
  }>();

  @ViewChild('streetViewContainer') streetViewContainer?: ElementRef<HTMLDivElement>;

  // Nearby Amenities state
  readonly activeTab = signal<AmenityCategory>('all');
  readonly amenities = signal<NearbyAmenity[]>([]);
  readonly amenitiesLoading = signal(false);
  readonly amenitiesError = signal<string | null>(null);

  readonly filteredAmenities = computed(() => {
    const tab = this.activeTab();
    const all = this.amenities();
    if (tab === 'all') return all;
    return all.filter((item) => item.category === tab);
  });

  // Street View state
  readonly streetViewUnavailable = signal(false);
  private panorama: google.maps.StreetViewPanorama | null = null;
  private viewInitialized = false;

  // Commute Calculator state
  workplaceQuery = 'Salesforce Tower, San Francisco, CA';
  readonly suggestions = signal<WorkplaceSuggestion[]>([]);
  readonly showSuggestions = signal(false);
  readonly commuteLoading = signal(false);
  readonly commuteError = signal<string | null>(null);
  readonly commuteSummary = signal<CommuteSummary | null>(null);

  private selectedWorkplace: ResolvedWorkplace | null = null;
  private sessionToken: google.maps.places.AutocompleteSessionToken | undefined;
  private suggestDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    void this.loadListingSideData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['listing'] || changes['mapsReady']) && this.viewInitialized) {
      void this.loadListingSideData();
    }
  }

  ngOnDestroy(): void {
    if (this.suggestDebounceTimer) {
      clearTimeout(this.suggestDebounceTimer);
    }
    this.panorama = null;
  }

  setTab(tab: AmenityCategory): void {
    this.activeTab.set(tab);
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  }

  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${meters} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  }

  private async loadListingSideData(): Promise<void> {
    if (!this.listing) return;

    // Reset commute route for newly selected property, then recompute if workplace is active
    if (!this.mapsReady) {
      this.amenities.set([]);
      this.amenitiesUpdated.emit([]);
      return;
    }

    await Promise.all([
      this.initStreetView(),
      this.fetchAmenities(),
      this.selectedWorkplace ? this.calculateCommute() : Promise.resolve(),
    ]);
  }

  private async initStreetView(): Promise<void> {
    const container = this.streetViewContainer?.nativeElement;
    if (!container || !this.mapsReady) return;

    this.streetViewUnavailable.set(false);
    try {
      const {
        StreetViewPanorama,
        StreetViewService,
        StreetViewPreference,
        StreetViewSource,
        StreetViewStatus,
      } = await importLibrary('streetView');

      const svService = new StreetViewService();
      const targetPos = { lat: this.listing.lat, lng: this.listing.lng };

      const response = await svService
        .getPanorama({
          location: targetPos,
          radius: 75,
          preference: StreetViewPreference.NEAREST,
          source: StreetViewSource.OUTDOOR,
        })
        .catch(() => null);

      if (!response || !response.data?.location?.pano) {
        this.streetViewUnavailable.set(true);
        return;
      }

      const panoId = response.data.location.pano;
      if (!this.panorama) {
        this.panorama = new StreetViewPanorama(container, {
          pano: panoId,
          pov: {
            heading: this.listing.streetViewHeading,
            pitch: 4,
          },
          zoom: 1,
          addressControl: false,
          fullscreenControl: true,
          motionTracking: false,
          enableCloseButton: false,
        });
      } else {
        this.panorama.setPano(panoId);
        this.panorama.setPov({
          heading: this.listing.streetViewHeading,
          pitch: 4,
        });
      }

      void StreetViewStatus;
    } catch {
      this.streetViewUnavailable.set(true);
    }
  }

  private async fetchAmenities(): Promise<void> {
    this.amenitiesLoading.set(true);
    this.amenitiesError.set(null);
    try {
      const items = await this.mapsService.searchNearbyAmenities(
        this.listing.lat,
        this.listing.lng
      );
      this.amenities.set(items);
      this.amenitiesUpdated.emit(items);
    } catch (err) {
      this.amenitiesError.set(
        err instanceof Error ? err.message : 'Unable to load nearby amenities.'
      );
      this.amenities.set([]);
      this.amenitiesUpdated.emit([]);
    } finally {
      this.amenitiesLoading.set(false);
    }
  }

  onWorkplaceInputChange(value: string): void {
    this.workplaceQuery = value;
    this.selectedWorkplace = null;

    if (this.suggestDebounceTimer) {
      clearTimeout(this.suggestDebounceTimer);
    }

    if (!this.mapsReady || value.trim().length < 2) {
      this.suggestions.set([]);
      this.showSuggestions.set(false);
      return;
    }

    this.suggestDebounceTimer = setTimeout(() => {
      void this.loadWorkplaceSuggestions(value);
    }, 220);
  }

  private async loadWorkplaceSuggestions(query: string): Promise<void> {
    try {
      if (!this.sessionToken) {
        const { AutocompleteSessionToken } = await importLibrary('places');
        this.sessionToken = new AutocompleteSessionToken();
      }
      const list = await this.mapsService.fetchWorkplaceSuggestions(query, this.sessionToken);
      this.suggestions.set(list);
      this.showSuggestions.set(list.length > 0);
    } catch {
      this.suggestions.set([]);
      this.showSuggestions.set(false);
    }
  }

  async selectSuggestion(suggestion: WorkplaceSuggestion): Promise<void> {
    this.workplaceQuery = suggestion.fullText;
    this.showSuggestions.set(false);
    this.suggestions.set([]);
    this.commuteError.set(null);

    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location'],
      });
      this.sessionToken = undefined;

      if (place.location) {
        this.selectedWorkplace = {
          name: place.displayName || suggestion.mainText,
          address: place.formattedAddress || suggestion.fullText,
          location: {
            lat: place.location.lat(),
            lng: place.location.lng(),
          },
        };
        await this.calculateCommute();
      }
    } catch {
      await this.calculateCommute();
    }
  }

  applyWorkplacePreset(presetQuery: string): void {
    this.workplaceQuery = presetQuery;
    this.selectedWorkplace = null;
    this.showSuggestions.set(false);
    void this.calculateCommute();
  }

  async calculateCommute(): Promise<void> {
    const query = this.workplaceQuery.trim();
    if (!query) {
      this.commuteError.set('Enter a workplace address or landmark.');
      return;
    }
    if (!this.mapsReady) {
      this.commuteError.set('Google Maps API key is required to calculate live commute times.');
      return;
    }

    this.showSuggestions.set(false);
    this.commuteLoading.set(true);
    this.commuteError.set(null);

    try {
      let workplace = this.selectedWorkplace;
      if (!workplace) {
        workplace = await this.mapsService.resolveWorkplaceFromText(query);
        this.selectedWorkplace = workplace;
      }

      if (!workplace) {
        this.commuteError.set('Could not find that workplace location in the Bay Area.');
        this.commuteLoading.set(false);
        return;
      }

      const { summary, routePath } = await this.mapsService.computeCommute(
        { lat: this.listing.lat, lng: this.listing.lng },
        workplace
      );
      this.commuteSummary.set(summary);
      this.commuteUpdated.emit({ summary, routePath });
    } catch (err) {
      this.commuteError.set(
        err instanceof Error ? err.message : 'Failed to compute commute matrix.'
      );
    } finally {
      this.commuteLoading.set(false);
    }
  }
}
