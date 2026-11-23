import type { Branch, BranchType } from '../types/locator';
import { BRANCH_TYPE_LABELS, SERVICE_LABELS } from './branchClassifier';

const SVG_NS = 'http://www.w3.org/2000/svg';

interface BranchPalette {
  bg: string;
  border: string;
  badgeText: string;
  shortLabel: string;
}

export const BRANCH_PALETTES: Record<BranchType, BranchPalette> = {
  flagship: {
    bg: '#4338ca',
    border: '#312e81',
    badgeText: 'FLAGSHIP',
    shortLabel: 'Store',
  },
  kiosk: {
    bg: '#d97706',
    border: '#92400e',
    badgeText: 'KIOSK',
    shortLabel: 'Kiosk',
  },
  atm: {
    bg: '#059669',
    border: '#065f46',
    badgeText: '24/7 ATM',
    shortLabel: 'ATM',
  },
};

function createSvgIcon(branchType: BranchType): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '15');
  svg.setAttribute('height', '15');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.1');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');

  if (branchType === 'flagship') {
    const p1 = document.createElementNS(SVG_NS, 'path');
    p1.setAttribute('d', 'M3 9l2-5h14l2 5');
    const p2 = document.createElementNS(SVG_NS, 'path');
    p2.setAttribute('d', 'M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9');
    const p3 = document.createElementNS(SVG_NS, 'path');
    p3.setAttribute('d', 'M9 20v-6h6v6');
    svg.append(p1, p2, p3);
  } else if (branchType === 'kiosk') {
    const p1 = document.createElementNS(SVG_NS, 'path');
    p1.setAttribute('d', 'M17 8h1a4 4 0 0 1 0 8h-1');
    const p2 = document.createElementNS(SVG_NS, 'path');
    p2.setAttribute('d', 'M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z');
    const p3 = document.createElementNS(SVG_NS, 'line');
    p3.setAttribute('x1', '6');
    p3.setAttribute('y1', '2');
    p3.setAttribute('x2', '6');
    p3.setAttribute('y2', '4');
    const p4 = document.createElementNS(SVG_NS, 'line');
    p4.setAttribute('x1', '10');
    p4.setAttribute('y1', '2');
    p4.setAttribute('x2', '10');
    p4.setAttribute('y2', '4');
    svg.append(p1, p2, p3, p4);
  } else {
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', '2');
    rect.setAttribute('y', '5');
    rect.setAttribute('width', '20');
    rect.setAttribute('height', '14');
    rect.setAttribute('rx', '2');
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', '2');
    line.setAttribute('y1', '10');
    line.setAttribute('x2', '22');
    line.setAttribute('y2', '10');
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', '16.5');
    circle.setAttribute('cy', '14.5');
    circle.setAttribute('r', '1.5');
    svg.append(rect, line, circle);
  }

  return svg;
}

export function createBranchMarkerElement(
  branch: Branch,
  isSelected: boolean
): HTMLElement {
  const palette = BRANCH_PALETTES[branch.branchType];
  const wrapper = document.createElement('div');
  wrapper.className = 'gmp-branch-pin';
  wrapper.setAttribute('data-branch-id', branch.id);
  wrapper.setAttribute('data-branch-type', branch.branchType);
  if (isSelected) {
    wrapper.classList.add('is-selected');
  }
  if (branch.isFastest) {
    wrapper.classList.add('is-fastest');
  }

  const pill = document.createElement('div');
  pill.className = 'gmp-branch-pin__pill';
  pill.style.backgroundColor = palette.bg;
  pill.style.borderColor = isSelected ? '#ffffff' : palette.border;

  const iconWrap = document.createElement('span');
  iconWrap.className = 'gmp-branch-pin__icon';
  iconWrap.appendChild(createSvgIcon(branch.branchType));
  pill.appendChild(iconWrap);

  const label = document.createElement('span');
  label.className = 'gmp-branch-pin__label';
  label.textContent = branch.etaText
    ? `${palette.shortLabel} · ${branch.etaText}`
    : palette.shortLabel;
  pill.appendChild(label);

  if (branch.isFastest) {
    const fastDot = document.createElement('span');
    fastDot.className = 'gmp-branch-pin__fast-badge';
    fastDot.textContent = 'FAST';
    pill.appendChild(fastDot);
  }

  const tip = document.createElement('div');
  tip.className = 'gmp-branch-pin__tip';
  tip.style.borderTopColor = isSelected ? '#ffffff' : palette.bg;

  wrapper.append(pill, tip);
  return wrapper;
}

