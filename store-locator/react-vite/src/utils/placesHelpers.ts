import type {
  BranchLocation,
  BranchType,
  ServiceTag,
  TravelModeOption,
} from '../types/locator';

export type SeedCategory = 'flagship' | 'kiosk' | 'atm';

export function toSdkTravelMode(
  mode: TravelModeOption
): google.maps.TravelModeString {
  switch (mode) {
    case 'DRIVE':
      return 'DRIVING';
    case 'WALK':
      return 'WALKING';
    case 'TRANSIT':
      return 'TRANSIT';
  }
}

export function formatDurationMillis(millis: number | null | undefined): string {
  if (millis === null || millis === undefined || !Number.isFinite(millis)) {
    return '—';
  }
  const totalMinutes = Math.max(1, Math.round(millis / 60000));
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins === 0 ? `${hours} hr` : `${hours} hr ${mins} min`;
}

export function formatDistanceMeters(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || !Number.isFinite(meters)) {
    return '—';
  }
  const miles = meters / 1609.344;
  if (miles < 0.2) {
    const feet = Math.round(meters * 3.28084);
    return `${feet} ft`;
  }
  return `${miles.toFixed(miles >= 10 ? 1 : 2)} mi`;
}

export function getTodayWeekdayHours(weekdayDescriptions: string[]): {
  todayHours: string;
  isOpen24Hours: boolean;
} {
  if (!weekdayDescriptions.length) {
    return { todayHours: 'Hours via Google Maps', isOpen24Hours: false };
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
  const selectedLine = match ?? weekdayDescriptions[0];
  const isOpen24Hours = weekdayDescriptions.some((line) =>
    line.toLowerCase().includes('open 24 hours')
  );

  return {
    todayHours: selectedLine,
    isOpen24Hours,
  };
}

function classifyBranchType(
  place: google.maps.places.Place,
  seedHint: SeedCategory
): BranchType {
  const primary = (place.primaryType ?? '').toLowerCase();
  const types = (place.types ?? []).map((t) => t.toLowerCase());
  const name = (place.displayName ?? '').toLowerCase();

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
    primary === 'clothing_store' ||
    primary === 'electronics_store' ||
    primary === 'shopping_mall' ||
    types.includes('department_store') ||
    types.includes('store')
  ) {
    return 'flagship';
  }

  return seedHint;
}

function deriveServiceTags(
  branchType: BranchType,
  isOpen24Hours: boolean,
  place: google.maps.places.Place
): ServiceTag[] {
  const tags: ServiceTag[] = [];
  const types = (place.types ?? []).map((t) => t.toLowerCase());

  if (branchType === 'flagship') {
    tags.push('pickup');
    if (types.includes('cafe') || types.includes('coffee_shop')) {
      tags.push('coffee');
    }
    if (isOpen24Hours) {
      tags.push('open24');
    }
  } else if (branchType === 'kiosk') {
    tags.push('coffee', 'pickup');
    if (isOpen24Hours) {
      tags.push('open24');
    }
  } else {
    tags.push('cash');
    if (isOpen24Hours || (place.displayName ?? '').toLowerCase().includes('24')) {
      tags.push('open24');
    }
  }

  return Array.from(new Set(tags));
}

export function mapPlaceToBranch(
  place: google.maps.places.Place,
  seedHint: SeedCategory
): BranchLocation | null {
  if (!place.id || !place.location) {
    return null;
  }

  const lat = place.location.lat();
  const lng = place.location.lng();
  const weekdayDescriptions =
    place.regularOpeningHours?.weekdayDescriptions ?? [];
  const { todayHours, isOpen24Hours } =
    getTodayWeekdayHours(weekdayDescriptions);
  const branchType = classifyBranchType(place, seedHint);
  const services = deriveServiceTags(branchType, isOpen24Hours, place);

  return {
    id: place.id,
    name: place.displayName ?? 'NYC Retail Branch',
    address: place.formattedAddress ?? 'New York, NY',
    location: { lat, lng },
    branchType,
    services,
    rating: typeof place.rating === 'number' ? place.rating : null,
    userRatingCount:
      typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
    weekdayDescriptions,
    todayHours,
    isOpen24Hours: services.includes('open24'),
    primaryType: place.primaryType ?? null,
    types: place.types ?? [],
    businessStatus: place.businessStatus ?? null,
  };
}
