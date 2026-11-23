export type PropertyType = 'Single Family' | 'Condo' | 'Townhouse' | 'Multi-Family';

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface PropertyListing {
  id: string;
  title: string;
  address: string;
  neighborhood: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  lotSqft: number;
  yearBuilt: number;
  propertyType: PropertyType;
  apn: string;
  zoning: string;
  hoaMonthly: number | null;
  lat: number;
  lng: number;
  streetViewHeading: number;
  badge: string;
  description: string;
  parcelPolygon: LatLngPoint[];
}

function buildParcelPolygon(
  centerLat: number,
  centerLng: number,
  widthMeters: number,
  depthMeters: number,
  rotationDeg = 0
): LatLngPoint[] {
  const halfW = widthMeters / 2;
  const halfD = depthMeters / 2;
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((centerLat * Math.PI) / 180);

  const corners: Array<[number, number]> = [
    [-halfW, -halfD],
    [halfW, -halfD],
    [halfW, halfD],
    [-halfW, halfD],
  ];

  return corners.map(([x, y]) => {
    const rx = x * cos - y * sin;
    const ry = x * sin + y * cos;
    return {
      lat: Number((centerLat + ry / metersPerDegLat).toFixed(6)),
      lng: Number((centerLng + rx / metersPerDegLng).toFixed(6)),
    };
  });
}

