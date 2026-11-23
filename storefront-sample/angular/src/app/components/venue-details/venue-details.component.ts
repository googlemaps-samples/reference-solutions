import { CommonModule } from '@angular/common';
import { Component, input, signal } from '@angular/core';
import { ClinicDetails } from '../../models/storefront.models';

@Component({
  selector: 'app-venue-details',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card" data-testid="venue-details-panel">
      <div class="card-header">
        <div>
          <span class="eyebrow">San Francisco Multi-Specialty Clinic</span>
          <h2 class="card-title">{{ clinic()?.name || '450 Sutter Dental Practice' }}</h2>
        </div>
        @if (clinic()?.isOpenNow !== null && clinic()?.isOpenNow !== undefined) {
          <span
            class="open-badge"
            [class.open]="clinic()?.isOpenNow"
            [class.closed]="clinic()?.isOpenNow === false"
          >
            {{ clinic()?.isOpenNow ? 'Open Now' : 'Closed' }}
          </span>
        }
      </div>

      @if (loading()) {
        <div class="loading-box">Loading live clinic details, photos, and Google reviews...</div>
      } @else if (errorMessage()) {
        <div class="error-box">{{ errorMessage() }}</div>
      } @else if (clinic(); as c) {
        <div class="rating-row">
          @if (c.rating !== null) {
            <span class="rating-score">{{ c.rating.toFixed(1) }}</span>
            <span class="stars" [attr.aria-label]="c.rating + ' out of 5 stars'">
              @for (star of starArray(c.rating); track $index) {
                <span class="star" [class.filled]="star">&#9733;</span>
              }
            </span>
          }
          <span class="review-count">({{ c.userRatingCount }} Google reviews)</span>
        </div>

        <p class="address-line">{{ c.formattedAddress }}</p>

        <div class="meta-links">
          @if (c.nationalPhoneNumber) {
            <a class="meta-chip" [href]="'tel:' + c.nationalPhoneNumber">
              {{ c.nationalPhoneNumber }}
            </a>
          }
          @if (c.websiteUri) {
            <a class="meta-chip" [href]="c.websiteUri" target="_blank" rel="noopener noreferrer">
              Clinic Website
            </a>
          }
          @if (c.googleMapsUri) {
            <a class="meta-chip" [href]="c.googleMapsUri" target="_blank" rel="noopener noreferrer">
              View on Google Maps
            </a>
          }
        </div>

        @if (c.photos.length > 0) {
          <div class="photo-strip" aria-label="Clinic photos from Google Places">
            @for (photo of c.photos; track photo.url) {
              <figure class="photo-card">
                <img [src]="photo.url" [alt]="c.name + ' clinic photo'" loading="lazy" />
                <figcaption>
                  Photo by
                  @if (photo.authorUri) {
                    <a [href]="photo.authorUri" target="_blank" rel="noopener noreferrer">
                      {{ photo.authorName }}
                    </a>
                  } @else {
                    <span>{{ photo.authorName }}</span>
                  }
                </figcaption>
              </figure>
            }
          </div>
        }

        @if (c.weekdayDescriptions.length > 0) {
          <div class="hours-section">
            <button
              type="button"
              class="hours-toggle"
              (click)="hoursExpanded.set(!hoursExpanded())"
              [attr.aria-expanded]="hoursExpanded()"
            >
              <span>Weekly Clinic Hours</span>
              <span>{{ hoursExpanded() ? 'Hide' : 'Show' }}</span>
            </button>
            @if (hoursExpanded()) {
              <ul class="hours-list">
                @for (dayLine of c.weekdayDescriptions; track dayLine) {
                  <li>{{ dayLine }}</li>
                }
              </ul>
            }
          </div>
        }

        <div class="reviews-section">
          <div class="reviews-header">
            <h3>Patient Reviews</h3>
            <span class="google-attrib">Powered by Google Places</span>
          </div>

          <div class="reviews-list" data-testid="venue-reviews-list">
            @if (c.reviews.length === 0) {
              <p class="empty-reviews">No recent reviews returned for this venue.</p>
            } @else {
              @for (review of c.reviews; track $index) {
                <article class="review-item">
                  <div class="review-top">
                    <div class="reviewer">
                      @if (review.authorPhotoUri) {
                        <img
                          class="reviewer-avatar"
                          [src]="review.authorPhotoUri"
                          [alt]="review.authorName"
                          loading="lazy"
                        />
                      }
                      <div>
                        @if (review.authorUri) {
                          <a
                            class="reviewer-name"
                            [href]="review.authorUri"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {{ review.authorName }}
                          </a>
                        } @else {
                          <span class="reviewer-name">{{ review.authorName }}</span>
                        }
                        <span class="review-time">{{ review.relativeTime }}</span>
                      </div>
                    </div>
                    <span class="review-stars">{{ review.rating }} &#9733;</span>
                  </div>
                  @if (review.text) {
                    <p class="review-text">{{ review.text }}</p>
                  }
                </article>
              }
            }
          </div>
        </div>
      }
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

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
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
        font-size: 1.15rem;
        font-weight: 700;
        color: var(--text-primary);
      }

      .open-badge {
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
        white-space: nowrap;
      }

      .open-badge.open {
        background: var(--success-bg);
        color: var(--success-text);
      }

      .open-badge.closed {
        background: var(--closed-bg);
        color: var(--closed-text);
      }

      .loading-box,
      .error-box {
        margin-top: 12px;
        padding: 12px;
        border-radius: 10px;
        font-size: 0.86rem;
      }

      .loading-box {
        background: var(--bg-subtle);
        color: var(--text-secondary);
      }

      .error-box {
        background: var(--closed-bg);
        color: var(--closed-text);
      }

      .rating-row {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 10px;
      }

      .rating-score {
        font-weight: 700;
        font-size: 0.95rem;
      }

      .stars {
        display: inline-flex;
        gap: 1px;
      }

      .star {
        color: #d0d7e2;
        font-size: 0.92rem;
      }

      .star.filled {
        color: #f59e0b;
      }

      .review-count {
        font-size: 0.82rem;
        color: var(--text-secondary);
      }

      .address-line {
        margin: 8px 0 10px;
        font-size: 0.86rem;
        color: var(--text-secondary);
        line-height: 1.45;
      }

      .meta-links {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 14px;
      }

      .meta-chip {
        display: inline-flex;
        align-items: center;
        padding: 5px 10px;
        border-radius: 8px;
        background: var(--bg-subtle);
        border: 1px solid var(--border-subtle);
        font-size: 0.78rem;
        font-weight: 600;
        color: var(--brand-primary);
      }

      .photo-strip {
        display: flex;
        gap: 10px;
        overflow-x: auto;
        padding-bottom: 6px;
        margin-bottom: 12px;
      }

      .photo-card {
        margin: 0;
        flex: 0 0 156px;
        border-radius: 10px;
        overflow: hidden;
        border: 1px solid var(--border-subtle);
        background: var(--bg-subtle);
      }

      .photo-card img {
        display: block;
        width: 100%;
        height: 98px;
        object-fit: cover;
      }

      .photo-card figcaption {
        padding: 4px 8px;
        font-size: 0.7rem;
        color: var(--text-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .hours-section {
        border-top: 1px solid var(--border-subtle);
        padding-top: 10px;
        margin-bottom: 14px;
      }

      .hours-toggle {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 0;
        background: transparent;
        border: none;
        cursor: pointer;
        color: var(--text-primary);
        font-size: 0.86rem;
        font-weight: 600;
      }

      .hours-list {
        list-style: none;
        margin: 6px 0 0;
        padding: 0;
        display: grid;
        gap: 4px;
        font-size: 0.8rem;
        color: var(--text-secondary);
      }

      .reviews-section {
        border-top: 1px solid var(--border-subtle);
        padding-top: 12px;
      }

      .reviews-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }

      .reviews-header h3 {
        font-size: 0.92rem;
        font-weight: 700;
      }

      .google-attrib {
        font-size: 0.72rem;
        color: var(--text-muted);
      }

      .reviews-list {
        display: grid;
        gap: 10px;
      }

      .review-item {
        padding: 10px 12px;
        border-radius: 10px;
        background: var(--bg-subtle);
        border: 1px solid var(--border-subtle);
      }

      .review-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
      }

      .reviewer {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .reviewer-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        object-fit: cover;
      }

      .reviewer-name {
        display: block;
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--text-primary);
      }

      .review-time {
        display: block;
        font-size: 0.72rem;
        color: var(--text-muted);
      }

      .review-stars {
        font-size: 0.78rem;
        font-weight: 700;
        color: #b45309;
        background: #fef3c7;
        padding: 2px 7px;
        border-radius: 999px;
      }

      .review-text {
        margin: 8px 0 0;
        font-size: 0.81rem;
        line-height: 1.45;
        color: var(--text-secondary);
      }

      .empty-reviews {
        font-size: 0.82rem;
        color: var(--text-muted);
        margin: 0;
      }
    `,
  ],
})
export class VenueDetailsComponent {
  readonly clinic = input<ClinicDetails | null>(null);
  readonly loading = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);
  readonly hoursExpanded = signal<boolean>(false);

  starArray(rating: number): boolean[] {
    const rounded = Math.round(rating);
    return [1, 2, 3, 4, 5].map((index) => index <= rounded);
  }
}
