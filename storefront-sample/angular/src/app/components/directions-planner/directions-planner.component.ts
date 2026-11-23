import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  ViewChild,
  effect,
  input,
  output,
} from '@angular/core';
import {
  CLINIC_DEFAULT_CENTER,
  DEFAULT_ORIGIN,
  GMP_ATTRIBUTION_ID,
  OriginSelection,
  RouteSummary,
  TravelModeId,
} from '../../models/storefront.models';

@Component({
  selector: 'app-directions-planner',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <section class="card" aria-label="Get Directions Planner">
      <div class="section-head">
        <span class="eyebrow">Get Directions</span>
        <h2 class="card-title">Plan Your Trip to the Clinic</h2>
      </div>

      <div class="field-group">
        <label class="field-label" for="origin-autocomplete-input">Starting Location (San Francisco)</label>
        <div
          class="autocomplete-host"
          data-testid="origin-autocomplete-container"
        >
          @if (mapsReady()) {
            <gmp-place-autocomplete
              #originAutocomplete
              id="origin-autocomplete-input"
              placeholder="Search San Francisco address or landmark..."
              (gmp-select)="onOriginSelect($event)"
            ></gmp-place-autocomplete>
          } @else {
            <input
              type="text"
              class="fallback-input"
              [value]="originLabel()"
              readonly
              aria-label="Origin location"
            />
          }
        </div>
        <div class="origin-helper">
          <span>Active origin: <strong>{{ originLabel() }}</strong></span>
          @if (originLabel() !== defaultOriginLabel) {
            <button type="button" class="reset-origin-btn" (click)="resetToDefaultOrigin()">
              Reset to Ferry Building
            </button>
          }
        </div>
      </div>

      <div class="mode-pills" role="group" aria-label="Travel mode">
        <button
          type="button"
          class="mode-pill"
          [class.active]="travelMode() === 'DRIVING'"
          data-testid="travel-mode-driving"
          (click)="travelModeChange.emit('DRIVING')"
        >
          Driving
        </button>
        <button
          type="button"
          class="mode-pill"
          [class.active]="travelMode() === 'TRANSIT'"
          data-testid="travel-mode-transit"
          (click)="travelModeChange.emit('TRANSIT')"
        >
          Transit
        </button>
        <button
          type="button"
          class="mode-pill"
          [class.active]="travelMode() === 'WALKING'"
          data-testid="travel-mode-walking"
          (click)="travelModeChange.emit('WALKING')"
        >
          Walking
        </button>
      </div>

      <div class="route-summary" data-testid="route-summary-card">
        @if (routeLoading()) {
          <div class="route-loading">Calculating {{ modeDisplayLabel() }} route...</div>
        } @else if (routeError()) {
          <div class="route-error">{{ routeError() }}</div>
        } @else if (routeSummary(); as summary) {
          <div class="summary-grid">
            <div>
              <span class="summary-label">Estimated Time ({{ summary.modeLabel }})</span>
              <strong class="summary-value">{{ summary.durationText }}</strong>
            </div>
            <div>
              <span class="summary-label">Distance</span>
              <strong class="summary-value">{{ summary.distanceText }}</strong>
            </div>
          </div>
          <p class="summary-route-line">
            From {{ summary.originLabel }} to 450 Sutter St
          </p>
        } @else {
          <div class="route-loading">Select an origin to calculate travel time and distance.</div>
        }
      </div>
    </section>
  `,
  styles: [
    `
      .card {
        background: var(--bg-card);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-lg);
        padding: 18px;
        box-shadow: var(--shadow-sm);
      }

      .section-head {
        margin-bottom: 12px;
      }

      .eyebrow {
        display: block;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--brand-primary);
        margin-bottom: 4px;
      }

      .card-title {
        font-size: 1.08rem;
        font-weight: 700;
      }

      .field-group {
        margin-bottom: 12px;
      }

      .field-label {
        display: block;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--text-secondary);
        margin-bottom: 6px;
      }

      .autocomplete-host {
        min-height: 44px;
      }

      .fallback-input {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid var(--border-subtle);
        border-radius: 10px;
        background: var(--bg-subtle);
        color: var(--text-secondary);
        font-size: 0.88rem;
      }

      .origin-helper {
        margin-top: 6px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        font-size: 0.76rem;
        color: var(--text-muted);
      }

      .reset-origin-btn {
        border: none;
        background: transparent;
        color: var(--brand-primary);
        font-weight: 600;
        cursor: pointer;
        padding: 0;
        font-size: 0.76rem;
      }

      .mode-pills {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin-bottom: 12px;
      }

      .mode-pill {
        padding: 9px 10px;
        border-radius: 10px;
        border: 1px solid var(--border-subtle);
        background: #ffffff;
        color: var(--text-secondary);
        font-size: 0.84rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .mode-pill:hover {
        border-color: var(--brand-primary);
        color: var(--brand-primary);
      }

      .mode-pill.active {
        background: var(--brand-primary);
        border-color: var(--brand-primary);
        color: #ffffff;
      }

      .route-summary {
        padding: 12px 14px;
        border-radius: 12px;
        background: var(--brand-soft);
        border: 1px solid #c3e4e7;
      }

      .summary-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .summary-label {
        display: block;
        font-size: 0.74rem;
        color: var(--text-secondary);
        margin-bottom: 2px;
      }

      .summary-value {
        font-size: 1.08rem;
        font-weight: 700;
        color: var(--brand-primary);
      }

      .summary-route-line {
        margin: 8px 0 0;
        font-size: 0.78rem;
        color: var(--text-secondary);
      }

      .route-loading {
        font-size: 0.84rem;
        color: var(--text-secondary);
      }

      .route-error {
        font-size: 0.84rem;
        color: var(--closed-text);
      }
    `,
  ],
})
export class DirectionsPlannerComponent implements AfterViewInit {
  readonly mapsReady = input<boolean>(false);
  readonly originLabel = input<string>(DEFAULT_ORIGIN.label);
  readonly travelMode = input<TravelModeId>('DRIVING');
  readonly routeSummary = input<RouteSummary | null>(null);
  readonly routeLoading = input<boolean>(false);
  readonly routeError = input<string | null>(null);

  readonly originChange = output<OriginSelection>();
  readonly travelModeChange = output<TravelModeId>();

  readonly defaultOriginLabel = DEFAULT_ORIGIN.label;
  private configuredElement = false;

  @ViewChild('originAutocomplete')
  originAutocompleteRef?: ElementRef<google.maps.places.PlaceAutocompleteElement>;

  constructor() {
    effect(() => {
      if (this.mapsReady()) {
        queueMicrotask(() => {
          void this.configureAutocompleteElement();
        });
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.mapsReady()) {
      void this.configureAutocompleteElement();
    }
  }

  modeDisplayLabel(): string {
    switch (this.travelMode()) {
      case 'TRANSIT':
        return 'Public Transit';
      case 'WALKING':
        return 'Walking';
      default:
        return 'Driving';
    }
  }

  resetToDefaultOrigin(): void {
    const el = this.originAutocompleteRef?.nativeElement;
    if (el) {
      el.value = DEFAULT_ORIGIN.label;
    }
    this.originChange.emit({
      label: DEFAULT_ORIGIN.label,
      location: { ...DEFAULT_ORIGIN.location },
    });
  }

  async onOriginSelect(event: Event): Promise<void> {
    const selectEvent = event as google.maps.places.PlacePredictionSelectEvent;
    const prediction = selectEvent?.placePrediction;
    if (!prediction) {
      return;
    }

    try {
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location'],
      });
      if (!place.location) {
        return;
      }
      const label =
        place.formattedAddress || place.displayName || 'Selected San Francisco Origin';
      this.originChange.emit({
        label,
        location: {
          lat: place.location.lat(),
          lng: place.location.lng(),
        },
      });
    } catch (err) {
      console.error('Failed to fetch selected origin details:', err);
    }
  }

  private async configureAutocompleteElement(): Promise<void> {
    if (this.configuredElement) {
      return;
    }
    const el = this.originAutocompleteRef?.nativeElement;
    if (!el) {
      return;
    }

    await customElements.whenDefined('gmp-place-autocomplete');
    el.locationBias = {
      center: CLINIC_DEFAULT_CENTER,
      radius: 30000,
    };
    el.includedRegionCodes = ['us'];
    el.internalUsageAttributionIds = [GMP_ATTRIBUTION_ID];
    if (!el.value) {
      el.value = DEFAULT_ORIGIN.label;
    }
    this.configuredElement = true;
  }
}
