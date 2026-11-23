from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Any, Literal

import httpx
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from data.properties import SF_PROPERTIES

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

load_dotenv(BASE_DIR / ".env")

ATTRIBUTION_ID = "gmp_git_agentsamples_v1.0.0"
DEFAULT_MAP_ID = "DEMO_MAP_ID"

PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
PLACES_NEARBY_SEARCH_URL = "https://places.googleapis.com/v1/places:searchNearby"
ROUTES_MATRIX_URL = "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix"
ROUTES_COMPUTE_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"

PLACES_TEXT_FIELD_MASK = (
    "places.id,places.displayName,places.formattedAddress,places.location,places.viewport"
)
PLACES_NEARBY_FIELD_MASK = (
    "places.id,places.displayName,places.formattedAddress,places.location,"
    "places.primaryType,places.rating,places.userRatingCount"
)
ROUTES_MATRIX_FIELD_MASK = (
    "originIndex,destinationIndex,status,condition,distanceMeters,duration,localizedValues"
)
ROUTES_COMPUTE_FIELD_MASK = (
    "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.localizedValues"
)


def _get_api_key() -> str:
    key = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    if key == "your_google_maps_api_key_here":
        return ""
    return key


class LatLngPoint(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)


class PlacesSearchTextRequest(BaseModel):
    textQuery: str = Field(..., min_length=1, max_length=256)
    maxResultCount: int = Field(default=5, ge=1, le=20)
    regionCode: str = Field(default="US", min_length=2, max_length=2)
    biasCenter: LatLngPoint | None = Field(
        default_factory=lambda: LatLngPoint(lat=37.7749, lng=-122.4194)
    )
    biasRadiusMeters: float = Field(default=25000.0, ge=100.0, le=50000.0)


class PlacesNearbyRequest(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)
    radius: float = Field(default=5000.0, ge=100.0, le=50000.0)
    includedTypes: list[str] = Field(..., min_length=1, max_length=20)
    maxResultCount: int = Field(default=8, ge=1, le=20)


class RoutesMatrixRequest(BaseModel):
    origins: list[LatLngPoint] = Field(..., min_length=1, max_length=25)
    destinations: list[LatLngPoint] = Field(..., min_length=1, max_length=25)
    travelMode: Literal["DRIVE", "TRANSIT", "WALK", "BICYCLE"] = "DRIVE"


class RoutesComputeRequest(BaseModel):
    origin: LatLngPoint
    destination: LatLngPoint
    travelMode: Literal["DRIVE", "TRANSIT", "WALK", "BICYCLE"] = "DRIVE"


app = FastAPI(
    title="Split-Screen Real Estate Search, Parcel Polygon & Commute Explorer",
    version="1.0.0",
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next: Any) -> Response:
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    return response


app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.api_route("/favicon.ico", methods=["GET", "HEAD"], include_in_schema=False)
async def serve_favicon() -> Response:
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
        '<rect width="32" height="32" rx="8" fill="#1d4ed8"/>'
        '<text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" '
        'fill="#ffffff" font-family="sans-serif" font-size="15" font-weight="bold">SF</text>'
        "</svg>"
    )
    return Response(content=svg, media_type="image/svg+xml")


