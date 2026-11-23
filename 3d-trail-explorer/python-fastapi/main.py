"""FastAPI Backend-for-Frontend (BFF) for Lake Tahoe 3D Trail Explorer."""

from __future__ import annotations

import argparse
import math
import os
from pathlib import Path
from typing import Any

import httpx
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, model_validator

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

ATTRIBUTION_ID = "gmp_git_agentsamples_v1.0.0"
DEFAULT_MAP_ID = "DEMO_MAP_ID"
PLACEHOLDER_KEY = "your_google_maps_api_key_here"

PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
PLACES_AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete"
ELEVATION_API_URL = "https://maps.googleapis.com/maps/api/elevation/json"

PLACES_SEARCH_FIELD_MASK = (
    "places.id,places.displayName,places.formattedAddress,"
    "places.location,places.rating,places.userRatingCount,places.googleMapsUri"
)
PLACES_AUTOCOMPLETE_FIELD_MASK = (
    "suggestions.placePrediction.placeId,"
    "suggestions.placePrediction.text,"
    "suggestions.placePrediction.structuredFormat"
)

app = FastAPI(
    title="Lake Tahoe 3D Trail Explorer API",
    description="Secure BFF proxy for Google Maps Platform Places API (New) and Elevation API.",
    version="1.0.0",
)


def get_api_key() -> str:
    """Return the configured GOOGLE_MAPS_API_KEY, or empty string if unset/placeholder."""
    raw = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    if not raw or raw == PLACEHOLDER_KEY:
        return ""
    return raw


