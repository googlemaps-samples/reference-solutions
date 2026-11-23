import type { FloodZone, HazardType, IncidentPoint, LatLngPoint } from '../types/hazard';

export const MIAMI_CENTER: LatLngPoint = {
  lat: 25.7743,
  lng: -80.1937,
};

export const DEFAULT_SHELTER_QUERY = 'hospital and community center in Miami, FL';

export const HAZARD_TYPE_WEIGHTS: Record<HazardType, number> = {
  'Storm Surge': 10,
  'Street Flooding': 8,
  'Storm Drain Overflow': 6,
  'Road Obstruction': 7,
  'Downed Power Line': 9,
};

export const FLOOD_HAZARD_ZONES: FloodZone[] = [
  {
    id: 'zone-brickell-bayfront',
    name: 'Brickell & Bayfront Surge Zone',
    severity: 'critical',
    estimatedDepthCm: 65,
    advisory:
      'Active coastal storm surge and standing tidal water along Brickell Ave & SE 8th St.',
    fillColor: '#dc2626',
    strokeColor: '#991b1b',
    paths: [
      { lat: 25.7728, lng: -80.1932 },
      { lat: 25.7731, lng: -80.1846 },
      { lat: 25.7628, lng: -80.1852 },
      { lat: 25.7624, lng: -80.1938 },
    ],
  },
  {
    id: 'zone-miami-river-lowland',
    name: 'Miami River & Little Havana Basin',
    severity: 'high',
    estimatedDepthCm: 42,
    advisory:
      'Riverfront drainage backup near SW 1st St & Flagler St corridor. Avoid low underpasses.',
    fillColor: '#f59e0b',
    strokeColor: '#b45309',
    paths: [
      { lat: 25.7812, lng: -80.2145 },
      { lat: 25.7816, lng: -80.1992 },
      { lat: 25.7712, lng: -80.1986 },
      { lat: 25.7709, lng: -80.2139 },
    ],
  },
  {
    id: 'zone-edgewater-biscayne',
    name: 'Edgewater & Biscayne Corridor',
    severity: 'moderate',
    estimatedDepthCm: 28,
    advisory:
      'Localized king-tide street ponding east of Biscayne Blvd between NE 18th & NE 29th St.',
    fillColor: '#ea580c',
    strokeColor: '#9a3412',
    paths: [
      { lat: 25.8024, lng: -80.1906 },
      { lat: 25.8026, lng: -80.1842 },
      { lat: 25.7918, lng: -80.1846 },
      { lat: 25.7915, lng: -80.1909 },
    ],
  },
];