@app.api_route("/", methods=["GET", "HEAD"], include_in_schema=False)
async def serve_index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.api_route("/health", methods=["GET", "HEAD"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/config")
async def get_client_config() -> dict[str, Any]:
    api_key = _get_api_key()
    return {
        "googleMapsApiKey": api_key,
        "hasApiKey": bool(api_key),
        "mapId": DEFAULT_MAP_ID,
        "attributionId": ATTRIBUTION_ID,
        "initialCenter": {"lat": 37.7749, "lng": -122.4194},
        "initialZoom": 13,
    }


@app.get("/api/properties")
async def list_properties() -> dict[str, Any]:
    return {"properties": SF_PROPERTIES, "total": len(SF_PROPERTIES)}


async def _proxy_gmp_post(
    url: str,
    field_mask: str,
    body: dict[str, Any],
) -> JSONResponse:
    api_key = _get_api_key()
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail=(
                "GOOGLE_MAPS_API_KEY is not configured. "
                "Add your key to .env to enable live Google Maps Platform endpoints."
            ),
        )

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": field_mask,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            upstream = await client.post(url, headers=headers, json=body)
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Upstream Google Maps Platform request failed: {type(exc).__name__}",
        ) from exc

    if upstream.status_code >= 400:
        detail_msg = "Upstream Google Maps Platform error."
        try:
            err_json = upstream.json()
            if isinstance(err_json, dict):
                detail_msg = (
                    err_json.get("error", {}).get("message")
                    or err_json.get("message")
                    or detail_msg
                )
        except ValueError:
            pass
        raise HTTPException(status_code=upstream.status_code, detail=detail_msg)

    return JSONResponse(content=upstream.json(), status_code=200)


@app.post("/api/places/search-text")
async def places_search_text(payload: PlacesSearchTextRequest) -> JSONResponse:
    body: dict[str, Any] = {
        "textQuery": payload.textQuery,
        "maxResultCount": payload.maxResultCount,
        "regionCode": payload.regionCode,
    }
    if payload.biasCenter is not None:
        body["locationBias"] = {
            "circle": {
                "center": {
                    "latitude": payload.biasCenter.lat,
                    "longitude": payload.biasCenter.lng,
                },
                "radius": payload.biasRadiusMeters,
            }
        }
    return await _proxy_gmp_post(PLACES_TEXT_SEARCH_URL, PLACES_TEXT_FIELD_MASK, body)


@app.post("/api/places/nearby")
async def places_nearby(payload: PlacesNearbyRequest) -> JSONResponse:
    body: dict[str, Any] = {
        "includedTypes": payload.includedTypes,
        "maxResultCount": payload.maxResultCount,
        "rankPreference": "DISTANCE",
        "locationRestriction": {
            "circle": {
                "center": {
                    "latitude": payload.lat,
                    "longitude": payload.lng,
                },
                "radius": payload.radius,
            }
        },
    }
    return await _proxy_gmp_post(PLACES_NEARBY_SEARCH_URL, PLACES_NEARBY_FIELD_MASK, body)


@app.post("/api/routes/matrix")
async def routes_matrix(payload: RoutesMatrixRequest) -> JSONResponse:
    body: dict[str, Any] = {
        "origins": [
            {"waypoint": {"location": {"latLng": {"latitude": pt.lat, "longitude": pt.lng}}}}
            for pt in payload.origins
        ],
        "destinations": [
            {"waypoint": {"location": {"latLng": {"latitude": pt.lat, "longitude": pt.lng}}}}
            for pt in payload.destinations
        ],
        "travelMode": payload.travelMode,
        "units": "IMPERIAL",
        "languageCode": "en-US",
    }
    if payload.travelMode == "DRIVE":
        body["routingPreference"] = "TRAFFIC_AWARE"
    return await _proxy_gmp_post(ROUTES_MATRIX_URL, ROUTES_MATRIX_FIELD_MASK, body)


@app.post("/api/routes/compute")
async def routes_compute(payload: RoutesComputeRequest) -> JSONResponse:
    body: dict[str, Any] = {
        "origin": {
            "location": {
                "latLng": {"latitude": payload.origin.lat, "longitude": payload.origin.lng}
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
        "units": "IMPERIAL",
        "languageCode": "en-US",
    }
    if payload.travelMode == "DRIVE":
        body["routingPreference"] = "TRAFFIC_AWARE"
    return await _proxy_gmp_post(ROUTES_COMPUTE_URL, ROUTES_COMPUTE_FIELD_MASK, body)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the Real Estate Explorer FastAPI server.")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Bind port (default: 8000)")
    args = parser.parse_args()
    uvicorn.run("main:app", host=args.host, port=args.port, reload=False)
