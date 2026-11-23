import type { LatLngPoint, PropertyListing } from '../types';

/**
 * Generates a realistic rotated rectangular cadastral parcel polygon around a center coordinate.
 * Uses approximate San Francisco latitude scaling (~111,000m/deg lat, ~87,800m/deg lng).
 */
function buildParcelPolygon(
  centerLat: number,
  centerLng: number,
  widthMeters: number,
  depthMeters: number,
  angleDeg = 8
): LatLngPoint[] {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const hw = widthMeters / 2;
  const hd = depthMeters / 2;

  const corners: Array<[number, number]> = [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ];

  const metersPerDegLat = 111000;
  const metersPerDegLng = 87800;

  return corners.map(([x, y]) => {
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;
    return {
      lat: Number((centerLat + ry / metersPerDegLat).toFixed(6)),
      lng: Number((centerLng + rx / metersPerDegLng).toFixed(6)),
    };
  });
}

export const SF_DEFAULT_CENTER: LatLngPoint = {
  lat: 37.7749,
  lng: -122.4194,
};

export const SF_DEFAULT_ZOOM = 13;

export const SAN_FRANCISCO_PROPERTIES: PropertyListing[] = [
  {
    id: 'sf-pac-heights-01',
    title: 'Edwardian View Residence',
    address: '2640 Broadway, San Francisco, CA 94115',
    neighborhood: 'Pacific Heights',
    city: 'San Francisco',
    state: 'CA',
    zip: '94115',
    price: 3950000,
    beds: 4,
    baths: 3.5,
    sqft: 3420,
    lotSizeSqFt: 3850,
    propertyType: 'Single Family',
    yearBuilt: 1914,
    apn: '0568-019',
    zoning: 'RH-1',
    daysOnMarket: 9,
    summary:
      'Restored Edwardian façade with south-facing garden terrace, skylit chef kitchen, and Golden Gate glimpse from the upper level.',
    accentGradient: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)',
    lat: 37.7931,
    lng: -122.4407,
    parcelPolygon: buildParcelPolygon(37.7931, -122.4407, 16, 42, -9),
  },
  {
    id: 'sf-noe-valley-02',
    title: 'Modernized Victorian on Sanchez',
    address: '412 Sanchez St, San Francisco, CA 94114',
    neighborhood: 'Noe Valley',
    city: 'San Francisco',
    state: 'CA',
    zip: '94114',
    price: 2695000,
    beds: 4,
    baths: 3,
    sqft: 2580,
    lotSizeSqFt: 2850,
    propertyType: 'Single Family',
    yearBuilt: 1906,
    apn: '3581-044',
    zoning: 'RH-2',
    daysOnMarket: 5,
    summary:
      'Sunny Noe Valley Victorian with open-plan cedar deck, radiant hydronic floors, and detached garden studio.',
    accentGradient: 'linear-gradient(135deg, #065f46 0%, #0ea5e9 100%)',
    lat: 37.7568,
    lng: -122.4301,
    parcelPolygon: buildParcelPolygon(37.7568, -122.4301, 14, 34, 4),
  },
  {
    id: 'sf-mission-03',
    title: 'Valencia Corridor Timber Loft',
    address: '980 Valencia St, San Francisco, CA 94110',
    neighborhood: 'Mission District',
    city: 'San Francisco',
    state: 'CA',
    zip: '94110',
    price: 1385000,
    beds: 2,
    baths: 2,
    sqft: 1460,
    lotSizeSqFt: 4200,
    propertyType: 'Condo',
    yearBuilt: 2016,
    apn: '3609-032',
    zoning: 'NCT-3',
    daysOnMarket: 12,
    summary:
      'Corner architectural loft featuring double-height steel casement windows, shared landscaped courtyard, and dedicated EV parking.',
    accentGradient: 'linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)',
    lat: 37.7574,
    lng: -122.4214,
    parcelPolygon: buildParcelPolygon(37.7574, -122.4214, 24, 36, 3),
  },
  {
    id: 'sf-hayes-valley-04',
    title: 'Boutique Linden Alley Townhouse',
    address: '355 Linden St, San Francisco, CA 94102',
    neighborhood: 'Hayes Valley',
    city: 'San Francisco',
    state: 'CA',
    zip: '94102',
    price: 1890000,
    beds: 3,
    baths: 2.5,
    sqft: 1920,
    lotSizeSqFt: 1980,
    propertyType: 'Townhouse',
    yearBuilt: 2018,
    apn: '0818-028',
    zoning: 'NCT-3',
    daysOnMarket: 7,
    summary:
      'Three-story contemporary townhouse steps from Hayes Green with private rooftop lounge and acoustic triple-pane glazing.',
    accentGradient: 'linear-gradient(135deg, #312e81 0%, #2563eb 100%)',
    lat: 37.7763,
    lng: -122.4239,
    parcelPolygon: buildParcelPolygon(37.7763, -122.4239, 13, 28, -8),
  },
  {
    id: 'sf-marina-05',
    title: 'Marina Mediterranean Corner Lot',
    address: '2140 Chestnut St, San Francisco, CA 94123',
    neighborhood: 'Marina District',
    city: 'San Francisco',
    state: 'CA',
    zip: '94123',
    price: 3250000,
    beds: 4,
    baths: 3,
    sqft: 2890,
    lotSizeSqFt: 3300,
    propertyType: 'Single Family',
    yearBuilt: 1929,
    apn: '0486-011',
    zoning: 'RH-2',
    daysOnMarket: 14,
    summary:
      'Classic Marina stucco residence near Crissy Field featuring arched loggia, formal dining room, and two-car tandem garage.',
    accentGradient: 'linear-gradient(135deg, #0f766e 0%, #0284c7 100%)',
    lat: 37.8006,
    lng: -122.4388,
    parcelPolygon: buildParcelPolygon(37.8006, -122.4388, 16, 36, -9),
  },
  {
    id: 'sf-russian-hill-06',
    title: 'Hyde Street Cable Car Condo',
    address: '1750 Hyde St, San Francisco, CA 94109',
    neighborhood: 'Russian Hill',
    city: 'San Francisco',
    state: 'CA',
    zip: '94109',
    price: 1625000,
    beds: 2,
    baths: 2,
    sqft: 1390,
    lotSizeSqFt: 3600,
    propertyType: 'Condo',
    yearBuilt: 1924,
    apn: '0151-009',
    zoning: 'RM-2',
    daysOnMarket: 18,
    summary:
      'Elevated corner cooperative-style condo overlooking North Beach and Coit Tower with original hardwood parquetry.',
    accentGradient: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
    lat: 37.7972,
    lng: -122.4188,
    parcelPolygon: buildParcelPolygon(37.7972, -122.4188, 20, 32, -8),
  },
  {
    id: 'sf-dogpatch-07',
    title: 'Dogpatch Industrial Rowhouse',
    address: '820 Minnesota St, San Francisco, CA 94107',
    neighborhood: 'Dogpatch',
    city: 'San Francisco',
    state: 'CA',
    zip: '94107',
    price: 1740000,
    beds: 3,
    baths: 2.5,
    sqft: 1840,
    lotSizeSqFt: 2150,
    propertyType: 'Townhouse',
    yearBuilt: 2015,
    apn: '4106-021',
    zoning: 'UMU',
    daysOnMarket: 11,
    summary:
      'Bright modern townhome two blocks from Crane Cove Park with exposed steel beams and solar-ready roof deck.',
    accentGradient: 'linear-gradient(135deg, #3f3f46 0%, #0284c7 100%)',
    lat: 37.7595,
    lng: -122.3903,
    parcelPolygon: buildParcelPolygon(37.7595, -122.3903, 14, 30, 1),
  },
  {
    id: 'sf-potrero-08',
    title: 'Potrero Hill Skyline Duplex',
    address: '418 Connecticut St, San Francisco, CA 94107',
    neighborhood: 'Potrero Hill',
    city: 'San Francisco',
    state: 'CA',
    zip: '94107',
    price: 2380000,
    beds: 4,
    baths: 3,
    sqft: 2640,
    lotSizeSqFt: 2500,
    propertyType: 'Multi-Family',
    yearBuilt: 1912,
    apn: '4034-015',
    zoning: 'RH-2',
    daysOnMarket: 16,
    summary:
      'North-slope two-unit Victorian with panoramic downtown skyline vistas, separate garden apartment, and solar microgrid.',
    accentGradient: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
    lat: 37.7618,
    lng: -122.3977,
    parcelPolygon: buildParcelPolygon(37.7618, -122.3977, 15, 32, 0),
  },
  {
    id: 'sf-bernal-09',
    title: 'Bernal Heights Sunlit Cottage',
    address: '215 Cortland Ave, San Francisco, CA 94110',
    neighborhood: 'Bernal Heights',
    city: 'San Francisco',
    state: 'CA',
    zip: '94110',
    price: 1495000,
    beds: 3,
    baths: 2,
    sqft: 1610,
    lotSizeSqFt: 2250,
    propertyType: 'Single Family',
    yearBuilt: 1922,
    apn: '5665-031',
    zoning: 'RH-1',
    daysOnMarket: 6,
    summary:
      'Charming detached home near Cortland village shops with terraced lemon-tree backyard and panoramic hill trail access.',
    accentGradient: 'linear-gradient(135deg, #047857 0%, #10b981 100%)',
    lat: 37.7393,
    lng: -122.4184,
    parcelPolygon: buildParcelPolygon(37.7393, -122.4184, 14, 30, 6),
  },
  {
    id: 'sf-sunset-10',
    title: 'Outer Sunset Coastal Remodel',
    address: '1542 44th Ave, San Francisco, CA 94122',
    neighborhood: 'Outer Sunset',
    city: 'San Francisco',
    state: 'CA',
    zip: '94122',
    price: 1580000,
    beds: 3,
    baths: 2.5,
    sqft: 1950,
    lotSizeSqFt: 3000,
    propertyType: 'Single Family',
    yearBuilt: 1941,
    apn: '1888-024',
    zoning: 'RH-1',
    daysOnMarket: 21,
    summary:
      'Four blocks from Ocean Beach with cedar siding, vaulted skylight living room, and spacious lower-level family suite.',
    accentGradient: 'linear-gradient(135deg, #0369a1 0%, #38bdf8 100%)',
    lat: 37.7576,
    lng: -122.5037,
    parcelPolygon: buildParcelPolygon(37.7576, -122.5037, 15, 36, 2),
  },
  {
    id: 'sf-richmond-11',
    title: 'Inner Richmond Two-Unit Edwardian',
    address: '435 6th Ave, San Francisco, CA 94118',
    neighborhood: 'Inner Richmond',
    city: 'San Francisco',
    state: 'CA',
    zip: '94118',
    price: 2190000,
    beds: 4,
    baths: 3,
    sqft: 2740,
    lotSizeSqFt: 3000,
    propertyType: 'Multi-Family',
    yearBuilt: 1916,
    apn: '1539-012',
    zoning: 'RH-2',
    daysOnMarket: 10,
    summary:
      'Dual-flat Edwardian building near Clement Street markets and Golden Gate Park with generous period moldings and deep yard.',
    accentGradient: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
    lat: 37.7804,
    lng: -122.4642,
    parcelPolygon: buildParcelPolygon(37.7804, -122.4642, 15, 36, 2),
  },
  {
    id: 'sf-north-beach-12',
    title: 'Telegraph Hill Garden Flat',
    address: '1325 Grant Ave, San Francisco, CA 94133',
    neighborhood: 'North Beach',
    city: 'San Francisco',
    state: 'CA',
    zip: '94133',
    price: 1125000,
    beds: 1,
    baths: 1,
    sqft: 980,
    lotSizeSqFt: 2600,
    propertyType: 'Condo',
    yearBuilt: 1911,
    apn: '0117-018',
    zoning: 'NCD',
    daysOnMarket: 15,
    summary:
      'Light-filled full-floor flat in historic North Beach featuring brick fireplace, private bay window nook, and shared patio.',
    accentGradient: 'linear-gradient(135deg, #9a3412 0%, #f59e0b 100%)',
    lat: 37.7993,
    lng: -122.4071,
    parcelPolygon: buildParcelPolygon(37.7993, -122.4071, 16, 29, -8),
  },
];

