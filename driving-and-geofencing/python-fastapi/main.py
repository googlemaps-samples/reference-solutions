"""FastAPI Backend-for-Frontend (BFF) for Field Workforce Geofenced Attendance & Site Audit Router."""

from __future__ import annotations

import argparse
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import httpx
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

load_dotenv(BASE_DIR / ".env")

ATTRIBUTION_ID = "gmp_git_agentsamples_v1.0.0"
DEFAULT_CENTER = {"lat": 30.2672, "lng": -97.7431}
DEFAULT_ZOOM = 12

PLACES_FIELD_MASK = (
    "places.id,places.displayName,places.formattedAddress,"
    "places.location,places.primaryTypeDisplayName"
)
ROUTES_FIELD_MASK = (
    "routes.optimizedIntermediateWaypointIndex,routes.distanceMeters,"
    "routes.duration,routes.polyline.encodedPolyline,"
    "routes.legs.distanceMeters,routes.legs.duration,"
    "routes.legs.startLocation,routes.legs.endLocation"
)
GEOCODE_FIELD_MASK = "results.formattedAddress,results.placeId,results.location"


def get_api_key() -> str:
    """Return configured Google Maps Platform API key from environment."""
    return os.getenv("GOOGLE_MAPS_API_KEY", "").strip()


class LatLngPoint(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)


class PlacesSearchRequest(BaseModel):
    textQuery: str = Field(..., min_length=1, max_length=200)
    pageSize: int = Field(default=6, ge=1, le=12)
    center: LatLngPoint = Field(default_factory=lambda: LatLngPoint(**DEFAULT_CENTER))
    radiusMeters: float = Field(default=16000.0, ge=500.0, le=50000.0)


class RouteStopWaypoint(BaseModel):
    id: str | None = Field(default=None, max_length=256)
    name: str | None = Field(default=None, max_length=200)
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)


class RoutesComputeRequest(BaseModel):
    origin: RouteStopWaypoint
    destination: RouteStopWaypoint
    intermediates: list[RouteStopWaypoint] = Field(default_factory=list, max_length=20)
    optimizeWaypointOrder: bool = True


