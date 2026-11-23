<script lang="ts">
	import type { ClinicProfile } from '$lib/types/storefront';

	interface Props {
		clinic: ClinicProfile | null;
		loading: boolean;
		errorMessage: string | null;
	}

	let { clinic, loading, errorMessage }: Props = $props();
	let hoursExpanded = $state(false);

	function renderStars(rating: number): string {
		const rounded = Math.round(rating);
		return '★'.repeat(Math.max(0, Math.min(5, rounded))) + '☆'.repeat(Math.max(0, 5 - rounded));
	}
</script>

<section class="card" data-testid="venue-details-panel">
	<div class="card-header">
		<div>
			<p class="eyebrow">Live Google Places Profile</p>
			<h2 class="card-title">{clinic?.displayName ?? 'San Francisco Dental Clinic'}</h2>
		</div>
		{#if clinic?.googleMapsUri}
			<a
				href={clinic.googleMapsUri}
				target="_blank"
				rel="noopener noreferrer"
				class="external-chip"
			>
				View on Google Maps ↗
			</a>
		{/if}
	</div>

	{#if loading}
		<div class="skeleton-stack" aria-busy="true">
			<div class="skeleton-line w-75"></div>
			<div class="skeleton-line w-50"></div>
			<div class="skeleton-strip"></div>
		</div>
	{:else if errorMessage}
		<div class="notice-banner notice-warning">
			<strong>Places details unavailable:</strong>
			<span>{errorMessage}</span>
		</div>
	{:else if clinic}
		<div class="venue-summary">
			<div class="rating-row">
				{#if clinic.rating !== null}
					<span class="rating-score">{clinic.rating.toFixed(1)}</span>
					<span class="rating-stars" aria-label={`${clinic.rating} out of 5 stars`}>
						{renderStars(clinic.rating)}
					</span>
				{/if}
				{#if clinic.userRatingCount !== null}
					<span class="rating-count">({clinic.userRatingCount.toLocaleString()} Google reviews)</span>
				{/if}
			</div>

			<div class="open-row">
				<span
					class="open-badge"
					class:is-open={clinic.openNow.isOpen === true}
					class:is-closed={clinic.openNow.isOpen === false}
				>
					{clinic.openNow.label}
				</span>
				<span class="open-detail">{clinic.openNow.detail}</span>
			</div>

			<p class="venue-address">{clinic.formattedAddress}</p>

			<div class="venue-links">
				{#if clinic.nationalPhoneNumber}
					<a href={`tel:${clinic.nationalPhoneNumber}`} class="detail-pill">
						{clinic.nationalPhoneNumber}
					</a>
				{/if}
				{#if clinic.websiteUri}
					<a
						href={clinic.websiteUri}
						target="_blank"
						rel="noopener noreferrer"
						class="detail-pill"
					>
						Clinic Website ↗
					</a>
				{/if}
			</div>
		</div>

		{#if clinic.photos.length > 0}
			<div class="photo-strip" aria-label="Clinic photos from Google Places">
				{#each clinic.photos as photo, idx (photo.uri)}
					<figure class="photo-tile">
						<img
							src={photo.uri}
							alt={`${clinic.displayName} photo ${idx + 1}`}
							loading="lazy"
						/>
						{#if photo.attribution}
							<figcaption>Photo: {photo.attribution}</figcaption>
						{/if}
					</figure>
				{/each}
			</div>
		{/if}

		{#if clinic.weekdayDescriptions.length > 0}
			<div class="hours-block">
				<button
					type="button"
					class="hours-toggle"
					aria-expanded={hoursExpanded}
					onclick={() => (hoursExpanded = !hoursExpanded)}
				>
					<span>Weekly Opening Hours</span>
					<span class="chevron">{hoursExpanded ? '▲' : '▼'}</span>
				</button>
				{#if hoursExpanded}
					<ul class="hours-list">
						{#each clinic.weekdayDescriptions as line (line)}
							<li>{line}</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}

		<div class="reviews-section">
			<div class="reviews-header">
				<h3>Recent Patient Reviews</h3>
				<span class="google-attrib">Powered by Google</span>
			</div>
			<div class="reviews-list" data-testid="venue-reviews-list">
				{#if clinic.reviews.length === 0}
					<p class="muted-copy">No public reviews returned for this venue.</p>
				{:else}
					{#each clinic.reviews as review, i (`${review.authorName}-${i}`)}
						<article class="review-item">
							<div class="review-meta">
								<div class="review-author">
									{#if review.authorPhotoUri}
										<img
											src={review.authorPhotoUri}
											alt={review.authorName}
											class="author-avatar"
											referrerpolicy="no-referrer"
										/>
									{:else}
										<div class="author-avatar placeholder-avatar" aria-hidden="true">
											{review.authorName.slice(0, 1).toUpperCase()}
										</div>
									{/if}
									<div>
										{#if review.authorUri}
											<a
												href={review.authorUri}
												target="_blank"
												rel="noopener noreferrer"
												class="author-name"
											>
												{review.authorName}
											</a>
										{:else}
											<span class="author-name">{review.authorName}</span>
										{/if}
										<div class="review-submeta">
											<span class="review-stars">{renderStars(review.rating)}</span>
											{#if review.relativePublishTimeDescription}
												<span>· {review.relativePublishTimeDescription}</span>
											{/if}
										</div>
									</div>
								</div>
							</div>
							{#if review.text}
								<p class="review-text">{review.text}</p>
							{/if}
						</article>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</section>
