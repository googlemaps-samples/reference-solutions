from __future__ import annotations

import math
from typing import TypedDict


class LatLngDict(TypedDict):
    lat: float
    lng: float


class PropertyListing(TypedDict):
    id: str
    title: str
    address: str
    neighborhood: str
    city: str
    state: str
    zipCode: str
    price: int
    beds: int
    baths: float
    sqft: int
    lotSqft: int
    propertyType: str
    yearBuilt: int
    apn: str
    zoning: str
    lat: float
    lng: float
    streetViewHeading: int
    highlights: list[str]
    parcelPolygon: list[LatLngDict]


def _build_parcel_polygon(
    lat: float,
    lng: float,
    width_meters: float,
    depth_meters: float,
    angle_deg: float = 0.0,
) -> list[LatLngDict]:
    """Generate a closed rectangular cadastral lot polygon around (lat, lng)."""
    half_w = width_meters / 2.0
    half_d = depth_meters / 2.0
    theta = math.radians(angle_deg)
    cos_t = math.cos(theta)
    sin_t = math.sin(theta)

    meters_per_deg_lat = 111_320.0
    meters_per_deg_lng = 111_320.0 * math.cos(math.radians(lat))

    corners = [
        (-half_w, -half_d),
        (half_w, -half_d),
        (half_w, half_d),
        (-half_w, half_d),
    ]
    ring: list[LatLngDict] = []
    for x, y in corners:
        rx = x * cos_t - y * sin_t
        ry = x * sin_t + y * cos_t
        ring.append(
            {
                "lat": round(lat + (ry / meters_per_deg_lat), 6),
                "lng": round(lng + (rx / meters_per_deg_lng), 6),
            }
        )
    return ring