export const WORKPLACE_PRESETS = [
  {
    label: 'Salesforce Tower',
    address: '415 Mission St, San Francisco, CA 94105',
  },
  {
    label: 'Ferry Building',
    address: '1 Ferry Building, San Francisco, CA 94105',
  },
  {
    label: 'UCSF Mission Bay',
    address: '1675 Owens St, San Francisco, CA 94158',
  },
  {
    label: 'Civic Center',
    address: '1 Dr Carlton B Goodlett Pl, San Francisco, CA 94102',
  },
];

export function formatCurrencyFull(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatPricePill(price: number): string {
  if (price >= 1_000_000) {
    const millions = price / 1_000_000;
    return `$${millions.toFixed(millions % 1 === 0 ? 1 : 2).replace(/0$/, '')}M`;
  }
  return `$${Math.round(price / 1_000)}K`;
}

export function formatDistance(meters: number): string {
  const miles = meters / 1609.344;
  if (miles < 0.2) {
    return `${Math.round(meters)} m`;
  }
  return `${miles.toFixed(1)} mi (${(meters / 1000).toFixed(1)} km)`;
}

export function formatDurationMillis(millis: number | null | undefined): string {
  if (millis == null || !Number.isFinite(millis)) return 'Unavailable';
  const totalMinutes = Math.max(1, Math.round(millis / 60000));
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
}
