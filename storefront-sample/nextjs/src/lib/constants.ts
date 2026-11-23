import type { LatLngLiteral, OriginLocation, TravelMode } from './types';

export const CLINIC_DEFAULT_LOCATION: LatLngLiteral = {
  lat: 37.7896,
  lng: -122.4076,
};

export const CLINIC_SEED_QUERY = '450 Sutter Dental San Francisco';

export const HOME_VISIT_RADIUS_METERS = 3500;

export const DEFAULT_ORIGIN: OriginLocation = {
  label: 'Ferry Building, San Francisco, CA',
  address: '1 Ferry Building, San Francisco, CA 94105',
  location: {
    lat: 37.7955,
    lng: -122.3937,
  },
};

export const SF_LOCATION_BIAS = {
  center: CLINIC_DEFAULT_LOCATION,
  radius: 15000,
};

export const TRAVEL_MODE_META: Record<
  TravelMode,
  { label: string; shortLabel: string; color: string }
> = {
  DRIVE: { label: 'Driving', shortLabel: 'Drive', color: '#0f766e' },
  TRANSIT: { label: 'Public Transit', shortLabel: 'Transit', color: '#1d4ed8' },
  WALK: { label: 'Walking', shortLabel: 'Walk', color: '#7c3aed' },
};

export const DENTAL_SPECIALTIES = [
  'General & Preventive Dentistry',
  'Cosmetic Dentistry & Veneers',
  'Orthodontics & Clear Aligners',
  'Periodontics & Dental Implants',
  'Endodontics & Urgent Care',
] as const;

export const APPOINTMENT_TIME_SLOTS = [
  '09:00 AM',
  '10:30 AM',
  '01:00 PM',
  '02:30 PM',
  '04:00 PM',
] as const;