SF_PROPERTIES: list[PropertyListing] = [
    {
        "id": "sf-pac-heights-01",
        "title": "Sunlit Edwardian Residence",
        "address": "2415 Broadway, San Francisco, CA 94115",
        "neighborhood": "Pacific Heights",
        "city": "San Francisco",
        "state": "CA",
        "zipCode": "94115",
        "price": 3895000,
        "beds": 4,
        "baths": 3.5,
        "sqft": 3420,
        "lotSqft": 4125,
        "propertyType": "Single Family",
        "yearBuilt": 1912,
        "apn": "0563-021",
        "zoning": "RH-1(D)",
        "lat": 37.7939,
        "lng": -122.4375,
        "streetViewHeading": 12,
        "highlights": ["Bay-view roof deck", "Chef's kitchen", "Two-car garage"],
        "parcelPolygon": _build_parcel_polygon(37.7939, -122.4375, 16.0, 28.0, -8.0),
    },
    {
        "id": "sf-noe-valley-02",
        "title": "Renovated Noe Valley Victorian",
        "address": "4128 24th St, San Francisco, CA 94114",
        "neighborhood": "Noe Valley",
        "city": "San Francisco",
        "state": "CA",
        "zipCode": "94114",
        "price": 2495000,
        "beds": 3,
        "baths": 2.5,
        "sqft": 2380,
        "lotSqft": 2850,
        "propertyType": "Victorian",
        "yearBuilt": 1904,
        "apn": "6504-014",
        "zoning": "RH-2",
        "lat": 37.7514,
        "lng": -122.4347,
        "streetViewHeading": 175,
        "highlights": ["South-facing garden", "Period millwork", "Solar ready roof"],
        "parcelPolygon": _build_parcel_polygon(37.7514, -122.4347, 10.5, 29.0, 2.0),
    },
    {
        "id": "sf-mission-03",
        "title": "Architectural Valencia Loft",
        "address": "842 Valencia St, San Francisco, CA 94110",
        "neighborhood": "Mission District",
        "city": "San Francisco",
        "state": "CA",
        "zipCode": "94110",
        "price": 1395000,
        "beds": 2,
        "baths": 2.0,
        "sqft": 1540,
        "lotSqft": 2100,
        "propertyType": "Condo",
        "yearBuilt": 2018,
        "apn": "3596-044",
        "zoning": "NCT",
        "lat": 37.7595,
        "lng": -122.4214,
        "streetViewHeading": 265,
        "highlights": ["Double-height windows", "Private terrace", "Bike storage"],
        "parcelPolygon": _build_parcel_polygon(37.7595, -122.4214, 14.0, 22.0, 0.0),
    },
    {
        "id": "sf-marina-04",
        "title": "Marina Mediterranean Townhome",
        "address": "3240 Pierce St, San Francisco, CA 94123",
        "neighborhood": "Marina",
        "city": "San Francisco",
        "state": "CA",
        "zipCode": "94123",
        "price": 2890000,
        "beds": 3,
        "baths": 3.0,
        "sqft": 2610,
        "lotSqft": 2750,
        "propertyType": "Townhouse",
        "yearBuilt": 1928,
        "apn": "0448-017",
        "zoning": "RH-2",
        "lat": 37.8002,
        "lng": -122.4398,
        "streetViewHeading": 88,
        "highlights": ["Palace of Fine Arts proximity", "Radiant floor heat", "Wine cellar"],
        "parcelPolygon": _build_parcel_polygon(37.8002, -122.4398, 11.0, 26.5, -5.0),
    },
    {
        "id": "sf-soma-05",
        "title": "South Park Glass Residence",
        "address": "165 South Park, San Francisco, CA 94107",
        "neighborhood": "SoMa",
        "city": "San Francisco",
        "state": "CA",
        "zipCode": "94107",
        "price": 1190000,
        "beds": 2,
        "baths": 2.0,
        "sqft": 1365,
        "lotSqft": 1800,
        "propertyType": "Condo",
        "yearBuilt": 2016,
        "apn": "3775-089",
        "zoning": "MUO",
        "lat": 37.7817,
        "lng": -122.3939,
        "streetViewHeading": 310,
        "highlights": ["Overlooks South Park", "EV charging stall", "Concierge lobby"],
        "parcelPolygon": _build_parcel_polygon(37.7817, -122.3939, 15.0, 18.0, 42.0),
    },
    {
        "id": "sf-hayes-06",
        "title": "Hayes Valley Modern Flats",
        "address": "412 Octavia St, San Francisco, CA 94102",
        "neighborhood": "Hayes Valley",
        "city": "San Francisco",
        "state": "CA",
        "zipCode": "94102",
        "price": 1525000,
        "beds": 2,
        "baths": 2.0,
        "sqft": 1620,
        "lotSqft": 2400,
        "propertyType": "Condo",
        "yearBuilt": 2020,
        "apn": "0819-033",
        "zoning": "NCT-3",
        "lat": 37.7764,
        "lng": -122.4243,
        "streetViewHeading": 95,
        "highlights": ["Courtyard patio", "White oak floors", "Walkable transit hub"],
        "parcelPolygon": _build_parcel_polygon(37.7764, -122.4243, 13.0, 21.0, 3.0),
    },
    {
        "id": "sf-potrero-07",
        "title": "Potrero Hill View Home",
        "address": "648 Connecticut St, San Francisco, CA 94107",
        "neighborhood": "Potrero Hill",
        "city": "San Francisco",
        "state": "CA",
        "zipCode": "94107",
        "price": 2195000,
        "beds": 3,
        "baths": 2.5,
        "sqft": 2180,
        "lotSqft": 2500,
        "propertyType": "Single Family",
        "yearBuilt": 1998,
        "apn": "4098-011",
        "zoning": "RH-2",
        "lat": 37.7586,
        "lng": -122.3976,
        "streetViewHeading": 280,
        "highlights": ["Downtown skyline views", "Sunny microclimate", "Atrium staircase"],
        "parcelPolygon": _build_parcel_polygon(37.7586, -122.3976, 10.0, 25.0, 0.0),
    },
    {
        "id": "sf-russian-hill-08",
        "title": "Russian Hill Classic Townhouse",
        "address": "1142 Green St, San Francisco, CA 94109",
        "neighborhood": "Russian Hill",
        "city": "San Francisco",
        "state": "CA",
        "zipCode": "94109",
        "price": 3250000,
        "beds": 4,
        "baths": 3.0,
        "sqft": 2890,
        "lotSqft": 3100,
        "propertyType": "Townhouse",
        "yearBuilt": 1924,
        "apn": "0124-028",
        "zoning": "RH-3",
        "lat": 37.7981,
        "lng": -122.4177,
        "streetViewHeading": 185,
        "highlights": ["Cable car corridor", "Garden conservatory", "Bay bridge views"],
        "parcelPolygon": _build_parcel_polygon(37.7981, -122.4177, 12.0, 27.0, -6.0),
    },
    {
        "id": "sf-bernal-09",
        "title": "Bernal Heights Craftsman Cottage",
        "address": "318 Cortland Ave, San Francisco, CA 94110",
        "neighborhood": "Bernal Heights",
        "city": "San Francisco",
        "state": "CA",
        "zipCode": "94110",
        "price": 1680000,
        "beds": 3,
        "baths": 2.0,
        "sqft": 1820,
        "lotSqft": 2625,
        "propertyType": "Single Family",
        "yearBuilt": 1916,
        "apn": "5652-007",
        "zoning": "RH-1",
        "lat": 37.7392,
        "lng": -122.4178,
        "streetViewHeading": 10,
        "highlights": ["Hilltop park trails", "Detached studio", "Wrap-around porch"],
        "parcelPolygon": _build_parcel_polygon(37.7392, -122.4178, 11.5, 24.0, 12.0),
    },
    {
        "id": "sf-haight-10",
        "title": "Alamo Square Painted Lady",
        "address": "742 Steiner St, San Francisco, CA 94117",
        "neighborhood": "Alamo Square",
        "city": "San Francisco",
        "state": "CA",
        "zipCode": "94117",
        "price": 2740000,
        "beds": 4,
        "baths": 3.0,
        "sqft": 2760,
        "lotSqft": 3020,
        "propertyType": "Victorian",
        "yearBuilt": 1896,
        "apn": "0775-019",
        "zoning": "RH-3",
        "lat": 37.7767,
        "lng": -122.4328,
        "streetViewHeading": 82,
        "highlights": ["Park-facing bay windows", "Restored facade", "Guest suite"],
        "parcelPolygon": _build_parcel_polygon(37.7767, -122.4328, 10.5, 29.0, 4.0),
    },
    {
        "id": "sf-sunset-11",
        "title": "Inner Sunset Garden Home",
        "address": "1358 9th Ave, San Francisco, CA 94122",
        "neighborhood": "Inner Sunset",
        "city": "San Francisco",
        "state": "CA",
        "zipCode": "94122",
        "price": 1845000,
        "beds": 3,
        "baths": 2.0,
        "sqft": 2040,
        "lotSqft": 3000,
        "propertyType": "Single Family",
        "yearBuilt": 1937,
        "apn": "1764-031",
        "zoning": "RH-1",
        "lat": 37.7631,
        "lng": -122.4662,
        "streetViewHeading": 272,
        "highlights": ["Golden Gate Park access", "Sunroom deck", "Deep backyard lot"],
        "parcelPolygon": _build_parcel_polygon(37.7631, -122.4662, 10.0, 31.0, 2.0),
    },
    {
        "id": "sf-richmond-12",
        "title": "Inner Richmond Residence",
        "address": "462 11th Ave, San Francisco, CA 94118",
        "neighborhood": "Inner Richmond",
        "city": "San Francisco",
        "state": "CA",
        "zipCode": "94118",
        "price": 945000,
        "beds": 1,
        "baths": 1.5,
        "sqft": 1080,
        "lotSqft": 2250,
        "propertyType": "Condo",
        "yearBuilt": 2012,
        "apn": "1534-052",
        "zoning": "RM-1",
        "lat": 37.7798,
        "lng": -122.4694,
        "streetViewHeading": 90,
        "highlights": ["Presidio greenbelt nearby", "Private patio", "In-unit laundry"],
        "parcelPolygon": _build_parcel_polygon(37.7798, -122.4694, 12.0, 20.0, 0.0),
    },
]
