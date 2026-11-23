import {
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
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { importLibrary } from '@googlemaps/js-api-loader';
import {
  BaseMapType,
  SelectedLocation,
  UnitsSystem,
} from '../../models/environment.models';
import { MapsLoaderService } from '../../services/maps-loader.service';

@Component({
  selector: 'app-header-bar',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <header class="top-header">
      <div class="brand-group">
        <div class="brand-icon" aria-hidden="true">☀</div>
        <div class="brand-text">
          <span class="brand-title">EnviroPulse</span>
          <span class="brand-subtitle">Weather · AQI · Pollen · Solar</span>
        </div>
      </div>

      <div
        class="autocomplete-wrapper"
        data-testid="places-autocomplete-container"
        #autocompleteHost
      >
        @if (!mapsReady) {
          <input
            type="text"
            class="autocomplete-fallback"
            placeholder="Search address or city (configure GOOGLE_MAPS_API_KEY)..."
            [disabled]="!hasApiKey"
            aria-label="Search address or city"
          />
        }
      </div>

      <div class="controls-group">
        <div
          class="location-badge"
          data-testid="active-location-badge"
          [title]="activeLocation.formattedAddress"
        >
          <span class="badge-dot"></span>
          <span class="badge-name">{{ activeLocation.name }}</span>
          <span class="badge-coords">
            {{ activeLocation.lat.toFixed(4) }}, {{ activeLocation.lng.toFixed(4) }}
          </span>
        </div>

        <button
          type="button"
          class="ctrl-btn"
          data-testid="reset-phoenix-btn"
          (click)="resetPhoenix.emit()"
          title="Reset to Phoenix City Hall"
        >
          Phoenix Seed
        </button>

        <button
          type="button"
          class="ctrl-btn"
          data-testid="units-toggle-btn"
          (click)="toggleUnits.emit()"
          title="Toggle Imperial / Metric units"
        >
          {{ unitsSystem === 'IMPERIAL' ? '°F · mph' : '°C · km/h' }}
        </button>

        <button
          type="button"
          class="ctrl-btn"
          [class.ctrl-btn-active]="showAqiLayer"
          data-testid="aqi-layer-toggle"
          (click)="toggleAqiLayer.emit()"
          [attr.aria-pressed]="showAqiLayer"
          title="Toggle US AQI heatmap tile overlay"
        >
          AQI Layer: {{ showAqiLayer ? 'ON' : 'OFF' }}
        </button>

        <button
          type="button"
          class="ctrl-btn"
          [class.ctrl-btn-active]="mapType === 'hybrid'"
          data-testid="map-type-toggle"
          (click)="toggleMapType.emit()"
          title="Switch between Roadmap and Satellite Hybrid view"
        >
          {{ mapType === 'hybrid' ? 'Satellite' : 'Roadmap' }}
        </button>
      </div>
    </header>
  `,
  styles: [
    `
      :host {
        display: block;
        flex: 0 0 auto;
        width: 100%;
      }

      .top-header {
        height: 64px;
        min-height: 64px;
        background: #0f172a;
        color: #f8fafc;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding: 0 18px;
        border-bottom: 1px solid #1e293b;
        z-index: 20;
      }

      .brand-group {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
      }

      .brand-icon {
        width: 34px;
        height: 34px;
        border-radius: 9px;
        background: linear-gradient(135deg, #0284c7, #0d9488);
        display: grid;
        place-items: center;
        font-size: 18px;
        color: #ffffff;
        box-shadow: 0 2px 8px rgba(2, 132, 199, 0.4);
      }

      .brand-text {
        display: flex;
        flex-direction: column;
        line-height: 1.15;
      }

      .brand-title {
        font-size: 15px;
        font-weight: 700;
        letter-spacing: -0.01em;
      }

      .brand-subtitle {
        font-size: 11px;
        color: #94a3b8;
        font-weight: 500;
      }

      .autocomplete-wrapper {
        flex: 1 1 300px;
        max-width: 420px;
        min-width: 220px;
      }

      .autocomplete-fallback {
        width: 100%;
        height: 38px;
        padding: 0 12px;
        border-radius: 8px;
        border: 1px solid #334155;
        background: #1e293b;
        color: #cbd5e1;
        font-size: 13px;
      }

      .controls-group {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }

      .location-badge {
        display: flex;
        align-items: center;
        gap: 7px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 6px 10px;
        font-size: 12px;
        max-width: 260px;
      }

      .badge-dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: #10b981;
        flex-shrink: 0;
      }

      .badge-name {
        font-weight: 600;
        color: #f1f5f9;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .badge-coords {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        color: #94a3b8;
        flex-shrink: 0;
      }

      .ctrl-btn {
        height: 34px;
        padding: 0 11px;
        border-radius: 8px;
        border: 1px solid #334155;
        background: #1e293b;
        color: #e2e8f0;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.15s ease, border-color 0.15s ease;
      }

      .ctrl-btn:hover {
        background: #334155;
        border-color: #475569;
      }

      .ctrl-btn-active {
        background: #0284c7;
        border-color: #38bdf8;
        color: #ffffff;
      }

      .ctrl-btn-active:hover {
        background: #0369a1;
      }

      @media (max-width: 1180px) {
        .location-badge {
          display: none;
        }
      }

      @media (max-width: 900px) {
        .top-header {
          height: auto;
          flex-wrap: wrap;
          padding: 10px 14px;
        }

        .autocomplete-wrapper {
          order: 3;
          flex: 1 1 100%;
          max-width: 100%;
        }

        .controls-group {
          flex-wrap: wrap;
        }
      }
    `,
  ],
})
export class HeaderBarComponent implements OnChanges, OnDestroy {
  private readonly mapsLoader = inject(MapsLoaderService);

  @Input({ required: true }) activeLocation!: SelectedLocation;
  @Input({ required: true }) unitsSystem!: UnitsSystem;
  @Input({ required: true }) showAqiLayer!: boolean;
  @Input({ required: true }) mapType!: BaseMapType;
  @Input({ required: true }) mapsReady!: boolean;

  @Output() placeSelected = new EventEmitter<SelectedLocation>();
  @Output() resetPhoenix = new EventEmitter<void>();
  @Output() toggleUnits = new EventEmitter<void>();
  @Output() toggleAqiLayer = new EventEmitter<void>();
  @Output() toggleMapType = new EventEmitter<void>();

  @ViewChild('autocompleteHost', { static: true })
  private readonly autocompleteHost!: ElementRef<HTMLDivElement>;

  private autocompleteEl: google.maps.places.PlaceAutocompleteElement | null = null;
  private mounted = false;

  get hasApiKey(): boolean {
    return this.mapsLoader.hasApiKey();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mapsReady'] && this.mapsReady && !this.mounted) {
      void this.mountPlaceAutocomplete();
    }
  }

  ngOnDestroy(): void {
    if (this.autocompleteEl) {
      this.autocompleteEl.remove();
      this.autocompleteEl = null;
    }
  }

  private async mountPlaceAutocomplete(): Promise<void> {
    if (this.mounted) {
      return;
    }
    this.mounted = true;

    try {
      const { PlaceAutocompleteElement } = await importLibrary('places');
      const el = new PlaceAutocompleteElement({
        placeholder: 'Search any address, building, or city...',
      });

      el.addEventListener('gmp-select', async (rawEvent: Event) => {
        const selectEvent = rawEvent as google.maps.places.PlacePredictionSelectEvent;
        const prediction = selectEvent.placePrediction;
        if (!prediction) {
          return;
        }
        const place = prediction.toPlace();
        await place.fetchFields({
          fields: ['id', 'displayName', 'formattedAddress', 'location'],
        });
        const loc = place.location;
        if (!loc) {
          return;
        }
        this.placeSelected.emit({
          name: place.displayName || place.formattedAddress || 'Selected Place',
          formattedAddress:
            place.formattedAddress || `${loc.lat().toFixed(5)}, ${loc.lng().toFixed(5)}`,
          lat: loc.lat(),
          lng: loc.lng(),
          placeId: place.id,
          source: 'autocomplete',
        });
      });

      this.autocompleteHost.nativeElement.replaceChildren(el);
      this.autocompleteEl = el;
    } catch (err) {
      this.mounted = false;
      console.error('Failed to mount PlaceAutocompleteElement:', err);
    }
  }
}
