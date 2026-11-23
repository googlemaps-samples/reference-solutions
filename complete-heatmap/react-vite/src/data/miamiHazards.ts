import type { FloodZone, HazardIncident, LatLngPoint } from '../types/hazard';

export const MIAMI_CENTER: LatLngPoint = {
  lat: 25.7743,
  lng: -80.1937,
};

export const INITIAL_MIAMI_ZOOM = 13;

export const SEED_SHELTER_QUERY = 'hospital and community center in Miami, FL';

export const HAZARD_TYPE_OPTIONS = [
  'Street Flooding',
  'Storm Surge',
  'Blocked Evacuation Route',
  'Downed Power Line',
  'Coastal Tide Overflow',
] as const;

export const MIAMI_FLOOD_ZONES: FloodZone[] = [
  {
    id: 'zone-brickell-bayfront',
    name: 'Brickell & Bayfront Storm Surge Zone',
    severity: 'CRITICAL',
    surgeLevelMeters: 1.8,
    description:
      'Active coastal surge & tidal backflow corridor along Brickell Bay Dr, Biscayne Blvd Way, and MacArthur Causeway eastern approach.',
    paths: [
      { lat: 25.7832, lng: -80.1912 },
      { lat: 25.7836, lng: -80.1818 },
      { lat: 25.7715, lng: -80.1812 },
      { lat: 25.7568, lng: -80.1858 },
      { lat: 25.7555, lng: -80.1936 },
      { lat: 25.7685, lng: -80.1924 },
    ],
  },
  {
    id: 'zone-edgewater-little-river',
    name: 'Edgewater & Biscayne Canal Flood Basin',
    severity: 'HIGH',
    surgeLevelMeters: 1.3,
    description:
      'Low-lying drainage basin along Biscayne Bayshore, Julia Tuttle Causeway west end, and NE 2nd Ave corridor.',
    paths: [
      { lat: 25.8145, lng: -80.1938 },
      { lat: 25.8152, lng: -80.1815 },
      { lat: 25.7928, lng: -80.1822 },
      { lat: 25.7918, lng: -80.1934 },
    ],
  },
  {
    id: 'zone-south-beach-west',
    name: 'Miami Beach West Ave Tidal Surge Zone',
    severity: 'CRITICAL',
    surgeLevelMeters: 2.1,
    description:
      'King-tide and storm-surge inundation zone covering Alton Rd, West Ave, and South Pointe bayfront.',
    paths: [
      { lat: 25.7915, lng: -80.1458 },
      { lat: 25.7918, lng: -80.1325 },
      { lat: 25.7682, lng: -80.1318 },
      { lat: 25.7675, lng: -80.1445 },
    ],
  },
];

