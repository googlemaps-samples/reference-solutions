import { Component, input, output } from '@angular/core';
import {
  CATEGORY_METADATA,
  DiscoveredPlace,
} from '../models/neighborhood.models';

@Component({
  selector: 'app-comparison-panel',
  standalone: true,
  template: `
    @if (open()) {
      <section
        id="comparison-panel"
        data-testid="comparison-panel"
        class="comparison-panel"
        aria-label="Side-by-Side Place Comparison"
      >
        <div class="panel-header">
          <div>
            <h2 class="panel-title">
              Side-by-Side Place Comparison ({{ places().length }}/3)
            </h2>
            <p class="panel-subtitle">
              Compare live ratings, review volume, price level, hours, and street
              addresses.
            </p>
          </div>
          <div class="panel-actions">
            @if (places().length > 0) {
              <button
                type="button"
                class="btn-clear"
                (click)="clearAll.emit()"
              >
                Clear All
              </button>
            }
            <button
              type="button"
              class="btn-close-panel"
              (click)="closePanel.emit()"
            >
              Close
            </button>
          </div>
        </div>

        @if (places().length === 0) {
          <div class="comparison-empty">
            Select up to 3 places using <strong>+ Compare</strong> in the
            directory or details drawer to compare them side by side.
          </div>
        } @else {
          <div class="comparison-grid">
            @for (place of places(); track place.id) {
              <article class="compare-card">
                <div class="compare-top">
                  <span
                    class="compare-badge"
                    [style.background]="categoryMeta[place.category].badgeBg"
                    [style.color]="categoryMeta[place.category].badgeText"
                  >
                    {{ place.primaryTypeDisplayName }}
                  </span>
                  <button
                    type="button"
                    class="remove-btn"
                    aria-label="Remove from comparison"
                    (click)="removePlace.emit(place.id)"
                  >
                    &times;
                  </button>
                </div>

                <h3 class="compare-name">{{ place.displayName }}</h3>

                <dl class="compare-specs">
                  <div class="spec-row">
                    <dt>Rating</dt>
                    <dd>
                      @if (place.rating !== null) {
                        &#9733; {{ place.rating.toFixed(1) }} ({{
                          (place.userRatingCount ?? 0).toLocaleString('en-GB')
                        }})
                      } @else {
                        N/A
                      }
                    </dd>
                  </div>
                  <div class="spec-row">
                    <dt>Price</dt>
                    <dd>{{ place.priceLabel }}</dd>
                  </div>
                  <div class="spec-row">
                    <dt>Today</dt>
                    <dd>{{ place.todayHours }}</dd>
                  </div>
                  <div class="spec-row">
                    <dt>Address</dt>
                    <dd class="addr-dd">{{ place.formattedAddress }}</dd>
                  </div>
                </dl>

                <button
                  type="button"
                  class="btn-inspect-compare"
                  (click)="inspectPlace.emit(place)"
                >
                  Inspect Full Details
                </button>
              </article>
            }
          </div>
        }
      </section>
    }
  `,
  styles: [
    `
      .comparison-panel {
        position: absolute;
        left: 14px;
        right: 14px;
        bottom: 14px;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 14px;
        box-shadow: 0 -8px 32px rgba(15, 23, 42, 0.16);
        padding: 12px 14px;
        z-index: 25;
        max-height: 46%;
        overflow-y: auto;
      }

      .panel-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 10px;
      }

      .panel-title {
        margin: 0;
        font-size: 14px;
        font-weight: 800;
        color: #0f172a;
      }

      .panel-subtitle {
        margin: 2px 0 0;
        font-size: 12px;
        color: #64748b;
      }

      .panel-actions {
        display: flex;
        gap: 6px;
      }

      .btn-clear,
      .btn-close-panel {
        height: 30px;
        padding: 0 10px;
        border-radius: 7px;
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #334155;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }

      .comparison-empty {
        padding: 16px;
        border-radius: 10px;
        background: #f8fafc;
        border: 1px dashed #cbd5e1;
        font-size: 13px;
        color: #475569;
        text-align: center;
      }

      .comparison-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }

      .compare-card {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 10px;
        background: #f8fafc;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .compare-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .compare-badge {
        font-size: 10.5px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 999px;
      }

      .remove-btn {
        border: none;
        background: none;
        font-size: 17px;
        line-height: 1;
        color: #64748b;
        cursor: pointer;
      }

      .compare-name {
        margin: 0;
        font-size: 14px;
        font-weight: 700;
        color: #0f172a;
      }

      .compare-specs {
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 12px;
      }

      .spec-row {
        display: flex;
        justify-content: space-between;
        gap: 8px;
      }

      .spec-row dt {
        color: #64748b;
        font-weight: 600;
      }

      .spec-row dd {
        margin: 0;
        color: #0f172a;
        font-weight: 600;
        text-align: right;
      }

      .addr-dd {
        font-weight: 400 !important;
        max-width: 190px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .btn-inspect-compare {
        margin-top: auto;
        height: 30px;
        border-radius: 7px;
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #0f172a;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }

      @media (max-width: 900px) {
        .comparison-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ComparisonPanelComponent {
  readonly open = input.required<boolean>();
  readonly places = input.required<DiscoveredPlace[]>();

  readonly closePanel = output<void>();
  readonly clearAll = output<void>();
  readonly removePlace = output<string>();
  readonly inspectPlace = output<DiscoveredPlace>();

  readonly categoryMeta = CATEGORY_METADATA;
}
