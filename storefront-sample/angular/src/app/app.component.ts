import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { BookingFormComponent } from './components/booking-form/booking-form.component';
import { ClinicHeaderComponent } from './components/clinic-header/clinic-header.component';
import { ClinicMapComponent } from './components/clinic-map/clinic-map.component';
import { DirectionsPlannerComponent } from './components/directions-planner/directions-planner.component';
import { VenueDetailsComponent } from './components/venue-details/venue-details.component';
import {
  CLINIC_DEFAULT_CENTER,
  ClinicDetails,
  DEFAULT_ORIGIN,
  OriginSelection,
  RouteSummary,
  StreetViewEntranceData,
  TravelModeId,
  ViewMode,
  VisitType,
} from './models/storefront.models';
import { GoogleMapsService } from './services/google-maps.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    ClinicHeaderComponent,
    VenueDetailsComponent,
    DirectionsPlannerComponent,
    BookingFormComponent,
    ClinicMapComponent,
  ],
  template: `
    <div class="app-shell">
      <app-clinic-header
        [clinic]="clinic()"
        [viewMode]="viewMode()"
        [showCoverageOverlay]="showCoverageOverlay()"
        (viewModeChange)="viewMode.set($event)"
        (toggleCoverage)="showCoverageOverlay.set(!showCoverageOverlay())"
      />

      <main class="workspace-grid">
        <aside class="sidebar-column" aria-label="Clinic Details, Directions, and Booking">
          <app-venue-details
            [clinic]="clinic()"
            [loading]="clinicLoading()"
            [errorMessage]="clinicError()"
          />

          <app-directions-planner
            [mapsReady]="mapsReady()"
            [originLabel]="origin().label"
            [travelMode]="travelMode()"
            [routeSummary]="routeSummary()"
            [routeLoading]="routeLoading()"
            [routeError]="routeError()"
            (originChange)="onOriginChange($event)"
            (travelModeChange)="onTravelModeChange($event)"
          />

          <app-booking-form (visitTypeChange)="onVisitTypeChange($event)" />

          <footer class="compliance-footer">
            <span>Maps, Places &amp; Routes powered by Google Maps Platform.</span>
            <a
              href="https://maps.google.com/help/terms_maps/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Maps Terms
            </a>
          </footer>
        </aside>

        <section class="map-column" aria-label="Interactive Clinic Map and Street View">
          <app-clinic-map
            [mapsReady]="mapsReady()"
            [loadError]="mapsError()"
            [clinic]="clinic()"
            [origin]="origin()"
            [routeSummary]="routeSummary()"
            [showCoverageOverlay]="showCoverageOverlay()"
            [viewMode]="viewMode()"
            [streetViewData]="streetViewData()"
          />
        </section>
      </main>
    </div>
  `,
  styles: [
    `
      .app-shell {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        background: var(--bg-page);
      }

      .workspace-grid {
        flex: 1 1 auto;
        display: grid;
        grid-template-columns: 440px minmax(0, 1fr);
        gap: 16px;
        padding: 16px;
        height: calc(100vh - 64px);
        min-height: 580px;
      }

      .sidebar-column {
        display: flex;
        flex-direction: column;
        gap: 14px;
        overflow-y: auto;
        padding-right: 4px;
      }

      .map-column {
        min-height: 540px;
        height: 100%;
      }

      .compliance-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        padding: 6px 4px 12px;
        font-size: 0.74rem;
        color: var(--text-muted);
      }

      @media (max-width: 980px) {
        .workspace-grid {
          grid-template-columns: 1fr;
          height: auto;
        }

        .sidebar-column {
          overflow-y: visible;
          padding-right: 0;
        }

        .map-column {
          min-height: 540px;
          height: 540px;
        }
      }
    `,
  ],
})
export class AppComponent implements OnInit {
  private readonly mapsService = inject(GoogleMapsService);

  readonly mapsReady = signal<boolean>(false);
  readonly mapsError = signal<string | null>(null);

  readonly clinic = signal<ClinicDetails | null>(null);
  readonly clinicLoading = signal<boolean>(true);
  readonly clinicError = signal<string | null>(null);

  readonly origin = signal<OriginSelection>({ ...DEFAULT_ORIGIN });
  readonly travelMode = signal<TravelModeId>('DRIVING');
  readonly routeSummary = signal<RouteSummary | null>(null);
  readonly routeLoading = signal<boolean>(false);
  readonly routeError = signal<string | null>(null);

  readonly showCoverageOverlay = signal<boolean>(true);
  readonly viewMode = signal<ViewMode>('map');
  readonly streetViewData = signal<StreetViewEntranceData | null>(null);

  async ngOnInit(): Promise<void> {
    if (!this.mapsService.hasApiKey()) {
      const msg =
        'GOOGLE_MAPS_API_KEY is not configured. Copy .env.example to .env and add your key.';
      this.mapsError.set(msg);
      this.clinicLoading.set(false);
      this.clinicError.set(msg);
      return;
    }

    try {
      await this.mapsService.ensureLoaded();
      this.mapsReady.set(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load Google Maps JS API.';
      this.mapsError.set(msg);
      this.clinicLoading.set(false);
      this.clinicError.set(msg);
      return;
    }

    await this.loadVenueAndEntrance();
    await this.recalculateRoute();
  }

  async onOriginChange(nextOrigin: OriginSelection): Promise<void> {
    this.origin.set(nextOrigin);
    await this.recalculateRoute();
  }

  async onTravelModeChange(mode: TravelModeId): Promise<void> {
    if (this.travelMode() === mode && this.routeSummary()) {
      return;
    }
    this.travelMode.set(mode);
    await this.recalculateRoute();
  }

  onVisitTypeChange(visitType: VisitType): void {
    if (visitType === 'home-visit') {
      this.showCoverageOverlay.set(true);
    }
  }

  private async loadVenueAndEntrance(): Promise<void> {
    this.clinicLoading.set(true);
    this.clinicError.set(null);

    try {
      const details = await this.mapsService.fetchClinicDetails();
      this.clinic.set(details);
      const sv = await this.mapsService.findEntrancePanorama(details.location);
      this.streetViewData.set(sv);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Unable to retrieve clinic details from Google Places.';
      this.clinicError.set(msg);
      const svFallback = await this.mapsService.findEntrancePanorama(CLINIC_DEFAULT_CENTER);
      this.streetViewData.set(svFallback);
    } finally {
      this.clinicLoading.set(false);
    }
  }

  private async recalculateRoute(): Promise<void> {
    if (!this.mapsReady()) {
      return;
    }

    const destination = this.clinic()?.location ?? CLINIC_DEFAULT_CENTER;
    const currentOrigin = this.origin();
    const mode = this.travelMode();

    this.routeLoading.set(true);
    this.routeError.set(null);

    try {
      const summary = await this.mapsService.computeRoute(
        currentOrigin.location,
        destination,
        mode,
        currentOrigin.label
      );
      this.routeSummary.set(summary);
    } catch (err) {
      this.routeSummary.set(null);
      this.routeError.set(
        err instanceof Error ? err.message : 'Unable to compute route for this travel mode.'
      );
    } finally {
      this.routeLoading.set(false);
    }
  }
}
