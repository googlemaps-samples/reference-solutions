import type { FloodHazardZone, HazardIncident, LatLngPoint } from '@/types/hazard';

export const MIAMI_CENTER: LatLngPoint = {
  lat: 25.7743,
  lng: -80.1937,
};

export const MIAMI_INITIAL_ZOOM = 13;

export const SEED_SHELTER_QUERY = 'hospital and community center in Miami, FL';

/**
 * Active coastal surge & low-lying flood-hazard zone polygons in Miami, FL.
 * Used for polygon visualization, point-in-zone checks, and flood-avoidance via-waypoint routing.
 */
export const MIAMI_FLOOD_ZONES: FloodHazardZone[] = [
  {
    id: 'zone-brickell-bayfront',
    name: 'Zone A: Brickell & Biscayne Bayfront Surge',
    severity: 'CRITICAL',
    surgeEstimateMeters: 1.8,
    description:
      'Active Biscayne Bay storm surge corridor affecting Brickell Ave, Bayfront Park, and SE coastal access roads.',
    fillColor: '#dc2626',
    strokeColor: '#991b1b',
    ring: [
      { lat: 25.7815, lng: -80.1895 },
      { lat: 25.7815, lng: -80.1835 },
      { lat: 25.7640, lng: -80.1845 },
      { lat: 25.7565, lng: -80.1908 },
      { lat: 25.7580, lng: -80.1955 },
      { lat: 25.7685, lng: -80.1935 },
      { lat: 25.7760, lng: -80.1912 },
    ],
    bypassWaypoints: [
      { lat: 25.7765, lng: -80.2035 }, // Inland West via I-95 / SW 2nd Ave corridor
      { lat: 25.7878, lng: -80.1995 }, // North-west inland perimeter near Overtown / I-395
      { lat: 25.7615, lng: -80.2055 }, // South-west inland perimeter near Coral Way / SW 8th
    ],
  },
  {
    id: 'zone-miami-river-basin',
    name: 'Zone B: Miami River & East Little Havana Basin',
    severity: 'HIGH',
    surgeEstimateMeters: 1.2,
    description:
      'Riverine overflow and king-tide backflow along the lower Miami River canal and SW 1st/Flagler crossings.',
    fillColor: '#ea580c',
    strokeColor: '#9a3412',
    ring: [
      { lat: 25.7795, lng: -80.2145 },
      { lat: 25.7798, lng: -80.2038 },
      { lat: 25.7718, lng: -80.1992 },
      { lat: 25.7682, lng: -80.2045 },
      { lat: 25.7705, lng: -80.2155 },
    ],
    bypassWaypoints: [
      { lat: 25.7862, lng: -80.2125 }, // North of Miami River via NW 14th St / Civic Center corridor
      { lat: 25.7635, lng: -80.2140 }, // South via SW 8th St corridor
      { lat: 25.7840, lng: -80.1975 }, // East-north inland corridor
    ],
  },
  {
    id: 'zone-edgewater-corridor',
    name: 'Zone C: Edgewater & Venetian Causeway Lowland',
    severity: 'MODERATE',
    surgeEstimateMeters: 0.9,
    description:
      'Tidal street pooling along Biscayne Blvd waterfront blocks and Venetian Causeway western approach.',
    fillColor: '#d97706',
    strokeColor: '#92400e',
    ring: [
      { lat: 25.7995, lng: -80.1895 },
      { lat: 25.7992, lng: -80.1830 },
      { lat: 25.7875, lng: -80.1842 },
      { lat: 25.7878, lng: -80.1905 },
    ],
    bypassWaypoints: [
      { lat: 25.7955, lng: -80.1985 }, // West via N Miami Ave / Midtown inland spine
      { lat: 25.8035, lng: -80.1965 }, // North-west Edgewater bypass
    ],
  },
];

/**
 * Seed storm/flooding incident telemetry clusters across Miami for the deck.gl HeatmapLayer.
 * Represents civic hazard reports only (no hallucinated business/POI data).
 */
