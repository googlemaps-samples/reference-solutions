export type TravelMode = 'DRIVE' | 'TRANSIT' | 'WALK';

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface RouteWaypointInput {
  lat?: number;
  lng?: number;
  placeId?: string;
}

export interface ComputeRouteRequestBody {
  origin: RouteWaypointInput;
  destination: RouteWaypointInput;
  travelMode: TravelMode;
}

export interface PlacesSearchRequestBody {
  textQuery: string;
}

export interface BookingRequestBody {
  patientName: string;
  contactEmail: string;
  contactPhone: string;
  specialty: string;
  visitType: 'in-clinic' | 'home-visit';
  preferredDate: string;
  preferredTime: string;
  notes?: string;
}

export interface PlacesTextSearchUpstreamResponse {
  places?: Array<{
    id?: string;
    displayName?: { text?: string; languageCode?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    rating?: number;
    userRatingCount?: number;
    businessStatus?: string;
    nationalPhoneNumber?: string;
    websiteUri?: string;
    googleMapsUri?: string;
    regularOpeningHours?: {
      openNow?: boolean;
      periods?: unknown[];
      weekdayDescriptions?: string[];
    };
    currentOpeningHours?: {
      openNow?: boolean;
      periods?: unknown[];
      weekdayDescriptions?: string[];
    };
    reviews?: Array<{
      name?: string;
      relativePublishTimeDescription?: string;
      rating?: number;
      text?: { text?: string; languageCode?: string };
      originalText?: { text?: string; languageCode?: string };
      authorAttribution?: {
        displayName?: string;
        uri?: string;
        photoUri?: string;
      };
      publishTime?: string;
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
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

export interface RoutesComputeUpstreamResponse {
  routes?: Array<{
    duration?: string;
    distanceMeters?: number;
    polyline?: {
      encodedPolyline?: string;
    };
    localizedValues?: {
      distance?: { text?: string };
      duration?: { text?: string };
      staticDuration?: { text?: string };
    };
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}
