import { PlaceItem } from '@/types/itinerary';

export function getServerGoogleMapsApiKey(): string {
  return (
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    ''
  );
}

interface RawPlacesApiPhoto {
  name?: string;
  widthPx?: number;
  heightPx?: number;
  authorAttributions?: Array<{
    displayName?: string;
    uri?: string;
  }>;
}

export interface RawPlacesApiPlace {
  id?: string;
  name?: string;
  displayName?: { text?: string; languageCode?: string } | string;
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  regularOpeningHours?: {
    openNow?: boolean;
    weekdayDescriptions?: string[];
  };
  photos?: RawPlacesApiPhoto[];
  primaryTypeDisplayName?: { text?: string; languageCode?: string } | string;
  priceLevel?: string;
  googleMapsUri?: string;
  utcOffsetMinutes?: number;
}

export function normalizeRawPlace(raw: RawPlacesApiPlace): PlaceItem | null {
  const lat = raw.location?.latitude;
  const lng = raw.location?.longitude;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return null;
  }

  const displayName =
    typeof raw.displayName === 'string'
      ? raw.displayName
      : raw.displayName?.text || 'Unnamed Place';

  const primaryTypeDisplayName =
    typeof raw.primaryTypeDisplayName === 'string'
      ? raw.primaryTypeDisplayName
      : raw.primaryTypeDisplayName?.text;

  const id = raw.id || raw.name?.replace(/^places\//, '') || `${lat},${lng}`;

  return {
    id,
    displayName,
    formattedAddress: raw.formattedAddress || '',
    location: { lat, lng },
    rating: typeof raw.rating === 'number' ? raw.rating : undefined,
    userRatingCount:
      typeof raw.userRatingCount === 'number' ? raw.userRatingCount : undefined,
    regularOpeningHours: raw.regularOpeningHours
      ? {
          openNow: raw.regularOpeningHours.openNow,
          weekdayDescriptions: raw.regularOpeningHours.weekdayDescriptions,
        }
      : undefined,
    photos: Array.isArray(raw.photos)
      ? raw.photos
          .filter((photo): photo is RawPlacesApiPhoto & { name: string } =>
            Boolean(photo?.name)
          )
          .slice(0, 3)
          .map((photo) => ({
            name: photo.name,
            widthPx: photo.widthPx,
            heightPx: photo.heightPx,
            authorAttributions: photo.authorAttributions,
          }))
      : undefined,
    primaryTypeDisplayName,
    priceLevel: raw.priceLevel,
    googleMapsUri: raw.googleMapsUri,
    utcOffsetMinutes:
      typeof raw.utcOffsetMinutes === 'number' ? raw.utcOffsetMinutes : undefined,
  };
}
