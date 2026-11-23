import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChapterTourComponent } from './components/chapter-tour/chapter-tour.component';
import { ElevationProfileComponent } from './components/elevation-profile/elevation-profile.component';
import { TrailMap2dComponent } from './components/trail-map-2d/trail-map-2d.component';
import {
  CameraFlyTarget,
  TrailMap3dComponent,
} from './components/trail-map-3d/trail-map-3d.component';
import {
  CameraTelemetry,
  ElevationSample,
  INITIAL_CENTER,
  SEED_SEARCH_QUERY,
  SelectedViewpointInfo,
  TOUR_CHAPTERS,
  TourChapter,
  TrailMetrics,
} from './data/tahoe-trail.data';
import { MapsLoaderService } from './services/maps-loader.service';
import { TrailGeospatialService } from './services/trail-geospatial.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChapterTourComponent,
    ElevationProfileComponent,
    TrailMap3dComponent,
    TrailMap2dComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="explorer-shell" data-testid="trail-explorer-app">
      <!-- Full-bleed Map Canvas -->
      <main class="map-stage" data-testid="map-3d-container">
        @if (viewMode === '3d') {
          <app-trail-map-3d
            [flyTarget]="flyTarget"
            [mapMode]="map3dStyleMode"
            [searchedPlace]="searchedPlaceMarker"
            [hoveredElevationSample]="hoveredElevationSample"
            (telemetryChange)="onTelemetryChange($event)"
            (chapterSelected)="selectChapter($event)"
          />
        } @else {
          <app-trail-map-2d
            [searchedPlace]="searchedPlaceMarker"
            (chapterSelected)="selectChapter($event)"
          />
        }
      </main>

      <!-- Floating Glassmorphic Top Header -->
      <header class="floating-header">
        <div class="brand-group">
          <div class="brand-badge">3D</div>
          <div class="brand-text">
            <h1>Lake Tahoe 3D Trail Explorer</h1>
            <p>Emerald Bay · Rubicon Trail Story Map</p>
          </div>
        </div>

        <div class="search-cluster">
          <form class="search-form" (submit)="onSearchSubmit($event)">
            <input
              type="text"
              class="search-input"
              data-testid="landmark-search-input"
              [(ngModel)]="searchQuery"
              name="landmarkSearch"
              placeholder="Search Tahoe landmark (e.g. Vikingsholm, Eagle Rock)…"
              aria-label="Search Lake Tahoe landmark"
            />
            <button
              type="submit"
              class="search-submit"
              data-testid="landmark-search-submit"
              [disabled]="searchLoading"
            >
              {{ searchLoading ? 'Flying…' : 'Fly To' }}
            </button>
          </form>

          <div
            #autocompleteSlot
            class="autocomplete-slot"
            title="Google Places Autocomplete"
          ></div>
        </div>

        <div class="header-controls">
          <div class="segmented-control" role="group" aria-label="Map Dimension">
            <button
              type="button"
              class="seg-btn"
              [class.active]="viewMode === '3d'"
              (click)="setViewMode('3d')"
            >
              3D Terrain
            </button>
            <button
              type="button"
              class="seg-btn"
              [class.active]="viewMode === '2d'"
              (click)="setViewMode('2d')"
            >
              2D Map
            </button>
          </div>

          @if (viewMode === '3d') {
            <button
              type="button"
              class="mode-pill"
              (click)="toggleMap3dStyle()"
              title="Toggle 3D Map Mode (HYBRID / SATELLITE)"
            >
              {{ map3dStyleMode }}
            </button>
          }

          <div
            class="telemetry-badge"
            data-testid="camera-telemetry-badge"
            aria-label="Live 3D camera telemetry"
          >
            <span>HDG {{ telemetry.heading | number: '1.0-0' }}°</span>
            <span class="sep">·</span>
            <span>TILT {{ telemetry.tilt | number: '1.0-0' }}°</span>
            <span class="sep">·</span>
            <span>RNG {{ telemetry.range | number: '1.0-0' }}m</span>
          </div>
        </div>
      </header>

      <!-- Floating Left Sidebar -->
      <aside class="floating-sidebar" [class.collapsed]="mobileDrawerCollapsed">
        <div class="mobile-drawer-bar">
          <span>Trail Story &amp; Elevation</span>
          <button
            type="button"
            class="drawer-toggle"
            (click)="mobileDrawerCollapsed = !mobileDrawerCollapsed"
          >
            {{ mobileDrawerCollapsed ? 'Expand' : 'Collapse' }}
          </button>
        </div>

        <div class="sidebar-scroll">
          @if (!hasApiKey) {
            <div class="api-warning-banner" role="alert">
              <strong>API Key Needed:</strong> Add
              <code>GOOGLE_MAPS_API_KEY</code> to <code>.env</code> and restart
              <code>serve-dist.mjs</code> to load 3D Tiles, Places, and Elevation
              data.
            </div>
          }

          @if (searchError) {
            <div class="search-error-banner" role="status">
              {{ searchError }}
            </div>
          }

          <app-chapter-tour
            [chapters]="chapters"
            [activeChapterId]="activeChapterId"
            [isAutoPlaying]="isAutoPlaying"
            (selectChapter)="selectChapter($event)"
            (toggleAutoPlay)="toggleAutoPlay()"
          />

          <section class="viewpoint-card" data-testid="selected-viewpoint-card">
            <div class="card-top">
              <span class="eyebrow">
                {{
                  selectedViewpoint.source === 'places-search'
                    ? 'Places API (New) Result'
                    : selectedViewpoint.source === 'elevation-sample'
                      ? 'Elevation Profile Sample'
                      : 'Active Trail Chapter'
                }}
              </span>
              @if (
                selectedViewpoint.elevationMeters !== null &&
                selectedViewpoint.elevationMeters !== undefined
              ) {
                <span class="elev-badge">
                  {{ selectedViewpoint.elevationMeters | number: '1.0-0' }} m
                  ({{
                    selectedViewpoint.elevationMeters * 3.28084
                      | number: '1.0-0'
                  }}
                  ft)
                </span>
              }
            </div>

            <h3>{{ selectedViewpoint.title }}</h3>
            <p class="viewpoint-sub">{{ selectedViewpoint.subtitle }}</p>

            @if (selectedViewpoint.address) {
              <p class="viewpoint-address">{{ selectedViewpoint.address }}</p>
            }
            @if (selectedViewpoint.description) {
              <p class="viewpoint-desc">{{ selectedViewpoint.description }}</p>
            }

            <div class="viewpoint-meta-row">
              <span class="coords">
                {{ selectedViewpoint.lat | number: '1.4-4' }},
                {{ selectedViewpoint.lng | number: '1.4-4' }}
              </span>

              @if (selectedViewpoint.rating) {
                <span class="rating-pill">
                  ★ {{ selectedViewpoint.rating | number: '1.1-1' }}
                  @if (selectedViewpoint.userRatingCount) {
                    ({{ selectedViewpoint.userRatingCount }})
                  }
                </span>
              }
            </div>

            @if (selectedViewpoint.googleMapsUri) {
              <a
                class="gmaps-link"
                [href]="selectedViewpoint.googleMapsUri"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Google Maps ↗
              </a>
            }
          </section>

          <app-elevation-profile
            [samples]="elevationSamples"
            [metrics]="trailMetrics"
            [loading]="elevationLoading"
            [errorMessage]="elevationError"
            (hoverSample)="onElevationHover($event)"
            (selectSample)="onElevationSelect($event)"
          />
        </div>
      </aside>
    </div>
  `,
  styles: [
    `
      .explorer-shell {
        position: relative;
        width: 100%;
        height: 100vh;
        min-height: 600px;
        overflow: hidden;
        background: #060b14;
        display: flex;
      }

      .map-stage {
        position: relative;
        flex: 1;
        width: 100%;
        height: 100%;
        min-width: 300px;
        min-height: 520px;
      }

      /* Floating Top Glassmorphic Header */
      .floating-header {
        position: absolute;
        top: 14px;
        left: 14px;
        right: 14px;
        z-index: 20;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding: 10px 14px;
        border-radius: 16px;
        background: var(--bg-glass);
        border: 1px solid var(--border-glass);
        backdrop-filter: blur(16px);
        box-shadow: var(--shadow-glass);
      }

      .brand-group {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        flex-shrink: 0;
      }

      .brand-badge {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: linear-gradient(135deg, #ef4444, #b91c1c);
        color: #ffffff;
        font-weight: 800;
        font-size: 13px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);
        flex-shrink: 0;
      }

      .brand-text h1 {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
        color: #f8fafc;
        letter-spacing: -0.01em;
        white-space: nowrap;
      }

      .brand-text p {
        margin: 1px 0 0;
        font-size: 11px;
        color: #94a3b8;
        white-space: nowrap;
      }

      .search-cluster {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        max-width: 560px;
        min-width: 240px;
      }

      .search-form {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 1;
        min-width: 0;
      }

      .search-input {
        flex: 1;
        min-width: 140px;
        height: 36px;
        padding: 0 12px;
        border-radius: 10px;
        border: 1px solid rgba(148, 163, 184, 0.25);
        background: rgba(15, 23, 42, 0.85);
        color: #f8fafc;
        font-size: 12.5px;
        outline: none;
        transition: border-color 0.16s ease;
      }

      .search-input::placeholder {
        color: #64748b;
      }

      .search-input:focus {
        border-color: #38bdf8;
      }

      .search-submit {
        height: 36px;
        padding: 0 13px;
        border-radius: 10px;
        border: 1px solid rgba(239, 68, 68, 0.65);
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: #ffffff;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        transition: opacity 0.16s ease, transform 0.16s ease;
      }

      .search-submit:hover:not(:disabled) {
        transform: translateY(-1px);
      }

      .search-submit:disabled {
        opacity: 0.6;
        cursor: wait;
      }

      .autocomplete-slot {
        width: 190px;
        flex-shrink: 0;
      }

      .header-controls {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }

      .segmented-control {
        display: inline-flex;
        padding: 2px;
        border-radius: 10px;
        background: rgba(15, 23, 42, 0.85);
        border: 1px solid rgba(148, 163, 184, 0.2);
      }

      .seg-btn {
        border: none;
        background: transparent;
        color: #94a3b8;
        font-size: 11.5px;
        font-weight: 600;
        padding: 6px 10px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .seg-btn.active {
        background: rgba(56, 189, 248, 0.2);
        color: #e0f2fe;
      }

      .mode-pill {
        height: 32px;
        padding: 0 10px;
        border-radius: 9px;
        border: 1px solid rgba(148, 163, 184, 0.24);
        background: rgba(15, 23, 42, 0.78);
        color: #cbd5e1;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
        cursor: pointer;
      }

      .mode-pill:hover {
        border-color: rgba(56, 189, 248, 0.5);
        color: #f8fafc;
      }

      .telemetry-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 11px;
        border-radius: 10px;
        background: rgba(2, 6, 23, 0.78);
        border: 1px solid rgba(56, 189, 248, 0.28);
        color: #bae6fd;
        font-size: 11px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }

      .telemetry-badge .sep {
        color: #475569;
      }

      /* Floating Left Sidebar */
      .floating-sidebar {
        position: absolute;
        top: 84px;
        left: 14px;
        bottom: 14px;
        width: 360px;
        z-index: 18;
        border-radius: 16px;
        background: var(--bg-glass);
        border: 1px solid var(--border-glass);
        backdrop-filter: blur(16px);
        box-shadow: var(--shadow-glass);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .mobile-drawer-bar {
        display: none;
      }

      .sidebar-scroll {
        flex: 1;
        overflow-y: auto;
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .api-warning-banner {
        padding: 10px 12px;
        border-radius: 10px;
        background: rgba(120, 53, 15, 0.55);
        border: 1px solid rgba(251, 191, 36, 0.45);
        color: #fef3c7;
        font-size: 11.5px;
        line-height: 1.45;
      }

      .api-warning-banner code {
        background: rgba(0, 0, 0, 0.35);
        padding: 1px 4px;
        border-radius: 4px;
      }

      .search-error-banner {
        padding: 8px 10px;
        border-radius: 8px;
        background: rgba(127, 29, 29, 0.55);
        border: 1px solid rgba(248, 113, 113, 0.45);
        color: #fecaca;
        font-size: 11.5px;
      }

      .viewpoint-card {
        background: rgba(15, 23, 42, 0.72);
        border: 1px solid rgba(148, 163, 184, 0.18);
        border-radius: 12px;
        padding: 11px 12px;
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .eyebrow {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #38bdf8;
      }

      .elev-badge {
        font-size: 10.5px;
        font-weight: 600;
        color: #a7f3d0;
        background: rgba(16, 185, 129, 0.16);
        border: 1px solid rgba(52, 211, 153, 0.38);
        padding: 2px 7px;
        border-radius: 999px;
      }

      .viewpoint-card h3 {
        margin: 2px 0 0;
        font-size: 14px;
        font-weight: 700;
        color: #f8fafc;
      }

      .viewpoint-sub {
        margin: 0;
        font-size: 12px;
        color: #cbd5e1;
      }

      .viewpoint-address {
        margin: 0;
        font-size: 11px;
        color: #94a3b8;
      }

      .viewpoint-desc {
        margin: 2px 0 0;
        font-size: 11.5px;
        line-height: 1.45;
        color: #cbd5e1;
      }

      .viewpoint-meta-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-top: 3px;
      }

      .coords {
        font-size: 11px;
        font-variant-numeric: tabular-nums;
        color: #94a3b8;
      }

      .rating-pill {
        font-size: 11px;
        font-weight: 600;
        color: #fde68a;
        background: rgba(245, 158, 11, 0.16);
        border: 1px solid rgba(251, 191, 36, 0.35);
        padding: 2px 7px;
        border-radius: 999px;
      }

      .gmaps-link {
        margin-top: 4px;
        font-size: 11.5px;
        font-weight: 600;
        color: #38bdf8;
        text-decoration: none;
        align-self: flex-start;
      }

      .gmaps-link:hover {
        text-decoration: underline;
      }

      @media (max-width: 1160px) {
        .autocomplete-slot {
          display: none;
        }
      }

      @media (max-width: 900px) {
        .explorer-shell {
          flex-direction: column;
          height: auto;
          min-height: 100vh;
          overflow: visible;
        }

        .map-stage {
          height: 58vh;
          min-height: 460px;
        }

        .floating-header {
          position: relative;
          top: 0;
          left: 0;
          right: 0;
          border-radius: 0;
          flex-wrap: wrap;
          order: -1;
        }

        .floating-sidebar {
          position: relative;
          top: auto;
          left: auto;
          bottom: auto;
          width: 100%;
          border-radius: 0;
          max-height: none;
        }

        .floating-sidebar.collapsed .sidebar-scroll {
          display: none;
        }

        .mobile-drawer-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.16);
          font-size: 12.5px;
          font-weight: 600;
        }

        .drawer-toggle {
          padding: 4px 10px;
          border-radius: 8px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(15, 23, 42, 0.8);
          color: #f8fafc;
          font-size: 11.5px;
          cursor: pointer;
        }
      }
    `,
  ],
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('autocompleteSlot')
  private autocompleteSlotRef?: ElementRef<HTMLDivElement>;

  private readonly mapsLoader = inject(MapsLoaderService);
  private readonly geospatialService = inject(TrailGeospatialService);
  private readonly ngZone = inject(NgZone);

  readonly chapters = TOUR_CHAPTERS;
  readonly hasApiKey = this.mapsLoader.hasApiKey();

  activeChapterId: string | null = TOUR_CHAPTERS[0].id;
  isAutoPlaying = false;
  viewMode: '3d' | '2d' = '3d';
  map3dStyleMode: 'HYBRID' | 'SATELLITE' = 'HYBRID';
  mobileDrawerCollapsed = false;

  searchQuery = '';
  searchLoading = false;
  searchError: string | null = null;

  elevationSamples: ElevationSample[] = [];
  trailMetrics: TrailMetrics | null = null;
  elevationLoading = false;
  elevationError: string | null = null;
  hoveredElevationSample: ElevationSample | null = null;

  telemetry: CameraTelemetry = {
    lat: INITIAL_CENTER.lat,
    lng: INITIAL_CENTER.lng,
    altitude: INITIAL_CENTER.altitude,
    heading: TOUR_CHAPTERS[0].camera.heading,
    tilt: TOUR_CHAPTERS[0].camera.tilt,
    range: TOUR_CHAPTERS[0].camera.range,
  };

  flyTarget: CameraFlyTarget | null = null;
  private flyNonce = 0;

  selectedViewpoint: SelectedViewpointInfo = {
    title: TOUR_CHAPTERS[0].title,
    subtitle: TOUR_CHAPTERS[0].subtitle,
    description: TOUR_CHAPTERS[0].description,
    lat: TOUR_CHAPTERS[0].camera.center.lat,
    lng: TOUR_CHAPTERS[0].camera.center.lng,
    source: 'trail-chapter',
  };

  searchedPlaceMarker: SelectedViewpointInfo | null = null;

  private autoPlayTimer: ReturnType<typeof setInterval> | null = null;
  private autocompleteElement: google.maps.places.PlaceAutocompleteElement | null =
    null;
  private autocompleteCleanup: (() => void) | null = null;

  ngOnInit(): void {
    if (this.hasApiKey) {
      void this.loadLiveElevationProfile();
      void this.runSeedLandmarkLookup();
    } else {
      this.elevationError = 'Elevation API requires GOOGLE_MAPS_API_KEY.';
    }
  }

  async ngAfterViewInit(): Promise<void> {
    if (!this.hasApiKey || !this.autocompleteSlotRef) {
      return;
    }
    await this.mountPlaceAutocomplete();
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
    if (this.autocompleteCleanup) {
      this.autocompleteCleanup();
      this.autocompleteCleanup = null;
    }
  }

  private async mountPlaceAutocomplete(): Promise<void> {
    try {
      const { PlaceAutocompleteElement } =
        await this.mapsLoader.loadPlacesLibrary();

      const slot = this.autocompleteSlotRef?.nativeElement;
      if (!slot) return;

      const autocomplete = new PlaceAutocompleteElement({
        locationBias: {
          north: 39.25,
          south: 38.82,
          east: -119.85,
          west: -120.32,
        },
      });
      autocomplete.setAttribute('aria-label', 'Landmark autocomplete search');

      const onSelect = async (event: Event) => {
        const selectEvent =
          event as google.maps.places.PlacePredictionSelectEvent;
        if (!selectEvent.placePrediction) return;

        this.ngZone.run(() => {
          this.searchLoading = true;
          this.searchError = null;
          this.stopAutoPlay();
        });

        try {
          const info = await this.geospatialService.resolvePlacePrediction(
            selectEvent.placePrediction
          );
          this.ngZone.run(() => {
            if (info) {
              this.applySearchedLandmark(info);
            }
            this.searchLoading = false;
          });
        } catch {
          this.ngZone.run(() => {
            this.searchError = 'Unable to load details for selected place.';
            this.searchLoading = false;
          });
        }
      };

      autocomplete.addEventListener('gmp-select', onSelect);
      slot.replaceChildren(autocomplete);
      this.autocompleteElement = autocomplete;
      this.autocompleteCleanup = () => {
        autocomplete.removeEventListener('gmp-select', onSelect);
      };
    } catch {
      // Autocomplete widget optional when API key is missing/restricted
    }
  }

  private async loadLiveElevationProfile(): Promise<void> {
    this.elevationLoading = true;
    this.elevationError = null;
    try {
      const { samples, metrics } =
        await this.geospatialService.fetchTrailElevationProfile(64);
      this.elevationSamples = samples;
      this.trailMetrics = metrics;
    } catch {
      this.elevationError =
        'Unable to fetch live Elevation API profile. Check API key enablement.';
    } finally {
      this.elevationLoading = false;
    }
  }

  private async runSeedLandmarkLookup(): Promise<void> {
    try {
      const seedResult =
        await this.geospatialService.searchLandmarkByText(SEED_SEARCH_QUERY);
      if (seedResult && this.activeChapterId === TOUR_CHAPTERS[0].id) {
        this.selectedViewpoint = {
          ...seedResult,
          subtitle: TOUR_CHAPTERS[0].subtitle,
          description: TOUR_CHAPTERS[0].description,
          source: 'trail-chapter',
        };
      }
    } catch {
      // Non-fatal if Places API (New) is not enabled on key
    }
  }

  selectChapter(chapter: TourChapter): void {
    this.activeChapterId = chapter.id;
    this.searchError = null;

    this.flyNonce += 1;
    this.flyTarget = {
      center: { ...chapter.camera.center },
      heading: chapter.camera.heading,
      tilt: chapter.camera.tilt,
      range: chapter.camera.range,
      durationMillis: 2400,
      nonce: this.flyNonce,
    };

    this.selectedViewpoint = {
      title: chapter.title,
      subtitle: chapter.subtitle,
      description: chapter.description,
      lat: chapter.markerPosition.lat,
      lng: chapter.markerPosition.lng,
      source: 'trail-chapter',
    };

    void this.geospatialService
      .fetchPointElevation(chapter.markerPosition.lat, chapter.markerPosition.lng)
      .then((elev) => {
        if (this.activeChapterId === chapter.id && elev !== null) {
          this.selectedViewpoint = {
            ...this.selectedViewpoint,
            elevationMeters: elev,
          };
        }
      });
  }

  toggleAutoPlay(): void {
    if (this.isAutoPlaying) {
      this.stopAutoPlay();
      return;
    }
    this.isAutoPlaying = true;
    const advance = () => {
      const currentIdx = this.chapters.findIndex(
        (ch) => ch.id === this.activeChapterId
      );
      const nextIdx = (currentIdx + 1) % this.chapters.length;
      this.selectChapter(this.chapters[nextIdx]);
    };
    advance();
    this.autoPlayTimer = setInterval(advance, 5500);
  }

  private stopAutoPlay(): void {
    if (this.autoPlayTimer !== null) {
      clearInterval(this.autoPlayTimer);
      this.autoPlayTimer = null;
    }
    this.isAutoPlaying = false;
  }

  async onSearchSubmit(event: Event): Promise<void> {
    event.preventDefault();
    const query = this.searchQuery.trim();
    if (!query) return;

    this.stopAutoPlay();
    this.searchError = null;

    if (!this.hasApiKey) {
      this.searchError =
        'Configure GOOGLE_MAPS_API_KEY in .env to search Lake Tahoe landmarks.';
      return;
    }

    this.searchLoading = true;
    try {
      const result = await this.geospatialService.searchLandmarkByText(query);
      if (!result) {
        this.searchError = `No place found for "${query}". Try "Emerald Bay State Park" or "Vikingsholm".`;
      } else {
        this.applySearchedLandmark(result);
      }
    } catch {
      this.searchError =
        'Places search failed. Ensure Places API (New) is enabled on your key.';
    } finally {
      this.searchLoading = false;
    }
  }

  private applySearchedLandmark(info: SelectedViewpointInfo): void {
    this.activeChapterId = null;
    this.selectedViewpoint = info;
    this.searchedPlaceMarker = info;

    const altitude = info.elevationMeters ? info.elevationMeters + 80 : 1960;
    this.flyNonce += 1;
    this.flyTarget = {
      center: {
        lat: info.lat,
        lng: info.lng,
        altitude,
      },
      heading: 38,
      tilt: 68,
      range: 1400,
      durationMillis: 2300,
      nonce: this.flyNonce,
    };
  }

  onTelemetryChange(telemetry: CameraTelemetry): void {
    this.telemetry = telemetry;
  }

  onElevationHover(sample: ElevationSample | null): void {
    this.hoveredElevationSample = sample;
  }

  onElevationSelect(sample: ElevationSample): void {
    this.stopAutoPlay();
    this.activeChapterId = null;

    this.flyNonce += 1;
    this.flyTarget = {
      center: {
        lat: sample.lat,
        lng: sample.lng,
        altitude: sample.elevationMeters + 45,
      },
      heading: this.telemetry.heading,
      tilt: 68,
      range: 900,
      durationMillis: 1800,
      nonce: this.flyNonce,
    };

    this.selectedViewpoint = {
      title: `Trail Milepost (${sample.distanceKm.toFixed(2)} km)`,
      subtitle: 'Live Elevation API Sample Point',
      lat: sample.lat,
      lng: sample.lng,
      elevationMeters: sample.elevationMeters,
      description: `Interpolated resolution: ${sample.resolutionMeters.toFixed(1)} m along the Rubicon Trail corridor.`,
      source: 'elevation-sample',
    };
  }

  setViewMode(mode: '3d' | '2d'): void {
    this.viewMode = mode;
    if (mode === '2d') {
      this.stopAutoPlay();
    }
  }

  toggleMap3dStyle(): void {
    this.map3dStyleMode =
      this.map3dStyleMode === 'HYBRID' ? 'SATELLITE' : 'HYBRID';
  }
}
