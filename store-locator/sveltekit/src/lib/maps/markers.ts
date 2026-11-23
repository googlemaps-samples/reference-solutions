import { BRANCH_TYPE_LABELS, type BranchLocation, type BranchType } from '$lib/types';

const SHORT_TYPE_LABELS: Record<BranchType, string> = {
	flagship: 'Flagship',
	kiosk: 'Kiosk',
	atm: 'ATM'
};

const SHORT_TYPE_GLYPHS: Record<BranchType, string> = {
	flagship: 'F',
	kiosk: 'K',
	atm: '$'
};

/**
 * Builds a custom DOM element for AdvancedMarkerElement (using safe DOM APIs, never innerHTML).
 */
export function createBranchMarkerElement(
	branch: BranchLocation,
	isSelected: boolean,
	isFastest: boolean
): HTMLElement {
	const container = document.createElement('div');
	container.className = `gmp-branch-pin ${branch.type}`;
	if (isFastest) {
		container.classList.add('fastest');
	}
	if (isSelected) {
		container.classList.add('selected');
	}
	container.setAttribute('aria-label', `${branch.name} (${BRANCH_TYPE_LABELS[branch.type]})`);

	const glyph = document.createElement('span');
	glyph.textContent = SHORT_TYPE_GLYPHS[branch.type];
	glyph.style.display = 'inline-flex';
	glyph.style.alignItems = 'center';
	glyph.style.justifyContent = 'center';
	glyph.style.width = '18px';
	glyph.style.height = '18px';
	glyph.style.borderRadius = '999px';
	glyph.style.background = 'rgba(255, 255, 255, 0.22)';
	glyph.style.fontSize = '10.5px';
	glyph.style.fontWeight = '800';

	const label = document.createElement('span');
	label.textContent =
		isFastest && !isSelected
			? `${SHORT_TYPE_LABELS[branch.type]} • Fastest`
			: SHORT_TYPE_LABELS[branch.type];

	container.appendChild(glyph);
	container.appendChild(label);
	return container;
}

export function createOriginMarkerElement(labelText = 'Origin'): HTMLElement {
	const container = document.createElement('div');
	container.className = 'gmp-origin-pin';
	container.setAttribute('aria-label', `Starting location: ${labelText}`);

	const dot = document.createElement('span');
	dot.textContent = '●';
	dot.style.fontSize = '10px';

	const text = document.createElement('span');
	text.textContent = 'Start';

	container.appendChild(dot);
	container.appendChild(text);
	return container;
}

export function createClusterMarkerElement(count: number): HTMLElement {
	const badge = document.createElement('div');
	badge.className = 'gmp-cluster-pin';
	badge.textContent = String(count);
	badge.setAttribute('aria-label', `Cluster of ${count} NYC branches`);
	return badge;
}

export function createInfoWindowContent(
	branch: BranchLocation,
	isFastest: boolean
): HTMLElement {
	const card = document.createElement('div');
	card.className = 'gmp-infowindow';

	const typeEl = document.createElement('div');
	typeEl.className = 'gmp-infowindow-type';
	typeEl.textContent = isFastest
		? `${BRANCH_TYPE_LABELS[branch.type]} • Fastest Nearby`
		: BRANCH_TYPE_LABELS[branch.type];
	card.appendChild(typeEl);

	const titleEl = document.createElement('h3');
	titleEl.className = 'gmp-infowindow-title';
	titleEl.textContent = branch.name;
	card.appendChild(titleEl);

	const addressEl = document.createElement('div');
	addressEl.className = 'gmp-infowindow-address';
	addressEl.textContent = branch.address;
	card.appendChild(addressEl);

	if (branch.durationText && branch.distanceText) {
		const etaEl = document.createElement('div');
		etaEl.className = 'gmp-infowindow-eta';
		etaEl.textContent = `${branch.durationText} (${branch.distanceText})`;
		card.appendChild(etaEl);
	}

	if (branch.weekdayDescriptions.length > 0) {
		const hoursEl = document.createElement('div');
		hoursEl.className = 'gmp-infowindow-hours';
		hoursEl.textContent = branch.weekdayDescriptions[0];
		card.appendChild(hoursEl);
	}

	return card;
}