@app.middleware("http")
async def add_security_headers(request: Request, call_next: Any) -> Any:
    """Attach mandatory security headers to every HTTP response."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


class LatLngPoint(BaseModel):
    """Geographic coordinate pair validated to WGS-84 bounds."""

    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)


class PlaceSearchRequest(BaseModel):
    """Validated payload for /api/places/search."""

    query: str = Field(..., min_length=1, max_length=200)
    locationBiasLat: float | None = Field(default=38.9542, ge=-90.0, le=90.0)
    locationBiasLng: float | None = Field(default=-120.1103, ge=-180.0, le=180.0)
    radiusMeters: float = Field(default=25000.0, gt=0.0, le=50000.0)
    maxResultCount: int = Field(default=5, ge=1, le=10)


class PlaceAutocompleteRequest(BaseModel):
    """Validated payload for /api/places/autocomplete."""

    input: str = Field(..., min_length=1, max_length=200)
    sessionToken: str | None = Field(default=None, max_length=128)
    locationBiasLat: float | None = Field(default=38.9542, ge=-90.0, le=90.0)
    locationBiasLng: float | None = Field(default=-120.1103, ge=-180.0, le=180.0)
    radiusMeters: float = Field(default=35000.0, gt=0.0, le=50000.0)


class ElevationProfileRequest(BaseModel):
    """Validated payload for /api/elevation/profile."""

    path: list[LatLngPoint] | None = Field(default=None, min_length=2, max_length=512)
    locations: list[LatLngPoint] | None = Field(default=None, min_length=1, max_length=512)
    samples: int = Field(default=48, ge=2, le=256)

    @model_validator(mode="after")
    def check_path_or_locations(self) -> "ElevationProfileRequest":
        if not self.path and not self.locations:
            raise ValueError("Either 'path' (2+ points) or 'locations' (1+ points) must be provided.")
        return self


def haversine_meters(a: LatLngPoint | dict[str, float], b: LatLngPoint | dict[str, float]) -> float:
    """Calculate great-circle distance in meters between two WGS-84 coordinates."""
    lat1 = a.lat if isinstance(a, LatLngPoint) else float(a["lat"])
    lng1 = a.lng if isinstance(a, LatLngPoint) else float(a["lng"])
    lat2 = b.lat if isinstance(b, LatLngPoint) else float(b["lat"])
    lng2 = b.lng if isinstance(b, LatLngPoint) else float(b["lng"])

    radius = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)

    sin_half_phi = math.sin(d_phi / 2.0)
    sin_half_lambda = math.sin(d_lambda / 2.0)
    h = sin_half_phi * sin_half_phi + math.cos(phi1) * math.cos(phi2) * sin_half_lambda * sin_half_lambda
    return 2.0 * radius * math.atan2(math.sqrt(h), math.sqrt(max(0.0, 1.0 - h)))


def compute_profile_metrics(results: list[dict[str, Any]]) -> dict[str, Any]:
    """Compute cumulative distance, min/max elevation, and total ascent/descent."""
    if not results:
        return {
            "totalDistanceKm": 0.0,
            "minElevationM": 0.0,
            "maxElevationM": 0.0,
            "totalAscentM": 0.0,
            "totalDescentM": 0.0,
        }

    elevations: list[float] = []
    cumulative_m = 0.0
    total_ascent = 0.0
    total_descent = 0.0

    for idx, item in enumerate(results):
        elev = float(item.get("elevation", 0.0))
        elevations.append(elev)
        if idx > 0:
            prev_item = results[idx - 1]
            prev_loc = prev_item.get("location", {})
            curr_loc = item.get("location", {})
            if prev_loc and curr_loc:
                cumulative_m += haversine_meters(prev_loc, curr_loc)
            delta = elev - elevations[idx - 1]
            if delta > 0:
                total_ascent += delta
            else:
                total_descent += abs(delta)
        item["distanceKm"] = round(cumulative_m / 1000.0, 3)

    return {
        "totalDistanceKm": round(cumulative_m / 1000.0, 2),
        "minElevationM": round(min(elevations), 1),
        "maxElevationM": round(max(elevations), 1),
        "totalAscentM": round(total_ascent, 1),
        "totalDescentM": round(total_descent, 1),
    }


@app.get("/api/health")
async def health_check() -> dict[str, Any]:
    """Health check endpoint for readiness probes."""
    return {
        "status": "ok",
        "hasApiKey": bool(get_api_key()),
    }


@app.get("/api/config")
async def get_client_config() -> JSONResponse:
    """Expose runtime Maps JS initialization metadata to the frontend."""
    api_key = get_api_key()
    return JSONResponse(
        content={
            "apiKey": api_key,
            "hasApiKey": bool(api_key),
            "mapId": DEFAULT_MAP_ID,
            "attributionId": ATTRIBUTION_ID,
        },
        headers={"Cache-Control": "no-store"},
    )


@app.post("/api/places/search")
async def proxy_places_search(payload: PlaceSearchRequest) -> JSONResponse:
    """Server-side BFF proxy for Places API (New) Text Search."""
    api_key = get_api_key()
    if not api_key:
        return JSONResponse(
            status_code=200,
            content={
                "configured": False,
                "places": [],
                "message": "GOOGLE_MAPS_API_KEY is not configured. Add it to .env for live Places search.",
            },
        )

    body: dict[str, Any] = {
        "textQuery": payload.query,
        "maxResultCount": payload.maxResultCount,
        "languageCode": "en",
    }
    if payload.locationBiasLat is not None and payload.locationBiasLng is not None:
        body["locationBias"] = {
            "circle": {
                "center": {
                    "latitude": payload.locationBiasLat,
                    "longitude": payload.locationBiasLng,
                },
                "radius": payload.radiusMeters,
            }
        }

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": PLACES_SEARCH_FIELD_MASK,
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(PLACES_SEARCH_URL, json=body, headers=headers)
            data = resp.json()
            if resp.status_code >= 400:
                error_msg = data.get("error", {}).get("message", "Places API search failed.")
                return JSONResponse(
                    status_code=200,
                    content={
                        "configured": True,
                        "places": [],
                        "error": error_msg,
                        "upstreamStatus": resp.status_code,
                    },
                )
            return JSONResponse(
                status_code=200,
                content={
                    "configured": True,
                    "places": data.get("places", []),
                },
            )
    except httpx.HTTPError as exc:
        return JSONResponse(
            status_code=200,
            content={
                "configured": True,
                "places": [],
                "error": f"Places upstream request error: {exc}",
            },
        )


@app.post("/api/places/autocomplete")
async def proxy_places_autocomplete(payload: PlaceAutocompleteRequest) -> JSONResponse:
    """Server-side BFF proxy for Places API (New) Autocomplete."""
    api_key = get_api_key()
    if not api_key:
        return JSONResponse(
            status_code=200,
            content={
                "configured": False,
                "suggestions": [],
                "message": "GOOGLE_MAPS_API_KEY is not configured.",
            },
        )

    body: dict[str, Any] = {
        "input": payload.input,
        "languageCode": "en",
    }
    if payload.sessionToken:
        body["sessionToken"] = payload.sessionToken
    if payload.locationBiasLat is not None and payload.locationBiasLng is not None:
        body["locationBias"] = {
            "circle": {
                "center": {
                    "latitude": payload.locationBiasLat,
                    "longitude": payload.locationBiasLng,
                },
                "radius": payload.radiusMeters,
            }
        }

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": PLACES_AUTOCOMPLETE_FIELD_MASK,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(PLACES_AUTOCOMPLETE_URL, json=body, headers=headers)
            data = resp.json()
            if resp.status_code >= 400:
                error_msg = data.get("error", {}).get("message", "Places Autocomplete failed.")
                return JSONResponse(
                    status_code=200,
                    content={
                        "configured": True,
                        "suggestions": [],
                        "error": error_msg,
                        "upstreamStatus": resp.status_code,
                    },
                )
            return JSONResponse(
                status_code=200,
                content={
                    "configured": True,
                    "suggestions": data.get("suggestions", []),
                },
            )
    except httpx.HTTPError as exc:
        return JSONResponse(
            status_code=200,
            content={
                "configured": True,
                "suggestions": [],
                "error": f"Autocomplete upstream request error: {exc}",
            },
        )


@app.post("/api/elevation/profile")
async def proxy_elevation_profile(payload: ElevationProfileRequest) -> JSONResponse:
    """Server-side BFF proxy for Google Maps Platform Elevation API."""
    api_key = get_api_key()
    if not api_key:
        return JSONResponse(
            status_code=200,
            content={
                "configured": False,
                "status": "UNCONFIGURED",
                "results": [],
                "metrics": None,
                "message": "GOOGLE_MAPS_API_KEY is not configured. Add it to .env for live Elevation API profiling.",
            },
        )

    params: dict[str, str | int] = {"key": api_key}
    if payload.path:
        params["path"] = "|".join(f"{pt.lat},{pt.lng}" for pt in payload.path)
        params["samples"] = payload.samples
    elif payload.locations:
        params["locations"] = "|".join(f"{pt.lat},{pt.lng}" for pt in payload.locations)

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.get(ELEVATION_API_URL, params=params)
            data = resp.json()
            api_status = data.get("status", "UNKNOWN_ERROR")
            if resp.status_code >= 400 or api_status != "OK":
                return JSONResponse(
                    status_code=200,
                    content={
                        "configured": True,
                        "status": api_status,
                        "results": [],
                        "metrics": None,
                        "error": data.get("error_message") or f"Elevation API returned status {api_status}",
                    },
                )
            results = data.get("results", [])
            metrics = compute_profile_metrics(results) if payload.path else None
            return JSONResponse(
                status_code=200,
                content={
                    "configured": True,
                    "status": "OK",
                    "results": results,
                    "metrics": metrics,
                },
            )
    except httpx.HTTPError as exc:
        return JSONResponse(
            status_code=200,
            content={
                "configured": True,
                "status": "NETWORK_ERROR",
                "results": [],
                "metrics": None,
                "error": f"Elevation upstream request error: {exc}",
            },
        )


app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/favicon.ico", include_in_schema=False)
async def serve_favicon() -> FileResponse:
    """Serve SVG favicon to prevent browser 404 console errors."""
    return FileResponse(STATIC_DIR / "favicon.svg", media_type="image/svg+xml")


@app.get("/", include_in_schema=False)
async def serve_index() -> FileResponse:
    """Serve the single-page 3D Trail Explorer web application."""
    return FileResponse(STATIC_DIR / "index.html")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Lake Tahoe 3D Trail Explorer FastAPI server.")
    parser.add_argument("--host", default="127.0.0.1", help="Host interface to bind (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on (default: 8000)")
    return parser.parse_args()


if __name__ == "__main__":
    cli_args = parse_args()
    uvicorn.run(app, host=cli_args.host, port=cli_args.port)
