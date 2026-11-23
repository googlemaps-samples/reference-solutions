<script lang="ts">
	import { formatPriceFull } from '$lib/data/properties';
	import type { PropertyListing } from '$lib/types';

	interface Props {
		property: PropertyListing;
		isSelected: boolean;
		isHovered: boolean;
		onSelect: (property: PropertyListing) => void;
		onHover: (id: string | null) => void;
	}

	let { property, isSelected, isHovered, onSelect, onHover }: Props = $props();
</script>

<article
	class="property-card"
	class:is-selected={isSelected}
	class:is-hovered={isHovered}
	data-testid="property-card"
	data-property-id={property.id}
	onmouseenter={() => onHover(property.id)}
	onmouseleave={() => onHover(null)}
>
	<button
		type="button"
		class="property-card-btn"
		onclick={() => onSelect(property)}
		aria-pressed={isSelected}
	>
		<div
			class="card-hero"
			style={`--card-accent: ${property.accentColor};`}
		>
			<svg
				class="card-arch-svg"
				viewBox="0 0 320 110"
				preserveAspectRatio="xMidYMid slice"
				aria-hidden="true"
			>
				<defs>
					<linearGradient id={`grad-${property.id}`} x1="0" y1="0" x2="1" y2="1">
						<stop offset="0%" stop-color={property.accentColor} stop-opacity="0.92" />
						<stop offset="100%" stop-color="#0f172a" stop-opacity="0.95" />
					</linearGradient>
				</defs>
				<rect width="320" height="110" fill={`url(#grad-${property.id})`} />
				<path
					d="M0 90 L48 64 L92 78 L156 36 L216 68 L272 48 L320 74 L320 110 L0 110 Z"
					fill="rgba(255,255,255,0.08)"
				/>
				<g fill="rgba(255,255,255,0.16)">
					<rect x="28" y="42" width="44" height="54" rx="2" />
					<rect x="82" y="28" width="56" height="68" rx="2" />
					<rect x="148" y="48" width="40" height="48" rx="2" />
					<rect x="200" y="34" width="60" height="62" rx="2" />
				</g>
				<g fill="rgba(255,255,255,0.34)">
					<rect x="92" y="38" width="12" height="14" rx="1" />
					<rect x="112" y="38" width="12" height="14" rx="1" />
					<rect x="92" y="60" width="12" height="14" rx="1" />
					<rect x="112" y="60" width="12" height="14" rx="1" />
					<rect x="212" y="44" width="14" height="16" rx="1" />
					<rect x="234" y="44" width="14" height="16" rx="1" />
				</g>
			</svg>

			<div class="card-badges">
				<span class="badge-type">{property.propertyType}</span>
				<span class="badge-dom">{property.daysOnMarket}d on market</span>
			</div>
			<div class="card-parcel-pill">APN {property.parcel.apn} · {property.parcel.lotSqFt.toLocaleString()} sq ft lot</div>
		</div>

		<div class="card-body">
			<div class="card-price-row">
				<span class="card-price">{formatPriceFull(property.price)}</span>
				<span class="card-neighborhood">{property.neighborhood}</span>
			</div>
			<div class="card-specs">
				<span><strong>{property.beds}</strong> bd</span>
				<span class="dot">·</span>
				<span><strong>{property.baths}</strong> ba</span>
				<span class="dot">·</span>
				<span><strong>{property.sqft.toLocaleString()}</strong> sqft</span>
				{#if property.hoaMonthly > 0}
					<span class="dot">·</span>
					<span>${property.hoaMonthly}/mo HOA</span>
				{/if}
			</div>
			<div class="card-address">{property.address}, {property.city}, {property.state} {property.zip}</div>
			<div class="card-highlights">
				{#each property.highlights as tag}
					<span class="highlight-chip">{tag}</span>
				{/each}
			</div>
		</div>
	</button>
</article>
