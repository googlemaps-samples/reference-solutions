import type { Branch, BranchType, ServiceTag, TravelModeOption } from '../types/locator';

export const BRANCH_TYPE_LABELS: Record<BranchType, string> = {
  flagship: 'Flagship Store',
  kiosk: 'Express Kiosk',
  atm: '24/7 ATM',
};

export const SERVICE_LABELS: Record<ServiceTag, string> = {
  pickup: 'Click & Collect',
  coffee: 'Express Espresso',
  cash: 'Cash Deposit',
  open24: 'Open 24h',
};

export const NYC_ORIGIN_PRESETS = [
  {
    id: 'penn-station',
    label: 'Penn Station (Midtown)',
    address: '234 W 34th St, New York, NY 10001',
    location: { lat: 40.7506, lng: -73.9935 },
  },
  {
    id: 'grand-central',
    label: 'Grand Central Terminal',
    address: '89 E 42nd St, New York, NY 10017',
    location: { lat: 40.7527, lng: -73.9772 },
  },
  {
    id: 'union-square',
    label: 'Union Square',
    address: '14th St & Broadway, New York, NY 10003',
    location: { lat: 40.7359, lng: -73.9911 },
  },
  {
    id: 'fulton-center',
    label: 'Fulton Center (FiDi)',
    address: '200 Broadway, New York, NY 10038',
    location: { lat: 40.7102, lng: -74.0079 },
  },
];

function deterministicHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function classifyPlaceType(
  place: google.maps.places.Place,
  queryHint: BranchType
): BranchType {
  const primary = (place.primaryType ?? '').toLowerCase();
  const types = (place.types ?? []).map((t) => t.toLowerCase());
  const name = (place.displayName ?? '').toLowerCase();

  if (
    primary === 'atm' ||
    types.includes('atm') ||
    name.includes('atm') ||
    (primary === 'bank' && queryHint === 'atm')
  ) {
    return 'atm';
  }

  if (
    primary === 'cafe' ||
    primary === 'coffee_shop' ||
    primary === 'bakery' ||
    types.includes('cafe') ||
    types.includes('coffee_shop') ||
    name.includes('coffee') ||
    name.includes('espresso') ||
    name.includes('kiosk')
  ) {
    return 'kiosk';
  }

  if (
    primary === 'department_store' ||
    primary === 'electronics_store' ||
    primary === 'clothing_store' ||
    primary === 'shopping_mall' ||
    primary === 'store'
  ) {
    return 'flagship';
  }

  return queryHint;
}

export function extractTodayHours(weekdayDescriptions: string[]): string | null {
  if (!weekdayDescriptions.length) {
    return null;
  }
  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const todayName = dayNames[new Date().getDay()];
  const match = weekdayDescriptions.find((line) =>
    line.toLowerCase().startsWith(todayName.toLowerCase())
  );
  if (!match) {
    return weekdayDescriptions[0] ?? null;
  }
  const colonIdx = match.indexOf(':');
  return colonIdx >= 0 ? match.slice(colonIdx + 1).trim() : match;
}

export function deriveServices(
  placeId: string,
  branchType: BranchType,
  weekdayDescriptions: string[],
  displayName: string
): ServiceTag[] {
  const services = new Set<ServiceTag>();
  const hash = deterministicHash(placeId);

  const hasOpen24InHours = weekdayDescriptions.some((line) =>
    /open 24 hours/i.test(line)
  );
  const nameMentions24 = /24\s*\/?\s*7|24\s*hour/i.test(displayName);

  if (branchType === 'flagship') {
    services.add('pickup');
    services.add('cash');
    if (hash % 2 === 0) {
      services.add('coffee');
    }
    if (hasOpen24InHours || nameMentions24) {
      services.add('open24');
    }
  } else if (branchType === 'kiosk') {
    services.add('coffee');
    if (hash % 2 === 0) {
      services.add('pickup');
    }
    if (hasOpen24InHours || nameMentions24) {
      services.add('open24');
    }
  } else {
    services.add('cash');
    if (hasOpen24InHours || nameMentions24 || weekdayDescriptions.length === 0) {
      services.add('open24');
    }
  }

  return Array.from(services);
}

export function mapPlaceToBranch(
  place: google.maps.places.Place,
  queryHint: BranchType
): Branch | null {
  if (!place.id || !place.location) {
    return null;
  }

  const lat = place.location.lat();
  const lng = place.location.lng();
  const name = place.displayName ?? 'NYC Branch Location';
  const address = place.formattedAddress ?? 'Manhattan, New York, NY';
  const branchType = classifyPlaceType(place, queryHint);
  const weekdayDescriptions = place.regularOpeningHours?.weekdayDescriptions ?? [];
  const todayHours = extractTodayHours(weekdayDescriptions);
  const services = deriveServices(place.id, branchType, weekdayDescriptions, name);

  return {
    id: place.id,
    name,
    address,
    location: { lat, lng },
    branchType,
    services,
    rating: typeof place.rating === 'number' ? place.rating : null,
    userRatingCount:
      typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
    todayHours,
    weekdayDescriptions,
    businessStatus: place.businessStatus ?? null,
    primaryType: place.primaryType ?? null,
    durationMillis: null,
    distanceMeters: null,
    etaText: null,
    distanceText: null,
    isFastest: false,
  };
}

export function formatDurationMillis(durationMillis: number): string {
  const totalMinutes = Math.max(1, Math.round(durationMillis / 60000));
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
}

export function formatDistanceMeters(distanceMeters: number): string {
  const miles = distanceMeters / 1609.344;
  if (miles < 0.2) {
    const feet = Math.round(distanceMeters * 3.28084);
    return `${feet} ft`;
  }
  return `${miles.toFixed(1)} mi`;
}

export function toJsTravelMode(mode: TravelModeOption): google.maps.TravelModeString {
  switch (mode) {
    case 'DRIVE':
      return 'DRIVING';
    case 'WALK':
      return 'WALKING';
    case 'TRANSIT':
      return 'TRANSIT';
  }
}

export function formatTravelModeLabel(mode: TravelModeOption): string {
  switch (mode) {
    case 'DRIVE':
      return 'Driving';
    case 'WALK':
      return 'Walking';
    case 'TRANSIT':
      return 'Transit';
  }
}
