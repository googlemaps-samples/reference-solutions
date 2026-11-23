import {
  CUSTOM_ELEMENTS_SCHEMA,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import {
  ATTRIBUTION_ID,
  DENVER_BOULDER_BOUNDS,
  ResolvedPlace,
} from '../../models/route-comparator.models';

@Component({
  selector: 'app-place-picker',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="picker-wrapper">
      <div class="picker-label-row">
        <span class="endpoint-dot" [class.origin]="role() === 'origin'" [class.dest]="role() === 'destination'">
          {{ role() === 'origin' ? 'A' : 'B' }}
        </span>
        <label [attr.for]="inputId()" class="picker-label">{{ label() }}</label>
      </div>
      <div #host class="autocomplete-host"></div>
      @if (activePlace(); as place) {
        <div class="active-place-chip" [attr.data-testid]="inputId() + '-active'">
          <span class="chip-name">{{ place.displayName }}</span>
          <span class="chip-address">{{ place.formattedAddress }}</span>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .picker-wrapper {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .picker-label-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .endpoint-dot {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
        color: #ffffff;
        flex-shrink: 0;
      }

      .endpoint-dot.origin {
        background: #059669;
      }

      .endpoint-dot.dest {
        background: #e11d48;
      }

      .picker-label {
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #475569;
      }

      .autocomplete-host {
        width: 100%;
        min-height: 40px;
      }

      .active-place-chip {
        display: flex;
        flex-direction: column;
        gap: 1px;
        padding: 6px 10px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
      }

      .chip-name {
        font-size: 12.5px;
        font-weight: 600;
        color: #0f172a;
        line-height: 1.3;
      }

      .chip-address {
        font-size: 11.5px;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `,
  ],
})
export class PlacePickerComponent implements OnDestroy {
  readonly role = input.required<'origin' | 'destination'>();
  readonly label = input.required<string>();
  readonly inputId = input.required<string>();
  readonly placeholder = input<string>('Search Denver / Boulder...');
  readonly mapsReady = input.required<boolean>();
  readonly activePlace = input<ResolvedPlace | null>(null);

  readonly placeSelected = output<ResolvedPlace>();
  readonly pickerError = output<string>();

  private readonly hostRef = viewChild<ElementRef<HTMLDivElement>>('host');
  private autocompleteEl: google.maps.places.PlaceAutocompleteElement | null = null;
  private selectListener: ((event: Event) => void) | null = null;

  constructor() {
    effect(() => {
      const ready = this.mapsReady();
      const host = this.hostRef()?.nativeElement;
      if (ready && host && !this.autocompleteEl) {
        void this.mountAutocomplete(host);
      }
    });
  }

  private async mountAutocomplete(host: HTMLDivElement): Promise<void> {
    try {
      const { PlaceAutocompleteElement } = (await google.maps.importLibrary(
        'places'
      )) as google.maps.PlacesLibrary;

      const el = new PlaceAutocompleteElement({
        locationBias: DENVER_BOULDER_BOUNDS,
        includedRegionCodes: ['us'],
        requestedLanguage: 'en',
        requestedRegion: 'us',
      });

      el.id = this.inputId();
      el.setAttribute('data-testid', this.inputId());
      el.setAttribute('aria-label', this.label());
      el.setAttribute('internal-usage-attribution-ids', ATTRIBUTION_ID);
      if ('placeholder' in el) {
        (el as unknown as { placeholder: string }).placeholder =
          this.placeholder();
      }

      const handleSelect = async (event: Event): Promise<void> => {
        const selectEvent = event as unknown as {
          placePrediction?: google.maps.places.PlacePrediction;
        };
        if (!selectEvent.placePrediction) {
          return;
        }
        try {
          const place = selectEvent.placePrediction.toPlace();
          await place.fetchFields({
            fields: ['id', 'displayName', 'formattedAddress', 'location'],
          });
          if (!place.location) {
            return;
          }
          this.placeSelected.emit({
            id: place.id ?? `${Date.now()}`,
            displayName:
              place.displayName ?? place.formattedAddress ?? 'Selected Place',
            formattedAddress:
              place.formattedAddress ?? place.displayName ?? '',
            location: {
              lat: place.location.lat(),
              lng: place.location.lng(),
            },
          });
        } catch (err) {
          const msg =
            err instanceof Error
              ? err.message
              : 'Failed to load selected place details.';
          this.pickerError.emit(msg);
        }
      };

      this.selectListener = (event: Event) => {
        void handleSelect(event);
      };
      el.addEventListener('gmp-select', this.selectListener);

      host.replaceChildren(el);
      this.autocompleteEl = el;
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to initialize PlaceAutocompleteElement.';
      this.pickerError.emit(msg);
    }
  }

  ngOnDestroy(): void {
    if (this.autocompleteEl && this.selectListener) {
      this.autocompleteEl.removeEventListener('gmp-select', this.selectListener);
    }
  }
}