export function createOriginMarkerElement(labelText: string): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'gmp-origin-pin';
  wrapper.setAttribute('title', `Starting location: ${labelText}`);

  const pulse = document.createElement('div');
  pulse.className = 'gmp-origin-pin__pulse';

  const core = document.createElement('div');
  core.className = 'gmp-origin-pin__core';

  const tag = document.createElement('div');
  tag.className = 'gmp-origin-pin__tag';
  tag.textContent = 'YOU';

  wrapper.append(pulse, core, tag);
  return wrapper;
}

export function createClusterMarkerElement(count: number): HTMLElement {
  const container = document.createElement('div');
  container.className = 'gmp-cluster-pin';
  if (count >= 10) {
    container.classList.add('is-large');
  } else if (count >= 5) {
    container.classList.add('is-medium');
  }

  const countSpan = document.createElement('span');
  countSpan.className = 'gmp-cluster-pin__count';
  countSpan.textContent = String(count);

  const subSpan = document.createElement('span');
  subSpan.className = 'gmp-cluster-pin__sub';
  subSpan.textContent = count === 1 ? 'branch' : 'branches';

  container.append(countSpan, subSpan);
  return container;
}

export function createInfoWindowContent(branch: Branch): HTMLElement {
  const root = document.createElement('div');
  root.className = 'gmp-info-window';

  const headerRow = document.createElement('div');
  headerRow.className = 'gmp-info-window__badges';

  const typeBadge = document.createElement('span');
  typeBadge.className = `gmp-info-window__type is-${branch.branchType}`;
  typeBadge.textContent = BRANCH_TYPE_LABELS[branch.branchType];
  headerRow.appendChild(typeBadge);

  if (branch.isFastest) {
    const fastBadge = document.createElement('span');
    fastBadge.className = 'gmp-info-window__fastest';
    fastBadge.textContent = 'Fastest Nearby';
    headerRow.appendChild(fastBadge);
  }

  const title = document.createElement('h3');
  title.className = 'gmp-info-window__title';
  title.textContent = branch.name;

  const address = document.createElement('p');
  address.className = 'gmp-info-window__address';
  address.textContent = branch.address;

  root.append(headerRow, title, address);

  if (branch.etaText || branch.distanceText) {
    const routeRow = document.createElement('div');
    routeRow.className = 'gmp-info-window__route';
    routeRow.textContent = [branch.etaText, branch.distanceText]
      .filter(Boolean)
      .join(' • ');
    root.appendChild(routeRow);
  }

  if (branch.rating !== null) {
    const ratingRow = document.createElement('div');
    ratingRow.className = 'gmp-info-window__meta';
    ratingRow.textContent =
      branch.userRatingCount !== null
        ? `★ ${branch.rating.toFixed(1)} (${branch.userRatingCount.toLocaleString()} reviews)`
        : `★ ${branch.rating.toFixed(1)}`;
    root.appendChild(ratingRow);
  }

  if (branch.todayHours) {
    const hoursRow = document.createElement('div');
    hoursRow.className = 'gmp-info-window__hours';
    hoursRow.textContent = `Today: ${branch.todayHours}`;
    root.appendChild(hoursRow);
  }

  if (branch.services.length) {
    const tagsWrap = document.createElement('div');
    tagsWrap.className = 'gmp-info-window__tags';
    branch.services.forEach((service) => {
      const chip = document.createElement('span');
      chip.className = 'gmp-info-window__tag';
      chip.textContent = SERVICE_LABELS[service];
      tagsWrap.appendChild(chip);
    });
    root.appendChild(tagsWrap);
  }

  return root;
}
