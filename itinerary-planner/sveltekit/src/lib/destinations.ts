import type { DestinationPreset } from './types';

export const DESTINATION_PRESETS: DestinationPreset[] = [
	{
		id: 'tokyo',
		name: 'Tokyo',
		country: 'Japan',
		center: { lat: 35.6812, lng: 139.7671 },
		zoom: 12,
		seedQuery: 'top tourist attractions in Tokyo'
	},
	{
		id: 'kyoto',
		name: 'Kyoto',
		country: 'Japan',
		center: { lat: 35.0116, lng: 135.7681 },
		zoom: 12,
		seedQuery: 'top tourist attractions in Kyoto'
	},
	{
		id: 'paris',
		name: 'Paris',
		country: 'France',
		center: { lat: 48.8566, lng: 2.3522 },
		zoom: 12,
		seedQuery: 'top tourist attractions in Paris'
	},
	{
		id: 'new-york',
		name: 'New York',
		country: 'United States',
		center: { lat: 40.758, lng: -73.9855 },
		zoom: 12,
		seedQuery: 'top tourist attractions in New York'
	},
	{
		id: 'london',
		name: 'London',
		country: 'United Kingdom',
		center: { lat: 51.5072, lng: -0.1276 },
		zoom: 12,
		seedQuery: 'top tourist attractions in London'
	},
	{
		id: 'sydney',
		name: 'Sydney',
		country: 'Australia',
		center: { lat: -33.8688, lng: 151.2093 },
		zoom: 12,
		seedQuery: 'top tourist attractions in Sydney'
	}
];

export const DAY_META = {
	day1: {
		id: 'day1' as const,
		label: 'Day 1',
		color: '#0F766E',
		borderColor: '#115E59',
		softBg: '#CCFBF1'
	},
	day2: {
		id: 'day2' as const,
		label: 'Day 2',
		color: '#D97706',
		borderColor: '#B45309',
		softBg: '#FEF3C7'
	}
};
