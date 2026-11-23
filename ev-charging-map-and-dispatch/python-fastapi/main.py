"""FastAPI Backend-for-Frontend (BFF) for Seattle EV Charging & Roadside Dispatch."""

from __future__ import annotations

import argparse
from contextlib import asynccontextmanager
import os
from pathlib import Path
from typing import Any, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
import httpx
from pydantic import BaseModel, Field
import uvicorn

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

load_dotenv(BASE_DIR / ".env")

DEFAULT_CENTER = {"lat": 47.6062, "lng": -122.3321}
DEFAULT_ZOOM = 12
DEFAULT_RADIUS_METERS = 10000
MAP_ID = "DEMO_MAP_ID"
ATTRIBUTION_ID = "gmp_git_agentsamples_v1.0.0"

PLACES_FIELD_MASK = (
    "places.id,"
    "places.displayName,"
    "places.formattedAddress,"
    "places.location,"
    "places.rating,"
    "places.userRatingCount,"
    "places.primaryType,"
    "places.types,"
    "places.regularOpeningHours,"
    "places.evChargeOptions,"
    "places.nationalPhoneNumber,"
    "places.googleMapsUri"
)

ROUTE_MATRIX_FIELD_MASK = (
    "originIndex,destinationIndex,status,condition,distanceMeters,duration"
)

COMPUTE_ROUTES_FIELD_MASK = (
    "routes.duration,"
    "routes.distanceMeters,"
    "routes.polyline.encodedPolyline,"
    "routes.viewport,"
    "routes.legs.duration,"
    "routes.legs.distanceMeters,"
    "routes.legs.steps.navigationInstruction,"
    "routes.legs.steps.distanceMeters,"
    "routes.legs.steps.staticDuration"
)


def get_api_key() -> str:
    """Return the configured Google Maps Platform API key from environment."""
    return os.getenv("GOOGLE_MAPS_API_KEY", "").strip()


def require_api_key() -> str:
    """Return the API key or raise 503 if not configured."""
    key = get_api_key()
    if not key or key == "your_google_maps_api_key_here":
        raise HTTPException(
            status_code=503,
            detail=(
                "GOOGLE_MAPS_API_KEY is not configured. "
                "Add a valid key to .env to enable Google Maps Platform services."
            ),
        )
    return key


class LatLngModel(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)


class PlacesNearbyRequest(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)
    radiusMeters: float = Field(10000.0, ge=500.0, le=50000.0)
    includedTypes: list[str] = Field(
        default_factory=lambda: ["electric_vehicle_charging_station", "car_repair"],
        min_length=1,
        max_length=10,
    )
    maxResultCount: int = Field(20, ge=1, le=20)
    rankPreference: Literal["DISTANCE", "POPULARITY"] = "DISTANCE"


class PlacesSearchTextRequest(BaseModel):
    textQuery: str = Field(..., min_length=1, max_length=200)
    lat: float = Field(DEFAULT_CENTER["lat"], ge=-90.0, le=90.0)
    lng: float = Field(DEFAULT_CENTER["lng"], ge=-180.0, le=180.0)
    radiusMeters: float = Field(10000.0, ge=500.0, le=50000.0)
    includedType: str | None = Field(default=None, max_length=64)
    pageSize: int = Field(20, ge=1, le=20)
    rankPreference: Literal["RELEVANCE", "DISTANCE"] = "RELEVANCE"


class RouteMatrixRequest(BaseModel):
    origin: LatLngModel
    destinations: list[LatLngModel] = Field(..., min_length=1, max_length=25)
    travelMode: Literal["DRIVE", "TWO_WHEELER", "WALK", "BICYCLE", "TRANSIT"] = "DRIVE"
    routingPreference: Literal[
        "TRAFFIC_UNAWARE", "TRAFFIC_AWARE", "TRAFFIC_AWARE_OPTIMAL"
    ] = "TRAFFIC_AWARE"


