import type { DestinationPreset, ItineraryDay } from '../types/itinerary';

export const DAY_COLORS: Record<ItineraryDay, { hex: string; lightBg: string; border: string; label: string }> = {
  1: {
    hex: '#0F766E',
    lightBg: '#CCFBF1',
    border: '#14B8A6',
    label: 'Day 1',
  },
  2: {
    hex: '#D97706',
    lightBg: '#FEF3C7',
    border: '#F59E0B',
    label: 'Day 2',
  },
};

export const DESTINATION_PRESETS: DestinationPreset[] = [
  {
    id: 'tokyo',
    label: 'Tokyo, Japan',
    cityQuery: 'Tokyo, Japan',
    center: { lat: 35.6812, lng: 139.7671 },
    zoom: 12,
  },
  {
    id: 'kyoto',
    label: 'Kyoto, Japan',
    cityQuery: 'Kyoto, Japan',
    center: { lat: 35.0116, lng: 135.7681 },
    zoom: 13,
  },
  {
    id: 'paris',
    label: 'Paris, France',
    cityQuery: 'Paris, France',
    center: { lat: 48.8566, lng: 2.3522 },
    zoom: 12,
  },
  {
    id: 'london',
    label: 'London, UK',
    cityQuery: 'London, United Kingdom',
    center: { lat: 51.5072, lng: -0.1276 },
    zoom: 12,
  },
  {
    id: 'new-york',
    label: 'New York, USA',
    cityQuery: 'New York, NY, USA',
    center: { lat: 40.758, lng: -73.9855 },
    zoom: 12,
  },
];
