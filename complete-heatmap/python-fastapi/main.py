"""FastAPI Backend-for-Frontend (BFF) for Miami Disaster Hazard Heatmap & Safe Shelter Router."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import os
from pathlib import Path
from typing import Any, Literal
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import FastAPI, Query, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
import httpx
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

load_dotenv(BASE_DIR / ".env")

ATTRIBUTION_ID = "gmp_git_agentsamples_v1.0.0"
DEFAULT_MAP_ID = "DEMO_MAP_ID"
MIAMI_CENTER = {"lat": 25.7743, "lng": -80.1937}

PLACES_FIELD_MASK = (
    "places.id,places.displayName,places.formattedAddress,places.location,"
    "places.types,places.rating,places.userRatingCount,places.businessStatus"
)
ROUTES_FIELD_MASK = (
    "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,"
    "routes.routeLabels,routes.legs.duration,routes.legs.distanceMeters,"
    "routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters"
)


def get_api_key() -> str:
    """Read GOOGLE_MAPS_API_KEY dynamically from the environment."""
    return os.getenv("GOOGLE_MAPS_API_KEY", "").strip()


# ---------------------------------------------------------------------------
# Seeded Civic Hazard Incidents & Active Miami Flood-Hazard Zone Polygons
# ---------------------------------------------------------------------------

FLOOD_ZONES: list[dict[str, Any]] = [
    {
        "id": "zone-brickell-river",
        "name": "Zone A: Miami River & Brickell Surge Corridor",
        "severity": "SEVERE",
        "advisory": "Standing tidal surge 0.6m-1.1m along Brickell Ave & Miami River bridges. Avoid low-lying crossings.",
        "fillColor": "#dc2626",
        "strokeColor": "#991b1b",
        "fillOpacity": 0.30,
        "paths": [
            {"lat": 25.7712, "lng": -80.1972},
            {"lat": 25.7716, "lng": -80.1862},
            {"lat": 25.7602, "lng": -80.1856},
            {"lat": 25.7598, "lng": -80.1966},
        ],
        "bypassWaypoints": [
            {"lat": 25.7662, "lng": -80.2045},
            {"lat": 25.7755, "lng": -80.2048},
            {"lat": 25.7565, "lng": -80.2035},
        ],
    },
    {
        "id": "zone-edgewater-bay",
        "name": "Zone B: Biscayne Bay & Edgewater Waterfront",
        "severity": "HIGH",
        "advisory": "Coastal storm surge & Biscayne Blvd curb flooding. Detour inland west of NE 2nd Ave.",
        "fillColor": "#ea580c",
        "strokeColor": "#9a3412",
        "fillOpacity": 0.26,
        "paths": [
            {"lat": 25.8035, "lng": -80.1912},
            {"lat": 25.8032, "lng": -80.1835},
            {"lat": 25.7865, "lng": -80.1842},
            {"lat": 25.7868, "lng": -80.1922},
        ],
        "bypassWaypoints": [
            {"lat": 25.7950, "lng": -80.2015},
            {"lat": 25.8075, "lng": -80.1995},
            {"lat": 25.7830, "lng": -80.1995},
        ],
    },
    {
        "id": "zone-civic-basin",
        "name": "Zone C: Miami River Bend & NW 7th St Flash-Flood Basin",
        "severity": "MODERATE",
        "advisory": "Storm drain surcharge near NW 7th St & River Bend. Use elevated I-95 / NW 14th St approaches.",
        "fillColor": "#d97706",
        "strokeColor": "#92400e",
        "fillOpacity": 0.24,
        "paths": [
            {"lat": 25.7835, "lng": -80.2115},
            {"lat": 25.7838, "lng": -80.2015},
            {"lat": 25.7765, "lng": -80.2012},
            {"lat": 25.7762, "lng": -80.2112},
        ],
        "bypassWaypoints": [
            {"lat": 25.7732, "lng": -80.2065},
            {"lat": 25.7868, "lng": -80.2065},
            {"lat": 25.7800, "lng": -80.2165},
        ],
    },
]

SEED_INCIDENTS: list[dict[str, Any]] = [
    # Brickell & Miami River Surge cluster
    {"id": "inc-01", "lat": 25.7685, "lng": -80.1918, "weight": 9, "hazardType": "Storm Surge", "address": "Brickell Ave & SE 5th St, Miami, FL", "reportedAt": "2026-11-19T14:10:00Z"},
    {"id": "inc-02", "lat": 25.7662, "lng": -80.1904, "weight": 10, "hazardType": "Street Flooding", "address": "Brickell Key Dr Approach, Miami, FL", "reportedAt": "2026-11-19T14:12:00Z"},
    {"id": "inc-03", "lat": 25.7640, "lng": -80.1925, "weight": 8, "hazardType": "Street Flooding", "address": "SE 10th St & Brickell Bay Dr, Miami, FL", "reportedAt": "2026-11-19T14:15:00Z"},
    {"id": "inc-04", "lat": 25.7698, "lng": -80.1948, "weight": 7, "hazardType": "Blocked Storm Drain", "address": "Miami Ave Bridge South, Miami, FL", "reportedAt": "2026-11-19T14:18:00Z"},
    {"id": "inc-05", "lat": 25.7621, "lng": -80.1892, "weight": 9, "hazardType": "Storm Surge", "address": "Brickell Bay Dr & SE 13th St, Miami, FL", "reportedAt": "2026-11-19T14:20:00Z"},
    {"id": "inc-06", "lat": 25.7674, "lng": -80.1879, "weight": 8, "hazardType": "Street Flooding", "address": "Brickell Key Blvd, Miami, FL", "reportedAt": "2026-11-19T14:22:00Z"},
    {"id": "inc-07", "lat": 25.7610, "lng": -80.1945, "weight": 6, "hazardType": "Wind Debris", "address": "SW 15th Rd & S Miami Ave, Miami, FL", "reportedAt": "2026-11-19T14:25:00Z"},
    {"id": "inc-08", "lat": 25.7708, "lng": -80.1885, "weight": 8, "hazardType": "Storm Surge", "address": "SE 2nd St & Biscayne Blvd Way, Miami, FL", "reportedAt": "2026-11-19T14:26:00Z"},
    # Downtown & Bayfront Park corridor
    {"id": "inc-09", "lat": 25.7748, "lng": -80.1875, "weight": 7, "hazardType": "Street Flooding", "address": "Biscayne Blvd & E Flagler St, Miami, FL", "reportedAt": "2026-11-19T14:28:00Z"},
    {"id": "inc-10", "lat": 25.7774, "lng": -80.1882, "weight": 6, "hazardType": "Wind Debris", "address": "NE 3rd St & Biscayne Blvd, Miami, FL", "reportedAt": "2026-11-19T14:30:00Z"},
    {"id": "inc-11", "lat": 25.7735, "lng": -80.1955, "weight": 5, "hazardType": "Blocked Storm Drain", "address": "W Flagler St & NW 1st Ave, Miami, FL", "reportedAt": "2026-11-19T14:31:00Z"},
    {"id": "inc-12", "lat": 25.7798, "lng": -80.1890, "weight": 7, "hazardType": "Street Flooding", "address": "NE 6th St & Biscayne Blvd, Miami, FL", "reportedAt": "2026-11-19T14:33:00Z"},
    # Edgewater & Venetian Causeway waterfront cluster
    {"id": "inc-13", "lat": 25.7885, "lng": -80.1865, "weight": 9, "hazardType": "Storm Surge", "address": "Venetian Causeway West Approach, Miami, FL", "reportedAt": "2026-11-19T14:34:00Z"},
    {"id": "inc-14", "lat": 25.7914, "lng": -80.1858, "weight": 9, "hazardType": "Street Flooding", "address": "NE 17th St & N Bayshore Dr, Miami, FL", "reportedAt": "2026-11-19T14:35:00Z"},
    {"id": "inc-15", "lat": 25.7948, "lng": -80.1862, "weight": 8, "hazardType": "Storm Surge", "address": "Margaret Pace Park Seawall, Miami, FL", "reportedAt": "2026-11-19T14:36:00Z"},
    {"id": "inc-16", "lat": 25.7982, "lng": -80.1855, "weight": 10, "hazardType": "Street Flooding", "address": "NE 23rd St & N Bayshore Dr, Miami, FL", "reportedAt": "2026-11-19T14:37:00Z"},
    {"id": "inc-17", "lat": 25.8012, "lng": -80.1872, "weight": 8, "hazardType": "Downed Power Line", "address": "NE 26th St & Biscayne Blvd, Miami, FL", "reportedAt": "2026-11-19T14:38:00Z"},
    {"id": "inc-18", "lat": 25.7932, "lng": -80.1895, "weight": 7, "hazardType": "Blocked Storm Drain", "address": "NE 19th St & NE 2nd Ave, Miami, FL", "reportedAt": "2026-11-19T14:39:00Z"},
    {"id": "inc-19", "lat": 25.7896, "lng": -80.1902, "weight": 6, "hazardType": "Street Flooding", "address": "NE 14th St & Biscayne Blvd, Miami, FL", "reportedAt": "2026-11-19T14:40:00Z"},
    # Civic Center & Miami River Bend cluster
    {"id": "inc-20", "lat": 25.7854, "lng": -80.2078, "weight": 8, "hazardType": "Street Flooding", "address": "NW 12th Ave & NW 11th St, Miami, FL", "reportedAt": "2026-11-19T14:41:00Z"},
    {"id": "inc-21", "lat": 25.7872, "lng": -80.2102, "weight": 7, "hazardType": "Blocked Storm Drain", "address": "NW 14th St & NW 10th Ave, Miami, FL", "reportedAt": "2026-11-19T14:42:00Z"},
    {"id": "inc-22", "lat": 25.7834, "lng": -80.2055, "weight": 7, "hazardType": "Street Flooding", "address": "NW 7th St & River Dr, Miami, FL", "reportedAt": "2026-11-19T14:43:00Z"},
    {"id": "inc-23", "lat": 25.7860, "lng": -80.2128, "weight": 6, "hazardType": "Wind Debris", "address": "NW 13th St & NW 12th Ave, Miami, FL", "reportedAt": "2026-11-19T14:44:00Z"},
    {"id": "inc-24", "lat": 25.7822, "lng": -80.2115, "weight": 6, "hazardType": "Street Flooding", "address": "NW North River Dr, Miami, FL", "reportedAt": "2026-11-19T14:45:00Z"},
    # Little Havana & Coral Way inland spots
    {"id": "inc-25", "lat": 25.7688, "lng": -80.2175, "weight": 6, "hazardType": "Blocked Storm Drain", "address": "SW 5th St & SW 14th Ave, Miami, FL", "reportedAt": "2026-11-19T14:46:00Z"},
    {"id": "inc-26", "lat": 25.7652, "lng": -80.2124, "weight": 7, "hazardType": "Street Flooding", "address": "SW 8th St & SW 11th Ave, Miami, FL", "reportedAt": "2026-11-19T14:47:00Z"},
    {"id": "inc-27", "lat": 25.7720, "lng": -80.2082, "weight": 5, "hazardType": "Downed Power Line", "address": "SW 2nd St & SW 8th Ave, Miami, FL", "reportedAt": "2026-11-19T14:48:00Z"},
    {"id": "inc-28", "lat": 25.7565, "lng": -80.1975, "weight": 7, "hazardType": "Street Flooding", "address": "SW 20th Rd & Brickell Ave, Miami, FL", "reportedAt": "2026-11-19T14:49:00Z"},
    {"id": "inc-29", "lat": 25.7525, "lng": -80.2015, "weight": 6, "hazardType": "Wind Debris", "address": "Coral Way & SW 3rd Ave, Miami, FL", "reportedAt": "2026-11-19T14:50:00Z"},
    {"id": "inc-30", "lat": 25.7995, "lng": -80.1992, "weight": 6, "hazardType": "Street Flooding", "address": "NW 24th St & N Miami Ave, Miami, FL", "reportedAt": "2026-11-19T14:51:00Z"},
    {"id": "inc-31", "lat": 25.7815, "lng": -80.1965, "weight": 5, "hazardType": "Blocked Storm Drain", "address": "NW 8th St & NW 1st Ave, Miami, FL", "reportedAt": "2026-11-19T14:52:00Z"},
    {"id": "inc-32", "lat": 25.7672, "lng": -80.1932, "weight": 9, "hazardType": "Storm Surge", "address": "SE 7th St & S Miami Ave, Miami, FL", "reportedAt": "2026-11-19T14:53:00Z"},
]

INCIDENTS_STORE: list[dict[str, Any]] = [dict(item) for item in SEED_INCIDENTS]


# ---------------------------------------------------------------------------
# Strict Pydantic v2 Request / Response Models
# ---------------------------------------------------------------------------

class LatLngPoint(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)


class IntermediateWaypoint(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)
    via: bool = True


class PlacesSearchRequest(BaseModel):
    textQuery: str = Field(..., min_length=2, max_length=200)
    center: LatLngPoint | None = None
    radiusMeters: float = Field(default=10000.0, ge=500.0, le=50000.0)
    maxResultCount: int = Field(default=8, ge=1, le=20)
    languageCode: str = Field(default="en", min_length=2, max_length=10)


class RouteComputeRequest(BaseModel):
    origin: LatLngPoint
    destination: LatLngPoint
    intermediates: list[IntermediateWaypoint] = Field(default_factory=list, max_length=8)
    travelMode: Literal["DRIVE", "WALK", "BICYCLE", "TWO_WHEELER"] = "DRIVE"
    routingPreference: Literal["TRAFFIC_UNAWARE", "TRAFFIC_AWARE", "TRAFFIC_AWARE_OPTIMAL"] = "TRAFFIC_AWARE"
    computeAlternativeRoutes: bool = False


class IncidentCreateRequest(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)
    hazardType: Literal[
        "Street Flooding",
        "Storm Surge",
        "Downed Power Line",
        "Blocked Storm Drain",
        "Wind Debris",
    ]
    weight: int = Field(default=8, ge=1, le=10)
    address: str = Field(default="Miami, FL", min_length=1, max_length=240)
    elevationMeters: float | None = None
    weatherSummary: str | None = Field(default=None, max_length=240)


# ---------------------------------------------------------------------------
# FastAPI Application & Security Middleware
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Miami Disaster Hazard Heatmap & Safe Shelter Router",
    version="1.0.0",
    description="FastAPI BFF proxying Google Maps Platform Places, Routes, Geocoding, Elevation, and Weather APIs.",
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next: Any) -> Any:
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.api_route("/", methods=["GET", "HEAD"], include_in_schema=False)
async def serve_index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.api_route("/favicon.ico", methods=["GET", "HEAD"], include_in_schema=False)
async def serve_favicon() -> Response:
    return Response(status_code=204)


@app.api_route("/api/health", methods=["GET", "HEAD"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/config")
async def get_frontend_config() -> dict[str, Any]:
    api_key = get_api_key()
    return {
        "apiKey": api_key,
        "hasApiKey": bool(api_key),
        "mapId": DEFAULT_MAP_ID,
        "attributionId": ATTRIBUTION_ID,
        "center": MIAMI_CENTER,
        "zoom": 13,
    }


@app.get("/api/flood-zones")
async def get_flood_zones() -> dict[str, Any]:
    return {"zones": FLOOD_ZONES}


@app.get("/api/incidents")
async def list_incidents() -> dict[str, Any]:
    return {"incidents": INCIDENTS_STORE, "count": len(INCIDENTS_STORE)}


@app.post("/api/incidents")
async def create_incident(payload: IncidentCreateRequest) -> dict[str, Any]:
    incident = {
        "id": f"inc-{uuid4().hex[:8]}",
        "lat": round(payload.lat, 6),
        "lng": round(payload.lng, 6),
        "weight": payload.weight,
        "hazardType": payload.hazardType,
        "address": payload.address,
        "elevationMeters": payload.elevationMeters,
        "weatherSummary": payload.weatherSummary,
        "reportedAt": datetime.now(timezone.utc).isoformat(),
    }
    INCIDENTS_STORE.append(incident)
    return {"ok": True, "incident": incident, "count": len(INCIDENTS_STORE)}


# ---------------------------------------------------------------------------
# Google Maps Platform Web Services BFF Proxies
# ---------------------------------------------------------------------------

@app.post("/api/places/search")
async def proxy_places_search(payload: PlacesSearchRequest) -> JSONResponse:
    api_key = get_api_key()
    if not api_key:
        return JSONResponse(
            status_code=200,
            content={
                "ok": False,
                "places": [],
                "error": "GOOGLE_MAPS_API_KEY is not configured on the server.",
            },
        )

    center = payload.center.model_dump() if payload.center else MIAMI_CENTER
    body = {
        "textQuery": payload.textQuery,
        "maxResultCount": payload.maxResultCount,
        "languageCode": payload.languageCode,
        "locationBias": {
            "circle": {
                "center": {
                    "latitude": center["lat"],
                    "longitude": center["lng"],
                },
                "radius": payload.radiusMeters,
            }
        },
    }
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": PLACES_FIELD_MASK,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.post(
                "https://places.googleapis.com/v1/places:searchText",
                json=body,
                headers=headers,
            )
        except httpx.HTTPError as exc:
            return JSONResponse(
                status_code=200,
                content={"ok": False, "places": [], "error": f"Places upstream request failed: {exc}"},
            )

    if resp.status_code != 200:
        detail = _extract_google_error(resp)
        return JSONResponse(
            status_code=200,
            content={
                "ok": False,
                "places": [],
                "statusCode": resp.status_code,
                "error": detail,
            },
        )

    data = resp.json()
    return JSONResponse(status_code=200, content={"ok": True, "places": data.get("places", [])})


@app.post("/api/routes/compute")
async def proxy_routes_compute(payload: RouteComputeRequest) -> JSONResponse:
    api_key = get_api_key()
    if not api_key:
        return JSONResponse(
            status_code=200,
            content={
                "ok": False,
                "routes": [],
                "error": "GOOGLE_MAPS_API_KEY is not configured on the server.",
            },
        )

    body: dict[str, Any] = {
        "origin": {
            "location": {
                "latLng": {
                    "latitude": payload.origin.lat,
                    "longitude": payload.origin.lng,
                }
            }
        },
        "destination": {
            "location": {
                "latLng": {
                    "latitude": payload.destination.lat,
                    "longitude": payload.destination.lng,
                }
            }
        },
        "travelMode": payload.travelMode,
        "computeAlternativeRoutes": payload.computeAlternativeRoutes,
        "languageCode": "en-US",
        "units": "METRIC",
    }

    if payload.travelMode in ("DRIVE", "TWO_WHEELER"):
        body["routingPreference"] = payload.routingPreference

    if payload.intermediates:
        body["intermediates"] = [
            {
                "location": {
                    "latLng": {
                        "latitude": wp.lat,
                        "longitude": wp.lng,
                    }
                },
                "via": wp.via,
            }
            for wp in payload.intermediates
        ]

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": ROUTES_FIELD_MASK,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.post(
                "https://routes.googleapis.com/directions/v2:computeRoutes",
                json=body,
                headers=headers,
            )
        except httpx.HTTPError as exc:
            return JSONResponse(
                status_code=200,
                content={"ok": False, "routes": [], "error": f"Routes upstream request failed: {exc}"},
            )

    if resp.status_code != 200:
        detail = _extract_google_error(resp)
        return JSONResponse(
            status_code=200,
            content={
                "ok": False,
                "routes": [],
                "statusCode": resp.status_code,
                "error": detail,
            },
        )

    data = resp.json()
    return JSONResponse(status_code=200, content={"ok": True, "routes": data.get("routes", [])})


@app.get("/api/geocode/reverse")
async def proxy_reverse_geocode(
    lat: float = Query(..., ge=-90.0, le=90.0),
    lng: float = Query(..., ge=-180.0, le=180.0),
) -> JSONResponse:
    api_key = get_api_key()
    if not api_key:
        return JSONResponse(
            status_code=200,
            content={"ok": False, "formattedAddress": None, "error": "GOOGLE_MAPS_API_KEY is not configured."},
        )

    params = {
        "latlng": f"{lat},{lng}",
        "key": api_key,
        "language": "en",
    }

    async with httpx.AsyncClient(timeout=12.0) as client:
        try:
            resp = await client.get("https://maps.googleapis.com/maps/api/geocode/json", params=params)
        except httpx.HTTPError as exc:
            return JSONResponse(
                status_code=200,
                content={"ok": False, "formattedAddress": None, "error": f"Geocoding upstream error: {exc}"},
            )

    data = resp.json()
    status = data.get("status", "UNKNOWN")
    if resp.status_code != 200 or status not in ("OK", "ZERO_RESULTS"):
        return JSONResponse(
            status_code=200,
            content={
                "ok": False,
                "status": status,
                "formattedAddress": None,
                "error": data.get("error_message") or f"Geocoding status: {status}",
            },
        )

    results = data.get("results", [])
    top = results[0] if results else None
    return JSONResponse(
        status_code=200,
        content={
            "ok": True,
            "status": status,
            "formattedAddress": top.get("formatted_address") if top else f"{lat:.5f}, {lng:.5f}",
            "placeId": top.get("place_id") if top else None,
            "types": top.get("types", []) if top else [],
        },
    )


@app.get("/api/elevation")
async def proxy_elevation(
    lat: float = Query(..., ge=-90.0, le=90.0),
    lng: float = Query(..., ge=-180.0, le=180.0),
) -> JSONResponse:
    api_key = get_api_key()
    if not api_key:
        return JSONResponse(
            status_code=200,
            content={"ok": False, "elevationMeters": None, "error": "GOOGLE_MAPS_API_KEY is not configured."},
        )

    params = {
        "locations": f"{lat},{lng}",
        "key": api_key,
    }

    async with httpx.AsyncClient(timeout=12.0) as client:
        try:
            resp = await client.get("https://maps.googleapis.com/maps/api/elevation/json", params=params)
        except httpx.HTTPError as exc:
            return JSONResponse(
                status_code=200,
                content={"ok": False, "elevationMeters": None, "error": f"Elevation upstream error: {exc}"},
            )

    data = resp.json()
    status = data.get("status", "UNKNOWN")
    if resp.status_code != 200 or status != "OK":
        return JSONResponse(
            status_code=200,
            content={
                "ok": False,
                "status": status,
                "elevationMeters": None,
                "error": data.get("error_message") or f"Elevation API status: {status}",
            },
        )

    results = data.get("results", [])
    top = results[0] if results else {}
    return JSONResponse(
        status_code=200,
        content={
            "ok": True,
            "status": status,
            "elevationMeters": round(float(top.get("elevation", 0.0)), 2),
            "resolutionMeters": round(float(top.get("resolution", 0.0)), 2) if top.get("resolution") is not None else None,
        },
    )


@app.get("/api/weather/current")
async def proxy_weather_current(
    lat: float = Query(..., ge=-90.0, le=90.0),
    lng: float = Query(..., ge=-180.0, le=180.0),
) -> JSONResponse:
    api_key = get_api_key()
    if not api_key:
        return JSONResponse(
            status_code=200,
            content={"ok": False, "error": "GOOGLE_MAPS_API_KEY is not configured."},
        )

    params = {
        "location.latitude": str(lat),
        "location.longitude": str(lng),
        "unitsSystem": "METRIC",
        "languageCode": "en",
        "key": api_key,
    }

    async with httpx.AsyncClient(timeout=12.0) as client:
        try:
            resp = await client.get("https://weather.googleapis.com/v1/currentConditions:lookup", params=params)
        except httpx.HTTPError as exc:
            return JSONResponse(
                status_code=200,
                content={"ok": False, "error": f"Weather upstream error: {exc}"},
            )

    if resp.status_code != 200:
        detail = _extract_google_error(resp)
        return JSONResponse(
            status_code=200,
            content={
                "ok": False,
                "statusCode": resp.status_code,
                "error": detail,
            },
        )

    data = resp.json()
    weather_cond = data.get("weatherCondition", {})
    wind = data.get("wind", {})
    precip = data.get("precipitation", {})
    temp = data.get("temperature", {})

    return JSONResponse(
        status_code=200,
        content={
            "ok": True,
            "currentTime": data.get("currentTime"),
            "condition": weather_cond.get("description", {}).get("text", "Unknown"),
            "conditionType": weather_cond.get("type", "UNKNOWN"),
            "iconBaseUri": weather_cond.get("iconBaseUri"),
            "temperatureC": temp.get("degrees"),
            "relativeHumidity": data.get("relativeHumidity"),
            "thunderstormProbability": data.get("thunderstormProbability"),
            "windSpeedKmh": wind.get("speed", {}).get("value"),
            "windGustKmh": wind.get("gust", {}).get("value"),
            "windDirectionCardinal": wind.get("direction", {}).get("cardinal"),
            "windDirectionDegrees": wind.get("direction", {}).get("degrees"),
            "precipitationProbability": precip.get("probability", {}).get("percent"),
            "precipitationType": precip.get("probability", {}).get("type"),
            "precipitationQpfMm": precip.get("qpf", {}).get("quantity"),
        },
    )


def _extract_google_error(resp: httpx.Response) -> str:
    try:
        payload = resp.json()
        if isinstance(payload, dict):
            err = payload.get("error")
            if isinstance(err, dict):
                return str(err.get("message") or err.get("status") or resp.text)
            if isinstance(err, str):
                return err
            if "error_message" in payload:
                return str(payload["error_message"])
    except Exception:
        pass
    return f"Upstream HTTP {resp.status_code}"


if __name__ == "__main__":
    import uvicorn

    parser = argparse.ArgumentParser(description="Run Miami Disaster Hazard Heatmap FastAPI server")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Bind port (default: 8000)")
    args = parser.parse_args()

    uvicorn.run(app, host=args.host, port=args.port)