export const SF_LISTINGS: PropertyListing[] = [
  {
    id: 'sf-01',
    title: 'Pacific Heights Edwardian View Residence',
    address: '2640 Broadway, San Francisco, CA 94115',
    neighborhood: 'Pacific Heights',
    price: 4650000,
    beds: 5,
    baths: 4.5,
    sqft: 3980,
    lotSqft: 4125,
    yearBuilt: 1914,
    propertyType: 'Single Family',
    apn: '0573-012',
    zoning: 'RH-1 (One-Family Residential)',
    hoaMonthly: null,
    lat: 37.7933,
    lng: -122.4408,
    streetViewHeading: 185,
    badge: 'Golden Gate Views',
    description:
      'Classic four-level Edwardian featuring formal parlor rooms, chef kitchen opening to a terraced south garden, and panoramic Golden Gate vistas from the penthouse level.',
    parcelPolygon: buildParcelPolygon(37.7933, -122.4408, 13, 30, -8),
  },
  {
    id: 'sf-02',
    title: 'Marina Mediterranean Corner Home',
    address: '3310 Scott St, San Francisco, CA 94123',
    neighborhood: 'Marina',
    price: 3495000,
    beds: 4,
    baths: 3.5,
    sqft: 2890,
    lotSqft: 3125,
    yearBuilt: 1928,
    propertyType: 'Single Family',
    apn: '0466-019',
    zoning: 'RH-2 (Two-Family Residential)',
    hoaMonthly: null,
    lat: 37.8004,
    lng: -122.4414,
    streetViewHeading: 265,
    badge: 'Open Sun 1–4pm',
    description:
      'Sun-drenched corner Marina residence steps from Crissy Field and Chestnut Street boutiques, complete with arched windows, hardwood floors, and two-car garage.',
    parcelPolygon: buildParcelPolygon(37.8004, -122.4414, 11, 27, -8),
  },
  {
    id: 'sf-03',
    title: 'Noe Valley Renovated Victorian',
    address: '4128 24th St, San Francisco, CA 94114',
    neighborhood: 'Noe Valley',
    price: 2795000,
    beds: 4,
    baths: 3,
    sqft: 2540,
    lotSqft: 2850,
    yearBuilt: 1906,
    propertyType: 'Single Family',
    apn: '3650-027',
    zoning: 'RH-2 (Two-Family Residential)',
    hoaMonthly: null,
    lat: 37.7513,
    lng: -122.4342,
    streetViewHeading: 175,
    badge: 'New Listing',
    description:
      'Thoughtfully modernized 1906 Victorian featuring a glass-walled great room, radiant heated floors, landscaped patio deck, and detached studio office.',
    parcelPolygon: buildParcelPolygon(37.7513, -122.4342, 10, 26, 2),
  },
  {
    id: 'sf-04',
    title: 'Mission Dolores Park Townhome',
    address: '542 Dolores St, San Francisco, CA 94110',
    neighborhood: 'Mission District',
    price: 2150000,
    beds: 3,
    baths: 2.5,
    sqft: 1980,
    lotSqft: 1920,
    yearBuilt: 1912,
    propertyType: 'Townhouse',
    apn: '3587-014',
    zoning: 'RH-3 (Three-Family Residential)',
    hoaMonthly: 320,
    lat: 37.7606,
    lng: -122.4262,
    streetViewHeading: 90,
    badge: 'Parkside',
    description:
      'Directly facing palm-lined Dolores Park with double-height living area, custom walnut millwork, private roof deck, and dedicated EV-ready parking.',
    parcelPolygon: buildParcelPolygon(37.7606, -122.4262, 9, 21, 0),
  },
  {
    id: 'sf-05',
    title: 'Hayes Valley Architectural Loft',
    address: '450 Gough St, San Francisco, CA 94102',
    neighborhood: 'Hayes Valley',
    price: 1385000,
    beds: 2,
    baths: 2,
    sqft: 1420,
    lotSqft: 5800,
    yearBuilt: 2018,
    propertyType: 'Condo',
    apn: '0818-044',
    zoning: 'NCT-3 (Moderate-Scale Transit)',
    hoaMonthly: 695,
    lat: 37.7772,
    lng: -122.4231,
    streetViewHeading: 270,
    badge: 'Architectural',
    description:
      'Boutique concrete-and-timber condo above Hayes Valley dining corridor featuring floor-to-ceiling acoustic glazing, Bosch kitchen, and shared courtyard.',
    parcelPolygon: buildParcelPolygon(37.7772, -122.4231, 22, 24, 0),
  },
  {
    id: 'sf-06',
    title: 'Russian Hill Penthouse Condo',
    address: '1080 Chestnut St, San Francisco, CA 94109',
    neighborhood: 'Russian Hill',
    price: 2390000,
    beds: 3,
    baths: 2.5,
    sqft: 2110,
    lotSqft: 4400,
    yearBuilt: 1994,
    propertyType: 'Condo',
    apn: '0499-031',
    zoning: 'RM-2 (Mixed Residential)',
    hoaMonthly: 940,
    lat: 37.8027,
    lng: -122.4209,
    streetViewHeading: 10,
    badge: 'Bay Views',
    description:
      'Top-floor residence with wraparound view terrace looking north across Aquatic Park, Alcatraz, and the Marin Headlands, plus deeded storage and parking.',
    parcelPolygon: buildParcelPolygon(37.8027, -122.4209, 18, 23, -7),
  },
  {
    id: 'sf-07',
    title: 'Dogpatch Timber & Steel Townhouse',
    address: '2290 3rd St, San Francisco, CA 94107',
    neighborhood: 'Dogpatch',
    price: 1625000,
    beds: 3,
    baths: 2.5,
    sqft: 1790,
    lotSqft: 1650,
    yearBuilt: 2020,
    propertyType: 'Townhouse',
    apn: '4106-028',
    zoning: 'UMU (Urban Mixed Use)',
    hoaMonthly: 410,
    lat: 37.7609,
    lng: -122.3886,
    streetViewHeading: 270,
    badge: 'T-Third Corridor',
    description:
      'Industrial-modern three-level townhome near Crane Cove Park and UCSF Mission Bay, offering private patio, solar-ready roof terrace, and flex workspace.',
    parcelPolygon: buildParcelPolygon(37.7609, -122.3886, 9, 19, 0),
  },
  {
    id: 'sf-08',
    title: 'North Beach Telegraph Hill Duplex',
    address: '1422 Kearny St, San Francisco, CA 94133',
    neighborhood: 'North Beach',
    price: 2590000,
    beds: 4,
    baths: 3,
    sqft: 2680,
    lotSqft: 2420,
    yearBuilt: 1923,
    propertyType: 'Multi-Family',
    apn: '0115-018',
    zoning: 'RH-3 (Three-Family Residential)',
    hoaMonthly: null,
    lat: 37.8012,
    lng: -122.4063,
    streetViewHeading: 85,
    badge: '2-Unit Income',
    description:
      'Full-floor owner unit plus garden-level 1BR suite on a quiet Telegraph Hill slope, moments from Washington Square Park and Financial District commute.',
    parcelPolygon: buildParcelPolygon(37.8012, -122.4063, 10, 22, -6),
  },
  {
    id: 'sf-09',
    title: 'Inner Sunset Golden Gate Park Home',
    address: '1345 9th Ave, San Francisco, CA 94122',
    neighborhood: 'Inner Sunset',
    price: 1895000,
    beds: 3,
    baths: 2.5,
    sqft: 2150,
    lotSqft: 3000,
    yearBuilt: 1936,
    propertyType: 'Single Family',
    apn: '1764-009',
    zoning: 'RH-2 (Two-Family Residential)',
    hoaMonthly: null,
    lat: 37.7634,
    lng: -122.4662,
    streetViewHeading: 90,
    badge: 'Near N-Judah',
    description:
      'Warm barrel-front Sunset classic two blocks from Golden Gate Park and Irving Street cafes, featuring skylight kitchen, fireplace, and deep fenced yard.',
    parcelPolygon: buildParcelPolygon(37.7634, -122.4662, 10, 28, 0),
  },
  {
    id: 'sf-10',
    title: 'SoMa Yerba Buena Skyline Condo',
    address: '765 Market St, San Francisco, CA 94103',
    neighborhood: 'SoMa',
    price: 1140000,
    beds: 1,
    baths: 1.5,
    sqft: 1090,
    lotSqft: 7200,
    yearBuilt: 2016,
    propertyType: 'Condo',
    apn: '3706-082',
    zoning: 'C-3-O (Downtown Office)',
    hoaMonthly: 1050,
    lat: 37.7858,
    lng: -122.4044,
    streetViewHeading: 140,
    badge: 'BART Access',
    description:
      'Full-service high-rise residence above Yerba Buena Gardens with 24/7 concierge, fitness studio, and 3-minute walk to Montgomery BART and Salesforce Transit Center.',
    parcelPolygon: buildParcelPolygon(37.7858, -122.4044, 26, 26, -45),
  },
  {
    id: 'sf-11',
    title: 'Bernal Heights Hilltop Cottage',
    address: '382 Cortland Ave, San Francisco, CA 94110',
    neighborhood: 'Bernal Heights',
    price: 1690000,
    beds: 3,
    baths: 2,
    sqft: 1680,
    lotSqft: 2350,
    yearBuilt: 1921,
    propertyType: 'Single Family',
    apn: '5688-033',
    zoning: 'RH-1 (One-Family Residential)',
    hoaMonthly: null,
    lat: 37.7392,
    lng: -122.4167,
    streetViewHeading: 355,
    badge: 'Price Reduced',
    description:
      'Charming south-slope Bernal home steps from Cortland Village shops and Precita Park, featuring vaulted cedar ceilings and sunny garden pergola.',
    parcelPolygon: buildParcelPolygon(37.7392, -122.4167, 9, 24, 5),
  },
  {
    id: 'sf-12',
    title: 'Potrero Hill Twin-Peak View Townhome',
    address: '418 Connecticut St, San Francisco, CA 94107',
    neighborhood: 'Potrero Hill',
    price: 1950000,
    beds: 3,
    baths: 2.5,
    sqft: 2040,
    lotSqft: 2100,
    yearBuilt: 2004,
    propertyType: 'Townhouse',
    apn: '4072-021',
    zoning: 'RH-2 (Two-Family Residential)',
    hoaMonthly: 245,
    lat: 37.7604,
    lng: -122.3974,
    streetViewHeading: 270,
    badge: 'Sunny Microclimate',
    description:
      'Contemporary north-slope Potrero townhome bathed in sun with sweeping Downtown skyline views, two-car tandem garage, and easy Caltrain/101 access.',
    parcelPolygon: buildParcelPolygon(37.7604, -122.3974, 9, 22, 0),
  },
  {
    id: 'sf-13',
    title: 'Castro Classic Multi-Unit Brownstone',
    address: '2145 Market St, San Francisco, CA 94114',
    neighborhood: 'Castro',
    price: 2980000,
    beds: 4,
    baths: 3.5,
    sqft: 3120,
    lotSqft: 2900,
    yearBuilt: 1916,
    propertyType: 'Multi-Family',
    apn: '3543-016',
    zoning: 'NCT-3 (Moderate-Scale Transit)',
    hoaMonthly: null,
    lat: 37.7666,
    lng: -122.4294,
    streetViewHeading: 320,
    badge: '2-Unit Building',
    description:
      'Restored three-story legal two-unit building near Duboce Triangle and Muni Metro, boasting bay windows, period wainscoting, and lush shared courtyard.',
    parcelPolygon: buildParcelPolygon(37.7666, -122.4294, 11, 25, -40),
  },
  {
    id: 'sf-14',
    title: 'Outer Richmond Presidio Park Retreat',
    address: '518 22nd Ave, San Francisco, CA 94121',
    neighborhood: 'Outer Richmond',
    price: 1745000,
    beds: 3,
    baths: 2,
    sqft: 1920,
    lotSqft: 3000,
    yearBuilt: 1929,
    propertyType: 'Single Family',
    apn: '1522-011',
    zoning: 'RH-1 (One-Family Residential)',
    hoaMonthly: null,
    lat: 37.7782,
    lng: -122.4813,
    streetViewHeading: 90,
    badge: 'Presidio Adjacent',
    description:
      'Quiet Richmond District home bordered by Clement Street dining and the Presidio trails, featuring sunroom office, remodeled kitchen, and spacious yard.',
    parcelPolygon: buildParcelPolygon(37.7782, -122.4813, 10, 28, 0),
  },
];
