import type { FloodZoneDefinition, HazardIncident, HazardType } from '$lib/types';

export const MIAMI_CENTER: google.maps.LatLngLiteral = {
	lat: 25.7743,
	lng: -80.1937
};

export const HAZARD_TYPES: { value: HazardType; label: string; defaultWeight: number }[] = [
	{ value: 'Flash Flooding', label: 'Flash Flooding (Street / Underpass)', defaultWeight: 5 },
	{ value: 'Storm Surge', label: 'Coastal / River Storm Surge', defaultWeight: 5 },
	{ value: 'Road Closure', label: 'Impassable Road / Submersion', defaultWeight: 4 },
	{ value: 'Downed Power Line', label: 'Downed Power Line / Debris', defaultWeight: 4 },
	{ value: 'Drainage Overflow', label: 'Storm Drain Overflow', defaultWeight: 3 }
];

export const FLOOD_ZONES: FloodZoneDefinition[] = [
	{
		id: 'zone-brickell-river',
		name: 'Brickell & Miami River Surge Basin',
		severity: 'High Risk',
		description:
			'Low-lying tidal surge zone along the Miami River mouth and Brickell Bayfront. Avoid eastbound/southbound surface crossings during heavy rain.',
		fillColor: '#dc2626',
		strokeColor: '#991b1b',
		paths: [
			{ lat: 25.7734, lng: -80.2035 },
			{ lat: 25.7748, lng: -80.1862 },
			{ lat: 25.7642, lng: -80.1846 },
			{ lat: 25.7615, lng: -80.1965 },
			{ lat: 25.7668, lng: -80.2044 }
		]
	},
	{
		id: 'zone-edgewater-bay',
		name: 'Edgewater & Biscayne Bay Lowlands',
		severity: 'Moderate-High',
		description:
			'King-tide and storm-drainage accumulation corridor bordering Biscayne Bay between NE 15th St and NE 31st St.',
		fillColor: '#f59e0b',
		strokeColor: '#b45309',
		paths: [
			{ lat: 25.8058, lng: -80.1912 },
			{ lat: 25.8065, lng: -80.1836 },
			{ lat: 25.7892, lng: -80.1831 },
			{ lat: 25.7885, lng: -80.1922 }
		]
	},
	{
		id: 'zone-little-havana-canal',
		name: 'Little Havana / Wagner Creek Basin',
		severity: 'Advisory',
		description:
			'Inland canal overflow advisory zone near SW 1st St and NW 12th Ave affecting low-clearance intersections.',
		fillColor: '#ea580c',
		strokeColor: '#9a3412',
		paths: [
			{ lat: 25.7832, lng: -80.2225 },
			{ lat: 25.7841, lng: -80.2098 },
			{ lat: 25.7728, lng: -80.2092 },
			{ lat: 25.7722, lng: -80.2218 }
		]
	}
];

