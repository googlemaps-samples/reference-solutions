import { NextRequest, NextResponse } from 'next/server';
import { CLINIC_DEFAULT_LOCATION, CLINIC_SEED_QUERY } from '@/lib/constants';
import { computeOpenStatus } from '@/lib/hours';
import type { ClinicPlaceDetails, PlacePhoto, PlaceReview } from '@/lib/types';

const PLACES_TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

const PLACES_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.regularOpeningHours',
  'places.currentOpeningHours',
  'places.reviews',
  'places.photos',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.businessStatus',
].join(',');

interface GooglePlaceRaw {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  regularOpeningHours?: {
    openNow?: boolean;
    weekdayDescriptions?: string[];
    periods?: Array<{
      open: { day: number; hour: number; minute: number };
      close?: { day: number; hour: number; minute: number };
    }>;
  };
  currentOpeningHours?: {
    openNow?: boolean;
    weekdayDescriptions?: string[];
  };
  reviews?: Array<{
    rating?: number;
    relativePublishTimeDescription?: string;
    text?: { text?: string };
    originalText?: { text?: string };
    googleMapsUri?: string;
    authorAttribution?: {
      displayName?: string;
      photoUri?: string;
      uri?: string;
    };
  }>;
  photos?: Array<{
    name?: string;
    widthPx?: number;
    heightPx?: number;
    authorAttributions?: Array<{
      displayName?: string;
      uri?: string;
    }>;
  }>;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  businessStatus?: string;
}

function normalizePlace(raw: GooglePlaceRaw): ClinicPlaceDetails {
  const periods = raw.regularOpeningHours?.periods;
  const rawOpenNow =
    typeof raw.currentOpeningHours?.openNow === 'boolean'
      ? raw.currentOpeningHours.openNow
      : raw.regularOpeningHours?.openNow;

  const reviews: PlaceReview[] = (raw.reviews ?? []).map((rev) => ({
    authorName: rev.authorAttribution?.displayName ?? 'Verified Patient',
    authorPhotoUri: rev.authorAttribution?.photoUri,
    authorUri: rev.authorAttribution?.uri,
    rating: typeof rev.rating === 'number' ? rev.rating : 5,
    relativePublishTimeDescription: rev.relativePublishTimeDescription ?? '',
    text: rev.text?.text ?? rev.originalText?.text ?? '',
    googleMapsUri: rev.googleMapsUri,
  }));

  const photos: PlacePhoto[] = (raw.photos ?? [])
    .filter((photo): photo is typeof photo & { name: string } => Boolean(photo.name))
    .slice(0, 6)
    .map((photo) => ({
      name: photo.name,
      widthPx: photo.widthPx,
      heightPx: photo.heightPx,
      authorAttributions: (photo.authorAttributions ?? [])
        .filter((attr): attr is { displayName: string; uri?: string } => Boolean(attr.displayName))
        .map((attr) => ({
          displayName: attr.displayName,
          uri: attr.uri,
        })),
    }));

  return {
    id: raw.id ?? '',
    displayName: raw.displayName?.text ?? '450 Sutter Dental Studio',
    formattedAddress: raw.formattedAddress ?? '450 Sutter St, San Francisco, CA 94108',
    location: {
      lat: raw.location?.latitude ?? CLINIC_DEFAULT_LOCATION.lat,
      lng: raw.location?.longitude ?? CLINIC_DEFAULT_LOCATION.lng,
    },
    rating: raw.rating,
    userRatingCount: raw.userRatingCount,
    openNow: computeOpenStatus(rawOpenNow, periods),
    weekdayDescriptions:
      raw.currentOpeningHours?.weekdayDescriptions ??
      raw.regularOpeningHours?.weekdayDescriptions ??
      [],
    periods,
    reviews,
    photos,
    nationalPhoneNumber: raw.nationalPhoneNumber,
    websiteUri: raw.websiteUri,
    googleMapsUri: raw.googleMapsUri,
    businessStatus: raw.businessStatus,
  };
}

export async function POST(request: NextRequest) {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Maps API key is not configured on the server.' },
      { status: 500 }
    );
  }

  let textQuery = CLINIC_SEED_QUERY;
  try {
    const body = (await request.json()) as { textQuery?: unknown };
    if (typeof body?.textQuery === 'string' && body.textQuery.trim().length > 0) {
      textQuery = body.textQuery.trim().slice(0, 160);
    }
  } catch {
    // Allow empty body; use default seed query
  }

  try {
    const referer = request.headers.get('referer') || request.headers.get('origin');
    const upstreamHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': PLACES_FIELD_MASK,
    };
    if (referer) {
      upstreamHeaders.Referer = referer;
    }

    const response = await fetch(PLACES_TEXT_SEARCH_URL, {
      method: 'POST',
      headers: upstreamHeaders,
      body: JSON.stringify({
        textQuery,
        languageCode: 'en',
        regionCode: 'US',
        pageSize: 1,
        locationBias: {
          circle: {
            center: {
              latitude: CLINIC_DEFAULT_LOCATION.lat,
              longitude: CLINIC_DEFAULT_LOCATION.lng,
            },
            radius: 5000.0,
          },
        },
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return NextResponse.json(
        {
          error: 'Places API (New) Text Search failed.',
          status: response.status,
          details: errorText.slice(0, 300),
        },
        { status: response.status }
      );
    }

    const payload = (await response.json()) as { places?: GooglePlaceRaw[] };
    const firstPlace = payload.places?.[0];

    if (!firstPlace) {
      return NextResponse.json(
        { error: 'No matching clinic found from Places API (New).' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      place: normalizePlace(firstPlace),
    });
  } catch {
    return NextResponse.json(
      { error: 'Unable to reach Google Places API (New).' },
      { status: 502 }
    );
  }
}
