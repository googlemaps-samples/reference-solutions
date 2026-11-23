import { Component, input, output } from '@angular/core';
import {
  CATEGORY_METADATA,
  CORE_PLACE_CATEGORIES,
  CategoryFilter,
  CommunitySpot,
  DiscoveredPlace,
} from '../models/neighborhood.models';

@Component({
  selector: 'app-places-sidebar',
  standalone: true,
  template: `
    <aside class="directory-sidebar" aria-label="Neighborhood Directory">
      <div class="sidebar-top">
        <div class="filter-chips" role="tablist" aria-label="Filter places by category">
          <button
            type="button"
            id="category-filter-all"
            data-testid="category-filter-all"
            class="chip"
            [class.chip-active]="activeCategory() === 'all'"
            (click)="categoryChange.emit('all')"
          >
            All
          </button>
          @for (cat of categories; track cat) {
            <button
              type="button"
              [id]="'category-filter-' + cat"
              [attr.data-testid]="'category-filter-' + cat"
              class="chip"
              [class.chip-active]="activeCategory() === cat"
              (click)="categoryChange.emit(cat)"
            >
              <span
                class="chip-dot"
                [style.background]="categoryMeta[cat].background"
                aria-hidden="true"
              ></span>
              {{ categoryMeta[cat].pluralLabel }}
            </button>
          }
        </div>

        <div class="status-strip">
          <span class="status-text">
            @if (loading()) {
              Searching within 5 km of {{ activeNeighborhoodLabel() }}...
            } @else {
              <strong>{{ places().length }}</strong> places within 5 km of
              {{ activeNeighborhoodLabel() }}
            }
          </span>
          <span class="hint-text">Click map to reverse-geocode</span>
        </div>
      </div>

      <div
        id="places-results-list"
        data-testid="places-results-list"
        class="results-list"
      >
        @if (places().length === 0 && !loading()) {
          <div class="empty-state">
            <p class="empty-title">No matching places in this view</p>
            <p class="empty-copy">
              Switch categories, select another London neighborhood, or search an
              address above.
            </p>
          </div>
        }

        @for (place of places(); track place.id) {
          <article
            class="place-card"
            [class.place-card-selected]="selectedPlaceId() === place.id"
          >
            <div class="card-header">
              <span
                class="category-badge"
                [style.background]="categoryMeta[place.category].badgeBg"
                [style.color]="categoryMeta[place.category].badgeText"
              >
                {{ place.primaryTypeDisplayName }}
              </span>
              @if (place.priceLabel !== 'N/A') {
                <span class="price-pill">{{ place.priceLabel }}</span>
              }
            </div>

            <button
              type="button"
              class="card-title-btn"
              (click)="inspectPlace.emit(place)"
            >
              {{ place.displayName }}
            </button>

            <p class="card-address">{{ place.formattedAddress }}</p>

            <div class="card-metrics">
              @if (place.rating !== null) {
                <span class="rating-badge">
                  &#9733; {{ place.rating.toFixed(1) }}
                  @if (place.userRatingCount !== null) {
                    <span class="rating-count"
                      >({{ formatCount(place.userRatingCount) }})</span
                    >
                  }
                </span>
              } @else {
                <span class="rating-muted">No ratings yet</span>
              }
              <span class="hours-text">{{ place.todayHours }}</span>
            </div>

            <div class="card-actions">
              <button
                type="button"
                class="btn-card btn-card-inspect"
                (click)="inspectPlace.emit(place)"
              >
                Inspect
              </button>
              <button
                type="button"
                class="btn-card"
                [class.btn-card-compared]="isCompared(place.id)"
                [disabled]="!isCompared(place.id) && comparisonIds().length >= 3"
                (click)="toggleCompare.emit(place)"
              >
                {{ isCompared(place.id) ? 'Compared ✓' : '+ Compare' }}
              </button>
            </div>
          </article>
        }

        @if (communitySpots().length > 0) {
          <section class="community-section" aria-label="Community Spots">
            <h2 class="community-heading">
              Session Community Spots ({{ communitySpots().length }})
            </h2>
            @for (spot of communitySpots(); track spot.id) {
              <button
                type="button"
                class="community-card"
                (click)="inspectCommunitySpot.emit(spot)"
              >
                <div class="community-top">
                  <span class="community-pin-badge">+</span>
                  <strong class="community-name">{{ spot.name }}</strong>
                  <span class="community-time">{{ spot.createdAt }}</span>
                </div>
                <p class="community-address">{{ spot.address }}</p>
                @if (spot.note) {
                  <p class="community-note">{{ spot.note }}</p>
                }
              </button>
            }
          </section>
        }
      </div>
    </aside>
  `,
  styles: [
    `
      .directory-sidebar {
        width: 400px;
        height: 100%;
        background: #ffffff;
        border-right: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        min-height: 0;
        flex-shrink: 0;
      }

      .sidebar-top {
        padding: 12px 14px;
        border-bottom: 1px solid #e2e8f0;
        background: #f8fafc;
      }

      .filter-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 10px;
      }

      .chip {
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #334155;
        border-radius: 999px;
        padding: 6px 11px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: all 0.15s ease;
      }

      .chip:hover {
        border-color: #64748b;
      }

      .chip-active {
        background: #0f172a;
        border-color: #0f172a;
        color: #ffffff;
      }

      .chip-dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
      }

      .status-strip {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: #475569;
      }

      .hint-text {
        color: #0284c7;
        font-weight: 500;
        white-space: nowrap;
      }

      .results-list {
        flex: 1;
        overflow-y: auto;
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .place-card {
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 12px;
        background: #ffffff;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }

      .place-card:hover {
        border-color: #94a3b8;
      }

      .place-card-selected {
        border-color: #2563eb;
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
      }

      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 6px;
      }

      .category-badge {
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 999px;
        text-transform: capitalize;
      }

      .price-pill {
        font-size: 11px;
        font-weight: 700;
        color: #0f172a;
        background: #f1f5f9;
        padding: 2px 7px;
        border-radius: 6px;
      }

      .card-title-btn {
        background: none;
        border: none;
        padding: 0;
        text-align: left;
        font-size: 15px;
        font-weight: 700;
        color: #0f172a;
        cursor: pointer;
        margin-bottom: 4px;
        display: block;
        width: 100%;
      }

      .card-title-btn:hover {
        color: #2563eb;
      }

      .card-address {
        margin: 0 0 8px;
        font-size: 12px;
        color: #64748b;
        line-height: 1.4;
      }

      .card-metrics {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        margin-bottom: 10px;
        font-size: 12px;
      }

      .rating-badge {
        font-weight: 700;
        color: #b45309;
      }

      .rating-count {
        font-weight: 500;
        color: #64748b;
      }

      .rating-muted {
        color: #94a3b8;
      }

      .hours-text {
        color: #334155;
        font-size: 11.5px;
        max-width: 190px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .card-actions {
        display: flex;
        gap: 8px;
      }

      .btn-card {
        flex: 1;
        height: 32px;
        border-radius: 8px;
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #1e293b;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
      }

      .btn-card:hover:not(:disabled) {
        background: #f8fafc;
      }

      .btn-card:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      .btn-card-inspect {
        background: #f1f5f9;
        border-color: #e2e8f0;
      }

      .btn-card-compared {
        background: #fef3c7;
        border-color: #f59e0b;
        color: #92400e;
      }

      .empty-state {
        text-align: center;
        padding: 28px 16px;
        border: 1px dashed #cbd5e1;
        border-radius: 12px;
        color: #475569;
      }

      .empty-title {
        margin: 0 0 6px;
        font-weight: 700;
        color: #0f172a;
      }

      .empty-copy {
        margin: 0;
        font-size: 13px;
      }

      .community-section {
        margin-top: 8px;
        padding-top: 12px;
        border-top: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .community-heading {
        margin: 0;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #0f766e;
      }

      .community-card {
        text-align: left;
        border: 1px solid #99f6e4;
        background: #f0fdfa;
        border-radius: 10px;
        padding: 10px;
        cursor: pointer;
      }

      .community-top {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 4px;
      }

      .community-pin-badge {
        width: 18px;
        height: 18px;
        border-radius: 999px;
        background: #0f766e;
        color: #ffffff;
        font-weight: 700;
        font-size: 12px;
        display: grid;
        place-items: center;
      }

      .community-name {
        font-size: 13px;
        color: #134e4a;
        flex: 1;
      }

      .community-time {
        font-size: 11px;
        color: #0f766e;
      }

      .community-address,
      .community-note {
        margin: 2px 0 0;
        font-size: 12px;
        color: #115e59;
      }

      @media (max-width: 960px) {
        .directory-sidebar {
          width: 100%;
          height: 360px;
          border-right: none;
          border-top: 1px solid #e2e8f0;
          order: 2;
        }
      }
    `,
  ],
})
export class PlacesSidebarComponent {
  readonly places = input.required<DiscoveredPlace[]>();
  readonly communitySpots = input.required<CommunitySpot[]>();
  readonly activeCategory = input.required<CategoryFilter>();
  readonly activeNeighborhoodLabel = input.required<string>();
  readonly selectedPlaceId = input<string | null>(null);
  readonly comparisonIds = input.required<string[]>();
  readonly loading = input<boolean>(false);

  readonly categoryChange = output<CategoryFilter>();
  readonly inspectPlace = output<DiscoveredPlace>();
  readonly toggleCompare = output<DiscoveredPlace>();
  readonly inspectCommunitySpot = output<CommunitySpot>();

  readonly categories = CORE_PLACE_CATEGORIES;
  readonly categoryMeta = CATEGORY_METADATA;

  isCompared(placeId: string): boolean {
    return this.comparisonIds().includes(placeId);
  }

  formatCount(count: number): string {
    return count.toLocaleString('en-GB');
  }
}
