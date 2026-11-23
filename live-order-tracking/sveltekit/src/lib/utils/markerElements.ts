/**
 * Creates DOM elements for Google Maps AdvancedMarkerElement pins.
 * Uses document.createElement / createElementNS and textContent exclusively (never innerHTML).
 */

function createSvgIcon(pathData: string, viewBox = '0 0 24 24', size = 16): SVGSVGElement {
	const svgNS = 'http://www.w3.org/2000/svg';
	const svg = document.createElementNS(svgNS, 'svg');
	svg.setAttribute('width', String(size));
	svg.setAttribute('height', String(size));
	svg.setAttribute('viewBox', viewBox);
	svg.setAttribute('fill', 'none');
	svg.setAttribute('stroke', 'currentColor');
	svg.setAttribute('stroke-width', '2.2');
	svg.setAttribute('stroke-linecap', 'round');
	svg.setAttribute('stroke-linejoin', 'round');
	svg.setAttribute('aria-hidden', 'true');

	const path = document.createElementNS(svgNS, 'path');
	path.setAttribute('d', pathData);
	svg.appendChild(path);
	return svg;
}

export function createKitchenMarkerElement(): HTMLDivElement {
	const wrapper = document.createElement('div');
	wrapper.className = 'gmp-pin gmp-pin--kitchen';

	const badge = document.createElement('div');
	badge.className = 'gmp-pin__badge';
	badge.appendChild(
		createSvgIcon('M3 9l9-6 9 6v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z')
	);

	const label = document.createElement('span');
	label.className = 'gmp-pin__label';
	label.textContent = 'Kitchen Hub';

	const stem = document.createElement('div');
	stem.className = 'gmp-pin__stem';

	badge.appendChild(label);
	wrapper.appendChild(badge);
	wrapper.appendChild(stem);
	return wrapper;
}

export function createCustomerMarkerElement(eligible: boolean): HTMLDivElement {
	const wrapper = document.createElement('div');
	wrapper.className = eligible ? 'gmp-pin gmp-pin--customer' : 'gmp-pin gmp-pin--ineligible';

	const badge = document.createElement('div');
	badge.className = 'gmp-pin__badge';
	badge.appendChild(
		createSvgIcon('M12 22s8-6.5 8-13a8 8 0 1 0-16 0c0 6.5 8 13 8 13z')
	);

	const label = document.createElement('span');
	label.className = 'gmp-pin__label';
	label.textContent = eligible ? 'Drop-off' : 'Out of Zone';

	const stem = document.createElement('div');
	stem.className = 'gmp-pin__stem';

	badge.appendChild(label);
	wrapper.appendChild(badge);
	wrapper.appendChild(stem);
	return wrapper;
}

export interface CourierMarkerHandle {
	element: HTMLDivElement;
	updatePose: (headingDegrees: number, active: boolean) => void;
}

export function createCourierMarkerElement(): CourierMarkerHandle {
	const wrapper = document.createElement('div');
	wrapper.className = 'gmp-courier-marker';

	const pulse = document.createElement('div');
	pulse.className = 'gmp-courier-marker__pulse';

	const puck = document.createElement('div');
	puck.className = 'gmp-courier-marker__puck';

	const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	arrow.setAttribute('width', '20');
	arrow.setAttribute('height', '20');
	arrow.setAttribute('viewBox', '0 0 24 24');
	arrow.setAttribute('fill', 'currentColor');
	arrow.setAttribute('aria-hidden', 'true');

	const navPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
	navPath.setAttribute('d', 'M12 2L19 21L12 17L5 21L12 2Z');
	arrow.appendChild(navPath);

	puck.appendChild(arrow);

	const tag = document.createElement('div');
	tag.className = 'gmp-courier-marker__tag';
	tag.textContent = 'Courier';

	wrapper.appendChild(pulse);
	wrapper.appendChild(puck);
	wrapper.appendChild(tag);

	return {
		element: wrapper,
		updatePose: (headingDegrees: number, active: boolean) => {
			puck.style.transform = `rotate(${Math.round(headingDegrees)}deg)`;
			wrapper.classList.toggle('is-active', active);
		}
	};
}
