import type { FleetVehicle, LatLngPoint, LogisticsHub } from './types';

export const DALLAS_CENTER: LatLngPoint = {
  lat: 32.7767,
  lng: -96.797,
};

export const DALLAS_INITIAL_ZOOM = 12;

export const SEED_PLACES_QUERY = 'distribution center logistics hub Dallas TX';

/**
 * Operational central fleet yard coordinate in Dallas used only as a fallback
 * origin before live Places API (New) logistics hubs are loaded.
 */
export const FALLBACK_DEPOT_HUB: LogisticsHub = {
  id: 'dallas-fleet-yard',
  name: 'Dallas Central Fleet Yard',
  address: 'Dallas Core Dispatch Sector, Dallas, TX',
  location: { lat: 32.7767, lng: -96.797 },
  role: 'depot',
  source: 'fleet_yard',
};

/**
 * Active Dallas fleet units with telemetry and noisy raw GPS breadcrumbs (< 300m spacing)
 * along major Dallas freight corridors (I-35E Stemmons, I-30, US-75, Loop 12).
 */
export const INITIAL_FLEET_VEHICLES: FleetVehicle[] = [
  {
    id: 'DAL-104',
    callsign: 'Unit 104 · Stemmons Express',
    unitType: 'Box Truck 26ft',
    status: 'En Route',
    speedMph: 54,
    headingDeg: 325,
    position: { lat: 32.8118, lng: -96.8432 },
    corridorName: 'I-35E Stemmons Fwy Corridor',
    nextStopLabel: 'Assigning live Dallas hub...',
    etaMinutes: 14,
    cargoLoadPct: 82,
    rawGpsTrace: [
      { lat: 32.7851, lng: -96.8099 },
      { lat: 32.7876, lng: -96.8124 },
      { lat: 32.7902, lng: -96.8161 },
      { lat: 32.7924, lng: -96.8185 },
      { lat: 32.7953, lng: -96.8226 },
      { lat: 32.7975, lng: -96.8251 },
      { lat: 32.8004, lng: -96.8292 },
      { lat: 32.8027, lng: -96.8318 },
      { lat: 32.8058, lng: -96.8359 },
      { lat: 32.8082, lng: -96.8384 },
      { lat: 32.8109, lng: -96.8425 },
      { lat: 32.8123, lng: -96.8441 },
    ],
  },
  {
    id: 'DAL-209',
    callsign: 'Unit 209 · East Corridor Freight',
    unitType: 'Semi Tractor',
    status: 'Delayed',
    speedMph: 18,
    headingDeg: 82,
    position: { lat: 32.7896, lng: -96.7405 },
    corridorName: 'I-30 R.L. Thornton Fwy East',
    nextStopLabel: 'Assigning live Dallas hub...',
    etaMinutes: 27,
    cargoLoadPct: 94,
    rawGpsTrace: [
      { lat: 32.7795, lng: -96.7791 },
      { lat: 32.7809, lng: -96.7745 },
      { lat: 32.7814, lng: -96.7701 },
      { lat: 32.7829, lng: -96.7652 },
      { lat: 32.7834, lng: -96.7606 },
      { lat: 32.7851, lng: -96.7559 },
      { lat: 32.7862, lng: -96.7512 },
      { lat: 32.7879, lng: -96.7465 },
      { lat: 32.7889, lng: -96.7422 },
      { lat: 32.7902, lng: -96.7389 },
    ],
  },
  {
    id: 'DAL-312',
    callsign: 'Unit 312 · Uptown Shuttle',
    unitType: 'Shuttle Van',
    status: 'En Route',
    speedMph: 41,
    headingDeg: 18,
    position: { lat: 32.8336, lng: -96.7769 },
    corridorName: 'US-75 Central Expy North',
    nextStopLabel: 'Assigning live Dallas hub...',
    etaMinutes: 11,
    cargoLoadPct: 65,
    rawGpsTrace: [
      { lat: 32.8012, lng: -96.7918 },
      { lat: 32.8054, lng: -96.7892 },
      { lat: 32.8091, lng: -96.7881 },
      { lat: 32.8132, lng: -96.7859 },
      { lat: 32.8174, lng: -96.7848 },
      { lat: 32.8215, lng: -96.7823 },
      { lat: 32.8256, lng: -96.7811 },
      { lat: 32.8295, lng: -96.7785 },
      { lat: 32.8336, lng: -96.7769 },
    ],
  },
  {
    id: 'DAL-418',
    callsign: 'Unit 418 · West Trinity Sprinter',
    unitType: 'Freight Sprinter',
    status: 'Delayed',
    speedMph: 14,
    headingDeg: 265,
    position: { lat: 32.7686, lng: -96.8475 },
    corridorName: 'I-30 West Tom Landry Fwy',
    nextStopLabel: 'Assigning live Dallas hub...',
    etaMinutes: 31,
    cargoLoadPct: 76,
    rawGpsTrace: [
      { lat: 32.7712, lng: -96.8194 },
      { lat: 32.7701, lng: -96.8238 },
      { lat: 32.7711, lng: -96.8279 },
      { lat: 32.7695, lng: -96.8322 },
      { lat: 32.7703, lng: -96.8364 },
      { lat: 32.7689, lng: -96.8406 },
      { lat: 32.7696, lng: -96.8442 },
      { lat: 32.7686, lng: -96.8475 },
    ],
  },
  {
    id: 'DAL-527',
    callsign: 'Unit 527 · South Yard Standby',
    unitType: 'Box Truck 26ft',
    status: 'Idle',
    speedMph: 0,
    headingDeg: 0,
    position: { lat: 32.7429, lng: -96.8084 },
    corridorName: 'I-35E South Staging Bay',
    nextStopLabel: 'Staging at South Dispatch Bay',
    etaMinutes: null,
    cargoLoadPct: 40,
    rawGpsTrace: [
      { lat: 32.7538, lng: -96.8109 },
      { lat: 32.7512, lng: -96.8096 },
      { lat: 32.7484, lng: -96.8101 },
      { lat: 32.7457, lng: -96.8088 },
      { lat: 32.7429, lng: -96.8084 },
    ],
  },
];

export function haversineMeters(a: LatLngPoint, b: LatLngPoint): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function parseDurationSeconds(duration?: string): number {
  if (!duration) return 0;
  const match = /^([0-9]+(?:\.[0-9]+)?)s$/.exec(duration.trim());
  if (!match) return 0;
  return Math.round(Number(match[1]));
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 min';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs} hr ${remMins} min` : `${hrs} hr`;
}

export function formatDistanceMiles(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return '0.0 mi';
  const miles = meters / 1609.344;
  return `${miles.toFixed(1)} mi`;
}
