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
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResolvedPlace } from '../../models/rideshare.models';
import { MapsLoaderService } from '../../services/maps-loader.service';
import { LOS_ANGELES_CENTER } from '../../services/rideshare-routing.service';

@Component({
  selector: 'app-place-autocomplete-input',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <div class="autocomplete-field">
      <div class="field-header">
        <span class="dot" [class.dot-pickup]="variant === 'pickup'" [class.dot-dropoff]="variant === 'dropoff'"></span>
        <span class="field-label">{{ label }}</span>
        @if (resolvedPlace) {
          <span class="resolved-badge">Live Places API</span>
        }
      </div>
      <div
        #hostContainer
        class="gmp-autocomplete-host"
        [attr.data-testid]="testId"
        [attr.data-selected-place]="resolvedPlace?.name || displayText"
      ></div>
      @if (resolvedPlace) {
        <div class="resolved-subtext" [title]="resolvedPlace.formattedAddress">
          {{ resolvedPlace.formattedAddress }}
        </div>
      } @else if (!mapsReady) {
        <input
          type="text"
          class="fallback-input"
          [value]="displayText"
          [placeholder]="placeholder"
          readonly
        />
      }
    </div>
  `,
  styles: [
    `
      .autocomplete-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .field-header {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      .dot-pickup {
        background: #10b981;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
      }

      .dot-dropoff {
        background: #ef4444;
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
      }

      .field-label {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #475569;
      }

      .resolved-badge {
        margin-left: auto;
        font-size: 10px;
        font-weight: 600;
        color: #0f766e;
        background: #ccfbf1;
        padding: 2px 7px;
        border-radius: 999px;
      }

      .gmp-autocomplete-host {
        width: 100%;
        min-height: 44px;
        border-radius: 10px;
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
        overflow: visible;
      }

      .gmp-autocomplete-host:focus-within {
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
        background: #ffffff;
      }

      .gmp-autocomplete-host ::ng-deep gmp-place-autocomplete {
        width: 100%;
        display: block;
        color-scheme: light;
        background-color: transparent;
        border: none;
        border-radius: 10px;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        font-size: 14px;
        color: #0f172a;
      }

      .fallback-input {
        width: 100%;
        height: 42px;
        padding: 0 12px;
        border-radius: 10px;
        border: 1px solid #cbd5e1;
        background: #f8fafc;
        color: #0f172a;
        font-size: 14px;
        box-sizing: border-box;
      }

      .resolved-subtext {
        font-size: 11.5px;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        padding-left: 18px;
      }
    `,
  ],
})
export class PlaceAutocompleteInputComponent implements AfterViewInit, OnChanges, OnDestroy {
  private readonly mapsLoader = inject(MapsLoaderService);

  @Input({ required: true }) label = '';
  @Input({ required: true }) placeholder = '';
  @Input({ required: true }) testId = '';
  @Input() variant: 'pickup' | 'dropoff' = 'pickup';
  @Input() displayText = '';
  @Input() resolvedPlace: ResolvedPlace | null = null;
  @Input() mapsReady = false;

  @Output() placeSelected = new EventEmitter<ResolvedPlace>();

  @ViewChild('hostContainer', { static: false })
  private hostContainer?: ElementRef<HTMLDivElement>;

  private autocompleteEl: google.maps.places.PlaceAutocompleteElement | null = null;
  private isMounted = false;

  private readonly handleSelect = async (event: Event): Promise<void> => {
    const selectEvent = event as google.maps.places.PlacePredictionSelectEvent;
    const prediction = selectEvent?.placePrediction;
    if (!prediction) return;

    try {
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ['id', 'displayName', 'formattedAddress', 'location'],
      });

      if (!place.location) return;

      const resolved: ResolvedPlace = {
        id: place.id,
        name: place.displayName ?? place.formattedAddress ?? 'Selected Location',
        formattedAddress: place.formattedAddress ?? place.displayName ?? '',
        location: {
          lat: place.location.lat(),
          lng: place.location.lng(),
        },
      };

      this.placeSelected.emit(resolved);
    } catch (err) {
      console.warn('Failed to fetch selected place details:', err);
    }
  };

  private readonly handleGmpError = (event: Event): void => {
    console.warn('PlaceAutocompleteElement reported an error event:', event);
  };

  ngAfterViewInit(): void {
    if (this.mapsReady) {
      void this.mountAutocomplete();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mapsReady']?.currentValue === true && !this.isMounted) {
      void this.mountAutocomplete();
    }
    if (changes['displayText'] && this.autocompleteEl) {
      const nextVal = this.displayText ?? '';
      if (this.autocompleteEl.value !== nextVal) {
        this.autocompleteEl.value = nextVal;
      }
    }
  }

  ngOnDestroy(): void {
    if (this.autocompleteEl) {
      this.autocompleteEl.removeEventListener('gmp-select', this.handleSelect);
      this.autocompleteEl.removeEventListener('gmp-error', this.handleGmpError);
      this.autocompleteEl.remove();
      this.autocompleteEl = null;
    }
  }

  private async mountAutocomplete(): Promise<void> {
    if (this.isMounted || !this.hostContainer?.nativeElement) return;
    this.isMounted = true;

    try {
      const { places } = await this.mapsLoader.loadLibraries();
      const { PlaceAutocompleteElement } = places;

      const el = new PlaceAutocompleteElement({
        includedRegionCodes: ['us'],
        locationBias: {
          center: LOS_ANGELES_CENTER,
          radius: 45000,
        },
        requestedLanguage: 'en',
        requestedRegion: 'US',
      });

      el.placeholder = this.placeholder;
      if (this.displayText) {
        el.value = this.displayText;
      }

      el.addEventListener('gmp-select', this.handleSelect);
      el.addEventListener('gmp-error', this.handleGmpError);

      this.hostContainer.nativeElement.replaceChildren(el);
      this.autocompleteEl = el;
    } catch (err) {
      this.isMounted = false;
      console.warn('Unable to mount PlaceAutocompleteElement:', err);
    }
  }
}