class RouteComputeRequest(BaseModel):
    origin: LatLngModel
    destination: LatLngModel
    travelMode: Literal["DRIVE", "TWO_WHEELER", "WALK", "BICYCLE", "TRANSIT"] = "DRIVE"
    routingPreference: Literal[
        "TRAFFIC_UNAWARE", "TRAFFIC_AWARE", "TRAFFIC_AWARE_OPTIMAL"
    ] = "TRAFFIC_AWARE"
    avoidTolls: bool = False
    avoidHighways: bool = False


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    async with httpx.AsyncClient(timeout=httpx.Timeout(15.0)) as client:
        app_instance.state.http_client = client
        yield


app = FastAPI(
    title="On-Demand Local Services & EV Roadside Dispatch",
    version="1.0.0",
    lifespan=lifespan,
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    return response


app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


def _extract_upstream_error(resp: httpx.Response) -> str:
    try:
        payload = resp.json()
        if isinstance(payload, dict):
            err = payload.get("error")
            if isinstance(err, dict) and err.get("message"):
                return str(err["message"])
            if payload.get("error_message"):
                return str(payload["error_message"])
    except ValueError:
        pass
    return f"Upstream Google Maps Platform request failed with status {resp.status_code}"


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/favicon.ico", include_in_schema=False)
async def favicon() -> Response:
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
        '<rect width="32" height="32" rx="8" fill="#059669"/>'
        '<path d="M18 4L9 18h6l-1 10 9-14h-6l1-10z" fill="#ffffff"/>'
        "</svg>"
    )
    return Response(content=svg, media_type="image/svg+xml")


@app.get("/api/health")
async def health() -> dict[str, Any]:
    key = get_api_key()
    return {
        "status": "ok",
        "hasApiKey": bool(key and key != "your_google_maps_api_key_here"),
    }


@app.get("/api/config")
async def config() -> dict[str, Any]:
    key = get_api_key()
    effective_key = "" if key == "your_google_maps_api_key_here" else key
    return {
        "apiKey": effective_key,
        "mapId": MAP_ID,
        "attributionId": ATTRIBUTION_ID,
        "defaultCenter": DEFAULT_CENTER,
        "defaultZoom": DEFAULT_ZOOM,
        "defaultRadiusMeters": DEFAULT_RADIUS_METERS,
    }


@app.post("/api/places/nearby")
async def places_nearby(body: PlacesNearbyRequest, request: Request) -> JSONResponse:
    api_key = require_api_key()
    client: httpx.AsyncClient = request.app.state.http_client

    payload = {
        "includedTypes": body.includedTypes,
        "maxResultCount": body.maxResultCount,
        "rankPreference": body.rankPreference,
        "locationRestriction": {
            "circle": {
                "center": {"latitude": body.lat, "longitude": body.lng},
                "radius": body.radiusMeters,
            }
        },
    }
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": PLACES_FIELD_MASK,
    }
    try:
        resp = await client.post(
            "https://places.googleapis.com/v1/places:searchNearby",
            json=payload,
            headers=headers,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Places Nearby request failed: {exc}") from exc

    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=_extract_upstream_error(resp))

    return JSONResponse(content=resp.json())


@app.post("/api/places/search-text")
async def places_search_text(
    body: PlacesSearchTextRequest, request: Request
) -> JSONResponse:
    api_key = require_api_key()
    client: httpx.AsyncClient = request.app.state.http_client

    payload: dict[str, Any] = {
        "textQuery": body.textQuery,
        "pageSize": body.pageSize,
        "rankPreference": body.rankPreference,
        "locationBias": {
            "circle": {
                "center": {"latitude": body.lat, "longitude": body.lng},
                "radius": body.radiusMeters,
            }
        },
    }
    if body.includedType:
        payload["includedType"] = body.includedType
        payload["strictTypeFiltering"] = True

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": PLACES_FIELD_MASK,
    }
    try:
        resp = await client.post(
            "https://places.googleapis.com/v1/places:searchText",
            json=payload,
            headers=headers,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Places Text Search failed: {exc}") from exc

    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=_extract_upstream_error(resp))

    return JSONResponse(content=resp.json())