export const INITIAL_INCIDENTS: HazardIncident[] = [
	{
		id: 'inc-01',
		lat: 25.7695,
		lng: -80.1904,
		weight: 5,
		type: 'Storm Surge',
		address: 'Brickell Ave & SE 8th St, Miami, FL',
		elevationMeters: 1.1,
		weatherSummary: 'Heavy Rain Advisory',
		windText: '24 mph ESE',
		precipText: '85% • 0.65 in/hr',
		reportedAt: '18 mins ago'
	},
	{
		id: 'inc-02',
		lat: 25.7712,
		lng: -80.1888,
		weight: 5,
		type: 'Flash Flooding',
		address: 'Brickell Key Dr Causeway, Miami, FL',
		elevationMeters: 0.8,
		weatherSummary: 'Coastal Surge',
		windText: '25 mph ESE',
		precipText: '85% • 0.70 in/hr',
		reportedAt: '22 mins ago'
	},
	{
		id: 'inc-03',
		lat: 25.7664,
		lng: -80.1932,
		weight: 4,
		type: 'Road Closure',
		address: 'S Miami Ave & SE 10th St, Miami, FL',
		elevationMeters: 1.3,
		weatherSummary: 'Street Submersion',
		windText: '21 mph ESE',
		precipText: '80% • 0.50 in/hr',
		reportedAt: '29 mins ago'
	},
	{
		id: 'inc-04',
		lat: 25.7725,
		lng: -80.1988,
		weight: 4,
		type: 'Drainage Overflow',
		address: 'SW 2nd Ave & SW 4th St, Miami, FL',
		elevationMeters: 1.5,
		weatherSummary: 'Standing Water',
		windText: '19 mph E',
		precipText: '75% • 0.42 in/hr',
		reportedAt: '34 mins ago'
	},
	{
		id: 'inc-05',
		lat: 25.7681,
		lng: -80.1872,
		weight: 5,
		type: 'Storm Surge',
		address: 'Brickell Bay Dr & SE 12th St, Miami, FL',
		elevationMeters: 0.9,
		weatherSummary: 'Seawall Overtopping',
		windText: '26 mph ESE',
		precipText: '90% • 0.75 in/hr',
		reportedAt: '12 mins ago'
	},
	{
		id: 'inc-06',
		lat: 25.7751,
		lng: -80.1892,
		weight: 4,
		type: 'Flash Flooding',
		address: 'Biscayne Blvd & Chopin Plaza, Miami, FL',
		elevationMeters: 1.4,
		weatherSummary: 'Heavy Rain',
		windText: '22 mph E',
		precipText: '80% • 0.55 in/hr',
		reportedAt: '41 mins ago'
	},
	{
		id: 'inc-07',
		lat: 25.7955,
		lng: -80.1875,
		weight: 5,
		type: 'Flash Flooding',
		address: 'N Bayshore Dr & NE 21st St, Miami, FL',
		elevationMeters: 1.0,
		weatherSummary: 'Tidal Backflow',
		windText: '23 mph ESE',
		precipText: '85% • 0.62 in/hr',
		reportedAt: '15 mins ago'
	},
	{
		id: 'inc-08',
		lat: 25.7988,
		lng: -80.1868,
		weight: 4,
		type: 'Road Closure',
		address: 'NE 24th St & Biscayne Blvd, Miami, FL',
		elevationMeters: 1.2,
		weatherSummary: 'Standing Water',
		windText: '22 mph E',
		precipText: '80% • 0.52 in/hr',
		reportedAt: '25 mins ago'
	},
	{
		id: 'inc-09',
		lat: 25.7921,
		lng: -80.1894,
		weight: 4,
		type: 'Drainage Overflow',
		address: 'NE 17th St & NE 2nd Ave, Miami, FL',
		elevationMeters: 1.5,
		weatherSummary: 'Storm Drain Backed Up',
		windText: '20 mph E',
		precipText: '75% • 0.45 in/hr',
		reportedAt: '37 mins ago'
	},
	{
		id: 'inc-10',
		lat: 25.8022,
		lng: -80.1886,
		weight: 5,
		type: 'Storm Surge',
		address: 'NE 27th St & N Bayshore Dr, Miami, FL',
		elevationMeters: 0.9,
		weatherSummary: 'Bayfront Flooding',
		windText: '25 mph ESE',
		precipText: '85% • 0.68 in/hr',
		reportedAt: '19 mins ago'
	},
	{
		id: 'inc-11',
		lat: 25.7782,
		lng: -80.2148,
		weight: 4,
		type: 'Flash Flooding',
		address: 'NW 12th Ave & NW 3rd St, Miami, FL',
		elevationMeters: 1.7,
		weatherSummary: 'Canal Overflow',
		windText: '18 mph ESE',
		precipText: '75% • 0.40 in/hr',
		reportedAt: '44 mins ago'
	},
	{
		id: 'inc-12',
		lat: 25.7764,
		lng: -80.2179,
		weight: 5,
		type: 'Road Closure',
		address: 'W Flagler St & NW 14th Ave, Miami, FL',
		elevationMeters: 1.6,
		weatherSummary: 'Deep Pooling',
		windText: '19 mph E',
		precipText: '80% • 0.48 in/hr',
		reportedAt: '27 mins ago'
	},
	{
		id: 'inc-13',
		lat: 25.7805,
		lng: -80.2121,
		weight: 4,
		type: 'Downed Power Line',
		address: 'NW 7th St & NW 11th Ave, Miami, FL',
		elevationMeters: 1.9,
		weatherSummary: 'Gusty Squall',
		windText: '27 mph ESE',
		precipText: '70% • 0.35 in/hr',
		reportedAt: '31 mins ago'
	},
	{
		id: 'inc-14',
		lat: 25.7644,
		lng: -80.1895,
		weight: 5,
		type: 'Flash Flooding',
		address: 'SE 14th St & Brickell Ave, Miami, FL',
		elevationMeters: 1.0,
		weatherSummary: 'Heavy Flooding',
		windText: '24 mph ESE',
		precipText: '88% • 0.72 in/hr',
		reportedAt: '11 mins ago'
	},
	{
		id: 'inc-15',
		lat: 25.7699,
		lng: -80.1949,
		weight: 4,
		type: 'Drainage Overflow',
		address: 'SW 8th St & SW 1st Ave, Miami, FL',
		elevationMeters: 1.4,
		weatherSummary: 'Curb Flooding',
		windText: '21 mph E',
		precipText: '78% • 0.46 in/hr',
		reportedAt: '33 mins ago'
	},
	{
		id: 'inc-16',
		lat: 25.7736,
		lng: -80.1912,
		weight: 4,
		type: 'Road Closure',
		address: 'SE 2nd Ave & SE 2nd St, Miami, FL',
		elevationMeters: 1.3,
		weatherSummary: 'Bridge Approach Flooded',
		windText: '22 mph ESE',
		precipText: '82% • 0.56 in/hr',
		reportedAt: '24 mins ago'
	},
	{
		id: 'inc-17',
		lat: 25.7798,
		lng: -80.1901,
		weight: 3,
		type: 'Drainage Overflow',
		address: 'NE 5th St & Biscayne Blvd, Miami, FL',
		elevationMeters: 1.8,
		weatherSummary: 'Moderate Runoff',
		windText: '19 mph E',
		precipText: '70% • 0.32 in/hr',
		reportedAt: '48 mins ago'
	},
	{
		id: 'inc-18',
		lat: 25.7862,
		lng: -80.1889,
		weight: 4,
		type: 'Flash Flooding',
		address: 'NE 13th St & N Bayshore Dr, Miami, FL',
		elevationMeters: 1.3,
		weatherSummary: 'Bayfront Runoff',
		windText: '23 mph ESE',
		precipText: '80% • 0.51 in/hr',
		reportedAt: '30 mins ago'
	},
	{
		id: 'inc-19',
		lat: 25.7652,
		lng: -80.2008,
		weight: 3,
		type: 'Downed Power Line',
		address: 'SW 12th St & SW 3rd Ave, Miami, FL',
		elevationMeters: 2.1,
		weatherSummary: 'Tree Limb on Line',
		windText: '28 mph ESE',
		precipText: '65% • 0.28 in/hr',
		reportedAt: '52 mins ago'
	},
	{
		id: 'inc-20',
		lat: 25.7749,
		lng: -80.2016,
		weight: 4,
		type: 'Flash Flooding',
		address: 'NW North River Dr & NW 3rd St, Miami, FL',
		elevationMeters: 1.2,
		weatherSummary: 'Riverbank Overflow',
		windText: '21 mph ESE',
		precipText: '82% • 0.54 in/hr',
		reportedAt: '21 mins ago'
	},
	{
		id: 'inc-21',
		lat: 25.7875,
		lng: -80.2055,
		weight: 3,
		type: 'Drainage Overflow',
		address: 'NW 14th St & NW 7th Ave, Miami, FL',
		elevationMeters: 2.3,
		weatherSummary: 'Pooling Intersection',
		windText: '18 mph E',
		precipText: '68% • 0.30 in/hr',
		reportedAt: '55 mins ago'
	},
	{
		id: 'inc-22',
		lat: 25.7995,
		lng: -80.1912,
		weight: 4,
		type: 'Road Closure',
		address: 'NE 25th St & NE 2nd Ave, Miami, FL',
		elevationMeters: 1.4,
		weatherSummary: 'Underpass Flooded',
		windText: '22 mph ESE',
		precipText: '80% • 0.49 in/hr',
		reportedAt: '28 mins ago'
	},
	{
		id: 'inc-23',
		lat: 25.7604,
		lng: -80.1948,
		weight: 4,
		type: 'Flash Flooding',
		address: 'SW 15th Rd & S Miami Ave, Miami, FL',
		elevationMeters: 1.4,
		weatherSummary: 'Heavy Rain Pooling',
		windText: '21 mph ESE',
		precipText: '78% • 0.44 in/hr',
		reportedAt: '36 mins ago'
	},
	{
		id: 'inc-24',
		lat: 25.7708,
		lng: -80.1922,
		weight: 5,
		type: 'Storm Surge',
		address: 'SE 5th St & Brickell Ave, Miami, FL',
		elevationMeters: 1.0,
		weatherSummary: 'Miami River Surge',
		windText: '25 mph ESE',
		precipText: '88% • 0.66 in/hr',
		reportedAt: '14 mins ago'
	},
	{
		id: 'inc-25',
		lat: 25.7819,
		lng: -80.1945,
		weight: 3,
		type: 'Downed Power Line',
		address: 'NE 8th St & N Miami Ave, Miami, FL',
		elevationMeters: 2.2,
		weatherSummary: 'Wind Gust Hazard',
		windText: '29 mph ESE',
		precipText: '65% • 0.25 in/hr',
		reportedAt: '46 mins ago'
	},
	{
		id: 'inc-26',
		lat: 25.7942,
		lng: -80.1859,
		weight: 5,
		type: 'Storm Surge',
		address: 'Margaret Pace Park Seawall, Miami, FL',
		elevationMeters: 0.7,
		weatherSummary: 'Bay Overwash',
		windText: '26 mph ESE',
		precipText: '90% • 0.74 in/hr',
		reportedAt: '9 mins ago'
	},
	{
		id: 'inc-27',
		lat: 25.7768,
		lng: -80.2202,
		weight: 4,
		type: 'Flash Flooding',
		address: 'SW 1st St & SW 16th Ave, Miami, FL',
		elevationMeters: 1.5,
		weatherSummary: 'Heavy Runoff',
		windText: '19 mph E',
		precipText: '76% • 0.41 in/hr',
		reportedAt: '39 mins ago'
	},
	{
		id: 'inc-28',
		lat: 25.7689,
		lng: -80.1889,
		weight: 5,
		type: 'Flash Flooding',
		address: 'Brickell Plaza & SE 9th St, Miami, FL',
		elevationMeters: 1.1,
		weatherSummary: 'Knee-Deep Water',
		windText: '24 mph ESE',
		precipText: '86% • 0.64 in/hr',
		reportedAt: '16 mins ago'
	}
];
