import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { ClinicDetails, ViewMode } from '../../models/storefront.models';

@Component({
  selector: 'app-clinic-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="clinic-header" data-testid="clinic-header">
      <div class="brand-block">
        <div class="brand-emblem" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M7 4c-2.2 0-4 1.8-4 4.2 0 3 1.4 5.8 2.4 9.5.4 1.4 1.2 2.3 2.1 2.3.9 0 1.4-1 1.9-2.8.5-1.8 1.2-2.7 2.6-2.7s2.1.9 2.6 2.7c.5 1.8 1 2.8 1.9 2.8.9 0 1.7-.9 2.1-2.3 1-3.7 2.4-6.5 2.4-9.5C21 5.8 19.2 4 17 4c-1.8 0-3.2.9-5 .9S8.8 4 7 4Z" />
          </svg>
        </div>
        <div class="brand-copy">
          <div class="brand-title-row">
            <h1 class="brand-title">{{ clinic()?.name || 'Sutter Dental Group SF' }}</h1>
            @if (clinic(); as c) {
              @if (c.isOpenNow !== null) {
                <span
                  class="status-pill"
                  [class.open]="c.isOpenNow"
                  [class.closed]="!c.isOpenNow"
                >
                  <span class="status-dot"></span>
                  {{ c.isOpenNow ? 'Open Now' : 'Closed Now' }}
                </span>
              }
            }
          </div>
          <p class="brand-meta">
            <span>{{ clinic()?.formattedAddress || '450 Sutter St, San Francisco, CA 94108' }}</span>
            @if (clinic()?.nationalPhoneNumber; as phone) {
              <span class="sep">&bull;</span>
              <span>{{ phone }}</span>
            }
          </p>
        </div>
      </div>

      <div class="header-controls">
        <button
          type="button"
          class="control-btn"
          [class.active]="showCoverageOverlay()"
          data-testid="coverage-overlay-toggle"
          (click)="toggleCoverage.emit()"
        >
          <span class="pill-indicator"></span>
          Home-Visit Zone (3.5 km)
        </button>

        <button
          type="button"
          class="control-btn"
          [class.active]="viewMode() !== 'map'"
          data-testid="street-view-toggle"
          (click)="toggleStreetView()"
        >
          {{ viewMode() === 'map' ? 'Street View Entrance' : 'Hide Street View' }}
        </button>

        <div class="mode-group" role="group" aria-label="Map view mode">
          <button
            type="button"
            class="mode-btn"
            [class.active]="viewMode() === 'map'"
            (click)="viewModeChange.emit('map')"
          >
            Map
          </button>
          <button
            type="button"
            class="mode-btn"
            [class.active]="viewMode() === 'split'"
            (click)="viewModeChange.emit('split')"
          >
            Split
          </button>
          <button
            type="button"
            class="mode-btn"
            [class.active]="viewMode() === 'street-view'"
            (click)="viewModeChange.emit('street-view')"
          >
            Street View
          </button>
        </div>
      </div>
    </header>
  `,
  styles: [
    `
      .clinic-header {
        min-height: 64px;
        padding: 10px 20px;
        background: #ffffff;
        border-bottom: 1px solid var(--border-subtle);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
        position: sticky;
        top: 0;
        z-index: 20;
      }

      .brand-block {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }

      .brand-emblem {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: linear-gradient(135deg, var(--brand-primary), var(--brand-accent));
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        box-shadow: 0 3px 10px rgba(11, 110, 120, 0.25);
      }

      .brand-copy {
        min-width: 0;
      }

      .brand-title-row {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      .brand-title {
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--text-primary);
        letter-spacing: -0.01em;
      }

      .brand-meta {
        margin: 2px 0 0;
        font-size: 0.8rem;
        color: var(--text-secondary);
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }

      .sep {
        color: var(--text-muted);
      }

      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 2px 10px;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
      }

      .status-pill.open {
        background: var(--success-bg);
        color: var(--success-text);
      }

      .status-pill.closed {
        background: var(--closed-bg);
        color: var(--closed-text);
      }

      .status-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: currentColor;
      }

      .header-controls {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      .control-btn {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 7px 12px;
        border-radius: 9px;
        border: 1px solid var(--border-subtle);
        background: #ffffff;
        color: var(--text-primary);
        font-size: 0.82rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .control-btn:hover {
        border-color: var(--brand-primary);
        background: var(--bg-subtle);
      }

      .control-btn.active {
        background: var(--brand-soft);
        border-color: var(--brand-primary);
        color: var(--brand-primary);
      }

      .pill-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--text-muted);
      }

      .control-btn.active .pill-indicator {
        background: var(--brand-primary);
      }

      .mode-group {
        display: inline-flex;
        background: var(--bg-subtle);
        border: 1px solid var(--border-subtle);
        border-radius: 9px;
        padding: 2px;
      }

      .mode-btn {
        border: none;
        background: transparent;
        color: var(--text-secondary);
        font-size: 0.8rem;
        font-weight: 600;
        padding: 5px 10px;
        border-radius: 7px;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .mode-btn.active {
        background: #ffffff;
        color: var(--brand-primary);
        box-shadow: var(--shadow-sm);
      }
    `,
  ],
})
export class ClinicHeaderComponent {
  readonly clinic = input<ClinicDetails | null>(null);
  readonly viewMode = input<ViewMode>('map');
  readonly showCoverageOverlay = input<boolean>(true);

  readonly viewModeChange = output<ViewMode>();
  readonly toggleCoverage = output<void>();

  toggleStreetView(): void {
    this.viewModeChange.emit(this.viewMode() === 'map' ? 'split' : 'map');
  }
}