export const INITIAL_HAZARD_INCIDENTS: HazardIncident[] = [
  // Brickell & Bayfront surge cluster
  { id: 'inc-01', lat: 25.7688, lng: -80.1892, weight: 9.5, type: 'Storm Surge', reportedAt: '14m ago', notes: 'Brickell Bay Dr seawall overtopping' },
  { id: 'inc-02', lat: 25.7712, lng: -80.1880, weight: 8.8, type: 'Flash Flooding', reportedAt: '19m ago', notes: 'Standing water 35cm at Brickell Key Bridge' },
  { id: 'inc-03', lat: 25.7652, lng: -80.1901, weight: 9.2, type: 'Road Submersion', reportedAt: '22m ago', notes: 'SE 8th St & Brickell Ave impassable' },
  { id: 'inc-04', lat: 25.7745, lng: -80.1865, weight: 8.4, type: 'Storm Surge', reportedAt: '28m ago', notes: 'Bayfront Park promenade submerged' },
  { id: 'inc-05', lat: 25.7784, lng: -80.1872, weight: 7.9, type: 'Flash Flooding', reportedAt: '31m ago', notes: 'Biscayne Blvd southbound lane flooded' },
  { id: 'inc-06', lat: 25.7605, lng: -80.1918, weight: 8.1, type: 'Road Submersion', reportedAt: '37m ago', notes: 'South Brickell tidal drain backup' },
  { id: 'inc-07', lat: 25.7670, lng: -80.1924, weight: 6.5, type: 'Wind Debris', reportedAt: '41m ago', notes: 'Palm fronds blocking Brickell Metrorail ramp' },
  { id: 'inc-08', lat: 25.7768, lng: -80.1894, weight: 7.6, type: 'Flash Flooding', reportedAt: '44m ago', notes: 'NE 2nd St storm drain overflow' },

  // Miami River & Little Havana cluster
  { id: 'inc-09', lat: 25.7742, lng: -80.2045, weight: 8.9, type: 'Flash Flooding', reportedAt: '11m ago', notes: 'W Flagler St bridge approach pooling' },
  { id: 'inc-10', lat: 25.7765, lng: -80.2082, weight: 8.2, type: 'Road Submersion', reportedAt: '16m ago', notes: 'NW South River Dr riverfront overflow' },
  { id: 'inc-11', lat: 25.7720, lng: -80.2018, weight: 7.8, type: 'Storm Surge', reportedAt: '25m ago', notes: 'SW 2nd St canal bulkhead seepage' },
  { id: 'inc-12', lat: 25.7755, lng: -80.2115, weight: 7.2, type: 'Downed Power Line', reportedAt: '33m ago', notes: 'Utility line arc near NW 12th Ave' },
  { id: 'inc-13', lat: 25.7704, lng: -80.2068, weight: 6.9, type: 'Flash Flooding', reportedAt: '48m ago', notes: 'SW 3rd St intersection ponding' },
  { id: 'inc-14', lat: 25.7780, lng: -80.2060, weight: 7.4, type: 'Flash Flooding', reportedAt: '52m ago', notes: 'NW 5th St low culvert backup' },

  // Edgewater & Wynwood / Midtown corridor
  { id: 'inc-15', lat: 25.7928, lng: -80.1868, weight: 7.5, type: 'Storm Surge', reportedAt: '18m ago', notes: 'Margaret Pace Park baywalk flooding' },
  { id: 'inc-16', lat: 25.7955, lng: -80.1874, weight: 7.1, type: 'Flash Flooding', reportedAt: '29m ago', notes: 'NE 21st St east of Biscayne submerged' },
  { id: 'inc-17', lat: 25.7895, lng: -80.1882, weight: 6.8, type: 'Road Submersion', reportedAt: '39m ago', notes: 'Venetian Causeway toll approach water' },
  { id: 'inc-18', lat: 25.7980, lng: -80.1862, weight: 6.4, type: 'Wind Debris', reportedAt: '46m ago', notes: 'High gust debris on NE 24th St' },
  { id: 'inc-19', lat: 25.8005, lng: -80.1932, weight: 5.5, type: 'Flash Flooding', reportedAt: '55m ago', notes: 'Wynwood NW 2nd Ave curb flooding' },

  // Downtown / Overtown / Coral Way scattered telemetry
  { id: 'inc-20', lat: 25.7758, lng: -80.1952, weight: 5.8, type: 'Wind Debris', reportedAt: '21m ago', notes: 'Traffic signal outage at NW 1st Ave' },
  { id: 'inc-21', lat: 25.7798, lng: -80.1965, weight: 5.2, type: 'Flash Flooding', reportedAt: '36m ago', notes: 'NW 6th St underpass water accumulation' },
  { id: 'inc-22', lat: 25.7642, lng: -80.1985, weight: 6.1, type: 'Downed Power Line', reportedAt: '42m ago', notes: 'Tree limb on feeder near SW 10th St' },
  { id: 'inc-23', lat: 25.7658, lng: -80.2102, weight: 5.7, type: 'Flash Flooding', reportedAt: '50m ago', notes: 'Calle Ocho drainage slow runoff' },
  { id: 'inc-24', lat: 25.7845, lng: -80.2145, weight: 4.9, type: 'Wind Debris', reportedAt: '58m ago', notes: 'Gust-damaged signage along NW 14th St' },
  { id: 'inc-25', lat: 25.7830, lng: -80.1912, weight: 6.6, type: 'Road Submersion', reportedAt: '27m ago', notes: 'NE 9th St & Biscayne Blvd ponding' },
  { id: 'inc-26', lat: 25.7582, lng: -80.1932, weight: 7.3, type: 'Storm Surge', reportedAt: '34m ago', notes: 'Rickenbacker approach pooling' },
  { id: 'inc-27', lat: 25.7732, lng: -80.1905, weight: 8.0, type: 'Flash Flooding', reportedAt: '15m ago', notes: 'E Flagler St & Biscayne Blvd flooding' },
  { id: 'inc-28', lat: 25.7702, lng: -80.1902, weight: 8.3, type: 'Flash Flooding', reportedAt: '20m ago', notes: 'SE 2nd Ave drainage backup' },
];