@app.post("/api/routes/matrix")
async def routes_matrix(body: RouteMatrixRequest, request: Request) -> JSONResponse:
    api_key = require_api_key()
    client: httpx.AsyncClient = request.app.state.http_client

    payload: dict[str, Any] = {
        "origins": [
            {
                "waypoint": {
                    "location": {
                        "latLng": {
                            "latitude": body.origin.lat,
                            "longitude": body.origin.lng,
                        }
                    }
                }
            }
        ],
        "destinations": [
            {
                "waypoint": {
                    "location": {
                        "latLng": {
                            "latitude": dest.lat,
                            "longitude": dest.lng,
                        }
                    }
                }
            }
            for dest in body.destinations
        ],
        "travelMode": body.travelMode,
    }
    if body.travelMode in ("DRIVE", "TWO_WHEELER"):
        payload["routingPreference"] = body.routingPreference

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": ROUTE_MATRIX_FIELD_MASK,
    }
    try:
        resp = await client.post(
            "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix",
            json=payload,
            headers=headers,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Route Matrix request failed: {exc}") from exc

    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=_extract_upstream_error(resp))

    data = resp.json()
    elements = data if isinstance(data, list) else []
    return JSONResponse(content={"elements": elements})


@app.post("/api/routes/compute")
async def routes_compute(body: RouteComputeRequest, request: Request) -> JSONResponse:
    api_key = require_api_key()
    client: httpx.AsyncClient = request.app.state.http_client

    payload: dict[str, Any] = {
        "origin": {
            "location": {
                "latLng": {
                    "latitude": body.origin.lat,
                    "longitude": body.origin.lng,
                }
            }
        },
        "destination": {
            "location": {
                "latLng": {
                    "latitude": body.destination.lat,
                    "longitude": body.destination.lng,
                }
            }
        },
        "travelMode": body.travelMode,
        "computeAlternativeRoutes": False,
        "routeModifiers": {
            "avoidTolls": body.avoidTolls,
            "avoidHighways": body.avoidHighways,
            "avoidFerries": False,
        },
        "languageCode": "en-US",
        "units": "IMPERIAL",
    }
    if body.travelMode in ("DRIVE", "TWO_WHEELER"):
        payload["routingPreference"] = body.routingPreference

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": COMPUTE_ROUTES_FIELD_MASK,
    }
    try:
        resp = await client.post(
            "https://routes.googleapis.com/directions/v2:computeRoutes",
            json=payload,
            headers=headers,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Compute Routes request failed: {exc}") from exc

    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=_extract_upstream_error(resp))

    return JSONResponse(content=resp.json())


@app.get("/api/geocode/reverse")
async def geocode_reverse(
    request: Request,
    lat: float = Query(..., ge=-90.0, le=90.0),
    lng: float = Query(..., ge=-180.0, le=180.0),
) -> JSONResponse:
    api_key = require_api_key()
    client: httpx.AsyncClient = request.app.state.http_client

    params = {
        "latlng": f"{lat},{lng}",
        "result_type": "street_address|premise|route",
        "key": api_key,
    }
    try:
        resp = await client.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params=params,
        )
        if resp.status_code >= 400:
            raise HTTPException(
                status_code=resp.status_code, detail=_extract_upstream_error(resp)
            )
        data = resp.json()
        if data.get("status") == "ZERO_RESULTS":
            fallback_resp = await client.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                params={"latlng": f"{lat},{lng}", "key": api_key},
            )
            if fallback_resp.status_code < 400:
                data = fallback_resp.json()
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502, detail=f"Reverse geocoding request failed: {exc}"
        ) from exc

    results = data.get("results", [])
    formatted = (
        results[0].get("formatted_address")
        if results
        else f"{lat:.4f}, {lng:.4f}"
    )
    place_id = results[0].get("place_id") if results else None
    return JSONResponse(
        content={
            "formattedAddress": formatted,
            "placeId": place_id,
            "status": data.get("status", "OK"),
        }
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run the EV Charging & Roadside Dispatch FastAPI server."
    )
    parser.add_argument("--host", default="127.0.0.1", help="Bind host (127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Bind port")
    args = parser.parse_args()
    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
