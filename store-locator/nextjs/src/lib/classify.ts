import type { Branch, BranchType, RawGooglePlace, ServiceTag } from '@/types/locator';

export const NYC_CENTER = {
  lat: 40.7549,
  lng: -73.984,
} as const;

export const DEFAULT_ORIGIN = {
  label: 'Penn Station / Midtown West',
  address: '234 W 31st St, New York, NY 10001',
  location: { lat: 40.7506, lng: -73.9935 },
};

export const NYC_ORIGIN_PRESETS = [
  DEFAULT_ORIGIN,
  {
    label: 'Times Square',
    address: 'Times Square, Manhattan, NY 10036',
    location: { lat: 40.758, lng: -73.9855 },
  },
  {
    label: 'Grand Central Terminal',
    address: '89 E 42nd St, New York, NY 10017',
    location: { lat: 40.7527, lng: -73.9772 },
  },
  {
    label: 'SoHo / Broadway',
    address: 'Broadway & Spring St, New York, NY 10012',
    location: { lat: 40.7229, lng: -73.9985 },
  },
  {
    label: 'Financial District',
    address: 'Wall St & Broad St, New York, NY 10005',
    location: { lat: 40.7074, lng: -74.0113 },
  },
] as const;

export const BRANCH_TYPE_META: Record<
  BranchType,
  {
    label: string;
    shortLabel: string;
    color: string;
    bgSoft: string;
    borderSoft: string;
  }
> = {
  flagship: {
    label: 'Flagship Store',
    shortLabel: 'Flagship',
    color: '#1d4ed8',
    bgSoft: '#eff6ff',
    borderSoft: '#bfdbfe',
  },
  kiosk: {
    label: 'Express Kiosk',
    shortLabel: 'Kiosk',
    color: '#d97706',
    bgSoft: '#fffbeb',
    borderSoft: '#fde68a',
  },
  atm: {
    label: '24/7 ATM',
    shortLabel: '24/7 ATM',
    color: '#059669',
    bgSoft: '#ecfdf5',
    borderSoft: '#a7f3d0',
  },
};

export const SERVICE_META: Record<
  ServiceTag,
  {
    label: string;
    testId: string;
  }
> = {
  pickup: { label: 'Click & Collect', testId: 'filter-service-pickup' },
  coffee: { label: 'Express Espresso', testId: 'filter-service-coffee' },
  cash: { label: 'Cash Deposit', testId: 'filter-service-cash' },
  open24: { label: 'Open 24h', testId: 'filter-service-open24' },
};

export function classifyBranchType(
  place: RawGooglePlace,
  categoryHint?: BranchType
): BranchType {
  const primary = (place.primaryType ?? '').toLowerCase();
  const types = (place.types ?? []).map((t) => t.toLowerCase());
  const name = (place.displayName?.text ?? '').toLowerCase();

  if (
    primary === 'atm' ||
    primary === 'bank' ||
    types.includes('atm') ||
    name.includes('atm')
  ) {
    return 'atm';
  }

  if (
    primary === 'coffee_shop' ||
    primary === 'cafe' ||
    primary === 'bakery' ||
    types.includes('coffee_shop') ||
    types.includes('cafe') ||
    name.includes('espresso') ||
    name.includes('coffee') ||
    name.includes('kiosk')
  ) {
    return 'kiosk';
  }

  if (
    primary === 'department_store' ||
    primary === 'electronics_store' ||
    primary === 'clothing_store' ||
    primary === 'shopping_mall' ||
    primary === 'store' ||
    types.includes('department_store') ||
    types.includes('clothing_store') ||
    name.includes('flagship')
  ) {
    return 'flagship';
  }

  return categoryHint ?? 'flagship';
}

export function deriveServiceTags(
  branchType: BranchType,
  weekdayDescriptions: string[],
  placeId: string
): ServiceTag[] {
  const tags: ServiceTag[] = [];
  const has24HoursFromPlaces = weekdayDescriptions.some((line) =>
    line.toLowerCase().includes('open 24 hours')
  );

  // Deterministic character hash on live Place ID to vary optional secondary amenities
  const hash = placeId
    .split('')
    .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 997, 7);

  if (branchType === 'flagship') {
    tags.push('pickup');
    if (hash % 2 === 0) tags.push('coffee');
    if (hash % 3 === 0) tags.push('cash');
    if (has24HoursFromPlaces) tags.push('open24');
  } else if (branchType === 'kiosk') {
    tags.push('coffee');
    tags.push('pickup');
    if (has24HoursFromPlaces) tags.push('open24');
  } else {
    tags.push('cash');
    if (has24HoursFromPlaces || hash % 4 !== 0) {
      tags.push('open24');
    }
  }

  return tags;
}

export function normalizePlaceToBranch(
  place: RawGooglePlace,
  categoryHint?: BranchType
): Branch | null {
  const id = place.id;
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;
  const name = place.displayName?.text;

  if (!id || typeof lat !== 'number' || typeof lng !== 'number' || !name) {
    return null;
  }

  const branchType = classifyBranchType(place, categoryHint);
  const weekdayDescriptions = place.regularOpeningHours?.weekdayDescriptions ?? [];

  return {
    id,
    name,
    address: place.formattedAddress ?? 'New York, NY',
    location: { lat, lng },
    branchType,
    services: deriveServiceTags(branchType, weekdayDescriptions, id),
    primaryType: place.primaryType,
    types: place.types ?? [],
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    weekdayDescriptions,
    businessStatus: place.businessStatus,
    nationalPhoneNumber: place.nationalPhoneNumber,
  };
}

export function parseDurationSeconds(duration?: string): number {
  if (!duration) return Number.MAX_SAFE_INTEGER;
  const match = duration.match(/^(\d+(?:\.\d+)?)s$/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Math.round(Number.parseFloat(match[1]));
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds >= Number.MAX_SAFE_INTEGER) {
    return '--';
  }
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${hrs} hr` : `${hrs} hr ${rem} min`;
}

export function formatDistanceImperial(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '--';
  const miles = meters / 1609.344;
  if (miles < 0.1) {
    const feet = Math.round(meters * 3.28084);
    return `${feet} ft`;
  }
  return `${miles.toFixed(1)} mi`;
}