export const INITIAL_HAZARD_INCIDENTS: HazardIncident[] = [
  // Brickell & Downtown Bayfront cluster
  { id: 'inc-01', lat: 25.7748, lng: -80.1886, weight: 9, type: 'Storm Surge', address: 'Biscayne Blvd & SE 2nd St, Miami, FL', reportedAt: '10m ago' },
  { id: 'inc-02', lat: 25.7712, lng: -80.1899, weight: 8, type: 'Street Flooding', address: 'Brickell Ave & SE 5th St, Miami, FL', reportedAt: '14m ago' },
  { id: 'inc-03', lat: 25.7664, lng: -80.1882, weight: 10, type: 'Storm Surge', address: 'Brickell Bay Dr & SE 8th St, Miami, FL', reportedAt: '18m ago' },
  { id: 'inc-04', lat: 25.7621, lng: -80.1895, weight: 9, type: 'Street Flooding', address: 'Brickell Bay Dr & SE 12th St, Miami, FL', reportedAt: '21m ago' },
  { id: 'inc-05', lat: 25.7586, lng: -80.1912, weight: 8, type: 'Coastal Tide Overflow', address: 'S Miami Ave & SE 15th Rd, Miami, FL', reportedAt: '25m ago' },
  { id: 'inc-06', lat: 25.7779, lng: -80.1869, weight: 9, type: 'Blocked Evacuation Route', address: 'Biscayne Blvd & NE 4th St, Miami, FL', reportedAt: '29m ago' },
  { id: 'inc-07', lat: 25.7804, lng: -80.1862, weight: 7, type: 'Street Flooding', address: 'NE 6th St & Biscayne Blvd, Miami, FL', reportedAt: '32m ago' },
  { id: 'inc-08', lat: 25.7691, lng: -80.1916, weight: 7, type: 'Street Flooding', address: 'S Miami Ave & SE 7th St, Miami, FL', reportedAt: '34m ago' },
  { id: 'inc-09', lat: 25.7731, lng: -80.1928, weight: 6, type: 'Downed Power Line', address: 'SW 1st Ave & SW 2nd St, Miami, FL', reportedAt: '38m ago' },
  { id: 'inc-10', lat: 25.7642, lng: -80.1918, weight: 8, type: 'Street Flooding', address: 'Brickell Ave & SE 10th St, Miami, FL', reportedAt: '40m ago' },
  // Edgewater & Wynwood cluster
  { id: 'inc-11', lat: 25.7965, lng: -80.1879, weight: 8, type: 'Street Flooding', address: 'NE 21st St & N Bayshore Dr, Miami, FL', reportedAt: '16m ago' },
  { id: 'inc-12', lat: 25.8012, lng: -80.1864, weight: 9, type: 'Coastal Tide Overflow', address: 'NE 25th St & N Bayshore Dr, Miami, FL', reportedAt: '19m ago' },
  { id: 'inc-13', lat: 25.8054, lng: -80.1872, weight: 8, type: 'Blocked Evacuation Route', address: 'NE 29th St & Biscayne Blvd, Miami, FL', reportedAt: '27m ago' },
  { id: 'inc-14', lat: 25.8091, lng: -80.1889, weight: 7, type: 'Street Flooding', address: 'NE 34th St & Biscayne Blvd, Miami, FL', reportedAt: '33m ago' },
  { id: 'inc-15', lat: 25.7988, lng: -80.1916, weight: 6, type: 'Street Flooding', address: 'NE 23rd St & NE 2nd Ave, Miami, FL', reportedAt: '42m ago' },
  { id: 'inc-16', lat: 25.8029, lng: -80.1955, weight: 5, type: 'Downed Power Line', address: 'NW 27th St & N Miami Ave, Miami, FL', reportedAt: '46m ago' },
  { id: 'inc-17', lat: 25.7942, lng: -80.1895, weight: 7, type: 'Street Flooding', address: 'NE 18th St & NE 2nd Ave, Miami, FL', reportedAt: '48m ago' },
  { id: 'inc-18', lat: 25.8112, lng: -80.1846, weight: 9, type: 'Storm Surge', address: 'I-195 Julia Tuttle Ramp & Bayshore, Miami, FL', reportedAt: '15m ago' },
  // Miami Beach West Ave / Alton cluster
  { id: 'inc-19', lat: 25.7745, lng: -80.1412, weight: 10, type: 'Storm Surge', address: '5th St & West Ave, Miami Beach, FL', reportedAt: '11m ago' },
  { id: 'inc-20', lat: 25.7798, lng: -80.1404, weight: 9, type: 'Coastal Tide Overflow', address: '9th St & Alton Rd, Miami Beach, FL', reportedAt: '17m ago' },
  { id: 'inc-21', lat: 25.7845, lng: -80.1398, weight: 8, type: 'Street Flooding', address: '14th St & West Ave, Miami Beach, FL', reportedAt: '22m ago' },
  { id: 'inc-22', lat: 25.7882, lng: -80.1386, weight: 8, type: 'Blocked Evacuation Route', address: '17th St & Alton Rd, Miami Beach, FL', reportedAt: '28m ago' },
  { id: 'inc-23', lat: 25.7711, lng: -80.1369, weight: 7, type: 'Street Flooding', address: '2nd St & Washington Ave, Miami Beach, FL', reportedAt: '35m ago' },
  { id: 'inc-24', lat: 25.7776, lng: -80.1342, weight: 6, type: 'Street Flooding', address: '8th St & Collins Ave, Miami Beach, FL', reportedAt: '41m ago' },
  // Little Havana / Miami River / Overtown pockets
  { id: 'inc-25', lat: 25.7725, lng: -80.2038, weight: 6, type: 'Street Flooding', address: 'SW 8th Ave & W Flagler St, Miami, FL', reportedAt: '26m ago' },
  { id: 'inc-26', lat: 25.7689, lng: -80.2094, weight: 7, type: 'Street Flooding', address: 'SW 12th Ave & SW 4th St, Miami, FL', reportedAt: '31m ago' },
  { id: 'inc-27', lat: 25.7764, lng: -80.2012, weight: 5, type: 'Downed Power Line', address: 'NW 3rd St & NW 6th Ave, Miami, FL', reportedAt: '44m ago' },
  { id: 'inc-28', lat: 25.7822, lng: -80.1991, weight: 6, type: 'Street Flooding', address: 'NW 8th St & NW 3rd Ave, Miami, FL', reportedAt: '50m ago' },
  { id: 'inc-29', lat: 25.7654, lng: -80.2145, weight: 6, type: 'Street Flooding', address: 'SW 8th St & SW 15th Ave, Miami, FL', reportedAt: '52m ago' },
  { id: 'inc-30', lat: 25.7795, lng: -80.2124, weight: 4, type: 'Downed Power Line', address: 'NW 12th Ave & NW 5th St, Miami, FL', reportedAt: '54m ago' },
  // Coconut Grove / Vizcaya bayfront pocket
  { id: 'inc-31', lat: 25.7445, lng: -80.2098, weight: 8, type: 'Coastal Tide Overflow', address: 'S Bayshore Dr & Aviation Ave, Miami, FL', reportedAt: '23m ago' },
  { id: 'inc-32', lat: 25.7488, lng: -80.2032, weight: 7, type: 'Street Flooding', address: 'S Bayshore Dr & Crystal View Ct, Miami, FL', reportedAt: '29m ago' },
  { id: 'inc-33', lat: 25.7528, lng: -80.1965, weight: 8, type: 'Blocked Evacuation Route', address: 'Brickell Ave & Rickenbacker Cswy, Miami, FL', reportedAt: '12m ago' },
  { id: 'inc-34', lat: 25.7511, lng: -80.1892, weight: 7, type: 'Storm Surge', address: 'Rickenbacker Cswy West Toll Plaza, Miami, FL', reportedAt: '20m ago' },
  { id: 'inc-35', lat: 25.7858, lng: -80.1848, weight: 8, type: 'Street Flooding', address: 'Venetian Cswy & Biscayne Blvd, Miami, FL', reportedAt: '24m ago' },
  { id: 'inc-36', lat: 25.7905, lng: -80.1654, weight: 6, type: 'Coastal Tide Overflow', address: 'Venetian Cswy & San Marco Island, Miami Beach, FL', reportedAt: '39m ago' },
  { id: 'inc-37', lat: 25.7719, lng: -80.1722, weight: 7, type: 'Blocked Evacuation Route', address: 'MacArthur Cswy & Watson Island, Miami, FL', reportedAt: '13m ago' },
  { id: 'inc-38', lat: 25.7649, lng: -80.1889, weight: 9, type: 'Street Flooding', address: 'Brickell Plaza & SE 8th St, Miami, FL', reportedAt: '9m ago' },
  { id: 'inc-39', lat: 25.7768, lng: -80.1904, weight: 7, type: 'Street Flooding', address: 'NE 1st Ave & NE 2nd St, Miami, FL', reportedAt: '18m ago' },
  { id: 'inc-40', lat: 25.7875, lng: -80.1881, weight: 8, type: 'Street Flooding', address: 'NE 13th St & Biscayne Blvd, Miami, FL', reportedAt: '22m ago' },
];
