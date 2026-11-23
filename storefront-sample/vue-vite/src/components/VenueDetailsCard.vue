<script setup lang="ts">
import { ref } from 'vue';
import type { ClinicVenueData } from '../types/storefront';

defineProps<{
  venue: ClinicVenueData | null;
  loading: boolean;
  errorMessage: string | null;
}>();

const hoursExpanded = ref(false);
</script>

<template>
  <section class="panel-card" data-testid="venue-details-panel">
    <div class="panel-header-row">
      <div>
        <span class="eyebrow">Live Google Places Storefront</span>
        <h2 class="panel-title">
          {{ venue?.displayName ?? 'San Francisco Dental Clinic' }}
        </h2>
      </div>
      <div v-if="venue?.rating !== null && venue?.rating !== undefined" class="rating-badge">
        <span class="star-icon" aria-hidden="true">★</span>
        <span class="rating-score">{{ venue.rating.toFixed(1) }}</span>
        <span v-if="venue.userRatingCount" class="rating-count">
          ({{ venue.userRatingCount.toLocaleString() }})
        </span>
      </div>
    </div>

    <div v-if="loading" class="skeleton-stack" aria-busy="true">
      <div class="skeleton-line wide" />
      <div class="skeleton-line medium" />
      <div class="skeleton-photos">
        <div class="skeleton-box" />
        <div class="skeleton-box" />
        <div class="skeleton-box" />
      </div>
    </div>

    <div v-else-if="errorMessage" class="notice-box notice-warning">
      <strong>Live Place details unavailable</strong>
      <p>{{ errorMessage }}</p>
    </div>

    <template v-else-if="venue">
      <div v-if="venue.photos.length > 0" class="photo-strip">
        <figure v-for="photo in venue.photos" :key="photo.id" class="photo-tile">
          <img
            :src="photo.url"
            :alt="`${venue.displayName} exterior or interior photo`"
            loading="lazy"
          />
          <figcaption v-if="photo.authorName" class="photo-attribution">
            Photo:
            <a
              v-if="photo.authorUri"
              :href="photo.authorUri"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ photo.authorName }}
            </a>
            <span v-else>{{ photo.authorName }}</span>
          </figcaption>
        </figure>
      </div>

      <div class="venue-meta-list">
        <div class="meta-item">
          <span class="meta-label">Address</span>
          <span class="meta-value">{{ venue.formattedAddress }}</span>
        </div>

        <div class="meta-item">
          <span class="meta-label">Status</span>
          <span class="meta-value status-inline">
            <strong
              :class="{
                'text-open': venue.openStatus.isOpen === true,
                'text-closed': venue.openStatus.isOpen === false,
              }"
            >
              {{ venue.openStatus.label }}
            </strong>
            <span class="meta-muted">· {{ venue.openStatus.detail }}</span>
          </span>
        </div>

        <div v-if="venue.nationalPhoneNumber" class="meta-item">
          <span class="meta-label">Phone</span>
          <a :href="`tel:${venue.nationalPhoneNumber}`" class="meta-link">
            {{ venue.nationalPhoneNumber }}
          </a>
        </div>

        <div class="meta-links-row">
          <a
            v-if="venue.websiteUri"
            :href="venue.websiteUri"
            target="_blank"
            rel="noopener noreferrer"
            class="chip-link"
          >
            Clinic Website ↗
          </a>
          <a
            v-if="venue.googleMapsUri"
            :href="venue.googleMapsUri"
            target="_blank"
            rel="noopener noreferrer"
            class="chip-link"
          >
            View on Google Maps ↗
          </a>
        </div>
      </div>

      <div v-if="venue.weekdayDescriptions.length > 0" class="hours-accordion">
        <button
          type="button"
          class="hours-toggle"
          :aria-expanded="hoursExpanded"
          @click="hoursExpanded = !hoursExpanded"
        >
          <span>Weekly Clinic Hours</span>
          <span class="chevron">{{ hoursExpanded ? '▲' : '▼' }}</span>
        </button>
        <ul v-if="hoursExpanded" class="hours-list">
          <li v-for="line in venue.weekdayDescriptions" :key="line">
            {{ line }}
          </li>
        </ul>
      </div>

      <div class="reviews-section">
        <div class="reviews-header">
          <h3>Patient Reviews</h3>
          <span class="google-attr-note">Powered by Google</span>
        </div>

        <ul
          v-if="venue.reviews.length > 0"
          class="reviews-list"
          data-testid="venue-reviews-list"
        >
          <li v-for="review in venue.reviews" :key="review.id" class="review-card">
            <div class="review-top">
              <div class="review-author">
                <span class="author-avatar" aria-hidden="true">
                  {{ review.authorName.slice(0, 1).toUpperCase() }}
                </span>
                <div>
                  <a
                    v-if="review.authorUri"
                    :href="review.authorUri"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="author-name"
                  >
                    {{ review.authorName }}
                  </a>
                  <span v-else class="author-name">{{ review.authorName }}</span>
                  <div class="review-time">{{ review.relativePublishTime }}</div>
                </div>
              </div>
              <div v-if="review.rating !== null" class="review-stars" :aria-label="`${review.rating} out of 5 stars`">
                ★ {{ review.rating.toFixed(1) }}
              </div>
            </div>
            <p v-if="review.text" class="review-text">{{ review.text }}</p>
          </li>
        </ul>
        <p v-else class="empty-muted" data-testid="venue-reviews-list">
          No published reviews returned for this Place listing.
        </p>
      </div>
    </template>
  </section>
</template>