// Initial civic flood/storm telemetry seed points across Greater Downtown Miami
export const SEED_INCIDENTS: IncidentPoint[] = [
  { id: 'inc-01', lat: 25.7689, lng: -80.1895, weight: 9, hazardType: 'Storm Surge', reportedAt: '2026-11-19T12:10:00Z' },
  { id: 'inc-02', lat: 25.7671, lng: -80.1912, weight: 8, hazardType: 'Street Flooding', reportedAt: '2026-11-19T12:14:00Z' },
  { id: 'inc-03', lat: 25.7654, lng: -80.1878, weight: 10, hazardType: 'Storm Surge', reportedAt: '2026-11-19T12:18:00Z' },
  { id: 'inc-04', lat: 25.7705, lng: -80.1881, weight: 7, hazardType: 'Storm Drain Overflow', reportedAt: '2026-11-19T12:20:00Z' },
  { id: 'inc-05', lat: 25.7642, lng: -80.1921, weight: 8, hazardType: 'Street Flooding', reportedAt: '2026-11-19T12:22:00Z' },
  { id: 'inc-06', lat: 25.7718, lng: -80.1904, weight: 6, hazardType: 'Storm Drain Overflow', reportedAt: '2026-11-19T12:25:00Z' },
  { id: 'inc-07', lat: 25.7662, lng: -80.1864, weight: 9, hazardType: 'Storm Surge', reportedAt: '2026-11-19T12:29:00Z' },
  { id: 'inc-08', lat: 25.7751, lng: -80.2035, weight: 8, hazardType: 'Street Flooding', reportedAt: '2026-11-19T12:32:00Z' },
  { id: 'inc-09', lat: 25.7768, lng: -80.2062, weight: 7, hazardType: 'Road Obstruction', reportedAt: '2026-11-19T12:35:00Z' },
  { id: 'inc-10', lat: 25.7739, lng: -80.2089, weight: 9, hazardType: 'Street Flooding', reportedAt: '2026-11-19T12:38:00Z' },
  { id: 'inc-11', lat: 25.7782, lng: -80.2018, weight: 6, hazardType: 'Storm Drain Overflow', reportedAt: '2026-11-19T12:41:00Z' },
  { id: 'inc-12', lat: 25.7726, lng: -80.2041, weight: 8, hazardType: 'Street Flooding', reportedAt: '2026-11-19T12:44:00Z' },
  { id: 'inc-13', lat: 25.7795, lng: -80.2104, weight: 7, hazardType: 'Downed Power Line', reportedAt: '2026-11-19T12:47:00Z' },
  { id: 'inc-14', lat: 25.7747, lng: -80.2121, weight: 8, hazardType: 'Street Flooding', reportedAt: '2026-11-19T12:50:00Z' },
  { id: 'inc-15', lat: 25.7955, lng: -80.1872, weight: 7, hazardType: 'Storm Surge', reportedAt: '2026-11-19T12:53:00Z' },
  { id: 'inc-16', lat: 25.7981, lng: -80.1865, weight: 6, hazardType: 'Street Flooding', reportedAt: '2026-11-19T12:56:00Z' },
  { id: 'inc-17', lat: 25.7934, lng: -80.1887, weight: 5, hazardType: 'Storm Drain Overflow', reportedAt: '2026-11-19T12:59:00Z' },
  { id: 'inc-18', lat: 25.8002, lng: -80.1879, weight: 7, hazardType: 'Street Flooding', reportedAt: '2026-11-19T13:02:00Z' },
  { id: 'inc-19', lat: 25.7775, lng: -80.1915, weight: 6, hazardType: 'Storm Drain Overflow', reportedAt: '2026-11-19T13:05:00Z' },
  { id: 'inc-20', lat: 25.7798, lng: -80.1892, weight: 5, hazardType: 'Road Obstruction', reportedAt: '2026-11-19T13:08:00Z' },
  { id: 'inc-21', lat: 25.7834, lng: -80.1948, weight: 6, hazardType: 'Street Flooding', reportedAt: '2026-11-19T13:11:00Z' },
  { id: 'inc-22', lat: 25.7859, lng: -80.1912, weight: 5, hazardType: 'Storm Drain Overflow', reportedAt: '2026-11-19T13:14:00Z' },
  { id: 'inc-23', lat: 25.7885, lng: -80.1965, weight: 7, hazardType: 'Downed Power Line', reportedAt: '2026-11-19T13:17:00Z' },
  { id: 'inc-24', lat: 25.7908, lng: -80.1991, weight: 5, hazardType: 'Road Obstruction', reportedAt: '2026-11-19T13:20:00Z' },
  { id: 'inc-25', lat: 25.7611, lng: -80.1956, weight: 7, hazardType: 'Street Flooding', reportedAt: '2026-11-19T13:23:00Z' },
  { id: 'inc-26', lat: 25.7589, lng: -80.1984, weight: 6, hazardType: 'Storm Drain Overflow', reportedAt: '2026-11-19T13:26:00Z' },
  { id: 'inc-27', lat: 25.7564, lng: -80.2015, weight: 5, hazardType: 'Street Flooding', reportedAt: '2026-11-19T13:29:00Z' },
  { id: 'inc-28', lat: 25.7685, lng: -80.1962, weight: 6, hazardType: 'Road Obstruction', reportedAt: '2026-11-19T13:32:00Z' },
  { id: 'inc-29', lat: 25.7699, lng: -80.1988, weight: 7, hazardType: 'Street Flooding', reportedAt: '2026-11-19T13:35:00Z' },
  { id: 'inc-30', lat: 25.7634, lng: -80.2022, weight: 5, hazardType: 'Storm Drain Overflow', reportedAt: '2026-11-19T13:38:00Z' },
  { id: 'inc-31', lat: 25.7821, lng: -80.2075, weight: 6, hazardType: 'Street Flooding', reportedAt: '2026-11-19T13:41:00Z' },
  { id: 'inc-32', lat: 25.7867, lng: -80.2043, weight: 4, hazardType: 'Road Obstruction', reportedAt: '2026-11-19T13:44:00Z' },
  { id: 'inc-33', lat: 25.7668, lng: -80.1899, weight: 9, hazardType: 'Storm Surge', reportedAt: '2026-11-19T13:47:00Z' },
  { id: 'inc-34', lat: 25.7679, lng: -80.1875, weight: 8, hazardType: 'Street Flooding', reportedAt: '2026-11-19T13:50:00Z' },
  { id: 'inc-35', lat: 25.7761, lng: -80.2051, weight: 8, hazardType: 'Street Flooding', reportedAt: '2026-11-19T13:53:00Z' },
  { id: 'inc-36', lat: 25.7744, lng: -80.2014, weight: 7, hazardType: 'Storm Drain Overflow', reportedAt: '2026-11-19T13:56:00Z' },
];