@asynccontextmanager
async def lifespan(application: FastAPI):
    timeout = httpx.Timeout(20.0, connect=8.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        application.state.http_client = client
        yield


app = FastAPI(
    title="Field Workforce Geofenced Attendance & Site Audit Router",
    version="1.0.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


def _require_api_key() -> str:
    api_key = get_api_key()
    if not api_key or api_key == "your_google_maps_api_key_here":
        raise HTTPException(
            status_code=503,
            detail=(
                "GOOGLE_MAPS_API_KEY is not configured. Copy .env.example to .env "
                "and add a valid Maps Demo Key or Google Cloud API key."
            ),
        )
    return api_key


def _to_routes_waypoint(stop: RouteStopWaypoint) -> dict[str, Any]:
    return {
        "location": {
            "latLng": {
                "latitude": stop.lat,
                "longitude": stop.lng,
            }
        }
    }


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/favicon.ico", include_in_schema=False)
async def favicon() -> Response:
    return Response(status_code=204)


@app.get("/api/health")
async def health() -> JSONResponse:
    return JSONResponse({"status": "ok"})


@app.get("/api/config")
async def config() -> JSONResponse:
    api_key = get_api_key()
    configured = bool(api_key and api_key != "your_google_maps_api_key_here")
    return JSONResponse(
        {
            "googleMapsApiKey": api_key if configured else "",
            "configured": configured,
            "attributionId": ATTRIBUTION_ID,
            "mapId": "DEMO_MAP_ID",
            "center": DEFAULT_CENTER,
            "zoom": DEFAULT_ZOOM,
        }
    )


@app.post("/api/places/search")
async def places_search(payload: PlacesSearchRequest, request: Request) -> JSONResponse:
    """Proxy Places API (New) Text Search with explicit X-Goog-Api-Key and X-Goog-FieldMask."""
    api_key = _require_api_key()
    client: httpx.AsyncClient = request.app.state.http_client

    upstream_body = {
        "textQuery": payload.textQuery.strip(),
        "pageSize": payload.pageSize,
        "languageCode": "en",
        "regionCode": "US",
        "locationBias": {
            "circle": {
                "center": {
                    "latitude": payload.center.lat,
                    "longitude": payload.center.lng,
                },
                "radius": payload.radiusMeters,
            }
        },
    }

    try:
        upstream_resp = await client.post(
            "https://places.googleapis.com/v1/places:searchText",
            headers={
                "Content-Type": "application/json",
                "X-Goog-Api-Key": api_key,
                "X-Goog-FieldMask": PLACES_FIELD_MASK,
            },
            json=upstream_body,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Places API connection failed: {exc}") from exc

    if upstream_resp.status_code >= 400:
        detail = _extract_upstream_error(upstream_resp)
        raise HTTPException(status_code=upstream_resp.status_code, detail=detail)

    data = upstream_resp.json()
    places = data.get("places", [])
    return JSONResponse({"places": places})


@app.post("/api/routes/compute")
async def routes_compute(payload: RoutesComputeRequest, request: Request) -> JSONResponse:
    """Proxy Routes API v2 computeRoutes with waypoint optimization."""
    api_key = _require_api_key()
    client: httpx.AsyncClient = request.app.state.http_client

    should_optimize = payload.optimizeWaypointOrder and len(payload.intermediates) > 0
    upstream_body: dict[str, Any] = {
        "origin": _to_routes_waypoint(payload.origin),
        "destination": _to_routes_waypoint(payload.destination),
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_AWARE",
        "computeAlternativeRoutes": False,
        "languageCode": "en-US",
        "units": "IMPERIAL",
    }
    if payload.intermediates:
        upstream_body["intermediates"] = [_to_routes_waypoint(stop) for stop in payload.intermediates]
    if should_optimize:
        upstream_body["optimizeWaypointOrder"] = True

    try:
        upstream_resp = await client.post(
            "https://routes.googleapis.com/directions/v2:computeRoutes",
            headers={
                "Content-Type": "application/json",
                "X-Goog-Api-Key": api_key,
                "X-Goog-FieldMask": ROUTES_FIELD_MASK,
            },
            json=upstream_body,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Routes API connection failed: {exc}") from exc

    if upstream_resp.status_code >= 400:
        detail = _extract_upstream_error(upstream_resp)
        raise HTTPException(status_code=upstream_resp.status_code, detail=detail)

    data = upstream_resp.json()
    return JSONResponse(data)


@app.get("/api/geocode/reverse")
async def geocode_reverse(
    request: Request,
    lat: float = Query(..., ge=-90.0, le=90.0),
    lng: float = Query(..., ge=-180.0, le=180.0),
) -> JSONResponse:
    """Proxy Geocoding API v4 reverse geocoding for simulated worker coordinates."""
    api_key = _require_api_key()
    client: httpx.AsyncClient = request.app.state.http_client

    url = f"https://geocode.googleapis.com/v4/geocode/location/{lat},{lng}"
    try:
        upstream_resp = await client.get(
            url,
            headers={
                "Content-Type": "application/json",
                "X-Goog-Api-Key": api_key,
                "X-Goog-FieldMask": GEOCODE_FIELD_MASK,
            },
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Geocoding API connection failed: {exc}") from exc

    if upstream_resp.status_code >= 400:
        detail = _extract_upstream_error(upstream_resp)
        raise HTTPException(status_code=upstream_resp.status_code, detail=detail)

    data = upstream_resp.json()
    results = data.get("results", [])
    primary = results[0] if results else {}
    return JSONResponse(
        {
            "results": results,
            "formattedAddress": primary.get("formattedAddress", ""),
            "placeId": primary.get("placeId", ""),
        }
    )


def _extract_upstream_error(response: httpx.Response) -> str:
    try:
        body = response.json()
        if isinstance(body, dict) and "error" in body:
            err = body["error"]
            if isinstance(err, dict):
                return str(err.get("message") or err.get("status") or response.text)
    except ValueError:
        pass
    return response.text[:300] or f"Upstream HTTP {response.status_code}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Field Workforce Geofencing FastAPI server.")
    parser.add_argument("--host", default="127.0.0.1", help="Host interface to bind (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on (default: 8000)")
    args = parser.parse_args()
    uvicorn.run("main:app", host=args.host, port=args.port)


if __name__ == "__main__":
    main()
