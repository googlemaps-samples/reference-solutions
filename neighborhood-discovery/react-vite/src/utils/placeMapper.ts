import {
  LatLngPoint,
  PlaceItem,
  PlaceReviewItem,
  VenueCategory,
} from '../types/neighborhood';

export const SEARCH_FIELDS: string[] = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'primaryType',
  'primaryTypeDisplayName',
  'types',
  'rating',
  'userRatingCount',
  'priceLevel',
  'regularOpeningHours',
  'photos',
  'googleMapsURI',
];

export const DETAIL_FIELDS: string[] = [
  ...SEARCH_FIELDS,
  'reviews',
  'websiteURI',
  'internationalPhoneNumber',
];

export function haversineMeters(a: LatLngPoint, b: LatLngPoint): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function inferVenueCategory(
  primaryType?: string | null,
  types?: string[]
): VenueCategory {
  const candidates = [primaryType ?? '', ...(types ?? [])].map((t) =>
    t.toLowerCase()
  );

  if (
    candidates.some(
      (t) =>
        t === 'cafe' ||
        t === 'coffee_shop' ||
        t === 'tea_house' ||
        t === 'bakery'
    )
  ) {
    return 'cafe';
  }
  if (
    candidates.some(
      (t) => t === 'museum' || t === 'art_gallery' || t === 'cultural_center'
    )
  ) {
    return 'museum';
  }
  if (
    candidates.some(
      (t) =>
        t === 'park' ||
        t === 'garden' ||
        t === 'national_park' ||
        t === 'botanical_garden'
    )
  ) {
    return 'park';
  }
  return 'restaurant';
}

export function formatPriceLevel(
  priceLevel: string | null | undefined
): { symbols: string; label: string } {
  switch (priceLevel) {
    case 'Free':
    case 'FREE':
    case 'PRICE_LEVEL_FREE':
      return { symbols: 'Free', label: 'Free' };
    case 'Inexpensive':
    case 'INEXPENSIVE':
    case 'PRICE_LEVEL_INEXPENSIVE':
      return { symbols: '£', label: 'Inexpensive' };
    case 'Moderate':
    case 'MODERATE':
    case 'PRICE_LEVEL_MODERATE':
      return { symbols: '££', label: 'Moderate' };
    case 'Expensive':
    case 'EXPENSIVE':
    case 'PRICE_LEVEL_EXPENSIVE':
      return { symbols: '£££', label: 'Expensive' };
    case 'Very Expensive':
    case 'VERY_EXPENSIVE':
    case 'PRICE_LEVEL_VERY_EXPENSIVE':
      return { symbols: '££££', label: 'Very Expensive' };
    default:
      return { symbols: '—', label: 'Not listed' };
  }
}

/**
 * Safely compute today's hours and current open/closed state from regularOpeningHours
 * without calling beta-only Place.prototype.isOpen() on the weekly channel.
 */
function evaluateOpeningHours(
  regularOpeningHours: google.maps.places.OpeningHours | null | undefined
): {
  weekdayDescriptions: string[];
  todayHours: string;
  openStatusLabel: string;
  isOpenNow: boolean | null;
} {
  const weekdayDescriptions = regularOpeningHours?.weekdayDescriptions ?? [];

  // Determine current London wall-clock day & minutes for accurate weekly-channel status
  const now = new Date();
  const londonParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const weekdayName =
    londonParts.find((p) => p.type === 'weekday')?.value ?? 'Monday';
  const hourStr = londonParts.find((p) => p.type === 'hour')?.value ?? '12';
  const minStr = londonParts.find((p) => p.type === 'minute')?.value ?? '00';
  const currentHour = parseInt(hourStr, 10) % 24;
  const currentMinute = parseInt(minStr, 10);

  const dayMap: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  const currentDay = dayMap[weekdayName] ?? now.getDay();
  const currentMinutesOfWeek = currentDay * 1440 + currentHour * 60 + currentMinute;

  let todayHours = 'Hours unavailable';
  if (weekdayDescriptions.length > 0) {
    const matched = weekdayDescriptions.find((line) =>
      line.toLowerCase().startsWith(weekdayName.toLowerCase())
    );
    if (matched) {
      const colonIdx = matched.indexOf(':');
      todayHours = colonIdx >= 0 ? matched.slice(colonIdx + 1).trim() : matched;
    } else {
      todayHours = weekdayDescriptions[0];
    }
  }

  let isOpenNow: boolean | null = null;
  let openStatusLabel = 'Hours not listed';

  const periods = regularOpeningHours?.periods ?? [];
  if (periods.length > 0) {
    // 24/7 check: single period with open day=0 hour=0 minute=0 and no close
    if (
      periods.length === 1 &&
      !periods[0].close &&
      periods[0].open.hour === 0 &&
      periods[0].open.minute === 0
    ) {
      isOpenNow = true;
      openStatusLabel = 'Open 24 hours';
    } else {
      isOpenNow = false;
      for (const period of periods) {
        const openStart =
          period.open.day * 1440 + period.open.hour * 60 + period.open.minute;
        if (!period.close) {
          if (currentMinutesOfWeek >= openStart) {
            isOpenNow = true;
            break;
          }
          continue;
        }
        let closeEnd =
          period.close.day * 1440 +
          period.close.hour * 60 +
          period.close.minute;
        if (closeEnd <= openStart) {
          closeEnd += 7 * 1440;
        }
        const checkCurrent =
          currentMinutesOfWeek < openStart
            ? currentMinutesOfWeek + 7 * 1440
            : currentMinutesOfWeek;
        if (checkCurrent >= openStart && checkCurrent < closeEnd) {
          isOpenNow = true;
          break;
        }
      }
      openStatusLabel = isOpenNow ? 'Open now' : 'Closed now';
    }
  } else if (todayHours.toLowerCase().includes('open 24 hours')) {
    isOpenNow = true;
    openStatusLabel = 'Open 24 hours';
  }

  return {
    weekdayDescriptions,
    todayHours,
    openStatusLabel,
    isOpenNow,
  };
}

