import type { PropertyListing } from '$lib/types';

function makeParcelRect(
	lat: number,
	lng: number,
	halfLat: number,
	halfLng: number,
	skew = 0.00003
) {
	return [
		{ lat: Number((lat + halfLat).toFixed(6)), lng: Number((lng - halfLng + skew).toFixed(6)) },
		{ lat: Number((lat + halfLat - skew * 0.4).toFixed(6)), lng: Number((lng + halfLng + skew).toFixed(6)) },
		{ lat: Number((lat - halfLat).toFixed(6)), lng: Number((lng + halfLng - skew).toFixed(6)) },
		{ lat: Number((lat - halfLat + skew * 0.4).toFixed(6)), lng: Number((lng - halfLng - skew).toFixed(6)) }
	];
}

export const SF_PROPERTIES: PropertyListing[] = [
	{
		id: 'sf-pac-heights-01',
		title: '2480 Broadway St',
		address: '2480 Broadway St',
		neighborhood: 'Pacific Heights',
		city: 'San Francisco',
		state: 'CA',
		zip: '94115',
		price: 3850000,
		beds: 4,
		baths: 3.5,
		sqft: 3420,
		propertyType: 'Single Family',
		hoaMonthly: 0,
		daysOnMarket: 11,
		lat: 37.7937,
		lng: -122.4375,
		streetViewHeading: 195,
		streetViewPitch: 6,
		accentColor: '#1d4ed8',
		highlights: ['Golden Gate Views', 'Terraced Garden', '2-Car Garage'],
		description:
			'Sun-drenched Pacific Heights residence featuring wide-plank white oak floors, chef kitchen with marble island, and south-facing landscaped courtyard.',
		parcel: {
			apn: '0568-014',
			lotSqFt: 4125,
			lotDimensions: '33 ft × 125 ft',
			zoning: 'RH-1 (Residential House, One-Family)',
			yearBuilt: 1924,
			polygon: makeParcelRect(37.7937, -122.4375, 0.00018, 0.00023)
		}
	},
	{
		id: 'sf-noe-valley-02',
		title: '4128 24th St',
		address: '4128 24th St',
		neighborhood: 'Noe Valley',
		city: 'San Francisco',
		state: 'CA',
		zip: '94114',
		price: 2495000,
		beds: 3,
		baths: 2.5,
		sqft: 2380,
		propertyType: 'Victorian',
		hoaMonthly: 0,
		daysOnMarket: 7,
		lat: 37.7516,
		lng: -122.4342,
		streetViewHeading: 12,
		streetViewPitch: 5,
		accentColor: '#0f766e',
		highlights: ['Restored Bay Windows', 'ADU Potential', 'Walk Score 96'],
		description:
			'Classic 1898 Queen Anne Victorian thoughtfully modernized with radiant floor heating, custom millwork, and bi-fold glass doors opening to a cedar deck.',
		parcel: {
			apn: '6504-029',
			lotSqFt: 2850,
			lotDimensions: '25 ft × 114 ft',
			zoning: 'RH-2 (Residential House, Two-Family)',
			yearBuilt: 1898,
			polygon: makeParcelRect(37.7516, -122.4342, 0.00015, 0.00019)
		}
	},
	{
		id: 'sf-mission-03',
		title: '842 Valencia St #4B',
		address: '842 Valencia St #4B',
		neighborhood: 'Mission District',
		city: 'San Francisco',
		state: 'CA',
		zip: '94110',
		price: 1395000,
		beds: 2,
		baths: 2,
		sqft: 1460,
		propertyType: 'Condo',
		hoaMonthly: 540,
		daysOnMarket: 14,
		lat: 37.7595,
		lng: -122.4214,
		streetViewHeading: 270,
		streetViewPitch: 8,
		accentColor: '#b45309',
		highlights: ['Shared Roof Deck', 'BART 2 Blocks', 'EV Charging'],
		description:
			'Corner architectural condo on vibrant Valencia corridor with floor-to-ceiling acoustic glazing, Bosch appliances, and panoramic Twin Peaks sunset views.',
		parcel: {
			apn: '3596-081',
			lotSqFt: 5400,
			lotDimensions: '60 ft × 90 ft',
			zoning: 'NCT-3 (Neighborhood Commercial Transit)',
			yearBuilt: 2018,
			polygon: makeParcelRect(37.7595, -122.4214, 0.00019, 0.00026)
		}
	},
	{
		id: 'sf-marina-04',
		title: '2140 Jefferson St',
		address: '2140 Jefferson St',
		neighborhood: 'Marina District',
		city: 'San Francisco',
		state: 'CA',
		zip: '94123',
		price: 3290000,
		beds: 4,
		baths: 3,
		sqft: 2940,
		propertyType: 'Single Family',
		hoaMonthly: 0,
		daysOnMarket: 19,
		lat: 37.8048,
		lng: -122.4419,
		streetViewHeading: 350,
		streetViewPitch: 4,
		accentColor: '#0369a1',
		highlights: ['Crissy Field Steps', 'Sunroom', 'Seismic Retrofit'],
		description:
			'Mediterranean-revival Marina home steps from the waterfront promenade, featuring arched stucco entry, fireplace living salon, and private rooftop terrace.',
		parcel: {
			apn: '0917-008',
			lotSqFt: 3375,
			lotDimensions: '27 ft × 125 ft',
			zoning: 'RH-2 (Residential House, Two-Family)',
			yearBuilt: 1929,
			polygon: makeParcelRect(37.8048, -122.4419, 0.00016, 0.00021)
		}
	},
	{
		id: 'sf-hayes-valley-05',
		title: '390 Laguna St #203',
		address: '390 Laguna St #203',
		neighborhood: 'Hayes Valley',
		city: 'San Francisco',
		state: 'CA',
		zip: '94102',
		price: 1185000,
		beds: 2,
		baths: 2,
		sqft: 1210,
		propertyType: 'Condo',
		hoaMonthly: 615,
		daysOnMarket: 6,
		lat: 37.7746,
		lng: -122.4258,
		streetViewHeading: 88,
		streetViewPitch: 7,
		accentColor: '#4338ca',
		highlights: ['Patricia’s Green', 'Deeded Parking', 'Private Balcony'],
		description:
			'Boutique elevator residence near Hayes Street boutiques and Civic Center transit hub, featuring walnut cabinetry, quartz waterfall island, and bike storage.',
		parcel: {
			apn: '0836-044',
			lotSqFt: 4800,
			lotDimensions: '48 ft × 100 ft',
			zoning: 'NCT-3 (Hayes Valley Transit)',
			yearBuilt: 2016,
			polygon: makeParcelRect(37.7746, -122.4258, 0.00017, 0.00024)
		}
	},
	{
		id: 'sf-russian-hill-06',
		title: '1045 Vallejo St',
		address: '1045 Vallejo St',
		neighborhood: 'Russian Hill',
		city: 'San Francisco',
		state: 'CA',
		zip: '94133',
		price: 2790000,
		beds: 3,
		baths: 2.5,
		sqft: 2490,
		propertyType: 'Townhouse',
		hoaMonthly: 290,
		daysOnMarket: 23,
		lat: 37.7981,
		lng: -122.4146,
		streetViewHeading: 165,
		streetViewPitch: 9,
		accentColor: '#7c2d12',
		highlights: ['Bay & Coit Views', 'Wine Cellar', 'Private Courtyard'],
		description:
			'Tri-level Russian Hill townhome tucked on a quiet cul-de-sac crest with dramatic views of Alcatraz and the Bay Bridge from the top-floor conservatory.',
		parcel: {
			apn: '0129-033',
			lotSqFt: 2420,
			lotDimensions: '22 ft × 110 ft',
			zoning: 'RH-3 (Residential House, Three-Family)',
			yearBuilt: 1986,
			polygon: makeParcelRect(37.7981, -122.4146, 0.00014, 0.00018)
		}
	},
	{
		id: 'sf-soma-07',
		title: '765 Clara St #3C',
		address: '765 Clara St #3C',
		neighborhood: 'SoMa',
		city: 'San Francisco',
		state: 'CA',
		zip: '94103',
		price: 945000,
		beds: 1,
		baths: 1.5,
		sqft: 1120,
		propertyType: 'Loft',
		hoaMonthly: 495,
		daysOnMarket: 17,
		lat: 37.7768,
		lng: -122.4041,
		streetViewHeading: 40,
		streetViewPitch: 6,
		accentColor: '#334155',
		highlights: ['18ft Timber Ceilings', 'Mezzanine Suite', 'Caltrain Nearby'],
		description:
			'Converted warehouse timber loft featuring exposed brick walls, double-height steel casement windows, and a quiet courtyard orientation.',
		parcel: {
			apn: '3754-052',
			lotSqFt: 6250,
			lotDimensions: '62.5 ft × 100 ft',
			zoning: 'WMUG (Western SoMa Mixed Use)',
			yearBuilt: 1999,
			polygon: makeParcelRect(37.7768, -122.4041, 0.0002, 0.00026)
		}
	},
	{
		id: 'sf-bernal-08',
		title: '518 Cortland Ave',
		address: '518 Cortland Ave',
		neighborhood: 'Bernal Heights',
		city: 'San Francisco',
		state: 'CA',
		zip: '94110',
		price: 1785000,
		beds: 3,
		baths: 2,
		sqft: 1960,
		propertyType: 'Single Family',
		hoaMonthly: 0,
		daysOnMarket: 9,
		lat: 37.7393,
		lng: -122.4159,
		streetViewHeading: 190,
		streetViewPitch: 5,
		accentColor: '#047857',
		highlights: ['Bernal Hill Trail', 'Solar + Battery', 'Deep South Lot'],
		description:
			'Bright Bernal Heights home on an extra-deep southern slope lot featuring rooftop solar with battery backup, detached studio office, and citrus orchard.',
		parcel: {
			apn: '5662-019',
			lotSqFt: 3125,
			lotDimensions: '25 ft × 125 ft',
			zoning: 'RH-1 (Bernal Heights SUD)',
			yearBuilt: 1912,
			polygon: makeParcelRect(37.7393, -122.4159, 0.00016, 0.00021)
		}
	},
	{
		id: 'sf-dogpatch-09',
		title: '2290 3rd St #508',
		address: '2290 3rd St #508',
		neighborhood: 'Dogpatch',
		city: 'San Francisco',
		state: 'CA',
		zip: '94107',
		price: 1290000,
		beds: 2,
		baths: 2,
		sqft: 1350,
		propertyType: 'Loft',
		hoaMonthly: 590,
		daysOnMarket: 12,
		lat: 37.7604,
		lng: -122.3886,
		streetViewHeading: 265,
		streetViewPitch: 7,
		accentColor: '#be123c',
		highlights: ['T-Third Muni Stop', 'Crane Cove Park', 'Private Loggia'],
		description:
			'Industrial-modern Dogpatch residence along 3rd Street transit corridor with polished concrete floors, acoustic sliders, and waterfront park access.',
		parcel: {
			apn: '4059-011',
			lotSqFt: 7200,
			lotDimensions: '80 ft × 90 ft',
			zoning: 'UMU (Urban Mixed Use)',
			yearBuilt: 2020,
			polygon: makeParcelRect(37.7604, -122.3886, 0.0002, 0.00028)
		}
	},
	{
		id: 'sf-richmond-10',
		title: '442 11th Ave',
		address: '442 11th Ave',
		neighborhood: 'Inner Richmond',
		city: 'San Francisco',
		state: 'CA',
		zip: '94118',
		price: 2150000,
		beds: 4,
		baths: 3,
		sqft: 2640,
		propertyType: 'Victorian',
		hoaMonthly: 0,
		daysOnMarket: 15,
		lat: 37.7798,
		lng: -122.4697,
		streetViewHeading: 90,
		streetViewPitch: 4,
		accentColor: '#0d9488',
		highlights: ['Golden Gate Park', 'Clement St Dining', 'Formal Dining'],
		description:
			'Spacious Edwardian/Victorian residence two blocks from Golden Gate Park and Clement Street markets, featuring inlaid hardwood floors and deep garden.',
		parcel: {
			apn: '1534-026',
			lotSqFt: 3000,
			lotDimensions: '25 ft × 120 ft',
			zoning: 'RH-2 (Residential House, Two-Family)',
			yearBuilt: 1909,
			polygon: makeParcelRect(37.7798, -122.4697, 0.00016, 0.0002)
		}
	},
	{
		id: 'sf-sunset-11',
		title: '1846 22nd Ave',
		address: '1846 22nd Ave',
		neighborhood: 'Central Sunset',
		city: 'San Francisco',
		state: 'CA',
		zip: '94122',
		price: 1595000,
		beds: 3,
		baths: 2,
		sqft: 1890,
		propertyType: 'Single Family',
		hoaMonthly: 0,
		daysOnMarket: 8,
		lat: 37.7534,
		lng: -122.4799,
		streetViewHeading: 270,
		streetViewPitch: 5,
		accentColor: '#0284c7',
		highlights: ['N-Judah & L-Taraval', 'Ocean Breeze', 'Updated Kitchen'],
		description:
			'Classic Doelger-built Sunset single-family home with skylights, remodeled lower-level guest suite, and sunny west-facing backyard deck.',
		parcel: {
			apn: '2057-031',
			lotSqFt: 3000,
			lotDimensions: '25 ft × 120 ft',
			zoning: 'RH-1 (Residential House, One-Family)',
			yearBuilt: 1941,
			polygon: makeParcelRect(37.7534, -122.4799, 0.00016, 0.0002)
		}
	},
	{
		id: 'sf-alamo-12',
		title: '734 Steiner St',
		address: '734 Steiner St',
		neighborhood: 'Alamo Square',
		city: 'San Francisco',
		state: 'CA',
		zip: '94117',
		price: 2950000,
		beds: 4,
		baths: 3,
		sqft: 2780,
		propertyType: 'Townhouse',
		hoaMonthly: 180,
		daysOnMarket: 21,
		lat: 37.7764,
		lng: -122.4328,
		streetViewHeading: 85,
		streetViewPitch: 7,
		accentColor: '#6d28d9',
		highlights: ['Park Across Street', '12ft Ceilings', 'Chef Kitchen'],
		description:
			'Iconic Alamo Square townhouse overlooking manicured park lawns with triple-hung sash windows, marble fireplace mantels, and private garden patio.',
		parcel: {
			apn: '0775-015',
			lotSqFt: 2750,
			lotDimensions: '25 ft × 110 ft',
			zoning: 'RH-3 (Residential House, Three-Family)',
			yearBuilt: 1895,
			polygon: makeParcelRect(37.7764, -122.4328, 0.00015, 0.00019)
		}
	}
];

export const WORKPLACE_PRESETS = [
	{ label: 'Salesforce Tower (415 Mission St)', address: '415 Mission St, San Francisco, CA', lat: 37.7897, lng: -122.3972 },
	{ label: 'Ferry Building (Embarcadero)', address: '1 Ferry Building, San Francisco, CA', lat: 37.7955, lng: -122.3937 },
	{ label: 'UCSF Mission Bay', address: '550 16th St, San Francisco, CA', lat: 37.7678, lng: -122.3917 }
];

export function formatPriceFull(price: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0
	}).format(price);
}

export function formatPriceCompact(price: number): string {
	if (price >= 1_000_000) {
		const m = price / 1_000_000;
		return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(2).replace(/0$/, '')}M`;
	}
	return `$${Math.round(price / 1_000)}K`;
}

export function haversineDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const R = 6371000;
	const toRad = (d: number) => (d * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLng = toRad(lng2 - lng1);
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
	return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function formatDistance(meters: number): string {
	if (meters < 1000) {
		return `${meters} m`;
	}
	const miles = meters / 1609.344;
	return `${miles.toFixed(1)} mi`;
}
