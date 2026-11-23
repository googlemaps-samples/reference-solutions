import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CATEGORY_METADATA,
  CORE_PLACE_CATEGORIES,
  CommunitySpot,
  DiscoveredPlace,
  PlaceCategory,
  ReverseGeocodeInspection,
} from '../models/neighborhood.models';

@Component({
  selector: 'app-details-drawer',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (selectedPlace() || reverseGeocode() || selectedCommunitySpot()) {
      <aside
        id="place-details-drawer"
        data-testid="place-details-drawer"
        class="details-drawer"
        aria-label="Place Details and Reverse Geocoding Inspector"
      >
        <div class="drawer-topbar">
          <span class="drawer-eyebrow">
            @if (selectedPlace()) {
              Place Details
            } @else if (selectedCommunitySpot()) {
              Community Spot
            } @else {
              Map Pin &amp; Reverse Geocode
            }
          </span>
          <button
            type="button"
            class="close-btn"
            aria-label="Close details drawer"
            (click)="closeDrawer.emit()"
          >
            &times;
          </button>
        </div>

        @if (selectedPlace(); as place) {
          <div class="drawer-body">
            @if (place.photoUrl) {
              <img
                class="hero-photo"
                [src]="place.photoUrl"
                [alt]="place.displayName"
                loading="lazy"
              />
            }

            <div class="place-header">
              <span
                class="category-pill"
                [style.background]="categoryMeta[place.category].badgeBg"
                [style.color]="categoryMeta[place.category].badgeText"
              >
                {{ place.primaryTypeDisplayName }}
              </span>
              @if (place.priceLabel !== 'N/A') {
                <span class="price-tag">{{ place.priceLabel }}</span>
              }
            </div>

            <h2 class="drawer-title">{{ place.displayName }}</h2>
            <p class="drawer-address">{{ place.formattedAddress }}</p>

            <div class="rating-row">
              @if (place.rating !== null) {
                <span class="rating-score">
                  &#9733; {{ place.rating.toFixed(1) }}
                </span>
                <span class="rating-total">
                  ({{ (place.userRatingCount ?? 0).toLocaleString('en-GB') }}
                  reviews)
                </span>
              } @else {
                <span class="rating-total">No live rating available</span>
              }
            </div>

            <div class="drawer-actions">
              <button
                type="button"
                id="drawer-compare-button"
                data-testid="drawer-compare-button"
                class="btn-drawer-primary"
                [class.btn-drawer-compared]="isCompared()"
                [disabled]="!isCompared() && comparisonCount() >= 3"
                (click)="toggleCompare.emit(place)"
              >
                {{ isCompared() ? 'Remove from Compare' : 'Add to Compare' }}
              </button>
              @if (place.googleMapsUri) {
                <a
                  class="btn-drawer-link"
                  [href]="place.googleMapsUri"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in Maps
                </a>
              }
            </div>

            @if (place.internationalPhoneNumber || place.websiteUri) {
              <div class="meta-block">
                @if (place.internationalPhoneNumber) {
                  <p class="meta-line">
                    <strong>Phone:</strong> {{ place.internationalPhoneNumber }}
                  </p>
                }
                @if (place.websiteUri) {
                  <p class="meta-line">
                    <strong>Website:</strong>
                    <a
                      [href]="place.websiteUri"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Visit site
                    </a>
                  </p>
                }
              </div>
            }

            <section class="drawer-section">
              <h3 class="section-title">Opening Hours</h3>
              @if (detailsLoading()) {
                <p class="muted-note">Fetching live hours and reviews...</p>
              } @else if (place.weekdayDescriptions.length > 0) {
                <ul class="hours-list">
                  @for (line of place.weekdayDescriptions; track line) {
                    <li>{{ line }}</li>
                  }
                </ul>
              } @else {
                <p class="muted-note">Opening hours not listed.</p>
              }
            </section>

            <section class="drawer-section">
              <h3 class="section-title">
                Customer Reviews ({{ place.reviews.length }})
              </h3>
              @if (detailsLoading()) {
                <p class="muted-note">Loading reviews...</p>
              } @else if (place.reviews.length === 0) {
                <p class="muted-note">No customer reviews returned for this place.</p>
              } @else {
                <div class="reviews-stack">
                  @for (rev of place.reviews; track $index) {
                    <article class="review-card">
                      <div class="review-head">
                        <strong class="review-author">{{ rev.authorName }}</strong>
                        @if (rev.rating !== null) {
                          <span class="review-rating">
                            &#9733; {{ rev.rating.toFixed(1) }}
                          </span>
                        }
                      </div>
                      @if (rev.relativeTime) {
                        <span class="review-time">{{ rev.relativeTime }}</span>
                      }
                      @if (rev.text) {
                        <p class="review-text">{{ rev.text }}</p>
                      }
                    </article>
                  }
                </div>
              }
            </section>
          </div>
        } @else if (selectedCommunitySpot(); as spot) {
          <div class="drawer-body">
            <span class="community-pill">Community Spot</span>
            <h2 class="drawer-title">{{ spot.name }}</h2>
            <p class="drawer-address">{{ spot.address }}</p>
            <p class="coord-chip">
              {{ spot.location.lat.toFixed(5) }}, {{ spot.location.lng.toFixed(5) }}
            </p>
            @if (spot.note) {
              <div class="meta-block">
                <p class="meta-line">{{ spot.note }}</p>
              </div>
            }
            <p class="muted-note">
              Pinned in this session at {{ spot.createdAt }} ({{
                categoryMeta[spot.category].label
              }}).
            </p>
          </div>
        } @else if (reverseGeocode(); as geo) {
          <div
            id="reverse-geocode-inspector"
            data-testid="reverse-geocode-inspector"
            class="drawer-body"
          >
            <span class="geo-pill">Reverse Geocoded Location</span>
            <h2 class="drawer-title">{{ geo.formattedAddress }}</h2>
            <p class="coord-chip">
              Lat: {{ geo.location.lat.toFixed(6) }} &middot; Lng:
              {{ geo.location.lng.toFixed(6) }}
            </p>
            @if (geo.placeId) {
              <p class="place-id-text">Place ID: {{ geo.placeId }}</p>
            }

            <div class="pin-cta-row">
              <button
                type="button"
                id="pin-community-spot-button"
                data-testid="pin-community-spot-button"
                class="btn-drawer-primary"
                (click)="pinFormExpanded.set(true)"
              >
                Pin Community Spot Here
              </button>
            </div>

            @if (pinFormExpanded()) {
              <form
                class="community-form"
                (ngSubmit)="submitCommunitySpot(geo)"
              >
                <label class="form-label" for="community-spot-name-input">
                  Spot Name
                </label>
                <input
                  id="community-spot-name-input"
                  data-testid="community-spot-name-input"
                  name="spotName"
                  class="form-input"
                  type="text"
                  required
                  placeholder="e.g., Hidden Courtyard Bench"
                  [(ngModel)]="spotName"
                />

                <label class="form-label" for="community-spot-category">
                  Category
                </label>
                <select
                  id="community-spot-category"
                  name="spotCategory"
                  class="form-input"
                  [(ngModel)]="spotCategory"
                >
                  @for (cat of categories; track cat) {
                    <option [value]="cat">{{ categoryMeta[cat].label }}</option>
                  }
                </select>

                <label class="form-label" for="community-spot-note-input">
                  Community Note
                </label>
                <textarea
                  id="community-spot-note-input"
                  data-testid="community-spot-note-input"
                  name="spotNote"
                  class="form-textarea"
                  rows="3"
                  placeholder="What makes this London spot special?"
                  [(ngModel)]="spotNote"
                ></textarea>

                <button
                  type="submit"
                  id="save-community-spot-button"
                  data-testid="save-community-spot-button"
                  class="btn-save-spot"
                  [disabled]="!spotName.trim()"
                >
                  Save Community Spot
                </button>
              </form>
            }
          </div>
        }
      </aside>
    }
  `,
  styles: [
    `
      .details-drawer {
        position: absolute;
        top: 14px;
        right: 14px;
        width: 360px;
        max-height: calc(100% - 28px);
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 14px;
        box-shadow: 0 20px 45px rgba(15, 23, 42, 0.18);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: 20;
      }

      .drawer-topbar {
        padding: 10px 14px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .drawer-eyebrow {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #475569;
      }

      .close-btn {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        background: #ffffff;
        font-size: 18px;
        line-height: 1;
        color: #334155;
        cursor: pointer;
      }

      .drawer-body {
        padding: 14px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .hero-photo {
        width: 100%;
        height: 160px;
        object-fit: cover;
        border-radius: 10px;
      }

      .place-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .category-pill,
      .community-pill,
      .geo-pill {
        display: inline-block;
        width: fit-content;
        padding: 3px 9px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
      }

      .community-pill {
        background: #ccfbf1;
        color: #0f766e;
      }

      .geo-pill {
        background: #e0f2fe;
        color: #0369a1;
      }

      .price-tag {
        font-size: 12px;
        font-weight: 700;
        background: #f1f5f9;
        color: #0f172a;
        padding: 3px 8px;
        border-radius: 6px;
      }

      .drawer-title {
        margin: 0;
        font-size: 18px;
        font-weight: 800;
        color: #0f172a;
        line-height: 1.25;
      }

      .drawer-address {
        margin: 0;
        font-size: 13px;
        color: #475569;
        line-height: 1.4;
      }

      .coord-chip {
        margin: 0;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12px;
        background: #f1f5f9;
        color: #0f172a;
        padding: 6px 9px;
        border-radius: 8px;
      }

      .place-id-text {
        margin: 0;
        font-size: 11px;
        color: #64748b;
        word-break: break-all;
      }

      .rating-row {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .rating-score {
        font-weight: 800;
        color: #b45309;
        font-size: 14px;
      }

      .rating-total {
        font-size: 12.5px;
        color: #64748b;
      }

      .drawer-actions,
      .pin-cta-row {
        display: flex;
        gap: 8px;
      }

      .btn-drawer-primary,
      .btn-save-spot {
        flex: 1;
        height: 36px;
        border-radius: 8px;
        border: none;
        background: #0f172a;
        color: #ffffff;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
      }

      .btn-drawer-compared {
        background: #d97706;
      }

      .btn-save-spot {
        background: #0f766e;
      }

      .btn-drawer-primary:disabled,
      .btn-save-spot:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      .btn-drawer-link {
        height: 36px;
        padding: 0 12px;
        border-radius: 8px;
        border: 1px solid #cbd5e1;
        color: #0f172a;
        text-decoration: none;
        font-size: 12.5px;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
      }

      .meta-block {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 9px 11px;
        font-size: 12.5px;
        color: #334155;
      }

      .meta-line {
        margin: 2px 0;
      }

      .drawer-section {
        border-top: 1px solid #e2e8f0;
        padding-top: 10px;
      }

      .section-title {
        margin: 0 0 8px;
        font-size: 13px;
        font-weight: 700;
        color: #0f172a;
      }

      .hours-list {
        margin: 0;
        padding-left: 16px;
        font-size: 12px;
        color: #334155;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      .reviews-stack {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .review-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 9px;
      }

      .review-head {
        display: flex;
        justify-content: space-between;
        font-size: 12.5px;
        color: #0f172a;
      }

      .review-rating {
        color: #b45309;
        font-weight: 700;
      }

      .review-time {
        font-size: 11px;
        color: #64748b;
      }

      .review-text {
        margin: 5px 0 0;
        font-size: 12px;
        color: #334155;
        line-height: 1.45;
      }

      .muted-note {
        margin: 0;
        font-size: 12.5px;
        color: #64748b;
      }

      .community-form {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px;
        border: 1px solid #99f6e4;
        background: #f0fdfa;
        border-radius: 10px;
      }

      .form-label {
        font-size: 12px;
        font-weight: 700;
        color: #134e4a;
      }

      .form-input,
      .form-textarea {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #99f6e4;
        border-radius: 8px;
        padding: 8px 10px;
        font-size: 13px;
        font-family: inherit;
        background: #ffffff;
        color: #0f172a;
      }

      @media (max-width: 720px) {
        .details-drawer {
          left: 10px;
          right: 10px;
          width: auto;
          top: 10px;
          max-height: 70vh;
        }
      }
    `,
  ],
})
export class DetailsDrawerComponent {
  readonly selectedPlace = input<DiscoveredPlace | null>(null);
  readonly selectedCommunitySpot = input<CommunitySpot | null>(null);
  readonly reverseGeocode = input<ReverseGeocodeInspection | null>(null);
  readonly detailsLoading = input<boolean>(false);
  readonly isCompared = input<boolean>(false);
  readonly comparisonCount = input<number>(0);

  readonly closeDrawer = output<void>();
  readonly toggleCompare = output<DiscoveredPlace>();
  readonly saveCommunitySpot = output<{
    name: string;
    note: string;
    category: PlaceCategory;
    geo: ReverseGeocodeInspection;
  }>();

  readonly categoryMeta = CATEGORY_METADATA;
  readonly categories = CORE_PLACE_CATEGORIES;

  readonly pinFormExpanded = signal(true);
  spotName = '';
  spotNote = '';
  spotCategory: PlaceCategory = 'park';

  submitCommunitySpot(geo: ReverseGeocodeInspection): void {
    if (!this.spotName.trim()) {
      return;
    }
    this.saveCommunitySpot.emit({
      name: this.spotName,
      note: this.spotNote,
      category: this.spotCategory,
      geo,
    });
    this.spotName = '';
    this.spotNote = '';
  }
}