export function mapGooglePlaceToPlaceItem(
  place: google.maps.places.Place,
  searchCenter: LatLngPoint,
  detailsLoaded = false
): PlaceItem | null {
  if (!place.location) {
    return null;
  }

  const location: LatLngPoint = {
    lat: place.location.lat(),
    lng: place.location.lng(),
  };

  const hours = evaluateOpeningHours(place.regularOpeningHours);
  const firstPhoto = place.photos?.[0];
  let photoUri: string | null = null;
  let photoAttribution: string | null = null;
  if (firstPhoto) {
    try {
      photoUri = firstPhoto.getURI({ maxWidth: 640, maxHeight: 360 });
      const attr = firstPhoto.authorAttributions?.[0];
      photoAttribution = attr?.displayName ?? null;
    } catch {
      photoUri = null;
    }
  }

  const reviews: PlaceReviewItem[] = (place.reviews ?? []).map((rev) => ({
    authorName: rev.authorAttribution?.displayName ?? 'Google Maps User',
    authorPhotoUri: rev.authorAttribution?.photoURI ?? null,
    authorUri: rev.authorAttribution?.uri ?? null,
    rating: rev.rating ?? null,
    relativeTime: rev.relativePublishTimeDescription ?? null,
    text: rev.text ?? rev.originalText ?? null,
  }));

  return {
    id: place.id,
    displayName: place.displayName ?? 'Unnamed Place',
    formattedAddress: place.formattedAddress ?? 'Central London, UK',
    location,
    primaryType: place.primaryType ?? null,
    primaryTypeDisplayName: place.primaryTypeDisplayName ?? null,
    types: place.types ?? [],
    category: inferVenueCategory(place.primaryType, place.types),
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? null,
    priceLevel: place.priceLevel ?? null,
    weekdayDescriptions: hours.weekdayDescriptions,
    todayHours: hours.todayHours,
    openStatusLabel: hours.openStatusLabel,
    isOpenNow: hours.isOpenNow,
    reviews,
    photoUri,
    photoAttribution,
    websiteUri: place.websiteURI ?? null,
    internationalPhoneNumber: place.internationalPhoneNumber ?? null,
    googleMapsUri: place.googleMapsURI ?? null,
    distanceMeters: haversineMeters(searchCenter, location),
    detailsLoaded,
  };
}

export function extractNeighborhoodFromGeocoder(
  result: google.maps.GeocoderResult
): { neighborhood: string; postalCode: string | null } {
  const components = result.address_components ?? [];
  const neighborhoodComp =
    components.find((c) => c.types.includes('neighborhood')) ??
    components.find((c) => c.types.includes('sublocality_level_1')) ??
    components.find((c) => c.types.includes('sublocality')) ??
    components.find((c) => c.types.includes('postal_town')) ??
    components.find((c) => c.types.includes('locality'));

  const postalComp = components.find((c) => c.types.includes('postal_code'));

  return {
    neighborhood: neighborhoodComp?.long_name ?? 'Central London',
    postalCode: postalComp?.long_name ?? null,
  };
}
