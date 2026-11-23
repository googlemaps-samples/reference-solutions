import {
  CUSTOM_ELEMENTS_SCHEMA,
  Component,
  ElementRef,
  ViewChild,
  effect,
  input,
  output,
} from '@angular/core';
import {
  GMP_ATTRIBUTION_ID,
  LONDON_NEIGHBORHOOD_PRESETS,
  NeighborhoodPreset,
  SEARCH_RADIUS_METERS,
} from '../models/neighborhood.models';

@Component({
  selector: 'app-header-bar',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <header class="app-header">
      <div class="brand-block">
        <div class="brand-mark" aria-hidden="true">LDN</div>
        <div class="brand-text">
          <h1 class="brand-title">Neighborhood Discovery &amp; Spot Mapper</h1>
          <p class="brand-subtitle">
            Central London &middot; {{ activeNeighborhoodLabel() }}
          </p>
        </div>
      </div>

      <div class="header-controls">
        <div class="search-group">
          @if (mapsReady()) {
            <gmp-place-autocomplete
              #autocompleteEl
              id="neighborhood-autocomplete-input"
              data-testid="neighborhood-autocomplete-input"
              class="autocomplete-host"
              placeholder="Search London address or neighborhood..."
              included-region-codes="gb"
              internal-usage-attribution-ids="gmp_git_agentsamples_v1.0.0"
              (gmp-select)="handleAutocompleteSelect($event)"
              (keydown.enter)="triggerGeocodeFromInput()"
            ></gmp-place-autocomplete>
          } @else {
            <input
              id="neighborhood-autocomplete-input"
              data-testid="neighborhood-autocomplete-input"
              class="autocomplete-fallback"
              type="text"
              placeholder="Loading Google Places Autocomplete..."
              disabled
            />
          }
          <button
            type="button"
            id="address-geocode-button"
            data-testid="address-geocode-button"
            class="btn btn-secondary"
            [disabled]="!mapsReady() || isBusy()"
            (click)="triggerGeocodeFromInput()"
          >
            Geocode
          </button>
        </div>

        <label class="sr-only" for="neighborhood-preset-select">
          Select Central London Neighborhood
        </label>
        <select
          id="neighborhood-preset-select"
          data-testid="neighborhood-preset-select"
          class="preset-select"
          [value]="activePresetId()"
          (change)="handlePresetChange($event)"
        >
          @for (preset of presets; track preset.id) {
            <option [value]="preset.id">{{ preset.label }}</option>
          }
        </select>

        <button
          type="button"
          id="radius-toggle-circle"
          data-testid="radius-toggle-circle"
          class="btn btn-pill"
          [class.btn-pill-active]="showRadiusCircle()"
          (click)="toggleRadius.emit()"
        >
          <span class="dot-indicator" aria-hidden="true"></span>
          5 km Radius
        </button>

        <button
          type="button"
          id="toggle-comparison-button"
          data-testid="toggle-comparison-button"
          class="btn btn-primary"
          [class.btn-primary-active]="comparisonOpen()"
          (click)="toggleComparison.emit()"
        >
          Compare ({{ comparisonCount() }}/3)
        </button>
      </div>
    </header>
  `,
  styles: [
    `
      .app-header {
        height: 64px;
        padding: 0 16px;
        background: #0f172a;
        color: #f8fafc;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        border-bottom: 1px solid #1e293b;
        position: relative;
        z-index: 30;
      }

      .brand-block {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        flex-shrink: 0;
      }

      .brand-mark {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: linear-gradient(135deg, #38bdf8, #2563eb);
        color: #ffffff;
        font-weight: 800;
        font-size: 12px;
        letter-spacing: 0.06em;
        display: grid;
        place-items: center;
        flex-shrink: 0;
      }

      .brand-text {
        min-width: 0;
      }

      .brand-title {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
        line-height: 1.2;
        white-space: nowrap;
      }

      .brand-subtitle {
        margin: 0;
        font-size: 12px;
        color: #94a3b8;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .header-controls {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        justify-content: flex-end;
        min-width: 0;
      }

      .search-group {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 1;
        max-width: 380px;
        min-width: 210px;
      }

      .autocomplete-host {
        display: block;
        width: 100%;
        min-width: 160px;
        height: 38px;
        border-radius: 8px;
        background: #ffffff;
        color: #0f172a;
        color-scheme: light;
        --gmp-mat-color-surface: #ffffff;
      }

      .autocomplete-fallback {
        width: 100%;
        height: 38px;
        border-radius: 8px;
        border: 1px solid #334155;
        background: #1e293b;
        color: #94a3b8;
        padding: 0 12px;
        font-size: 13px;
      }

      .preset-select {
        height: 38px;
        border-radius: 8px;
        border: 1px solid #334155;
        background: #1e293b;
        color: #f8fafc;
        padding: 0 10px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        max-width: 190px;
      }

      .btn {
        height: 38px;
        padding: 0 12px;
        border-radius: 8px;
        border: 1px solid transparent;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
        transition: background-color 0.15s ease, border-color 0.15s ease;
      }

      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn-secondary {
        background: #1e293b;
        border-color: #334155;
        color: #e2e8f0;
      }

      .btn-secondary:hover:not(:disabled) {
        background: #334155;
      }

      .btn-pill {
        background: #1e293b;
        border-color: #334155;
        color: #cbd5e1;
      }

      .btn-pill-active {
        background: rgba(14, 165, 233, 0.18);
        border-color: #38bdf8;
        color: #7dd3fc;
      }

      .dot-indicator {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: currentColor;
      }

      .btn-primary {
        background: #2563eb;
        color: #ffffff;
      }

      .btn-primary:hover {
        background: #1d4ed8;
      }

      .btn-primary-active {
        background: #0284c7;
        box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.35);
      }

      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
      }

      @media (max-width: 1120px) {
        .app-header {
          height: auto;
          min-height: 64px;
          padding: 10px 12px;
          flex-wrap: wrap;
        }
        .header-controls {
          width: 100%;
          flex-wrap: wrap;
          justify-content: flex-start;
        }
        .search-group {
          max-width: none;
          min-width: 240px;
        }
      }
    `,
  ],
})
export class HeaderBarComponent {
  readonly mapsReady = input.required<boolean>();
  readonly isBusy = input<boolean>(false);
  readonly activePresetId = input.required<string>();
  readonly activeNeighborhoodLabel = input.required<string>();
  readonly searchCenter = input.required<google.maps.LatLngLiteral>();
  readonly showRadiusCircle = input.required<boolean>();
  readonly comparisonCount = input.required<number>();
  readonly comparisonOpen = input.required<boolean>();

  readonly placeSelected = output<google.maps.places.PlacePrediction>();
  readonly geocodeRequested = output<string>();
  readonly presetSelected = output<NeighborhoodPreset>();
  readonly toggleRadius = output<void>();
  readonly toggleComparison = output<void>();

  readonly presets = LONDON_NEIGHBORHOOD_PRESETS;

  @ViewChild('autocompleteEl')
  private autocompleteRef?: ElementRef<google.maps.places.PlaceAutocompleteElement>;

  constructor() {
    effect(() => {
      const ready = this.mapsReady();
      const center = this.searchCenter();
      const el = this.autocompleteRef?.nativeElement;
      if (ready && el) {
        el.locationBias = {
          center,
          radius: SEARCH_RADIUS_METERS,
        };
        el.internalUsageAttributionIds = [GMP_ATTRIBUTION_ID];
      }
    });
  }

  handleAutocompleteSelect(event: Event): void {
    const selectEvent = event as google.maps.places.PlacePredictionSelectEvent;
    if (selectEvent?.placePrediction) {
      this.placeSelected.emit(selectEvent.placePrediction);
    }
  }

  triggerGeocodeFromInput(): void {
    const value = this.autocompleteRef?.nativeElement?.value?.trim() || '';
    if (value) {
      this.geocodeRequested.emit(value);
      return;
    }
    this.geocodeRequested.emit(this.activeNeighborhoodLabel());
  }

  handlePresetChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const found = this.presets.find((p) => p.id === select.value);
    if (found) {
      this.presetSelected.emit(found);
    }
  }
}
