import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { importLibrary } from '@googlemaps/js-api-loader';
import { StreetViewPreviewState } from '../../models/itinerary.models';

@Component({
  selector: 'app-street-view-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="sv-panel" data-testid="street-view-panel" aria-label="Street View Preview">
      <header class="sv-header">
        <div class="sv-title-group">
          <span class="sv-eyebrow">Street View Inspection</span>
          <h3 class="sv-title">{{ target().title }}</h3>
          @if (target().address) {
            <span class="sv-address">{{ target().address }}</span>
          }
        </div>
        <div class="sv-status-group">
          @if (statusText()) {
            <span
              class="sv-badge"
              [class.sv-badge-ready]="panelStatus() === 'ready'"
              [class.sv-badge-warn]="panelStatus() === 'unavailable'"
            >
              {{ statusText() }}
            </span>
          }
          @if (copyright()) {
            <span class="sv-copyright">{{ copyright() }}</span>
          }
        </div>
      </header>

      <div class="sv-viewport">
        <div #panoContainer class="sv-canvas" [class.sv-hidden]="panelStatus() !== 'ready'"></div>

        @if (!mapsLoaded()) {
          <div class="sv-placeholder">
            <span>Street View panorama activates once the Maps JavaScript API key is configured.</span>
          </div>
        } @else if (panelStatus() === 'loading') {
          <div class="sv-placeholder">
            <span>Locating nearest Street View panorama...</span>
          </div>
        } @else if (panelStatus() === 'unavailable') {
          <div class="sv-placeholder">
            <span>{{ unavailableMessage() }}</span>
          </div>
        }
      </div>
    </section>
  `,
  styles: [
    `
      .sv-panel {
        display: flex;
        flex-direction: column;
        height: 240px;
        min-height: 240px;
        background: #ffffff;
        border-top: 1px solid var(--border-subtle);
      }

      .sv-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 8px 16px;
        background: #f8fafc;
        border-bottom: 1px solid var(--border-subtle);
      }

      .sv-title-group {
        display: flex;
        align-items: baseline;
        gap: 8px;
        min-width: 0;
        overflow: hidden;
      }

      .sv-eyebrow {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #0f766e;
        flex-shrink: 0;
      }

      .sv-title {
        margin: 0;
        font-size: 13px;
        font-weight: 600;
        color: #0f172a;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .sv-address {
        font-size: 12px;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .sv-status-group {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }

      .sv-badge {
        font-size: 11px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 999px;
        background: #e2e8f0;
        color: #334155;
      }

      .sv-badge-ready {
        background: #dcfce7;
        color: #166534;
      }

      .sv-badge-warn {
        background: #fef3c7;
        color: #92400e;
      }

      .sv-copyright {
        font-size: 11px;
        color: #64748b;
      }

      .sv-viewport {
        position: relative;
        flex: 1;
        width: 100%;
        height: 100%;
        background: #0f172a;
        overflow: hidden;
      }

      .sv-canvas {
        width: 100%;
        height: 100%;
      }

      .sv-hidden {
        visibility: hidden;
      }

      .sv-placeholder {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        text-align: center;
        color: #cbd5e1;
        font-size: 13px;
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      }
    `,
  ],
})
export class StreetViewPanelComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly mapsLoaded = input.required<boolean>();
  readonly target = input.required<StreetViewPreviewState>();

  @ViewChild('panoContainer') panoContainer?: ElementRef<HTMLDivElement>;

  readonly panelStatus = signal<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');
  readonly copyright = signal<string | null>(null);
  readonly unavailableMessage = signal(
    'No Street View imagery found within 150 m of this location.'
  );

  private panorama: google.maps.StreetViewPanorama | null = null;
  private streetViewService: google.maps.StreetViewService | null = null;
  private requestCounter = 0;

  constructor() {
    effect(() => {
      const loaded = this.mapsLoaded();
      const targetState = this.target();
      if (!loaded) {
        this.panelStatus.set('idle');
        return;
      }
      void this.updatePanorama(targetState);
    });

    this.destroyRef.onDestroy(() => {
      this.panorama = null;
      this.streetViewService = null;
    });
  }

  statusText(): string {
    switch (this.panelStatus()) {
      case 'ready':
        return '360° Street View';
      case 'loading':
        return 'Loading...';
      case 'unavailable':
        return 'No Imagery';
      default:
        return '';
    }
  }

  private async updatePanorama(targetState: StreetViewPreviewState): Promise<void> {
    const seq = ++this.requestCounter;
    this.panelStatus.set('loading');
    this.copyright.set(null);

    try {
      const { StreetViewPanorama, StreetViewService, StreetViewPreference } =
        await importLibrary('streetView');

      if (seq !== this.requestCounter) return;

      const container = this.panoContainer?.nativeElement;
      if (!container) return;

      if (!this.streetViewService) {
        this.streetViewService = new StreetViewService();
      }

      const response = await this.streetViewService.getPanorama({
        location: targetState.location,
        radius: 150,
        preference: StreetViewPreference.BEST,
      });

      if (seq !== this.requestCounter) return;

      const panoData = response?.data;
      const panoId = panoData?.location?.pano;
      if (!panoId) {
        this.panelStatus.set('unavailable');
        this.unavailableMessage.set(
          `Street View imagery is unavailable near ${targetState.title}.`
        );
        return;
      }

      if (!this.panorama) {
        this.panorama = new StreetViewPanorama(container, {
          pano: panoId,
          pov: { heading: 34, pitch: 5 },
          zoom: 1,
          addressControl: false,
          fullscreenControl: true,
          linksControl: true,
          panControl: true,
          enableCloseButton: false,
          motionTracking: false,
          motionTrackingControl: false,
        });
      } else {
        this.panorama.setPano(panoId);
        this.panorama.setPov({ heading: 34, pitch: 5 });
      }

      this.copyright.set(panoData.copyright ?? null);
      this.panelStatus.set('ready');
    } catch {
      if (seq !== this.requestCounter) return;
      this.panelStatus.set('unavailable');
      this.unavailableMessage.set(
        `No outdoor Street View panorama available near ${targetState.title}.`
      );
    }
  }
}
